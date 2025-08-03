@echo off
echo ========================================
echo    SERVIDOR SIMPLES - SEM COMPLICACAO
echo ========================================
echo.
cd /d "%~dp0"
echo Iniciando servidor Python na porta 8000...
echo.
echo Acesse: http://localhost:8000
echo.
python -m http.server 8000
pause