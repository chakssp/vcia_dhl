# COMANDOS RÁPIDOS - CLAUDE CODE + VSCODE
# COPIE E COLE NO POWERSHELL

# 🚀 INSTALAÇÃO COMPLETA (1 comando)
Set-Location F:\site_vps\claude-code-setup; .\INSTALAR-TUDO.bat

# 🔄 MIGRAR DO DEVCONTAINER (se aplicável)
Set-Location F:\site_vps\claude-code-setup; .\MIGRAR-DEVCONTAINER.ps1

# ✅ VERIFICAR INSTALAÇÃO
Set-Location F:\site_vps\claude-code-setup; .\VERIFICAR.ps1

# 🎯 COMEÇAR A USAR AGORA
Set-Location F:\site_vps\claude-code-setup; .\START-NOW.bat

# 📦 INSTALAR CLAUDE CODE MANUALMENTE
npm install -g @anthropic-ai/claude-code@latest

# 🔑 FAZER LOGIN
claude login

# 🚀 INICIAR NO PROJETO
cd F:\vcia-1307\vcia_dhl; code .; claude

# 🔍 COMANDOS DE DEBUG
claude --version              # Versão instalada
claude /doctor               # Diagnosticar problemas
claude /mcp                  # Ver MCPs disponíveis
claude /permissions          # Ver/editar permissões
claude --mcp-debug          # Debug detalhado de MCPs

# 💾 BACKUP DE CONFIGURAÇÕES
Copy-Item "$env:USERPROFILE\.claude" "$env:USERPROFILE\.claude-backup" -Recurse

# 🗑️ RESET COMPLETO (CUIDADO!)
Remove-Item "$env:USERPROFILE\.claude" -Recurse -Force

# 📊 VER LOGS
Get-Content "$env:USERPROFILE\.claude\logs\claude-code.log" -Tail 50

# 🔧 EDITAR CONFIGURAÇÃO
notepad "$env:USERPROFILE\.claude\claude_desktop_config.json"

# 🐳 INICIAR NEO4J (para Graphiti)
docker run -d --name neo4j-graphiti -p 7474:7474 -p 7687:7687 -e NEO4J_AUTH=neo4j/password neo4j:latest

# 📝 CRIAR COMANDO CUSTOMIZADO
New-Item -ItemType File -Path "$env:USERPROFILE\.claude\commands\meu-comando.md" -Force