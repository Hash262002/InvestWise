# ========================================
# Base Tool Abstract Class
# ========================================
# All tools must inherit from this class

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum


class ToolResultStatus(Enum):
    SUCCESS = "success"
    ERROR = "error"
    PARTIAL = "partial"


@dataclass
class ToolResult:
    """Standardized result from tool execution"""
    status: ToolResultStatus
    data: Any
    error: Optional[str] = None
    
    def to_observation(self) -> str:
        """Convert result to observation string for ReAct loop"""
        if self.status == ToolResultStatus.ERROR:
            return f"Error: {self.error}"
        elif self.status == ToolResultStatus.PARTIAL:
            return f"Partial result: {self.data}\nNote: Some data may be incomplete."
        else:
            if isinstance(self.data, dict):
                return str(self.data)
            return str(self.data)


class BaseTool(ABC):
    """Abstract base class for all tools"""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier for the tool"""
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        """Human-readable description of what the tool does"""
        pass
    
    @property
    @abstractmethod
    def parameters(self) -> Dict[str, Any]:
        """JSON Schema for tool parameters"""
        pass
    
    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        """Execute the tool with given parameters"""
        pass
    
    def to_schema(self) -> Dict[str, Any]:
        """Convert tool to schema format for LLM"""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters
        }
    
    def validate_params(self, params: Dict[str, Any]) -> bool:
        """Validate that required parameters are present"""
        required = self.parameters.get("required", [])
        for param in required:
            if param not in params:
                return False
        return True
