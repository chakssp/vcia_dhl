@echo off
cls
echo.
echo  ██╗   ██╗ ██████╗██╗ █████╗ 
echo  ██║   ██║██╔════╝██║██╔══██╗
echo  ██║   ██║██║     ██║███████║
echo  ╚██╗ ██╔╝██║     ██║██╔══██║
echo   ╚████╔╝ ╚██████╗██║██║  ██║
echo    ╚═══╝   ╚═════╝╚═╝╚═╝  ╚═╝
echo.
echo  🚀 PRODUTIVIDADE MÁXIMA - AGORA!
echo ════════════════════════════════════
echo.

REM Detectar o que precisa fazer
echo 🔍 Analisando situação...
echo.

REM Verificar se Claude está instalado
where claude >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Claude Code não instalado!
    echo.
    echo 📦 Instalando agora (2 minutos)...
    npm install -g @anthropic-ai/claude-code@latest
    echo.
    echo ✅ Instalado! Fazendo login...
    claude login
) else (
    echo ✅ Claude Code já instalado
)

echo.
echo 🎯 O QUE VOCÊ QUER FAZER AGORA?
echo.
echo 1. 🏗️  Trabalhar no CORE (vcia_dhl)
echo 2. 📝 Gerar CONTEÚDO do site (URGENTE!)
echo 3. 🚀 Abrir AMBOS projetos
echo 4. 💡 Ver status e próximos passos
echo.

set /p choice="Escolha (1-4): "

if "%choice%"=="1" goto CORE
if "%choice%"=="2" goto CONTENT
if "%choice%"=="3" goto BOTH
if "%choice%"=="4" goto STATUS

:CORE
echo.
echo 🏗️ Abrindo projeto CORE...
cd /d "F:\vcia-1307\vcia_dhl"
start code .
timeout /t 2 > nul
echo.
echo 💡 COMANDOS ÚTEIS:
echo    @CLAUDE.md         - Ver documentação
echo    @RESUME-STATUS.md  - Status atual
echo    /memory            - Contexto salvo
echo.
claude --continue
goto END

:CONTENT
echo.
echo 📝 MODO GERAÇÃO DE CONTEÚDO!
cd /d "F:\vcia-1307\vcia_site"
start code .
timeout /t 2 > nul
echo.
echo 🚀 INICIANDO CLAUDE COM FOCO EM CONTEÚDO...
echo.
echo Cole este comando no Claude:
echo ────────────────────────────────────────
echo.
echo @CONTENT-GENERATION-PROMPT.md
echo Use o filesystem MCP para analisar o core em F:\vcia-1307\vcia_dhl
echo e gere conteúdo completo para o site começando pela home page.
echo Foque em: hero section, features principais e CTAs.
echo.
echo ────────────────────────────────────────
echo.
claude
goto END

:BOTH
echo.
echo 🚀 Abrindo AMBIENTE COMPLETO...
cd /d "F:\vcia-1307"
start code vcia_dhl
start code vcia_site
timeout /t 3 > nul
echo.
echo 💡 WORKFLOW SUGERIDO:
echo 1. Analise features no vcia_dhl
echo 2. Gere conteúdo para vcia_site
echo 3. Use /vcia-status para sincronizar
echo.
claude
goto END

:STATUS
echo.
echo 📊 Abrindo Claude para análise completa...
cd /d "F:\vcia-1307"
claude
echo.
echo Execute estes comandos no Claude:
echo    /vcia-status       - Status geral
echo    /memory search     - Contexto salvo
echo    @WORKFLOW.md       - Fluxo de trabalho
goto END

:END
echo.
echo ════════════════════════════════════
echo 🎯 LEMBRE-SE: Site precisa de conteúdo URGENTE!
echo ════════════════════════════════════
echo.