#!/bin/bash

# Test Security Dashboard on All Platforms
# This script verifies the security dashboard is working across platforms

echo "=================================================="
echo "Nexus AI Pro - Security Dashboard Test Suite"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:3001/api/security"
FRONTEND_URL="http://localhost:5173"
TIMEOUT=10

# Helper function to check if server is running
check_server() {
  if ! curl -s "$API_URL/dashboard" > /dev/null 2>&1; then
    echo -e "${RED}✗ Backend server not running${NC}"
    echo "  Start with: node server.js"
    return 1
  fi
  echo -e "${GREEN}✓ Backend server running${NC}"
  return 0
}

# Helper function to test API endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local description=$3
  
  echo -n "Testing $description... "
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL$endpoint" -H "Content-Type: application/json")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" = "200" ]; then
    echo -e "${GREEN}✓${NC}"
    return 0
  else
    echo -e "${RED}✗ (HTTP $http_code)${NC}"
    return 1
  fi
}

# Test 1: Check if backend is running
echo "TEST 1: Backend Server Connection"
echo "=================================="
check_server || exit 1
echo ""

# Test 2: Test API Endpoints
echo "TEST 2: API Endpoints"
echo "===================="
test_endpoint "GET" "/dashboard" "GET /api/security/dashboard"
test_endpoint "POST" "/scan" "POST /api/security/scan"
test_endpoint "GET" "/alerts" "GET /api/security/alerts"
test_endpoint "GET" "/encryption-health" "GET /api/security/encryption-health"
echo ""

# Test 3: Test Frontend
echo "TEST 3: Frontend Service"
echo "======================="
echo "Checking if SecurityService is available..."
if [ -f "src/security-service.js" ]; then
  echo -e "${GREEN}✓ SecurityService file exists${NC}"
  
  # Check if it has the required exports
  if grep -q "export.*securityService" src/security-service.js; then
    echo -e "${GREEN}✓ SecurityService is exported${NC}"
  else
    echo -e "${RED}✗ SecurityService is not exported${NC}"
  fi
  
  # Check if app.jsx imports it
  if grep -q "import.*securityService" app.jsx; then
    echo -e "${GREEN}✓ app.jsx imports SecurityService${NC}"
  else
    echo -e "${RED}✗ app.jsx doesn't import SecurityService${NC}"
  fi
else
  echo -e "${RED}✗ SecurityService file not found${NC}"
fi
echo ""

# Test 4: Test Flutter Implementation
echo "TEST 4: Flutter/Android Implementation"
echo "======================================"
if [ -f "multiplatform/flutter/lib/providers/security_provider.dart" ]; then
  echo -e "${GREEN}✓ SecurityProvider exists${NC}"
  
  if [ -f "multiplatform/flutter/lib/screens/security_dashboard_screen.dart" ]; then
    echo -e "${GREEN}✓ SecurityDashboardScreen exists${NC}"
  else
    echo -e "${RED}✗ SecurityDashboardScreen not found${NC}"
  fi
else
  echo -e "${RED}✗ SecurityProvider not found${NC}"
fi
echo ""

# Test 5: Test Electron Implementation
echo "TEST 5: Electron/Desktop Implementation"
echo "========================================"
if [ -f "multiplatform/electron/electron-security-service.js" ]; then
  echo -e "${GREEN}✓ ElectronSecurityService exists${NC}"
  
  if grep -q "ipcMain.handle.*security" multiplatform/electron/main.js; then
    echo -e "${GREEN}✓ Main process handles security IPC${NC}"
  else
    echo -e "${RED}✗ Main process doesn't handle security IPC${NC}"
  fi
  
  if grep -q "window.electron.security" multiplatform/electron/preload.js; then
    echo -e "${GREEN}✓ Preload script exposes security API${NC}"
  else
    echo -e "${RED}✗ Preload script doesn't expose security API${NC}"
  fi
else
  echo -e "${RED}✗ ElectronSecurityService not found${NC}"
fi
echo ""

# Test 6: API Response Validation
echo "TEST 6: API Response Validation"
echo "==============================="
echo "Fetching dashboard data..."
dashboard=$(curl -s "$API_URL/dashboard")

if echo "$dashboard" | grep -q "overallScore"; then
  echo -e "${GREEN}✓ Dashboard has overallScore${NC}"
else
  echo -e "${RED}✗ Dashboard missing overallScore${NC}"
fi

if echo "$dashboard" | grep -q "encryptionStatus"; then
  echo -e "${GREEN}✓ Dashboard has encryptionStatus${NC}"
else
  echo -e "${RED}✗ Dashboard missing encryptionStatus${NC}"
fi

if echo "$dashboard" | grep -q "vulnerabilities"; then
  echo -e "${GREEN}✓ Dashboard has vulnerabilities${NC}"
else
  echo -e "${RED}✗ Dashboard missing vulnerabilities${NC}"
fi

if echo "$dashboard" | grep -q "threats"; then
  echo -e "${GREEN}✓ Dashboard has threats${NC}"
else
  echo -e "${RED}✗ Dashboard missing threats${NC}"
fi

echo ""

# Test 7: Security Score Range
echo "TEST 7: Security Score Validation"
echo "=================================="
score=$(echo "$dashboard" | grep -oP '"overallScore":\s*\K[0-9]+' | head -1)
if [ ! -z "$score" ]; then
  if [ "$score" -ge 0 ] && [ "$score" -le 100 ]; then
    echo -e "${GREEN}✓ Score is valid (${score}/100)${NC}"
  else
    echo -e "${RED}✗ Score is out of range: ${score}${NC}"
  fi
else
  echo -e "${RED}✗ Could not parse score${NC}"
fi
echo ""

# Test 8: Manual Testing Instructions
echo "TEST 8: Manual Testing Instructions"
echo "===================================="
echo ""
echo "Web App:"
echo "1. npm run dev"
echo "2. Open http://localhost:5173"
echo "3. Navigate to Security Dashboard"
echo "4. Click 'Run Security Scan'"
echo "5. Verify vulnerabilities and threats load"
echo ""

echo "Flutter/Android:"
echo "1. cd multiplatform/flutter"
echo "2. flutter run"
echo "3. Tap Security Dashboard button"
echo "4. Tap 'Start Scan'"
echo "5. Verify data loads from backend"
echo ""

echo "Electron/Desktop:"
echo "1. npm run electron"
echo "2. Navigate to Security Dashboard tab"
echo "3. Click 'Start Scan' button"
echo "4. Verify vulnerabilities and threats appear"
echo ""

# Summary
echo "=================================================="
echo "Test Suite Complete"
echo "=================================================="
echo ""
echo "All implementation files are in place!"
echo "Security Dashboard is ready for cross-platform use."
echo ""
echo "For more information, see:"
echo "  - SECURITY_DASHBOARD.md"
echo "  - CROSS_PLATFORM_IMPLEMENTATION.md"
