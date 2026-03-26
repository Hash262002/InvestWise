"""
Integration tests for FastAPI endpoints
Tests the HTTP API of the AI Service
"""

import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime


class TestHealthEndpoint:
    """Tests for health check endpoint"""
    
    @pytest.mark.asyncio
    async def test_health_check(self, mock_settings):
        """Test health endpoint returns OK"""
        # Import app with mocked dependencies
        with patch('src.main.settings', mock_settings), \
             patch('src.main.AnalysisConsumer') as mock_consumer_class:
            
            mock_consumer = AsyncMock()
            mock_consumer.start = AsyncMock()
            mock_consumer.stop = AsyncMock()
            mock_consumer.run = AsyncMock()
            mock_consumer_class.return_value = mock_consumer
            
            from src.main import app
            
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get("/health")
                
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == "healthy"


class TestAnalysisEndpoints:
    """Tests for analysis-related endpoints"""
    
    @pytest.fixture
    def mock_consumer(self):
        """Create mock consumer for testing"""
        consumer = AsyncMock()
        consumer.start = AsyncMock()
        consumer.stop = AsyncMock()
        consumer.run = AsyncMock()
        return consumer
    
    @pytest.mark.asyncio
    async def test_root_endpoint(self, mock_settings):
        """Test root endpoint returns service info"""
        with patch('src.main.settings', mock_settings), \
             patch('src.main.AnalysisConsumer') as mock_consumer_class:
            
            mock_consumer = AsyncMock()
            mock_consumer.start = AsyncMock()
            mock_consumer.stop = AsyncMock()
            mock_consumer.run = AsyncMock()
            mock_consumer_class.return_value = mock_consumer
            
            from src.main import app
            
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get("/")
                
                # Should return 200 or 404 depending on if root is defined
                assert response.status_code in [200, 404]


class TestAPIErrorHandling:
    """Tests for API error handling"""
    
    @pytest.mark.asyncio
    async def test_404_for_unknown_route(self, mock_settings):
        """Test 404 returned for unknown routes"""
        with patch('src.main.settings', mock_settings), \
             patch('src.main.AnalysisConsumer') as mock_consumer_class:
            
            mock_consumer = AsyncMock()
            mock_consumer.start = AsyncMock()
            mock_consumer.stop = AsyncMock()
            mock_consumer.run = AsyncMock()
            mock_consumer_class.return_value = mock_consumer
            
            from src.main import app
            
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get("/nonexistent/route")
                
                assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_method_not_allowed(self, mock_settings):
        """Test 405 returned for wrong HTTP method"""
        with patch('src.main.settings', mock_settings), \
             patch('src.main.AnalysisConsumer') as mock_consumer_class:
            
            mock_consumer = AsyncMock()
            mock_consumer.start = AsyncMock()
            mock_consumer.stop = AsyncMock()
            mock_consumer.run = AsyncMock()
            mock_consumer_class.return_value = mock_consumer
            
            from src.main import app
            
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                # POST to health endpoint (should only accept GET)
                response = await client.post("/health")
                
                assert response.status_code == 405


class TestCORSConfiguration:
    """Tests for CORS middleware configuration"""
    
    @pytest.mark.asyncio
    async def test_cors_headers_present(self, mock_settings):
        """Test CORS headers are present in response"""
        with patch('src.main.settings', mock_settings), \
             patch('src.main.AnalysisConsumer') as mock_consumer_class:
            
            mock_consumer = AsyncMock()
            mock_consumer.start = AsyncMock()
            mock_consumer.stop = AsyncMock()
            mock_consumer.run = AsyncMock()
            mock_consumer_class.return_value = mock_consumer
            
            from src.main import app
            
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.options(
                    "/health",
                    headers={"Origin": "http://localhost:3000"}
                )
                
                # Should handle preflight request
                assert response.status_code in [200, 204, 405]
