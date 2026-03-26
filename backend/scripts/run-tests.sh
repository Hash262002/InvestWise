#!/bin/bash
# ============================================
# Backend Test Runner Script
# ============================================
# Usage: ./scripts/run-tests.sh [options]
# Options:
#   --unit      Run only unit tests
#   --api       Run only API tests
#   --kafka     Run only Kafka tests
#   --coverage  Run with coverage report
#   --watch     Run in watch mode
# ============================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  InvestWise Backend Test Runner${NC}"
echo -e "${BLUE}========================================${NC}"

# Navigate to backend directory
cd "$(dirname "$0")/.."
echo -e "${YELLOW}Working directory: $(pwd)${NC}"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Check if test dependencies are installed
if ! npm list mongodb-memory-server-core &>/dev/null; then
    echo -e "${YELLOW}Installing test dependencies...${NC}"
    npm install --save-dev mongodb-memory-server
fi

# Parse arguments
JEST_ARGS=""
case "$1" in
    --unit)
        echo -e "${GREEN}Running unit tests only...${NC}"
        JEST_ARGS="--testPathPattern=unit"
        ;;
    --api)
        echo -e "${GREEN}Running API tests only...${NC}"
        JEST_ARGS="--testPathPattern=api"
        ;;
    --kafka)
        echo -e "${GREEN}Running Kafka tests only...${NC}"
        JEST_ARGS="--testPathPattern=kafka"
        ;;
    --coverage)
        echo -e "${GREEN}Running with coverage...${NC}"
        JEST_ARGS="--coverage"
        ;;
    --watch)
        echo -e "${GREEN}Running in watch mode...${NC}"
        JEST_ARGS="--watch"
        ;;
    *)
        echo -e "${GREEN}Running all tests...${NC}"
        ;;
esac

# Run tests
echo -e "${BLUE}Starting tests...${NC}"
echo ""

npm test -- $JEST_ARGS

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Tests completed!${NC}"
echo -e "${GREEN}========================================${NC}"
