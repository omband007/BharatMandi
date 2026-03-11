# Find the application path on EC2
$KeyPath = "scripts\deployment\test-key.pem"
$EC2Host = "13.236.3.139"
$EC2User = "ubuntu"

Write-Host "Finding application path on EC2..." -ForegroundColor Cyan
Write-Host ""

# Try common paths
$paths = @(
    "/home/ubuntu/BharatMandi",
    "/home/ubuntu/bharat-mandi",
    "/home/ubuntu/app",
    "/opt/BharatMandi",
    "/var/www/BharatMandi"
)

foreach ($path in $paths) {
    Write-Host "Checking: $path" -ForegroundColor Yellow
    ssh -i "$KeyPath" -o StrictHostKeyChecking=no "${EC2User}@${EC2Host}" "ls -la $path/public/index.html 2>/dev/null"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Found at: $path" -ForegroundColor Green
        break
    }
}

Write-Host ""
Write-Host "Listing home directory:" -ForegroundColor Cyan
ssh -i "$KeyPath" -o StrictHostKeyChecking=no "${EC2User}@${EC2Host}" "ls -la ~/"
