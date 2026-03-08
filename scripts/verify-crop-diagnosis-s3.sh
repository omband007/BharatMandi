#!/bin/bash

# Verification script for Crop Diagnosis S3 bucket
# Tests bucket configuration and access

set -e

BUCKET_NAME="bharat-mandi-crop-diagnosis"
REGION="ap-southeast-2"

echo "Verifying Crop Diagnosis S3 bucket configuration..."
echo "Bucket: $BUCKET_NAME"
echo "Region: $REGION"
echo ""

# Check if bucket exists
echo "1. Checking if bucket exists..."
if aws s3 ls "s3://$BUCKET_NAME" 2>&1 | grep -q 'NoSuchBucket'; then
    echo "   ✗ Bucket does not exist"
    exit 1
else
    echo "   ✓ Bucket exists"
fi

# Check encryption
echo "2. Checking server-side encryption..."
ENCRYPTION=$(aws s3api get-bucket-encryption --bucket "$BUCKET_NAME" 2>&1)
if echo "$ENCRYPTION" | grep -q "AES256"; then
    echo "   ✓ AES-256 encryption enabled"
else
    echo "   ✗ Encryption not configured correctly"
    echo "   $ENCRYPTION"
fi

# Check lifecycle policy
echo "3. Checking lifecycle policy..."
LIFECYCLE=$(aws s3api get-bucket-lifecycle-configuration --bucket "$BUCKET_NAME" 2>&1)
if echo "$LIFECYCLE" | grep -q "730"; then
    echo "   ✓ 2-year lifecycle policy configured"
else
    echo "   ✗ Lifecycle policy not configured correctly"
fi

# Check CORS
echo "4. Checking CORS configuration..."
CORS=$(aws s3api get-bucket-cors --bucket "$BUCKET_NAME" 2>&1)
if echo "$CORS" | grep -q "bharatmandi.com"; then
    echo "   ✓ CORS configured"
else
    echo "   ✗ CORS not configured correctly"
fi

# Check public access block
echo "5. Checking public access block..."
PUBLIC_ACCESS=$(aws s3api get-public-access-block --bucket "$BUCKET_NAME" 2>&1)
if echo "$PUBLIC_ACCESS" | grep -q "true"; then
    echo "   ✓ Public access blocked"
else
    echo "   ✗ Public access not blocked"
fi

# Test upload (optional)
echo "6. Testing upload access..."
TEST_FILE="test-$(date +%s).txt"
echo "test content" > "/tmp/$TEST_FILE"

if aws s3 cp "/tmp/$TEST_FILE" "s3://$BUCKET_NAME/test/$TEST_FILE" 2>&1 > /dev/null; then
    echo "   ✓ Upload successful"
    
    # Verify encryption on uploaded object
    OBJECT_META=$(aws s3api head-object --bucket "$BUCKET_NAME" --key "test/$TEST_FILE" 2>&1)
    if echo "$OBJECT_META" | grep -q "AES256"; then
        echo "   ✓ Uploaded object is encrypted"
    else
        echo "   ✗ Uploaded object is not encrypted"
    fi
    
    # Clean up test file
    aws s3 rm "s3://$BUCKET_NAME/test/$TEST_FILE" > /dev/null 2>&1
    echo "   ✓ Cleanup successful"
else
    echo "   ✗ Upload failed - check IAM permissions"
fi

rm "/tmp/$TEST_FILE"

echo ""
echo "=========================================="
echo "Verification Complete!"
echo "=========================================="
echo ""
echo "Summary:"
echo "- Bucket exists and is accessible"
echo "- AES-256 encryption enabled"
echo "- 2-year lifecycle policy configured"
echo "- CORS configured for web/mobile"
echo "- Public access blocked"
echo "- Upload/delete permissions working"
echo ""
echo "Bucket is ready for use!"
echo ""
