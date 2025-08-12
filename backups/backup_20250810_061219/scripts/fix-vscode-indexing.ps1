# Script para corrigir problemas de indexação no VSCode
# Salve como: fix-vscode-indexing.ps1

Write-Host "=== Corrigindo Indexação VSCode ===" -ForegroundColor Cyan
Write-Host ""

# 1. Limpar cache do VSCode
Write-Host "[1/5] Limpando cache do VSCode..." -ForegroundColor Yellow
$vscodeCachePaths = @(
    "$env:APPDATA\Code\Cache",
    "$env:APPDATA\Code\CachedData",
    "$env:APPDATA\Code\CachedExtensions",
    "$env:APPDATA\Code\CachedExtensionVSIXs",
    "$env:LOCALAPPDATA\Microsoft\vscode-cpptools"
)

foreach ($path in $vscodeCachePaths) {
    if (Test-Path $path) {
        Write-Host "  → Removendo: $path" -ForegroundColor Gray
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 2. Limpar cache do TypeScript
Write-Host "`n[2/5] Limpando cache TypeScript..." -ForegroundColor Yellow
$tsCachePaths = @(
    "$env:APPDATA\Code\User\workspaceStorage",
    "$env:LOCALAPPDATA\Microsoft\TypeScript"
)

foreach ($path in $tsCachePaths) {
    if (Test-Path $path) {
        $files = Get-ChildItem -Path $path -Filter "*.tsbuildinfo" -Recurse -ErrorAction SilentlyContinue
        $count = $files.Count
        if ($count -gt 0) {
            Write-Host "  → Removendo $count arquivos .tsbuildinfo" -ForegroundColor Gray
            $files | Remove-Item -Force
        }
    }
}

# 3. Limpar cache do Claude (se existir)
Write-Host "`n[3/5] Verificando cache do Claude..." -ForegroundColor Yellow
$claudeCachePath = "$env:APPDATA\Claude\cache"
if (Test-Path $claudeCachePath) {
    Write-Host "  → Cache do Claude encontrado, limpando..." -ForegroundColor Gray
    Get-ChildItem -Path $claudeCachePath -Filter "*.cache" | Remove-Item -Force
}

# 4. Resetar configurações de busca
Write-Host "`n[4/5] Resetando índice de busca..." -ForegroundColor Yellow
$searchDbPath = "$env:APPDATA\Code\User\globalStorage\ms-vscode.search-db"
if (Test-Path $searchDbPath) {
    Write-Host "  → Removendo banco de busca" -ForegroundColor Gray
    Remove-Item -Path $searchDbPath -Recurse -Force -ErrorAction SilentlyContinue
}

# 5. Criar arquivo de reset para o workspace
Write-Host "`n[5/5] Criando marcador de reset..." -ForegroundColor Yellow
$workspacePath = "F:\vcia-1307\vcia_dhl"
if (Test-Path $workspacePath) {
    $resetFile = Join-Path $workspacePath ".vscode\.index-reset"
    New-Item -Path $resetFile -ItemType File -Force | Out-Null
    Write-Host "  → Marcador criado em: $resetFile" -ForegroundColor Gray
}

Write-Host "`n✅ Limpeza concluída!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Cyan
Write-Host "1. Abra o VSCode" -ForegroundColor White
Write-Host "2. Pressione Ctrl+Shift+P" -ForegroundColor White
Write-Host "3. Execute: 'Developer: Reload Window'" -ForegroundColor White
Write-Host "4. Aguarde 30 segundos para reindexação" -ForegroundColor White
Write-Host ""
Write-Host "💡 Dica: Se o problema persistir, execute:" -ForegroundColor Yellow
Write-Host "   code --disable-extensions" -ForegroundColor Gray
Write-Host "   Para identificar se alguma extensão está causando o problema" -ForegroundColor Gray