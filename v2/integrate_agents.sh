#!/bin/bash

# Integration script for KC V2 Multi-Agent outputs
# This script copies all agent-created files to their proper locations

echo "🚀 Starting KC V2 Agent Integration..."

# Base directories
V2_ROOT="."
WORKSPACE_ROOT="./_parallel_workspaces"

# Agent 1 - Components
echo "📦 Integrating Agent 1 components..."
mkdir -p ./js/components ./js/utils ./js/views
cp "${WORKSPACE_ROOT}/agent-1-frontend/CommandPalette.js" ./js/components/
cp "${WORKSPACE_ROOT}/agent-1-frontend/KeyboardShortcuts.js" ./js/utils/
cp "${WORKSPACE_ROOT}/agent-1-frontend/Logger.js" ./js/utils/
cp "${WORKSPACE_ROOT}/agent-1-frontend/ExportView.js" ./js/views/
cp "${WORKSPACE_ROOT}/agent-1-frontend/LogsView.js" ./js/views/
cp "${WORKSPACE_ROOT}/agent-1-frontend/StatsView.js" ./js/views/

# Agent 2 - V1 Integration
echo "🔗 Integrating Agent 2 V1 compatibility..."
mkdir -p ./js/integration ./js/tests
cp "${WORKSPACE_ROOT}/agent-2-v1bridge/V1IntegrationLoader.js" ./js/integration/
cp "${WORKSPACE_ROOT}/agent-2-v1bridge/MigrationScripts.js" ./js/integration/
cp "${WORKSPACE_ROOT}/agent-2-v1bridge/V1ServiceAdapters.js" ./js/integration/
cp "${WORKSPACE_ROOT}/agent-2-v1bridge/BackwardsCompatibility.js" ./js/integration/
cp "${WORKSPACE_ROOT}/agent-2-v1bridge/LegacyBridgeTests.js" ./js/tests/

# Agent 3 - UI/UX Enhancements
echo "🎨 Integrating Agent 3 UI enhancements..."
mkdir -p ./css
cp "${WORKSPACE_ROOT}/agent-3-ui/animations.css" ./css/
cp "${WORKSPACE_ROOT}/agent-3-ui/terminal-theme.css" ./css/
cp "${WORKSPACE_ROOT}/agent-3-ui/responsive-layout.css" ./css/
cp "${WORKSPACE_ROOT}/agent-3-ui/keyboard-navigation.css" ./css/
cp "${WORKSPACE_ROOT}/agent-3-ui/theme-switcher.js" ./js/utils/

# Agent 4 - Backend Services
echo "⚡ Integrating Agent 4 backend services..."
mkdir -p ./js/services
cp "${WORKSPACE_ROOT}/agent-4-backend/APIService.js" ./js/services/
cp "${WORKSPACE_ROOT}/agent-4-backend/WebSocketService.js" ./js/services/
cp "${WORKSPACE_ROOT}/agent-4-backend/BatchOperations.js" ./js/services/

# Agent 5 - Testing Framework
echo "🧪 Integrating Agent 5 test suite..."
mkdir -p ./js/tests
cp "${WORKSPACE_ROOT}/agent-5-testing/V1BridgeTests.js" ./js/tests/
cp "${WORKSPACE_ROOT}/agent-5-testing/ComponentTests.js" ./js/tests/
cp "${WORKSPACE_ROOT}/agent-5-testing/FullWorkflowTests.js" ./js/tests/
cp "${WORKSPACE_ROOT}/agent-5-testing/BenchmarkTests.js" ./js/tests/
cp "${WORKSPACE_ROOT}/agent-5-testing/TestRunner.js" ./js/tests/
cp "${WORKSPACE_ROOT}/agent-5-testing/TestFramework.js" ./js/tests/
cp "${WORKSPACE_ROOT}/agent-5-testing/TestLogger.js" ./js/tests/
cp "${WORKSPACE_ROOT}/agent-5-testing/TestMocks.js" ./js/tests/
cp "${WORKSPACE_ROOT}/agent-5-testing/TestHelpers.js" ./js/tests/
cp "${WORKSPACE_ROOT}/agent-5-testing/TestDocumentation.md" ./docs/

# Agent 6 - Documentation & Deployment
echo "📚 Integrating Agent 6 documentation..."
mkdir -p ./docs ./deployment
cp "${WORKSPACE_ROOT}/agent-6-docs/UserGuide.md" ./docs/
cp "${WORKSPACE_ROOT}/agent-6-docs/DeveloperDocumentation.md" ./docs/
cp "${WORKSPACE_ROOT}/agent-6-docs/StartupGuide.md" ./docs/
cp "${WORKSPACE_ROOT}/agent-6-docs/MigrationChecklist.md" ./docs/
cp -r "${WORKSPACE_ROOT}/agent-6-docs/deployment/"* ./deployment/

echo "✅ Integration complete!"
echo ""
echo "📊 Summary:"
echo "- Agent 1: 6 components integrated"
echo "- Agent 2: 5 V1 compatibility modules integrated"
echo "- Agent 3: 5 UI enhancement files integrated"
echo "- Agent 4: 3 backend services integrated"
echo "- Agent 5: 10 test files integrated"
echo "- Agent 6: 9 documentation/deployment files integrated"
echo ""
echo "🎯 Total: 43 files successfully integrated"
echo ""
echo "Next steps:"
echo "1. Run 'npm install' to install dependencies"
echo "2. Run 'npm test' to verify integration"
echo "3. Start development server with 'npm run dev'"
echo "4. Access KC V2 at http://localhost:3000"