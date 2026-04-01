# ========================================
# Web Search Tool (Serper API)
# ========================================
# Searches the web for stock information using Serper API

from typing import Dict, Any, Optional, List
import httpx
import asyncio
import structlog
from datetime import datetime

from src.tools.base_tool import BaseTool, ToolResult, ToolResultStatus
from src.config.settings import get_settings

logger = structlog.get_logger()


class WebSearchTool(BaseTool):
    """Tool for searching the web using Serper API for stock information"""
    
    def __init__(self):
        self.settings = get_settings()
        self.api_key = self.settings.serper_api_key
        self.base_url = "https://google.serper.dev/search"
        self.timeout = 10
        
        if not self.api_key:
            logger.warning("Serper API key not configured. Web search functionality disabled.")
    
    @property
    def name(self) -> str:
        return "web_search"
    
    @property
    def description(self) -> str:
        return """Search the web for stock information using Serper API.
        
Searches for:
- Current stock prices
- Price history and trends
- Candlestick patterns and technical analysis
- Company news and updates
- Analyst opinions and ratings
- Market sentiment

Parameters:
- symbol: Stock ticker symbol (e.g., "RELIANCE", "TCS")
- query: Optional specific search query
- max_results: Number of results to return (default: 5)

Returns structured data with search results, knowledge graphs, and news."""
    
    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "symbol": {
                    "type": "string",
                    "description": "Stock ticker symbol to search (e.g., RELIANCE, TCS)"
                },
                "query": {
                    "type": "string",
                    "description": "Optional specific search query. If not provided, will search for current price and analysis."
                },
                "max_results": {
                    "type": "integer",
                    "default": 5,
                    "description": "Maximum number of search results to return"
                }
            },
            "required": ["symbol"]
        }
    
    async def execute_async(
        self,
        symbol: str,
        query: Optional[str] = None,
        max_results: int = 5,
        **kwargs
    ) -> ToolResult:
        """Execute web search asynchronously"""
        
        if not self.api_key:
            return ToolResult(
                status=ToolResultStatus.ERROR,
                error="Serper API key not configured. Cannot perform web search."
            )
        
        if not symbol:
            return ToolResult(
                status=ToolResultStatus.ERROR,
                error="Stock symbol is required for web search."
            )
        
        try:
            # Build search query
            if query:
                search_query = f"{symbol} {query}"
            else:
                # Default search: current price, analysis, candlestick
                search_query = f"{symbol} stock price analysis candlestick NSE"
            
            # Perform search
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    self.base_url,
                    headers={
                        "X-API-KEY": self.api_key,
                        "Content-Type": "application/json"
                    },
                    json={"q": search_query, "gl": "in"}  # India-based search
                )
                
                if response.status_code != 200:
                    logger.error("Serper API error", status=response.status_code, symbol=symbol)
                    return ToolResult(
                        status=ToolResultStatus.ERROR,
                        error=f"Serper API returned status {response.status_code}"
                    )
                
                data = response.json()
                
                # Extract and structure results
                structured_data = {
                    "symbol": symbol,
                    "query": search_query,
                    "timestamp": datetime.utcnow().isoformat(),
                    "organic_results": data.get("organic", [])[:max_results],
                    "knowledge_graph": data.get("knowledgeGraph", {}),
                    "news": data.get("news", [])[:3],  # Top 3 news
                    "answer_box": data.get("answerBox", {}),
                }
                
                logger.info("Web search completed", symbol=symbol, results_count=len(data.get("organic", [])))
                
                return ToolResult(
                    status=ToolResultStatus.SUCCESS,
                    data=structured_data
                )
        
        except httpx.TimeoutException:
            logger.error("Serper API timeout", symbol=symbol)
            return ToolResult(
                status=ToolResultStatus.ERROR,
                error=f"Web search timed out for {symbol}"
            )
        except Exception as e:
            logger.error("Web search error", symbol=symbol, error=str(e))
            return ToolResult(
                status=ToolResultStatus.ERROR,
                error=f"Failed to search web for {symbol}: {str(e)}"
            )
    
    def execute(
        self,
        symbol: str,
        query: Optional[str] = None,
        max_results: int = 5,
        **kwargs
    ) -> ToolResult:
        """Synchronous wrapper for async execution"""
        
        # For now, return a placeholder if not available
        # In the base_agent, we'll use the async version
        if not self.api_key:
            return ToolResult(
                status=ToolResultStatus.ERROR,
                error="Serper API key not configured. Cannot perform web search."
            )
        
        # This will be called from async context mostly
        return ToolResult(
            status=ToolResultStatus.SUCCESS,
            data={
                "symbol": symbol,
                "query": query or f"{symbol} stock analysis",
                "note": "Use execute_async for actual web search"
            }
        )
    
    def validate_parameters(self, **kwargs) -> Optional[str]:
        """Validate web search parameters"""
        symbol = kwargs.get("symbol")
        
        if not symbol:
            return "Stock symbol is required"
        
        if not isinstance(symbol, str) or len(symbol) < 1:
            return f"Invalid symbol: {symbol}. Must be a non-empty string."
        
        return None
