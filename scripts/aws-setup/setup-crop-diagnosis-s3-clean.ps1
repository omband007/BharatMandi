# PowerShell script for Windows
# Setup script for Crop Diagnosis S3 bucket
# Creates S3 bucket with encryption, lifecycle policy, and CORS configuration

$ErrorActionPreference = "Stop"

$BUCKET_NAME = "bharat-mandi-crop-diagnosis"
$REGION = "ap-southeast-2"

Write-Host "Setting up Crop Diagnosis S3 bucket..." -ForegroundColor Cyan
Write-Host "Bucket: $BUCKET_NAME"
Write-Host "Region: $REGION"
Write-Host ""

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
} catch {
    Write-Host "Error: AWS CLI is not installed. Please install it first." -ForegroundColor Red
    exit 1
}

# Check if bucket already exists
Write-Host "Checking if bucket exists..." -ForegroundColor Yellow
$bucketExists = $false
try {
    aws s3 ls "s3://$BUCKET_NAME" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $bucketExists = $true
        Write-Host "[OK] Bucket already exists" -ForegroundColor Green
    }
} catch {
    # Bucket doesn't exist
}

if (-not $bucketExists) {
    Write-Host "[INFO] Bucket does not exist, creating..." -ForegroundColor Yellow
    
    # Create S3 bucket
    aws s3api create-bucket `
        --bucket "$BUCKET_NAME" `
        --region "$REGION" `
        --create-bucket-configuration LocationConstraint="$REGION"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Bucket created successfully" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to create bucket" -ForegroundColor Red
        exit 1
    }
}

# Enable server-side encryption (AES-256)
Write-Host "Configuring server-side encryption..." -ForegroundColor Yellow
aws s3api put-bucket-encryption `
    --bucket "$BUCKET_NAME" `
    --server-side-encryption-configuration '{\"Rules\": [{\"ApplyServerSideEncryptionByDefault\": {\"SSEAlgorithm\": \"AES256\"},\"BucketKeyEnabled\": false}]}'

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Server-side encryption enabled (AES-256)" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to configure encryption" -ForegroundColor Red
    exit 1
}

# Configure lifecycle policy for 2-year retention
Write-Host "Configuring lifecycle policy..." -ForegroundColor Yellow
aws s3api put-bucket-lifecycle-configuration `
    --bucket "$BUCKET_NAME" `
    --lifecycle-configuration file://scripts/crop-diagnosis-lifecycle.json

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Lifecycle policy configured (2-year retention)" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to configure lifecycle policy" -ForegroundColor Red
    exit 1
}

# Configure CORS for web/mobile access
Write-Host "Configuring CORS..." -ForegroundColor Yellow
aws s3api put-bucket-cors `
    --bucket "$BUCKET_NAME" `
    --cors-configuration file://scripts/crop-diagnosis-cors.json

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] CORS configured" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to configure CORS" -ForegroundColor Red
    exit 1
}

# Block public access (images will use presigned URLs)
Write-Host "Configuring public access block..." -ForegroundColor Yellow
aws s3api put-public-access-block `
    --bucket "$BUCKET_NAME" `
    --public-access-block-configuration `
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Public access blocked (using presigned URLs)" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to configure public access block" -ForegroundColor Red
    exit 1
}

# Enable versioning (suspended by default)
Write-Host "Configuring versioning..." -ForegroundColor Yellow
aws s3api put-bucket-versioning `
    --bucket "$BUCKET_NAME" `
    --versioning-configuration Status=Suspended

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Versioning suspended (can be enabled if needed)" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Failed to configure versioning" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "S3 Bucket Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Bucket Name: $BUCKET_NAME"
Write-Host "Region: $REGION"
Write-Host "Encryption: AES-256"
Write-Host "Lifecycle: 2-year retention"
Write-Host "CORS: Enabled for web/mobile"
Write-Host "Public Access: Blocked (presigned URLs)"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Update .env file with: S3_CROP_DIAGNOSIS_BUCKET=$BUCKET_NAME"
Write-Host "2. Ensure IAM user/role has permissions from crop-diagnosis-iam-policy.json"
Write-Host "3. Test bucket access with: aws s3 ls s3://$BUCKET_NAME"
Write-Host ""
