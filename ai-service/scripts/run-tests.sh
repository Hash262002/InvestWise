#!/bin/bash
# ============================================
# AI Service Test Runner Script
# ============================================
# Usage: ./scripts/run-tests.sh [options]
# Options:
#   --unit        Run only unit tests
#   --integration Run only integration tests
#   --coverage    Run with coverage report
#   --verbose     Verbose output
#   --fast        Skip slow tests
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  InvestWise AI Service Test Runner${NC}"
echo -e "${BLUE}========================================${NC}"

# Navigate to ai-service directory
cd "$(dirname "$0")/.."
echo -e "${YELLOW}Working directory: $(pwd)${NC}"

# Check if virtual environment exists
if [ ! -d ".venv" ] && [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv .venv
fi

# Activate virtual environment
if [ -d ".venv" ]; then
    source .venv/bin/activate
elif [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install test dependencies
echo -e "${YELLOW}Installing test dependencies...${NC}"
pip install -q -r requirements.txt
pip install -q -r requirements-test.txt 2>/dev/null || pip install -q pytest pytest-asyncio pytest-cov pytest-mock httpx aioresponses

# Parse arguments
PYTEST_ARGS="-v"
case "$1" in
    --unit)
        echo -e "${GREEN}Running unit tests only...${NC}"
        PYTEST_ARGS="$PYTEST_ARGS tests/unit/"
        ;;
    --integration)
        echo -e "${GREEN}Running integration tests only...${NC}"
        PYTEST_ARGS="$PYTEST_ARGS tests/integration/"
        ;;
    --coverage)
        echo -e "${GREEN}Running with coverage...${NC}"
        PYTEST_ARGS="$PYTEST_ARGS --cov=src --cov-report=term-missing --cov-report=html"
        ;;
    --verbose)
        echo -e "${GREEN}Running with verbose output...${NC}"
        PYTEST_ARGS="$PYTEST_ARGS -vv --tb=long"
        ;;
    --fast)
        echo -e "${GREEN}Skipping slow tests...${NC}"
        PYTEST_ARGS="$PYTEST_ARGS -m 'not slow'"
        ;;
    *)
        echo -e "${GREEN}Running all tests...${NC}"
        PYTEST_ARGS="$PYTEST_ARGS tests/"
        ;;
esac

# Set PYTHONPATH
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# Run tests
echo -e "${BLUE}Starting tests...${NC}"
echo ""

python -m pytest $PYTEST_ARGS

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Tests completed!${NC}"
echo -e "${GREEN}========================================${NC}"
