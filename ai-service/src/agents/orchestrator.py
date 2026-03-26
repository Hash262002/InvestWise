from typing import Dict, Any, List, Union
import logging
import asyncio

from .analyst_agent import AnalystAgent
from .risk_agent import RiskAgent
from .base_agent import AgentResult
from ..llm import get_ollama_client
from ..models import (
    AnalysisOutput,
    PortfolioMetrics,
    RiskAssessment,
    HoldingAnalysis,
    PortfolioRecommendation,
    Sentiment,
    Recommendation,
    RiskLevel,
    Priority,
)

logger = logging.getLogger(__name__)


class Orchestrator:
    """Multi-agent orchestrator for portfolio analysis"""
    
    def __init__(self):
        self.analyst = AnalystAgent()
        self.risk_assessor = RiskAgent()
        self.llm = get_ollama_client()
    
    async def analyze_portfolio(self, portfolio: Dict[str, Any]) -> AnalysisOutput:
        """
        Orchestrate multi-agent portfolio analysis
        
        Flow:
        1. Analyst agent calculates performance metrics
        2. Risk agent assesses risks and diversification
        3. Generate individual holding analysis
        4. Synthesize recommendations
        5. Generate executive summary
        """
        
        logger.info(f"Starting portfolio analysis: {portfolio.get('name', 'Unknown')}")
        
        # Run analyst and risk agents in parallel
        analyst_task = self.analyst.analyze_portfolio(portfolio)
        risk_task = self.risk_assessor.assess_risk(portfolio)
        
        analyst_result, risk_result = await asyncio.gather(
            analyst_task, risk_task, return_exceptions=True
        )
        
        # Handle errors - convert AgentResult to dict if successful, otherwise use empty dict
        if isinstance(analyst_result, Exception):
            logger.error(f"Analyst agent error: {analyst_result}")
            analyst_data = {"success": False, "metadata": {}}
        elif isinstance(analyst_result, AgentResult):
            analyst_data = {"success": analyst_result.success, "metadata": analyst_result.metadata or {}}
        else:
            analyst_data = analyst_result if isinstance(analyst_result, dict) else {"success": False, "metadata": {}}
        
        if isinstance(risk_result, Exception):
            logger.error(f"Risk agent error: {risk_result}")
            risk_data = {"success": False, "metadata": {}}
        elif isinstance(risk_result, AgentResult):
            risk_data = {"success": risk_result.success, "metadata": risk_result.metadata or {}}
        else:
            risk_data = risk_result if isinstance(risk_result, dict) else {"success": False, "metadata": {}}
        
        # Extract metrics
        metrics = self._build_metrics(analyst_data, portfolio)
        
        # Extract risk assessment
        risk_assessment = self._build_risk_assessment(risk_data, portfolio)
        
        # Generate holdings analysis
        holdings_analysis = await self._analyze_holdings(portfolio)
        
        # Generate recommendations
        recommendations = await self._generate_recommendations(
            portfolio, metrics, risk_assessment, holdings_analysis
        )
        
        # Generate executive summary
        summary = await self._generate_summary(
            portfolio, metrics, risk_assessment, recommendations
        )
        
        logger.info(f"Portfolio analysis completed: {portfolio.get('name', 'Unknown')}")
        
        return AnalysisOutput(
            summary=summary,
            metrics=metrics,
            risk_assessment=risk_assessment,
            holdings=holdings_analysis,
            recommendations=recommendations,
        )
    
    def _build_metrics(self, analyst_data: Dict, portfolio: Dict) -> PortfolioMetrics:
        """Build portfolio metrics from analyst results and portfolio data"""
        
        # Get metrics from agent metadata if available
        raw_metrics = analyst_data.get("metadata", {}).get("metrics", {})
        
        total_invested = portfolio.get('total_invested', portfolio.get('totalInvested', 0))
        current_value = portfolio.get('current_value', portfolio.get('currentValue', 0))
        
        return_pct = ((current_value - total_invested) / total_invested * 100) if total_invested > 0 else 0
        
        return PortfolioMetrics(
            total_return=round(return_pct, 2),
            annualized_return=raw_metrics.get("annualizedReturn"),
            volatility=raw_metrics.get("volatility"),
            sharpe_ratio=raw_metrics.get("sharpeRatio"),
            max_drawdown=raw_metrics.get("maxDrawdown"),
        )
    
    def _build_risk_assessment(self, risk_data: Dict, portfolio: Dict) -> RiskAssessment:
        """Build risk assessment from risk agent results and portfolio data"""
        
        # Get assessment from agent metadata if available
        raw_assessment = risk_data.get("metadata", {}).get("risk_assessment", {})
        
        # If no agent assessment, calculate basics from portfolio
        holdings = portfolio.get("holdings", [])
        
        # Calculate sector concentration
        sectors = {}
        total_value = 0
        for h in holdings:
            sector = h.get('sector', 'Unknown') or 'Unknown'
            value = h.get('current_value', h.get('currentValue', h.get('total_cost', 0)))
            sectors[sector] = sectors.get(sector, 0) + value
            total_value += value
        
        sector_concentration = {}
        for sector, value in sectors.items():
            sector_concentration[sector] = round((value / total_value * 100) if total_value > 0 else 0, 2)
        
        # Determine risk level
        max_sector_pct = max(sector_concentration.values()) if sector_concentration else 0
        if max_sector_pct > 60 or len(holdings) < 3:
            risk_level = RiskLevel.VERY_HIGH
        elif max_sector_pct > 40 or len(holdings) < 5:
            risk_level = RiskLevel.HIGH
        elif max_sector_pct > 25 or len(sectors) < 3:
            risk_level = RiskLevel.MODERATE
        else:
            risk_level = RiskLevel.LOW
        
        # Use agent's risk level if available
        risk_level_str = raw_assessment.get("riskLevel")
        if risk_level_str:
            try:
                risk_level = RiskLevel(risk_level_str)
            except ValueError:
                pass
        
        # Calculate diversification score
        num_holdings = len(holdings)
        num_sectors = len(sectors)
        holding_score = min(30, num_holdings * 3)
        sector_score = min(40, num_sectors * 8)
        
        if total_value > 0:
            weights = [(v / total_value) ** 2 for v in sectors.values()]
            hhi = sum(weights)
            concentration_score = 30 * (1 - hhi)
        else:
            concentration_score = 0
        
        diversification_score = raw_assessment.get("diversificationScore") or int(holding_score + sector_score + concentration_score)
        
        # Generate warnings
        warnings = raw_assessment.get("warnings", [])
        if not warnings:
            for sector, pct in sector_concentration.items():
                if pct > 40:
                    warnings.append(f"High concentration in {sector} sector ({pct}%)")
            if num_holdings < 5:
                warnings.append(f"Low diversification with only {num_holdings} holdings")
        
        return RiskAssessment(
            risk_level=risk_level,
            diversification_score=min(100, diversification_score),
            sector_concentration=sector_concentration,
            warnings=warnings,
        )
    
    async def _analyze_holdings(self, portfolio: Dict) -> List[HoldingAnalysis]:
        """Generate analysis for each holding"""
        
        holdings = portfolio.get("holdings", [])
        analyses = []
        
        for holding in holdings[:10]:  # Limit to top 10 holdings
            try:
                analysis = await self._analyze_single_holding(holding)
                analyses.append(analysis)
            except Exception as e:
                logger.error(f"Error analyzing holding {holding.get('symbol')}: {e}")
                # Add default analysis
                analyses.append(HoldingAnalysis(
                    symbol=holding.get("symbol", "UNKNOWN"),
                    name=holding.get("name", "Unknown"),
                    analysis="Analysis not available",
                    sentiment=Sentiment.NEUTRAL,
                    recommendation=Recommendation.HOLD,
                ))
        
        return analyses
    
    async def _analyze_single_holding(self, holding: Dict) -> HoldingAnalysis:
        """Analyze a single holding"""
        
        symbol = holding.get("symbol", "UNKNOWN")
        name = holding.get("name", "Unknown")
        sector = holding.get("sector", "Unknown")
        quantity = holding.get("quantity", 0)
        avg_cost = holding.get("average_cost", holding.get("averageCost", 0))
        current_value = holding.get("current_value", holding.get("currentValue", 0))
        
        # Calculate return for this holding
        total_cost = quantity * avg_cost if avg_cost else 0
        return_pct = ((current_value - total_cost) / total_cost * 100) if total_cost > 0 else 0
        
        # Generate brief analysis using LLM
        prompt = f"""Provide a brief (2-3 sentences) investment analysis for:
Stock: {symbol} ({name})
Sector: {sector}
Return: {return_pct:.1f}%

Include sentiment (bullish/bearish/neutral) and recommendation (buy/hold/sell).
Format: [Analysis text] | Sentiment: [sentiment] | Recommendation: [recommendation]"""
        
        try:
            response = await self.llm.generate(
                prompt=prompt,
                system="You are a stock analyst. Be concise and specific.",
                temperature=0.3,
                max_tokens=200,
            )
            
            # Parse response
            parts = response.split("|")
            analysis_text = parts[0].strip() if parts else "Analysis pending."
            
            # Extract sentiment
            sentiment = Sentiment.NEUTRAL
            if "bullish" in response.lower():
                sentiment = Sentiment.BULLISH
            elif "bearish" in response.lower():
                sentiment = Sentiment.BEARISH
            
            # Extract recommendation
            recommendation = Recommendation.HOLD
            if "strong buy" in response.lower():
                recommendation = Recommendation.STRONG_BUY
            elif "buy" in response.lower():
                recommendation = Recommendation.BUY
            elif "strong sell" in response.lower():
                recommendation = Recommendation.STRONG_SELL
            elif "sell" in response.lower():
                recommendation = Recommendation.SELL
            
            return HoldingAnalysis(
                symbol=symbol,
                name=name,
                analysis=analysis_text[:500],  # Limit length
                sentiment=sentiment,
                recommendation=recommendation,
            )
            
        except Exception as e:
            logger.error(f"LLM error for holding {symbol}: {e}")
            return HoldingAnalysis(
                symbol=symbol,
                name=name,
                analysis=f"Stock in {sector} sector with {return_pct:.1f}% return.",
                sentiment=Sentiment.NEUTRAL if abs(return_pct) < 10 else (Sentiment.BULLISH if return_pct > 0 else Sentiment.BEARISH),
                recommendation=Recommendation.HOLD,
            )
    
    async def _generate_recommendations(
        self,
        portfolio: Dict,
        metrics: PortfolioMetrics,
        risk_assessment: RiskAssessment,
        holdings_analysis: List[HoldingAnalysis],
    ) -> List[PortfolioRecommendation]:
        """Generate portfolio recommendations"""
        
        recommendations = []
        
        # Risk-based recommendations
        if risk_assessment.diversification_score < 40:
            recommendations.append(PortfolioRecommendation(
                type="diversify",
                priority=Priority.HIGH,
                description="Diversification is poor. Consider adding holdings from different sectors.",
            ))
        elif risk_assessment.diversification_score < 60:
            recommendations.append(PortfolioRecommendation(
                type="diversify",
                priority=Priority.MEDIUM,
                description="Consider improving diversification by adding more sectors.",
            ))
        
        # Sector concentration warnings
        for sector, pct in risk_assessment.sector_concentration.items():
            if pct > 40:
                recommendations.append(PortfolioRecommendation(
                    type="rebalance",
                    priority=Priority.HIGH,
                    description=f"Reduce exposure to {sector} sector (currently {pct}%).",
                ))
        
        # Holdings-based recommendations
        sells = [h for h in holdings_analysis if h.recommendation in [Recommendation.SELL, Recommendation.STRONG_SELL]]
        buys = [h for h in holdings_analysis if h.recommendation in [Recommendation.BUY, Recommendation.STRONG_BUY]]
        
        for holding in sells[:3]:  # Limit to top 3
            recommendations.append(PortfolioRecommendation(
                type="sell",
                priority=Priority.MEDIUM,
                description=f"Consider reducing position in {holding.symbol}.",
                symbol=holding.symbol,
            ))
        
        for holding in buys[:3]:
            recommendations.append(PortfolioRecommendation(
                type="buy",
                priority=Priority.LOW,
                description=f"Consider increasing position in {holding.symbol}.",
                symbol=holding.symbol,
            ))
        
        return recommendations[:10]  # Limit to 10 recommendations
    
    async def _generate_summary(
        self,
        portfolio: Dict,
        metrics: PortfolioMetrics,
        risk_assessment: RiskAssessment,
        recommendations: List[PortfolioRecommendation],
    ) -> str:
        """Generate executive summary"""
        
        prompt = f"""Generate a brief executive summary (3-4 sentences) for this portfolio analysis:

Portfolio: {portfolio.get('name', 'Investment Portfolio')}
Total Return: {metrics.total_return}%
Risk Level: {risk_assessment.risk_level.value}
Diversification Score: {risk_assessment.diversification_score}/100
Key Recommendations: {len(recommendations)}
Holdings: {len(portfolio.get('holdings', []))}

Focus on key insights and top priorities."""
        
        try:
            summary = await self.llm.generate(
                prompt=prompt,
                system="You are a portfolio manager writing an executive summary. Be concise and professional.",
                temperature=0.3,
                max_tokens=300,
            )
            return summary.strip()
        except Exception as e:
            logger.error(f"Summary generation error: {e}")
            return f"Portfolio '{portfolio.get('name', 'Unknown')}' shows a {metrics.total_return}% return with {risk_assessment.risk_level.value} risk level. Diversification score is {risk_assessment.diversification_score}/100."
