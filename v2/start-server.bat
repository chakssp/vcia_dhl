@echo off
echo Starting KC V2 Development Server...
echo.
echo Server will run at: http://localhost:5500/v2/
echo Press Ctrl+C to stop the server
echo.

REM Kill any existing server on port 5500
for /f "tokens=5" %%a in ('netstat -aon ^| find ":5500" ^| find "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

REM Navigate to v2 directory and start server
cd /d "%~dp0"
npx http-server . -p 5500 -c-1 --cors