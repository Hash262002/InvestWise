# ========================================
# Orchestrator Agent
# ========================================
# Coordinates multiple agents and synthesizes final analysis

import asyncio
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
import structlog
from datetime import datetime

from src.llm.ollama_client import OllamaClient
from src.agents.research_agent import ResearchAgent
from src.agents.analyst_agent import AnalystAgent
from src.agents.risk_agent import RiskAgent
from src.agents.base_agent import AgentResult

logger = structlog.get_logger()


@dataclass
class HoldingAnalysis:
    """Analysis result for a single holding"""
    symbol: str
    name: str
    sector: str = "Unknown"
    quantity: float = 0.0
    average_cost: float = 0.0
    current_price: float = 0.0
    current_value: float = 0.0
    total_cost: float = 0.0
    unrealized_pnl: float = 0.0
    unrealized_pnl_pct: float = 0.0
    portfolio_weight_pct: float = 0.0
    concentration_risk: bool = False
    risk_level: str = "medium"  # low | medium | high
    recommendation: str = "hold"  # add | reduce | hold | review
    recommendation_reason: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "symbol": self.symbol,
            "name": self.name,
            "sector": self.sector,
            "quantity": self.quantity,
            "averageCost": self.average_cost,
            "currentPrice": self.current_price,
            "currentValue": self.current_value,
            "totalCost": self.total_cost,
            "unrealizedPnl": self.unrealized_pnl,
            "unrealizedPnlPct": self.unrealized_pnl_pct,
            "portfolioWeightPct": self.portfolio_weight_pct,
            "concentrationRisk": self.concentration_risk,
            "riskLevel": self.risk_level,
            "recommendation": self.recommendation,
            "recommendationReason": self.recommendation_reason,
        }


@dataclass
class AnalysisResult:
    """Complete portfolio analysis result"""
    portfolio_id: str
    user_id: str
    status: str  # "completed", "partial", "failed"
    
    # Scores
    risk_score: float = 0.0
    diversification_score: float = 0.0
    risk_level: str = "medium"
    
    # Detailed results
    summary: str = ""
    recommendations: List[str] = field(default_factory=list)
    sector_weights: Dict[str, float] = field(default_factory=dict)
    
    # Per-holding analysis
    holding_analyses: List[HoldingAnalysis] = field(default_factory=list)
    
    # Portfolio-level metrics
    total_value: float = 0.0
    total_cost: float = 0.0
    total_pnl: float = 0.0
    total_return_pct: float = 0.0
    holdings_count: int = 0
    
    # Agent outputs
    research_insights: Optional[str] = None
    analyst_insights: Optional[str] = None
    risk_insights: Optional[str] = None
    
    # Metadata
    analysis_type: str = "full"
    model_used: str = ""
    processing_time_ms: int = 0
    errors: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "portfolioId": self.portfolio_id,
            "userId": self.user_id,
            "status": self.status,
            "riskScore": self.risk_score,
            "diversificationScore": self.diversification_score,
            "riskLevel": self.risk_level,
            "summary": self.summary,
            "recommendations": self.recommendations,
            "sectorWeights": self.sector_weights,
            "holdingAnalyses": [h.to_dict() for h in self.holding_analyses],
            "portfolioMetrics": {
                "totalValue": self.total_value,
                "totalCost": self.total_cost,
                "totalPnl": self.total_pnl,
                "totalReturnPct": self.total_return_pct,
                "holdingsCount": self.holdings_count,
            },
            "insights": {
                "research": self.research_insights,
                "analyst": self.analyst_insights,
                "risk": self.risk_insights
            },
            "metadata": {
                "analysisType": self.analysis_type,
                "modelUsed": self.model_used,
                "processingTimeMs": self.processing_time_ms
            },
            "errors": self.errors
        }


class OrchestratorAgent:
    """
    Orchestrator Agent - Coordinates multi-agent portfolio analysis.
    
    Workflow:
    1. Receive portfolio data from Kafka
    2. Run agents in parallel (Research, Analyst, Risk)
    3. Collect and synthesize results
    4. Generate final analysis report
    5. Return structured response
    """
    
    def __init__(self, llm: OllamaClient = None, enable_research: bool = True):
        self.llm = llm or OllamaClient()
        self.enable_research = enable_research  # Can disable for faster analysis
        
        # Initialize agents
        self.research_agent = ResearchAgent(llm=self.llm) if enable_research else None
        self.analyst_agent = AnalystAgent(llm=self.llm)
        self.risk_agent = RiskAgent(llm=self.llm)
    
    async def analyze_portfolio(
        self,
        portfolio_id: str,
        user_id: str,
        holdings: List[Dict[str, Any]],
        analysis_type: str = "full"
    ) -> AnalysisResult:
        """
        Perform complete portfolio analysis.
        
        Args:
            portfolio_id: Portfolio ID
            user_id: User ID
            holdings: List of portfolio holdings
            analysis_type: "full", "quick", or "rebalance"
            
        Returns:
            AnalysisResult with complete analysis
        """
        start_time = datetime.now()
        
        logger.info(
            "orchestrator_started",
            portfolio_id=portfolio_id,
            holdings_count=len(holdings),
            analysis_type=analysis_type
        )
        
        result = AnalysisResult(
            portfolio_id=portfolio_id,
            user_id=user_id,
            status="in_progress",
            analysis_type=analysis_type,
            model_used=self.llm.model
        )
        
        try:
            # Prepare portfolio data
            portfolio_data = {
                "portfolioId": portfolio_id,
                "userId": user_id,
                "holdings": holdings
            }
            
            if analysis_type == "quick":
                # Quick analysis - just risk metrics
                await self._quick_analysis(result, portfolio_data)
            else:
                # Full analysis - all agents
                await self._full_analysis(result, portfolio_data)
            
            # Synthesize final report
            await self._synthesize_report(result)
            
            result.status = "completed"
            
        except Exception as e:
            logger.error("orchestrator_error", error=str(e))
            result.status = "failed"
            result.errors.append(str(e))
        
        # Calculate processing time
        processing_time = datetime.now() - start_time
        result.processing_time_ms = int(processing_time.total_seconds() * 1000)
        
        logger.info(
            "orchestrator_completed",
            portfolio_id=portfolio_id,
            status=result.status,
            processing_time_ms=result.processing_time_ms
        )
        
        return result
    
    def _compute_holding_analyses(
        self, holdings: List[Dict[str, Any]]
    ) -> tuple:
        """
        Compute per-holding metrics deterministically (no LLM needed).
        Returns (holding_analyses list, total_value, total_cost).
        """
        analyses = []
        total_value = 0.0
        total_cost = 0.0

        # First pass: compute values
        holding_values = []
        for h in holdings:
            qty = h.get("quantity", 0)
            avg_cost = h.get("averageCost", 0)
            price = h.get("currentPrice", avg_cost)
            value = qty * price
            cost = qty * avg_cost
            total_value += value
            total_cost += cost
            holding_values.append((h, qty, avg_cost, price, value, cost))

        # Second pass: compute weights and build HoldingAnalysis objects
        for h, qty, avg_cost, price, value, cost in holding_values:
            pnl = value - cost
            pnl_pct = round((pnl / cost * 100) if cost > 0 else 0, 2)
            weight = round((value / total_value * 100) if total_value > 0 else 0, 2)
            concentration = weight > 25  # >25% is concentration risk

            # Risk level per holding
            if weight > 35 or pnl_pct < -20:
                h_risk = "high"
            elif weight > 20 or pnl_pct < -10:
                h_risk = "medium"
            else:
                h_risk = "low"

            # Recommendation logic
            if weight > 30:
                rec, reason = "reduce", f"Overweight at {weight}% of portfolio"
            elif pnl_pct < -15:
                rec, reason = "review", f"Significant loss of {pnl_pct}%"
            elif weight < 3 and pnl_pct > 10:
                rec, reason = "add", f"Small position with strong {pnl_pct}% return"
            else:
                rec, reason = "hold", "Position size and performance are within normal range"

            analyses.append(HoldingAnalysis(
                symbol=h.get("symbol", ""),
                name=h.get("name", h.get("symbol", "")),
                sector=h.get("sector", "Unknown"),
                quantity=qty,
                average_cost=round(avg_cost, 2),
                current_price=round(price, 2),
                current_value=round(value, 2),
                total_cost=round(cost, 2),
                unrealized_pnl=round(pnl, 2),
                unrealized_pnl_pct=pnl_pct,
                portfolio_weight_pct=weight,
                concentration_risk=concentration,
                risk_level=h_risk,
                recommendation=rec,
                recommendation_reason=reason,
            ))

        return analyses, round(total_value, 2), round(total_cost, 2)

    def _populate_portfolio_metrics(self, result: AnalysisResult, holdings: List[Dict[str, Any]]):
        """Fill holding_analyses and portfolio-level metrics on the result."""
        analyses, total_value, total_cost = self._compute_holding_analyses(holdings)
        result.holding_analyses = analyses
        result.total_value = total_value
        result.total_cost = total_cost
        result.total_pnl = round(total_value - total_cost, 2)
        result.total_return_pct = round(
            ((total_value - total_cost) / total_cost * 100) if total_cost > 0 else 0, 2
        )
        result.holdings_count = len(holdings)

        # Sector weights from holding analyses
        sector_values: Dict[str, float] = {}
        for ha in analyses:
            sector_values[ha.sector] = sector_values.get(ha.sector, 0) + ha.current_value
        if total_value > 0:
            result.sector_weights = {
                k: round(v / total_value * 100, 1)
                for k, v in sector_values.items()
            }

    async def _quick_analysis(
        self,
        result: AnalysisResult,
        portfolio_data: Dict[str, Any]
    ):
        """Perform quick risk-only analysis"""
        holdings = portfolio_data.get("holdings", [])
        
        # Use quick calculation (no LLM)
        risk_metrics = self.risk_agent.calculate_quick_risk_score(holdings)
        
        result.risk_score = risk_metrics.get("risk_score", 5.0)
        result.diversification_score = risk_metrics.get("diversification_score", 5.0)
        result.risk_level = risk_metrics.get("risk_level", "medium")
        
        # Compute per-holding analyses and portfolio metrics
        self._populate_portfolio_metrics(result, holdings)
        
        result.summary = f"Quick analysis completed. Portfolio value: ${result.total_value:,.2f}, Return: {result.total_return_pct}%"
        result.recommendations = self._generate_quick_recommendations(risk_metrics)
    
    async def _full_analysis(
        self,
        result: AnalysisResult,
        portfolio_data: Dict[str, Any]
    ):
        """Perform full multi-agent analysis"""
        print("🤖 Running full analysis with multiple agents...")
        holdings = portfolio_data.get("holdings", [])
        
        # Run agents in parallel
        tasks = [
            self._run_analyst(portfolio_data),
            self._run_risk(portfolio_data)
        ]
        
        if self.enable_research and self.research_agent:
            tasks.append(self._run_research(holdings))
        
        agent_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process analyst result
        analyst_result = agent_results[0]
        if isinstance(analyst_result, AgentResult) and analyst_result.success:
            result.analyst_insights = analyst_result.answer
        elif isinstance(analyst_result, Exception):
            result.errors.append(f"Analyst error: {str(analyst_result)}")
        
        # Process risk result
        risk_result = agent_results[1]
        if isinstance(risk_result, AgentResult) and risk_result.success:
            result.risk_insights = risk_result.answer
            # Extract scores from risk analysis
            self._extract_risk_scores(result, risk_result.answer)
        elif isinstance(risk_result, Exception):
            result.errors.append(f"Risk error: {str(risk_result)}")
            # Fallback to quick calculation
            quick_risk = self.risk_agent.calculate_quick_risk_score(holdings)
            result.risk_score = quick_risk.get("risk_score", 5.0)
            result.diversification_score = quick_risk.get("diversification_score", 5.0)
            result.risk_level = quick_risk.get("risk_level", "medium")
        
        # Process research result if available
        if len(agent_results) > 2:
            research_result = agent_results[2]
            if isinstance(research_result, AgentResult) and research_result.success:
                result.research_insights = research_result.answer
            elif isinstance(research_result, Exception):
                result.errors.append(f"Research error: {str(research_result)}")
        
        # Compute per-holding analyses and portfolio metrics (includes sector weights)
        self._populate_portfolio_metrics(result, holdings)
    
    async def _run_analyst(self, portfolio_data: Dict) -> AgentResult:
        """Run the analyst agent"""
        return await self.analyst_agent.analyze_portfolio(portfolio_data)
    
    async def _run_risk(self, portfolio_data: Dict) -> AgentResult:
        """Run the risk agent"""
        return await self.risk_agent.assess_risk(portfolio_data)
    
    async def _run_research(self, holdings: List[Dict]) -> AgentResult:
        """Run the research agent"""
        return await self.research_agent.research_portfolio(holdings)
    
    def _extract_risk_scores(self, result: AnalysisResult, risk_answer: str):
        """Extract risk scores from agent answer"""
        # Try to parse scores from the answer
        import re
        
        # Look for risk score
        risk_match = re.search(r'risk\s*score[:\s]*(\d+(?:\.\d+)?)', risk_answer.lower())
        if risk_match:
            result.risk_score = float(risk_match.group(1))
        
        # Look for diversification score
        div_match = re.search(r'diversification\s*score[:\s]*(\d+(?:\.\d+)?)', risk_answer.lower())
        if div_match:
            result.diversification_score = float(div_match.group(1))
        
        # Look for risk level
        if 'high risk' in risk_answer.lower() or 'high-risk' in risk_answer.lower():
            result.risk_level = 'high'
        elif 'low risk' in risk_answer.lower() or 'low-risk' in risk_answer.lower():
            result.risk_level = 'low'
        else:
            result.risk_level = 'medium'
    
    async def _synthesize_report(self, result: AnalysisResult):
        """Synthesize final summary and recommendations"""
        
        # If we have insights, use LLM to synthesize
        if result.analyst_insights or result.risk_insights:
            prompt = f"""Synthesize a brief portfolio analysis summary based on these insights:

Analyst Insights:
{result.analyst_insights or 'Not available'}

Risk Assessment:
{result.risk_insights or 'Not available'}

Research Insights:
{result.research_insights or 'Not available'}

Provide:
1. A 2-3 sentence summary
2. 3-5 specific recommendations as a bullet list

Format as:
Summary: [your summary]
Recommendations:
- [recommendation 1]
- [recommendation 2]
- [recommendation 3]"""
            
            try:
                response = await self.llm.generate(
                    prompt=prompt,
                    temperature=0.3,
                    max_tokens=500
                )
                
                # Parse summary and recommendations
                self._parse_synthesis(result, response)
                
            except Exception as e:
                logger.error("synthesis_error", error=str(e))
                result.summary = f"Risk Score: {result.risk_score}/10, Diversification: {result.diversification_score}/10"
                result.recommendations = self._generate_quick_recommendations({
                    "risk_score": result.risk_score,
                    "diversification_score": result.diversification_score
                })
        else:
            result.summary = f"Risk Score: {result.risk_score}/10, Diversification: {result.diversification_score}/10"
            result.recommendations = self._generate_quick_recommendations({
                "risk_score": result.risk_score,
                "diversification_score": result.diversification_score
            })
    
    def _parse_synthesis(self, result: AnalysisResult, response: str):
        """Parse LLM synthesis response"""
        lines = response.strip().split('\n')
        
        # Find summary
        in_recommendations = False
        recommendations = []
        
        for line in lines:
            line = line.strip()
            
            if line.lower().startswith('summary:'):
                result.summary = line[8:].strip()
            elif line.lower().startswith('recommendations:'):
                in_recommendations = True
            elif in_recommendations and line.startswith('-'):
                recommendations.append(line[1:].strip())
        
        if recommendations:
            result.recommendations = recommendations
    
    def _generate_quick_recommendations(self, metrics: Dict) -> List[str]:
        """Generate recommendations based on metrics"""
        recommendations = []
        
        risk_score = metrics.get("risk_score", 5)
        div_score = metrics.get("diversification_score", 5)
        top_3_conc = metrics.get("top_3_concentration", 50)
        
        if risk_score > 7:
            recommendations.append("Consider reducing position sizes in top holdings to lower concentration risk")
        
        if div_score < 4:
            recommendations.append("Diversify by adding holdings in underrepresented sectors")
        
        if top_3_conc and top_3_conc > 60:
            recommendations.append(f"Top 3 holdings represent {top_3_conc}% of portfolio - consider rebalancing")
        
        if metrics.get("sectors_count", 0) < 3:
            recommendations.append("Add exposure to more sectors for better diversification")
        
        if not recommendations:
            recommendations.append("Portfolio risk levels are acceptable - continue monitoring")
        
        return recommendations


# Singleton instance
orchestrator = OrchestratorAgent()
