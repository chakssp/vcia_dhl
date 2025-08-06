# MIGRAÇÃO RÁPIDA - DEVCONTAINER → LOCAL
Write-Host "🔄 MIGRANDO CONFIGURAÇÕES DO DEVCONTAINER" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

# 1. SALVAR CONFIGS DO DEVCONTAINER (SE AINDA ESTIVER RODANDO)
Write-Host "`n💾 Tentando salvar configurações do devcontainer..." -ForegroundColor Yellow

$containerId = docker ps -q -f "label=devcontainer" 2>$null
if ($containerId) {
    Write-Host "✅ Container encontrado: $containerId" -ForegroundColor Green
    
    # Copiar configurações
    docker cp "${containerId}:/home/node/.claude" "$env:TEMP\claude-backup" 2>$null
    docker cp "${containerId}:/workspace/.claude.json" "$env:TEMP\claude.json" 2>$null
    
    Write-Host "📦 Configurações salvas em $env:TEMP" -ForegroundColor Green
} else {
    Write-Host "❌ Nenhum devcontainer rodando" -ForegroundColor Red
}

# 2. INSTALAR CLAUDE CODE GLOBALMENTE
Write-Host "`n📦 Instalando Claude Code globalmente..." -ForegroundColor Yellow

# Verificar se já está instalado
$claudeInstalled = Get-Command claude -ErrorAction SilentlyContinue

if (!$claudeInstalled) {
    Write-Host "Instalando @anthropic-ai/claude-code..." -ForegroundColor Cyan
    npm install -g @anthropic-ai/claude-code@latest
} else {
    Write-Host "✅ Claude Code já instalado: $(claude --version)" -ForegroundColor Green
}

# 3. CRIAR ESTRUTURA LOCAL
$homeDir = if ($env:WSL_DISTRO_NAME) { $env:HOME } else { $env:USERPROFILE }
$claudeDir = Join-Path $homeDir ".claude"

Write-Host "`n📁 Criando estrutura local em: $claudeDir" -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $claudeDir | Out-Null
New-Item -ItemType Directory -Force -Path "$claudeDir\commands" | Out-Null

# 4. COPIAR CONFIGURAÇÃO EXISTENTE
Write-Host "`n📋 Copiando configuração do .claude.json..." -ForegroundColor Yellow

# Ler o .claude.json que está no documento
$existingConfig = @{
    "mcpServers" = @{
        "filesystem" = @{
            "command" = "node"
            "args" = @(
                "/home/brito/mcp-servers/servers/src/filesystem/dist/index.js",
                "/home/brito",
                "/mnt/f/vcia-1307"
            )
        }
        "memory" = @{
            "command" = "node"
            "args" = @("/home/brito/mcp-servers/servers/src/memory/dist/index.js")
        }
        "context7" = @{
            "type" = "stdio"
            "command" = "npx"
            "args" = @("-y", "@upstash/context7-mcp")
        }
        "github" = @{
            "command" = "npx"
            "args" = @("-y", "@modelcontextprotocol/server-github")
            "env" = @{
                "GITHUB_PERSONAL_ACCESS_TOKEN" = "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"
            }
        }
        "brave-search" = @{
            "command" = "npx"
            "args" = @("-y", "@modelcontextprotocol/server-brave-search")
            "env" = @{
                "BRAVE_API_KEY" = "BSA3gt8RUoPiAsDu8kcU8Qw0K552pQG"
            }
        }
        "everything" = @{
            "command" = "node"
            "args" = @("/home/brito/mcp-servers/servers/src/everything/dist/index.js")
        }
        "sequential-thinking" = @{
            "command" = "node"
            "args" = @("/home/brito/mcp-servers/servers/src/sequentialthinking/dist/index.js")
        }
        "n8n-mcp" = @{
            "command" = "docker"
            "args" = @(
                "run", "-i", "--rm", "--network=host",
                "--add-host=n8n.vcia.com.br:85.31.230.28",
                "-e", "MCP_MODE=stdio",
                "-e", "LOG_LEVEL=error",
                "-e", "DISABLE_CONSOLE_OUTPUT=true",
                "-e", "N8N_API_URL=https://n8n.vcia.com.br",
                "-e", "N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDY0Y2EwMy0zYTEzLTQ0YWMtYmM3OS01ZjhkYWUxN2E5MDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzUxODEwNDU3LCJleHAiOjE3NTQzNjI4MDB9.9a-d0d-dzjXZSC7t14ZtCf9GZ56E0zxIQu4qz2FVvvA",
                "-e", "NODE_TLS_REJECT_UNAUTHORIZED=0",
                "ghcr.io/czlonkowski/n8n-mcp:latest"
            )
        }
    }
}

# Salvar no local correto
$configPath = Join-Path $claudeDir "claude_desktop_config.json"
$existingConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath $configPath -Encoding UTF8
Write-Host "✅ Configuração migrada!" -ForegroundColor Green

# 5. CRIAR LAUNCHER PARA VSCODE
Write-Host "`n🚀 Criando launcher..." -ForegroundColor Yellow

$launcher = @"
@echo off
echo 🚀 Iniciando Claude Code no VSCode...

REM Navegar para o projeto
cd /d "F:\vcia-1307\vcia_dhl"

REM Abrir VSCode
start code .

REM Aguardar VSCode carregar
timeout /t 3 /nobreak > nul

REM Iniciar Claude Code
claude --continue

REM Se falhar, tentar sem --continue
if %errorlevel% neq 0 (
    echo Tentando sem --continue...
    claude
)
"@

$launcher | Out-File -FilePath "$homeDir\claude-vscode.bat" -Encoding UTF8

# 6. RESUMO
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ MIGRAÇÃO COMPLETA!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green

Write-Host "`n📋 STATUS:" -ForegroundColor Yellow
Write-Host "- Claude Code: $(if ($claudeInstalled) {'✅ Instalado'} else {'❌ Instalar'})" -ForegroundColor White
Write-Host "- Configuração: ✅ Migrada para $configPath" -ForegroundColor White
Write-Host "- MCPs: ✅ 8 configurados" -ForegroundColor White

Write-Host "`n🎯 USAR AGORA:" -ForegroundColor Cyan
Write-Host "1. Fazer login (se necessário):" -ForegroundColor White
Write-Host "   claude login" -ForegroundColor Gray

Write-Host "`n2. Iniciar com VSCode:" -ForegroundColor White
Write-Host "   claude-vscode.bat" -ForegroundColor Gray

Write-Host "`n3. Ou manualmente:" -ForegroundColor White
Write-Host "   cd F:\vcia-1307\vcia_dhl" -ForegroundColor Gray
Write-Host "   code ." -ForegroundColor Gray
Write-Host "   claude" -ForegroundColor Gray

Write-Host "`n💡 DICA:" -ForegroundColor Yellow
Write-Host "Adicione 'claude-vscode.bat' à sua barra de tarefas!" -ForegroundColor White

pause