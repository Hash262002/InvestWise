"""
Pytest configuration and fixtures for AI Service tests
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Dict, Any, List
import json

# Configure event loop
@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# =====================
# Test Data Fixtures
# =====================

@pytest.fixture
def sample_portfolio() -> Dict[str, Any]:
    """Sample portfolio data for testing"""
    return {
        "name": "Test Portfolio",
        "totalInvested": 500000,
        "currentValue": 575000,
        "currency": "INR",
        "type": "investment",
        "holdings": [
            {
                "symbol": "RELIANCE",
                "name": "Reliance Industries Ltd",
                "assetType": "stock",
                "sector": "Energy",
                "exchange": "NSE",
                "quantity": 100,
                "averageCost": 2500,
                "totalCost": 250000,
                "currentValue": 290000,
            },
            {
                "symbol": "TCS",
                "name": "Tata Consultancy Services",
                "assetType": "stock",
                "sector": "IT",
                "exchange": "NSE",
                "quantity": 50,
                "averageCost": 3500,
                "totalCost": 175000,
                "currentValue": 195000,
            },
            {
                "symbol": "HDFCBANK",
                "name": "HDFC Bank",
                "assetType": "stock",
                "sector": "Banking",
                "exchange": "NSE",
                "quantity": 50,
                "averageCost": 1500,
                "totalCost": 75000,
                "currentValue": 90000,
            },
        ],
    }


@pytest.fixture
def sample_analysis_request() -> Dict[str, Any]:
    """Sample analysis request message"""
    return {
        "messageId": "test-message-123",
        "portfolioId": "portfolio-123",
        "userId": "user-456",
        "requestedAt": "2024-01-15T10:30:00Z",
        "portfolio": {
            "name": "Test Portfolio",
            "totalInvested": 100000,
            "currentValue": 115000,
            "currency": "INR",
            "holdings": [
                {
                    "symbol": "INFY",
                    "name": "Infosys",
                    "assetType": "stock",
                    "sector": "IT",
                    "quantity": 50,
                    "averageCost": 1500,
                    "totalCost": 75000,
                    "currentValue": 85000,
                },
            ],
        },
    }


@pytest.fixture
def concentrated_portfolio() -> Dict[str, Any]:
    """Portfolio with high concentration risk"""
    return {
        "name": "Concentrated Portfolio",
        "totalInvested": 200000,
        "currentValue": 210000,
        "currency": "INR",
        "holdings": [
            {
                "symbol": "TCS",
                "name": "TCS",
                "sector": "IT",
                "quantity": 100,
                "averageCost": 2000,
                "totalCost": 200000,
                "currentValue": 210000,
            },
        ],
    }


@pytest.fixture
def diversified_portfolio() -> Dict[str, Any]:
    """Well-diversified portfolio"""
    return {
        "name": "Diversified Portfolio",
        "totalInvested": 500000,
        "currentValue": 575000,
        "currency": "INR",
        "holdings": [
            {"symbol": "RELIANCE", "sector": "Energy", "totalCost": 100000, "currentValue": 115000},
            {"symbol": "TCS", "sector": "IT", "totalCost": 100000, "currentValue": 115000},
            {"symbol": "HDFCBANK", "sector": "Banking", "totalCost": 100000, "currentValue": 115000},
            {"symbol": "SUNPHARMA", "sector": "Healthcare", "totalCost": 100000, "currentValue": 115000},
            {"symbol": "ITC", "sector": "FMCG", "totalCost": 100000, "currentValue": 115000},
        ],
    }


# =====================
# Mock Fixtures
# =====================

@pytest.fixture
def mock_ollama_client():
    """Mock Ollama LLM client"""
    client = AsyncMock()
    client.generate = AsyncMock(return_value="This is a mock LLM response.")
    client.chat = AsyncMock(return_value={
        "message": {"content": "Mock chat response"},
    })
    return client


@pytest.fixture
def mock_kafka_producer():
    """Mock Kafka producer"""
    producer = AsyncMock()
    producer.start = AsyncMock()
    producer.stop = AsyncMock()
    producer.send_and_wait = AsyncMock()
    return producer


@pytest.fixture
def mock_kafka_consumer():
    """Mock Kafka consumer"""
    consumer = AsyncMock()
    consumer.start = AsyncMock()
    consumer.stop = AsyncMock()
    consumer.subscribe = AsyncMock()
    
    # Create async iterator for messages
    async def mock_messages():
        yield MagicMock(
            key=b"test-key",
            value=json.dumps({"test": "message"}).encode(),
        )
    
    consumer.__aiter__ = mock_messages
    return consumer


@pytest.fixture
def mock_settings():
    """Mock application settings"""
    settings = MagicMock()
    settings.kafka_bootstrap_servers = "localhost:9092"
    settings.kafka_group_id = "test-group"
    settings.kafka_request_topic = "portfolio-analysis-requests"
    settings.kafka_result_topic = "portfolio-analysis-results"
    settings.ollama_base_url = "http://localhost:11434"
    settings.ollama_model = "llama3.2"
    settings.ollama_timeout = 60
    settings.redis_url = "redis://localhost:6379"
    
    # Add uppercase properties
    settings.KAFKA_BOOTSTRAP_SERVERS = settings.kafka_bootstrap_servers
    settings.KAFKA_GROUP_ID = settings.kafka_group_id
    settings.KAFKA_REQUESTS_TOPIC = settings.kafka_request_topic
    settings.KAFKA_RESULTS_TOPIC = settings.kafka_result_topic
    settings.OLLAMA_BASE_URL = settings.ollama_base_url
    settings.OLLAMA_MODEL = settings.ollama_model
    settings.OLLAMA_TIMEOUT = settings.ollama_timeout
    settings.REDIS_URL = settings.redis_url
    
    return settings


# =====================
# Helper Functions
# =====================

def create_mock_kafka_message(key: str, value: Dict) -> MagicMock:
    """Create a mock Kafka message"""
    message = MagicMock()
    message.key = key.encode() if isinstance(key, str) else key
    message.value = value if isinstance(value, dict) else json.loads(value)
    message.topic = "portfolio-analysis-requests"
    message.partition = 0
    message.offset = 0
    return message


@pytest.fixture
def create_kafka_message():
    """Factory fixture for creating Kafka messages"""
    return create_mock_kafka_message


# =====================
# Async Test Helpers
# =====================

@pytest.fixture
def run_async():
    """Helper to run async functions in sync tests"""
    def _run_async(coro):
        return asyncio.get_event_loop().run_until_complete(coro)
    return _run_async
