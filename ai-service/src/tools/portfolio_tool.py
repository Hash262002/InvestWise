# ========================================
# Portfolio Analysis Tool
# ========================================
# Provides portfolio data access and basic analysis

from typing import Dict, Any, List, Optional
import structlog

from src.tools.base_tool import BaseTool, ToolResult, ToolResultStatus

logger = structlog.get_logger()


class PortfolioAnalysisTool(BaseTool):
    """Tool for accessing and analyzing portfolio data"""
    
    @property
    def name(self) -> str:
        return "portfolio_reader"
    
    @property
    def description(self) -> str:
        return """Access and analyze portfolio data that was passed to the analysis request.
Available operations:
- get_holdings: Get list of all holdings with details
- get_summary: Get portfolio summary (total value, holdings count, etc.)
- get_holding_details: Get details for a specific holding by symbol
- get_sectors: Get unique sectors in the portfolio
- get_top_holdings: Get top N holdings by value"""
    
    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "operation": {
                    "type": "string",
                    "enum": [
                        "get_holdings",
                        "get_summary",
                        "get_holding_details",
                        "get_sectors",
                        "get_top_holdings"
                    ],
                    "description": "Operation to perform on portfolio data"
                },
                "symbol": {
                    "type": "string",
                    "description": "Stock symbol (required for get_holding_details)"
                },
                "limit": {
                    "type": "integer",
                    "description": "Number of holdings to return (for get_top_holdings, default: 5)"
                }
            },
            "required": ["operation"]
        }
    
    def __init__(self, portfolio_data: Dict[str, Any] = None):
        """Initialize with portfolio data"""
        self.portfolio_data = portfolio_data or {}
        self.holdings = portfolio_data.get("holdings", []) if portfolio_data else []
    
    def set_portfolio_data(self, data: Dict[str, Any]):
        """Update portfolio data"""
        self.portfolio_data = data
        self.holdings = data.get("holdings", [])
    
    async def execute(
        self,
        operation: str,
        symbol: str = None,
        limit: int = 5,
        **kwargs
    ) -> ToolResult:
        """Execute the specified portfolio operation"""
        
        try:
            if operation == "get_holdings":
                result = self._get_holdings()
            elif operation == "get_summary":
                result = self._get_summary()
            elif operation == "get_holding_details":
                if not symbol:
                    return ToolResult(
                        status=ToolResultStatus.ERROR,
                        data=None,
                        error="Symbol is required for get_holding_details"
                    )
                result = self._get_holding_details(symbol)
            elif operation == "get_sectors":
                result = self._get_sectors()
            elif operation == "get_top_holdings":
                result = self._get_top_holdings(limit)
            else:
                return ToolResult(
                    status=ToolResultStatus.ERROR,
                    data=None,
                    error=f"Unknown operation: {operation}"
                )
            
            return ToolResult(
                status=ToolResultStatus.SUCCESS,
                data=result
            )
            
        except Exception as e:
            logger.error("portfolio_tool_error", operation=operation, error=str(e))
            return ToolResult(
                status=ToolResultStatus.ERROR,
                data=None,
                error=f"Portfolio operation failed: {str(e)}"
            )
    
    # ----------------------------------------
    # Operation Methods
    # ----------------------------------------
    
    def _get_holdings(self) -> Dict[str, Any]:
        """Get all holdings with basic details"""
        holdings_list = []
        
        for h in self.holdings:
            holdings_list.append({
                "symbol": h.get("symbol", ""),
                "name": h.get("name", ""),
                "quantity": h.get("quantity", 0),
                "averageCost": h.get("averageCost", 0),
                "currentPrice": h.get("currentPrice", h.get("averageCost", 0)),
                "sector": h.get("sector", "Other"),
                "assetType": h.get("assetType", "stock")
            })
        
        return {
            "holdings": holdings_list,
            "count": len(holdings_list)
        }
    
    def _get_summary(self) -> Dict[str, Any]:
        """Get portfolio summary"""
        total_value = 0
        total_cost = 0
        sectors = set()
        asset_types = {}
        
        for h in self.holdings:
            qty = h.get("quantity", 0)
            price = h.get("currentPrice", h.get("averageCost", 0))
            cost = h.get("averageCost", 0)
            
            total_value += qty * price
            total_cost += qty * cost
            
            sector = h.get("sector", "Other")
            sectors.add(sector)
            
            asset_type = h.get("assetType", "stock")
            asset_types[asset_type] = asset_types.get(asset_type, 0) + 1
        
        return {
            "total_value": round(total_value, 2),
            "total_cost": round(total_cost, 2),
            "total_gain_loss": round(total_value - total_cost, 2),
            "return_percentage": round(((total_value - total_cost) / total_cost * 100) if total_cost > 0 else 0, 2),
            "holdings_count": len(self.holdings),
            "sectors_count": len(sectors),
            "sectors": list(sectors),
            "asset_types": asset_types
        }
    
    def _get_holding_details(self, symbol: str) -> Dict[str, Any]:
        """Get details for a specific holding"""
        symbol = symbol.upper()
        
        for h in self.holdings:
            if h.get("symbol", "").upper() == symbol:
                qty = h.get("quantity", 0)
                price = h.get("currentPrice", h.get("averageCost", 0))
                cost = h.get("averageCost", 0)
                
                return {
                    "found": True,
                    "symbol": h.get("symbol"),
                    "name": h.get("name", ""),
                    "quantity": qty,
                    "averageCost": cost,
                    "currentPrice": price,
                    "totalValue": round(qty * price, 2),
                    "totalCost": round(qty * cost, 2),
                    "gainLoss": round((qty * price) - (qty * cost), 2),
                    "returnPct": round(((price - cost) / cost * 100) if cost > 0 else 0, 2),
                    "sector": h.get("sector", "Other"),
                    "assetType": h.get("assetType", "stock")
                }
        
        return {
            "found": False,
            "symbol": symbol,
            "message": f"Holding {symbol} not found in portfolio"
        }
    
    def _get_sectors(self) -> Dict[str, Any]:
        """Get unique sectors and their holdings count"""
        sector_data = {}
        
        for h in self.holdings:
            sector = h.get("sector", "Other")
            if sector not in sector_data:
                sector_data[sector] = {
                    "count": 0,
                    "symbols": []
                }
            sector_data[sector]["count"] += 1
            sector_data[sector]["symbols"].append(h.get("symbol", ""))
        
        return {
            "sectors": sector_data,
            "total_sectors": len(sector_data)
        }
    
    def _get_top_holdings(self, limit: int = 5) -> Dict[str, Any]:
        """Get top N holdings by current value"""
        holdings_with_value = []
        
        for h in self.holdings:
            qty = h.get("quantity", 0)
            price = h.get("currentPrice", h.get("averageCost", 0))
            value = qty * price
            
            holdings_with_value.append({
                "symbol": h.get("symbol", ""),
                "name": h.get("name", ""),
                "value": round(value, 2),
                "quantity": qty,
                "currentPrice": price
            })
        
        # Sort by value descending
        holdings_with_value.sort(key=lambda x: x["value"], reverse=True)
        
        # Get top N
        top_holdings = holdings_with_value[:limit]
        
        # Calculate concentration
        total_value = sum(h["value"] for h in holdings_with_value)
        top_value = sum(h["value"] for h in top_holdings)
        
        return {
            "top_holdings": top_holdings,
            "top_n_value": round(top_value, 2),
            "top_n_percentage": round((top_value / total_value * 100) if total_value > 0 else 0, 2),
            "total_value": round(total_value, 2)
        }


# Factory function to create tool with data
def create_portfolio_tool(portfolio_data: Dict[str, Any]) -> PortfolioAnalysisTool:
    return PortfolioAnalysisTool(portfolio_data)
