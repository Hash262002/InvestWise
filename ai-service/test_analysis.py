"""
Test script - Simulates a Kafka message going through the orchestrator.
Uses 'quick' analysis mode (no LLM/Ollama required).
"""

import asyncio
import json
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(__file__))

from src.agents.orchestrator import OrchestratorAgent, AnalysisResult

# ─── Dummy Kafka Message (what the backend would produce) ───

DUMMY_KAFKA_REQUEST = {
    "portfolioId": "6614a1b2c3d4e5f6a7b8c9d0",
    "userId": "6614a1b2c3d4e5f6a7b8c9d1",
    "holdings": [
        {
            "symbol": "RELIANCE",
            "name": "Reliance Industries Ltd",
            "sector": "Energy",
            "assetType": "stock",
            "quantity": 50,
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
    ],
    "requestType": "quick",
}


async def main():
    print("=" * 60)
    print("  InvestWise AI Service - Dummy Kafka Message Test")
    print("=" * 60)

    # ─── What the backend sends to Kafka ───
    print("\n📤 INCOMING KAFKA REQUEST (from backend):")
    print(f"   portfolioId: {DUMMY_KAFKA_REQUEST['portfolioId']}")
    print(f"   userId:      {DUMMY_KAFKA_REQUEST['userId']}")
    print(f"   holdings:    {len(DUMMY_KAFKA_REQUEST['holdings'])} stocks")
    print(f"   requestType: {DUMMY_KAFKA_REQUEST['requestType']}")

    # ─── Run orchestrator (quick mode = no LLM needed) ───
    print("\n🤖 Running quick analysis (no Ollama needed)...")
    orchestrator = OrchestratorAgent(llm=None, enable_research=False)

    result: AnalysisResult = await orchestrator.analyze_portfolio(
        portfolio_id=DUMMY_KAFKA_REQUEST["portfolioId"],
        user_id=DUMMY_KAFKA_REQUEST["userId"],
        holdings=DUMMY_KAFKA_REQUEST["holdings"],
        analysis_type="quick",
    )

    # ─── Build the exact Kafka result message (same as main.py) ───
    kafka_result_message = {
        "portfolioId": DUMMY_KAFKA_REQUEST["portfolioId"],
        "userId": DUMMY_KAFKA_REQUEST["userId"],
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
            "analysisType": "quick",
            "processingTimeMs": result.processing_time_ms,
        },
    }

    # ─── Print the result ───
    print("\n✅ ANALYSIS COMPLETE\n")
    print("📦 KAFKA RESULT MESSAGE (AI Service → Backend):")
    print("-" * 60)
    print(json.dumps(kafka_result_message, indent=2))
    print("-" * 60)

    # ─── Highlight key sections ───
    a = kafka_result_message["analysis"]
    print(f"\n📊 PORTFOLIO LEVEL:")
    print(f"   Status:              {kafka_result_message['status']}")
    print(f"   Risk Score:          {a['riskScore']}/10")
    print(f"   Diversification:     {a['diversificationScore']}/10")
    print(f"   Risk Level:          {a['riskLevel']}")
    print(f"   Total Value:         ₹{a['portfolioMetrics']['totalValue']:,.2f}")
    print(f"   Total Cost:          ₹{a['portfolioMetrics']['totalCost']:,.2f}")
    print(f"   Total P&L:           ₹{a['portfolioMetrics']['totalPnl']:,.2f}")
    print(f"   Return:              {a['portfolioMetrics']['totalReturnPct']}%")
    print(f"   Holdings Count:      {a['portfolioMetrics']['holdingsCount']}")

    print(f"\n📈 SECTOR WEIGHTS:")
    for sector, weight in a["sectorWeights"].items():
        print(f"   {sector:20s} {weight}%")

    print(f"\n💡 RECOMMENDATIONS:")
    for i, rec in enumerate(a["recommendations"], 1):
        print(f"   {i}. {rec}")

    print(f"\n🔍 PER-HOLDING ANALYSIS:")
    print(f"   {'Symbol':<12} {'Weight%':>8} {'P&L':>12} {'P&L%':>8} {'Risk':>8} {'Action':>8}")
    print(f"   {'-'*12} {'-'*8} {'-'*12} {'-'*8} {'-'*8} {'-'*8}")
    for h in a["holdingAnalyses"]:
        print(
            f"   {h['symbol']:<12} {h['portfolioWeightPct']:>7.1f}% "
            f"₹{h['unrealizedPnl']:>10,.2f} {h['unrealizedPnlPct']:>7.2f}% "
            f"{h['riskLevel']:>8} {h['recommendation']:>8}"
        )
        if h["concentrationRisk"]:
            print(f"   {'':12} ⚠️  {h['recommendationReason']}")

    print(f"\n⏱  Processing time: {a['processingTimeMs']}ms")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
