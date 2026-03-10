# AWS Security Actions Checklist

**Incident**: AWS Credentials Exposure  
**Date**: March 10, 2026  
**Status**: In Progress

---

## ✅ Completed Actions

- [x] **Rotate AWS Access Key**
  - Created new key: `AKIAUDESSOGVP2NUJV4P`
  - Deleted old key: `AKIAUDESSOGVA7ANEUI4`
  - Updated local `.env` file

- [x] **Rotate RDS Password**
  - Changed master password from `BharatMandi2026!` to `EmqTqar2Nz9nWZB`
  - Updated local `.env` file

- [x] **Clean Git History**
  - Removed `config/.env.rds-test` from all commits
  - Force-pushed cleaned history to GitHub
  - Verified exposed commit `098791a` is gone

- [x] **Update .gitignore**
  - Added rules to prevent future credential exposure
  - Committed and pushed changes

---

## ⏳ Pending Actions (YOU MUST DO THESE)

### 1. Check CloudTrail for Unauthorized Activity

**Priority**: HIGH  
**Time Required**: 15-30 minutes

**Steps**:
1. Go to AWS Console: https://console.aws.amazon.com/cloudtrail/
2. Click "Event history" in the left sidebar
3. Filter by:
   - **User name**: Omband
   - **Time range**: Last 7 days (or since credentials were exposed)
4. Look for suspicious activity:
   - Unauthorized EC2 instance launches
   - Lambda function creations
   - S3 bucket access from unknown IPs
   - IAM user/role creations
   - Policy modifications
5. Document any suspicious activity

**What to look for**:
- Events from IP addresses you don't recognize
- Actions you didn't perform
- Resource creations (EC2, Lambda, RDS, etc.)
- IAM changes (new users, policies, roles)

---

### 2. Review AWS Billing for Unexpected Charges

**Priority**: HIGH  
**Time Required**: 10-15 minutes

**Steps**:
1. Go to AWS Console: https://console.aws.amazon.com/billing/
2. Click "Bills" in the left sidebar
3. Review current month charges
4. Look for:
   - Unexpected EC2 charges
   - Lambda invocations you didn't make
   - S3 data transfer charges
   - RDS usage spikes
   - Any services you don't use
5. Check all regions (use region dropdown)

**What to look for**:
- Charges in regions you don't use
- Services you haven't enabled
- Sudden spikes in usage
- Resources running in multiple regions

---

### 3. Check for Unwanted AWS Resources

**Priority**: HIGH  
**Time Required**: 20-30 minutes

**Steps**:
1. **EC2 Instances**:
   - Go to: https://console.aws.amazon.com/ec2/
   - Check ALL regions (use region dropdown)
   - Look for instances you didn't create
   - Terminate any unauthorized instances

2. **Lambda Functions**:
   - Go to: https://console.aws.amazon.com/lambda/
   - Check ALL regions
   - Look for functions you didn't create
   - Delete any unauthorized functions

3. **S3 Buckets**:
   - Go to: https://console.aws.amazon.com/s3/
   - Check for new buckets you didn't create
   - Check bucket policies for unauthorized access

4. **IAM Users/Roles**:
   - Go to: https://console.aws.amazon.com/iam/
   - Check for new users you didn't create
   - Check for new roles with suspicious permissions
   - Delete any unauthorized users/roles

5. **RDS Instances**:
   - Go to: https://console.aws.amazon.com/rds/
   - Check ALL regions
   - Look for databases you didn't create

**Important**: Check EVERY region, not just ap-southeast-2!

---

### 4. Detach Quarantine Policy from IAM User

**Priority**: MEDIUM (after completing steps 1-3)  
**Time Required**: 5 minutes

**Steps**:
1. Go to AWS Console: https://console.aws.amazon.com/iam/
2. Click "Users" in the left sidebar
3. Click on user "Omband"
4. Click "Permissions" tab
5. Find policy "AWSCompromisedKeyQuarantineV3"
6. Click "X" to detach the policy
7. Confirm detachment

**Note**: Only do this AFTER you've completed steps 1-3 and confirmed no unauthorized activity.

---

### 5. Respond to AWS Support Case

**Priority**: MEDIUM  
**Time Required**: 10-15 minutes

**Steps**:
1. Go to AWS Console: https://support.console.aws.amazon.com/
2. Find the support case about the compromised key
3. Reply with the following information:

**Template Response**:
```
Subject: Compromised Key Incident - Actions Completed

Dear AWS Security Team,

I have completed the following actions to secure my account:

1. ✅ Rotated AWS Access Key
   - Old key (AKIAUDESSOGVA7ANEUI4) has been deleted
   - New key created and application updated

2. ✅ Rotated RDS Database Password
   - Master password has been changed
   - Application updated with new password

3. ✅ Cleaned Git History
   - Removed exposed credentials from all Git commits
   - Force-pushed cleaned history to GitHub
   - Verified exposed commit is no longer accessible

4. ✅ CloudTrail Review
   - Reviewed CloudTrail logs for unauthorized activity
   - [RESULT: No suspicious activity found / Found and addressed: ...]

5. ✅ Billing Review
   - Reviewed AWS billing for unexpected charges
   - [RESULT: No unexpected charges / Found: ...]

6. ✅ Resource Review
   - Checked all regions for unauthorized resources
   - [RESULT: No unauthorized resources / Found and deleted: ...]

7. ✅ Preventive Measures
   - Updated .gitignore to prevent future credential exposure
   - Documented incident and implemented security best practices

Please detach the AWSCompromisedKeyQuarantineV3 policy from IAM user "Omband" as the account has been secured.

If there are any unwanted charges related to this incident, I request a billing adjustment.

Thank you for your prompt notification and assistance.

Best regards,
[Your Name]
```

---

### 6. Enable Multi-Factor Authentication (MFA)

**Priority**: HIGH (Security Best Practice)  
**Time Required**: 10 minutes

**Steps**:
1. Go to AWS Console: https://console.aws.amazon.com/iam/
2. Click "Users" → "Omband"
3. Click "Security credentials" tab
4. Under "Multi-factor authentication (MFA)", click "Assign MFA device"
5. Choose "Virtual MFA device"
6. Use Google Authenticator or similar app
7. Scan QR code and enter two consecutive codes
8. Click "Assign MFA"

**Why**: MFA adds an extra layer of security even if credentials are exposed.

---

## 📋 Summary Checklist

Copy this checklist and mark items as you complete them:

```
[ ] 1. Check CloudTrail for unauthorized activity
[ ] 2. Review AWS billing for unexpected charges
[ ] 3. Check all regions for unwanted resources
    [ ] EC2 instances
    [ ] Lambda functions
    [ ] S3 buckets
    [ ] IAM users/roles
    [ ] RDS instances
[ ] 4. Detach quarantine policy from IAM user
[ ] 5. Respond to AWS support case
[ ] 6. Enable MFA on IAM user
```

---

## 🚨 If You Find Unauthorized Activity

If you find any unauthorized activity:

1. **Document everything**: Take screenshots, note resource IDs, IP addresses
2. **Terminate/delete immediately**: Stop unauthorized resources
3. **Update AWS support case**: Report findings immediately
4. **Consider additional actions**:
   - Rotate ALL AWS credentials (not just the exposed one)
   - Review IAM policies for all users
   - Enable AWS GuardDuty for threat detection
   - Consider engaging AWS Professional Services

---

## 📞 Need Help?

- **AWS Support**: https://support.console.aws.amazon.com/
- **AWS Security**: https://aws.amazon.com/security/
- **CloudTrail Guide**: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/

---

**Last Updated**: March 10, 2026  
**Next Review**: After completing all pending actions
