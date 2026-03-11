# AWS Region Migration Script: ap-southeast-2 → ap-south-1
# This script migrates your S3 bucket to the new region

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "AWS Region Migration: ap-southeast-2 → ap-south-1" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$OLD_REGION = "ap-southeast-2"
$NEW_REGION = "ap-south-1"
$OLD_BUCKET = "bharat-mandi-voice-temp"
$NEW_BUCKET = "bharat-mandi-voice-ap-south-1"

Write-Host "Step 1: Creating new S3 bucket in ap-south-1..." -ForegroundColor Yellow
aws s3 mb s3://$NEW_BUCKET --region $NEW_REGION

Write-Host "✓ Bucket created: $NEW_BUCKET" -ForegroundColor Green
Write-Host ""

Write-Host "Step 2: Setting up bucket lifecycle policy (delete files after 7 days)..." -ForegroundColor Yellow
$lifecyclePolicy = @"
{
  "Rules": [
    {
      "Id": "DeleteOldAudioFiles",
      "Status": "Enabled",
      "Prefix": "",
      "Expiration": {
        "Days": 7
      }
    }
  ]
}
"@

$lifecyclePolicy | Out-File -FilePath "$env:TEMP\lifecycle-policy.json" -Encoding utf8

aws s3api put-bucket-lifecycle-configuration `
  --bucket $NEW_BUCKET `
  --lifecycle-configuration file://$env:TEMP/lifecycle-policy.json `
  --region $NEW_REGION

Write-Host "✓ Lifecycle policy configured" -ForegroundColor Green
Write-Host ""

Write-Host "Step 3: Checking if old bucket has any files..." -ForegroundColor Yellow
$fileList = aws s3 ls s3://$OLD_BUCKET --recursive --region $OLD_REGION 2>$null
$fileCount = if ($fileList) { ($fileList | Measure-Object).Count } else { 0 }

if ($fileCount -gt 0) {
  Write-Host "Found $fileCount files in old bucket" -ForegroundColor Yellow
  Write-Host "Copying files to new bucket..." -ForegroundColor Yellow
  aws s3 sync s3://$OLD_BUCKET s3://$NEW_BUCKET `
    --source-region $OLD_REGION `
    --region $NEW_REGION
  Write-Host "✓ Files copied" -ForegroundColor Green
} else {
  Write-Host "✓ Old bucket is empty (no files to copy)" -ForegroundColor Green
}
Write-Host ""

Write-Host "Step 4: Verifying new bucket..." -ForegroundColor Yellow
aws s3 ls s3://$NEW_BUCKET --region $NEW_REGION
Write-Host "✓ New bucket verified" -ForegroundColor Green
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Migration Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update your .env file:" -ForegroundColor White
Write-Host "   S3_AUDIO_BUCKET=$NEW_BUCKET" -ForegroundColor Cyan
Write-Host "   S3_REGION=$NEW_REGION" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Test the application" -ForegroundColor White
Write-Host ""
Write-Host "3. After verifying everything works, delete old bucket:" -ForegroundColor White
Write-Host "   aws s3 rb s3://$OLD_BUCKET --force --region $OLD_REGION" -ForegroundColor Cyan
Write-Host ""
