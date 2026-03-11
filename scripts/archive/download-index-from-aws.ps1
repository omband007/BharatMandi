# Quick script to download index.html from AWS EC2
$KeyPath = "scripts\deployment\test-key.pem"
$EC2Host = "13.236.3.139"
$EC2User = "ubuntu"
$RemoteFile = "/home/ubuntu/public/index.html"
$LocalFile = "public\index.html.aws"

Write-Host "Downloading index.html from AWS EC2..." -ForegroundColor Cyan

if (-not (Test-Path $KeyPath)) {
    Write-Host "Error: SSH key not found at $KeyPath" -ForegroundColor Red
    exit 1
}

Write-Host "Connecting to: $EC2User@$EC2Host"
Write-Host "Remote file: $RemoteFile"
Write-Host "Local file: $LocalFile"
Write-Host ""

scp -i "$KeyPath" -o StrictHostKeyChecking=no "${EC2User}@${EC2Host}:$RemoteFile" "$LocalFile"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Success! Downloaded to: $LocalFile" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Compare: code --diff public\index.html public\index.html.aws"
    Write-Host "  2. Replace: Move-Item -Force public\index.html.aws public\index.html"
    Write-Host "  3. Test: npm run dev"
    Write-Host "  4. Commit: git add public\index.html"
} else {
    Write-Host ""
    Write-Host "Failed to download file" -ForegroundColor Red
}
