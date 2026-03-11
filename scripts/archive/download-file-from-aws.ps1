# Download a specific file from AWS EC2
param(
    [Parameter(Mandatory=$true)]
    [string]$RemoteFile,
    
    [Parameter(Mandatory=$true)]
    [string]$LocalFile
)

$KeyPath = "scripts\deployment\test-key.pem"
$EC2Host = "13.236.3.139"
$EC2User = "ubuntu"

Write-Host "Downloading from AWS EC2..." -ForegroundColor Cyan
Write-Host "Remote: $RemoteFile" -ForegroundColor White
Write-Host "Local: $LocalFile" -ForegroundColor White
Write-Host ""

if (-not (Test-Path $KeyPath)) {
    Write-Host "Error: SSH key not found" -ForegroundColor Red
    exit 1
}

scp -i "$KeyPath" -o StrictHostKeyChecking=no "${EC2User}@${EC2Host}:$RemoteFile" "$LocalFile"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Success! Downloaded to: $LocalFile" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Failed to download" -ForegroundColor Red
}
