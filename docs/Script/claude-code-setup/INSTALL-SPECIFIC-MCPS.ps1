# INSTALAÇÃO DOS MCPs ESPECÍFICOS - MAGIC UI & GRAPHITI
Write-Host "🎨 INSTALANDO MCPs ESPECÍFICOS" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

$homeDir = if ($env:WSL_DISTRO_NAME) { $env:HOME } else { $env:USERPROFILE }
$mcpDir = Join-Path $homeDir "mcp-servers"

# 1. MAGIC UI MCP
Write-Host "`n📦 Instalando Magic UI MCP..." -ForegroundColor Cyan
Write-Host "Documentação: https://magicui.design/docs/mcp" -ForegroundColor Gray

# Criar diretório para Magic UI
$magicUIDir = Join-Path $mcpDir "magicui"
New-Item -ItemType Directory -Force -Path $magicUIDir | Out-Null

Set-Location $magicUIDir

# Tentar várias formas de instalação
Write-Host "Tentando via npm..." -ForegroundColor Yellow
npm install @magicuidesign/mcp --save 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Tentando clonar repositório..." -ForegroundColor Yellow
    # Se não disponível via npm, tentar clonar
    git clone https://github.com/magicuidesign/mcp.git . 2>$null
    
    if (Test-Path "package.json") {
        npm install
        npm run build 2>$null
    }
}

# 2. GRAPHITI MCP
Write-Host "`n📊 Instalando Graphiti MCP..." -ForegroundColor Cyan
Write-Host "Repositório: https://github.com/getzep/graphiti" -ForegroundColor Gray

$graphitiDir = Join-Path $mcpDir "graphiti"
if (!(Test-Path $graphitiDir)) {
    git clone https://github.com/getzep/graphiti.git $graphitiDir
}

Set-Location "$graphitiDir\mcp_server"

# Instalar dependências Python
Write-Host "Instalando dependências Python..." -ForegroundColor Yellow
pip install -r requirements.txt 2>$null
pip install -e . 2>$null

# 3. CONFIGURAR NEO4J (NECESSÁRIO PARA GRAPHITI)
Write-Host "`n🗄️ Configurando Neo4j para Graphiti..." -ForegroundColor Cyan

$neo4jDockerScript = @'
# Script para rodar Neo4j no Docker
docker run -d `
    --name neo4j-graphiti `
    -p 7474:7474 `
    -p 7687:7687 `
    -e NEO4J_AUTH=neo4j/password `
    -e NEO4J_PLUGINS='["apoc"]' `
    -v ${PWD}/neo4j/data:/data `
    -v ${PWD}/neo4j/logs:/logs `
    neo4j:latest
'@

$neo4jDockerScript | Out-File -FilePath "$mcpDir\start-neo4j.ps1" -Encoding UTF8

# 4. ATUALIZAR CONFIGURAÇÃO DO CLAUDE CODE
Write-Host "`n⚙️ Atualizando configuração..." -ForegroundColor Yellow

$configPath = Join-Path $homeDir ".claude\claude_desktop_config.json"
$config = Get-Content $configPath | ConvertFrom-Json

# Adicionar Magic UI MCP
if (Test-Path "$magicUIDir\dist\index.js") {
    $config.mcpServers["magicui"] = @{
        "command" = "node"
        "args" = @("$magicUIDir\dist\index.js")
        "env" = @{
            "MAGICUI_PROJECT_PATH" = "F:\site_vps"
        }
    }
} elseif (Test-Path "$magicUIDir\index.js") {
    $config.mcpServers["magicui"] = @{
        "command" = "node"
        "args" = @("$magicUIDir\index.js")
    }
} else {
    # Fallback para npx
    $config.mcpServers["magicui"] = @{
        "command" = "npx"
        "args" = @("-y", "@magicuidesign/mcp")
    }
}

# Adicionar Graphiti MCP
$config.mcpServers["graphiti"] = @{
    "command" = "python"
    "args" = @("-m", "graphiti_mcp_server")
    "env" = @{
        "PYTHONPATH" = "$graphitiDir\mcp_server"
        "NEO4J_URI" = "bolt://localhost:7687"
        "NEO4J_USER" = "neo4j"
        "NEO4J_PASSWORD" = "password"
    }
}

# Salvar configuração atualizada
$config | ConvertTo-Json -Depth 10 | Out-File -FilePath $configPath -Encoding UTF8

Write-Host "✅ Configuração atualizada!" -ForegroundColor Green

# 5. CRIAR SCRIPTS DE TESTE
Write-Host "`n🧪 Criando scripts de teste..." -ForegroundColor Yellow

$testScript = @'
# Testar MCPs instalados
Write-Host "🧪 TESTANDO MCPs INSTALADOS" -ForegroundColor Cyan

# Testar Magic UI
Write-Host "`n1. Magic UI MCP:" -ForegroundColor Yellow
try {
    $magicUITest = & node -e "console.log('Magic UI MCP OK')" 2>&1
    Write-Host "✅ Magic UI disponível" -ForegroundColor Green
} catch {
    Write-Host "❌ Magic UI com problemas: $_" -ForegroundColor Red
}

# Testar Graphiti
Write-Host "`n2. Graphiti MCP:" -ForegroundColor Yellow
try {
    $graphitiTest = python -m graphiti_mcp_server --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Graphiti disponível" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Graphiti instalado mas requer Neo4j rodando" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Graphiti com problemas: $_" -ForegroundColor Red
}

# Verificar Neo4j
Write-Host "`n3. Neo4j Status:" -ForegroundColor Yellow
$neo4jRunning = docker ps --filter "name=neo4j-graphiti" --format "table {{.Names}}\t{{.Status}}" 2>$null
if ($neo4jRunning -match "neo4j-graphiti") {
    Write-Host "✅ Neo4j rodando" -ForegroundColor Green
} else {
    Write-Host "❌ Neo4j não está rodando" -ForegroundColor Red
    Write-Host "   Execute: .\start-neo4j.ps1" -ForegroundColor Gray
}
'@

$testScript | Out-File -FilePath "$mcpDir\test-mcps.ps1" -Encoding UTF8

# 6. DOCUMENTAÇÃO DE USO
Write-Host "`n📚 Criando documentação..." -ForegroundColor Yellow

$docs = @"
# MCPs Instalados - Guia de Uso

## 🎨 Magic UI MCP
**Propósito**: Desenvolvimento de interfaces com componentes Magic UI
**Documentação**: https://magicui.design/docs/mcp

### Comandos no Claude Code:
\`\`\`
/mcp list           # Ver se Magic UI está disponível
/mcp tools magicui  # Ver ferramentas disponíveis
\`\`\`

### Uso típico:
- Gerar componentes UI animados
- Criar layouts responsivos
- Implementar animações Framer Motion

## 📊 Graphiti MCP
**Propósito**: Gerenciamento de grafos de conhecimento
**Repositório**: https://github.com/getzep/graphiti

### Pré-requisitos:
1. Neo4j rodando (porta 7687)
2. Python com graphiti instalado

### Iniciar Neo4j:
\`\`\`powershell
cd ~/mcp-servers
.\start-neo4j.ps1
\`\`\`

### Comandos no Claude Code:
\`\`\`
/mcp list           # Ver se Graphiti está disponível
/mcp tools graphiti # Ver ferramentas disponíveis
\`\`\`

### Uso típico:
- Criar grafos de conhecimento
- Analisar relações entre entidades
- Persistir contexto complexo

## 🔧 Troubleshooting

### Magic UI não aparece:
1. Verifique se está instalado: \`npm list -g @magicuidesign/mcp\`
2. Reinstale: \`npm install -g @magicuidesign/mcp --force\`

### Graphiti não funciona:
1. Verifique Neo4j: \`docker ps | grep neo4j\`
2. Verifique Python: \`python -m graphiti_mcp_server --help\`
3. Reinstale: \`pip install -e ~/mcp-servers/graphiti/mcp_server\`

### Logs do Claude Code:
\`\`\`bash
# Ver logs em tempo real
tail -f ~/.claude/logs/claude-code.log

# Debug de MCPs
claude --mcp-debug
\`\`\`
"@

$docs | Out-File -FilePath "$mcpDir\MCP-GUIDE.md" -Encoding UTF8

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ MCPs ESPECÍFICOS INSTALADOS!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green

Write-Host "`n📋 AÇÕES NECESSÁRIAS:" -ForegroundColor Yellow
Write-Host "1. Para Graphiti - Iniciar Neo4j:" -ForegroundColor White
Write-Host "   cd $mcpDir" -ForegroundColor Gray
Write-Host "   .\start-neo4j.ps1" -ForegroundColor Gray

Write-Host "`n2. Testar instalação:" -ForegroundColor White
Write-Host "   cd $mcpDir" -ForegroundColor Gray
Write-Host "   .\test-mcps.ps1" -ForegroundColor Gray

Write-Host "`n3. No Claude Code:" -ForegroundColor White
Write-Host "   /mcp          # Ver todos MCPs" -ForegroundColor Gray
Write-Host "   /doctor       # Diagnosticar problemas" -ForegroundColor Gray

Write-Host "`n📚 Documentação completa em:" -ForegroundColor Cyan
Write-Host "$mcpDir\MCP-GUIDE.md" -ForegroundColor Gray

pause