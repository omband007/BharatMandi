#!/bin/bash

# Setup script for Crop Diagnosis S3 bucket
# Creates S3 bucket with encryption, lifecycle policy, and CORS configuration

set -e

BUCKET_NAME="bharat-mandi-crop-diagnosis"
REGION="ap-southeast-2"

echo "Setting up Crop Diagnosis S3 bucket..."
echo "Bucket: $BUCKET_NAME"
echo "Region: $REGION"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if bucket already exists
if aws s3 ls "s3://$BUCKET_NAME" 2>&1 | grep -q 'NoSuchBucket'; then
    echo "✓ Bucket does not exist, creating..."
    
    # Create S3 bucket
    aws s3api create-bucket \
        --bucket "$BUCKET_NAME" \
        --region "$REGION" \
        --create-bucket-configuration LocationConstraint="$REGION"
    
    echo "✓ Bucket created successfully"
else
    echo "✓ Bucket already exists"
fi

# Enable server-side encryption (AES-256)
echo "Configuring server-side encryption..."
aws s3api put-bucket-encryption \
    --bucket "$BUCKET_NAME" \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            },
            "BucketKeyEnabled": false
        }]
    }'
echo "✓ Server-side encryption enabled (AES-256)"

# Configure lifecycle policy for 2-year retention
echo "Configuring lifecycle policy..."
aws s3api put-bucket-lifecycle-configuration \
    --bucket "$BUCKET_NAME" \
    --lifecycle-configuration file://scripts/crop-diagnosis-lifecycle.json
echo "✓ Lifecycle policy configured (2-year retention)"

# Configure CORS for web/mobile access
echo "Configuring CORS..."
aws s3api put-bucket-cors \
    --bucket "$BUCKET_NAME" \
    --cors-configuration file://scripts/crop-diagnosis-cors.json
echo "✓ CORS configured"

# Block public access (images will use presigned URLs)
echo "Configuring public access block..."
aws s3api put-public-access-block \
    --bucket "$BUCKET_NAME" \
    --public-access-block-configuration \
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
echo "✓ Public access blocked (using presigned URLs)"

# Enable versioning (optional, for data protection)
echo "Enabling versioning..."
aws s3api put-bucket-versioning \
    --bucket "$BUCKET_NAME" \
    --versioning-configuration Status=Suspended
echo "✓ Versioning suspended (can be enabled if needed)"

echo ""
echo "=========================================="
echo "S3 Bucket Setup Complete!"
echo "=========================================="
echo "Bucket Name: $BUCKET_NAME"
echo "Region: $REGION"
echo "Encryption: AES-256"
echo "Lifecycle: 2-year retention"
echo "CORS: Enabled for web/mobile"
echo "Public Access: Blocked (presigned URLs)"
echo ""
echo "Next steps:"
echo "1. Update .env file with: S3_CROP_DIAGNOSIS_BUCKET=$BUCKET_NAME"
echo "2. Ensure IAM user/role has permissions from crop-diagnosis-iam-policy.json"
echo "3. Test bucket access with: aws s3 ls s3://$BUCKET_NAME"
echo ""
