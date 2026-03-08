---
feature: aws-deployment
status: in_progress
created: 2026-02-25
updated: 2026-03-06
---

# AWS Cloud Deployment - Design Document

## Architecture Overview

### Current Architecture (Local Development with AWS Services)

```
┌──────────────────────────────────────────────────────────┐
│                  LOCAL DEVELOPMENT                       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Frontend │→ │ Backend  │→ │PostgreSQL│             │
│  │ Browser  │  │ Node.js  │  │  Local   │             │
│  └──────────┘  └────┬─────┘  └──────────┘             │
│                     │                                   │
│                     │ ┌──────────┐  ┌──────────┐      │
│                     ├→│  Redis   │  │ MongoDB  │      │
│                     │ │  Local   │  │  Local   │      │
│                     │ └──────────┘  └──────────┘      │
│                     │                                   │
│                     │ ┌──────────────────────┐         │
│                     ├→│ Local Filesystem     │         │
│                     │ │ data/media/listings/ │         │
│                     │ └──────────────────────┘         │
│                     │                                   │
│                     ↓ (AWS SDK calls)                  │
└─────────────────────┼───────────────────────────────────┘
                      │
        ┌─────────────┴─────────────────────────┐
        │                                       │
        ↓                                       ↓
┌───────────────────┐               ┌──────────────────┐
│   AWS SERVICES    │               │  AWS S3 BUCKET   │
│  (ap-southeast-2) │               │ (ap-southeast-2) │
│                   │               │                  │
│  • Lex (chatbot)  │               │  • Audio cache   │
│  • Polly (TTS)    │               │  • Voice files   │
│  • Transcribe     │               │                  │
│  • Translate      │               │  Bucket:         │
│  • Comprehend     │               │  bharat-mandi-   │
│                   │               │  voice-ap-south-1│
└───────────────────┘               └──────────────────┘
```

### Target POC Architecture (AWS Deployment)

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS CLOUD (ap-southeast-2)               │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              EC2 Instance (t3.small)                  │  │
│  │                                                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │
│  │  │ Frontend │  │ Backend  │  │  Redis   │          │  │
│  │  │  Static  │  │ Node.js  │  │  Local   │          │  │
│  │  │  Files   │  │          │  │          │          │  │
│  │  └──────────┘  └────┬─────┘  └──────────┘          │  │
│  │                     │                                │  │
│  │                     │  ┌──────────┐                 │  │
│  │                     └─→│ MongoDB  │                 │  │
│  │                        │  Local   │                 │  │
│  │                        └──────────┘                 │  │
│  └─────────────────────────┼──────────────────────────┘  │
│                            │                              │
│  ┌─────────────────────────┼──────────────────────────┐  │
│  │                         ↓                           │  │
│  │  ┌─────────┐  ┌────────────┐  ┌──────────┐        │  │
│  │  │   RDS   │  │     S3     │  │   Lex    │        │  │
│  │  │Postgres │  │   Media    │  │  Polly   │        │  │
│  │  │         │  │  Listings  │  │Transcribe│        │  │
│  │  │         │  │   Audio    │  │Translate │        │  │
│  │  │         │  │   Cache    │  │Comprehend│        │  │
│  │  └─────────┘  └────────────┘  └──────────┘        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

Key differences from current state:
1. Application runs on EC2 instead of local machine
2. PostgreSQL on RDS instead of local
3. Listing media files in S3 instead of local filesystem
4. Redis and MongoDB still local on EC2 (no ElastiCache/DocumentDB for POC)
5. All AWS services (Lex, Polly, etc.) already working, no changes needed

## Component Design

### 1. Storage Service - S3 Integration for Listing Media

**Current State**: Uses local filesystem at `data/media/listings/`
**Target State**: Use S3 for listing media storage

**File: `src/features/marketplace/storage.service.ts`**

Current implementation has S3 code commented out. Need to:
1. Uncomment and update S3 integration code
2. Add environment variable to control S3 vs local filesystem
3. Implement signed URLs for secure access
4. Keep local filesystem as fallback for development

```typescript
// Environment configuration
const USE_S3 = process.env.USE_S3_FOR_LISTINGS === 'true';
const S3_LISTINGS_BUCKET = process.env.S3_LISTINGS_BUCKET || 'bharat-mandi-listings';

export class StorageService {
  async uploadListingMedia(file: Buffer, fileName: string, mimeType: string): Promise<string> {
    if (USE_S3) {
      return this.uploadToS3(file, fileName, mimeType);
    } else {
      return this.uploadToLocal(file, fileName, mimeType);
    }
  }

  private async uploadToS3(file: Buffer, fileName: string, mimeType: string): Promise<string> {
    const key = `listings/${Date.now()}-${fileName}`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: S3_LISTINGS_BUCKET,
      Key: key,
      Body: file,
      ContentType: mimeType,
    }));

    // Return S3 URL
    return `https://${S3_LISTINGS_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  }

  private async uploadToLocal(file: Buffer, fileName: string, mimeType: string): Promise<string> {
    // Existing local filesystem implementation
    // ...
  }
}
```

### 2. Environment Configuration

**File: `src/config/environment.ts`** (new file)

```typescript
export interface EnvironmentConfig {
  nodeEnv: 'development' | 'testing' | 'production';
  
  // Database
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
    ssl: boolean;
  };
  
  // AWS
  aws: {
    region: string;
    s3: {
      listingsBucket: string;
      audioBucket: string;
      useS3ForListings: boolean;
    };
    lex: {
      botId: string;
      botAliasId: string;
      region: string;
    };
  };
  
  // Local services
  redis: {
    host: string;
    port: number;
  };
  
  mongodb: {
    uri: string;
  };
}

export function getEnvironmentConfig(): EnvironmentConfig {
  return {
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
    
    database: {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      name: process.env.POSTGRES_DB || 'bharat_mandi',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
      ssl: process.env.DB_SSL === 'true',
    },
    
    aws: {
      region: process.env.AWS_REGION || 'ap-southeast-2',
      s3: {
        listingsBucket: process.env.S3_LISTINGS_BUCKET || 'bharat-mandi-listings',
        audioBucket: process.env.S3_AUDIO_BUCKET || 'bharat-mandi-voice-ap-south-1',
        useS3ForListings: process.env.USE_S3_FOR_LISTINGS === 'true',
      },
      lex: {
        botId: process.env.LEX_BOT_ID || '',
        botAliasId: process.env.LEX_BOT_ALIAS_ID || '',
        region: process.env.LEX_REGION || 'ap-southeast-2',
      },
    },
    
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    
    mongodb: {
      uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/bharat_mandi',
    },
  };
}

// Validate configuration on startup
export function validateConfig(config: EnvironmentConfig): void {
  const errors: string[] = [];
  
  if (!config.database.password && config.nodeEnv !== 'development') {
    errors.push('Database password is required for non-development environments');
  }
  
  if (config.aws.s3.useS3ForListings && !config.aws.s3.listingsBucket) {
    errors.push('S3 listings bucket is required when USE_S3_FOR_LISTINGS is true');
  }
  
  if (!config.aws.lex.botId || !config.aws.lex.botAliasId) {
    errors.push('Lex bot ID and alias ID are required');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}
```

## Deployment Strategy

### Environment Variables

**Local Development (`.env` - current)**:
```bash
NODE_ENV=development
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=bharat_mandi
POSTGRES_USER=postgres
POSTGRES_PASSWORD=PGSql

# AWS Services (already working)
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>

# S3 Configuration
S3_AUDIO_BUCKET=bharat-mandi-voice-ap-south-1
S3_REGION=ap-southeast-2
USE_S3_FOR_LISTINGS=false  # Use local filesystem for development

# AWS Lex
LEX_BOT_ID=YYEXVHRJQW
LEX_BOT_ALIAS_ID=COP9IOYDL0
LEX_REGION=ap-southeast-2

# Local services
REDIS_HOST=localhost
REDIS_PORT=6379
MONGODB_URI=mongodb://localhost:27017/bharat_mandi
```

**AWS POC/Testing (`.env.testing` - target)**:
```bash
NODE_ENV=testing
POSTGRES_HOST=<rds-endpoint>.ap-southeast-2.rds.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_DB=bharat_mandi
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<secure-password>
DB_SSL=true

# AWS Services (already working)
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>

# S3 Configuration
S3_AUDIO_BUCKET=bharat-mandi-voice-ap-south-1
S3_LISTINGS_BUCKET=bharat-mandi-listings-testing
S3_REGION=ap-southeast-2
USE_S3_FOR_LISTINGS=true  # Use S3 for listings in AWS

# AWS Lex (same as local)
LEX_BOT_ID=YYEXVHRJQW
LEX_BOT_ALIAS_ID=COP9IOYDL0
LEX_REGION=ap-southeast-2

# Local services on EC2
REDIS_HOST=localhost
REDIS_PORT=6379
MONGODB_URI=mongodb://localhost:27017/bharat_mandi
```

## Infrastructure as Code

### AWS Resources to Provision

**For POC/Testing Environment:**

1. **VPC and Networking** (Optional - can use default VPC)
   - Use default VPC for simplicity
   - Security Groups for EC2 and RDS

2. **Compute**
   - EC2 instance (t3.small or t3.micro)
   - Elastic IP (optional - for stable IP address)
   - Security Group (allow HTTP/HTTPS, SSH)

3. **Database**
   - RDS PostgreSQL (db.t3.micro)
   - Single-AZ (Multi-AZ not needed for POC)
   - Automated backups (7 days retention)
   - Security Group (allow PostgreSQL from EC2)

4. **Storage**
   - S3 bucket for listing media (new)
   - Existing S3 bucket for audio cache (already have)
   - Bucket policies for access control

5. **AI/ML Services** (Already Working)
   - Lex - already configured
   - Polly - already working
   - Transcribe - already working
   - Translate - already working
   - Comprehend - already working

6. **Security**
   - IAM role for EC2 (S3, Lex, Polly, Transcribe, Translate, Comprehend access)
   - Security Groups
   - Key pair for SSH access

7. **Monitoring** (Basic)
   - CloudWatch logs (optional)
   - CloudWatch alarms for billing (recommended)

### Manual Setup Steps (No IaC for POC)

For POC, manual setup via AWS Console is acceptable:

1. Create RDS PostgreSQL instance
2. Create S3 bucket for listings
3. Create EC2 instance
4. Configure security groups
5. Set up IAM role for EC2
6. Deploy application to EC2

## Deployment Process

### 1. Prepare Application for Deployment
```bash
# Build application
npm run build

# Test build locally
node .build/index.js

# Create deployment package
tar -czf bharat-mandi-app.tar.gz .build/ node_modules/ package.json .env.testing
```

### 2. Set Up RDS Database
```bash
# Create RDS instance via AWS Console or CLI
aws rds create-db-instance \
  --db-instance-identifier bharat-mandi-testing \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password <secure-password> \
  --allocated-storage 20 \
  --vpc-security-group-ids <security-group-id> \
  --backup-retention-period 7 \
  --no-multi-az

# Wait for RDS to be available
aws rds wait db-instance-available --db-instance-identifier bharat-mandi-testing

# Get RDS endpoint
aws rds describe-db-instances --db-instance-identifier bharat-mandi-testing \
  --query 'DBInstances[0].Endpoint.Address'
```

### 3. Migrate Database
```bash
# From local machine, connect to RDS and run migrations
export POSTGRES_HOST=<rds-endpoint>
export POSTGRES_PORT=5432
export POSTGRES_DB=bharat_mandi
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=<secure-password>

npm run migrate

# Dev environment - no need to backup or import data
# Can create fresh test data after deployment
```

### 4. Create S3 Bucket for Listings
```bash
# Create S3 bucket
aws s3 mb s3://bharat-mandi-listings-testing --region ap-southeast-2

# Set bucket policy (allow EC2 IAM role to access)
aws s3api put-bucket-policy --bucket bharat-mandi-listings-testing --policy file://s3-policy.json
```

### 5. Launch EC2 Instance
```bash
# Launch EC2 instance
aws ec2 run-instances \
  --image-id ami-<ubuntu-22.04-ami> \
  --instance-type t3.small \
  --key-name <your-key-pair> \
  --security-group-ids <security-group-id> \
  --iam-instance-profile Name=<ec2-role-name> \
  --user-data file://user-data.sh \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=bharat-mandi-testing}]'
```

### 6. Deploy Application to EC2
```bash
# SSH to EC2 instance
ssh -i <key-pair>.pem ubuntu@<ec2-public-ip>

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Redis
sudo apt-get install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install MongoDB
sudo apt-get install -y mongodb
sudo systemctl enable mongodb
sudo systemctl start mongodb

# Upload and extract application
scp -i <key-pair>.pem bharat-mandi-app.tar.gz ubuntu@<ec2-public-ip>:~
tar -xzf bharat-mandi-app.tar.gz

# Start application with PM2
pm2 start .build/index.js --name bharat-mandi
pm2 save
pm2 startup
```

### 7. Verify Deployment
```bash
# Check application health
curl http://<ec2-public-ip>:3000/health

# Check logs
pm2 logs bharat-mandi

# Test Lex integration
curl -X POST http://<ec2-public-ip>:3000/api/kisan-mitra/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the price of tomatoes?", "language": "en"}'
```

## Cost Estimation

### POC/Testing Environment (Monthly)
- EC2 (t3.small, 730 hours): ~$15
- RDS (db.t3.micro, 730 hours): ~$15
- S3 (50GB storage): ~$1
- S3 (data transfer): ~$2
- Data Transfer (EC2 to internet): ~$5
- Lex (1000 requests): ~$4
- Polly (1M characters): ~$4
- Transcribe (100 minutes): ~$2.40
- Translate (1M characters): ~$15
- Comprehend (10K units): ~$1
- **Total: ~$64/month**

### Cost Optimization Tips
- Use t3.micro instead of t3.small: Save $7.50/month
- Shut down EC2 when not testing: Save ~50% of EC2 costs
- Use Reserved Instances for long-term: Save ~30%
- Set up billing alerts at $50, $75, $100

### Free Tier Benefits (First 12 Months)
- EC2: 750 hours/month of t2.micro or t3.micro
- RDS: 750 hours/month of db.t2.micro or db.t3.micro
- S3: 5GB storage
- Data Transfer: 15GB/month
- Lex: 10,000 text requests/month
- Polly: 5M characters/month
- Transcribe: 60 minutes/month
- Translate: 2M characters/month
- Comprehend: 50K units/month

**With Free Tier: ~$10-20/month for first year**

## Rollback Strategy

### Application Rollback
```bash
# Keep previous version on EC2
cp -r .build .build.backup

# If deployment fails, restore previous version
rm -rf .build
mv .build.backup .build
pm2 restart bharat-mandi
```

### Database Rollback
```bash
# RDS automated backups allow point-in-time recovery
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier bharat-mandi-testing \
  --target-db-instance-identifier bharat-mandi-testing-restored \
  --restore-time 2024-03-06T10:00:00Z
```

### S3 Rollback
```bash
# S3 versioning allows recovery of deleted/overwritten files
aws s3api list-object-versions --bucket bharat-mandi-listings-testing
aws s3api get-object --bucket bharat-mandi-listings-testing --key <key> --version-id <version-id> <output-file>
```

## Monitoring and Alerts

### Basic Monitoring (POC Level)
- CloudWatch metrics for EC2 (CPU, memory, disk)
- CloudWatch metrics for RDS (connections, CPU, storage)
- PM2 monitoring for application process
- Application logs via PM2

### Recommended Alerts
- Billing alert at $50, $75, $100
- EC2 CPU > 80% for 10 minutes
- RDS CPU > 80% for 10 minutes
- RDS storage < 20% free
- Application process down (PM2 alert)

### Log Management
```bash
# View application logs
pm2 logs bharat-mandi

# View system logs
sudo journalctl -u redis-server
sudo journalctl -u mongodb

# Optional: Send logs to CloudWatch
pm2 install pm2-cloudwatch
```

## Security Considerations

### Network Security (POC Level)
- Security group for EC2: Allow HTTP (80), HTTPS (443), SSH (22) from specific IPs
- Security group for RDS: Allow PostgreSQL (5432) from EC2 security group only
- Use Elastic IP or domain name (optional)

### Data Security
- Encryption at rest: S3 (default), RDS (enable)
- Encryption in transit: HTTPS (recommended but optional for POC)
- AWS credentials: Use IAM role for EC2 (no hardcoded credentials)
- Database password: Store in .env file on EC2 (Secrets Manager optional)

### Access Control
- IAM role for EC2 with permissions for:
  - S3 (read/write to listings and audio buckets)
  - Lex (invoke bot)
  - Polly (synthesize speech)
  - Transcribe (start transcription jobs)
  - Translate (translate text)
  - Comprehend (detect language)
- SSH key pair for EC2 access
- Restrict SSH access to specific IP addresses

### Best Practices
- Regular security updates: `sudo apt-get update && sudo apt-get upgrade`
- Disable root SSH login
- Use strong database password
- Enable RDS encryption
- Enable S3 bucket versioning
- Regular backups (RDS automated backups)

### Security Checklist
- [ ] EC2 security group configured
- [ ] RDS security group configured
- [ ] IAM role for EC2 created
- [ ] SSH key pair created and secured
- [ ] Database password is strong and secure
- [ ] RDS encryption enabled
- [ ] S3 bucket policies configured
- [ ] AWS credentials not in code
- [ ] Regular security updates scheduled


### 3. Database Configuration

**Updates to: `src/shared/database/db-config.ts`** (or wherever database config is)

```typescript
export function getDatabaseConfig() {
  const config = getEnvironmentConfig();

  return {
    host: config.database.host,
    port: config.database.port,
    database: config.database.name,
    user: config.database.user,
    password: config.database.password,
    ssl: config.database.ssl ? {
      rejectUnauthorized: true,
      // RDS certificate will be included in EC2 instance
    } : false,
    max: config.nodeEnv === 'development' ? 10 : 20, // Connection pool size
  };
}
```
