---
feature: aws-deployment
status: in_progress
created: 2026-02-25
updated: 2026-03-06
---

# AWS Cloud Deployment - Implementation Tasks

## Current State Summary

### ✅ Already Completed
- AWS account created and billing enabled
- AWS CLI installed and configured
- AWS SDK packages installed (@aws-sdk/client-lex-runtime-v2, @aws-sdk/client-polly, @aws-sdk/client-transcribe, @aws-sdk/client-translate, @aws-sdk/client-comprehend, @aws-sdk/client-s3)
- AWS Lex chatbot configured and working (Bot ID: YYEXVHRJQW)
- AWS Polly text-to-speech working
- AWS Transcribe speech-to-text working
- AWS Translate multi-language translation working
- AWS Comprehend language detection working
- S3 bucket for audio cache working (bharat-mandi-voice-ap-south-1)
- Local development environment fully functional
- All AWS services accessible from local environment

### 🔄 In Progress / To Do
- S3 integration for listing media files (currently using local filesystem)
- RDS PostgreSQL setup and migration
- EC2 deployment
- Environment configuration system
- Basic monitoring and documentation

---

## Phase 1: S3 Integration for Listing Media

### 1. S3 Bucket Setup
- [x] 1.1 Create S3 bucket for listing media (e.g., bharat-mandi-listings-testing)
- [x] 1.2 Configure bucket policies (allow EC2 IAM role access)
- [x] 1.3 Enable versioning for rollback capability
- [x] 1.4 Configure CORS for browser uploads (if needed)
- [ ] 1.5 Set up lifecycle policies for cost optimization (optional)

### 2. Storage Service Updates
- [x] 2.1 Create environment configuration file (`src/config/environment.ts`)
- [x] 2.2 Add USE_S3_FOR_LISTINGS environment variable
- [x] 2.3 Update `storage.service.ts` to uncomment S3 code
- [x] 2.4 Implement S3 upload for listing media
- [x] 2.5 Implement signed URL generation for downloads
- [x] 2.6 Keep local filesystem as fallback for development
- [x] 2.7 Add error handling for S3 operations

### 3. Testing S3 Integration
- [x] 3.1 Test S3 upload from local machine (USE_S3_FOR_LISTINGS=true)
- [x] 3.2 Test signed URL generation and access
- [x] 3.3 Test fallback to local filesystem (USE_S3_FOR_LISTINGS=false)
- [x] 3.4 Verify existing listings still work
- [x] 3.5 Test with different file types (images, videos)
- [ ] 3.6 Document S3 setup process

---

## Phase 2: Database Migration to RDS

### 4. RDS Setup
- [x] 4.1 Create RDS PostgreSQL instance (db.t3.micro)
  - Engine: PostgreSQL 15 or 16
  - Instance class: db.t3.micro
  - Storage: 20GB GP3
  - Single-AZ (Multi-AZ not needed for POC)
  - Region: ap-southeast-2
- [x] 4.2 Create security group for RDS
  - Allow PostgreSQL (5432) from EC2 security group
  - Allow PostgreSQL from your local IP (for testing)
- [x] 4.3 Enable automated backups (7-day retention)
- [ ] 4.4 Enable encryption at rest
- [x] 4.5 Note RDS endpoint URL
- [x] 4.6 Create strong master password

### 5. Database Configuration
- [x] 5.1 Update database configuration to support RDS
- [x] 5.2 Add DB_SSL environment variable support
- [x] 5.3 Test connection from local machine to RDS
- [x] 5.4 Update connection pooling settings for cloud
- [x] 5.5 Add SSL/TLS configuration to Sequelize

### 6. Data Migration
**Note**: Dev environment - no critical data. Can skip backups and recreate test data as needed.

- [x] 6.1 Run schema migrations on RDS instance
  ```bash
  export POSTGRES_HOST=<rds-endpoint>
  export POSTGRES_PORT=5432
  export POSTGRES_DB=bharat_mandi
  export POSTGRES_USER=postgres
  export POSTGRES_PASSWORD=<secure-password>
  npm run migrate
  ```
- [ ] 6.2 (Optional) Import existing data if desired
  ```bash
  # Only if you want to preserve current test data
  pg_dump -h localhost -U postgres bharat_mandi > backup.sql
  psql -h <rds-endpoint> -U postgres -d bharat_mandi < backup.sql
  ```
- [x] 6.3 Test application with RDS database from local machine
- [x] 6.4 Verify Sequelize ORM connects successfully with SSL

---

## Phase 3: EC2 Deployment

### 7. IAM Setup
- [x] 7.1 Create IAM role for EC2 instance
- [x] 7.2 Attach policies for S3 access (listings and audio buckets)
- [x] 7.3 Attach policies for Lex access
- [x] 7.4 Attach policies for Polly access
- [x] 7.5 Attach policies for Transcribe access
- [x] 7.6 Attach policies for Translate access
- [x] 7.7 Attach policies for Comprehend access
- [x] 7.8 Verify IAM role has all necessary permissions

### 8. EC2 Instance Setup
- [x] 8.1 Create security group for EC2
  - Allow HTTP (80) from anywhere
  - Allow HTTPS (443) from anywhere (optional)
  - Allow SSH (22) from your IP only
- [x] 8.2 Launch EC2 instance
  - AMI: Ubuntu 22.04 LTS
  - Instance type: t3.small (or t3.micro for cost savings)
  - Region: ap-southeast-2
  - Attach IAM role from step 7
  - Attach security group from step 8.1
- [ ] 8.3 Allocate Elastic IP (optional - for stable IP)
- [x] 8.4 Create or use existing key pair for SSH access

### 9. EC2 Configuration
- [x] 9.1 SSH to EC2 instance
- [x] 9.2 Update system packages
  ```bash
  sudo apt-get update && sudo apt-get upgrade -y
  ```
- [x] 9.3 Install Node.js 20.x
  ```bash
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
  ```
- [x] 9.4 Install PM2 for process management
  ```bash
  sudo npm install -g pm2
  ```
- [x] 9.5 Install Redis
  ```bash
  sudo apt-get install -y redis-server
  sudo systemctl enable redis-server
  sudo systemctl start redis-server
  ```
- [x] 9.6 Install MongoDB
  ```bash
  sudo apt-get install -y mongodb
  sudo systemctl enable mongodb
  sudo systemctl start mongodb
  ```
- [x] 9.7 Install PostgreSQL client (for migrations)
  ```bash
  sudo apt-get install -y postgresql-client
  ```
- [x] 9.8 Configure firewall (ufw)
  ```bash
  sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  ```

### 10. Application Deployment
- [x] 10.1 Build application locally
  ```bash
  npm run build
  ```
- [x] 10.2 Create deployment package
  ```bash
  tar -czf bharat-mandi-app.tar.gz .build/ node_modules/ package.json
  ```
- [x] 10.3 Upload to EC2
  ```bash
  scp -i <key>.pem bharat-mandi-app.tar.gz ubuntu@<ec2-ip>:~
  ```
- [x] 10.4 Extract on EC2
  ```bash
  tar -xzf bharat-mandi-app.tar.gz
  ```
- [x] 10.5 Create .env.testing file on EC2 with production values
- [ ] 10.6 Run database migrations (if not done in Phase 2)
  ```bash
  npm run migrate
  ```
- [x] 10.7 Start application with PM2
  ```bash
  pm2 start .build/index.js --name bharat-mandi
  pm2 save
  pm2 startup
  ```
- [x] 10.8 Configure PM2 to restart on system reboot

### 11. Testing and Verification
- [x] 11.1 Test application health endpoint
  ```bash
  curl http://<ec2-ip>:3000/health
  ```
- [ ] 11.2 Test marketplace features (create listing, view listings)
- [ ] 11.3 Test Kisan Mitra chatbot (Lex integration)
- [ ] 11.4 Test voice services (Polly, Transcribe)
- [ ] 11.5 Test translation services (Translate, Comprehend)
- [ ] 11.6 Test S3 media uploads and downloads
- [x] 11.7 Test database operations (RDS)
- [ ] 11.8 Verify all features work end-to-end

---

## Phase 4: Monitoring and Documentation

### 12. Basic Monitoring
- [ ] 12.1 Set up CloudWatch billing alerts
  - Alert at $50
  - Alert at $75
  - Alert at $100
- [ ] 12.2 Enable CloudWatch metrics for EC2
- [ ] 12.3 Enable CloudWatch metrics for RDS
- [ ] 12.4 Set up PM2 monitoring
  ```bash
  pm2 monitor
  ```
- [ ] 12.5 Configure log rotation for PM2 logs
- [ ] 12.6 Set up basic health check script (optional)

### 13. Documentation
- [ ] 13.1 Document deployment process
- [ ] 13.2 Document environment variables
- [ ] 13.3 Document AWS resources created
- [ ] 13.4 Document rollback procedures
- [ ] 13.5 Document troubleshooting steps
- [ ] 13.6 Document cost breakdown
- [ ] 13.7 Create runbook for common operations
- [ ] 13.8 Document security best practices

### 14. Security Review
- [ ] 14.1 Verify IAM role has minimal permissions
- [ ] 14.2 Verify security groups are properly configured
- [ ] 14.3 Verify RDS encryption is enabled
- [ ] 14.4 Verify S3 bucket policies are secure
- [ ] 14.5 Verify SSH access is restricted
- [ ] 14.6 Verify database password is strong
- [ ] 14.7 Verify no AWS credentials in code
- [ ] 14.8 Schedule regular security updates

---

## Quick Start Checklist (Minimal POC Deployment)

For fastest deployment to AWS:

1. **S3 Setup** (30 minutes)
   - [ ] Create S3 bucket for listings
   - [ ] Update storage.service.ts
   - [ ] Test from local machine

2. **RDS Setup** (1 hour)
   - [ ] Create RDS instance
   - [ ] Run migrations
   - [ ] Test from local machine

3. **EC2 Setup** (2 hours)
   - [ ] Launch EC2 instance
   - [ ] Install dependencies (Node.js, PM2, Redis, MongoDB)
   - [ ] Deploy application
   - [ ] Test all features

4. **Monitoring** (30 minutes)
   - [ ] Set up billing alerts
   - [ ] Configure PM2 monitoring

**Total Time: ~4 hours**

---

## Rollback Procedures

**Note**: Dev environment - rollback is optional. Can simply redeploy or recreate resources.

### Application Rollback (Optional)
```bash
# If you want to keep a backup
cp -r .build .build.backup

# If deployment fails, just redeploy
pm2 restart bharat-mandi
```

### Database Rollback (Optional)
```bash
# Dev environment - easier to just drop and recreate
# Or use RDS automated backups if needed
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier bharat-mandi-testing \
  --target-db-instance-identifier bharat-mandi-testing-restored \
  --restore-time <timestamp>
```

### S3 Rollback (Optional)
```bash
# Dev environment - can delete and re-upload if needed
# Or use versioning if enabled
aws s3api list-object-versions --bucket bharat-mandi-listings-testing
```

---

## Success Criteria

- [ ] Application accessible via EC2 public IP
- [ ] All marketplace features working (create, view, update listings)
- [ ] Kisan Mitra chatbot working (Lex integration)
- [ ] Voice services working (Polly, Transcribe)
- [ ] Translation services working (Translate, Comprehend)
- [ ] Listing media stored in S3 (not local filesystem)
- [ ] Database on RDS (not local PostgreSQL)
- [ ] All features tested end-to-end
- [ ] Deployment documented
- [ ] Billing alerts configured
- [ ] AWS costs < $100/month

---

## Notes

- **Development environment - no critical data**: Feel free to experiment, drop databases, delete resources
- This is a POC/testing environment, not production-grade
- Focus on functionality over scalability
- Manual deployment is acceptable (no CI/CD needed)
- Keep costs minimal by using smallest instance types
- Can shut down EC2 when not testing to save costs
- Redis and MongoDB run locally on EC2 (no ElastiCache/DocumentDB)
- No load balancer or auto-scaling for POC
- HTTPS optional for POC (can use HTTP)
- Custom domain optional (can use EC2 public IP)
- **Speed over safety**: Skip backups, test aggressively, recreate data as needed
