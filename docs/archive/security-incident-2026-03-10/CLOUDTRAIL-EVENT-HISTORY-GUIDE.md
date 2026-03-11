# CloudTrail Event History Quick Guide

**Good News**: Even without CloudTrail explicitly enabled, AWS automatically provides **90 days of Event History** for all AWS accounts!

---

## What is Event History?

Event History is a feature of AWS CloudTrail that automatically records the last 90 days of account activity across all AWS services. This is available for **all AWS accounts** at no additional cost.

### What's Recorded:
- ✅ All management events (API calls)
- ✅ Last 90 days of activity
- ✅ All AWS regions
- ✅ All AWS services
- ✅ Source IP addresses
- ✅ User agents (tools/SDKs used)

### What's NOT Recorded (unless you enable full CloudTrail):
- ❌ Data events (S3 object-level operations)
- ❌ Events older than 90 days
- ❌ Ability to export events to S3
- ❌ Ability to set up alerts

---

## How to Check Event History

### Step 1: Access Event History

1. Go to: https://console.aws.amazon.com/cloudtrail/
2. Click **"Event history"** in the left sidebar
3. You'll see a list of recent events

### Step 2: Filter Events

Use filters to find suspicious activity:

#### Filter by User Name:
1. Click the filter dropdown
2. Select **"User name"**
3. Enter: `Omband` (or your IAM user name)
4. Click **"Apply"**

#### Filter by Time Range:
1. Click the time range dropdown (default: Last hour)
2. Select **"Custom"**
3. Choose date range (e.g., last 7-14 days)
4. Click **"Apply"**

#### Filter by Event Name:
Look for specific suspicious events:
- `RunInstances` - EC2 instance launches
- `CreateFunction` - Lambda function creations
- `CreateUser` - IAM user creations
- `CreateRole` - IAM role creations
- `PutUserPolicy` - Policy attachments
- `CreateBucket` - S3 bucket creations

### Step 3: Analyze Events

For each event, check:

1. **Event time**: When did it happen?
2. **User name**: Was it you?
3. **Event name**: What action was performed?
4. **AWS region**: Is this a region you use?
5. **Source IP address**: Is this your IP?
6. **User agent**: What tool was used?

---

## Red Flags to Look For

### 🚩 Suspicious Activity Indicators:

1. **Unknown IP Addresses**
   - Events from IPs you don't recognize
   - Events from foreign countries
   - Events from cloud provider IPs (AWS, Azure, GCP)

2. **Unusual Regions**
   - Activity in regions you don't use
   - Common attack regions: us-east-1, eu-west-1, ap-northeast-1

3. **Resource Creations**
   - EC2 instances you didn't launch
   - Lambda functions you didn't create
   - S3 buckets you didn't create
   - IAM users/roles you didn't create

4. **Unusual Times**
   - Activity during hours you don't work
   - Activity on weekends/holidays

5. **High-Risk Actions**
   - `CreateUser`, `CreateAccessKey` - Creating new IAM users
   - `AttachUserPolicy`, `PutUserPolicy` - Granting permissions
   - `RunInstances` - Launching EC2 instances
   - `CreateFunction` - Creating Lambda functions
   - `CreateBucket` - Creating S3 buckets

---

## Example: Checking for Unauthorized EC2 Instances

1. Go to Event History
2. Filter by:
   - **Event name**: `RunInstances`
   - **Time range**: Last 14 days
3. Review each event:
   - Check source IP address
   - Check AWS region
   - Check instance type and count
4. If you find unauthorized instances:
   - Note the instance IDs
   - Go to EC2 console and terminate them
   - Document in incident report

---

## Example: Checking for IAM Changes

1. Go to Event History
2. Filter by:
   - **Event name**: `CreateUser` OR `CreateAccessKey` OR `AttachUserPolicy`
   - **Time range**: Last 14 days
3. Review each event:
   - Did you create these users/keys?
   - What permissions were granted?
4. If you find unauthorized changes:
   - Delete unauthorized users/keys
   - Revoke unauthorized permissions
   - Document in incident report

---

## What to Do If You Find Suspicious Activity

### Immediate Actions:

1. **Document Everything**
   - Take screenshots
   - Note event IDs
   - Record IP addresses
   - Save event details

2. **Terminate/Delete Resources**
   - Stop unauthorized EC2 instances
   - Delete unauthorized Lambda functions
   - Delete unauthorized IAM users
   - Revoke unauthorized permissions

3. **Update AWS Support Case**
   - Report findings immediately
   - Provide event IDs and details
   - Request billing adjustment if needed

4. **Rotate ALL Credentials**
   - Not just the exposed one
   - All IAM user access keys
   - All application passwords

5. **Enable Full CloudTrail**
   - For future monitoring
   - Set up alerts for suspicious activity

---

## Common Event Names Reference

### EC2 (Compute):
- `RunInstances` - Launch EC2 instances
- `TerminateInstances` - Stop EC2 instances
- `CreateSecurityGroup` - Create firewall rules
- `AuthorizeSecurityGroupIngress` - Open ports

### Lambda (Serverless):
- `CreateFunction` - Create Lambda function
- `UpdateFunctionCode` - Update function code
- `Invoke` - Execute function

### IAM (Identity):
- `CreateUser` - Create IAM user
- `CreateAccessKey` - Create access key
- `AttachUserPolicy` - Grant permissions
- `CreateRole` - Create IAM role

### S3 (Storage):
- `CreateBucket` - Create S3 bucket
- `PutBucketPolicy` - Change bucket permissions
- `PutObject` - Upload file (not in Event History by default)

### RDS (Database):
- `CreateDBInstance` - Create database
- `ModifyDBInstance` - Modify database
- `DeleteDBInstance` - Delete database

---

## Your Specific Case

For the exposed credentials incident, focus on:

1. **Time Range**: Last 7-14 days (or since you suspect exposure)
2. **User Name**: Omband (the IAM user with exposed credentials)
3. **Key Events to Check**:
   - `RunInstances` - Unauthorized EC2 instances
   - `CreateFunction` - Unauthorized Lambda functions
   - `CreateUser` - Unauthorized IAM users
   - `CreateAccessKey` - Unauthorized access keys
   - Any events from unknown IP addresses

---

## No Suspicious Activity Found?

If you don't find any suspicious activity:

1. ✅ **Good news!** The exposed credentials likely weren't used
2. ✅ Document this in your AWS support case
3. ✅ Still complete other security steps:
   - Check billing for unexpected charges
   - Review all regions for unwanted resources
   - Detach quarantine policy
   - Enable MFA

---

## Enable Full CloudTrail (Recommended)

For better security monitoring in the future:

1. Go to: https://console.aws.amazon.com/cloudtrail/
2. Click **"Create trail"**
3. Configure:
   - Trail name: `bharat-mandi-audit-trail`
   - Storage location: New S3 bucket
   - Log file validation: Enabled
   - Multi-region trail: Yes
4. Click **"Create trail"**

**Cost**: ~$2-5/month for typical usage

---

## Additional Resources

- [CloudTrail Event History](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html)
- [CloudTrail Event Reference](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference.html)
- [AWS Security Best Practices](https://aws.amazon.com/security/best-practices/)

---

**Last Updated**: March 10, 2026  
**Incident ID**: SEC-2026-03-10-001
