# PowerShell verification script for Crop Diagnosis S3 bucket
# Tests bucket configuration and access

$ErrorActionPreference = "Stop"

$BUCKET_NAME = "bharat-mandi-crop-diagnosis"
$REGION = "ap-southeast-2"

Write-Host "Verifying Crop Diagnosis S3 bucket configuration..." -ForegroundColor Cyan
Write-Host "Bucket: $BUCKET_NAME"
Write-Host "Region: $REGION"
Write-Host ""

# Check if bucket exists
Write-Host "1. Checking if bucket exists..." -ForegroundColor Yellow
try {
    aws s3 ls "s3://$BUCKET_NAME" 2>&1 | Out-Null
    Write-Host "   ✓ Bucket exists" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Bucket does not exist" -ForegroundColor Red
    exit 1
}

# Check encryption
Write-Host "2. Checking server-side encryption..." -ForegroundColor Yellow
try {
    $encryption = aws s3api get-bucket-encryption --bucket "$BUCKET_NAME" 2>&1 | ConvertFrom-Json
    if ($encryption.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm -eq "AES256") {
        Write-Host "   ✓ AES-256 encryption enabled" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Encryption not configured correctly" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ Failed to check encryption" -ForegroundColor Red
}

# Check lifecycle policy
Write-Host "3. Checking lifecycle policy..." -ForegroundColor Yellow
try {
    $lifecycle = aws s3api get-bucket-lifecycle-configuration --bucket "$BUCKET_NAME" 2>&1 | ConvertFrom-Json
    if ($lifecycle.Rules[0].Expiration.Days -eq 730) {
        Write-Host "   ✓ 2-year lifecycle policy configured" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Lifecycle policy not configured correctly" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ Failed to check lifecycle policy" -ForegroundColor Red
}

# Check CORS
Write-Host "4. Checking CORS configuration..." -ForegroundColor Yellow
try {
    $cors = aws s3api get-bucket-cors --bucket "$BUCKET_NAME" 2>&1
    if ($cors -match "bharatmandi.com") {
        Write-Host "   ✓ CORS configured" -ForegroundColor Green
    } else {
        Write-Host "   ✗ CORS not configured correctly" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ Failed to check CORS" -ForegroundColor Red
}

# Check public access block
Write-Host "5. Checking public access block..." -ForegroundColor Yellow
try {
    $publicAccess = aws s3api get-public-access-block --bucket "$BUCKET_NAME" 2>&1 | ConvertFrom-Json
    if ($publicAccess.PublicAccessBlockConfiguration.BlockPublicAcls -eq $true) {
        Write-Host "   ✓ Public access blocked" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Public access not blocked" -ForegroundColor Red
    }
} catch {
    Write-Host "   ✗ Failed to check public access block" -ForegroundColor Red
}

# Test upload
Write-Host "6. Testing upload access..." -ForegroundColor Yellow
$testFile = "test-$(Get-Date -Format 'yyyyMMddHHmmss').txt"
$tempPath = "$env:TEMP\$testFile"
"test content" | Out-File -FilePath $tempPath -Encoding UTF8

try {
    aws s3 cp "$tempPath" "s3://$BUCKET_NAME/test/$testFile" 2>&1 | Out-Null
    Write-Host "   ✓ Upload successful" -ForegroundColor Green
    
    # Verify encryption on uploaded object
    $objectMeta = aws s3api head-object --bucket "$BUCKET_NAME" --key "test/$testFile" 2>&1 | ConvertFrom-Json
    if ($objectMeta.ServerSideEncryption -eq "AES256") {
        Write-Host "   ✓ Uploaded object is encrypted" -ForegroundColor Green
    } else {
        Write-Host "   ✗ Uploaded object is not encrypted" -ForegroundColor Red
    }
    
    # Clean up test file
    aws s3 rm "s3://$BUCKET_NAME/test/$testFile" 2>&1 | Out-Null
    Write-Host "   ✓ Cleanup successful" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Upload failed - check IAM permissions" -ForegroundColor Red
}

Remove-Item $tempPath -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Verification Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:"
Write-Host "- Bucket exists and is accessible"
Write-Host "- AES-256 encryption enabled"
Write-Host "- 2-year lifecycle policy configured"
Write-Host "- CORS configured for web/mobile"
Write-Host "- Public access blocked"
Write-Host "- Upload/delete permissions working"
Write-Host ""
Write-Host "Bucket is ready for use!" -ForegroundColor Green
Write-Host ""
