# ========================================
# InvestWise AI Service - Configuration
# ========================================

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # App Settings
    APP_NAME: str = "InvestWise AI Service"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Kafka Settings
    KAFKA_BOOTSTRAP_SERVERS: str = "kafka:29092"
    KAFKA_GROUP_ID: str = "ai-analysis-group"
    
    # Kafka Topics
    KAFKA_TOPIC_ANALYSIS_REQUESTS: str = "portfolio.analysis.requests"
    KAFKA_TOPIC_ANALYSIS_RESULTS: str = "portfolio.analysis.results"
    
    # Kafka Consumer Settings
    KAFKA_AUTO_OFFSET_RESET: str = "earliest"
    KAFKA_ENABLE_AUTO_COMMIT: bool = False
    KAFKA_MAX_POLL_RECORDS: int = 10
    
    # Ollama Settings
    OLLAMA_BASE_URL: str = "http://ollama:11434"
    OLLAMA_MODEL: str = "llama3.1:8b"
    OLLAMA_TIMEOUT: int = 120  # seconds
    
    # Serper API Settings (for web search)
    SERPER_API_KEY: str = "95c10436304622fd09aaf7d2a4263f3eeac56a6b"  # Get from https://serper.dev
    
    # Agent Settings
    ENABLE_RESEARCH_AGENT: bool = True  # Set to False for faster analysis without web search
    AGENT_MAX_ITERATIONS: int = 10
    
    # MongoDB Settings
    MONGODB_URI: str = "mongodb://investwise_admin:investwise_secret_123@mongodb:27017/investwise?authSource=admin"
    MONGODB_DATABASE: str = "investwise"
    
    # Analysis Settings
    BATCH_SIZE: int = 10  # Process 10 portfolios at a time
    MAX_RETRIES: int = 3
    RETRY_DELAY: int = 5  # seconds
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Singleton instance
settings = Settings()
