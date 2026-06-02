@echo off
setlocal

cd /d "%~dp0"

echo ==========================================
echo   The Reading Vault - Daily Quick Start
echo ==========================================
echo Starting API + Web...

start "TRV API" cmd /k "cd /d ""%~dp0"" && npm run dev:api"
start "TRV Web" cmd /k "cd /d ""%~dp0"" && npm run start:web"

echo Launch commands sent. You can close this window.
