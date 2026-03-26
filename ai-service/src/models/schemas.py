from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class AssetType(str, Enum):
    STOCK = "stock"
    MUTUAL_FUND = "mutual_fund"
    ETF = "etf"
    BOND = "bond"
    CRYPTO = "crypto"
    OTHER = "other"


class Sentiment(str, Enum):
    BULLISH = "bullish"
    BEARISH = "bearish"
    NEUTRAL = "neutral"


class Recommendation(str, Enum):
    STRONG_BUY = "strong_buy"
    BUY = "buy"
    HOLD = "hold"
    SELL = "sell"
    STRONG_SELL = "strong_sell"


class RiskLevel(str, Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    VERY_HIGH = "very_high"


class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class AnalysisStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# Input Models (from Kafka message)

class HoldingInput(BaseModel):
    """Holding data from portfolio"""
    symbol: str
    name: str
    asset_type: Optional[str] = Field(default="stock", alias="assetType")
    sector: Optional[str] = ""
    exchange: Optional[str] = ""
    quantity: float
    average_cost: float = Field(alias="averageCost")
    total_cost: float = Field(alias="totalCost")
    current_value: float = Field(alias="currentValue")
    
    class Config:
        populate_by_name = True


class PortfolioInput(BaseModel):
    """Portfolio data from Kafka message"""
    name: str
    total_invested: float = Field(alias="totalInvested")
    current_value: float = Field(alias="currentValue")
    currency: str = "INR"
    type: Optional[str] = "other"
    holdings: List[HoldingInput]
    
    class Config:
        populate_by_name = True


class AnalysisRequest(BaseModel):
    """Analysis request from Kafka"""
    message_id: str = Field(alias="messageId")
    portfolio_id: str = Field(alias="portfolioId")
    user_id: str = Field(alias="userId")
    portfolio: PortfolioInput
    requested_at: datetime = Field(alias="requestedAt")
    
    class Config:
        populate_by_name = True


# Output Models (for analysis results)

class PortfolioMetrics(BaseModel):
    """Calculated portfolio metrics"""
    total_return: float = Field(default=0, alias="totalReturn")
    annualized_return: Optional[float] = Field(default=None, alias="annualizedReturn")
    volatility: Optional[float] = None
    sharpe_ratio: Optional[float] = Field(default=None, alias="sharpeRatio")
    max_drawdown: Optional[float] = Field(default=None, alias="maxDrawdown")
    
    class Config:
        populate_by_name = True


class SectorAllocation(BaseModel):
    """Sector allocation breakdown"""
    sector: str
    percentage: float
    value: float


class RiskAssessment(BaseModel):
    """Risk assessment results"""
    risk_level: RiskLevel = Field(alias="riskLevel")
    diversification_score: int = Field(ge=0, le=100, alias="diversificationScore")
    sector_concentration: Dict[str, float] = Field(default_factory=dict, alias="sectorConcentration")
    warnings: List[str] = Field(default_factory=list)
    
    class Config:
        populate_by_name = True


class HoldingAnalysis(BaseModel):
    """Analysis for individual holding"""
    symbol: str
    name: str
    analysis: str
    sentiment: Sentiment
    recommendation: Recommendation


class PortfolioRecommendation(BaseModel):
    """Portfolio-level recommendation"""
    type: str  # rebalance, buy, sell, hold, diversify
    priority: Priority
    description: str
    symbol: Optional[str] = None


class AnalysisOutput(BaseModel):
    """Complete analysis output"""
    summary: str
    metrics: PortfolioMetrics
    risk_assessment: RiskAssessment = Field(alias="riskAssessment")
    holdings: List[HoldingAnalysis]
    recommendations: List[PortfolioRecommendation]
    
    class Config:
        populate_by_name = True


class AnalysisResult(BaseModel):
    """Result message sent back to Kafka"""
    message_id: str = Field(alias="messageId")
    portfolio_id: str = Field(alias="portfolioId")
    status: str  # completed, failed
    analysis: Optional[AnalysisOutput] = None
    error: Optional[str] = None
    completed_at: datetime = Field(alias="completedAt")
    processing_time: int = Field(alias="processingTime")  # milliseconds
    
    class Config:
        populate_by_name = True


# Agent Internal Models

class ToolCall(BaseModel):
    """Tool call from LLM"""
    tool_name: str
    parameters: Dict[str, Any]


class AgentStep(BaseModel):
    """Single step in agent reasoning"""
    thought: str
    action: Optional[str] = None
    action_input: Optional[Dict[str, Any]] = None
    observation: Optional[str] = None


class AgentResult(BaseModel):
    """Result from an agent"""
    agent_name: str
    result: Dict[str, Any]
    steps: List[AgentStep] = Field(default_factory=list)
    error: Optional[str] = None
