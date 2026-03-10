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
try {
    aws s3 ls "s3://$BUCKET_NAME" 2>&1 | Out-Null
    Write-Host "✓ Bucket already exists" -ForegroundColor Green
} catch {
    Write-Host "✓ Bucket does not exist, creating..." -ForegroundColor Yellow
    
    # Create S3 bucket
    aws s3api create-bucket `
        --bucket "$BUCKET_NAME" `
        --region "$REGION" `
        --create-bucket-configuration LocationConstraint="$REGION"
    
    Write-Host "✓ Bucket created successfully" -ForegroundColor Green
}

# Enable server-side encryption (AES-256)
Write-Host "Configuring server-side encryption..." -ForegroundColor Yellow
aws s3api put-bucket-encryption `
    --bucket "$BUCKET_NAME" `
    --server-side-encryption-configuration '{
        \"Rules\": [{
            \"ApplyServerSideEncryptionByDefault\": {
                \"SSEAlgorithm\": \"AES256\"
            },
            \"BucketKeyEnabled\": false
        }]
    }'
Write-Host "✓ Server-side encryption enabled (AES-256)" -ForegroundColor Green

# Configure lifecycle policy for 2-year retention
Write-Host "Configuring lifecycle policy..." -ForegroundColor Yellow
aws s3api put-bucket-lifecycle-configuration `
    --bucket "$BUCKET_NAME" `
    --lifecycle-configuration file://scripts/crop-diagnosis-lifecycle.json
Write-Host "✓ Lifecycle policy configured (2-year retention)" -ForegroundColor Green

# Configure CORS for web/mobile access
Write-Host "Configuring CORS..." -ForegroundColor Yellow
aws s3api put-bucket-cors `
    --bucket "$BUCKET_NAME" `
    --cors-configuration file://scripts/crop-diagnosis-cors.json
Write-Host "✓ CORS configured" -ForegroundColor Green

# Block public access (images will use presigned URLs)
Write-Host "Configuring public access block..." -ForegroundColor Yellow
aws s3api put-public-access-block `
    --bucket "$BUCKET_NAME" `
    --public-access-block-configuration `
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
Write-Host "✓ Public access blocked (using presigned URLs)" -ForegroundColor Green

# Enable versioning (optional, for data protection)
Write-Host "Enabling versioning..." -ForegroundColor Yellow
aws s3api put-bucket-versioning `
    --bucket "$BUCKET_NAME" `
    --versioning-configuration Status=Suspended
Write-Host "✓ Versioning suspended (can be enabled if needed)" -ForegroundColor Green

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
