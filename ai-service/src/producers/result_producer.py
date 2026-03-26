# ========================================
# Kafka Result Producer
# ========================================
# Produces portfolio analysis results to Kafka

import json
import logging
from typing import Optional
from datetime import datetime

from aiokafka import AIOKafkaProducer
from aiokafka.errors import KafkaError

from ..config import settings
from ..models import AnalysisResult, AnalysisOutput

logger = logging.getLogger(__name__)


class ResultProducer:
    """Kafka producer for analysis results"""
    
    def __init__(self):
        self.producer: Optional[AIOKafkaProducer] = None
    
    async def start(self):
        """Start the Kafka producer"""
        logger.info("Starting Kafka producer...")
        
        self.producer = AIOKafkaProducer(
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
            key_serializer=lambda k: k.encode("utf-8") if k else None,
            acks="all",  # Wait for all replicas
            retries=3,
            retry_backoff_ms=1000,
            compression_type="gzip",
        )
        
        try:
            await self.producer.start()
            logger.info("Kafka producer started")
        except KafkaError as e:
            logger.error(f"Failed to start Kafka producer: {e}")
            raise
    
    async def stop(self):
        """Stop the Kafka producer"""
        if self.producer:
            await self.producer.stop()
            logger.info("Kafka producer stopped")
    
    async def send_result(self, correlation_id: str, result: AnalysisResult):
        """Send analysis result to Kafka"""
        
        if not self.producer:
            raise RuntimeError("Producer not started")
        
        try:
            # Convert Pydantic model to dict with proper serialization
            result_dict = result.model_dump(by_alias=True, mode="json")
            
            # Send to Kafka
            await self.producer.send_and_wait(
                settings.KAFKA_RESULTS_TOPIC,
                key=correlation_id,
                value=result_dict,
            )
            
            logger.info(f"Result sent for {correlation_id}, status: {result.status}")
            
        except KafkaError as e:
            logger.error(f"Failed to send result for {correlation_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Error serializing result for {correlation_id}: {e}")
            raise


# Singleton instance
_producer: Optional[ResultProducer] = None


async def get_producer() -> ResultProducer:
    """Get or create result producer singleton"""
    global _producer
    if _producer is None:
        _producer = ResultProducer()
        await _producer.start()
    return _producer
