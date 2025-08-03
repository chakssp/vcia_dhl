# Knowledge Consolidator V2 - Safe Startup Script
# This script handles paths with spaces correctly

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   KNOWLEDGE CONSOLIDATOR V2 STARTUP    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to test if a command exists
function Test-Command {
    param($Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# Function to find Node.js
function Find-NodeJS {
    # Check if node is in PATH
    if (Test-Command "node") {
        Write-Host "[INFO] Node.js encontrado no PATH" -ForegroundColor Green
        return $true
    }
    
    # Common Node.js installation paths
    $nodePaths = @(
        "$env:ProgramFiles\nodejs\node.exe",
        "${env:ProgramFiles(x86)}\nodejs\node.exe",
        "$env:LOCALAPPDATA\Programs\nodejs\node.exe",
        "$env:APPDATA\npm\node.exe"
    )
    
    foreach ($path in $nodePaths) {
        if (Test-Path $path) {
            Write-Host "[INFO] Node.js encontrado em: $path" -ForegroundColor Green
            $nodeDir = Split-Path $path -Parent
            $env:PATH = "$nodeDir;$env:PATH"
            return $true
        }
    }
    
    Write-Host "[WARN] Node.js não encontrado" -ForegroundColor Yellow
    return $false
}

# Check for Node.js
$hasNode = Find-NodeJS

if ($hasNode) {
    Write-Host "[INFO] Versão do Node.js: " -NoNewline
    & node --version
    Write-Host ""
}

# Check if integration is needed
if (-not (Test-Path ".\js\components\CommandPalette.js")) {
    Write-Host "[INFO] Primeira execução detectada. Executando integração..." -ForegroundColor Yellow
    if (Test-Path ".\integrate_agents.bat") {
        & cmd /c integrate_agents.bat
        Write-Host "[INFO] Integração concluída!" -ForegroundColor Green
    }
    Write-Host ""
}

# Function to start server
function Start-Server {
    $browserStarted = $false
    
    # Function to open browser
    function Open-Browser {
        if (-not $script:browserStarted) {
            Start-Process "http://localhost:3000"
            $script:browserStarted = $true
        }
    }
    
    # Try npm dev if available
    if ($hasNode -and (Test-Path ".\package.json")) {
        if (-not (Test-Path ".\node_modules")) {
            Write-Host "[INFO] Instalando dependências..." -ForegroundColor Yellow
            & npm install
        }
        
        if (Test-Path ".\node_modules\live-server") {
            Write-Host "[INFO] Iniciando KC V2 com live reload..." -ForegroundColor Green
            Write-Host ""
            Write-Host "====================================" -ForegroundColor Cyan
            Write-Host "   KC V2 está iniciando..."
            Write-Host "   URL: http://localhost:3000"
            Write-Host "   Live reload ativado"
            Write-Host "   Pressione Ctrl+C para parar"
            Write-Host "====================================" -ForegroundColor Cyan
            Write-Host ""
            
            Open-Browser
            & npm run dev
            return
        }
    }
    
    # Try npx http-server
    if ($hasNode -and (Test-Command "npx")) {
        Write-Host "[INFO] Usando npx http-server..." -ForegroundColor Green
        Open-Browser
        & npx http-server -p 3000 --cors -c-1
        return
    }
    
    # Try Python 3
    if (Test-Command "python") {
        Write-Host "[INFO] Usando Python para servir arquivos..." -ForegroundColor Green
        Open-Browser
        & python -m http.server 3000
        return
    }
    
    # Try Python 2
    if (Test-Command "python2") {
        Write-Host "[INFO] Usando Python 2 para servir arquivos..." -ForegroundColor Green
        Open-Browser
        & python2 -m SimpleHTTPServer 3000
        return
    }
    
    # No server available
    Write-Host "[ERRO] Nenhum servidor HTTP disponível!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Opções:" -ForegroundColor Yellow
    Write-Host "1. Instale Node.js de https://nodejs.org"
    Write-Host "2. Instale Python de https://python.org"
    Write-Host "3. Use um servidor HTTP de sua preferência na porta 3000"
    Write-Host ""
}

# Start the server
Start-Server

# Keep window open
Write-Host ""
Write-Host "Pressione qualquer tecla para sair..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")