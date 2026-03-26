# ========================================
# Financial Calculator Tool
# ========================================
# Provides financial calculations for portfolio analysis

import math
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import structlog

from src.tools.base_tool import BaseTool, ToolResult, ToolResultStatus

logger = structlog.get_logger()


class CalculatorTool(BaseTool):
    """Tool for performing financial calculations"""
    
    @property
    def name(self) -> str:
        return "financial_calculator"
    
    @property
    def description(self) -> str:
        return """Perform financial calculations for portfolio analysis.

REQUIRED PARAMETERS: calculation (string) and data (object)

Available calculations:
- portfolio_value: Calculate total portfolio value (requires: holdings array)
- allocation_percentages: Calculate weight of each holding (requires: holdings array with values)
- profit_loss: Calculate P&L for holdings (requires: holdings array with profit/loss values)
- sector_weights: Calculate sector allocation percentages (requires: holdings array with sectors)
- concentration_risk: Measure portfolio concentration (requires: holdings array with values)
- basic_stats: Calculate mean, std dev, etc. (requires: holdings array)

IMPORTANT: ALWAYS include the 'data' parameter with holdings information in every call!
Example: {"calculation": "portfolio_value", "data": {"holdings": [...]}}"""
    
    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "calculation": {
                    "type": "string",
                    "enum": [
                        "portfolio_value",
                        "allocation_percentages",
                        "profit_loss",
                        "sector_weights",
                        "concentration_risk",
                        "basic_stats"
                    ],
                    "description": "Type of calculation to perform"
                },
                "data": {
                    "type": "object",
                    "description": "Data required for the calculation (holdings, values, etc.)"
                }
            },
            "required": ["calculation", "data"]
        }
    
    async def execute(
        self,
        calculation: str = None,
        data: Dict[str, Any] = None,
        **kwargs
    ) -> ToolResult:
        """Execute the specified financial calculation
        
        Args:
            calculation: Type of calculation to perform
            data: Data required for the calculation (holdings, values, etc.)
        """
        
        # Validate required parameters
        if calculation is None:
            logger.error("calculation_error", error="Missing 'calculation' parameter")
            return ToolResult(
                status=ToolResultStatus.ERROR,
                data=None,
                error="Missing required parameter 'calculation'. Specify which calculation to perform."
            )
        
        if data is None:
            logger.error("calculation_error", calculation=calculation, error="Missing 'data' parameter")
            return ToolResult(
                status=ToolResultStatus.ERROR,
                data=None,
                error=f"Missing required parameter 'data' for {calculation}. Include the holdings or portfolio data as the 'data' parameter."
            )
        
        try:
            if calculation == "portfolio_value":
                result = self._calc_portfolio_value(data)
            elif calculation == "allocation_percentages":
                result = self._calc_allocation_percentages(data)
            elif calculation == "profit_loss":
                result = self._calc_profit_loss(data)
            elif calculation == "sector_weights":
                result = self._calc_sector_weights(data)
            elif calculation == "concentration_risk":
                result = self._calc_concentration_risk(data)
            elif calculation == "basic_stats":
                result = self._calc_basic_stats(data)
            else:
                return ToolResult(
                    status=ToolResultStatus.ERROR,
                    data=None,
                    error=f"Unknown calculation type: {calculation}. Available: portfolio_value, allocation_percentages, profit_loss, sector_weights, concentration_risk, basic_stats"
                )
            
            logger.info("calculation_completed", calculation=calculation)
            
            return ToolResult(
                status=ToolResultStatus.SUCCESS,
                data=result
            )
            
        except Exception as e:
            logger.error("calculation_error", calculation=calculation, error=str(e))
            return ToolResult(
                status=ToolResultStatus.ERROR,
                data=None,
                error=f"Calculation failed: {str(e)}"
            )
    
    # ----------------------------------------
    # Calculation Methods
    # ----------------------------------------
    
    def _calc_portfolio_value(self, data: Dict) -> Dict[str, Any]:
        """Calculate total portfolio value from holdings"""
        holdings = data.get("holdings", [])
        
        total_value = 0
        total_cost = 0
        
        for holding in holdings:
            quantity = holding.get("quantity", 0)
            current_price = holding.get("currentPrice", holding.get("averageCost", 0))
            avg_cost = holding.get("averageCost", 0)
            
            total_value += quantity * current_price
            total_cost += quantity * avg_cost
        
        return {
            "total_value": round(total_value, 2),
            "total_cost": round(total_cost, 2),
            "total_gain_loss": round(total_value - total_cost, 2),
            "total_return_pct": round(((total_value - total_cost) / total_cost * 100) if total_cost > 0 else 0, 2),
            "holdings_count": len(holdings)
        }
    
    def _calc_allocation_percentages(self, data: Dict) -> Dict[str, Any]:
        """Calculate allocation percentage for each holding"""
        holdings = data.get("holdings", [])
        
        # Calculate total value first
        total_value = sum(
            h.get("quantity", 0) * h.get("currentPrice", h.get("averageCost", 0))
            for h in holdings
        )
        
        allocations = []
        for holding in holdings:
            quantity = holding.get("quantity", 0)
            current_price = holding.get("currentPrice", holding.get("averageCost", 0))
            value = quantity * current_price
            
            allocations.append({
                "symbol": holding.get("symbol", ""),
                "name": holding.get("name", ""),
                "value": round(value, 2),
                "allocation_pct": round((value / total_value * 100) if total_value > 0 else 0, 2)
            })
        
        # Sort by allocation descending
        allocations.sort(key=lambda x: x["allocation_pct"], reverse=True)
        
        return {
            "total_value": round(total_value, 2),
            "allocations": allocations
        }
    
    def _calc_profit_loss(self, data: Dict) -> Dict[str, Any]:
        """Calculate profit/loss for each holding"""
        holdings = data.get("holdings", [])
        
        results = []
        total_pnl = 0
        winners = 0
        losers = 0
        
        for holding in holdings:
            quantity = holding.get("quantity", 0)
            current_price = holding.get("currentPrice", 0)
            avg_cost = holding.get("averageCost", 0)
            
            cost_basis = quantity * avg_cost
            current_value = quantity * current_price
            pnl = current_value - cost_basis
            pnl_pct = ((current_price - avg_cost) / avg_cost * 100) if avg_cost > 0 else 0
            
            total_pnl += pnl
            if pnl > 0:
                winners += 1
            elif pnl < 0:
                losers += 1
            
            results.append({
                "symbol": holding.get("symbol", ""),
                "quantity": quantity,
                "avg_cost": round(avg_cost, 2),
                "current_price": round(current_price, 2),
                "cost_basis": round(cost_basis, 2),
                "current_value": round(current_value, 2),
                "pnl": round(pnl, 2),
                "pnl_pct": round(pnl_pct, 2)
            })
        
        # Sort by P&L descending
        results.sort(key=lambda x: x["pnl"], reverse=True)
        
        return {
            "holdings_pnl": results,
            "total_pnl": round(total_pnl, 2),
            "winners": winners,
            "losers": losers,
            "win_rate": round((winners / len(holdings) * 100) if holdings else 0, 1)
        }
    
    def _calc_sector_weights(self, data: Dict) -> Dict[str, Any]:
        """Calculate sector allocation weights"""
        holdings = data.get("holdings", [])
        
        sector_values = {}
        total_value = 0
        
        for holding in holdings:
            quantity = holding.get("quantity", 0)
            current_price = holding.get("currentPrice", holding.get("averageCost", 0))
            sector = holding.get("sector", "Other")
            
            value = quantity * current_price
            total_value += value
            
            if sector not in sector_values:
                sector_values[sector] = 0
            sector_values[sector] += value
        
        # Calculate percentages
        sector_weights = {}
        for sector, value in sector_values.items():
            sector_weights[sector] = round((value / total_value * 100) if total_value > 0 else 0, 2)
        
        # Sort by weight descending
        sorted_sectors = dict(sorted(sector_weights.items(), key=lambda x: x[1], reverse=True))
        
        return {
            "sector_weights": sorted_sectors,
            "total_value": round(total_value, 2),
            "num_sectors": len(sector_weights),
            "top_sector": list(sorted_sectors.keys())[0] if sorted_sectors else None,
            "top_sector_weight": list(sorted_sectors.values())[0] if sorted_sectors else 0
        }
    
    def _calc_concentration_risk(self, data: Dict) -> Dict[str, Any]:
        """Calculate portfolio concentration risk metrics"""
        holdings = data.get("holdings", [])
        
        if not holdings:
            return {"concentration_score": 0, "hhi_index": 0, "risk_level": "none"}
        
        # Calculate values and weights
        values = []
        total_value = 0
        
        for holding in holdings:
            quantity = holding.get("quantity", 0)
            price = holding.get("currentPrice", holding.get("averageCost", 0))
            value = quantity * price
            values.append(value)
            total_value += value
        
        if total_value == 0:
            return {"concentration_score": 0, "hhi_index": 0, "risk_level": "none"}
        
        # Calculate weights
        weights = [v / total_value for v in values]
        
        # Herfindahl-Hirschman Index (HHI)
        # Sum of squared weights, scaled to 0-10000
        hhi = sum(w * w for w in weights) * 10000
        
        # Concentration score (0-10)
        # Based on top holdings concentration
        sorted_weights = sorted(weights, reverse=True)
        top_3_weight = sum(sorted_weights[:3]) if len(sorted_weights) >= 3 else sum(sorted_weights)
        top_5_weight = sum(sorted_weights[:5]) if len(sorted_weights) >= 5 else sum(sorted_weights)
        
        # Score based on top holdings weight
        concentration_score = (top_3_weight * 10)  # Scale to 0-10
        
        # Risk level
        if concentration_score <= 3:
            risk_level = "low"
        elif concentration_score <= 6:
            risk_level = "medium"
        else:
            risk_level = "high"
        
        return {
            "concentration_score": round(concentration_score, 2),
            "hhi_index": round(hhi, 2),
            "top_3_weight_pct": round(top_3_weight * 100, 2),
            "top_5_weight_pct": round(top_5_weight * 100, 2),
            "num_holdings": len(holdings),
            "risk_level": risk_level,
            "recommendation": self._get_concentration_recommendation(concentration_score, len(holdings))
        }
    
    def _calc_basic_stats(self, data: Dict) -> Dict[str, Any]:
        """Calculate basic statistics for a list of values"""
        values = data.get("values", [])
        
        if not values:
            return {"error": "No values provided"}
        
        n = len(values)
        mean = sum(values) / n
        
        # Variance and std dev
        variance = sum((x - mean) ** 2 for x in values) / n
        std_dev = math.sqrt(variance)
        
        # Min, max, range
        min_val = min(values)
        max_val = max(values)
        range_val = max_val - min_val
        
        # Median
        sorted_vals = sorted(values)
        if n % 2 == 0:
            median = (sorted_vals[n//2 - 1] + sorted_vals[n//2]) / 2
        else:
            median = sorted_vals[n//2]
        
        return {
            "count": n,
            "mean": round(mean, 4),
            "median": round(median, 4),
            "std_dev": round(std_dev, 4),
            "variance": round(variance, 4),
            "min": round(min_val, 4),
            "max": round(max_val, 4),
            "range": round(range_val, 4)
        }
    
    def _get_concentration_recommendation(self, score: float, num_holdings: int) -> str:
        """Generate recommendation based on concentration"""
        if score > 7:
            return f"High concentration risk. Consider diversifying across more holdings. Currently {num_holdings} holdings with top 3 dominating the portfolio."
        elif score > 5:
            return f"Moderate concentration. Your {num_holdings} holdings show some concentration in top positions. Consider rebalancing."
        else:
            return f"Good diversification across {num_holdings} holdings. Concentration risk is within acceptable levels."


# Singleton instance
calculator_tool = CalculatorTool()
