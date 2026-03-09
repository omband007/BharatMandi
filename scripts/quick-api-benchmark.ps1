# Quick API Benchmark Script
# Tests individual API endpoints and measures response times

param(
    [string]$Target = "http://13.236.3.139:3000",
    [int]$Iterations = 10
)

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Quick API Benchmark" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Target: $Target" -ForegroundColor Yellow
Write-Host "Iterations: $Iterations per endpoint" -ForegroundColor Yellow
Write-Host ""

# Function to measure API response time
function Measure-ApiEndpoint {
    param(
        [string]$Url,
        [string]$Method = "GET",
        [string]$Body = $null,
        [int]$Iterations = 10
    )
    
    $times = @()
    $successCount = 0
    $errorCount = 0
    
    for ($i = 1; $i -le $Iterations; $i++) {
        try {
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            
            if ($Method -eq "GET") {
                $response = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -TimeoutSec 30
            } elseif ($Method -eq "POST" -and $Body) {
                $response = Invoke-WebRequest -Uri $Url -Method POST -Body $Body -ContentType "application/json" -UseBasicParsing -TimeoutSec 30
            }
            
            $stopwatch.Stop()
            $times += $stopwatch.ElapsedMilliseconds
            
            if ($response.StatusCode -eq 200) {
                $successCount++
            }
        } catch {
            $errorCount++
            Write-Host "  Error on iteration $i : $_" -ForegroundColor Red
        }
    }
    
    if ($times.Count -gt 0) {
        $avg = ($times | Measure-Object -Average).Average
        $min = ($times | Measure-Object -Minimum).Minimum
        $max = ($times | Measure-Object -Maximum).Maximum
        $p95 = $times | Sort-Object | Select-Object -Index ([math]::Floor($times.Count * 0.95))
        
        return @{
            Average = [math]::Round($avg, 2)
            Min = $min
            Max = $max
            P95 = $p95
            SuccessRate = [math]::Round(($successCount / $Iterations) * 100, 2)
            ErrorCount = $errorCount
        }
    } else {
        return @{
            Average = 0
            Min = 0
            Max = 0
            P95 = 0
            SuccessRate = 0
            ErrorCount = $Iterations
        }
    }
}

# Test endpoints
$endpoints = @(
    @{ Name = "Health Check"; Url = "$Target/api/health"; Method = "GET" },
    @{ Name = "Get Marketplace Listings"; Url = "$Target/api/marketplace/listings"; Method = "GET" },
    @{ Name = "Translate API"; Url = "$Target/api/i18n/translate"; Method = "POST"; Body = '{"text":"Hello","targetLanguage":"hi"}' }
)

$results = @()

foreach ($endpoint in $endpoints) {
    Write-Host "Testing: $($endpoint.Name)" -ForegroundColor Cyan
    Write-Host "  URL: $($endpoint.Url)" -ForegroundColor Gray
    Write-Host "  Running $Iterations iterations..." -ForegroundColor Gray
    
    $result = Measure-ApiEndpoint -Url $endpoint.Url -Method $endpoint.Method -Body $endpoint.Body -Iterations $Iterations
    
    Write-Host "  Average: $($result.Average)ms" -ForegroundColor $(if ($result.Average -lt 200) { "Green" } elseif ($result.Average -lt 500) { "Yellow" } else { "Red" })
    Write-Host "  Min: $($result.Min)ms | Max: $($result.Max)ms | P95: $($result.P95)ms" -ForegroundColor Gray
    Write-Host "  Success Rate: $($result.SuccessRate)%" -ForegroundColor $(if ($result.SuccessRate -gt 95) { "Green" } else { "Red" })
    Write-Host ""
    
    $results += [PSCustomObject]@{
        Endpoint = $endpoint.Name
        Average = "$($result.Average)ms"
        Min = "$($result.Min)ms"
        Max = "$($result.Max)ms"
        P95 = "$($result.P95)ms"
        SuccessRate = "$($result.SuccessRate)%"
        Errors = $result.ErrorCount
    }
}

# Display summary table
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$results | Format-Table -AutoSize

# Save results to file
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$outputFile = "docs/performance/test-results/quick-benchmark-$timestamp.json"

if (!(Test-Path "docs/performance/test-results")) {
    New-Item -ItemType Directory -Path "docs/performance/test-results" -Force | Out-Null
}

$results | ConvertTo-Json | Out-File $outputFile

Write-Host "Results saved to: $outputFile" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run full load test: .\scripts\run-perf-tests.ps1" -ForegroundColor White
Write-Host "2. Update performance benchmarks document" -ForegroundColor White
