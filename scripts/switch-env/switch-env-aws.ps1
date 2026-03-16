# Switch to AWS RDS Testing Environment
# Uses AWS RDS PostgreSQL in ap-southeast-2

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  Switching to AWS RDS TESTING Environment" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

# Copy .env.aws to .env
Copy-Item -Path "config\.env.aws" -Destination ".env" -Force

Write-Host "Environment switched to AWS RDS" -ForegroundColor Green
Write-Host ""
Write-Host "Database Configuration:" -ForegroundColor Yellow
Write-Host "  Host: bharat-mandi-testing.c1y0cuowi6cr.ap-southeast-2.rds.amazonaws.com" -ForegroundColor White
Write-Host "  Port: 5432" -ForegroundColor White
Write-Host "  Database: postgres" -ForegroundColor White
Write-Host "  Region: ap-southeast-2" -ForegroundColor White
Write-Host ""
Write-Host "WARNING: You are now connected to AWS RDS!" -ForegroundColor Yellow
Write-Host "  Changes will affect the shared testing database" -ForegroundColor Yellow
Write-Host "  Data is persistent and backed up by AWS" -ForegroundColor Yellow
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Start development server: npm run dev" -ForegroundColor White
Write-Host "  2. To switch back to local: npm run env:local" -ForegroundColor White
Write-Host ""
