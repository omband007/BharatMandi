# PowerShell script to download crop disease test images
# This is a wrapper for the Python script

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Crop Disease Test Image Downloader (PowerShell)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python not found!" -ForegroundColor Red
    Write-Host "   Please install Python 3.8+ from https://www.python.org/" -ForegroundColor Yellow
    exit 1
}

# Check if pip is available
try {
    $pipVersion = pip --version 2>&1
    Write-Host "[OK] pip found" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] pip not found!" -ForegroundColor Red
    Write-Host "   Please ensure pip is installed with Python" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "[INFO] Installing required packages..." -ForegroundColor Cyan

# Install requirements directly
pip install datasets pillow

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install required packages" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Packages installed successfully" -ForegroundColor Green
Write-Host ""

# Run the Python script
Write-Host "[INFO] Starting download..." -ForegroundColor Cyan
Write-Host ""

python scripts/download-test-images.py

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[SUCCESS] All done! Test images are ready in test-images/ directory" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[ERROR] Download failed. Please check the error messages above." -ForegroundColor Red
    exit 1
}
