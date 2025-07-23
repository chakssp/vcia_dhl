# VERIFICAÇÃO RÁPIDA - CLAUDE CODE + VSCODE
Write-Host "🔍 VERIFICANDO INSTALAÇÃO" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

$errors = 0

# 1. Claude Code instalado?
Write-Host "`n1️⃣ Claude Code:" -NoNewline
$claude = Get-Command claude -ErrorAction SilentlyContinue
if ($claude) {
    Write-Host " ✅ Instalado" -ForegroundColor Green
    Write-Host "   Versão: $(claude --version 2>$null)" -ForegroundColor Gray
} else {
    Write-Host " ❌ NÃO instalado" -ForegroundColor Red
    Write-Host "   Execute: npm install -g @anthropic-ai/claude-code" -ForegroundColor Yellow
    $errors++
}

# 2. Configuração existe?
Write-Host "`n2️⃣ Configuração:" -NoNewline
$homeDir = if ($env:WSL_DISTRO_NAME) { $env:HOME } else { $env:USERPROFILE }
$configPath = Join-Path $homeDir ".claude\claude_desktop_config.json"
if (Test-Path $configPath) {
    Write-Host " ✅ Encontrada" -ForegroundColor Green
    $config = Get-Content $configPath | ConvertFrom-Json
    Write-Host "   MCPs configurados: $($config.mcpServers.PSObject.Properties.Name.Count)" -ForegroundColor Gray
} else {
    Write-Host " ❌ NÃO encontrada" -ForegroundColor Red
    Write-Host "   Execute: .\SETUP-CLAUDE-CODE-VSCODE.ps1" -ForegroundColor Yellow
    $errors++
}

# 3. Node.js disponível?
Write-Host "`n3️⃣ Node.js:" -NoNewline
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    Write-Host " ✅ Instalado" -ForegroundColor Green
    Write-Host "   Versão: $(node --version)" -ForegroundColor Gray
} else {
    Write-Host " ❌ NÃO instalado" -ForegroundColor Red
    $errors++
}

# 4. VSCode instalado?
Write-Host "`n4️⃣ VSCode:" -NoNewline
$code = Get-Command code -ErrorAction SilentlyContinue
if ($code) {
    Write-Host " ✅ Instalado" -ForegroundColor Green
} else {
    Write-Host " ⚠️  NÃO encontrado no PATH" -ForegroundColor Yellow
}

# 5. Docker rodando? (para n8n-mcp)
Write-Host "`n5️⃣ Docker:" -NoNewline
try {
    $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
    if ($dockerVersion) {
        Write-Host " ✅ Rodando" -ForegroundColor Green
        Write-Host "   Versão: $dockerVersion" -ForegroundColor Gray
    } else {
        Write-Host " ⚠️  Instalado mas não rodando" -ForegroundColor Yellow
    }
} catch {
    Write-Host " ❌ NÃO disponível" -ForegroundColor Red
}

# 6. MCPs instalados?
Write-Host "`n6️⃣ MCPs Locais:" -ForegroundColor White
$mcpDir = Join-Path $homeDir "mcp-servers"
if (Test-Path $mcpDir) {
    Write-Host "   ✅ Diretório existe: $mcpDir" -ForegroundColor Green
    $subDirs = Get-ChildItem $mcpDir -Directory | Select-Object -First 5
    foreach ($dir in $subDirs) {
        Write-Host "   📦 $($dir.Name)" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️  Diretório não encontrado" -ForegroundColor Yellow
    Write-Host "   MCPs serão baixados via npx na primeira execução" -ForegroundColor Gray
}

# 7. Launcher existe?
Write-Host "`n7️⃣ Launcher:" -NoNewline
$launcherPath = Join-Path $homeDir "claude-vscode.bat"
if (Test-Path $launcherPath) {
    Write-Host " ✅ Criado" -ForegroundColor Green
    Write-Host "   $launcherPath" -ForegroundColor Gray
} else {
    Write-Host " ⚠️  Não encontrado" -ForegroundColor Yellow
}

# RESUMO
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
if ($errors -eq 0) {
    Write-Host "✅ TUDO PRONTO!" -ForegroundColor Green
    Write-Host "`nPróximo passo:" -ForegroundColor Yellow
    Write-Host "1. Execute: claude login" -ForegroundColor White
    Write-Host "2. Depois: claude" -ForegroundColor White
} else {
    Write-Host "❌ PROBLEMAS ENCONTRADOS: $errors" -ForegroundColor Red
    Write-Host "`nExecute primeiro:" -ForegroundColor Yellow
    Write-Host ".\INSTALAR-TUDO.bat (como Admin)" -ForegroundColor White
}

Write-Host "`n💡 TESTE RÁPIDO:" -ForegroundColor Cyan
Write-Host "claude --version     # Ver versão" -ForegroundColor Gray
Write-Host "claude /mcp         # Ver MCPs disponíveis" -ForegroundColor Gray
Write-Host "claude /doctor      # Diagnosticar problemas" -ForegroundColor Gray

pause