---
feature: aws-deployment
status: not_started
created: 2026-02-25
---

# AWS Cloud Deployment - Implementation Tasks

## Phase 1: AWS Services Integration (Local Development + AWS Services)

### 1. Setup and Configuration
- [ ] 1.1 Create AWS account and enable billing
- [ ] 1.2 Install AWS CLI and configure credentials
- [ ] 1.3 Install AWS SDK packages (`@aws-sdk/client-s3`, `@aws-sdk/client-rekognition`, `@aws-sdk/client-pinpoint`)
- [ ] 1.4 Create `src/config/aws.config.ts` for environment-based configuration
- [ ] 1.5 Create `.env.local`, `.env.staging`, `.env.production` templates
- [ ] 1.6 Add environment validation on app startup

### 2. S3 Media Storage Integration
- [ ] 2.1 Create S3 bucket for media storage (staging)
- [ ] 2.2 Configure S3 bucket policies and CORS
- [ ] 2.3 Update `storage.service.ts` to support S3 uploads
- [ ] 2.4 Implement signed URL generation for secure downloads
- [ ] 2.5 Add fallback to local storage when AWS disabled
- [ ] 2.6 Test media upload/download with S3
- [ ] 2.7 Implement thumbnail generation and S3 upload
- [ ] 2.8 Add S3 lifecycle policies for cost optimization

### 3. Rekognition AI Integration
- [ ] 3.1 Enable Rekognition API in AWS account
- [ ] 3.2 Update `grading.service.ts` to use Rekognition
- [ ] 3.3 Implement label-to-produce-type mapping
- [ ] 3.4 Add confidence scoring logic
- [ ] 3.5 Implement fallback to mock AI when disabled
- [ ] 3.6 Test AI grading with real images
- [ ] 3.7 Optimize image size before sending to Rekognition
- [ ] 3.8 Add error handling for Rekognition failures

### 4. Pinpoint SMS Integration
- [ ] 4.1 Enable Pinpoint SMS channel in AWS account
- [ ] 4.2 Request SMS production access (if needed)
- [ ] 4.3 Update `auth.service.ts` to use Pinpoint
- [ ] 4.4 Implement SMS template for OTP
- [ ] 4.5 Add fallback to console logging when disabled
- [ ] 4.6 Test SMS delivery with real phone number
- [ ] 4.7 Implement SMS delivery status tracking
- [ ] 4.8 Add rate limiting for SMS to control costs

### 5. Testing and Validation
- [ ] 5.1 Test all features with AWS_ENABLED=false (local mode)
- [ ] 5.2 Test all features with AWS_ENABLED=true (hybrid mode)
- [ ] 5.3 Verify graceful degradation when AWS services unavailable
- [ ] 5.4 Test environment variable switching
- [ ] 5.5 Document AWS setup process in README

---

## Phase 2: Database Migration to AWS RDS

### 6. RDS Setup
- [ ] 6.1 Create RDS PostgreSQL instance (staging)
- [ ] 6.2 Configure security groups for database access
- [ ] 6.3 Enable automated backups and point-in-time recovery
- [ ] 6.4 Create database parameter group with optimized settings
- [ ] 6.5 Set up Secrets Manager for database credentials
- [ ] 6.6 Update database configuration to support RDS
- [ ] 6.7 Test connection from local machine to RDS

### 7. Data Migration
- [ ] 7.1 Create full backup of local PostgreSQL database
- [ ] 7.2 Run schema migration on RDS instance
- [ ] 7.3 Export data from local database
- [ ] 7.4 Import data to RDS instance
- [ ] 7.5 Verify data integrity after migration
- [ ] 7.6 Test application with RDS database
- [ ] 7.7 Update connection pooling for cloud database
- [ ] 7.8 Document rollback procedure

### 8. SQLite Offline Cache
- [ ] 8.1 Verify SQLite still works for offline mode
- [ ] 8.2 Test sync engine with RDS as primary
- [ ] 8.3 Optimize sync queue for cloud latency
- [ ] 8.4 Add connection retry logic for RDS
- [ ] 8.5 Test offline-to-online sync with RDS

---

## Phase 3: Application Deployment to AWS

### 9. Infrastructure Provisioning
- [ ] 9.1 Create VPC with public/private subnets
- [ ] 9.2 Set up Internet Gateway and NAT Gateway
- [ ] 9.3 Configure security groups for EC2 instances
- [ ] 9.4 Create Application Load Balancer
- [ ] 9.5 Set up Target Groups and health checks
- [ ] 9.6 Create Auto Scaling Group
- [ ] 9.7 Request and configure SSL certificate (ACM)
- [ ] 9.8 Configure Route 53 for domain (if applicable)

### 10. EC2 Instance Configuration
- [ ] 10.1 Create EC2 launch template
- [ ] 10.2 Install Node.js and dependencies on AMI
- [ ] 10.3 Configure PM2 for process management
- [ ] 10.4 Set up CloudWatch agent for logs
- [ ] 10.5 Create IAM role for EC2 with necessary permissions
- [ ] 10.6 Configure environment variables on EC2
- [ ] 10.7 Test application startup on EC2
- [ ] 10.8 Create custom AMI for faster deployment

### 11. Deployment Automation
- [ ] 11.1 Create deployment script (`deploy.sh`)
- [ ] 11.2 Implement build and package step
- [ ] 11.3 Upload package to S3 deployment bucket
- [ ] 11.4 Create deployment automation with AWS Systems Manager
- [ ] 11.5 Implement zero-downtime deployment strategy
- [ ] 11.6 Add health check validation after deployment
- [ ] 11.7 Implement automatic rollback on failure
- [ ] 11.8 Document deployment process

### 12. Load Balancer and Auto Scaling
- [ ] 12.1 Configure load balancer health checks
- [ ] 12.2 Set up auto-scaling policies (CPU, memory)
- [ ] 12.3 Test scaling up (add instances)
- [ ] 12.4 Test scaling down (remove instances)
- [ ] 12.5 Configure sticky sessions if needed
- [ ] 12.6 Test load distribution across instances
- [ ] 12.7 Optimize health check intervals
- [ ] 12.8 Document scaling behavior

---

## Phase 4: Production Readiness

### 13. Monitoring and Logging
- [ ] 13.1 Set up CloudWatch log groups
- [ ] 13.2 Configure application logging to CloudWatch
- [ ] 13.3 Create CloudWatch dashboards
- [ ] 13.4 Set up CloudWatch alarms (CPU, memory, errors)
- [ ] 13.5 Configure SNS topics for alerts
- [ ] 13.6 Set up email/SMS notifications for critical alerts
- [ ] 13.7 Implement custom metrics for business KPIs
- [ ] 13.8 Test alert delivery

### 14. Security Hardening
- [ ] 14.1 Enable AWS WAF for load balancer
- [ ] 14.2 Configure security group rules (least privilege)
- [ ] 14.3 Enable VPC Flow Logs
- [ ] 14.4 Set up AWS Config for compliance
- [ ] 14.5 Enable GuardDuty for threat detection
- [ ] 14.6 Implement secrets rotation in Secrets Manager
- [ ] 14.7 Enable MFA for AWS console access
- [ ] 14.8 Conduct security audit and penetration testing

### 15. Backup and Disaster Recovery
- [ ] 15.1 Configure RDS automated backups (7-day retention)
- [ ] 15.2 Set up RDS snapshots schedule
- [ ] 15.3 Enable S3 versioning for media files
- [ ] 15.4 Create disaster recovery runbook
- [ ] 15.5 Test database restore from backup
- [ ] 15.6 Test application recovery from failure
- [ ] 15.7 Document RTO and RPO targets
- [ ] 15.8 Implement cross-region backup (optional)

### 16. CI/CD Pipeline
- [ ] 16.1 Set up GitHub Actions or AWS CodePipeline
- [ ] 16.2 Implement automated testing in pipeline
- [ ] 16.3 Add code quality checks (linting, security scan)
- [ ] 16.4 Automate build and package step
- [ ] 16.5 Implement staging deployment on merge to main
- [ ] 16.6 Add manual approval for production deployment
- [ ] 16.7 Implement automated rollback on test failure
- [ ] 16.8 Document CI/CD workflow

### 17. Cost Optimization
- [ ] 17.1 Set up AWS Cost Explorer
- [ ] 17.2 Create billing alerts for budget thresholds
- [ ] 17.3 Implement S3 lifecycle policies
- [ ] 17.4 Use Reserved Instances for predictable workloads
- [ ] 17.5 Schedule staging environment shutdown (nights/weekends)
- [ ] 17.6 Optimize RDS instance size based on usage
- [ ] 17.7 Review and optimize data transfer costs
- [ ] 17.8 Document cost optimization strategies

### 18. Documentation and Training
- [ ] 18.1 Create AWS architecture diagram
- [ ] 18.2 Document deployment process
- [ ] 18.3 Create runbook for common operations
- [ ] 18.4 Document troubleshooting guide
- [ ] 18.5 Create environment setup guide
- [ ] 18.6 Document cost breakdown and optimization
- [ ] 18.7 Create disaster recovery procedures
- [ ] 18.8 Train team on AWS operations

---

## Quick Start Deployment Checklist

### For Testing on AWS (Minimal Setup)
1. ✅ Create AWS account
2. ✅ Install AWS CLI and configure
3. ✅ Create S3 bucket
4. ✅ Enable Rekognition
5. ✅ Set up Pinpoint SMS
6. ✅ Update `.env` with AWS credentials
7. ✅ Set `AWS_ENABLED=true`
8. ✅ Test locally with AWS services
9. ✅ Deploy to EC2 (single instance)
10. ✅ Test end-to-end on cloud

**Estimated Time: 4-6 hours**

### For Production Deployment (Full Setup)
1. Complete Phase 1 (AWS Services Integration)
2. Complete Phase 2 (Database Migration)
3. Complete Phase 3 (Application Deployment)
4. Complete Phase 4 (Production Readiness)

**Estimated Time: 2-3 weeks**

---

## Development Workflow

### Daily Development (Local)
```bash
# Use local services
export AWS_ENABLED=false
npm run dev
```

### Weekly AWS Testing
```bash
# Use AWS services from local machine
export AWS_ENABLED=true
npm run dev

# Or deploy to staging
npm run deploy:staging
```

### Production Deployment
```bash
# Deploy to production
npm run deploy:production
```

---

## Rollback Procedures

### Application Rollback
```bash
# Revert to previous version
aws s3 cp s3://deployments/app-v1.0.0.zip .
pm2 restart bharat-mandi
```

### Database Rollback
```bash
# Restore from snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier bharat-mandi-prod \
  --db-snapshot-identifier snapshot-before-migration
```

### Configuration Rollback
```bash
# Revert environment variables
aws ssm put-parameter --name /bharat-mandi/config --value "$(cat .env.backup)"
```

---

## Success Criteria

- [ ] Application runs locally without AWS (development mode)
- [ ] Application runs locally with AWS services (hybrid mode)
- [ ] Application runs fully on AWS (production mode)
- [ ] Single command deployment works
- [ ] Zero-downtime deployment achieved
- [ ] All monitoring and alerts configured
- [ ] Disaster recovery tested
- [ ] Documentation complete
- [ ] Team trained on AWS operations
- [ ] Cost within budget ($50 staging, $300 production)
