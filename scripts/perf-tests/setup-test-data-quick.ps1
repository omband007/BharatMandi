# Quick Setup Test Data for Performance Testing
# Uses existing images from data/media/listings as test samples

Write-Host "Quick setup: Using existing images for performance testing..." -ForegroundColor Cyan

# Create test-data directory if it doesn't exist
$testDataDir = "scripts/perf-tests/test-data"
if (!(Test-Path $testDataDir)) {
    New-Item -ItemType Directory -Path $testDataDir -Force | Out-Null
    Write-Host "Created $testDataDir directory" -ForegroundColor Green
}

# Find existing images in data/media/listings
$existingImages = Get-ChildItem "data/media/listings" -Recurse -Include "*.jpg","*.jpeg","*.png" -ErrorAction SilentlyContinue | Select-Object -First 2

if ($existingImages.Count -eq 0) {
    Write-Host "No images found in data/media/listings!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "  1. Download test images: .\scripts\download-test-images.ps1" -ForegroundColor White
    Write-Host "  2. Add your own images to ${testDataDir}:" -ForegroundColor White
    Write-Host "     - sample-crop-disease.jpg (any crop/produce image)" -ForegroundColor White
    Write-Host "     - sample-produce.jpg (any crop/produce image)" -ForegroundColor White
    exit 1
}

# Copy first image as crop disease sample
$sourceDisease = $existingImages[0].FullName
$destDisease = "$testDataDir/sample-crop-disease.jpg"
Copy-Item $sourceDisease $destDisease -Force
$sizeKB = [math]::Round((Get-Item $destDisease).Length / 1KB, 2)
Write-Host "Copied sample-crop-disease.jpg (${sizeKB} KB)" -ForegroundColor Green

# Copy second image as produce sample (or use first if only one exists)
if ($existingImages.Count -gt 1) {
    $sourceProduce = $existingImages[1].FullName
} else {
    $sourceProduce = $existingImages[0].FullName
}
$destProduce = "$testDataDir/sample-produce.jpg"
Copy-Item $sourceProduce $destProduce -Force
$sizeKB = [math]::Round((Get-Item $destProduce).Length / 1KB, 2)
Write-Host "Copied sample-produce.jpg (${sizeKB} KB)" -ForegroundColor Green

Write-Host ""
Write-Host "Note: Using existing listing images as test samples" -ForegroundColor Yellow
Write-Host "  These are produce images, not actual crop disease images" -ForegroundColor White
Write-Host "  For better test accuracy, download real crop disease images:" -ForegroundColor White
Write-Host "    .\scripts\download-test-images.ps1" -ForegroundColor Cyan

Write-Host ""
Write-Host "Test data setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Files in ${testDataDir}:" -ForegroundColor Cyan
Get-ChildItem $testDataDir | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 2)
    Write-Host "  - $($_.Name) (${size} KB)" -ForegroundColor White
}

Write-Host ""
Write-Host "You can now run the smoke test:" -ForegroundColor Cyan
Write-Host "  cd scripts/perf-tests" -ForegroundColor White
Write-Host "  artillery run artillery-ai-smoke-test.yml" -ForegroundColor White
