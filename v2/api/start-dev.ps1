# PowerShell script para iniciar o servidor de desenvolvimento no Windows

Write-Host "🚀 Iniciando KC V2 API em modo desenvolvimento..." -ForegroundColor Green
Write-Host ""

# Define a variável de ambiente
$env:NODE_ENV = "development"

# Inicia o servidor
node server.js