@echo off
echo ========================================
echo    KNOWLEDGE CONSOLIDATOR V2 STARTUP    
echo ========================================
echo.

REM Check if integration is needed
if not exist ".\js\components\CommandPalette.js" (
    echo First time setup detected. Running integration...
    echo.
    call integrate_agents.bat
    echo.
    echo Integration completed!
    echo.
)

REM Check if node_modules exists
if not exist ".\node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

REM Create a simple HTML server without dependencies if npm fails
if not exist ".\node_modules\live-server" (
    echo.
    echo Starting simple HTTP server...
    echo.
    echo ====================================
    echo    KC V2 is starting up...
    echo    Opening in browser: http://localhost:3000
    echo    Press Ctrl+C to stop the server
    echo ====================================
    echo.
    
    REM Start browser
    start http://localhost:3000
    
    REM Use Python if available
    python -m http.server 3000 2>nul
    if %errorlevel% neq 0 (
        REM Try Python 2
        python -m SimpleHTTPServer 3000 2>nul
        if %errorlevel% neq 0 (
            REM Try Node.js built-in server
            npx http-server -p 3000 -o
        )
    )
) else (
    echo Starting KC V2 with live reload...
    echo.
    echo ====================================
    echo    KC V2 is starting up...
    echo    Opening in browser: http://localhost:3000
    echo    Live reload enabled
    echo    Press Ctrl+C to stop the server
    echo ====================================
    echo.
    npm run dev
)

pause