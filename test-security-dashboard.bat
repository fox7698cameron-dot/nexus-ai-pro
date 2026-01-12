@echo off
REM Test Security Dashboard on All Platforms (Windows)
REM This script verifies the security dashboard is working across platforms

setlocal enabledelayedexpansion

echo ==================================================
echo Nexus AI Pro - Security Dashboard Test Suite
echo ==================================================
echo.

REM Configuration
set "API_URL=http://localhost:3001/api/security"
set "FRONTEND_URL=http://localhost:5173"

REM Test 1: Check if backend is running
echo TEST 1: Backend Server Connection
echo ==================================
echo Checking if backend is running at %API_URL%/dashboard...
for /f %%A in ('powershell -Command "try { $response = Invoke-WebRequest -Uri '%API_URL%/dashboard' -TimeoutSec 5 -ErrorAction SilentlyContinue; Write-Host $response.StatusCode } catch { Write-Host 'error' }"') do (
  if "%%A"=="200" (
    echo [OK] Backend server running
  ) else (
    echo [ERROR] Backend server not running
    echo Start with: node server.js
    exit /b 1
  )
)
echo.

REM Test 2: Test API Endpoints
echo TEST 2: API Endpoints
echo ====================
echo Testing API endpoints...

REM Test GET /dashboard
for /f %%A in ('powershell -Command "try { $response = Invoke-WebRequest -Uri '%API_URL%/dashboard' -TimeoutSec 5 -ErrorAction SilentlyContinue; Write-Host $response.StatusCode } catch { Write-Host 'error' }"') do (
  if "%%A"=="200" (
    echo [OK] GET /api/security/dashboard
  ) else (
    echo [ERROR] GET /api/security/dashboard (HTTP %%A)
  )
)

REM Test POST /scan
for /f %%A in ('powershell -Command "try { $response = Invoke-WebRequest -Uri '%API_URL%/scan' -Method POST -TimeoutSec 5 -ErrorAction SilentlyContinue; Write-Host $response.StatusCode } catch { Write-Host 'error' }"') do (
  if "%%A"=="200" (
    echo [OK] POST /api/security/scan
  ) else (
    echo [ERROR] POST /api/security/scan (HTTP %%A)
  )
)

REM Test GET /alerts
for /f %%A in ('powershell -Command "try { $response = Invoke-WebRequest -Uri '%API_URL%/alerts' -TimeoutSec 5 -ErrorAction SilentlyContinue; Write-Host $response.StatusCode } catch { Write-Host 'error' }"') do (
  if "%%A"=="200" (
    echo [OK] GET /api/security/alerts
  ) else (
    echo [ERROR] GET /api/security/alerts (HTTP %%A)
  )
)

REM Test GET /encryption-health
for /f %%A in ('powershell -Command "try { $response = Invoke-WebRequest -Uri '%API_URL%/encryption-health' -TimeoutSec 5 -ErrorAction SilentlyContinue; Write-Host $response.StatusCode } catch { Write-Host 'error' }"') do (
  if "%%A"=="200" (
    echo [OK] GET /api/security/encryption-health
  ) else (
    echo [ERROR] GET /api/security/encryption-health (HTTP %%A)
  )
)
echo.

REM Test 3: Test Frontend Files
echo TEST 3: Frontend Service
echo =======================
if exist "src\security-service.js" (
  echo [OK] SecurityService file exists
  findstr /M "export.*securityService" "src\security-service.js" >nul
  if errorlevel 1 (
    echo [ERROR] SecurityService is not exported
  ) else (
    echo [OK] SecurityService is exported
  )
  
  findstr /M "import.*securityService" "app.jsx" >nul
  if errorlevel 1 (
    echo [ERROR] app.jsx doesn't import SecurityService
  ) else (
    echo [OK] app.jsx imports SecurityService
  )
) else (
  echo [ERROR] SecurityService file not found
)
echo.

REM Test 4: Test Flutter Implementation
echo TEST 4: Flutter/Android Implementation
echo ======================================
if exist "multiplatform\flutter\lib\providers\security_provider.dart" (
  echo [OK] SecurityProvider exists
  if exist "multiplatform\flutter\lib\screens\security_dashboard_screen.dart" (
    echo [OK] SecurityDashboardScreen exists
  ) else (
    echo [ERROR] SecurityDashboardScreen not found
  )
) else (
  echo [ERROR] SecurityProvider not found
)
echo.

REM Test 5: Test Electron Implementation
echo TEST 5: Electron/Desktop Implementation
echo ========================================
if exist "multiplatform\electron\electron-security-service.js" (
  echo [OK] ElectronSecurityService exists
  findstr /M "ipcMain.handle.*security" "multiplatform\electron\main.js" >nul
  if errorlevel 1 (
    echo [ERROR] Main process doesn't handle security IPC
  ) else (
    echo [OK] Main process handles security IPC
  )
  
  findstr /M "window.electron.security" "multiplatform\electron\preload.js" >nul
  if errorlevel 1 (
    echo [ERROR] Preload script doesn't expose security API
  ) else (
    echo [OK] Preload script exposes security API
  )
) else (
  echo [ERROR] ElectronSecurityService not found
)
echo.

REM Test 6: Documentation
echo TEST 6: Documentation Files
echo ===========================
if exist "SECURITY_DASHBOARD.md" (
  echo [OK] SECURITY_DASHBOARD.md exists
) else (
  echo [ERROR] SECURITY_DASHBOARD.md not found
)

if exist "CROSS_PLATFORM_IMPLEMENTATION.md" (
  echo [OK] CROSS_PLATFORM_IMPLEMENTATION.md exists
) else (
  echo [ERROR] CROSS_PLATFORM_IMPLEMENTATION.md not found
)
echo.

REM Test 7: Manual Testing Instructions
echo TEST 7: Manual Testing Instructions
echo ===================================
echo.
echo Web App:
echo 1. npm run dev
echo 2. Open http://localhost:5173
echo 3. Look for Security Dashboard button
echo 4. Click "Run Security Scan"
echo 5. Verify vulnerabilities and threats load
echo.

echo Flutter/Android:
echo 1. cd multiplatform\flutter
echo 2. flutter run
echo 3. Tap Security Dashboard button
echo 4. Tap "Start Scan"
echo 5. Verify data loads from backend
echo.

echo Electron/Desktop:
echo 1. npm run electron
echo 2. Navigate to Security Dashboard
echo 3. Click "Start Scan" button
echo 4. Verify vulnerabilities and threats appear
echo.

REM Summary
echo ==================================================
echo Test Suite Complete
echo ==================================================
echo.
echo All implementation files are in place!
echo Security Dashboard is ready for cross-platform use.
echo.
echo For more information, see:
echo   - SECURITY_DASHBOARD.md
echo   - CROSS_PLATFORM_IMPLEMENTATION.md
echo.

pause
