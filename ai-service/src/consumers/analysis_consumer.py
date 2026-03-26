# ========================================
# Kafka Analysis Consumer
# ========================================
# Consumes portfolio analysis requests from Kafka
# and orchestrates multi-agent analysis

import asyncio
import json
import logging
import time
from typing import Optional
from datetime import datetime, timezone

from aiokafka import AIOKafkaConsumer
from aiokafka.errors import KafkaError

from ..config import settings
from ..models import AnalysisRequest, AnalysisResult, PortfolioInput, AnalysisStatus
from ..agents import Orchestrator
from ..producers import ResultProducer

logger = logging.getLogger(__name__)


class AnalysisConsumer:
    """Kafka consumer for portfolio analysis requests"""
    
    def __init__(self):
        self.consumer: Optional[AIOKafkaConsumer] = None
        self.orchestrator = Orchestrator()
        self.producer = ResultProducer()
        self.running = False
        self._task: Optional[asyncio.Task] = None
    
    async def start(self):
        """Start the Kafka consumer"""
        logger.info("Starting Kafka consumer...")
        
        self.consumer = AIOKafkaConsumer(
            settings.KAFKA_REQUESTS_TOPIC,
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            group_id=settings.KAFKA_GROUP_ID,
            auto_offset_reset="earliest",
            enable_auto_commit=True,
            auto_commit_interval_ms=5000,
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            key_deserializer=lambda k: k.decode("utf-8") if k else None,
            max_poll_records=10,
            session_timeout_ms=30000,
            heartbeat_interval_ms=10000,
        )
        
        try:
            await self.consumer.start()
            await self.producer.start()
            self.running = True
            logger.info(f"Kafka consumer started, subscribed to: {settings.KAFKA_REQUESTS_TOPIC}")
        except KafkaError as e:
            logger.error(f"Failed to start Kafka consumer: {e}")
            raise
    
    async def stop(self):
        """Stop the Kafka consumer"""
        logger.info("Stopping Kafka consumer...")
        self.running = False
        
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        
        if self.consumer:
            await self.consumer.stop()
        
        await self.producer.stop()
        logger.info("Kafka consumer stopped")
    
    async def run(self):
        """Main consumer loop"""
        logger.info("Starting consumer loop...")
        
        try:
            async for message in self.consumer:
                if not self.running:
                    break
                
                try:
                    await self._process_message(message)
                except Exception as e:
                    logger.error(f"Error processing message: {e}", exc_info=True)
                    
        except asyncio.CancelledError:
            logger.info("Consumer loop cancelled")
        except Exception as e:
            logger.error(f"Consumer loop error: {e}", exc_info=True)
    
    async def run_background(self):
        """Run consumer in background task"""
        self._task = asyncio.create_task(self.run())
        return self._task
    
    async def _process_message(self, message):
        """Process a single Kafka message"""
        
        correlation_id = message.key
        start_time = time.time()
        logger.info(f"Processing analysis request: {correlation_id}")
        
        data = message.value
        try:
            # Parse request - schema expects messageId, portfolioId, userId, portfolio, requestedAt
            message_id = data.get("messageId", correlation_id)
            portfolio_id = data.get("portfolioId", data.get("portfolio_id"))
            user_id = data.get("userId", data.get("user_id"))
            
            # Get portfolio data - may be raw dict
            portfolio_data = data.get("portfolio", {})
            if not portfolio_data:
                raise ValueError("Portfolio data not included in request")
            
            # Convert to dict if needed for orchestrator
            portfolio_dict = portfolio_data if isinstance(portfolio_data, dict) else portfolio_data.dict()
            
            # Run analysis
            logger.info(f"Running analysis on portfolio {portfolio_id}")
            
            analysis_output = await self.orchestrator.analyze_portfolio(portfolio_dict)
            
            # Calculate processing time
            processing_time = int((time.time() - start_time) * 1000)
            
            # Send success result
            result = AnalysisResult(
                messageId=message_id,
                portfolioId=portfolio_id,
                status=AnalysisStatus.COMPLETED.value,
                analysis=analysis_output,
                error=None,
                completedAt=datetime.now(timezone.utc),
                processingTime=processing_time,
            )
            
            await self.producer.send_result(correlation_id, result)
            logger.info(f"Analysis completed for {correlation_id} in {processing_time}ms")
            
        except Exception as e:
            logger.error(f"Analysis failed for {correlation_id}: {e}", exc_info=True)
            processing_time = int((time.time() - start_time) * 1000)
            
            # Send error result
            error_result = AnalysisResult(
                messageId=data.get("messageId", correlation_id),
                portfolioId=data.get("portfolioId", "unknown"),
                status=AnalysisStatus.FAILED.value,
                analysis=None,
                error=str(e),
                completedAt=datetime.now(timezone.utc),
                processingTime=processing_time,
            )
            
            await self.producer.send_result(correlation_id, error_result)


# Convenience function to create and start consumer
async def start_consumer():
    """Create and start analysis consumer"""
    consumer = AnalysisConsumer()
    await consumer.start()
    return consumer
