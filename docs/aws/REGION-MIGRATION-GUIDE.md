# AWS Region Migration Guide: ap-southeast-2 → ap-south-1

## Overview

This guide helps you migrate from **ap-southeast-2 (Sydney)** to **ap-south-1 (Mumbai)** for better performance with Indian users.

## Why ap-south-1 (Mumbai)?

- **Lower latency** for Indian farmers (primary users)
- **Better user experience** for voice and translation features
- **Cost optimization** for India-focused traffic
- **Regulatory compliance** for data localization (if needed in future)

## What's Already Updated ✅

1. `.env` file - `AWS_REGION=ap-south-1`
2. All documentation references ap-south-1
3. Application code uses environment variable (no code changes needed)

---

## IMPORTANT: IAM Users vs Resources

### What DOESN'T Need Migration (Global Resources)

✅ **IAM Users** - Global, work in all regions
✅ **IAM Roles** - Global, work in all regions
✅ **IAM Policies** - Global, work in all regions
✅ **AWS Credits** - Account-level, work in all regions
✅ **Billing** - Account-level, consolidated across regions

**You do NOT need to recreate or migrate IAM users!**

### What DOES Need Migration (Regional Resources)

🔄 **S3 Buckets** - Region-specific
🔄 **ElastiCache/Redis** - Region-specific
🔄 **AWS Lex Bots** - Region-specific
🔄 **Lambda Functions** - Region-specific (if you have any)
🔄 **RDS Databases** - Region-specific (if you have any)

---

## Pre-Migration: Inventory Your Resources

### Step 1: Check What You Have in ap-southeast-2

Run these commands to see your existing resources:

```bash
# Set region variable for convenience
export OLD_REGION=ap-southeast-2
export NEW_REGION=ap-south-1

# List S3 buckets (buckets are global, but have a region)
aws s3api list-buckets --query "Buckets[*].[Name,CreationDate]" --output table

# Check which region each bucket is in
aws s3api get-bucket-location --bucket YOUR_BUCKET_NAME

# List IAM users (global - no migration needed)
aws iam list-users --query "Users[*].[UserName,CreateDate]" --output table

# List ElastiCache clusters
aws elasticache describe-cache-clusters --region $OLD_REGION --query "CacheClusters[*].[CacheClusterId,CacheNodeType,Engine]" --output table

# List Lambda functions (if any)
aws lambda list-functions --region $OLD_REGION --query "Functions[*].[FunctionName,Runtime]" --output table

# List RDS instances (if any)
aws rds describe-db-instances --region $OLD_REGION --query "DBInstances[*].[DBInstanceIdentifier,Engine,DBInstanceClass]" --output table
```

### Step 2: Document Your Current Setup

Create a checklist of what you have:

```
□ S3 Buckets:
  □ Bucket name: _________________ (Region: _______)
  □ Bucket name: _________________ (Region: _______)

□ IAM Users: (No migration needed - just verify they exist)
  □ User: _________________ (Access Key: _______)
  □ User: _________________ (Access Key: _______)

□ ElastiCache/Redis:
  □ Cluster: _________________ (Node type: _______)

□ Lambda Functions:
  □ Function: _________________ (Runtime: _______)

□ RDS Databases:
  □ Database: _________________ (Engine: _______)

□ Other Services:
  □ Service: _________________ (Details: _______)
```

---

## Migration Steps

### STEP 1: IAM Users & Credentials (No Migration Needed!)

**Good news**: IAM is global, so your users already work in ap-south-1!

**Verify your IAM setup:**

```bash
# List your IAM users
aws iam list-users

# Check your current credentials
aws sts get-caller-identity

# Verify permissions (should show your user ARN)
aws iam get-user
```

**What to check:**
- ✅ Your IAM user exists (it will)
- ✅ Your access keys work (they will)
- ✅ Your permissions apply to all regions (they do)

**Action required**: ❌ None! Your IAM users work everywhere.

---

### STEP 2: Update Environment Variables

Already done! Your `.env` now has:
```bash
AWS_REGION=ap-south-1
LEX_REGION=ap-south-1
```

**Verify your .env file has:**
```bash
# AWS Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# AWS Lex Configuration
LEX_BOT_ID=your_lex_bot_id_here
LEX_BOT_ALIAS_ID=your_lex_bot_alias_id_here
LEX_REGION=ap-south-1
```

---

### STEP 3: Migrate S3 Buckets

### Step 3: Migrate S3 Buckets (If Any Exist)

If you have S3 buckets in ap-southeast-2:

**Option A: Create new buckets in ap-south-1**
```bash
# Create new bucket in ap-south-1
aws s3 mb s3://bharat-mandi-audio-ap-south-1 --region ap-south-1
aws s3 mb s3://bharat-mandi-media-ap-south-1 --region ap-south-1

# Copy data from old bucket (if needed)
aws s3 sync s3://old-bucket-name s3://new-bucket-name --source-region ap-southeast-2 --region ap-south-1
```

**Option B: Start fresh (recommended for development)**
- Just create new buckets in ap-south-1
- No need to copy development data

### Step 4: Create AWS Lex Bot in ap-south-1

Follow the quick start guide, but make sure you're in **ap-south-1** region:

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. **Important**: Select **ap-south-1 (Mumbai)** from region dropdown (top right)
3. Search for "Lex" and click "Amazon Lex"
4. Follow: `docs/aws/LEX-BOT-SETUP-QUICKSTART.md`

### Step 5: Update S3 Bucket Names (If Changed)

If you created new S3 buckets with different names, update your `.env`:

```bash
# Add these if you're using S3
S3_AUDIO_BUCKET=bharat-mandi-audio-ap-south-1
S3_MEDIA_BUCKET=bharat-mandi-media-ap-south-1
```

### Step 6: Test Everything

```bash
# Test AWS connection
node scripts/test-lex-connection.js

# Start server
npm run dev

# Test Kisan Mitra
# Open: http://localhost:3000/kisan-mitra-test.html
```

## What About Existing Resources in ap-southeast-2?

### If You Have Resources There:

**Development/Testing Resources:**
- Safe to delete after migration
- No production data to worry about

**How to Clean Up:**
```bash
# Delete S3 buckets (after copying data if needed)
aws s3 rb s3://bucket-name --force --region ap-southeast-2

# Delete ElastiCache clusters (if any)
aws elasticache delete-cache-cluster --cache-cluster-id cluster-name --region ap-southeast-2
```

### If You Haven't Created Any Resources Yet:

Perfect! Just proceed with ap-south-1 for everything going forward.

## IAM Permissions (No Changes Needed)

IAM is **global** - your IAM users, roles, and policies work in all regions. No changes needed.

## Cost Implications

**Good news**: Pricing is similar between regions, with ap-south-1 often being slightly cheaper for:
- AWS Translate
- AWS Transcribe
- AWS Polly
- AWS Lex

## Verification Checklist

After migration, verify:

- [ ] `.env` has `AWS_REGION=ap-south-1`
- [ ] AWS Lex bot created in ap-south-1
- [ ] S3 buckets (if any) are in ap-south-1
- [ ] Test script passes: `node scripts/test-lex-connection.js`
- [ ] Kisan Mitra works in live mode
- [ ] Voice transcription works (if tested)
- [ ] Translation works (if tested)

## Troubleshooting

### Error: "Bucket does not exist"
- Create new S3 buckets in ap-south-1
- Update bucket names in `.env`

### Error: "Bot not found"
- Verify you created Lex bot in ap-south-1
- Check region in AWS Console (top right)

### Error: "Access Denied"
- IAM permissions are global, so this shouldn't happen
- If it does, check IAM policy has correct permissions

## Summary

✅ **What's done**: `.env` updated to ap-south-1
🔧 **What you need to do**: Create AWS Lex bot in ap-south-1 region
📝 **Follow**: `docs/aws/LEX-BOT-SETUP-QUICKSTART.md` (make sure you're in ap-south-1)

## Next Steps

1. Open AWS Console
2. **Select ap-south-1 (Mumbai) region** (top right dropdown)
3. Follow the Lex setup guide
4. Test with `node scripts/test-lex-connection.js`

---

**Migration Status**: Configuration updated, ready to create resources in ap-south-1
**Estimated Time**: 5 minutes (if no existing resources) to 30 minutes (if migrating data)
**Difficulty**: Easy


#### Option A: Create New Buckets in ap-south-1 (Recommended)

**For audio files (voice transcription):**
```bash
# Create new bucket
aws s3 mb s3://bharat-mandi-audio-ap-south-1 --region ap-south-1

# Set bucket policy for public read (if needed)
aws s3api put-bucket-policy --bucket bharat-mandi-audio-ap-south-1 --policy file://bucket-policy.json --region ap-south-1

# Enable versioning (optional)
aws s3api put-bucket-versioning --bucket bharat-mandi-audio-ap-south-1 --versioning-configuration Status=Enabled --region ap-south-1

# Set lifecycle policy to delete old files after 7 days
cat > lifecycle-policy.json << 'EOF'
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

aws s3api put-bucket-lifecycle-configuration --bucket bharat-mandi-audio-ap-south-1 --lifecycle-configuration file://lifecycle-policy.json --region ap-south-1
```

**For media files (listing images):**
```bash
# Create media bucket
aws s3 mb s3://bharat-mandi-media-ap-south-1 --region ap-south-1

# Enable public read access for images
aws s3api put-bucket-policy --bucket bharat-mandi-media-ap-south-1 --policy '{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bharat-mandi-media-ap-south-1/*"
    }
  ]
}' --region ap-south-1
```

#### Option B: Copy Data from Old Buckets

**If you have important data in ap-southeast-2 buckets:**

```bash
# List your existing buckets
aws s3 ls

# Copy entire bucket contents
aws s3 sync s3://old-bucket-name s3://bharat-mandi-audio-ap-south-1 --source-region ap-southeast-2 --region ap-south-1

# Or copy specific folders
aws s3 sync s3://old-bucket-name/audio/ s3://bharat-mandi-audio-ap-south-1/audio/ --source-region ap-southeast-2 --region ap-south-1
```

#### Update .env with New Bucket Names

Add these to your `.env` file:
```bash
# S3 Configuration
S3_AUDIO_BUCKET=bharat-mandi-audio-ap-south-1
S3_MEDIA_BUCKET=bharat-mandi-media-ap-south-1
S3_REGION=ap-south-1
```

---

### STEP 4: Migrate ElastiCache/Redis (If You Have It)

#### Check if you have ElastiCache in ap-southeast-2:
```bash
aws elasticache describe-cache-clusters --region ap-southeast-2
```

#### Create New Redis Cluster in ap-south-1:

**Option A: Using AWS Console**
1. Go to [ElastiCache Console](https://console.aws.amazon.com/elasticache/)
2. Select **ap-south-1** region (top right)
3. Click **"Create"** → **"Redis cluster"**
4. Configuration:
   - **Cluster name**: `bharat-mandi-redis`
   - **Node type**: `cache.t3.micro` (free tier eligible)
   - **Number of replicas**: 0 (for development)
   - **Subnet group**: Default VPC
   - **Security group**: Create new or use default
5. Click **"Create"**

**Option B: Using AWS CLI**
```bash
# Create Redis cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id bharat-mandi-redis \
  --cache-node-type cache.t3.micro \
  --engine redis \
  --num-cache-nodes 1 \
  --region ap-south-1

# Wait for cluster to be available (takes 5-10 minutes)
aws elasticache describe-cache-clusters \
  --cache-cluster-id bharat-mandi-redis \
  --region ap-south-1 \
  --query "CacheClusters[0].CacheClusterStatus"

# Get endpoint
aws elasticache describe-cache-clusters \
  --cache-cluster-id bharat-mandi-redis \
  --show-cache-node-info \
  --region ap-south-1 \
  --query "CacheClusters[0].CacheNodes[0].Endpoint"
```

#### Update .env with New Redis Endpoint:
```bash
# Redis Configuration
REDIS_HOST=your-redis-endpoint.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

#### Migrate Data (If Needed):

**For development**: Start fresh (no migration needed)

**For production**: Use Redis replication or export/import:
```bash
# Export from old cluster
redis-cli -h old-endpoint.cache.amazonaws.com --rdb dump.rdb

# Import to new cluster
redis-cli -h new-endpoint.cache.amazonaws.com --pipe < dump.rdb
```

---

### STEP 5: Create AWS Lex Bot in ap-south-1

**This is a new resource - no migration, just creation:**

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. **Select ap-south-1 (Mumbai)** region (top right)
3. Search for "Lex" and click "Amazon Lex"
4. Follow: `docs/aws/LEX-BOT-SETUP-QUICKSTART.md`

**After creating the bot:**
```bash
# Update .env with bot IDs
LEX_BOT_ID=your_new_bot_id
LEX_BOT_ALIAS_ID=your_new_alias_id
LEX_REGION=ap-south-1
```

---

### STEP 6: Migrate Lambda Functions (If You Have Any)

#### Check for Lambda functions:
```bash
aws lambda list-functions --region ap-southeast-2
```

#### Migrate Lambda Functions:

**For each function:**

1. **Download function code:**
```bash
# Get function details
aws lambda get-function --function-name your-function-name --region ap-southeast-2

# Download code
aws lambda get-function --function-name your-function-name --region ap-southeast-2 --query 'Code.Location' --output text | xargs wget -O function.zip
```

2. **Create function in ap-south-1:**
```bash
# Create function
aws lambda create-function \
  --function-name your-function-name \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --region ap-south-1

# Update environment variables (if any)
aws lambda update-function-configuration \
  --function-name your-function-name \
  --environment Variables={KEY1=value1,KEY2=value2} \
  --region ap-south-1
```

---

### STEP 7: Migrate RDS Databases (If You Have Any)

#### Check for RDS instances:
```bash
aws rds describe-db-instances --region ap-southeast-2
```

#### Migrate RDS:

**Option A: Create Snapshot and Restore**
```bash
# Create snapshot in ap-southeast-2
aws rds create-db-snapshot \
  --db-instance-identifier your-db-instance \
  --db-snapshot-identifier migration-snapshot \
  --region ap-southeast-2

# Wait for snapshot to complete
aws rds wait db-snapshot-completed \
  --db-snapshot-identifier migration-snapshot \
  --region ap-southeast-2

# Copy snapshot to ap-south-1
aws rds copy-db-snapshot \
  --source-db-snapshot-identifier arn:aws:rds:ap-southeast-2:ACCOUNT_ID:snapshot:migration-snapshot \
  --target-db-snapshot-identifier migration-snapshot \
  --region ap-south-1

# Restore in ap-south-1
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier your-db-instance-new \
  --db-snapshot-identifier migration-snapshot \
  --region ap-south-1
```

**Option B: Use PostgreSQL Dump (For PostgreSQL)**
```bash
# Export from old database
pg_dump -h old-endpoint.rds.amazonaws.com -U postgres -d bharat_mandi > backup.sql

# Import to new database
psql -h new-endpoint.rds.amazonaws.com -U postgres -d bharat_mandi < backup.sql
```

**Note**: For this project, you're using local PostgreSQL, so no RDS migration needed!

---

### STEP 8: Update IAM Policies (If Region-Specific)

Most IAM policies use wildcards and work globally, but check if you have region-specific policies:

```bash
# List policies attached to your user
aws iam list-attached-user-policies --user-name YOUR_USERNAME

# Get policy document
aws iam get-policy-version \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/POLICY_NAME \
  --version-id v1
```

**If you see region-specific ARNs like:**
```json
"Resource": "arn:aws:s3:::bucket-name-ap-southeast-2/*"
```

**Update to:**
```json
"Resource": "arn:aws:s3:::bucket-name-ap-south-1/*"
```

**Or use wildcards:**
```json
"Resource": "arn:aws:s3:::bharat-mandi-*/*"
```

---

### STEP 9: Update Application Configuration

#### Check your codebase for hardcoded regions:

```bash
# Search for hardcoded regions
grep -r "ap-southeast-2" src/
grep -r "ap-southeast-2" public/

# Search for hardcoded bucket names
grep -r "s3.ap-southeast-2" src/
```

#### Update any hardcoded values to use environment variables:

**Bad (hardcoded):**
```typescript
const s3Client = new S3Client({ region: 'ap-southeast-2' });
```

**Good (environment variable):**
```typescript
const s3Client = new S3Client({ region: process.env.AWS_REGION });
```

---

### STEP 10: Test Everything

#### Run automated tests:
```bash
# Test AWS connection
node scripts/test-lex-connection.js

# Test S3 upload (if you have a test script)
# node scripts/test-s3-upload.js

# Start server
npm run dev
```

#### Manual testing checklist:

```
□ AWS Lex Connection
  □ Open: http://localhost:3000/kisan-mitra-test.html
  □ Verify mode shows "Live" (not "Mock")
  □ Test query: "What is the price of tomato?"
  □ Verify response from AWS Lex

□ Voice Transcription (if implemented)
  □ Record audio
  □ Verify upload to S3 (ap-south-1)
  □ Verify transcription works

□ Text-to-Speech (if implemented)
  □ Click "Read Aloud"
  □ Verify audio plays

□ Translation (if implemented)
  □ Translate text
  □ Verify Redis cache works (ap-south-1)

□ Media Upload (if implemented)
  □ Upload image
  □ Verify upload to S3 (ap-south-1)
  □ Verify image displays
```

---

### STEP 11: Clean Up Old Resources (After Verification)

**⚠️ Only do this after confirming everything works in ap-south-1!**

#### Delete old S3 buckets:
```bash
# List objects in bucket
aws s3 ls s3://old-bucket-name --region ap-southeast-2

# Delete all objects
aws s3 rm s3://old-bucket-name --recursive --region ap-southeast-2

# Delete bucket
aws s3 rb s3://old-bucket-name --region ap-southeast-2
```

#### Delete old ElastiCache cluster:
```bash
# Delete cluster
aws elasticache delete-cache-cluster \
  --cache-cluster-id old-cluster-id \
  --region ap-southeast-2

# Verify deletion
aws elasticache describe-cache-clusters --region ap-southeast-2
```

#### Delete old Lambda functions:
```bash
aws lambda delete-function \
  --function-name old-function-name \
  --region ap-southeast-2
```

#### Delete old RDS snapshots (if any):
```bash
aws rds delete-db-snapshot \
  --db-snapshot-identifier old-snapshot \
  --region ap-southeast-2
```

---

## Verification Checklist

After migration, verify:

- [ ] `.env` has `AWS_REGION=ap-south-1`
- [ ] IAM users work (they should - no migration needed)
- [ ] S3 buckets created in ap-south-1
- [ ] S3 bucket names updated in `.env`
- [ ] ElastiCache/Redis created in ap-south-1 (if needed)
- [ ] Redis endpoint updated in `.env`
- [ ] AWS Lex bot created in ap-south-1
- [ ] Lex bot IDs updated in `.env`
- [ ] Lambda functions migrated (if any)
- [ ] RDS databases migrated (if any)
- [ ] Test script passes: `node scripts/test-lex-connection.js`
- [ ] Kisan Mitra works in live mode
- [ ] Voice features work (if implemented)
- [ ] Translation works (if implemented)
- [ ] Old resources deleted (after verification)

---

## Troubleshooting

### Error: "Bucket does not exist"
**Solution:**
- Create new S3 buckets in ap-south-1
- Update bucket names in `.env`
- Update bucket names in code (use environment variables)

### Error: "Bot not found"
**Solution:**
- Verify you created Lex bot in ap-south-1
- Check region in AWS Console (top right)
- Verify `LEX_REGION=ap-south-1` in `.env`

### Error: "Access Denied"
**Solution:**
- IAM permissions are global, so this shouldn't happen
- If it does, check IAM policy has correct permissions
- Verify your access keys are correct in `.env`

### Error: "Connection timeout" for Redis
**Solution:**
- Check security group allows inbound traffic on port 6379
- Verify Redis endpoint is correct in `.env`
- Check VPC settings if using private subnet

### Error: "Region mismatch"
**Solution:**
- Search codebase for hardcoded regions: `grep -r "ap-southeast-2" src/`
- Replace with environment variable: `process.env.AWS_REGION`

---

## Cost Comparison

**Good news**: ap-south-1 pricing is similar or cheaper than ap-southeast-2!

| Service | ap-southeast-2 | ap-south-1 | Savings |
|---------|----------------|------------|---------|
| AWS Lex (text) | $0.00075/req | $0.00075/req | Same |
| AWS Translate | $15/million chars | $15/million chars | Same |
| AWS Transcribe | $0.024/min | $0.024/min | Same |
| AWS Polly | $4/million chars | $4/million chars | Same |
| S3 Storage | $0.025/GB | $0.023/GB | 8% cheaper |
| ElastiCache | $0.034/hr | $0.034/hr | Same |

**Plus**: Lower data transfer costs for Indian users!

---

## Migration Timeline

**Estimated time based on resources:**

| Resources | Time Required |
|-----------|---------------|
| IAM only (no migration) | 5 minutes |
| + S3 buckets (empty) | 15 minutes |
| + S3 buckets (with data) | 30-60 minutes |
| + ElastiCache | 20 minutes |
| + AWS Lex | 30-45 minutes |
| + Lambda functions | 15 min per function |
| + RDS databases | 1-2 hours |

**Total for typical setup**: 1-2 hours

---

## Summary

✅ **What's done**: `.env` updated to ap-south-1

🔧 **What you need to do**:
1. Inventory your resources (Step 1)
2. Create new S3 buckets in ap-south-1 (Step 3)
3. Create ElastiCache in ap-south-1 if needed (Step 4)
4. Create AWS Lex bot in ap-south-1 (Step 5)
5. Migrate Lambda/RDS if you have them (Steps 6-7)
6. Test everything (Step 10)
7. Clean up old resources (Step 11)

📝 **Follow**: This guide step-by-step, checking off each item

---

## Quick Start Commands

```bash
# 1. Check what you have
aws s3 ls
aws elasticache describe-cache-clusters --region ap-southeast-2
aws lambda list-functions --region ap-southeast-2

# 2. Create new S3 buckets
aws s3 mb s3://bharat-mandi-audio-ap-south-1 --region ap-south-1
aws s3 mb s3://bharat-mandi-media-ap-south-1 --region ap-south-1

# 3. Update .env (already done!)
# AWS_REGION=ap-south-1

# 4. Create Lex bot (follow quick start guide)
# docs/aws/LEX-BOT-SETUP-QUICKSTART.md

# 5. Test
node scripts/test-lex-connection.js
npm run dev
```

---

**Migration Status**: Configuration updated, ready to migrate resources
**Estimated Time**: 1-2 hours (depending on resources)
**Difficulty**: Intermediate
**Support**: Follow this guide step-by-step, and test after each step

---

## Need Help?

If you encounter issues:
1. Check the Troubleshooting section above
2. Verify each step was completed
3. Check AWS CloudWatch logs for errors
4. Verify `.env` file has correct values

**Common mistake**: Forgetting to select ap-south-1 region in AWS Console (top right dropdown)
