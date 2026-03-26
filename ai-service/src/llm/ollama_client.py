import httpx
import json
import logging
from typing import Optional, Dict, Any, AsyncGenerator

from ..config import settings

logger = logging.getLogger(__name__)


class OllamaClient:
    """HTTP client for Ollama LLM API"""
    
    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        timeout: Optional[int] = None,
    ):
        self.base_url = base_url or settings.ollama_base_url
        self.model = model or settings.ollama_model
        self.timeout = timeout or settings.ollama_timeout
        
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(self.timeout),
        )
    
    async def generate(
        self,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        stop: Optional[list] = None,
    ) -> str:
        """Generate text completion from Ollama"""
        
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }
        
        if system:
            payload["system"] = system
            
        if stop:
            payload["options"]["stop"] = stop
        
        try:
            response = await self._client.post("/api/generate", json=payload)
            response.raise_for_status()
            
            result = response.json()
            return result.get("response", "")
            
        except httpx.HTTPStatusError as e:
            logger.error(f"Ollama HTTP error: {e.response.status_code} - {e.response.text}")
            raise
        except httpx.RequestError as e:
            logger.error(f"Ollama request error: {e}")
            raise
    
    async def generate_stream(
        self,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        """Generate text completion with streaming"""
        
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": True,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }
        
        if system:
            payload["system"] = system
        
        try:
            async with self._client.stream("POST", "/api/generate", json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        data = json.loads(line)
                        if "response" in data:
                            yield data["response"]
                        if data.get("done"):
                            break
                            
        except httpx.HTTPStatusError as e:
            logger.error(f"Ollama HTTP error: {e.response.status_code}")
            raise
        except httpx.RequestError as e:
            logger.error(f"Ollama request error: {e}")
            raise
    
    async def chat(
        self,
        messages: list,
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> str:
        """Chat completion using Ollama's chat API"""
        
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        }
        
        try:
            response = await self._client.post("/api/chat", json=payload)
            response.raise_for_status()
            
            result = response.json()
            return result.get("message", {}).get("content", "")
            
        except httpx.HTTPStatusError as e:
            logger.error(f"Ollama chat HTTP error: {e.response.status_code} - {e.response.text}")
            raise
        except httpx.RequestError as e:
            logger.error(f"Ollama chat request error: {e}")
            raise
    
    async def check_health(self) -> bool:
        """Check if Ollama is available"""
        try:
            response = await self._client.get("/api/tags")
            return response.status_code == 200
        except Exception:
            return False
    
    async def list_models(self) -> list:
        """List available models"""
        try:
            response = await self._client.get("/api/tags")
            response.raise_for_status()
            result = response.json()
            return [m["name"] for m in result.get("models", [])]
        except Exception as e:
            logger.error(f"Failed to list models: {e}")
            return []
    
    async def close(self):
        """Close the HTTP client"""
        await self._client.aclose()


# Singleton instance
_ollama_client: Optional[OllamaClient] = None


def get_ollama_client() -> OllamaClient:
    """Get or create Ollama client instance"""
    global _ollama_client
    if _ollama_client is None:
        _ollama_client = OllamaClient()
    return _ollama_client
