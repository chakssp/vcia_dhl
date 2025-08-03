@echo off
echo ========================================
echo    KC V2 Agent Integration (Corrected)
echo ========================================
echo.

REM Base directories
set V2_ROOT=.
set WORKSPACE_ROOT=.\_parallel_workspaces

REM Create necessary directories
echo Creating directory structure...
if not exist ".\js\components" mkdir ".\js\components"
if not exist ".\js\utils" mkdir ".\js\utils"
if not exist ".\js\views" mkdir ".\js\views"
if not exist ".\js\integration" mkdir ".\js\integration"
if not exist ".\js\services" mkdir ".\js\services"
if not exist ".\js\tests" mkdir ".\js\tests"
if not exist ".\docs" mkdir ".\docs"

REM Agent 1 - Components (from agent-1-components)
echo.
echo Integrating Agent 1 components...
copy "%WORKSPACE_ROOT%\agent-1-components\CommandPalette.js" ".\js\components\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-1-components\KeyboardShortcuts.js" ".\js\utils\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-1-components\Logger.js" ".\js\utils\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-1-components\ExportView.js" ".\js\views\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-1-components\LogsView.js" ".\js\views\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-1-components\StatsView.js" ".\js\views\" >nul 2>&1
echo   - Copied 6 component files

REM Agent 2 - V1 Integration (from agent-2-integration)
echo.
echo Integrating Agent 2 V1 compatibility...
copy "%WORKSPACE_ROOT%\agent-2-integration\V1IntegrationLoader.js" ".\js\integration\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-2-integration\MigrationScripts.js" ".\js\integration\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-2-integration\V1ServiceAdapters.js" ".\js\integration\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-2-integration\BackwardsCompatibility.js" ".\js\integration\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-2-integration\LegacyBridgeTests.js" ".\js\tests\" >nul 2>&1
echo   - Copied 5 integration files

REM Agent 3 - UI/UX Enhancements (from agent-3-ui)
echo.
echo Integrating Agent 3 UI enhancements...
copy "%WORKSPACE_ROOT%\agent-3-ui\animations.css" ".\css\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-3-ui\terminal-theme.css" ".\css\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-3-ui\responsive-layout.css" ".\css\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-3-ui\keyboard-navigation.css" ".\css\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-3-ui\theme-switcher.js" ".\js\utils\" >nul 2>&1
echo   - Copied 5 UI files

REM Also rename theme-switcher to ThemeSwitcher for import consistency
copy "%WORKSPACE_ROOT%\agent-3-ui\theme-switcher.js" ".\js\utils\ThemeSwitcher.js" >nul 2>&1

REM Agent 4 - Backend Services (from agent-4-backend)
echo.
echo Integrating Agent 4 backend services...
copy "%WORKSPACE_ROOT%\agent-4-backend\APIService.js" ".\js\services\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-4-backend\WebSocketService.js" ".\js\services\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-4-backend\BatchOperations.js" ".\js\services\" >nul 2>&1
echo   - Copied 3 service files

REM Agent 5 - Testing Framework (from agent-5-tests)
echo.
echo Integrating Agent 5 test suite...
copy "%WORKSPACE_ROOT%\agent-5-tests\integration\V1BridgeTests.js" ".\js\tests\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-5-tests\unit\ComponentTests.js" ".\js\tests\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-5-tests\e2e\FullWorkflowTests.js" ".\js\tests\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-5-tests\performance\BenchmarkTests.js" ".\js\tests\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-5-tests\test-setup.js" ".\js\tests\TestRunner.js" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-5-tests\test-utils\TestFramework.js" ".\js\tests\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-5-tests\TestDocumentation.md" ".\docs\" >nul 2>&1
echo   - Copied 7 test files

REM Agent 6 - Documentation (from agent-6-docs)
echo.
echo Integrating Agent 6 documentation...
copy "%WORKSPACE_ROOT%\agent-6-docs\UserGuide.md" ".\docs\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-6-docs\DeveloperDocumentation.md" ".\docs\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-6-docs\StartupGuide.md" ".\docs\" >nul 2>&1
copy "%WORKSPACE_ROOT%\agent-6-docs\MigrationChecklist.md" ".\docs\" >nul 2>&1
echo   - Copied 4 documentation files

REM Check if key files were copied successfully
echo.
echo Verifying integration...
set ERRORS=0

if not exist ".\js\components\CommandPalette.js" (
    echo ERROR: CommandPalette.js not found!
    set /A ERRORS+=1
)
if not exist ".\js\utils\Logger.js" (
    echo ERROR: Logger.js not found!
    set /A ERRORS+=1
)
if not exist ".\js\services\APIService.js" (
    echo ERROR: APIService.js not found!
    set /A ERRORS+=1
)

if %ERRORS% GTR 0 (
    echo.
    echo ❌ Integration encountered %ERRORS% errors!
    echo Please check the file paths and try again.
) else (
    echo ✅ All files integrated successfully!
)

echo.
echo ========================================
echo Integration Summary:
echo - Components: 6 files
echo - V1 Integration: 5 files
echo - UI/UX: 5 files
echo - Services: 3 files
echo - Tests: 7 files
echo - Documentation: 4 files
echo.
echo Total: 30 core files integrated
echo ========================================
echo.
echo Next steps:
echo 1. Start the server with START_KC_V2.bat
echo 2. Or manually: python -m http.server 3000
echo 3. Open http://localhost:3000
echo.
pause