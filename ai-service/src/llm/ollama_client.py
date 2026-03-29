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
    
    async def generate_with_tools(
        self,
        prompt: str,
        tools: list,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
    ) -> Dict[str, Any]:
        """Generate response with tool calling capability
        
        Ollama doesn't natively support function calling, so we use prompt engineering
        to get structured responses (thought, action, action_input, final_answer)
        """
        
        # Format tools into a string description
        tools_description = self._format_tools(tools)
        
        # Build the enhanced prompt with tool instructions
        enhanced_prompt = f"""{system_prompt or ''}

You have access to the following tools:
{tools_description}

Use the following format:

Thought: You should always think about what to do
Action: The action to take, should be one of [{', '.join([t['name'] for t in tools])}]
Action Input: The input to the action, as a JSON object
Observation: The result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: The final answer to the original input question

Begin!

{prompt}"""
        
        try:
            response = await self.generate(
                prompt=enhanced_prompt,
                system=None,  # System prompt already in the main prompt
                temperature=temperature,
                max_tokens=2048,
            )
            
            # Parse the response into structured format
            return self._parse_tool_response(response)
            
        except Exception as e:
            logger.error(f"Error in generate_with_tools: {e}")
            return {
                "thought": "Error occurred",
                "action": None,
                "action_input": None,
                "final_answer": None,
                "error": str(e)
            }
    
    def _format_tools(self, tools: list) -> str:
        """Format tools into a readable description"""
        if not tools:
            return "No tools available"
        
        descriptions = []
        for tool in tools:
            tool_desc = f"- {tool['name']}: {tool.get('description', 'No description')}"
            if 'parameters' in tool:
                tool_desc += f"\n  Parameters: {json.dumps(tool['parameters'], indent=4)}"
            descriptions.append(tool_desc)
        
        return "\n".join(descriptions)
    
    def _parse_tool_response(self, response: str) -> Dict[str, Any]:
        """Parse structured response from LLM"""
        import re
        
        result = {
            "thought": None,
            "action": None,
            "action_input": None,
            "final_answer": None,
        }
        
        # Extract Thought
        thought_match = re.search(r"Thought:\s*(.+?)(?=\nAction:|$)", response, re.DOTALL)
        if thought_match:
            result["thought"] = thought_match.group(1).strip()
        
        # Extract Final Answer
        final_match = re.search(r"Final Answer:\s*(.+?)$", response, re.DOTALL)
        if final_match:
            result["final_answer"] = final_match.group(1).strip()
        
        # Extract Action
        action_match = re.search(r"Action:\s*(.+?)(?=\nAction Input:|$)", response, re.DOTALL)
        if action_match:
            result["action"] = action_match.group(1).strip()
        
        # Extract Action Input
        action_input_match = re.search(r"Action Input:\s*({.+?}|\[.+?\]|[^\n]+)(?=\nObservation:|$)", response, re.DOTALL)
        if action_input_match:
            input_str = action_input_match.group(1).strip()
            try:
                result["action_input"] = json.loads(input_str)
            except json.JSONDecodeError:
                # If not valid JSON, return as string
                result["action_input"] = input_str
        
        return result

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
