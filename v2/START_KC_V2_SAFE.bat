@echo off
setlocal EnableDelayedExpansion

echo ========================================
echo    KNOWLEDGE CONSOLIDATOR V2 STARTUP    
echo ========================================
echo.

REM Detectar se Node.js está instalado e obter caminho correto
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Node.js não encontrado no PATH!
    echo.
    
    REM Tentar caminhos comuns do Node.js
    if exist "%ProgramFiles%\nodejs\node.exe" (
        set "NODE_PATH=%ProgramFiles%\nodejs"
        echo [INFO] Node.js encontrado em: !NODE_PATH!
        set "PATH=!NODE_PATH!;!PATH!"
    ) else if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
        set "NODE_PATH=%ProgramFiles(x86)%\nodejs"
        echo [INFO] Node.js encontrado em: !NODE_PATH!
        set "PATH=!NODE_PATH!;!PATH!"
    ) else if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
        set "NODE_PATH=%LOCALAPPDATA%\Programs\nodejs"
        echo [INFO] Node.js encontrado em: !NODE_PATH!
        set "PATH=!NODE_PATH!;!PATH!"
    ) else (
        echo [ERRO] Node.js não foi encontrado nos locais padrões.
        echo Por favor, instale Node.js ou adicione ao PATH.
        echo.
        echo Tentando usar Python como alternativa...
        goto :USE_PYTHON
    )
)

REM Verificar versão do Node
echo [INFO] Verificando versão do Node.js...
node --version
echo.

REM Check if integration is needed
if not exist ".\js\components\CommandPalette.js" (
    echo [INFO] Primeira execução detectada. Executando integração...
    echo.
    if exist ".\integrate_agents.bat" (
        call integrate_agents.bat
        echo.
        echo [INFO] Integração concluída!
    )
    echo.
)

REM Check if node_modules exists
if not exist ".\node_modules" (
    echo [INFO] Instalando dependências...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [WARN] Falha ao instalar dependências. Continuando sem live-reload...
        goto :SIMPLE_SERVER
    )
    echo.
)

REM Tentar iniciar com live-server
if exist ".\node_modules\live-server" (
    echo [INFO] Iniciando KC V2 com live reload...
    echo.
    echo ====================================
    echo    KC V2 está iniciando...
    echo    Abrindo no navegador: http://localhost:3000
    echo    Live reload ativado
    echo    Pressione Ctrl+C para parar
    echo ====================================
    echo.
    
    REM Abrir navegador
    start "" "http://localhost:3000"
    
    REM Iniciar servidor
    call npm run dev
    goto :END
)

:SIMPLE_SERVER
echo [INFO] Iniciando servidor HTTP simples...
echo.

REM Tentar com npx http-server
where npx >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Usando npx http-server...
    start "" "http://localhost:3000"
    npx http-server -p 3000 --cors -c-1
    goto :END
)

:USE_PYTHON
REM Tentar Python 3
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Usando Python para servir arquivos...
    start "" "http://localhost:3000"
    python -m http.server 3000
    goto :END
)

REM Tentar Python 2
where python2 >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [INFO] Usando Python 2 para servir arquivos...
    start "" "http://localhost:3000"
    python2 -m SimpleHTTPServer 3000
    goto :END
)

REM Se nada funcionou
echo [ERRO] Nenhum servidor HTTP disponível!
echo.
echo Opções:
echo 1. Instale Node.js de https://nodejs.org
echo 2. Instale Python de https://python.org
echo 3. Use um servidor HTTP de sua preferência na porta 3000
echo.

:END
pause
endlocal