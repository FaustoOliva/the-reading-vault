@echo off
setlocal

cd /d "%~dp0"

echo ==========================================
echo      The Reading Vault - Quick Start
echo ==========================================
echo.
echo Select what to launch:
echo   [1] API + Web (recommended)
echo   [2] API + Mobile (Expo)
echo   [3] API only
echo.
set /p option=Option (1/2/3): 

if "%option%"=="1" goto launchApiWeb
if "%option%"=="2" goto launchApiMobile
if "%option%"=="3" goto launchApiOnly

echo Invalid option. Starting API + Web by default...
goto launchApiWeb

:launchApiWeb
echo Starting API...
start "TRV API" cmd /k "cd /d ""%~dp0"" && npm run dev:api"
echo Starting Web...
start "TRV Web" cmd /k "cd /d ""%~dp0"" && npm run start:web"
goto end

:launchApiMobile
echo Starting API...
start "TRV API" cmd /k "cd /d ""%~dp0"" && npm run dev:api"
echo Starting Mobile (Expo)...
start "TRV Mobile" cmd /k "cd /d ""%~dp0"" && npm run start:mobile"
goto end

:launchApiOnly
echo Starting API...
start "TRV API" cmd /k "cd /d ""%~dp0"" && npm run dev:api"
goto end

:end
echo.
echo Launch commands sent. You can close this window.
pause
