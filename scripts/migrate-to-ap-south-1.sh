#!/bin/bash

# AWS Region Migration Script: ap-southeast-2 → ap-south-1
# This script migrates your S3 bucket to the new region

set -e  # Exit on error

echo "=========================================="
echo "AWS Region Migration: ap-southeast-2 → ap-south-1"
echo "=========================================="
echo ""

# Configuration
OLD_REGION="ap-southeast-2"
NEW_REGION="ap-south-1"
OLD_BUCKET="bharat-mandi-voice-temp"
NEW_BUCKET="bharat-mandi-voice-ap-south-1"

echo "Step 1: Creating new S3 bucket in ap-south-1..."
aws s3 mb s3://$NEW_BUCKET --region $NEW_REGION

echo "✓ Bucket created: $NEW_BUCKET"
echo ""

echo "Step 2: Setting up bucket lifecycle policy (delete files after 7 days)..."
cat > /tmp/lifecycle-policy.json << 'EOF'
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
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket $NEW_BUCKET \
  --lifecycle-configuration file:///tmp/lifecycle-policy.json \
  --region $NEW_REGION

echo "✓ Lifecycle policy configured"
echo ""

echo "Step 3: Checking if old bucket has any files..."
FILE_COUNT=$(aws s3 ls s3://$OLD_BUCKET --recursive --region $OLD_REGION | wc -l)

if [ $FILE_COUNT -gt 0 ]; then
  echo "Found $FILE_COUNT files in old bucket"
  echo "Copying files to new bucket..."
  aws s3 sync s3://$OLD_BUCKET s3://$NEW_BUCKET \
    --source-region $OLD_REGION \
    --region $NEW_REGION
  echo "✓ Files copied"
else
  echo "✓ Old bucket is empty (no files to copy)"
fi
echo ""

echo "Step 4: Verifying new bucket..."
aws s3 ls s3://$NEW_BUCKET --region $NEW_REGION
echo "✓ New bucket verified"
echo ""

echo "=========================================="
echo "Migration Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Update your .env file:"
echo "   S3_AUDIO_BUCKET=$NEW_BUCKET"
echo "   S3_REGION=$NEW_REGION"
echo ""
echo "2. Test the application"
echo ""
echo "3. After verifying everything works, delete old bucket:"
echo "   aws s3 rb s3://$OLD_BUCKET --force --region $OLD_REGION"
echo ""
