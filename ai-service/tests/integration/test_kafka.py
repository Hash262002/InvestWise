"""
Integration tests for Kafka consumer and producer
Tests the full message flow from request to result
"""

import pytest
import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from src.consumers.analysis_consumer import AnalysisConsumer
from src.producers.result_producer import ResultProducer
from src.models import AnalysisResult, AnalysisOutput, AnalysisStatus


class TestKafkaConsumer:
    """Integration tests for Kafka Consumer"""
    
    @pytest.fixture
    def mock_kafka_consumer(self):
        """Create mock aiokafka consumer"""
        consumer = AsyncMock()
        consumer.start = AsyncMock()
        consumer.stop = AsyncMock()
        consumer.subscribe = AsyncMock()
        return consumer
    
    @pytest.fixture
    def mock_producer(self):
        """Create mock result producer"""
        producer = AsyncMock()
        producer.start = AsyncMock()
        producer.stop = AsyncMock()
        producer.send_result = AsyncMock()
        return producer
    
    @pytest.fixture
    def mock_orchestrator(self):
        """Create mock orchestrator"""
        from src.models import (
            AnalysisOutput,
            PortfolioMetrics,
            RiskAssessment,
            RiskLevel,
        )
        
        orchestrator = AsyncMock()
        orchestrator.analyze_portfolio = AsyncMock(return_value=AnalysisOutput(
            summary="Test analysis complete",
            metrics=PortfolioMetrics(total_return=15.0),
            risk_assessment=RiskAssessment(
                risk_level=RiskLevel.MODERATE,
                diversification_score=65,
            ),
            holdings=[],
            recommendations=[],
        ))
        return orchestrator
    
    @pytest.mark.asyncio
    async def test_consumer_starts_properly(self, mock_kafka_consumer, mock_settings):
        """Test consumer initialization and start"""
        with patch('src.consumers.analysis_consumer.AIOKafkaConsumer', return_value=mock_kafka_consumer), \
             patch('src.consumers.analysis_consumer.settings', mock_settings):
            
            consumer = AnalysisConsumer()
            consumer.producer = AsyncMock()
            consumer.producer.start = AsyncMock()
            
            await consumer.start()
            
            mock_kafka_consumer.start.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_consumer_processes_message(
        self, 
        mock_kafka_consumer, 
        mock_producer, 
        mock_orchestrator,
        sample_analysis_request,
        mock_settings,
    ):
        """Test consumer processes analysis request message"""
        with patch('src.consumers.analysis_consumer.settings', mock_settings):
            consumer = AnalysisConsumer()
            consumer.consumer = mock_kafka_consumer
            consumer.producer = mock_producer
            consumer.orchestrator = mock_orchestrator
            consumer.running = True
            
            # Create mock message
            mock_message = MagicMock()
            mock_message.key = "test-correlation-id"
            mock_message.value = sample_analysis_request
            
            # Process the message
            await consumer._process_message(mock_message)
            
            # Verify orchestrator was called
            mock_orchestrator.analyze_portfolio.assert_called_once()
            
            # Verify result was sent
            mock_producer.send_result.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_consumer_handles_analysis_error(
        self,
        mock_kafka_consumer,
        mock_producer,
        sample_analysis_request,
        mock_settings,
    ):
        """Test consumer handles analysis errors gracefully"""
        with patch('src.consumers.analysis_consumer.settings', mock_settings):
            consumer = AnalysisConsumer()
            consumer.consumer = mock_kafka_consumer
            consumer.producer = mock_producer
            consumer.running = True
            
            # Mock orchestrator to raise error
            consumer.orchestrator = AsyncMock()
            consumer.orchestrator.analyze_portfolio = AsyncMock(
                side_effect=Exception("Analysis failed")
            )
            
            mock_message = MagicMock()
            mock_message.key = "error-test"
            mock_message.value = sample_analysis_request
            
            # Should not raise, should send error result
            await consumer._process_message(mock_message)
            
            # Verify error result was sent
            mock_producer.send_result.assert_called_once()
            call_args = mock_producer.send_result.call_args
            result = call_args[0][1]  # Second positional argument
            
            assert result.status == AnalysisStatus.FAILED.value
            assert result.error is not None
    
    @pytest.mark.asyncio
    async def test_consumer_stop(self, mock_kafka_consumer, mock_settings):
        """Test consumer stops properly"""
        with patch('src.consumers.analysis_consumer.AIOKafkaConsumer', return_value=mock_kafka_consumer), \
             patch('src.consumers.analysis_consumer.settings', mock_settings):
            
            consumer = AnalysisConsumer()
            consumer.consumer = mock_kafka_consumer
            consumer.producer = AsyncMock()
            consumer.producer.stop = AsyncMock()
            consumer.running = True
            
            await consumer.stop()
            
            assert consumer.running is False
            mock_kafka_consumer.stop.assert_called_once()


class TestKafkaProducer:
    """Integration tests for Kafka Producer"""
    
    @pytest.fixture
    def mock_kafka_producer(self):
        """Create mock aiokafka producer"""
        producer = AsyncMock()
        producer.start = AsyncMock()
        producer.stop = AsyncMock()
        producer.send_and_wait = AsyncMock()
        return producer
    
    @pytest.mark.asyncio
    async def test_producer_starts_properly(self, mock_kafka_producer, mock_settings):
        """Test producer initialization and start"""
        with patch('src.producers.result_producer.AIOKafkaProducer', return_value=mock_kafka_producer), \
             patch('src.producers.result_producer.settings', mock_settings):
            
            producer = ResultProducer()
            await producer.start()
            
            mock_kafka_producer.start.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_producer_sends_result(self, mock_kafka_producer, mock_settings):
        """Test producer sends analysis result"""
        from src.models import (
            AnalysisOutput,
            PortfolioMetrics,
            RiskAssessment,
            RiskLevel,
        )
        
        with patch('src.producers.result_producer.settings', mock_settings):
            producer = ResultProducer()
            producer.producer = mock_kafka_producer
            
            result = AnalysisResult(
                messageId="test-msg",
                portfolioId="portfolio-123",
                status="completed",
                analysis=AnalysisOutput(
                    summary="Analysis complete",
                    metrics=PortfolioMetrics(total_return=15.0),
                    risk_assessment=RiskAssessment(
                        risk_level=RiskLevel.MODERATE,
                        diversification_score=65,
                    ),
                    holdings=[],
                    recommendations=[],
                ),
                completedAt=datetime.now(timezone.utc),
                processingTime=1000,
            )
            
            await producer.send_result("correlation-123", result)
            
            mock_kafka_producer.send_and_wait.assert_called_once()
            
            # Verify message was sent to correct topic
            call_args = mock_kafka_producer.send_and_wait.call_args
            assert call_args[1]["key"] == "correlation-123"
    
    @pytest.mark.asyncio
    async def test_producer_sends_failed_result(self, mock_kafka_producer, mock_settings):
        """Test producer sends failed analysis result"""
        with patch('src.producers.result_producer.settings', mock_settings):
            producer = ResultProducer()
            producer.producer = mock_kafka_producer
            
            result = AnalysisResult(
                messageId="failed-msg",
                portfolioId="portfolio-456",
                status="failed",
                error="LLM service unavailable",
                completedAt=datetime.now(timezone.utc),
                processingTime=500,
            )
            
            await producer.send_result("correlation-456", result)
            
            mock_kafka_producer.send_and_wait.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_producer_handles_send_error(self, mock_kafka_producer, mock_settings):
        """Test producer handles send errors"""
        from aiokafka.errors import KafkaError
        
        mock_kafka_producer.send_and_wait = AsyncMock(
            side_effect=KafkaError("Connection failed")
        )
        
        with patch('src.producers.result_producer.settings', mock_settings):
            producer = ResultProducer()
            producer.producer = mock_kafka_producer
            
            result = AnalysisResult(
                messageId="error-msg",
                portfolioId="portfolio-789",
                status="completed",
                completedAt=datetime.now(timezone.utc),
                processingTime=1000,
            )
            
            with pytest.raises(KafkaError):
                await producer.send_result("correlation-789", result)


class TestEndToEndFlow:
    """End-to-end integration tests for the full analysis flow"""
    
    @pytest.mark.asyncio
    async def test_full_analysis_flow(
        self,
        sample_portfolio,
        mock_ollama_client,
        mock_settings,
    ):
        """Test complete flow from request to result"""
        from src.agents.orchestrator import Orchestrator
        
        # Create orchestrator with mocked LLM
        orchestrator = Orchestrator()
        orchestrator.llm = mock_ollama_client
        orchestrator.analyst.llm = mock_ollama_client
        orchestrator.risk_assessor.llm = mock_ollama_client
        
        # Mock LLM responses
        mock_ollama_client.generate = AsyncMock(return_value="""
Thought: Analysis complete
Final Answer: The portfolio shows strong performance with good diversification.
""")
        
        # Run analysis
        result = await orchestrator.analyze_portfolio(sample_portfolio)
        
        # Verify result structure
        assert result is not None
        assert result.summary is not None
        assert result.metrics is not None
        assert result.risk_assessment is not None
        
        # Verify metrics calculation
        expected_return = (575000 - 500000) / 500000 * 100  # 15%
        assert abs(result.metrics.total_return - expected_return) < 0.1
    
    @pytest.mark.asyncio
    async def test_analysis_with_holdings(
        self,
        sample_portfolio,
        mock_ollama_client,
        mock_settings,
    ):
        """Test analysis includes individual holding analysis"""
        from src.agents.orchestrator import Orchestrator
        
        orchestrator = Orchestrator()
        orchestrator.llm = mock_ollama_client
        orchestrator.analyst.llm = mock_ollama_client
        orchestrator.risk_assessor.llm = mock_ollama_client
        
        mock_ollama_client.generate = AsyncMock(return_value="""
Strong IT stock with consistent performance. 
Sentiment: bullish | Recommendation: hold
""")
        
        result = await orchestrator.analyze_portfolio(sample_portfolio)
        
        # Should have holding analysis
        assert len(result.holdings) > 0
        
        # Each holding should have sentiment and recommendation
        for holding in result.holdings:
            assert holding.sentiment is not None
            assert holding.recommendation is not None
    
    @pytest.mark.asyncio
    async def test_concentrated_portfolio_warnings(
        self,
        concentrated_portfolio,
        mock_ollama_client,
        mock_settings,
    ):
        """Test that concentrated portfolio gets warnings"""
        from src.agents.orchestrator import Orchestrator
        
        orchestrator = Orchestrator()
        orchestrator.llm = mock_ollama_client
        orchestrator.analyst.llm = mock_ollama_client
        orchestrator.risk_assessor.llm = mock_ollama_client
        
        mock_ollama_client.generate = AsyncMock(return_value="""
High risk due to concentration.
Final Answer: The portfolio is highly concentrated.
""")
        
        result = await orchestrator.analyze_portfolio(concentrated_portfolio)
        
        # Should have high risk level
        assert result.risk_assessment.risk_level.value in ["high", "very_high"]
        
        # Should have low diversification score
        assert result.risk_assessment.diversification_score < 50
        
        # Should have warnings or recommendations
        has_warnings = len(result.risk_assessment.warnings) > 0
        has_recommendations = len(result.recommendations) > 0
        assert has_warnings or has_recommendations


class TestMessageSerialization:
    """Tests for message serialization in Kafka flow"""
    
    def test_analysis_request_serialization(self, sample_analysis_request):
        """Test analysis request serializes correctly"""
        serialized = json.dumps(sample_analysis_request)
        deserialized = json.loads(serialized)
        
        assert deserialized["messageId"] == sample_analysis_request["messageId"]
        assert deserialized["portfolioId"] == sample_analysis_request["portfolioId"]
        assert deserialized["portfolio"]["name"] == sample_analysis_request["portfolio"]["name"]
    
    def test_analysis_result_serialization(self):
        """Test analysis result serializes correctly"""
        from src.models import (
            AnalysisOutput,
            PortfolioMetrics,
            RiskAssessment,
            RiskLevel,
        )
        
        result = AnalysisResult(
            messageId="test",
            portfolioId="portfolio",
            status="completed",
            analysis=AnalysisOutput(
                summary="Test",
                metrics=PortfolioMetrics(total_return=15.0),
                risk_assessment=RiskAssessment(
                    risk_level=RiskLevel.LOW,
                    diversification_score=80,
                ),
                holdings=[],
                recommendations=[],
            ),
            completedAt=datetime.now(timezone.utc),
            processingTime=1000,
        )
        
        # Serialize to JSON
        result_dict = result.model_dump(by_alias=True, mode="json")
        serialized = json.dumps(result_dict, default=str)
        
        # Should serialize without errors
        assert "completed" in serialized
        assert "totalReturn" in serialized
