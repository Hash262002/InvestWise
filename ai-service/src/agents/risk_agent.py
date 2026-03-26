# ========================================
# Risk Agent
# ========================================
# Specialized agent for risk assessment and diversification analysis

from typing import Dict, Any, List
import structlog

from src.agents.base_agent import BaseAgent, AgentResult
from src.llm.ollama_client import OllamaClient
from src.tools.calculator_tool import CalculatorTool
from src.tools.portfolio_tool import PortfolioAnalysisTool

logger = structlog.get_logger()


class RiskAgent(BaseAgent):
    """
    Risk Agent - Assesses portfolio risk and diversification.
    
    Responsibilities:
    - Calculate risk scores
    - Evaluate diversification
    - Analyze sector concentration
    - Identify risk factors
    - Provide risk mitigation recommendations
    """
    
    def __init__(self, llm: OllamaClient = None, portfolio_data: Dict = None):
        self.portfolio_tool = PortfolioAnalysisTool(portfolio_data)
        tools = [
            CalculatorTool(),
            self.portfolio_tool
        ]
        super().__init__(llm=llm, tools=tools, max_iterations=6)
    
    def set_portfolio_data(self, data: Dict[str, Any]):
        """Update portfolio data for analysis"""
        self.portfolio_tool.set_portfolio_data(data)
    
    @property
    def name(self) -> str:
        return "risk_agent"
    
    @property
    def description(self) -> str:
        return "Assesses portfolio risk, diversification, and provides risk mitigation recommendations"
    
    @property
    def system_prompt(self) -> str:
        return """You are a Risk Assessment Agent specializing in portfolio risk analysis.

=== CRITICAL: TOOL CALLING RULES ===

When calling financial_calculator, you MUST ALWAYS provide BOTH parameters:
1. calculation: the specific calculation type (string)
2. data: the holdings/portfolio data (object/dict)

REQUIRED FORMAT FOR ALL CALCULATOR CALLS:
Action: financial_calculator
Action Input: {"calculation": "VALUE", "data": HOLDINGS_OBJECT}

Examples of correct calls:
✓ {"calculation": "concentration_risk", "data": {"holdings": [{...}]}}
✓ {"calculation": "sector_weights", "data": {"holdings": [{...}]}}
✗ {"calculation": "concentration_risk"}  <- WRONG: missing data
✗ {"calculation": "concentration_risk", "data": null}  <- WRONG: data is null

NEVER omit the data parameter. ALWAYS include complete holdings in every call.

=== YOUR ROLE ===
1. Calculate portfolio risk scores (0-10 scale)
2. Evaluate diversification across holdings and sectors
3. Identify concentration risks
4. Assess sector imbalances
5. Provide risk mitigation recommendations

=== RISK SCORING GUIDELINES ===
Risk Score (0-10): Higher = more risky
  - 0-3: Low risk (well diversified, balanced sectors)
  - 4-6: Medium risk (some concentration, sector tilt)
  - 7-10: High risk (high concentration, single sector dominance)

Diversification Score (0-10): Higher = better diversified
  - 0-3: Poor diversification
  - 4-6: Moderate diversification
  - 7-10: Well diversified

=== ANALYSIS WORKFLOW ===
1. Use portfolio_reader to understand the data structure
2. Call financial_calculator for concentration_risk (with data parameter)
3. Call financial_calculator for sector_weights (with data parameter)
4. Analyze top holdings concentration
5. Build risk assessment from results

Provide your final answer with:
- Risk Score: [0-10 with explanation]
- Diversification Score: [0-10 with explanation]
- Risk Level: [low/medium/high]
- Top Risk Factors: [list]
- Recommendations: [actionable suggestions]"""

    
    async def assess_risk(self, portfolio_data: Dict[str, Any]) -> AgentResult:
        """
        Perform comprehensive risk assessment.
        
        Args:
            portfolio_data: Portfolio data with holdings
        """
        self.set_portfolio_data(portfolio_data)
        
        holdings = portfolio_data.get("holdings", [])
        
        task = f"""Assess the risk of this portfolio with {len(holdings)} holdings.

Please:
1. Calculate concentration risk using financial_calculator
2. Get sector distribution using portfolio_reader
3. Analyze top holdings concentration
4. Evaluate overall diversification

Provide:
- Risk score (0-10)
- Diversification score (0-10)
- Risk level (low/medium/high)
- Key risk factors
- Specific recommendations to reduce risk"""
        
        context = {
            "holdings_count": len(holdings),
            "portfolio_id": portfolio_data.get("portfolioId", "")
        }
        
        return await self.run(task, context)
    
    async def check_diversification(self, portfolio_data: Dict[str, Any]) -> AgentResult:
        """Check portfolio diversification"""
        self.set_portfolio_data(portfolio_data)
        
        task = """Evaluate diversification of this portfolio:

1. Count unique holdings and sectors
2. Calculate sector weights
3. Check concentration in top holdings
4. Assess asset type mix

Rate diversification (0-10) and provide recommendations."""
        
        return await self.run(task, portfolio_data)
    
    async def analyze_sector_risk(self, portfolio_data: Dict[str, Any]) -> AgentResult:
        """Analyze sector-specific risks"""
        self.set_portfolio_data(portfolio_data)
        
        task = """Analyze sector risk in this portfolio:

1. Get all sectors using portfolio_reader
2. Calculate sector weights using financial_calculator
3. Identify overweight sectors (>30% allocation)
4. Identify missing sectors for diversification

Provide sector risk analysis with rebalancing suggestions."""
        
        return await self.run(task, portfolio_data)
    
    def calculate_quick_risk_score(self, holdings: List[Dict]) -> Dict[str, Any]:
        """
        Calculate quick risk metrics without LLM (synchronous).
        """
        if not holdings:
            return {"risk_score": 0, "diversification_score": 0, "risk_level": "none"}
        
        # Calculate values and weights
        total_value = 0
        sector_values = {}
        
        for h in holdings:
            value = h.get("quantity", 0) * h.get("currentPrice", h.get("averageCost", 0))
            total_value += value
            
            sector = h.get("sector", "Other")
            sector_values[sector] = sector_values.get(sector, 0) + value
        
        if total_value == 0:
            return {"risk_score": 0, "diversification_score": 0, "risk_level": "none"}
        
        # Calculate weights
        holding_values = []
        for h in holdings:
            value = h.get("quantity", 0) * h.get("currentPrice", h.get("averageCost", 0))
            holding_values.append(value / total_value)
        
        # Sort weights descending
        holding_values.sort(reverse=True)
        
        # Top 3 concentration
        top_3_weight = sum(holding_values[:3]) if len(holding_values) >= 3 else sum(holding_values)
        
        # Top sector concentration
        sector_weights = [v / total_value for v in sector_values.values()]
        max_sector_weight = max(sector_weights) if sector_weights else 0
        
        # Risk score calculation
        concentration_factor = top_3_weight * 5  # 0-5 based on top 3
        sector_factor = max_sector_weight * 3  # 0-3 based on sector dominance
        holdings_factor = max(0, (10 - len(holdings)) * 0.2)  # Bonus for more holdings
        
        risk_score = min(10, concentration_factor + sector_factor + holdings_factor)
        
        # Diversification score (inverse relationship)
        diversification_score = max(0, 10 - risk_score)
        
        # Add bonus for multiple sectors
        sector_bonus = min(2, len(sector_values) * 0.3)
        diversification_score = min(10, diversification_score + sector_bonus)
        
        # Risk level
        if risk_score <= 3:
            risk_level = "low"
        elif risk_score <= 6:
            risk_level = "medium"
        else:
            risk_level = "high"
        
        return {
            "risk_score": round(risk_score, 1),
            "diversification_score": round(diversification_score, 1),
            "risk_level": risk_level,
            "top_3_concentration": round(top_3_weight * 100, 1),
            "max_sector_weight": round(max_sector_weight * 100, 1),
            "holdings_count": len(holdings),
            "sectors_count": len(sector_values)
        }
