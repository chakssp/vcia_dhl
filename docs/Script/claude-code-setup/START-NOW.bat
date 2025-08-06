@echo off
cls
echo.
echo  ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗
echo ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝
echo ██║     ██║     ███████║██║   ██║██║  ██║█████╗  
echo ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝  
echo ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗
echo  ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
echo.
echo        ██████╗ ██████╗ ██████╗ ███████╗
echo       ██╔════╝██╔═══██╗██╔══██╗██╔════╝
echo       ██║     ██║   ██║██║  ██║█████╗  
echo       ██║     ██║   ██║██║  ██║██╔══╝  
echo       ╚██████╗╚██████╔╝██████╔╝███████╗
echo        ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo        🚀 PRODUTIVIDADE MÁXIMA NO VSCODE
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM Verificar se Claude está instalado
where claude >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Claude Code não instalado!
    echo.
    echo Instalando agora...
    npm install -g @anthropic-ai/claude-code@latest
    echo.
)

REM Navegar para o projeto
cd /d "F:\vcia-1307\vcia_dhl"

echo 📂 Projeto: %CD%
echo.
echo 🔧 Comandos disponíveis:
echo    /mcp          - Ver MCPs instalados
echo    /memory       - Usar memória persistente  
echo    /todo         - Gerenciar tarefas
echo    @arquivo      - Mencionar arquivos
echo    #texto        - Salvar na memória
echo.
echo 💡 Dica: Use Tab para autocompletar arquivos!
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM Abrir VSCode
echo Abrindo VSCode...
start code .

REM Aguardar um pouco
timeout /t 3 /nobreak > nul

REM Iniciar Claude Code
echo.
echo 🚀 Iniciando Claude Code...
echo.
claude --continue

REM Se falhar, tentar sem continue
if %errorlevel% neq 0 (
    claude
)