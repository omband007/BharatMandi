# Check if source code is in sync with AWS
$KeyPath = "scripts\deployment\test-key.pem"
$EC2Host = "13.236.3.139"
$EC2User = "ubuntu"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Checking Code Sync Status" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if key exists
if (-not (Test-Path $KeyPath)) {
    Write-Host "Error: SSH key not found" -ForegroundColor Red
    exit 1
}

# Get Git commit hash from AWS
Write-Host "Checking Git status on AWS..." -ForegroundColor Yellow
$awsCommit = ssh -i "$KeyPath" -o StrictHostKeyChecking=no "${EC2User}@${EC2Host}" "cd /home/ubuntu && git rev-parse HEAD 2>/dev/null || echo 'NO_GIT'"

if ($awsCommit -eq "NO_GIT") {
    Write-Host "AWS deployment is NOT using Git!" -ForegroundColor Red
    Write-Host "The code on AWS was deployed manually (tar.gz or direct copy)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "This explains the drift!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Recommendation:" -ForegroundColor Cyan
    Write-Host "  1. Sync all files from AWS (HTML files done)" -ForegroundColor White
    Write-Host "  2. Commit everything to Git" -ForegroundColor White
    Write-Host "  3. Set up proper Git-based deployment on AWS" -ForegroundColor White
} else {
    $awsCommit = $awsCommit.Trim()
    $localCommit = (git rev-parse HEAD).Trim()
    
    Write-Host "Local Git commit:  $localCommit" -ForegroundColor White
    Write-Host "AWS Git commit:    $awsCommit" -ForegroundColor White
    Write-Host ""
    
    if ($localCommit -eq $awsCommit) {
        Write-Host "Git commits match!" -ForegroundColor Green
        Write-Host "But HTML files were different, meaning:" -ForegroundColor Yellow
        Write-Host "  - Changes were made directly on AWS without committing" -ForegroundColor Yellow
    } else {
        Write-Host "Git commits are DIFFERENT!" -ForegroundColor Red
        Write-Host "AWS is behind/ahead of local repository" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Recommendations to Prevent Future Drift" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. ALWAYS commit changes locally first:" -ForegroundColor Yellow
Write-Host "   git add ." -ForegroundColor White
Write-Host "   git commit -m 'description'" -ForegroundColor White
Write-Host "   git push origin main" -ForegroundColor White
Write-Host ""
Write-Host "2. Deploy from Git on AWS:" -ForegroundColor Yellow
Write-Host "   ssh to EC2, then:" -ForegroundColor White
Write-Host "   cd /home/ubuntu" -ForegroundColor White
Write-Host "   git pull origin main" -ForegroundColor White
Write-Host "   npm install" -ForegroundColor White
Write-Host "   pm2 restart all" -ForegroundColor White
Write-Host ""
Write-Host "3. NEVER edit files directly on AWS" -ForegroundColor Yellow
Write-Host ""
Write-Host "4. Use deployment script (we can create one)" -ForegroundColor Yellow
Write-Host ""
