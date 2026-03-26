# ========================================
# Kafka Consumer - Analysis Requests
# ========================================

import json
import asyncio
from typing import Callable, Optional
from aiokafka import AIOKafkaConsumer
from aiokafka.errors import KafkaConnectionError
import structlog

from src.config.settings import settings

logger = structlog.get_logger()


class AnalysisConsumer:
    """
    Kafka consumer for portfolio analysis requests.
    Consumes messages from 'portfolio.analysis.requests' topic.
    """
    
    def __init__(self):
        self.consumer: Optional[AIOKafkaConsumer] = None
        self.running: bool = False
        self._message_handler: Optional[Callable] = None
    
    async def connect(self, max_retries: int = 5, retry_delay: int = 5) -> bool:
        """
        Connect to Kafka with retry logic.
        Returns True if connected, False otherwise.
        """
        for attempt in range(max_retries):
            try:
                self.consumer = AIOKafkaConsumer(
                    settings.KAFKA_TOPIC_ANALYSIS_REQUESTS,
                    bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                    group_id=settings.KAFKA_GROUP_ID,
                    auto_offset_reset=settings.KAFKA_AUTO_OFFSET_RESET,
                    enable_auto_commit=settings.KAFKA_ENABLE_AUTO_COMMIT,
                    max_poll_records=settings.KAFKA_MAX_POLL_RECORDS,
                    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                    key_deserializer=lambda k: k.decode('utf-8') if k else None,
                )
                
                await self.consumer.start()
                logger.info(
                    "kafka_consumer_connected",
                    topic=settings.KAFKA_TOPIC_ANALYSIS_REQUESTS,
                    group_id=settings.KAFKA_GROUP_ID,
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
                logger.error("kafka_consumer_error", error=str(e))
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay)
        
        return False
    
    async def disconnect(self):
        """Gracefully disconnect from Kafka."""
        self.running = False
        if self.consumer:
            await self.consumer.stop()
            logger.info("kafka_consumer_disconnected")
    
    def set_message_handler(self, handler: Callable):
        """Set the callback function for processing messages."""
        self._message_handler = handler
    
    async def consume(self):
        """
        Start consuming messages.
        Messages are passed to the registered handler.
        """
        if not self.consumer:
            raise RuntimeError("Consumer not connected. Call connect() first.")
        
        if not self._message_handler:
            raise RuntimeError("No message handler set. Call set_message_handler() first.")
        
        self.running = True
        logger.info("kafka_consumer_started", topic=settings.KAFKA_TOPIC_ANALYSIS_REQUESTS)
        
        try:
            async for message in self.consumer:
                if not self.running:
                    break
                
                logger.info(
                    "message_received",
                    topic=message.topic,
                    partition=message.partition,
                    offset=message.offset,
                    key=message.key
                )
                
                try:
                    # Process the message using the handler
                    await self._message_handler(message.value, message.key)
                    
                    # Commit offset after successful processing
                    await self.consumer.commit()
                    
                    logger.info(
                        "message_processed",
                        offset=message.offset,
                        partition=message.partition
                    )
                    
                except Exception as e:
                    logger.error(
                        "message_processing_failed",
                        offset=message.offset,
                        error=str(e)
                    )
                    # Don't commit - message will be reprocessed
                    
        except Exception as e:
            logger.error("consumer_loop_error", error=str(e))
            raise
        finally:
            await self.disconnect()


# Singleton instance
analysis_consumer = AnalysisConsumer()
