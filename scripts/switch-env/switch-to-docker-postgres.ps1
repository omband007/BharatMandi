# Switch to Docker PostgreSQL
# Run this script as Administrator

Write-Host "Switching to Docker PostgreSQL..." -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator" -ForegroundColor Red
    Write-Host ""
    Write-Host "Right-click PowerShell and select 'Run as Administrator', then run:" -ForegroundColor Yellow
    Write-Host "  cd C:\Om\Projects\Kiro" -ForegroundColor Yellow
    Write-Host "  .\scripts\switch-to-docker-postgres.ps1" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Stop local PostgreSQL service
Write-Host "Stopping local PostgreSQL service..." -ForegroundColor Yellow
try {
    Stop-Service postgresql-x64-18 -Force -ErrorAction Stop
    Write-Host "✓ Local PostgreSQL stopped" -ForegroundColor Green
} catch {
    Write-Host "⚠ Could not stop local PostgreSQL (may not be running)" -ForegroundColor Yellow
}

Write-Host ""

# Ensure Docker PostgreSQL is running
Write-Host "Starting Docker PostgreSQL..." -ForegroundColor Yellow
docker-compose up -d postgres

Write-Host ""
Write-Host "Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test connection
Write-Host ""
Write-Host "Testing connection..." -ForegroundColor Yellow
docker exec bharat-mandi-postgres psql -U postgres -d bharat_mandi -c "SELECT version();"

Write-Host ""
Write-Host "✓ Docker PostgreSQL is ready!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run verification: npx ts-node scripts/rag/check-rag-setup.ts" -ForegroundColor White
Write-Host "2. Ingest knowledge base: npx ts-node scripts/rag/ingest-knowledge-base.ts" -ForegroundColor White
Write-Host ""
