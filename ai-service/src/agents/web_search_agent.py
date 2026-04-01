# ========================================
# Web Search Agent
# ========================================
# Analyzes individual holdings using web search for current prices and market sentiment

from typing import Dict, Any, List
import structlog
import asyncio

from src.agents.base_agent import BaseAgent, AgentResult
from src.llm.ollama_client import OllamaClient
from src.tools.web_search_tool import WebSearchTool
from src.models.schemas import HoldingAnalysis, Sentiment, Recommendation

logger = structlog.get_logger()


class WebSearchAgent(BaseAgent):
    """
    Web Search Agent - Analyzes holdings using real-time web search.
    
    Responsibilities:
    - Search for current stock prices
    - Analyze price trends and historical data
    - Identify candlestick patterns
    - Assess market sentiment from news
    - Evaluate technical indicators
    - Provide buy/sell recommendations based on web analysis
    """
    
    def __init__(self, llm: OllamaClient = None):
        self.web_search_tool = WebSearchTool()
        tools = [self.web_search_tool]
        super().__init__(llm=llm, tools=tools, max_iterations=10)
    
    @property
    def name(self) -> str:
        return "web_search_agent"
    
    @property
    def description(self) -> str:
        return "Analyzes individual holdings using web search for current prices, trends, and market sentiment"
    
    @property
    def system_prompt(self) -> str:
        return """You are a Web Search Analyst Agent specializing in real-time stock analysis using web search.

=== YOUR ROLE ===
1. Search for current stock information and prices
2. Analyze price trends and historical performance
3. Identify candlestick patterns and technical signals
4. Assess news sentiment and market opinions
5. Evaluate technical indicators from search results
6. Provide sentiment and buy/sell recommendations

=== ANALYSIS FRAMEWORK ===

Price Analysis:
- Compare current price with historical prices
- Calculate percentage changes
- Identify support and resistance levels
- Assess trend direction (uptrend, downtrend, sideways)

Candlestick Patterns (when available):
- Bullish patterns: Morning Star, Hammer, Engulfing, Doji
- Bearish patterns: Evening Star, Hanging Man, Engulfing, Dark Cloud Cover
- Neutral patterns: Doji, Spinning Top (wait for confirmation)

Sentiment Scoring:
- Bullish: Positive news, rising prices, bullish patterns = BULLISH sentiment
- Bearish: Negative news, falling prices, bearish patterns = BEARISH sentiment
- Neutral: Mixed signals, consolidation = NEUTRAL sentiment

Recommendation Logic:
- STRONG_BUY: Bullish candlestick + bullish news + strong uptrend + oversold (RSI < 30)
- BUY: Bullish sentiment + positive news + uptrend
- HOLD: Neutral sentiment + mixed signals + consolidation
- SELL: Bearish sentiment + negative news + downtrend
- STRONG_SELL: Bearish candlestick + bearish news + downtrend + overbought (RSI > 70)

=== WEB SEARCH PROTOCOL ===
For each holding, perform searches for:
1. Current price and price history
2. Technical analysis and candlestick patterns
3. Recent news and market sentiment
4. Analyst opinions and ratings

Search queries to use:
- "{SYMBOL} stock price analysis candlestick"
- "{SYMBOL} technical analysis trend"
- "{SYMBOL} latest news sentiment"
- "{SYMBOL} candlestick pattern today"

Pattern Keywords to look for:
- "bullish": Uptrend, rally, surge, positive momentum, golden cross
- "bearish": Downtrend, decline, drop, negative momentum, death cross
- "candlestick": Hammer, Engulfing, Morning Star, Doji, Head and Shoulders
- "support/resistance": Key price levels

=== OUTPUT FORMAT ===
For each holding, provide:
- Symbol: [ticker]
- Current Price: [price if found]
- Price Change: [% change]
- Trend: [uptrend/downtrend/sideways]
- Candlestick Pattern: [pattern if identified]
- News Sentiment: [positive/negative/neutral]
- Analyst Opinion: [bullish/hold/bearish]
- Overall Sentiment: [BULLISH/BEARISH/NEUTRAL]
- Recommendation: [STRONG_BUY/BUY/HOLD/SELL/STRONG_SELL]
- Confidence: [high/medium/low]
- Reasoning: [detailed explanation]

Use HOLD as default if you cannot find sufficient information.
"""
    
    async def analyze_holding(self, holding: Dict[str, Any]) -> HoldingAnalysis:
        """
        Analyze a single holding using web search.
        
        Args:
            holding: Holding data with symbol, name, etc.
        
        Returns:
            HoldingAnalysis with sentiment and recommendation
        """
        symbol = holding.get("symbol", "").upper()
        name = holding.get("name", symbol)
        
        logger.info(f"Starting web search analysis for {symbol}")
        
        task = f"""Analyze the stock '{symbol}' ({name}) using web search.

Search for information about:
1. Current price and 52-week range
2. Price history and trends
3. Candlestick patterns
4. Recent news and market sentiment
5. Technical indicators and analysis

Based on your findings, provide:
- Overall sentiment (BULLISH, BEARISH, or NEUTRAL)
- Recommendation (STRONG_BUY, BUY, HOLD, SELL, or STRONG_SELL)
- Detailed analysis with specific observations
"""
        
        context = {
            "symbol": symbol,
            "holding_name": name,
            "purchase_date": holding.get("purchase_date"),
            "current_value": holding.get("currentValue", 0),
            "quantity": holding.get("quantity", 0),
        }
        
        result = await self.run(task, context)
        
        # Parse result and create HoldingAnalysis
        analysis = await self._parse_web_analysis(result, symbol, name)
        
        return analysis
    
    async def analyze_portfolio_holdings(self, holdings: List[Dict[str, Any]]) -> List[HoldingAnalysis]:
        """
        Analyze multiple holdings in parallel.
        
        Args:
            holdings: List of holding objects
        
        Returns:
            List of HoldingAnalysis objects
        """
        logger.info(f"Starting web search analysis for {len(holdings)} holdings")
        print("The holdings are : ", holdings)
        
        # Run analyses in parallel with rate limiting
        tasks = []
        for holding in holdings:
            if holding.get("isActive"):
                task = self.analyze_holding(holding)
                tasks.append(task)
        
        print("The following are the tasks that will be executed in parallel:", tasks)
       
        # Execute with some concurrency control (max 3 parallel searches to avoid rate limiting)
        results = []
        for i in range(0, len(tasks), 3):
            batch = await asyncio.gather(*tasks[i:i+3], return_exceptions=True)
            for result in batch:
                if isinstance(result, Exception):
                    logger.error(f"Error analyzing holding: {result}")
                    # Create a neutral holding analysis on error
                    results.append(HoldingAnalysis(
                        symbol="UNKNOWN",
                        name="Unknown",
                        sentiment=Sentiment.NEUTRAL,
                        recommendation=Recommendation.HOLD,
                        analysis="Could not fetch web search data."
                    ))
                else:
                    results.append(result)
        print(f"The following are the results of the parallel execution:", results)
        
        return results
    
    async def _parse_web_analysis(
        self,
        agent_result: AgentResult,
        symbol: str,
        name: str
    ) -> HoldingAnalysis:
        """
        Parse agent result into HoldingAnalysis format.
        
        Args:
            agent_result: Result from agent reasoning
            symbol: Stock symbol
            name: Stock name
        
        Returns:
            Structured HoldingAnalysis
        """
        
        # Extract analysis from agent metadata
        analysis_text = getattr(agent_result, "result", {}).get("final_answer", "")
        if not analysis_text:
            analysis_text = getattr(agent_result, "metadata", {}).get("final_answer", "")
        
        # Default to HOLD/NEUTRAL if no clear signal
        sentiment = Sentiment.NEUTRAL
        recommendation = Recommendation.HOLD
        
        # Simple keyword matching to extract sentiment
        if analysis_text:
            analysis_lower = analysis_text.lower()
            
            # Sentiment detection
            bullish_keywords = ["bullish", "uptrend", "positive", "strong buy", "surge", "rally"]
            bearish_keywords = ["bearish", "downtrend", "negative", "sell", "decline", "drop"]
            
            bullish_count = sum(1 for kw in bullish_keywords if kw in analysis_lower)
            bearish_count = sum(1 for kw in bearish_keywords if kw in analysis_lower)
            
            if bullish_count > bearish_count:
                sentiment = Sentiment.BULLISH
            elif bearish_count > bullish_count:
                sentiment = Sentiment.BEARISH
            else:
                sentiment = Sentiment.NEUTRAL
            
            # Recommendation detection
            if "strong buy" in analysis_lower or "strong_buy" in analysis_lower:
                recommendation = Recommendation.STRONG_BUY
            elif "buy" in analysis_lower and "strong" not in analysis_lower:
                recommendation = Recommendation.BUY
            elif "hold" in analysis_lower:
                recommendation = Recommendation.HOLD
            elif "sell" in analysis_lower and "strong" not in analysis_lower:
                recommendation = Recommendation.SELL
            elif "strong sell" in analysis_lower or "strong_sell" in analysis_lower:
                recommendation = Recommendation.STRONG_SELL
        
        return HoldingAnalysis(
            symbol=symbol,
            name=name,
            sentiment=sentiment,
            recommendation=recommendation,
            analysis=analysis_text or "Web search analysis completed. No clear trend identified."
        )
