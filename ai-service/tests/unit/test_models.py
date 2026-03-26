"""
Unit tests for Pydantic models/schemas
Tests for AnalysisRequest, AnalysisResult, and related models
"""

import pytest
from datetime import datetime
from pydantic import ValidationError

from src.models.schemas import (
    AnalysisRequest,
    AnalysisResult,
    AnalysisOutput,
    AnalysisStatus,
    PortfolioInput,
    HoldingInput,
    PortfolioMetrics,
    RiskAssessment,
    HoldingAnalysis,
    PortfolioRecommendation,
    Sentiment,
    Recommendation,
    RiskLevel,
    Priority,
)


class TestEnums:
    """Tests for enum types"""
    
    def test_sentiment_values(self):
        """Test Sentiment enum values"""
        assert Sentiment.BULLISH.value == "bullish"
        assert Sentiment.BEARISH.value == "bearish"
        assert Sentiment.NEUTRAL.value == "neutral"
    
    def test_recommendation_values(self):
        """Test Recommendation enum values"""
        assert Recommendation.STRONG_BUY.value == "strong_buy"
        assert Recommendation.BUY.value == "buy"
        assert Recommendation.HOLD.value == "hold"
        assert Recommendation.SELL.value == "sell"
        assert Recommendation.STRONG_SELL.value == "strong_sell"
    
    def test_risk_level_values(self):
        """Test RiskLevel enum values"""
        assert RiskLevel.LOW.value == "low"
        assert RiskLevel.MODERATE.value == "moderate"
        assert RiskLevel.HIGH.value == "high"
        assert RiskLevel.VERY_HIGH.value == "very_high"
    
    def test_priority_values(self):
        """Test Priority enum values"""
        assert Priority.LOW.value == "low"
        assert Priority.MEDIUM.value == "medium"
        assert Priority.HIGH.value == "high"
    
    def test_analysis_status_values(self):
        """Test AnalysisStatus enum values"""
        assert AnalysisStatus.PENDING.value == "pending"
        assert AnalysisStatus.PROCESSING.value == "processing"
        assert AnalysisStatus.COMPLETED.value == "completed"
        assert AnalysisStatus.FAILED.value == "failed"


class TestHoldingInput:
    """Tests for HoldingInput model"""
    
    def test_valid_holding(self):
        """Test creating valid holding"""
        holding = HoldingInput(
            symbol="TCS",
            name="Tata Consultancy Services",
            assetType="stock",
            sector="IT",
            quantity=100,
            averageCost=3500,
            totalCost=350000,
            currentValue=380000,
        )
        
        assert holding.symbol == "TCS"
        assert holding.quantity == 100
        assert holding.average_cost == 3500
    
    def test_holding_with_alias(self):
        """Test holding with camelCase aliases"""
        holding = HoldingInput(
            symbol="INFY",
            name="Infosys",
            asset_type="stock",  # Using snake_case
            quantity=50,
            average_cost=1500,
            total_cost=75000,
            current_value=85000,
        )
        
        # Should work with both snake_case and camelCase
        assert holding.average_cost == 1500
    
    def test_holding_optional_fields(self):
        """Test holding with optional fields"""
        holding = HoldingInput(
            symbol="RELIANCE",
            name="Reliance Industries",
            quantity=100,
            averageCost=2500,
            totalCost=250000,
            currentValue=275000,
            # sector and exchange are optional
        )
        
        assert holding.sector == ""
        assert holding.exchange == ""


class TestPortfolioInput:
    """Tests for PortfolioInput model"""
    
    def test_valid_portfolio(self):
        """Test creating valid portfolio"""
        portfolio = PortfolioInput(
            name="My Portfolio",
            totalInvested=500000,
            currentValue=575000,
            currency="INR",
            holdings=[
                HoldingInput(
                    symbol="TCS",
                    name="TCS",
                    quantity=100,
                    averageCost=3500,
                    totalCost=350000,
                    currentValue=380000,
                ),
            ],
        )
        
        assert portfolio.name == "My Portfolio"
        assert portfolio.total_invested == 500000
        assert len(portfolio.holdings) == 1
    
    def test_portfolio_empty_holdings(self):
        """Test portfolio with empty holdings"""
        portfolio = PortfolioInput(
            name="Empty Portfolio",
            totalInvested=0,
            currentValue=0,
            currency="INR",
            holdings=[],
        )
        
        assert len(portfolio.holdings) == 0


class TestPortfolioMetrics:
    """Tests for PortfolioMetrics model"""
    
    def test_metrics_with_all_fields(self):
        """Test metrics with all fields"""
        metrics = PortfolioMetrics(
            total_return=15.5,
            annualized_return=18.2,
            volatility=12.3,
            sharpe_ratio=1.2,
            max_drawdown=-8.5,
        )
        
        assert metrics.total_return == 15.5
        assert metrics.annualized_return == 18.2
        assert metrics.volatility == 12.3
        assert metrics.sharpe_ratio == 1.2
        assert metrics.max_drawdown == -8.5
    
    def test_metrics_with_optional_fields(self):
        """Test metrics with only required fields"""
        metrics = PortfolioMetrics(
            total_return=15.5,
        )
        
        assert metrics.total_return == 15.5
        assert metrics.annualized_return is None
        assert metrics.volatility is None


class TestRiskAssessment:
    """Tests for RiskAssessment model"""
    
    def test_valid_risk_assessment(self):
        """Test creating valid risk assessment"""
        assessment = RiskAssessment(
            risk_level=RiskLevel.MODERATE,
            diversification_score=65,
            sector_concentration={"IT": 40, "Banking": 35, "Energy": 25},
            warnings=["High IT sector concentration"],
        )
        
        assert assessment.risk_level == RiskLevel.MODERATE
        assert assessment.diversification_score == 65
        assert len(assessment.sector_concentration) == 3
        assert len(assessment.warnings) == 1
    
    def test_diversification_score_bounds(self):
        """Test diversification score validation (0-100)"""
        # Valid score
        assessment = RiskAssessment(
            risk_level=RiskLevel.LOW,
            diversification_score=85,
        )
        assert assessment.diversification_score == 85
        
        # Edge cases
        assessment_min = RiskAssessment(
            risk_level=RiskLevel.VERY_HIGH,
            diversification_score=0,
        )
        assert assessment_min.diversification_score == 0
        
        assessment_max = RiskAssessment(
            risk_level=RiskLevel.LOW,
            diversification_score=100,
        )
        assert assessment_max.diversification_score == 100
    
    def test_diversification_score_out_of_bounds(self):
        """Test that out-of-bounds scores raise error"""
        with pytest.raises(ValidationError):
            RiskAssessment(
                risk_level=RiskLevel.LOW,
                diversification_score=150,  # Invalid
            )
        
        with pytest.raises(ValidationError):
            RiskAssessment(
                risk_level=RiskLevel.LOW,
                diversification_score=-10,  # Invalid
            )


class TestHoldingAnalysis:
    """Tests for HoldingAnalysis model"""
    
    def test_valid_holding_analysis(self):
        """Test creating valid holding analysis"""
        analysis = HoldingAnalysis(
            symbol="TCS",
            name="Tata Consultancy Services",
            analysis="Strong IT company with consistent growth",
            sentiment=Sentiment.BULLISH,
            recommendation=Recommendation.BUY,
        )
        
        assert analysis.symbol == "TCS"
        assert analysis.sentiment == Sentiment.BULLISH
        assert analysis.recommendation == Recommendation.BUY


class TestPortfolioRecommendation:
    """Tests for PortfolioRecommendation model"""
    
    def test_valid_recommendation(self):
        """Test creating valid recommendation"""
        rec = PortfolioRecommendation(
            type="diversify",
            priority=Priority.HIGH,
            description="Consider adding more sectors to reduce concentration risk",
        )
        
        assert rec.type == "diversify"
        assert rec.priority == Priority.HIGH
    
    def test_recommendation_with_symbol(self):
        """Test recommendation with specific stock"""
        rec = PortfolioRecommendation(
            type="sell",
            priority=Priority.MEDIUM,
            description="Consider reducing position due to overweight",
            symbol="TCS",
        )
        
        assert rec.symbol == "TCS"


class TestAnalysisOutput:
    """Tests for AnalysisOutput model"""
    
    def test_valid_analysis_output(self):
        """Test creating valid analysis output"""
        output = AnalysisOutput(
            summary="Your portfolio shows strong performance with 15% returns.",
            metrics=PortfolioMetrics(total_return=15.0),
            risk_assessment=RiskAssessment(
                risk_level=RiskLevel.MODERATE,
                diversification_score=65,
            ),
            holdings=[
                HoldingAnalysis(
                    symbol="TCS",
                    name="TCS",
                    analysis="Strong performer",
                    sentiment=Sentiment.BULLISH,
                    recommendation=Recommendation.HOLD,
                ),
            ],
            recommendations=[
                PortfolioRecommendation(
                    type="diversify",
                    priority=Priority.MEDIUM,
                    description="Consider adding more sectors",
                ),
            ],
        )
        
        assert output.summary is not None
        assert output.metrics.total_return == 15.0
        assert output.risk_assessment.risk_level == RiskLevel.MODERATE
        assert len(output.holdings) == 1
        assert len(output.recommendations) == 1


class TestAnalysisResult:
    """Tests for AnalysisResult model"""
    
    def test_successful_result(self):
        """Test creating successful analysis result"""
        result = AnalysisResult(
            messageId="msg-123",
            portfolioId="portfolio-456",
            status="completed",
            analysis=AnalysisOutput(
                summary="Analysis complete",
                metrics=PortfolioMetrics(total_return=10.0),
                risk_assessment=RiskAssessment(
                    risk_level=RiskLevel.LOW,
                    diversification_score=80,
                ),
                holdings=[],
                recommendations=[],
            ),
            completedAt=datetime.utcnow(),
            processingTime=1500,
        )
        
        assert result.status == "completed"
        assert result.error is None
        assert result.analysis is not None
    
    def test_failed_result(self):
        """Test creating failed analysis result"""
        result = AnalysisResult(
            messageId="msg-789",
            portfolioId="portfolio-456",
            status="failed",
            error="LLM service unavailable",
            completedAt=datetime.utcnow(),
            processingTime=500,
        )
        
        assert result.status == "failed"
        assert result.error == "LLM service unavailable"
        assert result.analysis is None


class TestModelSerialization:
    """Tests for model serialization"""
    
    def test_analysis_output_to_dict(self):
        """Test serializing AnalysisOutput to dictionary"""
        output = AnalysisOutput(
            summary="Test summary",
            metrics=PortfolioMetrics(total_return=15.0),
            risk_assessment=RiskAssessment(
                risk_level=RiskLevel.MODERATE,
                diversification_score=65,
            ),
            holdings=[],
            recommendations=[],
        )
        
        result_dict = output.model_dump(by_alias=True)
        
        assert isinstance(result_dict, dict)
        assert result_dict["summary"] == "Test summary"
        assert result_dict["metrics"]["totalReturn"] == 15.0
        assert result_dict["riskAssessment"]["riskLevel"] == "moderate"
    
    def test_model_json_serialization(self):
        """Test JSON serialization"""
        metrics = PortfolioMetrics(
            total_return=15.0,
            volatility=12.5,
        )
        
        json_str = metrics.model_dump_json(by_alias=True)
        
        assert "totalReturn" in json_str
        assert "15.0" in json_str
