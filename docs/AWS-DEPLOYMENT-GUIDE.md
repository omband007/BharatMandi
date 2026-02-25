# AWS Deployment Guide - Bharat Mandi

## Overview

This guide explains how to deploy Bharat Mandi to AWS while maintaining local development workflow.

## Architecture Summary

```
Development Flow:
Local Dev (daily) → AWS Testing (weekly) → Staging Deploy → Production Deploy
     ↓                    ↓                      ↓                ↓
  Local DB          AWS Services          AWS Staging        AWS Production
  Mock AI           Real S3/AI/SMS        Full Cloud         Full Cloud
```

## Quick Start: Test with AWS Services Locally (1-2 hours)

### Prerequisites
- AWS Account with billing enabled
- AWS CLI installed
- Node.js and npm installed

### Step 1: AWS Account Setup
```bash
# Install AWS CLI (if not installed)
# Windows: Download from https://aws.amazon.com/cli/
# Mac: brew install awscli
# Linux: sudo apt install awscli

# Configure AWS credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region (ap-south-1), Output format (json)
```

### Step 2: Create AWS Resources
```bash
# Create S3 bucket for media
aws s3 mb s3://bharat-mandi-dev-media --region ap-south-1

# Enable Rekognition (no setup needed, pay-per-use)

# Set up Pinpoint for SMS
aws pinpoint create-app --create-application-request Name=BharatMandiDev
# Note the Application ID from output
```

### Step 3: Update Environment Variables
Create `.env.aws` file:
```bash
# Copy from .env and add:
AWS_ENABLED=true
AWS_REGION=ap-south-1
AWS_S3_BUCKET=bharat-mandi-dev-media
AWS_REKOGNITION_ENABLED=true
AWS_PINPOINT_ENABLED=true
AWS_PINPOINT_APP_ID=<your-app-id>

# Keep local database for now
DB_HOST=localhost
DB_PORT=5432
```

### Step 4: Install AWS SDK
```bash
npm install @aws-sdk/client-s3 @aws-sdk/client-rekognition @aws-sdk/client-pinpoint @aws-sdk/s3-request-presigner
```

### Step 5: Test Locally with AWS Services
```bash
# Load AWS environment
export $(cat .env.aws | xargs)

# Or on Windows:
# Get-Content .env.aws | ForEach-Object { $var = $_.Split('='); [Environment]::SetEnvironmentVariable($var[0], $var[1]) }

# Start application
npm run dev

# Test:
# 1. Upload media → Should go to S3
# 2. Grade produce → Should use Rekognition
# 3. Send OTP → Should send real SMS
```

**Cost: ~$1-2 for testing**

---

## Full AWS Deployment (2-3 weeks)

### Phase 1: AWS Services Integration (Week 1)
See tasks 1-5 in `tasks.md`

**Deliverable**: App runs locally but uses AWS for storage, AI, and SMS

### Phase 2: Database Migration (Week 1-2)
See tasks 6-8 in `tasks.md`

**Deliverable**: App uses RDS PostgreSQL instead of local database

### Phase 3: Application Deployment (Week 2)
See tasks 9-12 in `tasks.md`

**Deliverable**: App runs on EC2 with load balancer and auto-scaling

### Phase 4: Production Readiness (Week 3)
See tasks 13-18 in `tasks.md`

**Deliverable**: Production-ready with monitoring, security, and CI/CD

---

## Development Workflow

### Daily Development (Recommended)
```bash
# Work locally with mock services
export AWS_ENABLED=false
npm run dev

# Fast iteration, no AWS costs
```

### Weekly AWS Testing
```bash
# Test with real AWS services
export AWS_ENABLED=true
npm run dev

# Verify cloud integration works
```

### Deploy to Staging (As Needed)
```bash
# Deploy to AWS staging environment
npm run deploy:staging

# Test on real cloud infrastructure
# URL: https://staging.bharatmandi.com
```

### Deploy to Production (When Ready)
```bash
# Deploy to AWS production
npm run deploy:production

# URL: https://bharatmandi.com
```

---

## Environment Comparison

| Feature | Local Dev | Local + AWS | Staging | Production |
|---------|-----------|-------------|---------|------------|
| Backend | Local | Local | AWS EC2 | AWS EC2 |
| Database | Local PG | Local PG | AWS RDS | AWS RDS |
| Media Storage | Filesystem | AWS S3 | AWS S3 | AWS S3 |
| AI Grading | Mock | Rekognition | Rekognition | Rekognition |
| SMS | Console | Pinpoint | Pinpoint | Pinpoint |
| Cost/Month | $0 | ~$5 | ~$50 | ~$300 |
| Setup Time | 0 min | 2 hours | 1 week | 2-3 weeks |

---

## Deployment Commands

### Build Application
```bash
npm run build
```

### Deploy to Staging
```bash
# Automated deployment
npm run deploy:staging

# Manual deployment
./scripts/deploy.sh staging
```

### Deploy to Production
```bash
# Requires approval
npm run deploy:production

# Manual deployment
./scripts/deploy.sh production
```

### Rollback
```bash
# Rollback to previous version
npm run rollback:production
```

---

## Monitoring and Debugging

### View Logs
```bash
# Local
npm run logs

# Staging
aws logs tail /aws/ec2/bharat-mandi-staging --follow

# Production
aws logs tail /aws/ec2/bharat-mandi-prod --follow
```

### Check Health
```bash
# Local
curl http://localhost:3000/health

# Staging
curl https://staging-api.bharatmandi.com/health

# Production
curl https://api.bharatmandi.com/health
```

### View Metrics
```bash
# Open CloudWatch dashboard
aws cloudwatch get-dashboard --dashboard-name BharatMandi
```

---

## Cost Management

### Estimated Monthly Costs

**Staging Environment:**
- EC2 (t3.small): $15
- RDS (db.t3.micro): $15
- S3 (100GB): $2
- Rekognition (1K images): $1
- Pinpoint (1K SMS): $10
- **Total: ~$50/month**

**Production Environment:**
- EC2 (2x t3.medium): $60
- RDS (db.t3.small): $50
- S3 (1TB): $23
- Rekognition (10K images): $10
- Pinpoint (10K SMS): $100
- Load Balancer: $20
- **Total: ~$300/month**

### Cost Optimization Tips
1. Use AWS Free Tier for first 12 months
2. Shut down staging when not in use
3. Use Reserved Instances for production (save 30-40%)
4. Implement S3 lifecycle policies
5. Set billing alerts

---

## Troubleshooting

### Issue: AWS credentials not found
```bash
# Solution: Configure AWS CLI
aws configure
```

### Issue: S3 upload fails
```bash
# Check bucket exists
aws s3 ls s3://bharat-mandi-dev-media

# Check permissions
aws s3api get-bucket-policy --bucket bharat-mandi-dev-media
```

### Issue: Rekognition access denied
```bash
# Check IAM permissions
aws iam get-user-policy --user-name your-user --policy-name RekognitionAccess
```

### Issue: SMS not sending
```bash
# Check Pinpoint status
aws pinpoint get-app --application-id <your-app-id>

# Verify phone number format (+919876543210)
```

### Issue: RDS connection timeout
```bash
# Check security group allows your IP
aws ec2 describe-security-groups --group-ids <sg-id>

# Test connection
psql -h <rds-endpoint> -U postgres -d bharat_mandi
```

---

## Security Best Practices

1. **Never commit AWS credentials** to Git
2. **Use IAM roles** instead of access keys when possible
3. **Enable MFA** for AWS console access
4. **Rotate credentials** regularly
5. **Use Secrets Manager** for sensitive data
6. **Enable CloudTrail** for audit logs
7. **Review security groups** regularly
8. **Keep dependencies updated**

---

## Next Steps

1. ✅ Read this guide
2. ✅ Complete Quick Start (test AWS services locally)
3. ✅ Review `tasks.md` for detailed implementation
4. ✅ Set up staging environment
5. ✅ Deploy and test on staging
6. ✅ Set up production environment
7. ✅ Deploy to production
8. ✅ Monitor and optimize

---

## Support and Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **AWS Free Tier**: https://aws.amazon.com/free/
- **AWS Pricing Calculator**: https://calculator.aws/
- **AWS Support**: https://console.aws.amazon.com/support/

---

## FAQ

**Q: Can I develop without AWS?**  
A: Yes! Set `AWS_ENABLED=false` and everything runs locally.

**Q: How much does AWS testing cost?**  
A: ~$1-2 for a few hours of testing with Free Tier.

**Q: Can I deploy just the backend to AWS?**  
A: Yes! Frontend can stay local or be deployed separately.

**Q: What if AWS services are down?**  
A: App gracefully falls back to local services (mock AI, console logs).

**Q: How do I switch between environments?**  
A: Use environment variables or `.env` files.

**Q: Can I use LocalStack for local AWS testing?**  
A: Yes! Set `AWS_S3_ENDPOINT=http://localhost:4566` for LocalStack.

**Q: How long does deployment take?**  
A: ~5-10 minutes for automated deployment.

**Q: Can I rollback a deployment?**  
A: Yes! Use `npm run rollback:production`.

**Q: Do I need a domain name?**  
A: No, you can use the AWS-provided URL initially.

**Q: How do I monitor costs?**  
A: Set up billing alerts in AWS Console → Billing → Budgets.
