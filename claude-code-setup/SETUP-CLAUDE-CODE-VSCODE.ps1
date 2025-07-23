# SCRIPT DEFINITIVO - CLAUDE CODE + VSCODE COM MCPs PERSISTENTES
# BY BRITO - CHEGA DE PERDER TEMPO!

Write-Host "🚀 CONFIGURANDO CLAUDE CODE COM MCPs PERSISTENTES" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

# 1. DEFINIR DIRETÓRIOS
$homeDir = if ($env:WSL_DISTRO_NAME) { $env:HOME } else { $env:USERPROFILE }
$claudeConfigDir = Join-Path $homeDir ".claude"
$mcpInstallDir = Join-Path $homeDir "mcp-servers"

Write-Host "`n📁 Criando estrutura de diretórios..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $claudeConfigDir | Out-Null
New-Item -ItemType Directory -Force -Path $mcpInstallDir | Out-Null
New-Item -ItemType Directory -Force -Path "$claudeConfigDir\commands" | Out-Null

# 2. INSTALAR MCPs LOCALMENTE (NÃO NO CONTAINER!)
Write-Host "`n📦 Instalando MCPs no sistema local..." -ForegroundColor Yellow

# Clone do repositório oficial de MCPs
if (!(Test-Path "$mcpInstallDir\servers")) {
    Write-Host "Clonando repositório de MCPs..." -ForegroundColor Cyan
    git clone https://github.com/modelcontextprotocol/servers.git "$mcpInstallDir\servers"
}

# Entrar no diretório e instalar
Set-Location "$mcpInstallDir\servers"

Write-Host "Instalando dependências..." -ForegroundColor Cyan
npm install
npm run build

# 3. INSTALAR MCPs ADICIONAIS
Write-Host "`n🔧 Instalando MCPs adicionais..." -ForegroundColor Yellow

# Graphiti MCP
Write-Host "Instalando Graphiti..." -ForegroundColor Cyan
if (!(Test-Path "$mcpInstallDir\graphiti")) {
    git clone https://github.com/getzep/graphiti.git "$mcpInstallDir\graphiti"
    Set-Location "$mcpInstallDir\graphiti\mcp_server"
    pip install -e .
}

# Magic UI MCP (se disponível via npm)
Write-Host "Instalando Magic UI MCP..." -ForegroundColor Cyan
npm install -g @magicuidesign/mcp --force 2>$null

# 4. CRIAR CONFIGURAÇÃO PERSISTENTE
Write-Host "`n⚙️ Criando configuração persistente..." -ForegroundColor Yellow

# Detectar se estamos no WSL ou Windows
$isWSL = $null -ne $env:WSL_DISTRO_NAME
$pathSeparator = if ($isWSL) { "/" } else { "\" }
$nodeCmd = if ($isWSL) { "node" } else { "node.exe" }

# Configuração adaptada do .claude.json existente
$config = @{
    "mcpServers" = @{
        # MCPs principais já testados
        "filesystem" = @{
            "command" = $nodeCmd
            "args" = @(
                "$mcpInstallDir/servers/src/filesystem/dist/index.js",
                $homeDir,
                "F:\site_vps",
                "F:\vcia-1307"
            )
        }
        "memory" = @{
            "command" = $nodeCmd
            "args" = @("$mcpInstallDir/servers/src/memory/dist/index.js")
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
            "command" = $nodeCmd
            "args" = @("$mcpInstallDir/servers/src/everything/dist/index.js")
        }
        "sequential-thinking" = @{
            "command" = $nodeCmd
            "args" = @("$mcpInstallDir/servers/src/sequentialthinking/dist/index.js")
        }
        # Novos MCPs solicitados
        "graphiti" = @{
            "command" = "python"
            "args" = @("-m", "graphiti_mcp_server")
            "env" = @{
                "NEO4J_URI" = "bolt://localhost:7687"
                "NEO4J_USER" = "neo4j"
                "NEO4J_PASSWORD" = "password"
            }
        }
    }
}

# Salvar configuração no local correto para Claude Code
$configPath = Join-Path $claudeConfigDir "claude_desktop_config.json"
$config | ConvertTo-Json -Depth 10 | Out-File -FilePath $configPath -Encoding UTF8

Write-Host "✅ Configuração salva em: $configPath" -ForegroundColor Green

# 5. CRIAR SETTINGS.JSON PARA CLAUDE CODE
Write-Host "`n📝 Criando settings.json..." -ForegroundColor Yellow

$settings = @{
    "permissions" = @{
        "allow" = @(
            "WebFetch(http://127.0.0.1:*)",
            "WebFetch(http://localhost:*)",
            "FS($homeDir/*)",
            "FS(F:\site_vps\*)",
            "FS(F:\vcia-1307\*)"
        )
    }
    "autoCompact" = $true
    "cleanupPeriodDays" = 30
}

$settingsPath = Join-Path $claudeConfigDir "settings.json"
$settings | ConvertTo-Json -Depth 10 | Out-File -FilePath $settingsPath -Encoding UTF8

Write-Host "✅ Settings salvo em: $settingsPath" -ForegroundColor Green

# 6. CRIAR SCRIPT DE INICIALIZAÇÃO PARA VSCODE
Write-Host "`n🎯 Criando launcher para VSCode..." -ForegroundColor Yellow

$launcherScript = @'
#!/bin/bash
# Launcher do Claude Code para VSCode

# Verificar se Claude Code está instalado
if ! command -v claude &> /dev/null; then
    echo "❌ Claude Code não encontrado!"
    echo "Instale com: npm install -g @anthropic-ai/claude-code"
    exit 1
fi

# Exportar variáveis necessárias
export CLAUDE_CONFIG_DIR="$HOME/.claude"
export NODE_EXTRA_CA_CERTS=""

# Abrir VSCode no diretório atual
code .

# Esperar VSCode abrir
sleep 2

# Iniciar Claude Code com configurações persistentes
echo "🚀 Iniciando Claude Code..."
claude --config "$CLAUDE_CONFIG_DIR"
'@

if ($isWSL) {
    $launcherPath = Join-Path $homeDir "start-claude-vscode.sh"
    $launcherScript | Out-File -FilePath $launcherPath -Encoding UTF8 -NoNewline
    & chmod +x $launcherPath
} else {
    # Versão Windows
    $launcherBat = @"
@echo off
echo 🚀 Iniciando Claude Code com VSCode...

REM Abrir VSCode
start code .

REM Aguardar
timeout /t 2

REM Iniciar Claude Code
claude --config "%USERPROFILE%\.claude"
"@
    $launcherBat | Out-File -FilePath "$homeDir\start-claude-vscode.bat" -Encoding UTF8
}

# 7. CONFIGURAR VSCODE
Write-Host "`n⚙️ Configurando VSCode..." -ForegroundColor Yellow

$vscodeSettings = @{
    "claude-code.configPath" = $claudeConfigDir
    "terminal.integrated.defaultProfile.windows" = "PowerShell"
    "terminal.integrated.defaultProfile.linux" = "bash"
    "files.watcherExclude" = @{
        "**/.claude/**" = $true
        "**/node_modules/**" = $true
    }
}

# Caminho do settings.json do VSCode
$vscodeSettingsPath = if ($isWSL) {
    "$homeDir/.config/Code/User/settings.json"
} else {
    "$env:APPDATA\Code\User\settings.json"
}

if (Test-Path $vscodeSettingsPath) {
    Write-Host "Atualizando configurações do VSCode..." -ForegroundColor Cyan
    $existingSettings = Get-Content $vscodeSettingsPath | ConvertFrom-Json
    foreach ($key in $vscodeSettings.Keys) {
        $existingSettings.$key = $vscodeSettings.$key
    }
    $existingSettings | ConvertTo-Json -Depth 10 | Out-File -FilePath $vscodeSettingsPath -Encoding UTF8
}

# 8. INSTRUÇÕES FINAIS
Write-Host "`n" -NoNewline
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ CONFIGURAÇÃO COMPLETA!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green

Write-Host "`n📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "1. Instale o Claude Code globalmente:" -ForegroundColor White
Write-Host "   npm install -g @anthropic-ai/claude-code" -ForegroundColor Gray

Write-Host "`n2. Configure suas credenciais:" -ForegroundColor White
Write-Host "   claude login" -ForegroundColor Gray

Write-Host "`n3. Para iniciar com VSCode:" -ForegroundColor White
if ($isWSL) {
    Write-Host "   ~/start-claude-vscode.sh" -ForegroundColor Gray
} else {
    Write-Host "   %USERPROFILE%\start-claude-vscode.bat" -ForegroundColor Gray
}

Write-Host "`n💡 COMANDOS ÚTEIS NO CLAUDE CODE:" -ForegroundColor Cyan
Write-Host "/mcp           # Ver MCPs disponíveis" -ForegroundColor Gray
Write-Host "/doctor        # Diagnosticar problemas" -ForegroundColor Gray
Write-Host "/permissions   # Gerenciar permissões" -ForegroundColor Gray
Write-Host "/config        # Ver configurações" -ForegroundColor Gray

Write-Host "`n🔧 ARQUIVOS DE CONFIGURAÇÃO:" -ForegroundColor Yellow
Write-Host "Config: $configPath" -ForegroundColor Gray
Write-Host "Settings: $settingsPath" -ForegroundColor Gray

Write-Host "`n⚠️ IMPORTANTE:" -ForegroundColor Red
Write-Host "- As configurações agora são PERSISTENTES!" -ForegroundColor White
Write-Host "- Não dependem mais do devcontainer" -ForegroundColor White
Write-Host "- MCPs instalados localmente em: $mcpInstallDir" -ForegroundColor White

Write-Host "`n" -NoNewline
pause