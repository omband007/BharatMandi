# Setup Test Data for Performance Testing
# This script copies sample images from test-images to perf-tests/test-data

Write-Host "Setting up test data for performance testing..." -ForegroundColor Cyan

# Create test-data directory if it doesn't exist
$testDataDir = "scripts/perf-tests/test-data"
if (!(Test-Path $testDataDir)) {
    New-Item -ItemType Directory -Path $testDataDir -Force | Out-Null
    Write-Host "Created $testDataDir directory" -ForegroundColor Green
}

# Check if test-images directory exists
if (!(Test-Path "test-images")) {
    Write-Host "test-images directory not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please download test images first:" -ForegroundColor Yellow
    Write-Host "  .\scripts\download-test-images.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Or manually add these files to $testDataDir" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  - sample-crop-disease.jpg (any crop disease image)" -ForegroundColor White
    Write-Host "  - sample-produce.jpg (any produce image for grading)" -ForegroundColor White
    Write-Host "  - sample-audio.mp3 (Hindi voice sample)" -ForegroundColor White
    exit 1
}

# Copy sample crop disease image
$sourceDisease = "test-images/tomato/late-blight/image_1.jpg"
$destDisease = "$testDataDir/sample-crop-disease.jpg"

if (Test-Path $sourceDisease) {
    Copy-Item $sourceDisease $destDisease -Force
    Write-Host "Copied sample-crop-disease.jpg" -ForegroundColor Green
} else {
    Write-Host "Source image not found: $sourceDisease" -ForegroundColor Red
}

# Copy sample produce image (use healthy tomato for grading)
$sourceProduce = "test-images/tomato/healthy/image_1.jpg"
$destProduce = "$testDataDir/sample-produce.jpg"

if (Test-Path $sourceProduce) {
    Copy-Item $sourceProduce $destProduce -Force
    Write-Host "Copied sample-produce.jpg" -ForegroundColor Green
} else {
    Write-Host "Source image not found: $sourceProduce" -ForegroundColor Red
}

# Note about audio file
Write-Host ""
Write-Host "Note: sample-audio.mp3 needs to be added manually" -ForegroundColor Yellow
Write-Host "  You can record a short Hindi voice sample or use any MP3 file" -ForegroundColor White
Write-Host "  Place it at: $testDataDir/sample-audio.mp3" -ForegroundColor White

Write-Host ""
Write-Host "Test data setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Files in $testDataDir" -ForegroundColor Cyan
Write-Host ""
Get-ChildItem $testDataDir | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 2)
    Write-Host "  - $($_.Name) ($size KB)" -ForegroundColor White
}

Write-Host ""
Write-Host "You can now run the smoke test" -ForegroundColor Cyan
Write-Host "  cd scripts/perf-tests" -ForegroundColor White
Write-Host "  artillery run artillery-ai-smoke-test.yml" -ForegroundColor White
