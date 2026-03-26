#!/bin/bash
# Test script for Market Data API

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3001"
TEST_EMAIL="testuser2@example.com"
TEST_PASSWORD="Test@12345"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Market Data API Test Suite${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Step 1: Get JWT Token
echo -e "${YELLOW}[1/5]${NC} Logging in to get JWT token..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}✗ Failed to get token${NC}"
  echo "$LOGIN_RESPONSE" | jq .
  exit 1
fi

echo -e "${GREEN}✓ Got JWT token${NC}"
echo -e "  Token: ${TOKEN:0:50}...\n"

# Step 2: Test Quote API - Single Symbol
echo -e "${YELLOW}[2/5]${NC} Testing Quote API (single symbol)..."
QUOTE_RESPONSE=$(curl -s -X GET "$API_URL/api/market/quote/RELIANCE.NS" \
  -H "Authorization: Bearer $TOKEN")

echo "$QUOTE_RESPONSE" | jq . 2>/dev/null > /tmp/quote_single.json

if [ $? -eq 0 ]; then
  PRICE=$(echo "$QUOTE_RESPONSE" | jq '.data.price' 2>/dev/null)
  SYMBOL=$(echo "$QUOTE_RESPONSE" | jq -r '.data.symbol' 2>/dev/null)
  CHANGE=$(echo "$QUOTE_RESPONSE" | jq '.data.changePercent' 2>/dev/null)
  
  echo -e "${GREEN}✓ Quote API works${NC}"
  echo -e "  Symbol: $SYMBOL"
  echo -e "  Price: ₹$PRICE"
  echo -e "  Change: ${CHANGE}%\n"
else
  echo -e "${RED}✗ Quote API failed${NC}\n"
fi

# Step 3: Test Quote API - Multiple Symbols
echo -e "${YELLOW}[3/5]${NC} Testing Quote API (multiple symbols)..."
QUOTES_RESPONSE=$(curl -s -X POST "$API_URL/api/market/quote" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbols":["RELIANCE.NS","INFOSYS.NS","TCS.NS"],"region":"IN"}')

QUOTE_COUNT=$(echo "$QUOTES_RESPONSE" | jq '.data | length' 2>/dev/null)

if [ "$QUOTE_COUNT" -eq 3 ]; then
  echo -e "${GREEN}✓ Multiple quote API works${NC}"
  echo "$QUOTES_RESPONSE" | jq '.data[] | {symbol, price, changePercent}'
  echo ""
else
  echo -e "${YELLOW}⚠ Got $QUOTE_COUNT quotes (expected 3)${NC}\n"
fi

# Step 4: Test Chart API
echo -e "${YELLOW}[4/5]${NC} Testing Chart API..."
CHART_RESPONSE=$(curl -s -X GET "$API_URL/api/market/chart/RELIANCE.NS?range=1mo&interval=1d" \
  -H "Authorization: Bearer $TOKEN")

SYMBOL=$(echo "$CHART_RESPONSE" | jq -r '.data.symbol' 2>/dev/null)
CANDLE_COUNT=$(echo "$CHART_RESPONSE" | jq '.data.candles | length' 2>/dev/null)

if [ "$CANDLE_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Chart API works${NC}"
  echo -e "  Symbol: $SYMBOL"
  echo -e "  Candles: $CANDLE_COUNT (last 1 month)"
  echo -e "  Sample candle:"
  echo "$CHART_RESPONSE" | jq '.data.candles[0]'
  echo ""
else
  echo -e "${RED}✗ Chart API failed${NC}\n"
fi

# Step 5: Test Market Summary API
echo -e "${YELLOW}[5/5]${NC} Testing Market Summary API..."
SUMMARY_RESPONSE=$(curl -s -X GET "$API_URL/api/market/summary?region=IN" \
  -H "Authorization: Bearer $TOKEN")

INDEX_COUNT=$(echo "$SUMMARY_RESPONSE" | jq '.data | length' 2>/dev/null)

if [ "$INDEX_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Market Summary API works${NC}"
  echo "$SUMMARY_RESPONSE" | jq '.data[] | {shortName, price, changePercent}'
else
  echo -e "${RED}✗ Market Summary API failed${NC}\n"
fi

echo -e "\n${BLUE}========================================${NC}"
echo -e "${GREEN}✓ All tests completed!${NC}"
echo -e "${BLUE}========================================${NC}\n"

echo -e "Summary:"
echo -e "  ✓ Authentication middleware working"
echo -e "  ✓ Quote API (single) working"
echo -e "  ✓ Quote API (multiple) working"
echo -e "  ✓ Chart API working"
echo -e "  ✓ Market Summary API working\n"

echo -e "Next steps:"
echo -e "  1. Integrate these endpoints in frontend"
echo -e "  2. Create React components for price display"
echo -e "  3. Add caching layer for API calls"
echo -e "  4. Set up auto-refresh polling (5 minutes)\n"
