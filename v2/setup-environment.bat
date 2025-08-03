@echo off
REM Setup Environment Variables for KC V2
REM This script configures environment to handle paths with spaces

echo ========================================
echo  CONFIGURANDO AMBIENTE PARA KC V2
echo ========================================
echo.

REM Detectar arquitetura do sistema
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    set "ARCH=64-bit"
    set "PROG_FILES_DEFAULT=%ProgramFiles%"
    set "PROG_FILES_X86=%ProgramFiles(x86)%"
) else (
    set "ARCH=32-bit"
    set "PROG_FILES_DEFAULT=%ProgramFiles%"
    set "PROG_FILES_X86=%ProgramFiles%"
)

echo [INFO] Sistema detectado: %ARCH%
echo.

REM Verificar Node.js em caminhos comuns
set "NODE_FOUND=false"

REM Caminho 1: Program Files
if exist "%PROG_FILES_DEFAULT%\nodejs\node.exe" (
    set "NODE_PATH=%PROG_FILES_DEFAULT%\nodejs"
    set "NODE_FOUND=true"
    echo [OK] Node.js encontrado em: Program Files
)

REM Caminho 2: Program Files (x86)
if "%NODE_FOUND%"=="false" if exist "%PROG_FILES_X86%\nodejs\node.exe" (
    set "NODE_PATH=%PROG_FILES_X86%\nodejs"
    set "NODE_FOUND=true"
    echo [OK] Node.js encontrado em: Program Files (x86^)
)

REM Caminho 3: AppData Local
if "%NODE_FOUND%"=="false" if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
    set "NODE_PATH=%LOCALAPPDATA%\Programs\nodejs"
    set "NODE_FOUND=true"
    echo [OK] Node.js encontrado em: AppData\Local
)

REM Caminho 4: Chocolatey
if "%NODE_FOUND%"=="false" if exist "%ChocolateyInstall%\bin\node.exe" (
    set "NODE_PATH=%ChocolateyInstall%\bin"
    set "NODE_FOUND=true"
    echo [OK] Node.js encontrado em: Chocolatey
)

REM Caminho 5: Scoop
if "%NODE_FOUND%"=="false" if exist "%USERPROFILE%\scoop\apps\nodejs\current\node.exe" (
    set "NODE_PATH=%USERPROFILE%\scoop\apps\nodejs\current"
    set "NODE_FOUND=true"
    echo [OK] Node.js encontrado em: Scoop
)

echo.

if "%NODE_FOUND%"=="true" (
    echo [INFO] Configurando variáveis de ambiente...
    echo.
    
    REM Adicionar ao PATH temporariamente
    set "PATH=%NODE_PATH%;%PATH%"
    
    REM Mostrar versão
    echo [INFO] Versão do Node.js:
    "%NODE_PATH%\node.exe" --version
    echo.
    
    echo [INFO] Versão do NPM:
    "%NODE_PATH%\npm.cmd" --version
    echo.
    
    echo.
    echo [SUCESSO] Ambiente configurado!
    echo.
    echo Para tornar permanente, adicione ao PATH do sistema:
    echo %NODE_PATH%
    echo.
    
    REM Criar atalho para iniciar com ambiente configurado
    echo @echo off > "Start-KC-V2-With-Node.bat"
    echo set "PATH=%NODE_PATH%;%%PATH%%" >> "Start-KC-V2-With-Node.bat"
    echo call START_KC_V2.bat >> "Start-KC-V2-With-Node.bat"
    
    echo [INFO] Criado atalho: Start-KC-V2-With-Node.bat
) else (
    echo [ERRO] Node.js não foi encontrado!
    echo.
    echo Locais verificados:
    echo - %PROG_FILES_DEFAULT%\nodejs
    echo - %PROG_FILES_X86%\nodejs
    echo - %LOCALAPPDATA%\Programs\nodejs
    echo - %ChocolateyInstall%\bin (se Chocolatey instalado^)
    echo - %USERPROFILE%\scoop\apps\nodejs\current (se Scoop instalado^)
    echo.
    echo Por favor, instale Node.js de: https://nodejs.org
    echo.
    echo Ou, se já instalado, adicione manualmente ao PATH:
    echo 1. Win + X ^> Sistema ^> Configurações avançadas
    echo 2. Variáveis de Ambiente ^> PATH ^> Editar
    echo 3. Adicionar o caminho da instalação do Node.js
)

echo.
pause