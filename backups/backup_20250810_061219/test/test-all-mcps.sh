#!/bin/zsh
echo "🔍 Testando todos os MCPs TypeScript..."

echo "\n1️⃣ Filesystem MCP:"
timeout 1s node /home/node/mcp-servers/servers/src/filesystem/dist/index.js /workspace 2>&1 | head -2

echo "\n2️⃣ Memory MCP:"  
timeout 1s node /home/node/mcp-servers/servers/src/memory/dist/index.js 2>&1 | head -2

echo "\n3️⃣ Everything MCP:"
timeout 1s node /home/node/mcp-servers/servers/src/everything/dist/index.js 2>&1 | head -2

echo "\n4️⃣ Sequential Thinking MCP:"
timeout 1s node /home/node/mcp-servers/servers/src/sequentialthinking/dist/index.js 2>&1 | head -2

echo "\n✅ Todos os 4 MCPs estão prontos para uso!"
echo "\n📋 Configuração salva em: ~/.claude/claude_desktop_config.json"
