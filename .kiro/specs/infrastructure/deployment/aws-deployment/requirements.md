---
feature: aws-deployment
status: in_progress
priority: high
created: 2026-02-25
updated: 2026-03-06
parent_spec: ../bharat-mandi-main
---

# AWS Cloud Deployment - Requirements

## Current State Assessment

### ✅ Already Implemented and Working
- **AWS SDK packages installed**: @aws-sdk/client-lex-runtime-v2, @aws-sdk/client-polly, @aws-sdk/client-transcribe, @aws-sdk/client-translate, @aws-sdk/client-comprehend, @aws-sdk/client-s3
- **Kisan Mitra chatbot**: AWS Lex (Bot ID: YYEXVHRJQW, Alias: COP9IOYDL0, Region: ap-southeast-2)
- **Voice services**: AWS Polly for text-to-speech, AWS Transcribe for speech-to-text
- **Translation services**: AWS Translate and Comprehend for multi-language support
- **S3 for audio cache**: Bucket bharat-mandi-voice-ap-south-1 (Region: ap-southeast-2)
- **Local SQLite cache**: For offline voice playback
- **Redis caching**: Local Redis for translation cache
- **PostgreSQL database**: Local PostgreSQL
- **MongoDB**: Local MongoDB for voice query logging

### ❌ Not Yet Implemented
- **Application deployment to AWS compute** (EC2/ECS/Lambda)
- **RDS PostgreSQL** for production database
- **S3 integration for listing media files** (currently using local filesystem at `data/media/listings/`)
- **Environment-based configuration system** (local vs AWS environments)
- **Load balancing and auto-scaling**
- **CloudWatch monitoring and logging**
- **CI/CD pipeline**
- **Production-ready security** (IAM roles, Secrets Manager)

## Overview
Deploy Bharat Mandi application to AWS cloud infrastructure for POC/testing environment. The application already uses AWS services (Lex, Polly, Transcribe, Translate, Comprehend, S3) from local development environment. This spec focuses on:
1. Deploying the Node.js application to AWS compute
2. Migrating PostgreSQL to RDS
3. Integrating S3 for listing media storage (currently local filesystem)
4. Setting up environment configuration
5. Basic monitoring and logging

**Development Environment Note**: This is a dev/POC environment with no critical data. We can test freely, drop/recreate databases, and experiment without backup concerns. Focus is on speed and learning, not data safety.

## Business Goals
1. Deploy application to AWS for remote testing and demonstration
2. Maintain local development workflow efficiency
3. Migrate database to AWS RDS for cloud-based testing
4. Integrate S3 for listing media files (replace local filesystem)
5. Keep costs minimal for POC environment (<$100/month)

## User Stories

### 1. Developer Workflow
**As a** developer  
**I want to** develop and test locally with AWS services already working  
**So that** I can iterate quickly while using real AWS services (Lex, Polly, Transcribe, Translate)

**Acceptance Criteria:**
- 1.1 Can run entire application locally with AWS services (current state)
- 1.2 AWS services (Lex, Polly, Transcribe, Translate, S3) work from local machine (already working)
- 1.3 Can deploy to AWS with documented process
- 1.4 Local and cloud environments use same codebase
- 1.5 Database migrations work in both environments

### 2. POC/Testing Deployment
**As a** system administrator  
**I want to** deploy the application to AWS for testing  
**So that** stakeholders can access and test it remotely

**Acceptance Criteria:**
- 2.1 Application runs on AWS compute (EC2 t3.small or similar)
- 2.2 Database hosted on AWS RDS PostgreSQL (db.t3.micro)
- 2.3 Listing media files stored in S3 (replace local filesystem)
- 2.4 All existing AWS services (Lex, Polly, Transcribe, Translate) continue working
- 2.5 Application accessible via HTTP (HTTPS optional for POC)

### 3. Environment Configuration
**As a** developer  
**I want to** configure different environments (local, testing/POC)  
**So that** I can develop locally and deploy to AWS for testing

**Acceptance Criteria:**
- 3.1 Environment variables control local vs AWS deployment
- 3.2 AWS resources configured for testing environment
- 3.3 Secrets managed securely (environment variables or AWS Secrets Manager)
- 3.4 Configuration validated on startup
- 3.5 Clear error messages for missing configuration

### 4. Cost Optimization for POC
**As a** business owner  
**I want to** minimize AWS costs during POC/testing  
**So that** cloud hosting is affordable for testing phase

**Acceptance Criteria:**
- 4.1 Use AWS Free Tier where possible
- 4.2 Testing environment uses minimal resources (t3.micro/t3.small)
- 4.3 Can shut down testing environment when not in use
- 4.4 S3 lifecycle policies for old media (optional for POC)
- 4.5 Cost monitoring and alerts configured
- 4.6 Target: <$100/month for testing environment

## Deployment Approach

### Phase 1: S3 Integration for Listing Media
- Integrate S3 for listing media files (currently using local filesystem at `data/media/listings/`)
- Update storage service to support S3 uploads/downloads
- Test S3 integration from local machine
- Keep database local during this phase

### Phase 2: Database Migration to RDS
- Set up RDS PostgreSQL (db.t3.micro)
- Migrate schema and data
- Test with cloud database from local machine
- Keep application local during this phase

### Phase 3: Application Deployment to AWS
- Deploy backend to EC2 (t3.small - simplest for POC)
- Configure networking and security groups
- Deploy and test all features
- Basic monitoring with CloudWatch

### Phase 4: Testing and Documentation (Optional)
- Document deployment process
- Create runbook for common operations
- Set up basic cost monitoring
- Security review

## Non-Functional Requirements

### Performance (POC Targets)
- API response time < 2s (p95) - acceptable for testing
- Media upload < 15s for 10MB file
- Database queries < 500ms (p95)
- Lex bot response < 3s

### Availability (POC Targets)
- 95% uptime for testing (not production-grade)
- Basic health checks
- Graceful degradation if AWS services unavailable

### Security (POC Level)
- All data encrypted in transit (HTTPS recommended but not required for POC)
- Data encrypted at rest (S3, RDS default encryption)
- IAM roles with appropriate permissions
- AWS credentials from environment variables
- No secrets in code or logs

### Scalability (POC Targets)
- Support 10-20 concurrent users (testing only)
- S3 handles media storage
- Database can scale vertically if needed (RDS)

## Current AWS Services Integration

### Already Working (Verified)
1. **AWS Lex** - Kisan Mitra chatbot
   - Bot ID: YYEXVHRJQW
   - Alias ID: COP9IOYDL0
   - Region: ap-southeast-2
   - Status: ✅ Working from local environment

2. **AWS Polly** - Text-to-speech for voice responses
   - Region: ap-southeast-2
   - Voices: Raveena (English), Aditi (Hindi)
   - Status: ✅ Working from local environment

3. **AWS Transcribe** - Speech-to-text for voice input
   - Region: ap-southeast-2
   - Languages: en-IN, hi-IN, ta-IN, te-IN
   - Status: ✅ Working from local environment

4. **AWS Translate** - Multi-language translation
   - Region: ap-southeast-2
   - Languages: 11 Indian languages supported
   - Status: ✅ Working from local environment

5. **AWS Comprehend** - Language detection
   - Region: ap-southeast-2
   - Status: ✅ Working from local environment

6. **AWS S3** - Audio cache storage
   - Bucket: bharat-mandi-voice-ap-south-1
   - Region: ap-southeast-2
   - Status: ✅ Working for voice audio caching

### Needs Implementation
1. **S3 for Listing Media** - Currently using local filesystem (`data/media/listings/`)
   - Need to create new bucket or use existing bucket
   - Update storage.service.ts to use S3 instead of local filesystem
   - Implement signed URLs for secure access

2. **RDS PostgreSQL** - Currently using local PostgreSQL
   - Need to provision RDS instance
   - Migrate schema and data
   - Update connection configuration

3. **Redis** - Currently using local Redis
   - Keep local Redis for POC (ElastiCache optional)
   - Or use ElastiCache if needed

4. **MongoDB** - Currently using local MongoDB for voice query logging
   - Keep local MongoDB for POC (DocumentDB optional)
   - Or use DocumentDB/Atlas if needed

## Out of Scope (Future Enhancements)
- Production-grade deployment (this is POC/testing only)
- Multi-region deployment
- CDN for media delivery (CloudFront)
- Serverless architecture (Lambda)
- Container orchestration (EKS)
- Advanced monitoring dashboards
- Auto-scaling (manual scaling for POC)
- Blue-green deployment
- ElastiCache for Redis (use local Redis for POC)
- DocumentDB for MongoDB (use local MongoDB for POC)
- CI/CD pipeline (manual deployment for POC)
- Custom domain and SSL certificate (optional for POC)

## Dependencies
- AWS Account with billing enabled ✅ (already have)
- AWS CLI installed and configured ✅ (already have)
- AWS credentials configured ✅ (already have - in .env file)
- Node.js and npm installed locally ✅ (already have)
- PostgreSQL client for migrations ✅ (already have)
- Git for version control ✅ (already have)
- Domain name for production ❌ (optional for POC)

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AWS costs exceed budget | High | Use Free Tier, set billing alerts, start with t3.micro instances, shut down when not testing |
| Data loss during migration | Low | **Dev environment - no critical data**, can recreate test data as needed |
| Deployment downtime | Low | POC environment, downtime acceptable during deployment |
| Configuration errors | Medium | Validation scripts, environment templates, documentation |
| Security vulnerabilities | Medium | Basic IAM practices, encryption, security review |
| Lex bot region mismatch | Low | All services in ap-southeast-2, already working |
| S3 integration breaks existing features | Low | **Dev environment - can test freely and rollback if needed** |

## Success Metrics
- Application accessible via public URL (EC2 public IP or domain)
- All features work in AWS environment (Lex, voice, translation, marketplace, transactions)
- Database migrated successfully with zero data loss
- Listing media files stored in S3 (not local filesystem)
- Deployment documented and repeatable
- AWS costs < $100/month for testing environment
- 95% uptime for testing period

## POC Deployment Target
- **Compute**: Single EC2 t3.small instance (2 vCPU, 2GB RAM) or t3.micro (1 vCPU, 1GB RAM)
- **Database**: RDS db.t3.micro PostgreSQL (1 vCPU, 1GB RAM)
- **Storage**: S3 for listing media files + existing audio cache bucket
- **Region**: ap-southeast-2 (Sydney) - same as Lex bot and other services
- **Domain**: Optional - can use EC2 public IP for POC
- **Load Balancer**: Not needed for POC
- **Auto-scaling**: Not needed for POC
- **Redis**: Local Redis (no ElastiCache for POC)
- **MongoDB**: Local MongoDB (no DocumentDB for POC)
