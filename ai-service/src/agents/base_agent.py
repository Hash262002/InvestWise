# ========================================
# Base Agent with ReAct Loop
# ========================================
# Abstract base class implementing the ReAct pattern
# (Reasoning + Acting) for all specialized agents

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from enum import Enum
import structlog

from src.llm.ollama_client import OllamaClient
from src.tools.base_tool import BaseTool, ToolResult, ToolResultStatus

logger = structlog.get_logger()


class AgentState(Enum):
    IDLE = "idle"
    THINKING = "thinking"
    ACTING = "acting"
    COMPLETED = "completed"
    ERROR = "error"


@dataclass
class AgentStep:
    """Represents a single step in the agent's execution"""
    step_number: int
    thought: Optional[str] = None
    action: Optional[str] = None
    action_input: Optional[Dict] = None
    observation: Optional[str] = None
    is_final: bool = False
    final_answer: Optional[str] = None


@dataclass
class AgentResult:
    """Result from agent execution"""
    success: bool
    answer: str
    steps: List[AgentStep] = field(default_factory=list)
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class BaseAgent(ABC):
    """
    Base agent implementing ReAct pattern.
    
    ReAct Loop:
    1. Thought: Agent reasons about what to do
    2. Action: Agent selects a tool and inputs
    3. Observation: Tool returns result
    4. Repeat until Final Answer
    """
    
    MAX_ITERATIONS = 10
    
    def __init__(
        self,
        llm: OllamaClient = None,
        tools: List[BaseTool] = None,
        max_iterations: int = None
    ):
        self.llm = llm or OllamaClient()
        self.tools = tools or []
        self.tool_map = {tool.name: tool for tool in self.tools}
        self.max_iterations = max_iterations or self.MAX_ITERATIONS
        self.state = AgentState.IDLE
        self.steps: List[AgentStep] = []
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Agent name"""
        pass
    
    @property
    @abstractmethod
    def description(self) -> str:
        """Agent description"""
        pass
    
    @property
    @abstractmethod
    def system_prompt(self) -> str:
        """System prompt for the agent"""
        pass
    
    # ----------------------------------------
    # Main Execution
    # ----------------------------------------
    
    async def run(self, task: str, context: Dict[str, Any] = None) -> AgentResult:
        """
        Execute the agent on a given task.
        
        Args:
            task: The task/question to answer
            context: Additional context data
            
        Returns:
            AgentResult with answer and execution steps
        """
        self.state = AgentState.THINKING
        self.steps = []
        
        logger.info(
            "agent_started",
            agent=self.name,
            task=task[:100]
        )
        
        try:
            # Build initial prompt with context
            prompt = self._build_initial_prompt(task, context)
            conversation_history = prompt
            
            for iteration in range(self.max_iterations):
                step = AgentStep(step_number=iteration + 1)
                
                # Get LLM response with tools
                response = await self.llm.generate_with_tools(
                    prompt=conversation_history,
                    tools=self._get_tool_schemas(),
                    system_prompt=self.system_prompt,
                    temperature=0.1
                )
                print(f"🔄 Iteration {iteration + 1} response: {response}")
                # Extract thought
                step.thought = response.get("thought")
                
                # Check if we have a final answer
                if response.get("final_answer"):
                    step.is_final = True
                    step.final_answer = response["final_answer"]
                    self.steps.append(step)
                    
                    self.state = AgentState.COMPLETED
                    logger.info(
                        "agent_completed",
                        agent=self.name,
                        iterations=iteration + 1
                    )
                    
                    return AgentResult(
                        success=True,
                        answer=step.final_answer,
                        steps=self.steps,
                        metadata={"iterations": iteration + 1}
                    )
                
                # Execute action if present
                if response.get("action"):
                    self.state = AgentState.ACTING
                    step.action = response["action"]
                    step.action_input = response.get("action_input", {})
                    
                    # Execute the tool
                    observation = await self._execute_tool(
                        step.action,
                        step.action_input
                    )
                    step.observation = observation
                    
                    # Add to conversation history
                    conversation_history += f"\n\nThought: {step.thought}\nAction: {step.action}\nAction Input: {step.action_input}\nObservation: {observation}\n"
                    
                    self.state = AgentState.THINKING
                
                self.steps.append(step)
            
            # Max iterations reached
            self.state = AgentState.ERROR
            return AgentResult(
                success=False,
                answer="",
                steps=self.steps,
                error=f"Max iterations ({self.max_iterations}) reached without final answer"
            )
            
        except Exception as e:
            self.state = AgentState.ERROR
            logger.error("agent_error", agent=self.name, error=str(e))
            return AgentResult(
                success=False,
                answer="",
                steps=self.steps,
                error=str(e)
            )
    
    # ----------------------------------------
    # Tool Execution
    # ----------------------------------------
    
    async def _execute_tool(self, tool_name: str, tool_input: Any) -> str:
        """Execute a tool and return observation string"""
        
        if tool_name not in self.tool_map:
            return f"Error: Tool '{tool_name}' not found. Available tools: {list(self.tool_map.keys())}"
        
        tool = self.tool_map[tool_name]
        
        try:
            # Validate parameters before execution
            if isinstance(tool_input, dict):
                # Check for missing required parameters
                if not tool.validate_params(tool_input):
                    required = tool.parameters.get("required", [])
                    missing = [p for p in required if p not in tool_input]
                    
                    logger.error(
                        "tool_execution_error",
                        tool=tool_name,
                        error=f"Missing required parameters: {missing}"
                    )
                    return f"Error: Tool '{tool_name}' requires parameters: {required}. Missing: {missing}. Provided: {list(tool_input.keys())}"
                
                result = await tool.execute(**tool_input)
            else:
                result = await tool.execute(tool_input)
            
            return result.to_observation()
            
        except TypeError as e:
            # Handle missing positional arguments specifically
            error_msg = str(e)
            if "missing" in error_msg and "required positional argument" in error_msg:
                required = tool.parameters.get("required", [])
                logger.error(
                    "tool_execution_error",
                    tool=tool_name,
                    error=error_msg,
                    required_params=required
                )
                return f"Error: Tool '{tool_name}' requires all parameters: {required}. Make sure to include all required parameters in the action input."
            
            logger.error(
                "tool_execution_error",
                tool=tool_name,
                error=error_msg
            )
            return f"Error executing {tool_name}: {error_msg}"
            
        except Exception as e:
            logger.error(
                "tool_execution_error",
                tool=tool_name,
                error=str(e)
            )
            return f"Error executing {tool_name}: {str(e)}"
    
    def _get_tool_schemas(self) -> List[Dict[str, Any]]:
        """Get schemas for all available tools"""
        tools_with_schema = [tool.to_schema() for tool in self.tools]
        print(f"📚 Available tools: {[tool['name'] for tool in tools_with_schema]}")
        return tools_with_schema
    
    # ----------------------------------------
    # Prompt Building
    # ----------------------------------------
    
    def _build_initial_prompt(self, task: str, context: Dict[str, Any] = None) -> str:
        """Build the initial prompt with task and context"""
        prompt = f"Task: {task}\n"
        
        if context:
            prompt += "\nContext:\n"
            for key, value in context.items():
                if isinstance(value, (dict, list)):
                    import json
                    prompt += f"- {key}: {json.dumps(value, indent=2)[:500]}...\n"
                else:
                    prompt += f"- {key}: {value}\n"
        
        prompt += "\nPlease analyze and complete this task."
        return prompt
    
    # ----------------------------------------
    # Tool Management
    # ----------------------------------------
    
    def add_tool(self, tool: BaseTool):
        """Add a tool to the agent"""
        self.tools.append(tool)
        self.tool_map[tool.name] = tool
    
    def remove_tool(self, tool_name: str):
        """Remove a tool from the agent"""
        if tool_name in self.tool_map:
            tool = self.tool_map.pop(tool_name)
            self.tools.remove(tool)
    
    def get_tool(self, tool_name: str) -> Optional[BaseTool]:
        """Get a tool by name"""
        return self.tool_map.get(tool_name)
