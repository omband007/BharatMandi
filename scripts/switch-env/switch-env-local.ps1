# Switch to Local Development Environment
# Uses Docker PostgreSQL on port 5433

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  Switching to LOCAL DEVELOPMENT Environment" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

# Copy .env.local to .env
Copy-Item -Path "config\.env.local" -Destination ".env" -Force

Write-Host "Environment switched to LOCAL" -ForegroundColor Green
Write-Host ""
Write-Host "Database Configuration:" -ForegroundColor Yellow
Write-Host "  Host: localhost" -ForegroundColor White
Write-Host "  Port: 5433 (Docker)" -ForegroundColor White
Write-Host "  Database: bharat_mandi" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Ensure Docker is running: docker-compose up -d" -ForegroundColor White
Write-Host "  2. Start development server: npm run dev" -ForegroundColor White
Write-Host ""
