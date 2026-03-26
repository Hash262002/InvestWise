"""
Unit tests for AI Service tools
Tests CalculatorTool and PortfolioTool functionality
"""

import pytest
from typing import Dict, Any

# Import tools
from src.tools.calculator_tool import CalculatorTool
from src.tools.portfolio_tool import PortfolioAnalysisTool
from src.tools.base_tool import BaseTool, ToolResult, ToolResultStatus


class TestCalculatorTool:
    """Tests for CalculatorTool"""
    
    @pytest.fixture
    def calculator(self):
        return CalculatorTool()
    
    def test_tool_metadata(self, calculator):
        """Test tool has correct metadata"""
        assert calculator.name == "financial_calculator"
        assert calculator.description is not None
        assert len(calculator.description) > 0
    
    def test_portfolio_return_calculation(self, calculator):
        """Test portfolio return percentage calculation"""
        result = calculator.execute(
            calculation="portfolio_return",
            data={
                "total_invested": 100000,
                "current_value": 115000,
            }
        )
        
        assert result.status == ToolResultStatus.SUCCESS
        assert result.data["return_percentage"] == 15.0
        assert result.data["return_amount"] == 15000
    
    def test_portfolio_return_negative(self, calculator):
        """Test negative return calculation"""
        result = calculator.execute(
            calculation="portfolio_return",
            data={
                "total_invested": 100000,
                "current_value": 85000,
            }
        )
        
        assert result.status == ToolResultStatus.SUCCESS
        assert result.data["return_percentage"] == -15.0
        assert result.data["return_amount"] == -15000
    
    def test_portfolio_return_zero_invested(self, calculator):
        """Test handling of zero investment edge case"""
        result = calculator.execute(
            calculation="portfolio_return",
            data={
                "total_invested": 0,
                "current_value": 1000,
            }
        )
        
        # Should handle gracefully - either 0% or error
        assert result.status in [ToolResultStatus.SUCCESS, ToolResultStatus.ERROR]
    
    def test_holding_return_calculation(self, calculator):
        """Test individual holding return"""
        result = calculator.execute(
            calculation="holding_return",
            data={
                "quantity": 100,
                "average_cost": 2500,
                "current_price": 2750,
            }
        )
        
        assert result.status == ToolResultStatus.SUCCESS
        assert result.data["return_percentage"] == 10.0  # (2750-2500)/2500 * 100
        assert result.data["return_amount"] == 25000  # 100 * (2750-2500)
    
    def test_allocation_percentage(self, calculator):
        """Test allocation percentage calculation"""
        result = calculator.execute(
            calculation="allocation_percentage",
            data={
                "holding_value": 50000,
                "total_portfolio_value": 200000,
            }
        )
        
        assert result.status == ToolResultStatus.SUCCESS
        assert result.data["percentage"] == 25.0
    
    def test_diversification_score(self, calculator):
        """Test diversification score calculation"""
        result = calculator.execute(
            calculation="diversification_score",
            data={
                "holdings": [
                    {"sector": "IT", "value": 40000},
                    {"sector": "Banking", "value": 30000},
                    {"sector": "Energy", "value": 30000},
                ]
            }
        )
        
        assert result.status == ToolResultStatus.SUCCESS
        assert "score" in result.data
        assert 0 <= result.data["score"] <= 100
    
    def test_missing_required_parameters(self, calculator):
        """Test error handling for missing parameters"""
        result = calculator.execute(
            calculation="portfolio_return",
            data={}  # Missing required fields
        )
        
        assert result.status == ToolResultStatus.ERROR
        assert result.error is not None
    
    def test_invalid_calculation_type(self, calculator):
        """Test error handling for invalid calculation type"""
        result = calculator.execute(
            calculation="invalid_calculation",
            data={"test": "data"}
        )
        
        assert result.status == ToolResultStatus.ERROR
    
    def test_safe_execute_wrapper(self, calculator):
        """Test safe_execute catches exceptions"""
        # This should not raise an exception
        result = calculator.safe_execute(
            calculation="portfolio_return",
            data=None  # Invalid data
        )
        
        assert result.status == ToolResultStatus.ERROR
        assert result.error is not None


class TestPortfolioTool:
    """Tests for PortfolioTool"""
    
    @pytest.fixture
    def portfolio_tool(self):
        return PortfolioAnalysisTool()
    
    @pytest.fixture
    def sample_portfolio(self):
        return {
            "name": "Test Portfolio",
            "totalInvested": 500000,
            "currentValue": 575000,
            "currency": "INR",
            "holdings": [
                {
                    "symbol": "RELIANCE",
                    "name": "Reliance Industries",
                    "sector": "Energy",
                    "quantity": 100,
                    "averageCost": 2500,
                    "totalCost": 250000,
                    "currentValue": 290000,
                },
                {
                    "symbol": "TCS",
                    "name": "TCS",
                    "sector": "IT",
                    "quantity": 50,
                    "averageCost": 3500,
                    "totalCost": 175000,
                    "currentValue": 195000,
                },
                {
                    "symbol": "HDFCBANK",
                    "name": "HDFC Bank",
                    "sector": "Banking",
                    "quantity": 50,
                    "averageCost": 1500,
                    "totalCost": 75000,
                    "currentValue": 90000,
                },
            ],
        }
    
    def test_tool_metadata(self, portfolio_tool):
        """Test tool has correct metadata"""
        assert portfolio_tool.name == "portfolio_reader"
        assert portfolio_tool.description is not None
    
    def test_get_holdings_summary(self, portfolio_tool, sample_portfolio):
        """Test getting portfolio holdings summary"""
        portfolio_tool.set_portfolio_data(sample_portfolio)
        
        result = portfolio_tool.execute(
            operation="get_holdings_summary",
            portfolio=sample_portfolio,
        )
        
        assert result.status == ToolResultStatus.SUCCESS
        assert "holdings" in result.data
        assert len(result.data["holdings"]) == 3
    
    def test_get_sector_breakdown(self, portfolio_tool, sample_portfolio):
        """Test sector breakdown analysis"""
        portfolio_tool.set_portfolio_data(sample_portfolio)
        
        result = portfolio_tool.execute(
            operation="get_sector_breakdown",
            portfolio=sample_portfolio,
        )
        
        assert result.status == ToolResultStatus.SUCCESS
        assert "sectors" in result.data
        
        sectors = result.data["sectors"]
        assert "Energy" in [s["sector"] for s in sectors]
        assert "IT" in [s["sector"] for s in sectors]
        assert "Banking" in [s["sector"] for s in sectors]
    
    def test_get_top_holdings(self, portfolio_tool, sample_portfolio):
        """Test getting top holdings by value"""
        portfolio_tool.set_portfolio_data(sample_portfolio)
        
        result = portfolio_tool.execute(
            operation="get_top_holdings",
            portfolio=sample_portfolio,
            limit=2,
        )
        
        assert result.status == ToolResultStatus.SUCCESS
        assert "holdings" in result.data
        assert len(result.data["holdings"]) <= 2
        
        # First holding should be RELIANCE (highest value)
        assert result.data["holdings"][0]["symbol"] == "RELIANCE"
    
    def test_identify_risks(self, portfolio_tool, sample_portfolio):
        """Test risk identification"""
        portfolio_tool.set_portfolio_data(sample_portfolio)
        
        result = portfolio_tool.execute(
            operation="identify_risks",
            portfolio=sample_portfolio,
        )
        
        assert result.status == ToolResultStatus.SUCCESS
        assert "risks" in result.data
        assert "concentration_risks" in result.data
    
    def test_concentrated_portfolio_risk(self, portfolio_tool):
        """Test risk identification for concentrated portfolio"""
        concentrated = {
            "name": "Concentrated",
            "totalInvested": 100000,
            "currentValue": 110000,
            "holdings": [
                {
                    "symbol": "TCS",
                    "sector": "IT",
                    "totalCost": 100000,
                    "currentValue": 110000,
                },
            ],
        }
        
        portfolio_tool.set_portfolio_data(concentrated)
        
        result = portfolio_tool.execute(
            operation="identify_risks",
            portfolio=concentrated,
        )
        
        assert result.status == ToolResultStatus.SUCCESS
        # Should identify concentration risk
        risks = result.data.get("risks", [])
        concentration = result.data.get("concentration_risks", [])
        
        # Should have warnings about low diversification
        assert len(risks) > 0 or len(concentration) > 0
    
    def test_empty_portfolio(self, portfolio_tool):
        """Test handling of empty portfolio"""
        empty_portfolio = {
            "name": "Empty",
            "totalInvested": 0,
            "currentValue": 0,
            "holdings": [],
        }
        
        portfolio_tool.set_portfolio_data(empty_portfolio)
        
        result = portfolio_tool.execute(
            operation="get_holdings_summary",
            portfolio=empty_portfolio,
        )
        
        assert result.status == ToolResultStatus.SUCCESS
        assert result.data["holdings"] == []
    
    def test_invalid_operation(self, portfolio_tool, sample_portfolio):
        """Test error handling for invalid operation"""
        result = portfolio_tool.execute(
            operation="invalid_operation",
            portfolio=sample_portfolio,
        )
        
        assert result.status == ToolResultStatus.ERROR
    
    def test_missing_portfolio_data(self, portfolio_tool):
        """Test error handling when portfolio data is missing"""
        result = portfolio_tool.execute(
            operation="get_holdings_summary",
            portfolio=None,
        )
        
        assert result.status == ToolResultStatus.ERROR


class TestToolValidation:
    """Tests for tool input validation"""
    
    def test_calculator_validates_numeric_input(self):
        """Test calculator validates numeric inputs"""
        calc = CalculatorTool()
        
        result = calc.execute(
            calculation="portfolio_return",
            data={
                "total_invested": "not a number",
                "current_value": 100000,
            }
        )
        
        # Should either handle conversion or return error
        assert result.status in [ToolResultStatus.SUCCESS, ToolResultStatus.ERROR]
    
    def test_portfolio_tool_validates_holdings_structure(self):
        """Test portfolio tool validates holdings structure"""
        tool = PortfolioAnalysisTool()
        
        invalid_portfolio = {
            "name": "Invalid",
            "holdings": "not an array",  # Should be array
        }
        
        result = tool.execute(
            operation="get_holdings_summary",
            portfolio=invalid_portfolio,
        )
        
        assert result.status == ToolResultStatus.ERROR


class TestToolResults:
    """Tests for ToolResult class"""
    
    def test_success_result(self):
        """Test creating success result"""
        result = ToolResult(
            status=ToolResultStatus.SUCCESS,
            data={"key": "value"},
        )
        
        assert result.status == ToolResultStatus.SUCCESS
        assert result.data == {"key": "value"}
        assert result.error is None
    
    def test_error_result(self):
        """Test creating error result"""
        result = ToolResult(
            status=ToolResultStatus.ERROR,
            error="Something went wrong",
        )
        
        assert result.status == ToolResultStatus.ERROR
        assert result.error == "Something went wrong"
        assert result.data is None
    
    def test_result_to_dict(self):
        """Test converting result to dictionary"""
        result = ToolResult(
            status=ToolResultStatus.SUCCESS,
            data={"value": 123},
        )
        
        result_dict = result.to_dict()
        
        assert isinstance(result_dict, dict)
        assert result_dict["status"] == "success"
        assert result_dict["data"]["value"] == 123
