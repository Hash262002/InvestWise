#!/bin/bash
# ========================================
# InvestWise API Test Script
# ========================================

BASE_URL="http://localhost:3001"
API_URL="$BASE_URL/api"

echo "========================================="
echo "InvestWise API Tests"
echo "========================================="
echo ""

# Test 1: Health Check
echo "1. Testing Health Check..."
curl -s "$BASE_URL/health"
echo ""
echo ""

# Test 2: Root Endpoint
echo "2. Testing Root Endpoint..."
curl -s "$BASE_URL/"
echo ""
echo ""

# Test 3: Register User
echo "3. Testing User Registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test'$(date +%s)'@example.com",
    "password": "TestPass123!@#",
    "firstName": "Test",
    "lastName": "User"
  }')
echo "$REGISTER_RESPONSE" | python3 -m json.tool
echo ""

# Extract access token if registration was successful
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('accessToken', ''))" 2>/dev/null)
REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('refreshToken', ''))" 2>/dev/null)

if [ -n "$ACCESS_TOKEN" ]; then
  echo "✅ Registration successful!"
  echo ""
  
  # Test 4: Get Current User
  echo "4. Testing Get Current User (Protected Route)..."
  curl -s "$API_URL/auth/me" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
  echo ""
  
  # Test 5: Refresh Token
  echo "5. Testing Token Refresh..."
  curl -s -X POST "$API_URL/auth/refresh" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" | python3 -m json.tool
  echo ""
  
  # Test 6: Enable 2FA (Start Setup)
  echo "6. Testing Enable 2FA..."
  ENABLE_2FA_RESPONSE=$(curl -s -X POST "$API_URL/auth/enable-2fa" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json")
  echo "$ENABLE_2FA_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(json.dumps({k:v for k,v in d.items() if k != 'data' or 'qrCode' not in v}, indent=2) if 'qrCode' in str(d) else json.dumps(d, indent=2))"
  echo ""
  
  # Test 7: Get Backup Codes Status (should fail since 2FA not confirmed)
  echo "7. Testing Backup Codes (before 2FA confirmed)..."
  curl -s "$API_URL/auth/backup-codes" \
    -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
  echo ""
  
  # Test 8: Logout
  echo "8. Testing Logout..."
  curl -s -X POST "$API_URL/auth/logout" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}" | python3 -m json.tool
  echo ""
else
  echo "❌ Registration failed, skipping authenticated tests"
fi

echo ""
echo "========================================="
echo "Tests Complete!"
echo "=========================================""
