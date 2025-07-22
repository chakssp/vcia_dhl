# ACELERADOR DE CONTEÚDO - VCIA SITE
Write-Host "🚀 ACELERADOR DE CONTEÚDO VCIA" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "Objetivo: Gerar conteúdo do site baseado no core DHL" -ForegroundColor White
Write-Host ""

# 1. ANÁLISE DO CORE
Write-Host "📊 Analisando core do negócio (vcia_dhl)..." -ForegroundColor Cyan

$dhlPath = "F:\vcia-1307\vcia_dhl"
$sitePath = "F:\vcia-1307\vcia_site"

# Buscar arquivos importantes do core
$coreFiles = @(
    "README.md",
    "CLAUDE.md", 
    "package.json",
    "docs\*.md"
)

$foundFeatures = @()
$foundDocs = Get-ChildItem $dhlPath -Recurse -Include $coreFiles -File -ErrorAction SilentlyContinue

Write-Host "✅ Encontrados $($foundDocs.Count) documentos no core" -ForegroundColor Green

# 2. TEMPLATE DE CONTEÚDO
Write-Host "`n📝 Criando templates de conteúdo..." -ForegroundColor Cyan

$contentTemplates = @{
    "home" = @{
        "hero" = @"
# VCIA - [Título Principal baseado no Core]

## [Subtítulo extraído do onboarding]

[CTA Principal] [CTA Secundário]

### Por que VCIA?
- [Benefício 1 do core]
- [Benefício 2 do core]
- [Benefício 3 do core]
"@
        "features" = @"
## Funcionalidades Principais

### [Feature 1 do Core]
[Descrição baseada no vcia_dhl]

### [Feature 2 do Core]
[Descrição baseada no vcia_dhl]

### [Feature 3 do Core]
[Descrição baseada no vcia_dhl]
"@
    }
    "about" = @"
# Sobre a VCIA

## Nossa Missão
[Extrair do conceito de onboarding]

## Nossa Visão
[Baseada na arquitetura do core]

## Nossos Valores
- Inovação
- Transparência
- Resultados
"@
    "services" = @"
# Nossos Serviços

## Onboarding Inteligente
[Descrever baseado no vcia_dhl]

## Análise de Dados
[Features do core]

## Automação de Processos
[Capacidades do sistema]
"@
}

# 3. GERAR ESTRUTURA DE CONTEÚDO
Write-Host "`n🏗️ Gerando estrutura de conteúdo..." -ForegroundColor Cyan

$contentDir = Join-Path $sitePath "content"
New-Item -ItemType Directory -Force -Path $contentDir | Out-Null
New-Item -ItemType Directory -Force -Path "$contentDir\pt-br" | Out-Null
New-Item -ItemType Directory -Force -Path "$contentDir\en" | Out-Null

# 4. CRIAR PROMPT PARA CLAUDE
$contentPrompt = @"
# GERAÇÃO DE CONTEÚDO - VCIA SITE

## Contexto
Baseado no projeto core em F:\vcia-1307\vcia_dhl, preciso gerar conteúdo para o site.

## Análise do Core
Use o filesystem MCP para ler:
- @F:\vcia-1307\vcia_dhl\README.md
- @F:\vcia-1307\vcia_dhl\CLAUDE.md
- @F:\vcia-1307\vcia_dhl\docs\*

## Tarefas de Conteúdo

### 1. Landing Page
- Hero section com value proposition
- Features principais (3-5)
- Benefícios do onboarding
- Call-to-actions

### 2. Página Sobre
- História/conceito da VCIA
- Missão baseada no core
- Diferenciais técnicos

### 3. Serviços/Produtos
- Detalhamento do onboarding
- Features técnicas
- Casos de uso

### 4. Demonstração
- Screenshots/mockups baseados no core
- Fluxo do usuário
- Resultados esperados

## Requisitos
- Conteúdo em PT-BR e EN
- Tom profissional mas acessível
- Foco em resultados/benefícios
- SEO otimizado

## Output
Gerar arquivos Markdown em:
- F:\vcia-1307\vcia_site\content\pt-br\
- F:\vcia-1307\vcia_site\content\en\
"@

$contentPrompt | Out-File -FilePath "$sitePath\CONTENT-GENERATION-PROMPT.md" -Encoding UTF8

# 5. CRIAR SCRIPT DE AUTOMAÇÃO
$automationScript = @'
# AUTOMAÇÃO DE CONTEÚDO VCIA
param(
    [string]$Section = "all",
    [string]$Language = "pt-br"
)

Write-Host "🤖 Gerando conteúdo: $Section em $Language" -ForegroundColor Cyan

# Seções disponíveis
$sections = @{
    "home" = @("hero", "features", "benefits", "cta")
    "about" = @("mission", "vision", "values", "team")
    "services" = @("onboarding", "analysis", "automation")
    "demo" = @("overview", "screenshots", "results")
    "contact" = @("form", "info", "support")
}

# Gerar conteúdo
if ($Section -eq "all") {
    foreach ($sec in $sections.Keys) {
        Write-Host "Gerando seção: $sec" -ForegroundColor Yellow
        # Aqui o Claude geraria o conteúdo
    }
} else {
    Write-Host "Gerando seção específica: $Section" -ForegroundColor Yellow
}

Write-Host "✅ Conteúdo gerado em: content\$Language\" -ForegroundColor Green
'@

$automationScript | Out-File -FilePath "$sitePath\generate-content.ps1" -Encoding UTF8

# 6. CHECKLIST DE CONTEÚDO
$contentChecklist = @"
# CHECKLIST DE CONTEÚDO - VCIA SITE

## 🏠 Home Page
- [ ] Hero Section
  - [ ] Título principal
  - [ ] Subtítulo
  - [ ] CTAs (2)
  - [ ] Imagem/Video hero
- [ ] Features (3-5)
  - [ ] Ícones
  - [ ] Títulos
  - [ ] Descrições
- [ ] Benefícios
  - [ ] Para empresas
  - [ ] Para usuários
- [ ] Social Proof
  - [ ] Testimonials
  - [ ] Logos clientes
  - [ ] Números/métricas

## 📄 Páginas Internas
- [ ] Sobre
  - [ ] História
  - [ ] Missão/Visão
  - [ ] Equipe
- [ ] Serviços
  - [ ] Onboarding detalhado
  - [ ] Features técnicas
  - [ ] Preços/Planos
- [ ] Demo
  - [ ] Video/GIF
  - [ ] Screenshots
  - [ ] Tour guiado
- [ ] Blog/Resources
  - [ ] Artigos técnicos
  - [ ] Casos de uso
  - [ ] Documentação

## 🌍 Internacionalização
- [ ] PT-BR (completo)
- [ ] EN (completo)
- [ ] Selector de idioma
- [ ] URLs localizadas

## 📱 Responsividade
- [ ] Desktop (1920px)
- [ ] Laptop (1366px)
- [ ] Tablet (768px)
- [ ] Mobile (375px)

## 🔍 SEO
- [ ] Meta titles
- [ ] Meta descriptions
- [ ] Open Graph
- [ ] Schema.org
- [ ] Sitemap
- [ ] Robots.txt

## 🚀 Performance
- [ ] Imagens otimizadas
- [ ] Lazy loading
- [ ] Minificação
- [ ] CDN configurado

## 📊 Analytics
- [ ] Google Analytics
- [ ] Hotjar/Clarity
- [ ] Conversion tracking
- [ ] A/B testing setup

## ✅ QA Final
- [ ] Links funcionando
- [ ] Forms testados
- [ ] Cross-browser
- [ ] Acessibilidade
- [ ] Loading speed < 3s
"@

$contentChecklist | Out-File -FilePath "$sitePath\CONTENT-CHECKLIST.md" -Encoding UTF8

# 7. RESUMO
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✅ ACELERADOR DE CONTEÚDO CONFIGURADO!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green

Write-Host "`n📁 ARQUIVOS CRIADOS NO SITE:" -ForegroundColor Yellow
Write-Host "$sitePath\" -ForegroundColor White
Write-Host "├── CONTENT-GENERATION-PROMPT.md  # Prompt para Claude" -ForegroundColor Gray
Write-Host "├── CONTENT-CHECKLIST.md         # Checklist completo" -ForegroundColor Gray
Write-Host "├── generate-content.ps1         # Script automação" -ForegroundColor Gray
Write-Host "└── content\                     # Diretório de conteúdo" -ForegroundColor Gray
Write-Host "    ├── pt-br\                   # Conteúdo PT-BR" -ForegroundColor Gray
Write-Host "    └── en\                      # Conteúdo EN" -ForegroundColor Gray

Write-Host "`n🚀 COMEÇAR A GERAR CONTEÚDO:" -ForegroundColor Cyan

Write-Host "`n1. Abra o Claude Code no projeto site:" -ForegroundColor White
Write-Host "   vcia-site.bat" -ForegroundColor Gray

Write-Host "`n2. Use o prompt pronto:" -ForegroundColor White
Write-Host "   @CONTENT-GENERATION-PROMPT.md" -ForegroundColor Gray

Write-Host "`n3. Ou use o comando customizado:" -ForegroundColor White
Write-Host "   /generate-content home" -ForegroundColor Gray

Write-Host "`n4. Acompanhe o progresso:" -ForegroundColor White
Write-Host "   @CONTENT-CHECKLIST.md" -ForegroundColor Gray

Write-Host "`n💡 DICA IMPORTANTE:" -ForegroundColor Yellow
Write-Host "O Claude vai analisar o core (vcia_dhl) e gerar" -ForegroundColor White
Write-Host "conteúdo ALINHADO com as features do onboarding!" -ForegroundColor White

pause