@echo off
echo ========================================
echo    KC V2 - STARTING FROM CORRECT DIRECTORY
echo ========================================
echo.

REM Change to the V2 directory
cd /d "F:\vcia-1307\vcia_dhl\v2"

echo Current directory: %CD%
echo.

REM Check if we're in the right place
if not exist "index.html" (
    echo ERROR: index.html not found in current directory!
    echo Please ensure you're in the v2 directory.
    pause
    exit /b 1
)

if not exist "js\core\EventBus.js" (
    echo ERROR: Core files not found!
    echo Please ensure all files are properly integrated.
    pause
    exit /b 1
)

echo ✅ All core files found!
echo.
echo Starting server from: %CD%
echo.
echo ====================================
echo    Opening http://localhost:3000
echo    Press Ctrl+C to stop
echo ====================================
echo.

REM Open browser
start http://localhost:3000

REM Start Python server from the correct directory
python -m http.server 3000

pause