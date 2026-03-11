# Sync files from AWS EC2 to local repository
# This script downloads files from the EC2 instance to sync local code with deployed version

param(
    [string]$KeyPath = "scripts\deployment\test-key.pem",
    [string]$EC2Host = "13.236.3.139",
    [string]$EC2User = "ubuntu",
    [string]$RemotePath = "/home/ubuntu/BharatMandi",
    [string]$LocalPath = ".",
    [switch]$DryRun = $false
)

Write-Host "🔄 AWS EC2 File Sync Script" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if key file exists
if (-not (Test-Path $KeyPath)) {
    Write-Host "❌ Error: SSH key not found at $KeyPath" -ForegroundColor Red
    Write-Host "Please ensure the key file exists or provide the correct path with -KeyPath parameter" -ForegroundColor Yellow
    exit 1
}

# Check if scp is available
try {
    $scpVersion = scp 2>&1
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 1) {
        throw "scp not found"
    }
} catch {
    Write-Host "❌ Error: scp command not found" -ForegroundColor Red
    Write-Host "Please install OpenSSH client:" -ForegroundColor Yellow
    Write-Host "  Settings > Apps > Optional Features > Add OpenSSH Client" -ForegroundColor Yellow
    exit 1
}

Write-Host "📋 Configuration:" -ForegroundColor Green
Write-Host "  EC2 Host: $EC2User@$EC2Host" -ForegroundColor White
Write-Host "  Remote Path: $RemotePath" -ForegroundColor White
Write-Host "  Local Path: $LocalPath" -ForegroundColor White
Write-Host "  Key File: $KeyPath" -ForegroundColor White
Write-Host ""

if ($DryRun) {
    Write-Host "🔍 DRY RUN MODE - No files will be downloaded" -ForegroundColor Yellow
    Write-Host ""
}

# Files to sync
$filesToSync = @(
    @{
        Remote = "$RemotePath/public/index.html"
        Local = "public\index.html"
        Description = "Main landing page"
    },
    @{
        Remote = "$RemotePath/public/css/common-styles.css"
        Local = "public\css\common-styles.css"
        Description = "Common styles"
    },
    @{
        Remote = "$RemotePath/package.json"
        Local = "package.json"
        Description = "Package configuration"
    }
)

Write-Host "📥 Files to download:" -ForegroundColor Cyan
foreach ($file in $filesToSync) {
    Write-Host "  • $($file.Description): $($file.Remote)" -ForegroundColor White
}
Write-Host ""

# Confirm before proceeding
if (-not $DryRun) {
    $confirm = Read-Host "Do you want to proceed? (y/n)"
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        Write-Host "❌ Cancelled by user" -ForegroundColor Yellow
        exit 0
    }
    Write-Host ""
}

# Download each file
$successCount = 0
$failCount = 0

foreach ($file in $filesToSync) {
    Write-Host "📥 Downloading: $($file.Description)..." -ForegroundColor Cyan
    
    if ($DryRun) {
        Write-Host "  [DRY RUN] Would download: $($file.Remote) -> $($file.Local)" -ForegroundColor Yellow
        $successCount++
        continue
    }
    
    # Create local directory if it doesn't exist
    $localDir = Split-Path -Parent $file.Local
    if ($localDir -and -not (Test-Path $localDir)) {
        New-Item -ItemType Directory -Path $localDir -Force | Out-Null
    }
    
    # Download file using scp
    $scpCommand = "scp -i `"$KeyPath`" -o StrictHostKeyChecking=no ${EC2User}@${EC2Host}:$($file.Remote) `"$($file.Local)`""
    
    try {
        Invoke-Expression $scpCommand 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Downloaded successfully" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "  ❌ Failed to download" -ForegroundColor Red
            $failCount++
        }
    } catch {
        Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        $failCount++
    }
    
    Write-Host ""
}

# Summary
Write-Host "================================" -ForegroundColor Cyan
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "  ✅ Success: $successCount" -ForegroundColor Green
Write-Host "  ❌ Failed: $failCount" -ForegroundColor Red
Write-Host ""

if ($failCount -eq 0 -and -not $DryRun) {
    Write-Host "🎉 All files synced successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Review the changes: git diff" -ForegroundColor White
    Write-Host "  2. Test locally: npm run dev" -ForegroundColor White
    Write-Host "  3. Commit changes: git add . && git commit -m 'sync: Update files from AWS deployment'" -ForegroundColor White
    Write-Host "  4. Push to GitHub: git push origin main" -ForegroundColor White
} elseif ($DryRun) {
    Write-Host "To actually download files, run without -DryRun flag:" -ForegroundColor Yellow
    Write-Host "  .\scripts\deployment\sync-from-aws.ps1" -ForegroundColor White
}

Write-Host ""
