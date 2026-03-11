# Sync all HTML files from AWS EC2
$KeyPath = "scripts\deployment\test-key.pem"
$EC2Host = "13.236.3.139"
$EC2User = "ubuntu"
$RemotePublicDir = "/home/ubuntu/public"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Syncing ALL HTML files from AWS EC2" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if key exists
if (-not (Test-Path $KeyPath)) {
    Write-Host "Error: SSH key not found at $KeyPath" -ForegroundColor Red
    exit 1
}

# Get list of HTML files from AWS
Write-Host "Step 1: Getting list of HTML files from AWS..." -ForegroundColor Yellow
$remoteFiles = ssh -i "$KeyPath" -o StrictHostKeyChecking=no "${EC2User}@${EC2Host}" "find $RemotePublicDir -name '*.html' -type f"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to connect to AWS" -ForegroundColor Red
    exit 1
}

$htmlFiles = $remoteFiles -split "`n" | Where-Object { $_ -match '\.html$' }

Write-Host "Found $($htmlFiles.Count) HTML files on AWS" -ForegroundColor Green
Write-Host ""

# Download each file
$downloadedCount = 0
$skippedCount = 0
$errorCount = 0

foreach ($remoteFile in $htmlFiles) {
    $remoteFile = $remoteFile.Trim()
    if ([string]::IsNullOrWhiteSpace($remoteFile)) { continue }
    
    # Convert remote path to local path
    $relativePath = $remoteFile -replace [regex]::Escape($RemotePublicDir), "public"
    $relativePath = $relativePath -replace "/", "\"
    
    $fileName = Split-Path -Leaf $relativePath
    
    Write-Host "Processing: $fileName" -ForegroundColor Cyan
    Write-Host "  Remote: $remoteFile" -ForegroundColor Gray
    Write-Host "  Local:  $relativePath" -ForegroundColor Gray
    
    # Create local directory if needed
    $localDir = Split-Path -Parent $relativePath
    if ($localDir -and -not (Test-Path $localDir)) {
        New-Item -ItemType Directory -Path $localDir -Force | Out-Null
    }
    
    # Download to temp file first
    $tempFile = "$relativePath.aws"
    
    scp -i "$KeyPath" -o StrictHostKeyChecking=no "${EC2User}@${EC2Host}:$remoteFile" "$tempFile" 2>$null
    
    if ($LASTEXITCODE -eq 0) {
        # Compare with local file if it exists
        if (Test-Path $relativePath) {
            $localHash = (Get-FileHash $relativePath -Algorithm MD5).Hash
            $awsHash = (Get-FileHash $tempFile -Algorithm MD5).Hash
            
            if ($localHash -eq $awsHash) {
                Write-Host "  Status: Identical (skipped)" -ForegroundColor Green
                Remove-Item $tempFile
                $skippedCount++
            } else {
                Write-Host "  Status: Different - Downloaded" -ForegroundColor Yellow
                Move-Item -Force $tempFile $relativePath
                $downloadedCount++
            }
        } else {
            Write-Host "  Status: New file - Downloaded" -ForegroundColor Yellow
            Move-Item -Force $tempFile $relativePath
            $downloadedCount++
        }
    } else {
        Write-Host "  Status: Failed to download" -ForegroundColor Red
        $errorCount++
    }
    
    Write-Host ""
}

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total files checked: $($htmlFiles.Count)" -ForegroundColor White
Write-Host "Downloaded/Updated:  $downloadedCount" -ForegroundColor Yellow
Write-Host "Identical (skipped): $skippedCount" -ForegroundColor Green
Write-Host "Errors:              $errorCount" -ForegroundColor Red
Write-Host ""

if ($downloadedCount -gt 0) {
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Review changes: git diff" -ForegroundColor White
    Write-Host "  2. Test locally: npm run dev" -ForegroundColor White
    Write-Host "  3. Commit: git add public/ && git commit -m 'sync: Update HTML files from AWS'" -ForegroundColor White
    Write-Host "  4. Push: git push origin main" -ForegroundColor White
} else {
    Write-Host "All HTML files are in sync!" -ForegroundColor Green
}

Write-Host ""
