"""
Test script with custom Kafka message
=======================================
Tests the orchestrator against a real diversified portfolio
with US and Indian stocks (mixed sectors).
"""

import asyncio
import json
import sys
import os
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))

from src.agents.orchestrator import OrchestratorAgent, AnalysisResult
from src.llm.ollama_client import OllamaClient

# ─── Your Kafka Message ───
KAFKA_MESSAGE = {
    "portfolioId": "69bbbdafddb4537c5a7cc73b",
    "userId": "69bbbda2ddb4537c5a7cc735",
    "holdings": [
        {
            "symbol": "AAPL",
            "name": "Apple Inc",
            "quantity": 10,
            "averageCost": 150,
            "sector": "Technology",
            "assetType": "stock"
        },
        {
            "symbol": "GOOGL",
            "name": "Alphabet Inc",
            "quantity": 5,
            "averageCost": 2800,
            "sector": "Technology",
            "assetType": "stock"
        },
        {
            "symbol": "MSFT",
            "name": "Microsoft Corporation",
            "quantity": 8,
            "averageCost": 300,
            "sector": "Technology",
            "assetType": "stock"
        },
        {
            "symbol": "AMZN",
            "name": "Amazon.com Inc",
            "quantity": 3,
            "averageCost": 3300,
            "sector": "Consumer Discretionary",
            "assetType": "stock"
        },
        {
            "symbol": "TSLA",
            "name": "Tesla Inc",
            "quantity": 15,
            "averageCost": 250,
            "sector": "Automotive",
            "assetType": "stock"
        },
        {
            "symbol": "INFY",
            "name": "Infosys Limited",
            "quantity": 25,
            "averageCost": 1500,
            "sector": "Technology",
            "assetType": "stock"
        },
        {
            "symbol": "RELIANCE",
            "name": "Reliance Industries",
            "quantity": 20,
            "averageCost": 2400,
            "sector": "Energy",
            "assetType": "stock"
        },
        {
            "symbol": "TCS",
            "name": "Tata Consultancy Services",
            "quantity": 10,
            "averageCost": 3500,
            "sector": "Technology",
            "assetType": "stock"
        },
        {
            "symbol": "HDFC",
            "name": "HDFC Bank Limited",
            "quantity": 30,
            "averageCost": 1500,
            "sector": "Financials",
            "assetType": "stock"
        },
        {
            "symbol": "BAJAJ",
            "name": "Bajaj Auto Limited",
            "quantity": 5,
            "averageCost": 5000,
            "sector": "Automotive",
            "assetType": "stock"
        }
    ],
    "requestType": "full",
    "timestamp": 1773911487162
}


async def main():
    print("=" * 80)
    print("  InvestWise AI Service — Custom Portfolio Test")
    print("  (Real Ollama LLM · Multi-agent Analysis)")
    print("=" * 80)

    # Display incoming message
    print(f"\n📤 INCOMING KAFKA MESSAGE:")
    print(f"   Portfolio ID: {KAFKA_MESSAGE['portfolioId']}")
    print(f"   User ID:      {KAFKA_MESSAGE['userId']}")
    print(f"   Holdings:     {len(KAFKA_MESSAGE['holdings'])} stocks")
    print(f"   Request Type: {KAFKA_MESSAGE['requestType']}")
    print(f"   Timestamp:    {KAFKA_MESSAGE['timestamp']}")

    # Portfolio breakdown
    print(f"\n📊 PORTFOLIO HOLDINGS:")
    total_value = 0
    total_cost = 0
    for holding in KAFKA_MESSAGE['holdings']:
        current_value = holding['quantity'] * holding.get('currentPrice', holding['averageCost'])
        total_cost += holding['quantity'] * holding['averageCost']
        total_value += current_value
        print(f"   {holding['symbol']:8} ({holding['sector']:20}) — {holding['quantity']:3} @ ${holding['averageCost']:7.2f}")

    print(f"\n   Sectors: {len(set(h['sector'] for h in KAFKA_MESSAGE['holdings']))} unique sectors")

    # Initialize orchestrator
    print("\n🤖 Initializing Orchestrator...")
    llm = OllamaClient(
        base_url="http://localhost:11434",
        model="llama3.1:8b",  # Change to your preferred model (llama3.1:8b, mistral, etc.)
        timeout=180
    )

    orchestrator = OrchestratorAgent(llm=llm, enable_research=True)

    print("✅ Orchestrator ready. Starting multi-agent analysis...\n")

    try:
        # Run analysis
        print("⏳ Analyzing portfolio... (this may take 1-2 minutes)")
        print("-" * 80)

        result: AnalysisResult = await orchestrator.analyze_portfolio(
            portfolio_id=KAFKA_MESSAGE["portfolioId"],
            user_id=KAFKA_MESSAGE["userId"],
            holdings=KAFKA_MESSAGE["holdings"],
            analysis_type=KAFKA_MESSAGE["requestType"]
        )

        # Display results
        print("\n" + "=" * 80)
        print("  ANALYSIS RESULTS")
        print("=" * 80)

        print(f"\n✅ Status: {result.status}")
        print(f"📈 Risk Score: {result.risk_score}/10")
        print(f"🎯 Diversification Score: {result.diversification_score}/10")
        print(f"⚠️  Risk Level: {result.risk_level}")
        print(f"⏱️  Processing Time: {result.processing_time_ms}ms")

        # Summary
        print(f"\n📝 SUMMARY:")
        print("-" * 80)
        if result.summary:
            print(result.summary)

        # Portfolio metrics
        print(f"\n💰 PORTFOLIO METRICS:")
        print(f"   Total Value: ${result.total_value:,.2f}")
        print(f"   Total Cost:  ${result.total_cost:,.2f}")
        print(f"   Total P&L:   ${result.total_pnl:,.2f}")
        print(f"   Return %:    {result.total_return_pct:.2f}%")
        print(f"   Holdings:    {result.holdings_count}")

        # Sector weights
        if result.sector_weights:
            print(f"\n🏭 SECTOR ALLOCATION:")
            for sector, weight in sorted(result.sector_weights.items(), key=lambda x: x[1], reverse=True):
                print(f"   {sector:25} {weight:6.2f}%")

        # Recommendations
        if result.recommendations:
            print(f"\n💡 RECOMMENDATIONS:")
            for i, rec in enumerate(result.recommendations, 1):
                print(f"   {i}. {rec}")

        # Per-holding analysis
        if result.holding_analyses:
            print(f"\n📋 PER-HOLDING ANALYSIS:")
            print("-" * 80)
            for holding in result.holding_analyses:
                print(f"\n   {holding.symbol} ({holding.name})")
                print(f"      Sector: {holding.sector}")
                print(f"      Qty: {holding.quantity} | Avg Cost: ${holding.average_cost:.2f}")
                print(f"      Current Value: ${holding.current_value:,.2f}")
                print(f"      P&L: ${holding.unrealized_pnl:,.2f} ({holding.unrealized_pnl_pct:+.2f}%)")
                print(f"      Portfolio Weight: {holding.portfolio_weight_pct:.2f}%")
                print(f"      Risk Level: {holding.risk_level} | Recommendation: {holding.recommendation}")

        # Agent insights
        print(f"\n🔍 AGENT INSIGHTS:")
        print("-" * 80)

        if result.analyst_insights:
            print(f"\n📊 ANALYST AGENT:")
            print(result.analyst_insights)

        if result.risk_insights:
            print(f"\n⚠️  RISK AGENT:")
            print(result.risk_insights)

        if result.research_insights:
            print(f"\n🔎 RESEARCH AGENT:")
            print(result.research_insights)

        # Errors, if any
        if result.errors:
            print(f"\n❌ ERRORS:")
            for error in result.errors:
                print(f"   - {error}")

        print("\n" + "=" * 80)
        print("✅ Analysis Complete!")
        print("=" * 80)

        # Output as JSON for verification
        print(f"\n📤 JSON OUTPUT (for backend):")
        print(json.dumps(result.to_dict(), indent=2))

    except Exception as e:
        print(f"\n❌ Error during analysis: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    # Check if Ollama is running
    print("\n⚠️  NOTE: Make sure Ollama is running!")
    print("   Run in another terminal: ollama serve")
    print("\n" + "=" * 80 + "\n")

    asyncio.run(main())
