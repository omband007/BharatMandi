# Install Performance Testing Tools
# Run this script to install Artillery and k6 for performance testing

Write-Host "Installing Performance Testing Tools..." -ForegroundColor Cyan

# Check if Node.js is installed
$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "Node.js is installed: $nodeVersion" -ForegroundColor Green
    
    # Install Artillery globally
    Write-Host "Installing Artillery..." -ForegroundColor Yellow
    npm install -g artillery
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Artillery installed successfully" -ForegroundColor Green
        artillery --version
    } else {
        Write-Host "Failed to install Artillery" -ForegroundColor Red
    }
} else {
    Write-Host "Node.js is not installed. Please install Node.js first." -ForegroundColor Red
}

# Check if Chocolatey is installed for k6
$chocoVersion = choco --version 2>$null
if ($chocoVersion) {
    Write-Host "Chocolatey is installed: $chocoVersion" -ForegroundColor Green
    
    # Install k6
    Write-Host "Installing k6..." -ForegroundColor Yellow
    choco install k6 -y
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "k6 installed successfully" -ForegroundColor Green
        k6 version
    } else {
        Write-Host "Failed to install k6" -ForegroundColor Red
    }
} else {
    Write-Host "Chocolatey is not installed. Skipping k6 installation." -ForegroundColor Yellow
    Write-Host "To install k6 manually, visit: https://k6.io/docs/getting-started/installation/" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Performance testing tools installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run: .\scripts\run-perf-tests.ps1" -ForegroundColor White
Write-Host "2. View results in: docs/performance/test-results/" -ForegroundColor White
