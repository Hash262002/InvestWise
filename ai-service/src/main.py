import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .consumers.analysis_consumer import AnalysisConsumer

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global consumer instance
analysis_consumer: Optional[AnalysisConsumer] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global analysis_consumer
    
    logger.info("Starting AI Service...")
    
    # Initialize and start Kafka consumer
    analysis_consumer = AnalysisConsumer()
    
    try:
        await analysis_consumer.start()
        
        # Start consumer in background task
        consumer_task = asyncio.create_task(analysis_consumer.run())
        
        logger.info("AI Service started successfully")
        logger.info(f"Kafka consumer listening on: {settings.KAFKA_REQUESTS_TOPIC}")
        logger.info(f"Ollama endpoint: {settings.OLLAMA_BASE_URL}")
        
        yield
        
        # Shutdown
        logger.info("Shutting down AI Service...")
        consumer_task.cancel()
        
        try:
            await consumer_task
        except asyncio.CancelledError:
            pass
            
        await analysis_consumer.stop()
        logger.info("AI Service shutdown complete")
        
    except Exception as e:
        logger.error(f"Failed to start AI Service: {e}")
        raise


# Create FastAPI app
app = FastAPI(
    title="InvestWise AI Service",
    description="AI-powered portfolio analysis service using multi-agent architecture",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ai-service",
        "kafka_topic": settings.kafka_request_topic,
        "ollama_url": settings.ollama_base_url,
        "model": settings.ollama_model,
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "InvestWise AI Service",
        "version": "1.0.0",
        "status": "running",
    }


@app.get("/config")
async def get_config():
    """Get current configuration (non-sensitive)"""
    return {
        "kafka_topic": settings.kafka_request_topic,
        "kafka_group_id": settings.kafka_group_id,
        "ollama_model": settings.ollama_model,
        "log_level": settings.log_level,
    }
