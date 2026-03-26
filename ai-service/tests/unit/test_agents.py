"""
Unit tests for AI Service agents
Tests BaseAgent, AnalystAgent, RiskAgent, and Orchestrator
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any

# Import agents
from src.agents.orchestrator import Orchestrator
from src.agents.base_agent import BaseAgent, AgentResult, AgentStep, AgentState
from src.agents.analyst_agent import AnalystAgent
from src.agents.risk_agent import RiskAgent


class TestAgentResult:
    """Tests for AgentResult dataclass"""
    
    def test_successful_result(self):
        """Test creating successful agent result"""
        result = AgentResult(
            success=True,
            answer="Analysis complete",
            steps=[],
        )
        
        assert result.success is True
        assert result.answer == "Analysis complete"
        assert result.error is None
    
    def test_failed_result(self):
        """Test creating failed agent result"""
        result = AgentResult(
            success=False,
            answer="",
            error="LLM timeout",
        )
        
        assert result.success is False
        assert result.error == "LLM timeout"
    
    def test_result_with_steps(self):
        """Test result with execution steps"""
        steps = [
            AgentStep(
                step_number=1,
                thought="I need to analyze the portfolio",
                action="portfolio_reader",
                action_input={"operation": "get_holdings_summary"},
                observation="Found 5 holdings",
            ),
            AgentStep(
                step_number=2,
                thought="Now I'll calculate returns",
                action="financial_calculator",
                action_input={"calculation": "portfolio_return"},
                observation="Return is 15%",
            ),
        ]
        
        result = AgentResult(
            success=True,
            answer="Portfolio return is 15%",
            steps=steps,
        )
        
        assert len(result.steps) == 2
        assert result.steps[0].action == "portfolio_reader"


class TestAnalystAgent:
    """Tests for AnalystAgent"""
    
    @pytest.fixture
    def mock_llm(self):
        """Mock LLM client"""
        llm = AsyncMock()
        llm.generate = AsyncMock(return_value="""
Thought: I need to analyze this portfolio
Action: portfolio_reader
Action Input: {"operation": "get_holdings_summary", "portfolio": {}}
""")
        return llm
    
    @pytest.fixture
    def analyst_agent(self, mock_llm):
        """Create analyst agent with mocked LLM"""
        agent = AnalystAgent()
        agent.llm = mock_llm
        return agent
    
    def test_agent_metadata(self, analyst_agent):
        """Test agent has correct metadata"""
        assert analyst_agent.name == "analyst"
        assert analyst_agent.description is not None
    
    def test_agent_has_tools(self, analyst_agent):
        """Test analyst agent has required tools"""
        tool_names = [t.name for t in analyst_agent.tools]
        
        assert "financial_calculator" in tool_names
        assert "portfolio_reader" in tool_names
    
    @pytest.mark.asyncio
    async def test_analyze_portfolio(self, analyst_agent, sample_portfolio):
        """Test portfolio analysis execution"""
        # Mock LLM to return final answer
        analyst_agent.llm.generate = AsyncMock(return_value="""
Thought: I have analyzed the portfolio
Final Answer: The portfolio shows strong performance with 15% returns. 
The top performer is RELIANCE with 16% gains.
""")
        
        result = await analyst_agent.analyze_portfolio(sample_portfolio)
        
        assert isinstance(result, AgentResult)
        assert result.success is True
        assert "15%" in result.answer or "return" in result.answer.lower()
    
    @pytest.mark.asyncio
    async def test_agent_uses_tools(self, analyst_agent, sample_portfolio):
        """Test that agent actually uses tools during analysis"""
        # Create a more complex mock that simulates ReAct loop
        call_count = 0
        
        async def mock_generate(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            
            if call_count == 1:
                return """
Thought: I need to get the portfolio summary
Action: portfolio_reader
Action Input: {"operation": "get_holdings_summary", "portfolio": {}}
"""
            else:
                return """
Thought: I have the information I need
Final Answer: Portfolio analyzed successfully with 3 holdings.
"""
        
        analyst_agent.llm.generate = mock_generate
        
        result = await analyst_agent.analyze_portfolio(sample_portfolio)
        
        assert result.success is True
        assert len(result.steps) > 0
    
    @pytest.mark.asyncio
    async def test_agent_handles_llm_error(self, analyst_agent, sample_portfolio):
        """Test agent handles LLM errors gracefully"""
        analyst_agent.llm.generate = AsyncMock(side_effect=Exception("LLM error"))
        
        result = await analyst_agent.analyze_portfolio(sample_portfolio)
        
        # Should return result with error, not raise exception
        assert result.success is False or result.error is not None


class TestRiskAgent:
    """Tests for RiskAgent"""
    
    @pytest.fixture
    def risk_agent(self, mock_ollama_client):
        """Create risk agent with mocked LLM"""
        agent = RiskAgent()
        agent.llm = mock_ollama_client
        return agent
    
    def test_agent_metadata(self, risk_agent):
        """Test agent has correct metadata"""
        assert risk_agent.name == "risk_assessor"
        assert "risk" in risk_agent.description.lower()
    
    @pytest.mark.asyncio
    async def test_assess_risk_concentrated(self, risk_agent, concentrated_portfolio):
        """Test risk assessment for concentrated portfolio"""
        risk_agent.llm.generate = AsyncMock(return_value="""
Thought: This portfolio has only one holding
Final Answer: Risk Level: HIGH. The portfolio is heavily concentrated in a single stock.
Diversification Score: 15/100.
""")
        
        result = await risk_agent.assess_risk(concentrated_portfolio)
        
        assert isinstance(result, AgentResult)
        assert result.success is True
        # Should identify high risk for concentrated portfolio
        assert "high" in result.answer.lower() or "concentrated" in result.answer.lower()
    
    @pytest.mark.asyncio
    async def test_assess_risk_diversified(self, risk_agent, diversified_portfolio):
        """Test risk assessment for diversified portfolio"""
        risk_agent.llm.generate = AsyncMock(return_value="""
Thought: This portfolio is well diversified
Final Answer: Risk Level: LOW. The portfolio is well diversified across 5 sectors.
Diversification Score: 85/100.
""")
        
        result = await risk_agent.assess_risk(diversified_portfolio)
        
        assert result.success is True
        # Should identify lower risk for diversified portfolio
        assert "low" in result.answer.lower() or "diversified" in result.answer.lower()


class TestOrchestrator:
    """Tests for the multi-agent Orchestrator"""
    
    @pytest.fixture
    def mock_orchestrator(self, mock_ollama_client):
        """Create orchestrator with mocked agents"""
        orchestrator = Orchestrator()
        
        # Mock the agents
        orchestrator.analyst.llm = mock_ollama_client
        orchestrator.risk_assessor.llm = mock_ollama_client
        orchestrator.llm = mock_ollama_client
        
        return orchestrator
    
    @pytest.mark.asyncio
    async def test_orchestrator_analyzes_portfolio(self, mock_orchestrator, sample_portfolio):
        """Test orchestrator runs full portfolio analysis"""
        result = await mock_orchestrator.analyze_portfolio(sample_portfolio)
        
        # Should return AnalysisOutput model
        assert result is not None
        assert hasattr(result, "summary")
        assert hasattr(result, "metrics")
        assert hasattr(result, "risk_assessment")
        assert hasattr(result, "recommendations")
    
    @pytest.mark.asyncio
    async def test_orchestrator_calculates_metrics(self, mock_orchestrator, sample_portfolio):
        """Test orchestrator calculates correct metrics"""
        result = await mock_orchestrator.analyze_portfolio(sample_portfolio)
        
        # Check metrics
        assert result.metrics is not None
        assert result.metrics.total_return is not None
        
        # Expected return: (575000 - 500000) / 500000 * 100 = 15%
        assert abs(result.metrics.total_return - 15.0) < 0.1
    
    @pytest.mark.asyncio
    async def test_orchestrator_assesses_risk(self, mock_orchestrator, sample_portfolio):
        """Test orchestrator includes risk assessment"""
        result = await mock_orchestrator.analyze_portfolio(sample_portfolio)
        
        assert result.risk_assessment is not None
        assert result.risk_assessment.risk_level is not None
        assert result.risk_assessment.diversification_score >= 0
        assert result.risk_assessment.diversification_score <= 100
    
    @pytest.mark.asyncio
    async def test_orchestrator_generates_recommendations(self, mock_orchestrator, concentrated_portfolio):
        """Test orchestrator generates recommendations for risky portfolio"""
        result = await mock_orchestrator.analyze_portfolio(concentrated_portfolio)
        
        assert result.recommendations is not None
        # Concentrated portfolio should have diversification recommendations
        assert len(result.recommendations) > 0
    
    @pytest.mark.asyncio
    async def test_orchestrator_handles_agent_error(self, mock_orchestrator, sample_portfolio):
        """Test orchestrator handles individual agent failures"""
        # Make analyst agent fail
        mock_orchestrator.analyst.analyze_portfolio = AsyncMock(
            side_effect=Exception("Analyst failed")
        )
        
        # Orchestrator should still complete with risk assessment
        result = await mock_orchestrator.analyze_portfolio(sample_portfolio)
        
        # Should not crash, should return partial results
        assert result is not None
        assert result.risk_assessment is not None
    
    @pytest.mark.asyncio
    async def test_orchestrator_analyzes_holdings(self, mock_orchestrator, sample_portfolio):
        """Test orchestrator generates individual holding analysis"""
        result = await mock_orchestrator.analyze_portfolio(sample_portfolio)
        
        assert result.holdings is not None
        assert len(result.holdings) > 0
        
        for holding in result.holdings:
            assert hasattr(holding, "symbol")
            assert hasattr(holding, "sentiment")
            assert hasattr(holding, "recommendation")


class TestAgentToolExecution:
    """Tests for agent tool execution logic"""
    
    @pytest.mark.asyncio
    async def test_agent_parses_tool_call(self):
        """Test agent correctly parses tool call from LLM response"""
        agent = AnalystAgent()
        
        response = """
Thought: I need to calculate returns
Action: financial_calculator
Action Input: {"calculation": "portfolio_return", "data": {"total_invested": 100000, "current_value": 115000}}
"""
        
        parsed = agent._parse_response(response)
        
        assert parsed.get("thought") is not None
        assert parsed.get("action") == "financial_calculator"
        assert parsed.get("action_input") is not None
    
    @pytest.mark.asyncio
    async def test_agent_parses_final_answer(self):
        """Test agent correctly parses final answer"""
        agent = AnalystAgent()
        
        response = """
Thought: I have completed the analysis
Final Answer: The portfolio return is 15% with moderate risk.
"""
        
        parsed = agent._parse_response(response)
        
        assert parsed.get("final_answer") is not None
        assert "15%" in parsed["final_answer"]
    
    @pytest.mark.asyncio
    async def test_agent_executes_tool(self):
        """Test agent executes tool and gets observation"""
        agent = AnalystAgent()
        
        # Execute portfolio_reader tool
        result = agent._execute_tool(
            "portfolio_reader",
            {
                "operation": "get_holdings_summary",
                "portfolio": {
                    "holdings": [
                        {"symbol": "TCS", "currentValue": 100000},
                    ]
                },
            }
        )
        
        # Should return observation dict
        assert isinstance(result, dict)
    
    @pytest.mark.asyncio
    async def test_agent_handles_unknown_tool(self):
        """Test agent handles unknown tool gracefully"""
        agent = AnalystAgent()
        
        result = agent._execute_tool("unknown_tool", {})
        
        assert "error" in result
        assert result["error"] is True


class TestAgentMaxIterations:
    """Tests for agent iteration limits"""
    
    @pytest.mark.asyncio
    async def test_agent_respects_max_iterations(self):
        """Test agent stops after max iterations"""
        agent = AnalystAgent()
        agent.max_iterations = 3
        
        # Mock LLM to always request tool (never final answer)
        call_count = 0
        
        async def infinite_loop(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            return """
Thought: I need more information
Action: portfolio_reader
Action Input: {"operation": "get_holdings_summary", "portfolio": {}}
"""
        
        agent.llm = AsyncMock()
        agent.llm.generate = infinite_loop
        
        result = await agent.run("Analyze portfolio", context={})
        
        # Should stop at max iterations
        assert call_count <= agent.max_iterations + 1  # +1 for potential summary
