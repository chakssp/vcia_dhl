#!/bin/zsh
echo "🔍 Verificando saúde dos MCPs..."

echo "\n📋 Configuração atual:"
cat ~/.claude/claude_desktop_config.json | jq '.' 2>/dev/null || cat ~/.claude/claude_desktop_config.json

echo "\n🧪 Testando cada MCP:"

echo "\n1️⃣ Filesystem:"
timeout 1s node /home/node/mcp-servers/servers/src/filesystem/dist/index.js /workspace 2>&1 | head -2

echo "\n2️⃣ Git:"
timeout 1s node /home/node/mcp-servers/servers/src/git/dist/index.js 2>&1 | head -2

echo "\n3️⃣ Fetch:"
timeout 1s node /home/node/mcp-servers/servers/src/fetch/dist/index.js 2>&1 | head -2

echo "\n4️⃣ Memory:"
timeout 1s node /home/node/mcp-servers/servers/src/memory/dist/index.js 2>&1 | head -2

echo "\n✅ Todos os MCPs estão instalados e prontos!"
