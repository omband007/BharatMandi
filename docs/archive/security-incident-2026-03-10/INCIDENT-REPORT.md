# AWS Credentials Exposure Security Incident Report

**Date**: March 10, 2026  
**Severity**: CRITICAL  
**Status**: RESOLVED  
**Incident ID**: SEC-2026-03-10-001

---

## Executive Summary

AWS detected exposed credentials (AWS access keys, secret keys, and RDS database password) in a public GitHub repository. The credentials were committed in file `config/.env.rds-test` at commit `098791a3056fd898862cdc71dd401cfca45ac423`. AWS applied a quarantine policy to the affected IAM user to prevent unauthorized usage. All exposed credentials have been rotated, Git history has been cleaned, and preventive measures have been implemented.

---

## Timeline

| Time | Event |
|------|-------|
| Unknown | Credentials committed to `config/.env.rds-test` in commit `098791a` |
| Unknown | Commit pushed to public GitHub repository |
| March 10, 2026 | AWS detected exposed credentials and sent security alert |
| March 10, 2026 | AWS applied AWSCompromisedKeyQuarantineV3 quarantine policy to IAM user "Omband" |
| March 10, 2026 | Security incident response initiated |
| March 10, 2026 | New AWS access key created (AKIAUDESSOGVP2NUJV4P) |
| March 10, 2026 | RDS database password rotated |
| March 10, 2026 | Old AWS access key deleted (AKIAUDESSOGVA7ANEUI4) |
| March 10, 2026 | Local `.env` file updated with new credentials |
| March 10, 2026 | File `config/.env.rds-test` deleted from filesystem |
| March 10, 2026 | `.gitignore` updated to prevent future credential exposure |
| March 10, 2026 | Git history cleaned using `git filter-repo` |
| March 10, 2026 | Cleaned history force-pushed to GitHub |
| March 10, 2026 | Verified exposed commit no longer accessible |

---

## Exposed Credentials

### AWS Credentials
- **Access Key ID**: `AKIAUDESSOGVA7ANEUI4` (DELETED)
- **Secret Access Key**: `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` (DELETED)
- **IAM User**: Omband
- **Exposure Location**: https://github.com/omband007/BharatMandi/blob/098791a3056fd898862cdc71dd401cfca45ac423/config/.env.rds-test

### RDS Database Credentials
- **Host**: bharat-mandi-testing.c1y0cuowi6cr.ap-southeast-2.rds.amazonaws.com
- **Database**: postgres
- **User**: postgres
- **Password**: `BharatMandi2026!` (ROTATED)

### Other Exposed Information
- S3 bucket names: bharat-mandi-voice-ap-south-1, bharat-mandi-listings-testing
- Lex Bot ID: YYEXVHRJQW
- Lex Bot Alias ID: COP9IOYDL0
- AWS Region: ap-southeast-2

---

## Actions Taken

### 1. Credential Rotation ✅
- Created new AWS access key: `AKIAUDESSOGVP2NUJV4P`
- Updated local `.env` file with new AWS credentials
- Deleted old AWS access key: `AKIAUDESSOGVA7ANEUI4`
- Changed RDS master password to: `EmqTqar2Nz9nWZB`
- Updated local `.env` file with new RDS password

### 2. Repository Cleanup ✅
- Deleted `config/.env.rds-test` from filesystem
- Updated `.gitignore` to ignore `config/.env*` files (except .example and .production)
- Created backup branch: `backup-before-history-clean`
- Used `git filter-repo` to remove `config/.env.rds-test` from ALL Git history
- Force-pushed cleaned history to GitHub
- Verified exposed commit `098791a` is no longer accessible

### 3. Preventive Measures ✅
- Added comprehensive `.gitignore` rules:
  ```
  # Environment files with credentials (SECURITY)
  config/.env*
  !config/.env.example
  !config/.env.production
  ```
- Created bugfix spec: `.kiro/specs/aws-credentials-exposure-fix/`
- Documented incident in: `docs/archive/security-incident-2026-03-10/`

### 4. Security Audit (PENDING)
- [ ] Check CloudTrail logs for unauthorized activity
- [ ] Review AWS account for unwanted resources (EC2, Lambda, etc.)
- [ ] Check billing for unexpected charges
- [ ] Detach AWSCompromisedKeyQuarantineV3 policy from IAM user
- [ ] Respond to AWS support case

---

## Impact Assessment

### Potential Impact
- **Unauthorized AWS Access**: Exposed credentials could have been used to access AWS resources
- **Data Breach Risk**: Potential access to RDS database with sensitive user data
- **Resource Abuse**: Risk of unauthorized EC2 instances, Lambda functions, or other resources
- **Financial Impact**: Potential unwanted AWS charges

### Actual Impact
- **To Be Determined**: Requires CloudTrail log analysis
- **No Known Unauthorized Activity**: As of incident response time
- **No Known Data Breach**: As of incident response time
- **No Known Unwanted Charges**: Requires billing review

---

## Root Cause Analysis

### How Did This Happen?

1. **Developer Error**: Credentials were placed in a file named `config/.env.rds-test`
2. **Insufficient .gitignore**: The `.gitignore` file had `.env` but not `config/.env*`
3. **Lack of Pre-commit Hooks**: No automated checks to prevent credential commits
4. **No Secret Scanning**: GitHub secret scanning may not have detected the credentials immediately

### Why Wasn't It Caught Earlier?

1. **File Naming**: The file was named `.env.rds-test` instead of just `.env`
2. **Location**: The file was in `config/` directory, not root
3. **Pattern Mismatch**: `.gitignore` had `.env` but not `config/.env*`

---

## Lessons Learned

### What Went Wrong
1. Credentials were stored in a file that wasn't properly ignored by Git
2. No pre-commit hooks to scan for secrets before commit
3. No automated secret scanning in CI/CD pipeline

### What Went Right
1. AWS detected the exposure quickly and applied quarantine policy
2. Rapid response and credential rotation
3. Comprehensive Git history cleanup
4. Documentation and incident tracking

---

## Recommendations

### Immediate Actions (REQUIRED)
1. ✅ Rotate all exposed credentials
2. ✅ Clean Git history
3. ✅ Update .gitignore
4. ⏳ Check CloudTrail for unauthorized activity
5. ⏳ Review AWS billing for unexpected charges
6. ⏳ Detach quarantine policy from IAM user
7. ⏳ Respond to AWS support case

### Short-term Actions (1-2 weeks)
1. Install pre-commit hooks with secret scanning (e.g., `detect-secrets`, `git-secrets`)
2. Enable GitHub secret scanning alerts
3. Implement AWS Secrets Manager for credential management
4. Add security training for all developers
5. Review all other repositories for similar issues

### Long-term Actions (1-3 months)
1. Implement AWS IAM roles for EC2 instances (already done for production)
2. Use temporary credentials with AWS STS
3. Implement least-privilege IAM policies
4. Enable AWS CloudTrail logging for all regions
5. Set up AWS GuardDuty for threat detection
6. Implement automated security scanning in CI/CD
7. Regular security audits and penetration testing

---

## Prevention Checklist

To prevent future credential exposure:

- [x] Update .gitignore to ignore all credential files
- [ ] Install pre-commit hooks with secret scanning
- [ ] Enable GitHub secret scanning
- [ ] Use AWS Secrets Manager for credentials
- [ ] Implement IAM roles instead of access keys where possible
- [ ] Regular security training for developers
- [ ] Automated security scanning in CI/CD
- [ ] Regular security audits

---

## Related Documentation

- Bugfix Spec: `.kiro/specs/aws-credentials-exposure-fix/bugfix.md`
- Security Standards: `docs/product-standards/security/`
- AWS IAM Best Practices: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html

---

## Incident Response Team

- **Incident Commander**: Kiro AI Assistant
- **Developer**: Om (Omband)
- **AWS Account Owner**: Om (Omband)

---

## Sign-off

**Incident Resolved By**: Kiro AI Assistant  
**Date**: March 10, 2026  
**Status**: Credentials rotated, Git history cleaned, preventive measures implemented

**Pending Actions**: CloudTrail audit, billing review, quarantine policy removal, AWS support case response

---

**CONFIDENTIAL - INTERNAL USE ONLY**
