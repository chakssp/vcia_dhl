@echo off
REM ===========================================
REM Script de Backup Local - Knowledge Consolidator
REM ===========================================
REM Cria backup completo do projeto em pasta externa
REM Uso: Executar antes de mudanças grandes ou diariamente

setlocal EnableDelayedExpansion

REM Configurações
set PROJECT_DIR=F:\vcia-1307\vcia_dhl
set BACKUP_ROOT=F:\backups-vcia

REM Criar timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%

REM Criar diretório de backup
set BACKUP_DIR=%BACKUP_ROOT%\backup_%TIMESTAMP%

echo ========================================
echo   BACKUP LOCAL - Knowledge Consolidator
echo ========================================
echo.
echo Origem:  %PROJECT_DIR%
echo Destino: %BACKUP_DIR%
echo.

REM Verificar se diretório raiz existe
if not exist "%BACKUP_ROOT%" (
    echo Criando diretorio raiz de backups...
    mkdir "%BACKUP_ROOT%"
)

echo Iniciando backup...
echo.

REM Copiar arquivos principais (excluindo node_modules e arquivos temporários)
xcopy "%PROJECT_DIR%\*.html" "%BACKUP_DIR%\" /Y >nul 2>&1
xcopy "%PROJECT_DIR%\*.json" "%BACKUP_DIR%\" /Y >nul 2>&1
xcopy "%PROJECT_DIR%\*.md" "%BACKUP_DIR%\" /Y >nul 2>&1
xcopy "%PROJECT_DIR%\*.bat" "%BACKUP_DIR%\" /Y >nul 2>&1
xcopy "%PROJECT_DIR%\*.sh" "%BACKUP_DIR%\" /Y >nul 2>&1

REM Copiar diretórios importantes
echo [1/8] Copiando arquivos JS...
xcopy "%PROJECT_DIR%\js" "%BACKUP_DIR%\js\" /E /I /Y >nul 2>&1

echo [2/8] Copiando arquivos CSS...
xcopy "%PROJECT_DIR%\css" "%BACKUP_DIR%\css\" /E /I /Y >nul 2>&1

echo [3/8] Copiando documentacao...
xcopy "%PROJECT_DIR%\docs" "%BACKUP_DIR%\docs\" /E /I /Y >nul 2>&1

echo [4/8] Copiando scripts...
xcopy "%PROJECT_DIR%\scripts" "%BACKUP_DIR%\scripts\" /E /I /Y >nul 2>&1

echo [5/8] Copiando testes...
xcopy "%PROJECT_DIR%\test" "%BACKUP_DIR%\test\" /E /I /Y >nul 2>&1

echo [6/8] Copiando agents_output...
xcopy "%PROJECT_DIR%\agents_output" "%BACKUP_DIR%\agents_output\" /E /I /Y >nul 2>&1

echo [7/8] Copiando configuracoes...
xcopy "%PROJECT_DIR%\.gitignore" "%BACKUP_DIR%\" /Y >nul 2>&1
xcopy "%PROJECT_DIR%\CLAUDE.md" "%BACKUP_DIR%\" /Y >nul 2>&1
xcopy "%PROJECT_DIR%\RESUME-STATUS.md" "%BACKUP_DIR%\" /Y >nul 2>&1
xcopy "%PROJECT_DIR%\INICIO-SESSAO.md" "%BACKUP_DIR%\" /Y >nul 2>&1

echo [8/8] Salvando informacoes do backup...

REM Criar arquivo de informações do backup
echo Backup Information > "%BACKUP_DIR%\BACKUP_INFO.txt"
echo ================== >> "%BACKUP_DIR%\BACKUP_INFO.txt"
echo Date: %date% %time% >> "%BACKUP_DIR%\BACKUP_INFO.txt"
echo Source: %PROJECT_DIR% >> "%BACKUP_DIR%\BACKUP_INFO.txt"
echo. >> "%BACKUP_DIR%\BACKUP_INFO.txt"

REM Capturar status do Git se disponível
echo Git Status: >> "%BACKUP_DIR%\BACKUP_INFO.txt"
cd /d "%PROJECT_DIR%"
git status --short >> "%BACKUP_DIR%\BACKUP_INFO.txt" 2>nul
echo. >> "%BACKUP_DIR%\BACKUP_INFO.txt"
echo Last Commit: >> "%BACKUP_DIR%\BACKUP_INFO.txt"
git log --oneline -1 >> "%BACKUP_DIR%\BACKUP_INFO.txt" 2>nul

echo.
echo ========================================
echo    BACKUP CONCLUIDO COM SUCESSO!
echo ========================================
echo.
echo Backup salvo em:
echo %BACKUP_DIR%
echo.
echo Para restaurar, use:
echo xcopy "%BACKUP_DIR%" "%PROJECT_DIR%\" /E /I /Y
echo.

REM Criar link simbólico para último backup (Windows 10+)
if exist "%BACKUP_ROOT%\ultimo-funcional" (
    rmdir "%BACKUP_ROOT%\ultimo-funcional" 2>nul
)
mklink /D "%BACKUP_ROOT%\ultimo-funcional" "%BACKUP_DIR%" >nul 2>&1

echo Link rapido criado em:
echo %BACKUP_ROOT%\ultimo-funcional
echo.

pause