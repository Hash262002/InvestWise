from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class ToolResultStatus(str, Enum):
    """Status of tool execution"""
    SUCCESS = "success"
    ERROR = "error"
    PARTIAL = "partial"


@dataclass
class ToolResult:
    """Result of tool execution"""
    status: ToolResultStatus
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class BaseTool(ABC):
    """Abstract base class for agent tools"""
    
    name: str = "base_tool"
    description: str = "Base tool description"
    
    @abstractmethod
    def execute(self, **kwargs) -> Dict[str, Any]:
        """Execute the tool with given parameters"""
        pass
    
    def get_schema(self) -> Dict[str, Any]:
        """Get tool schema for LLM prompt"""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self._get_parameters_schema(),
        }
    
    def _get_parameters_schema(self) -> Dict[str, Any]:
        """Override to define parameter schema"""
        return {}
    
    def validate_parameters(self, **kwargs) -> Optional[str]:
        """Validate parameters before execution. Returns error message if invalid."""
        return None
    
    def safe_execute(self, **kwargs) -> Dict[str, Any]:
        """Execute with error handling"""
        try:
            # Validate parameters
            validation_error = self.validate_parameters(**kwargs)
            if validation_error:
                return {
                    "error": True,
                    "message": validation_error,
                }
            
            # Execute tool
            result = self.execute(**kwargs)
            return result
            
        except Exception as e:
            logger.error(f"Tool {self.name} execution error: {e}")
            return {
                "error": True,
                "message": f"Tool execution failed: {str(e)}",
            }
