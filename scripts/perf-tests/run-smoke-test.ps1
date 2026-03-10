# Run Artillery Smoke Test with Output Logging
# Saves test output to a timestamped file for analysis

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$outputDir = "test-results"
$outputFile = "$outputDir/smoke-test-$timestamp.txt"

Write-Host "Artillery AI Smoke Test Runner" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

# Create output directory if it doesn't exist
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
    Write-Host "Created $outputDir directory" -ForegroundColor Green
}

Write-Host "Running smoke test..." -ForegroundColor Yellow
Write-Host "Output will be saved to: $outputFile" -ForegroundColor Gray
Write-Host ""

# Run artillery and capture output
try {
    # Run artillery and tee output to both console and file
    artillery run artillery-ai-smoke-test.yml 2>&1 | Tee-Object -FilePath $outputFile
    
    Write-Host ""
    Write-Host "===============================" -ForegroundColor Cyan
    Write-Host "Test complete!" -ForegroundColor Green
    Write-Host "Results saved to: $outputFile" -ForegroundColor Green
    Write-Host ""
    
    # Parse and display summary
    Write-Host "Quick Summary:" -ForegroundColor Cyan
    Write-Host "-------------" -ForegroundColor Cyan
    
    $content = Get-Content $outputFile -Raw
    
    # Extract key metrics from summary
    if ($content -match "http\.codes\.200:\s+\.+\s+(\d+)") {
        $success = $matches[1]
        Write-Host "  Successful (200): $success" -ForegroundColor Green
    }
    
    if ($content -match "http\.codes\.500:\s+\.+\s+(\d+)") {
        $errors = $matches[1]
        Write-Host "  Server Errors (500): $errors" -ForegroundColor Red
    }
    
    if ($content -match "errors\.ETIMEDOUT:\s+\.+\s+(\d+)") {
        $timeouts = $matches[1]
        Write-Host "  Timeouts: $timeouts" -ForegroundColor Yellow
    }
    
    if ($content -match "vusers\.completed:\s+\.+\s+(\d+)") {
        $completed = $matches[1]
        Write-Host "  Completed Users: $completed" -ForegroundColor Green
    }
    
    if ($content -match "vusers\.failed:\s+\.+\s+(\d+)") {
        $failed = $matches[1]
        Write-Host "  Failed Users: $failed" -ForegroundColor Red
    }
    
    if ($content -match "http\.response_time:\s+min:\s+\.+\s+(\d+)\s+max:\s+\.+\s+(\d+)\s+mean:\s+\.+\s+([\d.]+)") {
        $min = $matches[1]
        $max = $matches[2]
        $mean = $matches[3]
        Write-Host "  Response Time: min=${min}ms, max=${max}ms, mean=${mean}ms" -ForegroundColor Cyan
    }
    
    Write-Host ""
    Write-Host "Full results available in: $outputFile" -ForegroundColor Gray
    
} catch {
    Write-Host "Error running smoke test: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
