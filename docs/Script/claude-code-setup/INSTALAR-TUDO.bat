@echo off
echo ================================================================
echo        CONFIGURACAO DEFINITIVA - CLAUDE CODE + VSCODE
echo                     MCPs PERSISTENTES
echo ================================================================
echo.

REM Verificar privilégios de administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ⚠️  ATENCAO: Este script precisa ser executado como ADMINISTRADOR!
    echo.
    echo Reiniciando como administrador...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo ✅ Executando como Administrador
echo.

REM Executar script principal
echo 🚀 ETAPA 1: Configuracao base do Claude Code...
echo.
powershell -ExecutionPolicy Bypass -File ".\SETUP-CLAUDE-CODE-VSCODE.ps1"

echo.
echo 🎨 ETAPA 2: Instalando MCPs especificos (Magic UI + Graphiti)...
echo.
powershell -ExecutionPolicy Bypass -File ".\INSTALL-SPECIFIC-MCPS.ps1"

echo.
echo ================================================================
echo.
echo ✅ CONFIGURACAO COMPLETA!
echo.
echo PROXIMO PASSO: Execute 'claude login' no terminal
echo.
pause