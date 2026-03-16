# Run Performance Tests on AWS Deployment
# This script runs Artillery performance tests and generates reports

param(
    [string]$Target = "http://13.236.3.139:3000",
    [string]$Duration = "300",  # 5 minutes default
    [string]$OutputDir = "docs/performance/test-results"
)

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Bharat Mandi Performance Testing" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Create output directory if it doesn't exist
if (!(Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    Write-Host "✓ Created output directory: $OutputDir" -ForegroundColor Green
}

# Generate timestamp for this test run
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$reportFile = "$OutputDir/perf-test-$timestamp.json"
$htmlReport = "$OutputDir/perf-test-$timestamp.html"

Write-Host "Target: $Target" -ForegroundColor Yellow
Write-Host "Duration: $Duration seconds" -ForegroundColor Yellow
Write-Host "Output: $reportFile" -ForegroundColor Yellow
Write-Host ""

# Check if Artillery is installed
$artilleryVersion = artillery --version 2>$null
if (!$artilleryVersion) {
    Write-Host "✗ Artillery is not installed!" -ForegroundColor Red
    Write-Host "Run: .\scripts\install-perf-tools.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Artillery version: $artilleryVersion" -ForegroundColor Green
Write-Host ""

# Run Artillery test
Write-Host "Starting performance test..." -ForegroundColor Cyan
Write-Host "This will take approximately $([math]::Round($Duration/60, 1)) minutes" -ForegroundColor Yellow
Write-Host ""

artillery run `
    --target $Target `
    --output $reportFile `
    "$PSScriptRoot/perf-tests/artillery-config.yml"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Performance test completed successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Generate HTML report
    Write-Host "Generating HTML report..." -ForegroundColor Cyan
    artillery report --output $htmlReport $reportFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ HTML report generated: $htmlReport" -ForegroundColor Green
        Write-Host ""
        
        # Open the HTML report in browser
        Write-Host "Opening report in browser..." -ForegroundColor Cyan
        Start-Process $htmlReport
    }
    
    # Display summary
    Write-Host ""
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host "Test Results Summary" -ForegroundColor Cyan
    Write-Host "==================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Reports saved to:" -ForegroundColor Yellow
    Write-Host "  JSON: $reportFile" -ForegroundColor White
    Write-Host "  HTML: $htmlReport" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Review the HTML report in your browser" -ForegroundColor White
    Write-Host "2. Update docs/performance/performance-benchmarks.md with actual results" -ForegroundColor White
    Write-Host "3. Compare with baseline metrics" -ForegroundColor White
    
} else {
    Write-Host ""
    Write-Host "✗ Performance test failed!" -ForegroundColor Red
    Write-Host "Check the error messages above for details" -ForegroundColor Yellow
    exit 1
}
