# ========================================
# Kafka Producer - Analysis Results
# ========================================

import json
import asyncio
from typing import Dict, Any, Optional
from aiokafka import AIOKafkaProducer
from aiokafka.errors import KafkaConnectionError
import structlog

from src.config.settings import settings

logger = structlog.get_logger()


class ResultProducer:
    """
    Kafka producer for analysis results.
    Sends messages to 'portfolio.analysis.results' topic.
    """
    
    def __init__(self):
        self.producer: Optional[AIOKafkaProducer] = None
    
    async def connect(self, max_retries: int = 5, retry_delay: int = 5) -> bool:
        """
        Connect to Kafka with retry logic.
        Returns True if connected, False otherwise.
        """
        for attempt in range(max_retries):
            try:
                self.producer = AIOKafkaProducer(
                    bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                    key_serializer=lambda k: k.encode('utf-8') if k else None,
                    acks='all',  # Wait for all replicas
                )
                
                await self.producer.start()
                logger.info(
                    "kafka_producer_connected",
                    bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS
                )
                return True
                
            except KafkaConnectionError as e:
                logger.warning(
                    "kafka_connection_failed",
                    attempt=attempt + 1,
                    max_retries=max_retries,
                    error=str(e)
                )
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay)
                    
            except Exception as e:
                logger.error("kafka_producer_error", error=str(e))
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay)
        
        return False
    
    async def disconnect(self):
        """Gracefully disconnect from Kafka."""
        if self.producer:
            await self.producer.stop()
            logger.info("kafka_producer_disconnected")
    
    async def send_result(
        self,
        portfolio_id: str,
        user_id: str,
        analysis_result: Dict[str, Any]
    ) -> bool:
        """
        Send analysis result to Kafka.
        
        Args:
            portfolio_id: The portfolio ID (used as message key for partitioning)
            user_id: The user who owns the portfolio
            analysis_result: The AI-generated analysis
            
        Returns:
            True if sent successfully, False otherwise
        """
        if not self.producer:
            raise RuntimeError("Producer not connected. Call connect() first.")
        
        message = {
            "portfolioId": portfolio_id,
            "userId": user_id,
            "analysis": analysis_result,
            "timestamp": asyncio.get_event_loop().time(),
            "status": "completed"
        }
        
        try:
            # Send with portfolio_id as key for partition ordering
            await self.producer.send_and_wait(
                topic=settings.KAFKA_TOPIC_ANALYSIS_RESULTS,
                value=message,
                key=portfolio_id
            )
            
            logger.info(
                "result_sent",
                topic=settings.KAFKA_TOPIC_ANALYSIS_RESULTS,
                portfolio_id=portfolio_id,
                user_id=user_id
            )
            return True
            
        except Exception as e:
            logger.error(
                "result_send_failed",
                portfolio_id=portfolio_id,
                error=str(e)
            )
            return False
    
    async def send_error(
        self,
        portfolio_id: str,
        user_id: str,
        error_message: str
    ) -> bool:
        """
        Send error notification for failed analysis.
        """
        if not self.producer:
            raise RuntimeError("Producer not connected. Call connect() first.")
        
        message = {
            "portfolioId": portfolio_id,
            "userId": user_id,
            "error": error_message,
            "timestamp": asyncio.get_event_loop().time(),
            "status": "failed"
        }
        
        try:
            await self.producer.send_and_wait(
                topic=settings.KAFKA_TOPIC_ANALYSIS_RESULTS,
                value=message,
                key=portfolio_id
            )
            
            logger.warning(
                "error_sent",
                topic=settings.KAFKA_TOPIC_ANALYSIS_RESULTS,
                portfolio_id=portfolio_id,
                error=error_message
            )
            return True
            
        except Exception as e:
            logger.error(
                "error_send_failed",
                portfolio_id=portfolio_id,
                error=str(e)
            )
            return False


# Singleton instance
result_producer = ResultProducer()
