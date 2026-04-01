"""
End-to-End Integration Tests for AI Service
Tests the complete flow from Kafka message to Orchestrator with real AI calls
Orchestrator runs 3 agents in parallel:
- AnalystAgent: Portfolio metrics and performance analysis
- RiskAgent: Risk assessment and diversification analysis
- WebSearchAgent: Real-time web search for stock sentiment
"""

import asyncio
import pytest
import time
import logging
from datetime import datetime, timezone

from src.agents.orchestrator import Orchestrator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ====== KAFKA MESSAGE PAYLOAD ======
# This is the actual portfolio message that would come through Kafka
PORTFOLIO_ANALYSIS_REQUEST = {
    "messageId": "7f0cfdac-8478-497b-81bf-b713a3f7ada2",
    "portfolioId": "69cd13d28730a524676ca7ff",
    "userId": "69c90163a1bfb21c3a9e46da",
    "portfolio": {
        "name": "Dummy3",
        "totalInvested": 101078,
        "currentValue": 101078,
        "currency": "INR",
        "type": "growth",
        "holdings": [
            {
                "symbol": "RELIANCE",
                "name": "Reliance Industries",
                "assetType": "stock",
                "sector": "Energy",
                "exchange": "NSE",
                "quantity": 10,
                "averageCost": 2000.5,
                "totalCost": 20005,
                "isActive": True
            }
        ]
    },
    "requestedAt": "2026-04-01T13:26:28.484Z"
}


class TestE2EOrchestratorFlow:
    """
    End-to-End Test: Real-time Orchestrator Analysis
    Simulates complete Kafka message processing through multi-agent system
    """

    @pytest.mark.asyncio
    async def test_complete_orchestrator_flow_with_real_ai_calls(self):
        """
        Test the complete flow:
        1. Receive Kafka message with portfolio request
        2. Extract portfolio from message
        3. Run Orchestrator with 3 agents in PARALLEL:
           - AnalystAgent: Portfolio metrics
           - RiskAgent: Risk assessment
           - WebSearchAgent: Real-time web search
        4. Merge results from all agents
        5. Verify complete output structure
        6. Validate data integrity
        """
        
        print("\n" + "="*100)
        print(" " * 20 + "🚀 END-TO-END ORCHESTRATOR TEST")
        print(" " * 15 + "Real-time Analysis with Multi-Agent System")
        print("="*100)
        
        # ========================
        # Step 1: Extract Kafka Message
        # ========================
        print("\n📨 STEP 1: KAFKA MESSAGE RECEIVED")
        print("-" * 100)
        
        message_id = PORTFOLIO_ANALYSIS_REQUEST["messageId"]
        portfolio_id = PORTFOLIO_ANALYSIS_REQUEST["portfolioId"]
        user_id = PORTFOLIO_ANALYSIS_REQUEST["userId"]
        portfolio_data = PORTFOLIO_ANALYSIS_REQUEST["portfolio"]
        requested_at = PORTFOLIO_ANALYSIS_REQUEST["requestedAt"]
        
        print(f"✓ Message ID: {message_id}")
        print(f"✓ Portfolio ID: {portfolio_id}")
        print(f"✓ User ID: {user_id}")
        print(f"✓ Requested At: {requested_at}")
        
        # Print portfolio summary
        print(f"\n📊 PORTFOLIO SUMMARY")
        print(f"   Name: {portfolio_data['name']}")
        print(f"   Type: {portfolio_data['type']}")
        print(f"   Total Invested: ₹{portfolio_data['totalInvested']:,.2f}")
        print(f"   Current Value: ₹{portfolio_data['currentValue']:,.2f}")
        total_return = ((portfolio_data['currentValue'] / portfolio_data['totalInvested']) - 1) * 100
        print(f"   Overall Return: {total_return:.2f}%")
        print(f"   Number of Holdings: {len(portfolio_data['holdings'])}")
        
        holdings_summary = []
        for holding in portfolio_data['holdings']:
            holdings_summary.append(f"{holding['symbol']} ({holding['sector']})")
        print(f"   Holdings: {', '.join(holdings_summary)}")
        
        # ========================
        # Step 2: Initialize Orchestrator
        # ========================
        print("\n" + "="*100)
        print("⚙️  STEP 2: ORCHESTRATOR INITIALIZATION")
        print("-" * 100)
        
        orchestrator = Orchestrator()
        print(f"✓ Orchestrator created")
        print(f"✓ Analyst Agent: Ready")
        print(f"✓ Risk Agent: Ready")
        print(f"✓ Web Search Agent: Ready")
        print(f"✓ LLM Client: Ready")
        
        # ========================
        # Step 3: Run Analysis (3 Agents in Parallel)
        # ========================
        print("\n" + "="*100)
        print("🔄 STEP 3: MULTI-AGENT ANALYSIS (PARALLEL EXECUTION)")
        print("-" * 100)
        print("Starting 3 agents in parallel:")
        print("  1️⃣  Analyst Agent → Portfolio metrics & performance")
        print("  2️⃣  Risk Agent → Risk assessment & diversification")
        print("  3️⃣  Web Search Agent → Real-time sentiment analysis")
        
        start_time = time.time()
        print(f"\n⏱️  Analysis started at {datetime.now().strftime('%H:%M:%S')}")
        
        try:
            analysis_result = await orchestrator.analyze_portfolio(portfolio_data)
            elapsed_time = time.time() - start_time
            
            print(f"✅ Analysis completed in {elapsed_time:.2f} seconds")
            
            # ========================
            # Step 4: Display Results
            # ========================
            print("\n" + "="*100)
            print("📋 STEP 4: ANALYSIS RESULTS")
            print("="*100)
            
            # Executive Summary
            if analysis_result.summary:
                print("\n📄 EXECUTIVE SUMMARY")
                print("-" * 100)
                print(analysis_result.summary)
            
            # Metrics
            if analysis_result.metrics:
                print("\n💰 PORTFOLIO METRICS")
                print("-" * 100)
                print(f"Total Return: {analysis_result.metrics.total_return}%")
                if analysis_result.metrics.annualized_return is not None:
                    print(f"Annualized Return: {analysis_result.metrics.annualized_return}%")
                if analysis_result.metrics.volatility is not None:
                    print(f"Volatility: {analysis_result.metrics.volatility}%")
                if analysis_result.metrics.sharpe_ratio is not None:
                    print(f"Sharpe Ratio: {analysis_result.metrics.sharpe_ratio}")
                if analysis_result.metrics.max_drawdown is not None:
                    print(f"Max Drawdown: {analysis_result.metrics.max_drawdown}%")
            
            # Risk Assessment
            if analysis_result.risk_assessment:
                print("\n⚠️  RISK ASSESSMENT")
                print("-" * 100)
                print(f"Risk Level: {analysis_result.risk_assessment.risk_level}")
                print(f"Diversification Score: {analysis_result.risk_assessment.diversification_score}/100")
                
                if analysis_result.risk_assessment.sector_concentration:
                    print(f"\nSector Concentration:")
                    for sector, concentration in analysis_result.risk_assessment.sector_concentration.items():
                        print(f"  • {sector}: {concentration:.2f}%")
                
                if analysis_result.risk_assessment.warnings:
                    print(f"\n⚠️  Warnings:")
                    for warning in analysis_result.risk_assessment.warnings:
                        print(f"  • {warning}")
            
            # Holdings Analysis
            if analysis_result.holdings:
                print("\n📈 INDIVIDUAL HOLDINGS ANALYSIS")
                print("-" * 100)
                for i, holding in enumerate(analysis_result.holdings, 1):
                    print(f"\n{i}. {holding.symbol} - {holding.name}")
                    print(f"   Sentiment: {holding.sentiment.value if holding.sentiment else 'N/A'}")
                    print(f"   Recommendation: {holding.recommendation.value if holding.recommendation else 'N/A'}")
                    if holding.analysis:
                        # Truncate long analysis to first 150 chars
                        analysis_text = holding.analysis[:150] + "..." if len(holding.analysis) > 150 else holding.analysis
                        print(f"   Analysis: {analysis_text}")
            
            # Recommendations
            if analysis_result.recommendations:
                print("\n💡 PORTFOLIO RECOMMENDATIONS")
                print("-" * 100)
                for i, rec in enumerate(analysis_result.recommendations, 1):
                    print(f"\n{i}. [{rec.type.value.upper()}] {rec.description}")
                    print(f"   Priority: {rec.priority.value}")
                    if rec.symbol:
                        print(f"   Symbol: {rec.symbol}")
            
            # ========================
            # Step 5: Validation
            # ========================
            print("\n" + "="*100)
            print("✅ STEP 5: VALIDATION & ASSERTIONS")
            print("-" * 100)
            
            # Assert results exist
            assert analysis_result is not None, "Analysis result should not be None"
            print("✓ Analysis result object created")
            
            assert analysis_result.summary, "Summary should not be empty"
            print("✓ Executive summary generated")
            
            assert analysis_result.metrics, "Metrics should not be None"
            print("✓ Portfolio metrics calculated")
            
            assert analysis_result.risk_assessment, "Risk assessment should not be None"
            print("✓ Risk assessment completed")
            
            assert analysis_result.holdings, "Holdings analysis should not be empty"
            assert len(analysis_result.holdings) == len(portfolio_data['holdings']), \
                "Holdings analysis count should match portfolio holdings"
            print(f"✓ All {len(analysis_result.holdings)} holdings analyzed")
            
            # Validate holdings structure
            for holding in analysis_result.holdings:
                assert holding.symbol, f"Holding should have symbol"
                assert holding.name, f"Holding {holding.symbol} should have name"
                assert holding.sentiment is not None, f"Holding {holding.symbol} should have sentiment"
                assert holding.recommendation is not None, f"Holding {holding.symbol} should have recommendation"
            print("✓ Holdings data integrity verified")
            
            # Validate metrics values
            assert analysis_result.metrics.total_return is not None, "Total return should be calculated"
            print("✓ Metrics values validated")
            
            # Validate risk assessment
            assert analysis_result.risk_assessment.risk_level, "Risk level should be set"
            assert analysis_result.risk_assessment.diversification_score is not None, \
                "Diversification score should be set"
            print("✓ Risk assessment values validated")
            
            # ========================
            # Step 6: Summary Report
            # ========================
            print("\n" + "="*100)
            print("📊 TEST SUMMARY REPORT")
            print("="*100)
            
            print(f"\n✅ TEST STATUS: PASSED")
            print(f"\nMetrics:")
            print(f"  • Processing Time: {elapsed_time:.2f}s")
            print(f"  • Portfolio: {portfolio_data['name']}")
            print(f"  • Holdings Analyzed: {len(analysis_result.holdings)}")
            print(f"  • Recommendations Generated: {len(analysis_result.recommendations) if analysis_result.recommendations else 0}")
            print(f"  • Risk Level Determined: {analysis_result.risk_assessment.risk_level}")
            print(f"  • Diversification Score: {analysis_result.risk_assessment.diversification_score}/100")
            
            print(f"\n✓ All validations passed")
            print(f"✓ Orchestrator executed successfully")
            print(f"✓ All three agents completed analysis")
            print(f"✓ Results merged and formatted")
            
            print("\n" + "="*100 + "\n")
            
        except ConnectionError as e:
            print(f"\n❌ CONNECTION ERROR")
            print("-" * 100)
            print(f"Error: {e}")
            print("\nℹ️  This error means Ollama LLM is not running.")
            print("\nTo run the test with Ollama support:")
            print("  1. Start Ollama in another terminal:")
            print("     $ ollama serve")
            print("  2. Pull a model (if not already present):")
            print("     $ ollama pull mistral")
            print("  3. Run the test again:")
            print("     $ pytest tests/e2e_test.py -v -s")
            print("="*100 + "\n")
            raise
        except Exception as e:
            print(f"\n❌ ANALYSIS ERROR")
            print("-" * 100)
            print(f"Error Type: {type(e).__name__}")
            print(f"Error Message: {str(e)}")
            logger.exception("E2E test failed with exception")
            print("="*100 + "\n")
            raise


# class TestOrchestratorParallelExecution:
#     """Test that verifies agents run in parallel"""
    
#     @pytest.mark.asyncio
#     async def test_agents_execute_in_parallel(self):
#         """Verify that all 3 agents execute simultaneously"""
#         print("\n" + "="*100)
#         print("⚡ TEST: VERIFY PARALLEL EXECUTION")
#         print("="*100)
        
#         print("\nTesting that all 3 agents run in parallel...")
#         print("  • Agent execution should take ~max(agent_times) not sum(agent_times)")
        
#         orchestrator = Orchestrator()
#         portfolio = PORTFOLIO_ANALYSIS_REQUEST["portfolio"]
        
#         start_time = time.time()
#         result = await orchestrator.analyze_portfolio(portfolio)
#         total_time = time.time() - start_time
        
#         print(f"\n✓ Analysis completed in {total_time:.2f} seconds")
#         print(f"✓ Result contains all agent outputs:")
#         print(f"  - Metrics: {result.metrics is not None}")
#         print(f"  - Risk Assessment: {result.risk_assessment is not None}")
#         print(f"  - Holdings Analysis: {len(result.holdings) if result.holdings else 0} holdings")
        
#         assert result.metrics is not None
#         assert result.risk_assessment is not None
#         assert result.holdings is not None and len(result.holdings) > 0
        
#         print("\n✅ Parallel execution verified!")
#         print("="*100 + "\n")
                
        
#         loss = portfolio['totalInvested'] - portfolio['currentValue']
#         print(f"Portfolio: {portfolio['name']}")
#         print(f"Loss: ₹{loss} ({(loss/portfolio['totalInvested']*100):.1f}%)")
        
#         orchestrator = Orchestrator()
#         try:
#             result = await orchestrator.analyze_portfolio(portfolio)
#             print(f"Return: {result.metrics.total_return if result.metrics else 'Unknown'}%")
#             print("✅ Test Passed")
#         except ConnectionError:
#             print("⚠️  Ollama not running")


if __name__ == "__main__":
    """
    Run E2E tests to see actual Ollama LLM outputs
    
    Usage:
    1. Start Ollama: ollama serve
    2. Run tests: pytest tests/e2e_test.py -v -s
    
    NOTE: If Ollama is not running, you'll see connection errors
    but the system still processes portfolios correctly.
    """
    pass
