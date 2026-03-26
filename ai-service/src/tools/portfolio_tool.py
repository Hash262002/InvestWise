from typing import Dict, Any, List, Optional
import logging

from .base_tool import BaseTool

logger = logging.getLogger(__name__)


class PortfolioAnalysisTool(BaseTool):
    """Tool for portfolio data extraction and analysis helpers"""
    
    name = "portfolio_analyzer"
    description = """Portfolio data extraction tool. Extracts specific information from portfolio data.
    
    Operations:
    - get_holdings_summary: Get summary of all holdings
    - get_sector_breakdown: Get sector-wise breakdown
    - get_top_holdings: Get top N holdings by value
    - get_asset_type_breakdown: Get breakdown by asset type
    - identify_risks: Identify potential risks in portfolio
    
    Required parameters:
    - operation: The operation to perform
    - portfolio: The portfolio data dictionary
    """
    
    def _get_parameters_schema(self) -> Dict[str, Any]:
        return {
            "operation": {
                "type": "string",
                "required": True,
                "description": "Operation to perform",
                "enum": [
                    "get_holdings_summary",
                    "get_sector_breakdown",
                    "get_top_holdings",
                    "get_asset_type_breakdown",
                    "identify_risks",
                ],
            },
            "portfolio": {
                "type": "object",
                "required": True,
                "description": "Portfolio data",
            },
            "top_n": {
                "type": "integer",
                "required": False,
                "description": "Number of top holdings to return (default: 5)",
            },
        }
    
    def validate_parameters(
        self, 
        operation: str = None, 
        portfolio: Dict = None, 
        **kwargs
    ) -> Optional[str]:
        if not operation:
            return "Missing required parameter: operation"
        if not portfolio:
            return "Missing required parameter: portfolio"
        return None
    
    def execute(
        self, 
        operation: str = None, 
        portfolio: Dict = None, 
        top_n: int = 5,
        **kwargs
    ) -> Dict[str, Any]:
        """Execute portfolio analysis operation"""
        
        if not operation or not portfolio:
            return {
                "error": True,
                "message": f"Missing required parameters. Got operation={operation}, portfolio={'provided' if portfolio else 'missing'}",
            }
        
        operations = {
            "get_holdings_summary": self._get_holdings_summary,
            "get_sector_breakdown": self._get_sector_breakdown,
            "get_top_holdings": lambda p: self._get_top_holdings(p, top_n),
            "get_asset_type_breakdown": self._get_asset_type_breakdown,
            "identify_risks": self._identify_risks,
        }
        
        if operation not in operations:
            return {
                "error": True,
                "message": f"Unknown operation: {operation}",
            }
        
        try:
            result = operations[operation](portfolio)
            return {
                "operation": operation,
                "result": result,
                "error": False,
            }
        except Exception as e:
            logger.error(f"Portfolio operation error: {e}")
            return {
                "error": True,
                "message": str(e),
            }
    
    def _get_holdings_summary(self, portfolio: Dict) -> Dict[str, Any]:
        """Get summary of all holdings"""
        holdings = portfolio.get("holdings", [])
        
        return {
            "total_holdings": len(holdings),
            "total_invested": portfolio.get("total_invested", 0),
            "current_value": portfolio.get("current_value", 0),
            "portfolio_name": portfolio.get("name", "Unknown"),
            "currency": portfolio.get("currency", "INR"),
            "holdings": [
                {
                    "symbol": h.get("symbol"),
                    "name": h.get("name"),
                    "quantity": h.get("quantity"),
                    "avg_cost": h.get("average_cost", h.get("averageCost")),
                    "current_value": h.get("current_value", h.get("currentValue")),
                }
                for h in holdings
            ],
        }
    
    def _get_sector_breakdown(self, portfolio: Dict) -> Dict[str, Any]:
        """Get sector-wise breakdown"""
        holdings = portfolio.get("holdings", [])
        
        sectors = {}
        total_value = 0
        
        for h in holdings:
            sector = h.get("sector", "Unknown") or "Unknown"
            value = h.get("current_value", h.get("currentValue", h.get("total_cost", 0)))
            sectors[sector] = sectors.get(sector, 0) + value
            total_value += value
        
        breakdown = []
        for sector, value in sorted(sectors.items(), key=lambda x: -x[1]):
            breakdown.append({
                "sector": sector,
                "value": value,
                "percentage": round((value / total_value * 100) if total_value > 0 else 0, 2),
            })
        
        return {
            "sectors": breakdown,
            "total_sectors": len(sectors),
            "total_value": total_value,
        }
    
    def _get_top_holdings(self, portfolio: Dict, n: int = 5) -> Dict[str, Any]:
        """Get top N holdings by value"""
        holdings = portfolio.get("holdings", [])
        
        # Sort by current value
        sorted_holdings = sorted(
            holdings,
            key=lambda h: h.get("current_value", h.get("currentValue", 0)),
            reverse=True
        )
        
        top = sorted_holdings[:n]
        total_value = sum(
            h.get("current_value", h.get("currentValue", 0)) 
            for h in holdings
        )
        
        return {
            "top_holdings": [
                {
                    "rank": i + 1,
                    "symbol": h.get("symbol"),
                    "name": h.get("name"),
                    "value": h.get("current_value", h.get("currentValue", 0)),
                    "weight": round(
                        (h.get("current_value", h.get("currentValue", 0)) / total_value * 100)
                        if total_value > 0 else 0, 2
                    ),
                }
                for i, h in enumerate(top)
            ],
            "top_n_value": sum(
                h.get("current_value", h.get("currentValue", 0)) 
                for h in top
            ),
            "top_n_weight": round(
                sum(h.get("current_value", h.get("currentValue", 0)) for h in top) / total_value * 100
                if total_value > 0 else 0, 2
            ),
        }
    
    def _get_asset_type_breakdown(self, portfolio: Dict) -> Dict[str, Any]:
        """Get breakdown by asset type"""
        holdings = portfolio.get("holdings", [])
        
        types = {}
        total_value = 0
        
        for h in holdings:
            asset_type = h.get("asset_type", h.get("assetType", "stock"))
            value = h.get("current_value", h.get("currentValue", h.get("total_cost", 0)))
            types[asset_type] = types.get(asset_type, 0) + value
            total_value += value
        
        breakdown = []
        for asset_type, value in sorted(types.items(), key=lambda x: -x[1]):
            breakdown.append({
                "type": asset_type,
                "value": value,
                "percentage": round((value / total_value * 100) if total_value > 0 else 0, 2),
            })
        
        return {
            "asset_types": breakdown,
            "total_types": len(types),
        }
    
    def _identify_risks(self, portfolio: Dict) -> Dict[str, Any]:
        """Identify potential risks in portfolio"""
        holdings = portfolio.get("holdings", [])
        risks = []
        
        if not holdings:
            return {"risks": ["Portfolio has no holdings"], "risk_count": 1}
        
        total_value = sum(
            h.get("current_value", h.get("currentValue", h.get("total_cost", 0)))
            for h in holdings
        )
        
        # Check for concentration risk
        for h in holdings:
            value = h.get("current_value", h.get("currentValue", 0))
            weight = (value / total_value * 100) if total_value > 0 else 0
            
            if weight > 30:
                risks.append({
                    "type": "concentration",
                    "severity": "high",
                    "message": f"{h.get('symbol')} represents {weight:.1f}% of portfolio - high single-stock risk",
                })
            elif weight > 20:
                risks.append({
                    "type": "concentration",
                    "severity": "medium",
                    "message": f"{h.get('symbol')} represents {weight:.1f}% of portfolio - moderate concentration",
                })
        
        # Check for sector concentration
        sectors = {}
        for h in holdings:
            sector = h.get("sector", "Unknown") or "Unknown"
            value = h.get("current_value", h.get("currentValue", 0))
            sectors[sector] = sectors.get(sector, 0) + value
        
        for sector, value in sectors.items():
            weight = (value / total_value * 100) if total_value > 0 else 0
            if weight > 50:
                risks.append({
                    "type": "sector_concentration",
                    "severity": "high",
                    "message": f"{sector} sector represents {weight:.1f}% of portfolio",
                })
        
        # Check for low diversification
        if len(holdings) < 5:
            risks.append({
                "type": "diversification",
                "severity": "medium",
                "message": f"Low diversification - only {len(holdings)} holdings",
            })
        
        if len(sectors) < 3:
            risks.append({
                "type": "diversification",
                "severity": "medium",
                "message": f"Low sector diversification - only {len(sectors)} sectors",
            })
        
        return {
            "risks": risks,
            "risk_count": len(risks),
            "high_severity": len([r for r in risks if r.get("severity") == "high"]),
            "medium_severity": len([r for r in risks if r.get("severity") == "medium"]),
        }
