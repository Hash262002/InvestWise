# ========================================
# Research Agent
# ========================================
# Specialized agent for market research using Serper search

from typing import Dict, Any, List
import structlog

from src.agents.base_agent import BaseAgent, AgentResult
from src.llm.ollama_client import OllamaClient
from src.tools.serper_tool import SerperSearchTool

logger = structlog.get_logger()


class ResearchAgent(BaseAgent):
    """
    Research Agent - Gathers market intelligence and news.
    
    Responsibilities:
    - Search for latest news about stocks in portfolio
    - Gather analyst opinions and ratings
    - Research market sentiment and trends
    - Find sector-specific information
    """
    
    def __init__(self, llm: OllamaClient = None):
        tools = [SerperSearchTool()]
        super().__init__(llm=llm, tools=tools, max_iterations=5)
    
    @property
    def name(self) -> str:
        return "research_agent"
    
    @property
    def description(self) -> str:
        return "Gathers market news, analyst opinions, and sector trends through web search"
    
    @property
    def system_prompt(self) -> str:
        return """You are a Financial Research Agent specializing in gathering market intelligence.

CRITICAL TOOL CALLING RULES:
1. When calling web_search (Serper tool), ALWAYS include BOTH parameters:
   - query: the search query (string describing what to search for)
   - search_type: either "news" or "search" (default: "search")
2. Example correct tool call:
   Action Input: {"query": "Apple AAPL stock news 2026", "search_type": "news"}
3. NEVER call web_search without the query parameter
4. Use search_type="news" for current events or search_type="search" for general research

Your role is to:
1. Search for the latest news about stocks and companies
2. Find analyst opinions, ratings, and price targets
3. Research market sentiment and economic indicators
4. Identify sector trends affecting portfolio holdings

When researching a portfolio:
1. Identify the key holdings and sectors
2. Search for recent news about major holdings using web_search
3. Look for analyst consensus and ratings
4. Find any market-moving events or trends
5. ALWAYS include specific company symbols or keywords in your search queries

Search Strategy:
- Use specific stock symbols in queries (e.g., "AAPL", "GOOGL", "MSFT")
- Search for "news" when looking for current events
- Search for "analyst" or "rating" for consensus views
- Search for sector keywords to understand broader trends

Always provide your final answer in this format:
- Market Sentiment: [bullish/bearish/neutral with confidence]
- Key News: [bullet points of important news with dates]
- Analyst Views: [summary of analyst opinions and price targets]
- Risk Factors: [any warnings or concerns identified]
- Opportunities: [potential positive catalysts and advantages]"""
    
    async def research_portfolio(
        self,
        holdings: List[Dict[str, Any]],
        focus_areas: List[str] = None
    ) -> AgentResult:
        """
        Research a portfolio's holdings.
        
        Args:
            holdings: List of portfolio holdings
            focus_areas: Specific areas to research (e.g., ['news', 'analyst', 'sector'])
        """
        # Build task description
        symbols = [h.get("symbol", "") for h in holdings[:5]]  # Top 5 holdings
        sectors = list(set(h.get("sector", "Other") for h in holdings))
        
        task = f"""Research the following portfolio:

Holdings to research: {', '.join(symbols)}
Sectors: {', '.join(sectors)}

Please:
1. Search for recent news about the top holdings
2. Find analyst opinions on the main stocks
3. Research any sector-wide trends
4. Identify potential risks or opportunities

Provide a comprehensive research summary."""
        
        if focus_areas:
            task += f"\n\nFocus areas: {', '.join(focus_areas)}"
        
        context = {
            "holdings_count": len(holdings),
            "top_holdings": symbols,
            "sectors": sectors
        }
        
        return await self.run(task, context)
    
    async def research_stock(self, symbol: str, company_name: str = None) -> AgentResult:
        """Research a specific stock"""
        task = f"""Research the stock: {symbol}{f' ({company_name})' if company_name else ''}

Find:
1. Latest news and announcements
2. Analyst ratings and price targets
3. Recent price movements and reasons
4. Any upcoming events (earnings, dividends, etc.)

Provide a concise research summary."""
        
        return await self.run(task, {"symbol": symbol})
    
    async def research_sector(self, sector: str) -> AgentResult:
        """Research sector trends"""
        task = f"""Research the {sector} sector:

1. Current sector performance and trends
2. Key drivers affecting the sector
3. Major sector news
4. Outlook for the sector

Provide a sector analysis summary."""
        
        return await self.run(task, {"sector": sector})
