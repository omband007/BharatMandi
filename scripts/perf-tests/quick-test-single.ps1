# Quick Single Request Test for AI Endpoints
# Tests each endpoint once with the new images

$baseUrl = "http://13.236.3.139:3000"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$testDataDir = Join-Path $scriptDir "test-data"

Write-Host "Quick Single Request Test - AI Endpoints" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Test data directory: $testDataDir" -ForegroundColor Gray
Write-Host ""

# Test 1: Dr. Fasal (Crop Disease Diagnosis)
Write-Host "[1/5] Testing Dr. Fasal (Crop Disease Diagnosis)..." -ForegroundColor Yellow
try {
    $imagePath = Join-Path $testDataDir "sample-crop-disease.jpg"
    if (!(Test-Path $imagePath)) {
        Write-Host "  Status: FAILED - Image not found: $imagePath" -ForegroundColor Red
    } else {
        $startTime = Get-Date
        # Create temp file for location JSON to avoid quote escaping issues
        $tempFile = [System.IO.Path]::GetTempFileName()
        '{"latitude": 19.0760, "longitude": 72.8777, "state": "Maharashtra"}' | Out-File -FilePath $tempFile -Encoding ASCII -NoNewline
        $result = & curl.exe -X POST "$baseUrl/api/diagnosis/test" `
            -F "image=@$imagePath" `
            -F "cropType=tomato" `
            -F "language=en" `
            -F "location=<$tempFile" `
            -w "`n__HTTP_CODE__%{http_code}" `
            -s 2>&1
        Remove-Item $tempFile -ErrorAction SilentlyContinue
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        $resultStr = $result -join "`n"
        if ($resultStr -match "__HTTP_CODE__(\d+)") {
            $httpCode = $matches[1]
            $content = $resultStr -replace "__HTTP_CODE__\d+", ""
            if ($httpCode -eq "200" -or $httpCode -eq "201") {
                Write-Host "  Status: SUCCESS (HTTP $httpCode)" -ForegroundColor Green
                Write-Host "  Time: $([math]::Round($duration, 2))s" -ForegroundColor Gray
                if ($content.Length -gt 0) {
                    $preview = $content.Substring(0, [Math]::Min(200, $content.Length))
                    Write-Host "  Response preview: $preview..." -ForegroundColor Gray
                }
            } else {
                Write-Host "  Status: FAILED (HTTP $httpCode)" -ForegroundColor Red
                if ($content.Length -gt 0) {
                    Write-Host "  Error: $($content.Substring(0, [Math]::Min(500, $content.Length)))" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "  Status: FAILED - Could not parse response" -ForegroundColor Red
            Write-Host "  Raw output: $($resultStr.Substring(0, [Math]::Min(200, $resultStr.Length)))" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "  Status: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Fasal-Parakh (Produce Grading)
Write-Host "[2/5] Testing Fasal-Parakh (Produce Grading)..." -ForegroundColor Yellow
try {
    $imagePath = Join-Path $testDataDir "sample-produce.jpg"
    if (!(Test-Path $imagePath)) {
        Write-Host "  Status: FAILED - Image not found: $imagePath" -ForegroundColor Red
    } else {
        $startTime = Get-Date
        $result = & curl.exe -X POST "$baseUrl/api/grading/grade-with-image" `
            -F "image=@$imagePath" `
            -F "farmerId=test-farmer" `
            -F "produceType=tomato" `
            -F "lat=19.0760" `
            -F "lng=72.8777" `
            -F "autoDetect=true" `
            -w "`n__HTTP_CODE__%{http_code}" `
            -s 2>&1
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalSeconds
        
        $resultStr = $result -join "`n"
        if ($resultStr -match "__HTTP_CODE__(\d+)") {
            $httpCode = $matches[1]
            $content = $resultStr -replace "__HTTP_CODE__\d+", ""
            if ($httpCode -eq "200") {
                Write-Host "  Status: SUCCESS (HTTP $httpCode)" -ForegroundColor Green
                Write-Host "  Time: $([math]::Round($duration, 2))s" -ForegroundColor Gray
                if ($content.Length -gt 0) {
                    $preview = $content.Substring(0, [Math]::Min(200, $content.Length))
                    Write-Host "  Response preview: $preview..." -ForegroundColor Gray
                }
            } else {
                Write-Host "  Status: FAILED (HTTP $httpCode)" -ForegroundColor Red
                if ($content.Length -gt 0) {
                    Write-Host "  Error: $($content.Substring(0, [Math]::Min(500, $content.Length)))" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "  Status: FAILED - Could not parse response" -ForegroundColor Red
            Write-Host "  Raw output: $($resultStr.Substring(0, [Math]::Min(200, $resultStr.Length)))" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "  Status: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Kisan Mitra (AI Assistant)
Write-Host "[3/5] Testing Kisan Mitra (AI Assistant)..." -ForegroundColor Yellow
try {
    $startTime = Get-Date
    $body = @{
        userId = "test-user"
        query = "What fertilizer should I use for tomatoes?"
        language = "en"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/kisan-mitra/query" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 30 -UseBasicParsing
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "  Status: SUCCESS (HTTP $($response.StatusCode))" -ForegroundColor Green
    Write-Host "  Time: $([math]::Round($duration, 2))s" -ForegroundColor Gray
    $preview = $response.Content.Substring(0, [Math]::Min(200, $response.Content.Length))
    Write-Host "  Response preview: $preview..." -ForegroundColor Gray
} catch {
    Write-Host "  Status: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Voice TTS
Write-Host "[4/5] Testing Voice TTS..." -ForegroundColor Yellow
try {
    $startTime = Get-Date
    $body = @{
        text = "Hello farmer"
        language = "en"
        speed = 1.0
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/voice/synthesize" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 30 -UseBasicParsing
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "  Status: SUCCESS (HTTP $($response.StatusCode))" -ForegroundColor Green
    Write-Host "  Time: $([math]::Round($duration, 2))s" -ForegroundColor Gray
    $preview = $response.Content.Substring(0, [Math]::Min(200, $response.Content.Length))
    Write-Host "  Response preview: $preview..." -ForegroundColor Gray
} catch {
    Write-Host "  Status: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Translation
Write-Host "[5/5] Testing Translation..." -ForegroundColor Yellow
try {
    $startTime = Get-Date
    $body = @{
        text = "Your crop is healthy"
        targetLanguage = "hi"
        sourceLanguage = "en"
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/api/i18n/translate" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 30 -UseBasicParsing
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    Write-Host "  Status: SUCCESS (HTTP $($response.StatusCode))" -ForegroundColor Green
    Write-Host "  Time: $([math]::Round($duration, 2))s" -ForegroundColor Gray
    $preview = $response.Content.Substring(0, [Math]::Min(200, $response.Content.Length))
    Write-Host "  Response preview: $preview..." -ForegroundColor Gray
} catch {
    Write-Host "  Status: FAILED - $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Quick test complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To run full smoke test:" -ForegroundColor Cyan
Write-Host "  artillery run artillery-ai-smoke-test.yml" -ForegroundColor White
