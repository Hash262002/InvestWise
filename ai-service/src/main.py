# ========================================
# InvestWise AI Service - Main Application
# ========================================

import asyncio
from contextlib import asynccontextmanager
from typing import Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import structlog

from src.config.settings import settings
from src.consumers.analysis_consumer import analysis_consumer
from src.producers.result_producer import result_producer
from src.agents.orchestrator import OrchestratorAgent
from src.llm.ollama_client import OllamaClient

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


# ========================================
# Initialize Orchestrator Agent
# ========================================

# Initialize LLM client
llm_client = OllamaClient(
    base_url=settings.OLLAMA_BASE_URL,
    model=settings.OLLAMA_MODEL,
    timeout=settings.OLLAMA_TIMEOUT
)

# Initialize orchestrator with configured settings
orchestrator = OrchestratorAgent(
    llm=llm_client,
    enable_research=settings.ENABLE_RESEARCH_AGENT
)


# ========================================
# Message Handler
# ========================================

async def handle_analysis_request(message: Dict[str, Any], key: str):
    """
    Process incoming analysis request from Kafka.
    
    Message format:
    {
        "portfolioId": "string",
        "userId": "string",
        "holdings": [...],
        "requestType": "full|quick|rebalance"
    }
    """
    portfolio_id = message.get("portfolioId")
    user_id = message.get("userId")
    holdings = message.get("holdings", [])
    request_type = message.get("requestType", "quick")
    
    print(f"📩 Received analysis request1: portfolio={portfolio_id}, holdings={len(holdings)}, type={request_type}")
    
    logger.info(
        "processing_analysis_request",
        portfolio_id=portfolio_id,
        user_id=user_id,
        holdings_count=len(holdings),
        request_type=request_type
    )
    
    try:
        print(f"🤖 Running {request_type} analysis for portfolio {portfolio_id}...")
        
        # Run multi-agent analysis using orchestrator
        result = await orchestrator.analyze_portfolio(
            portfolio_id=portfolio_id,
            user_id=user_id,
            holdings=holdings,
            analysis_type=request_type
        )
        
        print(f"✅ Analysis completed: status={result.status}, risk_score={result.risk_score}")
        
        # Convert result to Kafka message format
        analysis_result = {
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
                "risk": result.risk_insights
            },
            "aiModel": settings.OLLAMA_MODEL,
            "analysisType": request_type,
            "processingTimeMs": result.processing_time_ms
        }
        
        # Send result back to Kafka
        await result_producer.send_result(
            portfolio_id=portfolio_id,
            user_id=user_id,
            analysis_result=analysis_result
        )
        
        logger.info(
            "analysis_completed",
            portfolio_id=portfolio_id,
            user_id=user_id,
            status=result.status,
            processing_time_ms=result.processing_time_ms
        )
        
    except Exception as e:
        logger.error(
            "analysis_failed",
            portfolio_id=portfolio_id,
            error=str(e)
        )
        
        # Send error notification
        await result_producer.send_error(
            portfolio_id=portfolio_id,
            user_id=user_id,
            error_message=str(e)
        )


# ========================================
# Application Lifespan
# ========================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifecycle.
    - Connect to Kafka on startup
    - Disconnect on shutdown
    """
    print("🚀 AI Service starting...")
    logger.info("ai_service_starting", version=settings.APP_VERSION)
    
    # Connect to Kafka
    print("📡 Connecting to Aayush Kafka...")
    consumer_connected = await analysis_consumer.connect()
    producer_connected = await result_producer.connect()
    
    if consumer_connected and producer_connected:
        print("✅ Kafka connections established")
        logger.info("kafka_connections_established")
        
        # Set message handler
        analysis_consumer.set_message_handler(handle_analysis_request)
        
        # Start consuming in background
        asyncio.create_task(analysis_consumer.consume())
        print("🔄 Consumer task started - listening for messages")
        logger.info("consumer_task_started")
    else:
        print(f"⚠️ Kafka connection partial - consumer: {consumer_connected}, producer: {producer_connected}")
        logger.warning("kafka_connection_partial", 
                      consumer=consumer_connected, 
                      producer=producer_connected)
    
    yield
    
    # Cleanup
    print("🛑 AI Service shutting down...")
    logger.info("ai_service_shutting_down")
    await analysis_consumer.disconnect()
    await result_producer.disconnect()


# ========================================
# FastAPI Application
# ========================================

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ========================================
# Health Endpoints
# ========================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "kafka": {
            "consumer_running": analysis_consumer.running,
            "producer_connected": result_producer.producer is not None
        }
    }


@app.get("/ready")
async def readiness_check():
    """Readiness check - verifies all dependencies are available"""
    is_ready = (
        analysis_consumer.consumer is not None and
        result_producer.producer is not None
    )
    
    if not is_ready:
        raise HTTPException(status_code=503, detail="Service not ready")
    
    return {"status": "ready"}


# ========================================
# Debug Endpoints (for testing)
# ========================================

@app.get("/config")
async def get_config():
    """Get current configuration (non-sensitive)"""
    return {
        "kafka_servers": settings.KAFKA_BOOTSTRAP_SERVERS,
        "kafka_group_id": settings.KAFKA_GROUP_ID,
        "topics": {
            "requests": settings.KAFKA_TOPIC_ANALYSIS_REQUESTS,
            "results": settings.KAFKA_TOPIC_ANALYSIS_RESULTS
        },
        "ollama": {
            "base_url": settings.OLLAMA_BASE_URL,
            "model": settings.OLLAMA_MODEL
        },
        "agents": {
            "research_enabled": settings.ENABLE_RESEARCH_AGENT,
            "max_iterations": settings.AGENT_MAX_ITERATIONS
        }
    }


@app.get("/ollama/health")
async def ollama_health():
    """Check if Ollama is available and list models"""
    is_healthy = await llm_client.health_check()
    models = []
    
    if is_healthy:
        models = await llm_client.list_models()
    
    return {
        "healthy": is_healthy,
        "base_url": settings.OLLAMA_BASE_URL,
        "configured_model": settings.OLLAMA_MODEL,
        "available_models": models,
        "model_available": settings.OLLAMA_MODEL in models if models else False
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
