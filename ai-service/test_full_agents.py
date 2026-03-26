"""
Full Agent Pipeline Test
========================
Simulates a complete 'full' analysis by mocking the OllamaClient.
Shows what each agent (Analyst, Risk, Research) produces and
the final Kafka result message with per-holding analysis.
"""

import asyncio
import json
import sys
import os
from unittest.mock import AsyncMock, patch
from typing import Dict, Any, List

sys.path.insert(0, os.path.dirname(__file__))

from src.agents.orchestrator import OrchestratorAgent, AnalysisResult, HoldingAnalysis
from src.agents.base_agent import AgentResult, AgentStep
from src.llm.ollama_client import OllamaClient

# ─── Dummy holdings (same 6-stock Indian portfolio) ───

DUMMY_HOLDINGS = [
    {
        "symbol": "RELIANCE",
        "name": "Reliance Industries Ltd",
        "sector": "Energy",
        "assetType": "stock",
        "quantity": 50000,
        "averageCost": 2400.00,
        "currentPrice": 2850.00,
    },
    {
        "symbol": "TCS",
        "name": "Tata Consultancy Services",
        "sector": "Technology",
        "assetType": "stock",
        "quantity": 30,
        "averageCost": 3500.00,
        "currentPrice": 3900.00,
    },
    {
        "symbol": "HDFCBANK",
        "name": "HDFC Bank Ltd",
        "sector": "Finance",
        "assetType": "stock",
        "quantity": 100,
        "averageCost": 1600.00,
        "currentPrice": 1720.00,
    },
    {
        "symbol": "INFY",
        "name": "Infosys Ltd",
        "sector": "Technology",
        "assetType": "stock",
        "quantity": 60,
        "averageCost": 1400.00,
        "currentPrice": 1550.00,
    },
    {
        "symbol": "SUNPHARMA",
        "name": "Sun Pharmaceutical Industries",
        "sector": "Healthcare",
        "assetType": "stock",
        "quantity": 40,
        "averageCost": 1100.00,
        "currentPrice": 1250.00,
    },
    {
        "symbol": "ICICIBANK",
        "name": "ICICI Bank Ltd",
        "sector": "Finance",
        "assetType": "stock",
        "quantity": 80,
        "averageCost": 950.00,
        "currentPrice": 1080.00,
    },
]

# ═══════════════════════════════════════════════════
# Mock LLM responses — simulates what Ollama returns
# for each agent's ReAct loop
# ═══════════════════════════════════════════════════

# Track which call we're on for each type
call_tracker = {"generate_with_tools": 0, "generate": 0}


async def mock_generate_with_tools(prompt, tools, system_prompt=None, temperature=0.1):
    """
    Simulates the LLM's ReAct responses.
    The agents call this in a loop; we return tool calls first,
    then a Final Answer to end the loop.
    """
    call_tracker["generate_with_tools"] += 1
    call_num = call_tracker["generate_with_tools"]

    # ── Analyst Agent calls ──
    if "Financial Analyst Agent" in (system_prompt or ""):
        if "Observation:" not in prompt:
            # First call - agent asks for portfolio summary
            return {
                "thought": "I need to get the portfolio summary to understand the overall position.",
                "action": "portfolio_reader",
                "action_input": {"operation": "get_summary"},
                "final_answer": None,
                "raw": "",
            }
        else:
            # Second call - agent has observations, gives final answer
            return {
                "thought": "I have the portfolio summary. Let me provide my analysis.",
                "action": None,
                "action_input": None,
                "final_answer": (
                    "Portfolio Value: ₹6,60,900 | Total Cost: ₹5,89,000 | Total Return: +12.2%\n\n"
                    "Top Performers:\n"
                    "- RELIANCE: +18.75% (₹22,500 gain) — Strong energy sector rally\n"
                    "- ICICIBANK: +13.68% (₹10,400 gain) — Banking sector momentum\n"
                    "- SUNPHARMA: +13.64% (₹6,000 gain) — Pharma recovery\n\n"
                    "Underperformers:\n"
                    "- HDFCBANK: +7.50% (₹12,000 gain) — Lagging peers in banking\n\n"
                    "Allocation Analysis:\n"
                    "- Finance sector dominates at 39.1% (HDFCBANK 26% + ICICIBANK 13%)\n"
                    "- Technology at 31.8% (TCS 17.7% + INFY 14.1%)\n"
                    "- Energy at 21.6% (single stock RELIANCE)\n"
                    "- Healthcare underweight at 7.6%\n\n"
                    "Recommendations:\n"
                    "1. Reduce HDFCBANK position — 26% weight creates concentration risk\n"
                    "2. Increase Healthcare exposure — currently only 7.6%\n"
                    "3. Consider adding Consumer/FMCG sector for diversification\n"
                    "4. All holdings profitable — no immediate sell signals"
                ),
                "raw": "",
            }

    # ── Risk Agent calls ──
    elif "Risk Assessment Agent" in (system_prompt or ""):
        if "Observation:" not in prompt:
            # First call - calculate concentration risk
            return {
                "thought": "I need to calculate the concentration risk metrics for this portfolio.",
                "action": "financial_calculator",
                "action_input": {
                    "calculation": "concentration_risk",
                    "data": {"holdings": DUMMY_HOLDINGS},
                },
                "final_answer": None,
                "raw": "",
            }
        else:
            # Second call - final risk assessment
            return {
                "thought": "I have the concentration data. Let me provide my risk assessment.",
                "action": None,
                "action_input": None,
                "final_answer": (
                    "Risk Score: 5.2/10\n"
                    "Diversification Score: 6.0/10\n"
                    "Risk Level: Medium Risk\n\n"
                    "Key Risk Factors:\n"
                    "- HDFCBANK at 26% weight — single-stock concentration risk\n"
                    "- Finance sector at 39.1% — sector overweight (>30% threshold)\n"
                    "- Only 4 sectors covered — missing Consumer, Industrial, Utilities\n"
                    "- Top 3 holdings = 65.3% of portfolio — high concentration\n\n"
                    "Positive Factors:\n"
                    "- All 6 holdings are profitable (no loss-makers)\n"
                    "- Mix of large-cap blue chips — lower individual stock risk\n"
                    "- Energy + Healthcare provide some defensive positioning\n\n"
                    "Recommendations:\n"
                    "1. Trim HDFCBANK to below 20% weight\n"
                    "2. Reduce combined Finance exposure to below 30%\n"
                    "3. Add 2-3 holdings in Consumer/FMCG and Industrial sectors\n"
                    "4. Target 8+ holdings for better risk distribution"
                ),
                "raw": "",
            }

    # ── Research Agent calls ──
    elif "Financial Research Agent" in (system_prompt or ""):
        if "Observation:" not in prompt:
            # First call - agent searches for news
            return {
                "thought": "I need to search for recent market news about the top holdings.",
                "action": "web_search",
                "action_input": {
                    "query": "Reliance Industries TCS HDFC Bank stock news 2026",
                    "search_type": "news",
                    "num_results": 5,
                },
                "final_answer": None,
                "raw": "",
            }
        else:
            # Second call - synthesize research
            return {
                "thought": "I have search results. Let me compile the research summary.",
                "action": None,
                "action_input": None,
                "final_answer": (
                    "Market Sentiment: Cautiously Bullish\n\n"
                    "Key News:\n"
                    "- Reliance Jio announces 5G expansion plans — positive for RELIANCE\n"
                    "- TCS wins $2B multi-year digital transformation deal with European bank\n"
                    "- RBI holds repo rate steady at 6.0% — neutral for banking stocks\n"
                    "- Sun Pharma gets USFDA approval for new generic drug — positive catalyst\n"
                    "- IT sector faces headwinds from global slowdown in discretionary spending\n\n"
                    "Analyst Views:\n"
                    "- RELIANCE: Consensus 'Buy', target ₹3,100 (upside 8.8%)\n"
                    "- TCS: Consensus 'Hold', target ₹4,000 (upside 2.6%)\n"
                    "- HDFCBANK: Consensus 'Buy', target ₹1,900 (upside 10.5%)\n"
                    "- INFY: Consensus 'Hold', target ₹1,600 (upside 3.2%)\n\n"
                    "Risk Factors:\n"
                    "- Global recession fears could impact IT export revenue\n"
                    "- Oil price volatility affects Reliance refining margins\n"
                    "- NPA concerns in banking sector if economy slows\n\n"
                    "Opportunities:\n"
                    "- India domestic consumption story remains intact\n"
                    "- Banking credit growth healthy at 14% YoY"
                ),
                "raw": "",
            }

    # Default fallback
    return {
        "thought": "Analysis complete.",
        "action": None,
        "action_input": None,
        "final_answer": "Analysis completed.",
        "raw": "",
    }


async def mock_generate(prompt, system_prompt=None, temperature=0.7, max_tokens=2048, **kwargs):
    """Mock for the synthesis step where orchestrator combines all insights."""
    call_tracker["generate"] += 1
    return (
        "Summary: The portfolio of 6 Indian large-cap stocks is valued at ₹6.61 lakh with a healthy 12.2% return. "
        "Finance sector is overweight at 39% with HDFCBANK creating concentration risk at 26% weight. "
        "All holdings are profitable with Reliance leading at +18.75%.\n"
        "Recommendations:\n"
        "- Trim HDFCBANK position from 26% to below 20% to reduce single-stock concentration risk\n"
        "- Add Healthcare or Consumer sector holdings to improve diversification from current 4 sectors\n"
        "- Book partial profits in RELIANCE (+18.75%) and redeploy into underweight sectors\n"
        "- Consider adding 2-3 mid-cap positions for growth exposure alongside large-cap core\n"
        "- Maintain TCS and INFY positions as IT sector provides global revenue diversification"
    )


# Mock the Serper search (Research agent calls this tool)
async def mock_serper_execute(query, search_type="search", num_results=5, **kwargs):
    from src.tools.base_tool import ToolResult, ToolResultStatus

    return ToolResult(
        status=ToolResultStatus.SUCCESS,
        data={
            "query": query,
            "search_type": search_type,
            "results": [
                {
                    "type": "news",
                    "title": "Reliance Jio announces aggressive 5G expansion across India",
                    "snippet": "Reliance Jio plans to cover all major cities with 5G by mid-2026...",
                    "source": "Economic Times",
                    "date": "2026-03-12",
                },
                {
                    "type": "news",
                    "title": "TCS wins $2B deal with European banking giant",
                    "snippet": "TCS secures multi-year digital transformation contract...",
                    "source": "Business Standard",
                    "date": "2026-03-11",
                },
                {
                    "type": "news",
                    "title": "RBI monetary policy: Repo rate held at 6.0%",
                    "snippet": "Reserve Bank of India keeps rates unchanged citing inflation concerns...",
                    "source": "Mint",
                    "date": "2026-03-10",
                },
                {
                    "type": "news",
                    "title": "Sun Pharma gets USFDA nod for new generic formulation",
                    "snippet": "Sun Pharmaceutical Industries receives approval for generic version...",
                    "source": "Moneycontrol",
                    "date": "2026-03-09",
                },
            ],
            "results_count": 4,
        },
    )


# ═══════════════════════════════════════════════════
# The actual test
# ═══════════════════════════════════════════════════

SEPARATOR = "=" * 70
THIN_SEP = "-" * 70


async def main():
    print(SEPARATOR)
    print("  InvestWise AI Service — Full Agent Pipeline Test")
    print("  (LLM mocked · All 3 agents running)")
    print(SEPARATOR)

    # Create orchestrator with mocked LLM
    mock_llm = OllamaClient.__new__(OllamaClient)
    mock_llm.model = "llama3.1:8b"
    mock_llm.base_url = "http://mock:11434"
    mock_llm.timeout = 120
    mock_llm.generate_with_tools = mock_generate_with_tools
    mock_llm.generate = mock_generate

    orchestrator = OrchestratorAgent(llm=mock_llm, enable_research=True)

    # Patch the Serper tool so research agent doesn't call real API
    orchestrator.research_agent.tools[0].execute = mock_serper_execute
    orchestrator.research_agent.tool_map["web_search"].execute = mock_serper_execute

    portfolio_id = "6614a1b2c3d4e5f6a7b8c9d0"
    user_id = "6614a1b2c3d4e5f6a7b8c9d1"

    print(f"\n📤 INPUT: {len(DUMMY_HOLDINGS)} holdings, type=full")
    print(f"   Portfolio: {portfolio_id}")

    # ─── Run full analysis ───
    print("\n🤖 Running full multi-agent analysis...\n")

    result: AnalysisResult = await orchestrator.analyze_portfolio(
        portfolio_id=portfolio_id,
        user_id=user_id,
        holdings=DUMMY_HOLDINGS,
        analysis_type="full",
    )

    # ═══════════════════════════════════════════════
    # Print each agent's output
    # ═══════════════════════════════════════════════

    print(SEPARATOR)
    print("  AGENT OUTPUTS")
    print(SEPARATOR)

    # ── Analyst Agent ──
    print("\n🔵 ANALYST AGENT OUTPUT:")
    print(THIN_SEP)
    if result.analyst_insights:
        for line in result.analyst_insights.strip().split("\n"):
            print(f"   {line}")
    else:
        print("   (no output)")
    print(THIN_SEP)

    # ── Risk Agent ──
    print("\n🔴 RISK AGENT OUTPUT:")
    print(THIN_SEP)
    if result.risk_insights:
        for line in result.risk_insights.strip().split("\n"):
            print(f"   {line}")
    else:
        print("   (no output)")
    print(THIN_SEP)

    # ── Research Agent ──
    print("\n🟢 RESEARCH AGENT OUTPUT:")
    print(THIN_SEP)
    if result.research_insights:
        for line in result.research_insights.strip().split("\n"):
            print(f"   {line}")
    else:
        print("   (no output — research disabled or failed)")
    print(THIN_SEP)

    # ═══════════════════════════════════════════════
    # Synthesized result
    # ═══════════════════════════════════════════════

    print(f"\n{SEPARATOR}")
    print("  SYNTHESIZED PORTFOLIO ANALYSIS")
    print(SEPARATOR)

    print(f"\n📊 STATUS: {result.status}")
    print(f"   Risk Score:          {result.risk_score}/10")
    print(f"   Diversification:     {result.diversification_score}/10")
    print(f"   Risk Level:          {result.risk_level}")

    print(f"\n📝 SUMMARY:")
    print(f"   {result.summary}")

    print(f"\n💡 RECOMMENDATIONS:")
    for i, rec in enumerate(result.recommendations, 1):
        print(f"   {i}. {rec}")

    print(f"\n💰 PORTFOLIO METRICS:")
    print(f"   Total Value:    ₹{result.total_value:>12,.2f}")
    print(f"   Total Cost:     ₹{result.total_cost:>12,.2f}")
    print(f"   Total P&L:      ₹{result.total_pnl:>12,.2f}")
    print(f"   Return:          {result.total_return_pct:>11.2f}%")
    print(f"   Holdings:        {result.holdings_count:>11}")

    print(f"\n📈 SECTOR WEIGHTS:")
    for sector, weight in result.sector_weights.items():
        bar = "█" * int(weight / 2)
        print(f"   {sector:20s} {weight:>5.1f}% {bar}")

    print(f"\n🔍 PER-HOLDING ANALYSIS:")
    header = f"   {'Symbol':<12} {'Value':>12} {'P&L':>12} {'P&L%':>8} {'Weight':>8} {'Risk':>8} {'Action':>8}"
    print(header)
    print(f"   {'─'*12} {'─'*12} {'─'*12} {'─'*8} {'─'*8} {'─'*8} {'─'*8}")
    for h in result.holding_analyses:
        print(
            f"   {h.symbol:<12} "
            f"₹{h.current_value:>10,.0f} "
            f"₹{h.unrealized_pnl:>10,.0f} "
            f"{h.unrealized_pnl_pct:>7.2f}% "
            f"{h.portfolio_weight_pct:>7.1f}% "
            f"{h.risk_level:>8} "
            f"{h.recommendation:>8}"
        )
        if h.concentration_risk:
            print(f"   {'':12} ⚠️  CONCENTRATION RISK — {h.recommendation_reason}")

    # ═══════════════════════════════════════════════
    # Final Kafka message
    # ═══════════════════════════════════════════════

    kafka_msg = {
        "portfolioId": portfolio_id,
        "userId": user_id,
        "status": result.status,
        "timestamp": 1710432000.123,
        "analysis": {
            "summary": result.summary,
            "riskScore": result.risk_score,
            "diversificationScore": result.diversification_score,
            "riskLevel": result.risk_level,
            "recommendations": result.recommendations,
            "sectorWeights": result.sector_weights,
            "holdingAnalyses": [h.to_dict() for h in result.holding_analyses],
            "portfolioMetrics": {
                "totalValue": result.total_value,
                "totalCost": result.total_cost,
                "totalPnl": result.total_pnl,
                "totalReturnPct": result.total_return_pct,
                "holdingsCount": result.holdings_count,
            },
            "insights": {
                "research": result.research_insights,
                "analyst": result.analyst_insights,
                "risk": result.risk_insights,
            },
            "aiModel": "llama3.1:8b",
            "analysisType": "full",
            "processingTimeMs": result.processing_time_ms,
        },
    }

    print(f"\n{SEPARATOR}")
    print("  FULL KAFKA RESULT MESSAGE (AI Service → Backend)")
    print(SEPARATOR)
    print(json.dumps(kafka_msg, indent=2))

    print(f"\n{SEPARATOR}")
    print(f"  LLM calls: generate_with_tools={call_tracker['generate_with_tools']}, generate={call_tracker['generate']}")
    print(f"  Processing time: {result.processing_time_ms}ms")
    print(f"  Errors: {result.errors if result.errors else 'None'}")
    print(SEPARATOR)


if __name__ == "__main__":
    asyncio.run(main())
