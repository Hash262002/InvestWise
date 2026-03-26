# ========================================
# Analyst Agent
# ========================================
# Specialized agent for portfolio metrics and analysis

from typing import Dict, Any, List
import structlog

from src.agents.base_agent import BaseAgent, AgentResult
from src.llm.ollama_client import OllamaClient
from src.tools.calculator_tool import CalculatorTool
from src.tools.portfolio_tool import PortfolioAnalysisTool

logger = structlog.get_logger()


class AnalystAgent(BaseAgent):
    """
    You are a Financial Analyst Agent specializing in portfolio analysis.

CRITICAL RULES:
1. When calling financial_calculator, ALWAYS include both parameters:
   - calculation: the type of calculation (string)
   - data: the holdings/portfolio data (object)
2. NEVER call a tool with missing parameters
3. Always format Action Input as: {"calculation": "...", "data": {...}}

Your tasks:
1. Get portfolio summary
2. Calculate allocation percentages
3. Analyze profit/loss
4. Calculate sector weights
5. Analyze concentration risk

For every calculation, include complete portfolio data in the data parameter.
    """
    
    def __init__(self, llm: OllamaClient = None, portfolio_data: Dict = None):
        self.portfolio_tool = PortfolioAnalysisTool(portfolio_data)
        tools = [
            CalculatorTool(),
            self.portfolio_tool
        ]
        super().__init__(llm=llm, tools=tools, max_iterations=8)
    
    def set_portfolio_data(self, data: Dict[str, Any]):
        """Update portfolio data for analysis"""
        self.portfolio_tool.set_portfolio_data(data)
    
    @property
    def name(self) -> str:
        return "analyst_agent"
    
    @property
    def description(self) -> str:
        return "Analyzes portfolio metrics, calculates performance, and evaluates allocation"
    
    @property
    def system_prompt(self) -> str:
        return """You are a Financial Analyst Agent specializing in portfolio analysis.

=== CRITICAL: TOOL CALLING RULES ===

When calling financial_calculator, you MUST ALWAYS provide BOTH parameters:
1. calculation: the specific calculation type (string)
2. data: the holdings/portfolio data (object/dict)

REQUIRED FORMAT FOR ALL CALCULATOR CALLS:
Action: financial_calculator
Action Input: {"calculation": "VALUE", "data": HOLDINGS_OBJECT}

VALID CALCULATION TYPES:
- portfolio_value
- allocation_percentages  
- profit_loss
- sector_weights
- concentration_risk
- basic_stats

EXAMPLES OF CORRECT CALLS:
✓ {"calculation": "portfolio_value", "data": {"holdings": [{...}]}}
✓ {"calculation": "allocation_percentages", "data": {"holdings": [{...}]}}
✗ {"calculation": "portfolio_value"}  <- WRONG: missing data
✗ {"calculation": "portfolio_value", "data": null}  <- WRONG: data is null

ALWAYS include complete holdings data. NEVER omit the data parameter. NEVER call with null/empty data.

=== YOUR ROLE ===
1. Analyze portfolio composition and allocation
2. Calculate performance metrics (P&L, returns, etc.)
3. Evaluate sector distribution
4. Identify concentration issues
5. Provide actionable insights

=== ANALYSIS WORKFLOW ===
1. Use portfolio_reader to understand the data structure
2. For each calculation needed, call financial_calculator with both params
3. Include the complete holdings list in every data parameter
4. Use the calculation results to build your final analysis

Provide your final answer with:
- Portfolio Value: [total value]
- Total Return: [percentage]
- Top Performers: [list with returns]
- Underperformers: [list with losses]
- Allocation Analysis: [key observations]
- Recommendations: [actionable suggestions]"""
    
    async def analyze_portfolio(self, portfolio_data: Dict[str, Any]) -> AgentResult:
        """
        Perform full portfolio analysis.
        
        Args:
            portfolio_data: Portfolio data with holdings
        """
        self.set_portfolio_data(portfolio_data)
        
        holdings = portfolio_data.get("holdings", [])
        
        task = f"""Analyze this portfolio with {len(holdings)} holdings.

Please:
1. Get the portfolio summary using portfolio_reader
2. Calculate allocation percentages using financial_calculator
3. Calculate profit/loss for all holdings
4. Calculate sector weights
5. Analyze concentration risk

Provide a comprehensive analysis with:
- Key metrics (value, return, etc.)
- Top and bottom performers
- Allocation breakdown
- Specific recommendations"""
        
        context = {
            "holdings_count": len(holdings),
            "portfolio_id": portfolio_data.get("portfolioId", "")
        }
        print("🤖 Starting portfolio analysis...")
        return await self.run(task, context)
    
    async def analyze_performance(self, portfolio_data: Dict[str, Any]) -> AgentResult:
        """Analyze portfolio performance metrics"""
        self.set_portfolio_data(portfolio_data)
        
        task = """Analyze the performance of this portfolio:

1. Calculate total P&L
2. Identify winners and losers
3. Calculate win rate
4. Compare holding returns

Provide performance insights and recommendations."""
        
        return await self.run(task, portfolio_data)
    
    async def analyze_allocation(self, portfolio_data: Dict[str, Any]) -> AgentResult:
        """Analyze portfolio allocation"""
        self.set_portfolio_data(portfolio_data)
        
        task = """Analyze the allocation of this portfolio:

1. Calculate allocation percentage for each holding
2. Calculate sector weights
3. Check concentration risk
4. Identify over/under-weighted positions

Provide allocation insights with specific recommendations."""
        
        return await self.run(task, portfolio_data)
    
    def get_quick_metrics(self, holdings: List[Dict]) -> Dict[str, Any]:
        """
        Calculate quick metrics without LLM (synchronous).
        Useful for basic calculations.
        """
        total_value = 0
        total_cost = 0
        
        for h in holdings:
            qty = h.get("quantity", 0)
            price = h.get("currentPrice", h.get("averageCost", 0))
            cost = h.get("averageCost", 0)
            
            total_value += qty * price
            total_cost += qty * cost
        
        return {
            "total_value": round(total_value, 2),
            "total_cost": round(total_cost, 2),
            "total_pnl": round(total_value - total_cost, 2),
            "return_pct": round(((total_value - total_cost) / total_cost * 100) if total_cost > 0 else 0, 2),
            "holdings_count": len(holdings)
        }
