# KC V2 PowerShell Startup Script

Write-Host "========================================"
Write-Host "   KNOWLEDGE CONSOLIDATOR V2 STARTUP"
Write-Host "========================================"
Write-Host ""

# Ensure we're in the V2 directory
Set-Location -Path "F:\vcia-1307\vcia_dhl\v2"

Write-Host "Current directory: $(Get-Location)"
Write-Host ""

# Verify files exist
$coreFiles = @(
    "index.html",
    "js\core\EventBus.js",
    "js\core\AppState.js",
    "js\app.js"
)

$allFilesExist = $true
foreach ($file in $coreFiles) {
    if (Test-Path $file) {
        Write-Host "✅ $file" -ForegroundColor Green
    } else {
        Write-Host "❌ $file - NOT FOUND!" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "ERROR: Some core files are missing!" -ForegroundColor Red
    Write-Host "Please check the file structure."
    Read-Host "Press Enter to exit"
    exit
}

Write-Host ""
Write-Host "All files verified! Starting server..." -ForegroundColor Green
Write-Host ""
Write-Host "===================================="
Write-Host "   Opening http://localhost:3000"
Write-Host "   Press Ctrl+C to stop"
Write-Host "===================================="
Write-Host ""

# Open browser
Start-Process "http://localhost:3000"

# Start Python server
python -m http.server 3000