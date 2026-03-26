from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Kafka Configuration
    kafka_bootstrap_servers: str = "kafka:9092"
    kafka_group_id: str = "ai-service-group"
    kafka_request_topic: str = "portfolio-analysis-requests"
    kafka_result_topic: str = "portfolio-analysis-results"
    
    # Redis Configuration
    redis_url: str = "redis://redis:6379"
    
    # Ollama LLM Configuration
    ollama_base_url: str = "http://host.docker.internal:11434"
    ollama_model: str = "llama3.2"
    ollama_timeout: int = 120
    
    # Optional: Serper API for web search
    serper_api_key: str = ""
    
    # Logging
    log_level: str = "INFO"
    
    # Uppercase aliases as properties for backward compatibility
    @property
    def KAFKA_BOOTSTRAP_SERVERS(self) -> str:
        return self.kafka_bootstrap_servers
    
    @property
    def KAFKA_GROUP_ID(self) -> str:
        return self.kafka_group_id
    
    @property
    def KAFKA_REQUESTS_TOPIC(self) -> str:
        return self.kafka_request_topic
    
    @property
    def KAFKA_RESULTS_TOPIC(self) -> str:
        return self.kafka_result_topic
    
    @property
    def REDIS_URL(self) -> str:
        return self.redis_url
    
    @property
    def OLLAMA_BASE_URL(self) -> str:
        return self.ollama_base_url
    
    @property
    def OLLAMA_MODEL(self) -> str:
        return self.ollama_model
    
    @property
    def OLLAMA_TIMEOUT(self) -> int:
        return self.ollama_timeout
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
