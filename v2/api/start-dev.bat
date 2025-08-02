@echo off
echo.
echo 🚀 Iniciando KC V2 API em modo desenvolvimento...
echo.

REM Define a variável de ambiente
set NODE_ENV=development

REM Inicia o servidor
node server.js

pause