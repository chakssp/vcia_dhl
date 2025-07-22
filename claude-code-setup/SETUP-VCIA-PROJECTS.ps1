# CONFIGURAÇÃO MULTI-PROJETO - VCIA
# Gerencia vcia_dhl (core) e vcia_site (conteúdo)

Write-Host "🚀 CONFIGURANDO AMBIENTE MULTI-PROJETO VCIA" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

$homeDir = if ($env:WSL_DISTRO_NAME) { $env:HOME } else { $env:USERPROFILE }
$vciaRoot = "F:\vcia-1307"

# 1. CRIAR ESTRUTURA DE COMANDOS CUSTOMIZADOS
Write-Host "`n📁 Criando comandos customizados para produtividade..." -ForegroundColor Yellow

$claudeCommands = Join-Path $homeDir ".claude\commands"
New-Item -ItemType Directory -Force -Path $claudeCommands | Out-Null

# Comando: Alternar entre projetos
$switchProject = @'
## Usage
`@switch-project.md <PROJECT_NAME>`

## Projects
- **dhl** - Core do negócio/Onboarding (F:\vcia-1307\vcia_dhl)
- **site** - Template do site (F:\vcia-1307\vcia_site)

## Context
Switching to: $ARGUMENTS

## Action
Based on the project name, I will:
1. Change context to the appropriate directory
2. Load project-specific configurations
3. Summarize current status
4. Suggest next actions based on project priorities
'@

$switchProject | Out-File -FilePath "$claudeCommands\switch-project.md" -Encoding UTF8

# Comando: Status geral VCIA
$vciaStatus = @'
## Usage
`@vcia-status.md`

## Action
I will analyze both projects and provide:
1. **vcia_dhl** - Core development progress
2. **vcia_site** - Content creation status
3. **Dependencies** - What dhl features impact site content
4. **Priorities** - What needs immediate attention
5. **Next Actions** - Concrete steps for both projects
'@

$vciaStatus | Out-File -FilePath "$claudeCommands\vcia-status.md" -Encoding UTF8

# Comando: Gerar conteúdo do site baseado no core
$generateContent = @'
## Usage
`@generate-content.md <SECTION>`

## Context
Generate website content based on vcia_dhl core features for section: $ARGUMENTS

## Process
1. Analyze core features in vcia_dhl
2. Extract key value propositions
3. Generate compelling content for vcia_site
4. Ensure alignment with onboarding process
5. Create both PT-BR and EN versions

## Sections Available
- home - Landing page hero and main CTAs
- features - Core features from onboarding
- benefits - Business value propositions
- demo - Interactive demo content
- pricing - Plans based on core modules
- about - Company story and mission
'@

$generateContent | Out-File -FilePath "$claudeCommands\generate-content.md" -Encoding UTF8

# 2. CRIAR CONFIGURAÇÃO ESPECÍFICA PARA AMBOS PROJETOS
Write-Host "`n⚙️ Configurando Claude Code para multi-projeto..." -ForegroundColor Yellow

$multiProjectConfig = @{
    "mcpServers" = @{
        # Filesystem com acesso a AMBOS projetos
        "filesystem" = @{
            "command" = "node"
            "args" = @(
                "$homeDir/mcp-servers/servers/src/filesystem/dist/index.js",
                $vciaRoot,              # Raiz com acesso total
                "$vciaRoot/vcia_dhl",   # Core/Onboarding
                "$vciaRoot/vcia_site"   # Site/Template
            )
        }
        "memory" = @{
            "command" = "npx"
            "args" = @("-y", "@modelcontextprotocol/server-memory")
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
        "n8n-mcp" = @{
            "command" = "docker"
            "args" = @(
                "run", "-i", "--rm", "--network=host",
                "--add-host=n8n.vcia.com.br:85.31.230.28",
                "-e", "MCP_MODE=stdio",
                "-e", "N8N_API_URL=https://n8n.vcia.com.br",
                "-e", "N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzZDY0Y2EwMy0zYTEzLTQ0YWMtYmM3OS01ZjhkYWUxN2E5MDgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzUxODEwNDU3LCJleHAiOjE3NTQzNjI4MDB9.9a-d0d-dzjXZSC7t14ZtCf9GZ56E0zxIQu4qz2FVvvA",
                "-e", "NODE_TLS_REJECT_UNAUTHORIZED=0",
                "ghcr.io/czlonkowski/n8n-mcp:latest"
            )
        }
    }
    # Hooks para produtividade
    "hooks" = @{
        "on_session_start" = @(
            @{
                "command" = "/vcia-status"
                "description" = "Mostra status de ambos projetos ao iniciar"
            }
        )
    }
}

$configPath = Join-Path $homeDir ".claude\claude_desktop_config.json"
$multiProjectConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath $configPath -Encoding UTF8

# 3. CRIAR LAUNCHERS ESPECÍFICOS
Write-Host "`n🚀 Criando launchers para cada projeto..." -ForegroundColor Yellow

# Launcher vcia_dhl (Core)
$launcherDHL = @"
@echo off
cls
echo ═══════════════════════════════════════════════
echo    🏗️  VCIA DHL - Core/Onboarding
echo ═══════════════════════════════════════════════
cd /d "F:\vcia-1307\vcia_dhl"
code .
timeout /t 2 > nul
claude --continue
"@

$launcherDHL | Out-File -FilePath "$homeDir\vcia-dhl.bat" -Encoding UTF8

# Launcher vcia_site (Site)
$launcherSite = @"
@echo off
cls
echo ═══════════════════════════════════════════════
echo    🌐 VCIA SITE - Template/Conteúdo
echo ═══════════════════════════════════════════════
cd /d "F:\vcia-1307\vcia_site"
code .
timeout /t 2 > nul
claude --continue
"@

$launcherSite | Out-File -FilePath "$homeDir\vcia-site.bat" -Encoding UTF8

# Launcher AMBOS projetos
$launcherBoth = @"
@echo off
cls
echo ═══════════════════════════════════════════════
echo    🚀 VCIA - AMBIENTE COMPLETO
echo ═══════════════════════════════════════════════
echo.
echo Abrindo AMBOS projetos no VSCode...
cd /d "F:\vcia-1307"
code vcia_dhl
code vcia_site
timeout /t 3 > nul
echo.
echo Iniciando Claude Code com acesso total...
claude
"@

$launcherBoth | Out-File -FilePath "$homeDir\vcia-both.bat" -Encoding UTF8

# 4. CRIAR WORKFLOW DE SINCRONIZAÇÃO
Write-Host "`n🔄 Criando workflow de sincronização..." -ForegroundColor Yellow

$syncWorkflow = @'
# WORKFLOW DE SINCRONIZAÇÃO VCIA

## 🎯 Objetivo
Manter vcia_dhl (core) e vcia_site (conteúdo) sincronizados

## 📋 Checklist Diário

### Manhã - Revisão
- [ ] /vcia-status - Ver status geral
- [ ] Verificar features novas no core (dhl)
- [ ] Identificar conteúdo pendente no site

### Desenvolvimento
- [ ] Trabalhar no core (vcia_dhl)
- [ ] Documentar features para o site
- [ ] /generate-content para criar conteúdo

### Final do Dia
- [ ] Commit em ambos projetos
- [ ] Backup em F:\vcia-1307
- [ ] /memory add "progresso do dia"

## 🔄 Fluxo de Trabalho

```mermaid
graph LR
    A[vcia_dhl Core] -->|Features| B[Documentação]
    B -->|/generate-content| C[vcia_site Content]
    C -->|Feedback| A
    
    D[Backups] -.->|F:\vcia-1307| A
    D -.->|F:\vcia-1307| C
```

## 💡 Comandos Úteis

### Para o Core (DHL)
```
cd F:\vcia-1307\vcia_dhl
@switch-project.md dhl
```

### Para o Site
```
cd F:\vcia-1307\vcia_site
@switch-project.md site
/generate-content home
```

### Status Geral
```
/vcia-status
/memory search "vcia progress"
```
'@

$syncWorkflow | Out-File -FilePath "$vciaRoot\WORKFLOW.md" -Encoding UTF8

# 5. SCRIPT DE PRODUTIVIDADE
Write-Host "`n💡 Criando script de produtividade..." -ForegroundColor Yellow

$productivityScript = @'
# VCIA PRODUCTIVITY BOOSTER
Write-Host "🚀 VCIA PRODUCTIVITY BOOSTER" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

# Análise rápida
Write-Host "`n📊 Analisando projetos..." -ForegroundColor Yellow

# vcia_dhl
$dhlFiles = Get-ChildItem "F:\vcia-1307\vcia_dhl" -Recurse -File | Where-Object { $_.Extension -in ".js", ".md", ".json" }
Write-Host "`n🏗️ VCIA DHL (Core):" -ForegroundColor Cyan
Write-Host "   Arquivos: $($dhlFiles.Count)" -ForegroundColor White
Write-Host "   Última modificação: $((Get-Item "F:\vcia-1307\vcia_dhl").LastWriteTime)" -ForegroundColor Gray

# vcia_site
$siteFiles = Get-ChildItem "F:\vcia-1307\vcia_site" -Recurse -File | Where-Object { $_.Extension -in ".html", ".js", ".css", ".md" }
Write-Host "`n🌐 VCIA SITE:" -ForegroundColor Cyan
Write-Host "   Arquivos: $($siteFiles.Count)" -ForegroundColor White
Write-Host "   Última modificação: $((Get-Item "F:\vcia-1307\vcia_site").LastWriteTime)" -ForegroundColor Gray

# Sugestões
Write-Host "`n💡 SUGESTÕES DE PRODUTIVIDADE:" -ForegroundColor Yellow

$now = Get-Date
$dhlLastWrite = (Get-Item "F:\vcia-1307\vcia_dhl").LastWriteTime
$siteLastWrite = (Get-Item "F:\vcia-1307\vcia_site").LastWriteTime

if ($siteLastWrite -lt $dhlLastWrite) {
    Write-Host "⚠️  Site está DESATUALIZADO em relação ao core!" -ForegroundColor Red
    Write-Host "   Recomendação: Use /generate-content para atualizar" -ForegroundColor Yellow
} else {
    Write-Host "✅ Site está sincronizado com o core" -ForegroundColor Green
}

# Menu rápido
Write-Host "`n🎯 AÇÕES RÁPIDAS:" -ForegroundColor Cyan
Write-Host "1. Trabalhar no Core (DHL)" -ForegroundColor White
Write-Host "2. Atualizar conteúdo do Site" -ForegroundColor White
Write-Host "3. Abrir AMBOS projetos" -ForegroundColor White
Write-Host "4. Ver status completo" -ForegroundColor White

$choice = Read-Host "`nEscolha (1-4)"

switch ($choice) {
    "1" { & "$env:USERPROFILE\vcia-dhl.bat" }
    "2" { & "$env:USERPROFILE\vcia-site.bat" }
    "3" { & "$env:USERPROFILE\vcia-both.bat" }
    "4" { 
        Write-Host "`nAbrindo Claude Code para análise completa..." -ForegroundColor Green
        claude
        Start-Sleep -Seconds 2
        Write-Host "Execute: /vcia-status" -ForegroundColor Yellow
    }
}
'@

$productivityScript | Out-File -FilePath "$vciaRoot\BOOST-PRODUCTIVITY.ps1" -Encoding UTF8

# 6. RESUMO E INSTRUÇÕES
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ CONFIGURAÇÃO MULTI-PROJETO COMPLETA!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green

Write-Host "`n📁 ESTRUTURA CRIADA:" -ForegroundColor Yellow
Write-Host "F:\vcia-1307\" -ForegroundColor White
Write-Host "├── WORKFLOW.md              # Fluxo de trabalho" -ForegroundColor Gray
Write-Host "├── BOOST-PRODUCTIVITY.ps1   # Script de produtividade" -ForegroundColor Gray
Write-Host "├── vcia_dhl\               # Core/Onboarding" -ForegroundColor Gray
Write-Host "└── vcia_site\              # Template/Conteúdo" -ForegroundColor Gray

Write-Host "`n🚀 LAUNCHERS CRIADOS:" -ForegroundColor Yellow
Write-Host "vcia-dhl.bat    # Abrir projeto Core" -ForegroundColor Gray
Write-Host "vcia-site.bat   # Abrir projeto Site" -ForegroundColor Gray
Write-Host "vcia-both.bat   # Abrir AMBOS projetos" -ForegroundColor Gray

Write-Host "`n📝 COMANDOS CUSTOMIZADOS:" -ForegroundColor Yellow
Write-Host "/vcia-status         # Status de ambos projetos" -ForegroundColor Gray
Write-Host "/switch-project      # Alternar entre projetos" -ForegroundColor Gray
Write-Host "/generate-content    # Gerar conteúdo do site" -ForegroundColor Gray

Write-Host "`n💡 COMEÇAR AGORA:" -ForegroundColor Cyan
Write-Host "1. Para máxima produtividade:" -ForegroundColor White
Write-Host "   cd F:\vcia-1307" -ForegroundColor Gray
Write-Host "   .\BOOST-PRODUCTIVITY.ps1" -ForegroundColor Gray

Write-Host "`n2. Para trabalhar em um projeto:" -ForegroundColor White
Write-Host "   vcia-dhl.bat    # Core" -ForegroundColor Gray
Write-Host "   vcia-site.bat   # Site" -ForegroundColor Gray

Write-Host "`n3. Para trabalhar em ambos:" -ForegroundColor White
Write-Host "   vcia-both.bat" -ForegroundColor Gray

pause