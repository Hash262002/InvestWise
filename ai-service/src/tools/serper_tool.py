# ========================================
# Serper Web Search Tool
# ========================================
# Uses Serper.dev API for Google Search results

import httpx
import structlog
from typing import Dict, Any, List, Optional

from src.tools.base_tool import BaseTool, ToolResult, ToolResultStatus
from src.config.settings import settings

logger = structlog.get_logger()


class SerperSearchTool(BaseTool):
    """Tool for performing web searches using Serper.dev API"""
    
    def __init__(self):
        self.api_key = settings.SERPER_API_KEY
        self.base_url = "https://google.serper.dev"
    
    @property
    def name(self) -> str:
        return "web_search"
    
    @property
    def description(self) -> str:
        return """Search the web for current information about stocks, markets, financial news, and analyst opinions.
Use this tool when you need:
- Latest news about a specific stock or company
- Current market trends and sentiment
- Analyst ratings and price targets
- Economic indicators and market conditions"""
    
    @property
    def parameters(self) -> Dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query. Be specific and include relevant financial terms."
                },
                "search_type": {
                    "type": "string",
                    "enum": ["search", "news"],
                    "description": "Type of search: 'search' for general web, 'news' for news articles"
                },
                "num_results": {
                    "type": "integer",
                    "description": "Number of results to return (default: 5, max: 10)"
                }
            },
            "required": ["query"]
        }
    
    async def execute(
        self,
        query: str,
        search_type: str = "search",
        num_results: int = 5,
        **kwargs
    ) -> ToolResult:
        """
        Execute web search via Serper API.
        
        Args:
            query: Search query string
            search_type: 'search' or 'news'
            num_results: Number of results (1-10)
        """
        if not self.api_key:
            return ToolResult(
                status=ToolResultStatus.ERROR,
                data=None,
                error="SERPER_API_KEY not configured"
            )
        
        # Clamp num_results
        num_results = max(1, min(10, num_results))
        
        endpoint = "/news" if search_type == "news" else "/search"
        url = f"{self.base_url}{endpoint}"
        
        headers = {
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json"
        }
        
        payload = {
            "q": query,
            "num": num_results
        }
        
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
            
            # Parse results based on search type
            if search_type == "news":
                results = self._parse_news_results(data)
            else:
                results = self._parse_search_results(data)
            
            logger.info(
                "serper_search_completed",
                query=query,
                search_type=search_type,
                results_count=len(results)
            )
            
            return ToolResult(
                status=ToolResultStatus.SUCCESS,
                data={
                    "query": query,
                    "search_type": search_type,
                    "results": results,
                    "results_count": len(results)
                }
            )
            
        except httpx.HTTPStatusError as e:
            logger.error("serper_http_error", status=e.response.status_code)
            return ToolResult(
                status=ToolResultStatus.ERROR,
                data=None,
                error=f"Search API error: {e.response.status_code}"
            )
            
        except Exception as e:
            logger.error("serper_error", error=str(e))
            return ToolResult(
                status=ToolResultStatus.ERROR,
                data=None,
                error=f"Search failed: {str(e)}"
            )
    
    def _parse_search_results(self, data: Dict) -> List[Dict[str, str]]:
        """Parse organic search results"""
        results = []
        
        # Knowledge Graph (if available)
        if "knowledgeGraph" in data:
            kg = data["knowledgeGraph"]
            results.append({
                "type": "knowledge_graph",
                "title": kg.get("title", ""),
                "description": kg.get("description", ""),
                "attributes": kg.get("attributes", {})
            })
        
        # Organic results
        for item in data.get("organic", []):
            results.append({
                "type": "organic",
                "title": item.get("title", ""),
                "link": item.get("link", ""),
                "snippet": item.get("snippet", ""),
                "date": item.get("date", "")
            })
        
        return results
    
    def _parse_news_results(self, data: Dict) -> List[Dict[str, str]]:
        """Parse news search results"""
        results = []
        
        for item in data.get("news", []):
            results.append({
                "type": "news",
                "title": item.get("title", ""),
                "link": item.get("link", ""),
                "snippet": item.get("snippet", ""),
                "source": item.get("source", ""),
                "date": item.get("date", ""),
                "imageUrl": item.get("imageUrl", "")
            })
        
        return results
    
    async def search_stock_news(self, symbol: str, company_name: str = None) -> ToolResult:
        """Convenience method for searching stock-specific news"""
        query = f"{symbol} stock"
        if company_name:
            query = f"{company_name} ({symbol}) stock news analysis"
        
        return await self.execute(query=query, search_type="news", num_results=5)
    
    async def search_market_sentiment(self, sector: str = None) -> ToolResult:
        """Search for general market sentiment or sector-specific sentiment"""
        if sector:
            query = f"{sector} sector market outlook analysis 2024"
        else:
            query = "stock market sentiment outlook analysis today"
        
        return await self.execute(query=query, search_type="news", num_results=5)


# Singleton instance
serper_tool = SerperSearchTool()
