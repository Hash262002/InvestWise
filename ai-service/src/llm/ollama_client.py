# ========================================
# Ollama LLM Client
# ========================================
# Async client for interacting with Ollama API

import httpx
import json
from typing import Dict, Any, List, Optional, AsyncGenerator
import structlog

from src.config.settings import settings

logger = structlog.get_logger()


class OllamaClient:
    """Async client for Ollama LLM API"""
    
    def __init__(
        self,
        base_url: str = None,
        model: str = None,
        timeout: int = None
    ):
        self.base_url = base_url or settings.OLLAMA_BASE_URL
        self.model = model or settings.OLLAMA_MODEL
        self.timeout = timeout or settings.OLLAMA_TIMEOUT
        
    # ----------------------------------------
    # Core Generation Methods
    # ----------------------------------------
    
    async def generate(
        self,
        prompt: str,
        system_prompt: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        stop_sequences: List[str] = None,
        format_json: bool = False
    ) -> str:
        """
        Generate a completion from Ollama.
        
        Args:
            prompt: The user prompt
            system_prompt: Optional system instructions
            temperature: Creativity level (0-1)
            max_tokens: Maximum tokens to generate
            stop_sequences: Sequences to stop generation
            format_json: Request JSON output format
            
        Returns:
            Generated text response
        """
        url = f"{self.base_url}/api/generate"
        
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            }
        }
        
        if system_prompt:
            payload["system"] = system_prompt
            
        if stop_sequences:
            payload["options"]["stop"] = stop_sequences
            
        if format_json:
            payload["format"] = "json"
        
        try:
            print("📡 Sending request to Ollama... with payload :")
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                
                result = response.json()
                return result.get("response", "")
                
        except httpx.TimeoutException:
            logger.error("ollama_timeout", model=self.model, prompt_length=len(prompt))
            raise TimeoutError(f"Ollama request timed out after {self.timeout}s")
            
        except httpx.HTTPStatusError as e:
            logger.error("ollama_http_error", status=e.response.status_code, detail=str(e))
            raise RuntimeError(f"Ollama HTTP error: {e.response.status_code}")
            
        except Exception as e:
            logger.error("ollama_error", error=str(e))
            raise RuntimeError(f"Ollama error: {str(e)}")
    
    async def generate_with_tools(
        self,
        prompt: str,
        tools: List[Dict[str, Any]],
        system_prompt: str = None,
        temperature: float = 0.1
    ) -> Dict[str, Any]:
        """
        Generate with tool calling support.
        Returns either a tool call or final answer.
        """
        # Format tools into the prompt for ReAct pattern
        tools_description = self._format_tools_for_prompt(tools)
        
        react_system = f"""You are an AI assistant that uses a ReAct (Reasoning + Acting) pattern.
You have access to the following tools:

{tools_description}

When you need to use a tool, respond in this EXACT format:
Thought: [Your reasoning about what to do]
Action: [tool_name]
Action Input: [JSON input for the tool]

When you have enough information to answer, respond with:
Thought: [Your final reasoning]
Final Answer: [Your complete answer]

Important rules:
1. Always start with a Thought
2. Use only ONE action per response
3. Wait for tool results before continuing
4. Be precise with JSON in Action Input
"""
        
        if system_prompt:
            react_system = f"{system_prompt}\n\n{react_system}"
        
        response = await self.generate(
            prompt=prompt,
            system_prompt=react_system,
            temperature=temperature,
            stop_sequences=["Observation:"],  # Stop after action to wait for tool result
        )
        
        return self._parse_react_response(response)
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2048,
        format_json: bool = False
    ) -> str:
        """
        Chat completion with message history.
        
        Args:
            messages: List of {"role": "user|assistant|system", "content": "..."}
            temperature: Creativity level
            max_tokens: Maximum tokens
            format_json: Request JSON format
            
        Returns:
            Assistant's response
        """
        url = f"{self.base_url}/api/chat"
        
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            }
        }
        
        if format_json:
            payload["format"] = "json"
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                
                result = response.json()
                return result.get("message", {}).get("content", "")
                
        except Exception as e:
            logger.error("ollama_chat_error", error=str(e))
            raise RuntimeError(f"Ollama chat error: {str(e)}")
    
    # ----------------------------------------
    # Streaming Methods
    # ----------------------------------------
    
    async def generate_stream(
        self,
        prompt: str,
        system_prompt: str = None,
        temperature: float = 0.7
    ) -> AsyncGenerator[str, None]:
        """Stream tokens from Ollama."""
        url = f"{self.base_url}/api/generate"
        
        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": True,
            "options": {"temperature": temperature}
        }
        
        if system_prompt:
            payload["system"] = system_prompt
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream("POST", url, json=payload) as response:
                async for line in response.aiter_lines():
                    if line:
                        data = json.loads(line)
                        if "response" in data:
                            yield data["response"]
                        if data.get("done"):
                            break
    
    # ----------------------------------------
    # Helper Methods
    # ----------------------------------------
    
    def _format_tools_for_prompt(self, tools: List[Dict[str, Any]]) -> str:
        """Format tools list into a readable description."""
        lines = []
        for tool in tools:
            name = tool.get("name", "unknown")
            description = tool.get("description", "No description")
            parameters = tool.get("parameters", {})
            
            param_desc = ""
            if parameters.get("properties"):
                params = []
                for pname, pinfo in parameters["properties"].items():
                    ptype = pinfo.get("type", "any")
                    pdesc = pinfo.get("description", "")
                    required = pname in parameters.get("required", [])
                    req_marker = " (required)" if required else " (optional)"
                    params.append(f"    - {pname}: {ptype}{req_marker} - {pdesc}")
                param_desc = "\n".join(params)
            
            lines.append(f"Tool: {name}\nDescription: {description}\nParameters:\n{param_desc}\n")
        
        return "\n".join(lines)
    
    def _parse_react_response(self, response: str) -> Dict[str, Any]:
        """Parse a ReAct format response into structured output."""
        result = {
            "thought": None,
            "action": None,
            "action_input": None,
            "final_answer": None,
            "raw": response
        }
        
        lines = response.strip().split("\n")
        current_key = None
        current_value = []
        
        for line in lines:
            line_stripped = line.strip()
            
            if line_stripped.startswith("Thought:"):
                if current_key and current_value:
                    result[current_key] = " ".join(current_value).strip()
                current_key = "thought"
                current_value = [line_stripped[8:].strip()]
                
            elif line_stripped.startswith("Action:"):
                if current_key and current_value:
                    result[current_key] = " ".join(current_value).strip()
                current_key = "action"
                current_value = [line_stripped[7:].strip()]
                
            elif line_stripped.startswith("Action Input:"):
                if current_key and current_value:
                    result[current_key] = " ".join(current_value).strip()
                current_key = "action_input"
                current_value = [line_stripped[13:].strip()]
                
            elif line_stripped.startswith("Final Answer:"):
                if current_key and current_value:
                    result[current_key] = " ".join(current_value).strip()
                current_key = "final_answer"
                current_value = [line_stripped[13:].strip()]
                
            else:
                current_value.append(line_stripped)
        
        # Save last accumulated value
        if current_key and current_value:
            result[current_key] = " ".join(current_value).strip()
        
        # Parse action_input as JSON if possible
        if result["action_input"]:
            try:
                result["action_input"] = json.loads(result["action_input"])
            except json.JSONDecodeError:
                # Keep as string if not valid JSON
                pass
        
        return result
    
    # ----------------------------------------
    # Health Check
    # ----------------------------------------
    
    async def health_check(self) -> bool:
        """Check if Ollama is available."""
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception:
            return False
    
    async def list_models(self) -> List[str]:
        """List available models in Ollama."""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
                data = response.json()
                return [m["name"] for m in data.get("models", [])]
        except Exception as e:
            logger.error("list_models_error", error=str(e))
            return []


# Singleton instance
ollama_client = OllamaClient()
