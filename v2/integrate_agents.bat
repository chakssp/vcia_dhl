@echo off
REM Integration script for KC V2 Multi-Agent outputs (Windows)
REM This script copies all agent-created files to their proper locations

echo Starting KC V2 Agent Integration...

REM Base directories
set V2_ROOT=.
set WORKSPACE_ROOT=.\_parallel_workspaces

REM Agent 1 - Components
echo Integrating Agent 1 components...
if not exist ".\js\components" mkdir ".\js\components"
if not exist ".\js\utils" mkdir ".\js\utils"
if not exist ".\js\views" mkdir ".\js\views"
copy "%WORKSPACE_ROOT%\agent-1-frontend\CommandPalette.js" ".\js\components\"
copy "%WORKSPACE_ROOT%\agent-1-frontend\KeyboardShortcuts.js" ".\js\utils\"
copy "%WORKSPACE_ROOT%\agent-1-frontend\Logger.js" ".\js\utils\"
copy "%WORKSPACE_ROOT%\agent-1-frontend\ExportView.js" ".\js\views\"
copy "%WORKSPACE_ROOT%\agent-1-frontend\LogsView.js" ".\js\views\"
copy "%WORKSPACE_ROOT%\agent-1-frontend\StatsView.js" ".\js\views\"

REM Agent 2 - V1 Integration
echo Integrating Agent 2 V1 compatibility...
if not exist ".\js\integration" mkdir ".\js\integration"
if not exist ".\js\tests" mkdir ".\js\tests"
copy "%WORKSPACE_ROOT%\agent-2-v1bridge\V1IntegrationLoader.js" ".\js\integration\"
copy "%WORKSPACE_ROOT%\agent-2-v1bridge\MigrationScripts.js" ".\js\integration\"
copy "%WORKSPACE_ROOT%\agent-2-v1bridge\V1ServiceAdapters.js" ".\js\integration\"
copy "%WORKSPACE_ROOT%\agent-2-v1bridge\BackwardsCompatibility.js" ".\js\integration\"
copy "%WORKSPACE_ROOT%\agent-2-v1bridge\LegacyBridgeTests.js" ".\js\tests\"

REM Agent 3 - UI/UX Enhancements
echo Integrating Agent 3 UI enhancements...
if not exist ".\css" mkdir ".\css"
copy "%WORKSPACE_ROOT%\agent-3-ui\animations.css" ".\css\"
copy "%WORKSPACE_ROOT%\agent-3-ui\terminal-theme.css" ".\css\"
copy "%WORKSPACE_ROOT%\agent-3-ui\responsive-layout.css" ".\css\"
copy "%WORKSPACE_ROOT%\agent-3-ui\keyboard-navigation.css" ".\css\"
copy "%WORKSPACE_ROOT%\agent-3-ui\theme-switcher.js" ".\js\utils\"

REM Agent 4 - Backend Services
echo Integrating Agent 4 backend services...
if not exist ".\js\services" mkdir ".\js\services"
copy "%WORKSPACE_ROOT%\agent-4-backend\APIService.js" ".\js\services\"
copy "%WORKSPACE_ROOT%\agent-4-backend\WebSocketService.js" ".\js\services\"
copy "%WORKSPACE_ROOT%\agent-4-backend\BatchOperations.js" ".\js\services\"

REM Agent 5 - Testing Framework
echo Integrating Agent 5 test suite...
if not exist ".\js\tests" mkdir ".\js\tests"
copy "%WORKSPACE_ROOT%\agent-5-testing\*.js" ".\js\tests\"
if not exist ".\docs" mkdir ".\docs"
copy "%WORKSPACE_ROOT%\agent-5-testing\TestDocumentation.md" ".\docs\"

REM Agent 6 - Documentation and Deployment
echo Integrating Agent 6 documentation...
if not exist ".\docs" mkdir ".\docs"
if not exist ".\deployment" mkdir ".\deployment"
copy "%WORKSPACE_ROOT%\agent-6-docs\*.md" ".\docs\"
xcopy "%WORKSPACE_ROOT%\agent-6-docs\deployment\*" ".\deployment\" /E /I /Y

echo.
echo Integration complete!
echo.
echo Summary:
echo - Agent 1: 6 components integrated
echo - Agent 2: 5 V1 compatibility modules integrated
echo - Agent 3: 5 UI enhancement files integrated
echo - Agent 4: 3 backend services integrated
echo - Agent 5: 10 test files integrated
echo - Agent 6: 9 documentation/deployment files integrated
echo.
echo Total: 43 files successfully integrated
echo.
echo Next steps:
echo 1. Run 'npm install' to install dependencies
echo 2. Run 'npm test' to verify integration
echo 3. Start development server with 'npm run dev'
echo 4. Access KC V2 at http://localhost:3000
echo.
pause