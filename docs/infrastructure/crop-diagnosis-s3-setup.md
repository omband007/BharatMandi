# Crop Diagnosis S3 Bucket Setup

This document describes the AWS S3 infrastructure setup for the Crop Disease Diagnosis feature.

## Overview

The Crop Disease Diagnosis feature uses AWS S3 to store crop images uploaded by farmers for AI-powered disease identification. The bucket is configured with:

- **Server-side encryption** (AES-256) for data security
- **2-year lifecycle policy** for automatic cleanup
- **CORS configuration** for web and mobile app access
- **Private access** with presigned URLs for secure image access

## Bucket Configuration

### Basic Information

- **Bucket Name**: `bharat-mandi-crop-diagnosis`
- **Region**: `ap-southeast-2` (Sydney)
- **Encryption**: AES-256 server-side encryption
- **Versioning**: Suspended (can be enabled if needed)
- **Public Access**: Blocked (using presigned URLs)

### Storage Structure

```
bharat-mandi-crop-diagnosis/
├── diagnoses/
│   ├── {userId}/
│   │   ├── {diagnosisId}/
│   │   │   ├── {timestamp}.jpg       # Original/compressed image
│   │   │   └── metadata.json         # Image metadata (optional)
│   │   └── ...
│   └── ...
└── expert-reviews/
    ├── {reviewId}/
    │   ├── annotated-{timestamp}.jpg # Expert-annotated images
    │   └── notes.txt
    └── ...
```

### Lifecycle Policy

The bucket has automatic lifecycle rules configured:

1. **Diagnosis Images**: Automatically deleted after 730 days (2 years)
   - Prefix: `diagnoses/`
   - Retention: 2 years
   
2. **Expert Reviews**: Automatically deleted after 730 days (2 years)
   - Prefix: `expert-reviews/`
   - Retention: 2 years

3. **Incomplete Uploads**: Aborted after 7 days
   - Cleans up failed multipart uploads
   - Prevents storage waste

### CORS Configuration

CORS is configured to allow access from:

- Production: `https://bharatmandi.com` and subdomains
- Development: `http://localhost:3000` and `http://localhost:8080`

**Allowed Methods**: GET, PUT, POST, DELETE  
**Allowed Headers**: All (*)  
**Max Age**: 3000 seconds

### Security Configuration

1. **Encryption**:
   - All objects encrypted at rest with AES-256
   - Automatic encryption on upload
   - No additional client-side encryption required

2. **Access Control**:
   - Public access blocked
   - Access via presigned URLs only
   - URLs valid for 24 hours
   - IAM-based service access

3. **IAM Permissions**:
   - PutObject: Upload images
   - GetObject: Retrieve images
   - DeleteObject: Remove images
   - ListBucket: List bucket contents

## Setup Instructions

### Prerequisites

1. AWS CLI installed and configured
2. AWS credentials with S3 and IAM permissions
3. Access to create S3 buckets in ap-southeast-2 region

### Automated Setup

#### Linux/macOS

```bash
# Make script executable
chmod +x scripts/setup-crop-diagnosis-s3.sh

# Run setup script
./scripts/setup-crop-diagnosis-s3.sh
```

#### Windows (PowerShell)

```powershell
# Run setup script
.\scripts\setup-crop-diagnosis-s3.ps1
```

### Manual Setup

If you prefer to set up manually or need to troubleshoot:

#### 1. Create Bucket

```bash
aws s3api create-bucket \
    --bucket bharat-mandi-crop-diagnosis \
    --region ap-southeast-2 \
    --create-bucket-configuration LocationConstraint=ap-southeast-2
```

#### 2. Enable Encryption

```bash
aws s3api put-bucket-encryption \
    --bucket bharat-mandi-crop-diagnosis \
    --server-side-encryption-configuration '{
        "Rules": [{
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            },
            "BucketKeyEnabled": false
        }]
    }'
```

#### 3. Configure Lifecycle Policy

```bash
aws s3api put-bucket-lifecycle-configuration \
    --bucket bharat-mandi-crop-diagnosis \
    --lifecycle-configuration file://scripts/crop-diagnosis-lifecycle.json
```

#### 4. Configure CORS

```bash
aws s3api put-bucket-cors \
    --bucket bharat-mandi-crop-diagnosis \
    --cors-configuration file://scripts/crop-diagnosis-cors.json
```

#### 5. Block Public Access

```bash
aws s3api put-public-access-block \
    --bucket bharat-mandi-crop-diagnosis \
    --public-access-block-configuration \
        "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### IAM Policy Setup

#### For EC2 Instance Role

If running on EC2, attach the IAM policy to the instance role:

```bash
# Create policy
aws iam create-policy \
    --policy-name CropDiagnosisS3Access \
    --policy-document file://scripts/crop-diagnosis-iam-policy.json

# Attach to role (replace ROLE_NAME with your EC2 instance role)
aws iam attach-role-policy \
    --role-name ROLE_NAME \
    --policy-arn arn:aws:iam::ACCOUNT_ID:policy/CropDiagnosisS3Access
```

#### For IAM User

If using IAM user credentials:

```bash
# Create policy
aws iam create-policy \
    --policy-name CropDiagnosisS3Access \
    --policy-document file://scripts/crop-diagnosis-iam-policy.json

# Attach to user (replace USER_NAME with your IAM user)
aws iam attach-user-policy \
    --user-name USER_NAME \
    --policy-arn arn:aws:iam::ACCOUNT_ID:policy/CropDiagnosisS3Access
```

## Environment Configuration

After setting up the S3 bucket, update your `.env` file:

```bash
# AWS S3 Configuration
S3_CROP_DIAGNOSIS_BUCKET=bharat-mandi-crop-diagnosis
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
```

## Testing

### Test Bucket Access

```bash
# List bucket (should be empty initially)
aws s3 ls s3://bharat-mandi-crop-diagnosis/

# Upload test file
echo "test" > test.txt
aws s3 cp test.txt s3://bharat-mandi-crop-diagnosis/test.txt

# Verify encryption
aws s3api head-object \
    --bucket bharat-mandi-crop-diagnosis \
    --key test.txt

# Should show: "ServerSideEncryption": "AES256"

# Clean up test file
aws s3 rm s3://bharat-mandi-crop-diagnosis/test.txt
rm test.txt
```

### Test from Application

```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getEnvironmentConfig } from './config/environment';

const config = getEnvironmentConfig();
const s3Client = new S3Client({
  region: 'ap-southeast-2',
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey
  }
});

// Test upload
const testUpload = async () => {
  const command = new PutObjectCommand({
    Bucket: config.aws.s3.cropDiagnosisBucket,
    Key: 'test/test-image.jpg',
    Body: Buffer.from('test'),
    ContentType: 'image/jpeg'
  });
  
  await s3Client.send(command);
  console.log('✓ Upload successful');
};

testUpload();
```

## Cost Estimation

### Storage Costs (ap-southeast-2)

- **S3 Standard Storage**: $0.025 per GB/month
- **PUT Requests**: $0.0055 per 1,000 requests
- **GET Requests**: $0.00044 per 1,000 requests
- **Data Transfer Out**: $0.114 per GB (first 10 TB)

### Example Monthly Cost (1000 diagnoses)

Assumptions:
- Average image size: 5 MB (after compression)
- 1000 diagnoses per month
- Each diagnosis: 1 PUT, 2 GETs (upload + 2 views)
- Average retention: 1 year

**Calculation**:
- Storage: 5 GB × $0.025 = $0.125/month
- PUT requests: 1,000 × $0.0055/1000 = $0.0055
- GET requests: 2,000 × $0.00044/1000 = $0.00088
- Data transfer: 10 GB × $0.114 = $1.14

**Total**: ~$1.27/month for 1000 diagnoses

## Monitoring

### CloudWatch Metrics

Monitor these S3 metrics in CloudWatch:

- **BucketSizeBytes**: Total storage used
- **NumberOfObjects**: Total object count
- **AllRequests**: Total request count
- **4xxErrors**: Client errors
- **5xxErrors**: Server errors

### Set Up Alarms

```bash
# Alert when storage exceeds 100 GB
aws cloudwatch put-metric-alarm \
    --alarm-name crop-diagnosis-storage-high \
    --alarm-description "Crop diagnosis storage exceeds 100 GB" \
    --metric-name BucketSizeBytes \
    --namespace AWS/S3 \
    --statistic Average \
    --period 86400 \
    --evaluation-periods 1 \
    --threshold 107374182400 \
    --comparison-operator GreaterThanThreshold \
    --dimensions Name=BucketName,Value=bharat-mandi-crop-diagnosis Name=StorageType,Value=StandardStorage
```

## Troubleshooting

### Common Issues

#### 1. Access Denied Errors

**Symptom**: `AccessDenied` when uploading/downloading

**Solution**:
- Verify IAM policy is attached
- Check AWS credentials in `.env`
- Ensure bucket name is correct
- Verify region matches (ap-southeast-2)

#### 2. CORS Errors

**Symptom**: Browser blocks requests with CORS error

**Solution**:
- Verify CORS configuration: `aws s3api get-bucket-cors --bucket bharat-mandi-crop-diagnosis`
- Check origin matches allowed origins
- Ensure credentials mode is correct in fetch/axios

#### 3. Encryption Not Applied

**Symptom**: Objects uploaded without encryption

**Solution**:
- Verify bucket encryption: `aws s3api get-bucket-encryption --bucket bharat-mandi-crop-diagnosis`
- Re-apply encryption configuration
- Check if client is overriding encryption settings

#### 4. Lifecycle Policy Not Working

**Symptom**: Old objects not being deleted

**Solution**:
- Verify lifecycle policy: `aws s3api get-bucket-lifecycle-configuration --bucket bharat-mandi-crop-diagnosis`
- Check object prefixes match policy
- Wait 24-48 hours for policy to take effect
- Use S3 Inventory to track object ages

## Maintenance

### Regular Tasks

1. **Monthly**: Review storage usage and costs
2. **Quarterly**: Audit IAM permissions
3. **Yearly**: Review lifecycle policies and retention periods

### Backup Strategy

While S3 provides 99.999999999% durability, consider:

1. **Cross-Region Replication** (optional):
   - Replicate to another region for disaster recovery
   - Adds cost but provides additional protection

2. **Versioning** (optional):
   - Enable versioning for accidental deletion protection
   - Increases storage costs

## Security Best Practices

1. **Use IAM Roles**: Prefer IAM roles over access keys when possible
2. **Rotate Credentials**: Rotate access keys every 90 days
3. **Monitor Access**: Enable S3 access logging
4. **Least Privilege**: Grant minimum required permissions
5. **Presigned URLs**: Always use time-limited presigned URLs
6. **Audit Logs**: Enable CloudTrail for S3 API calls

## References

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [S3 Encryption](https://docs.aws.amazon.com/AmazonS3/latest/userguide/serv-side-encryption.html)
- [S3 Lifecycle Policies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)
- [S3 CORS Configuration](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cors.html)
- [S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)

## Support

For issues or questions:
1. Check CloudWatch logs for errors
2. Review IAM permissions
3. Verify environment configuration
4. Contact AWS Support if needed
