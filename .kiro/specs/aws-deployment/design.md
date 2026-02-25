---
feature: aws-deployment
status: not_started
created: 2026-02-25
---

# AWS Cloud Deployment - Design Document

## Architecture Overview

### Target Cloud Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS CLOUD                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Application Load Balancer                │  │
│  │                  (HTTPS/SSL)                          │  │
│  └────────────────────┬─────────────────────────────────┘  │
│                       │                                     │
│  ┌────────────────────┴─────────────────────────────────┐  │
│  │         Auto Scaling Group (EC2 Instances)           │  │
│  │                                                       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │
│  │  │ Backend  │  │ Backend  │  │ Backend  │          │  │
│  │  │ Node.js  │  │ Node.js  │  │ Node.js  │          │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘          │  │
│  └───────┼─────────────┼─────────────┼─────────────────┘  │
│          │             │             │                     │
│  ┌───────┴─────────────┴─────────────┴─────────────────┐  │
│  │                                                       │  │
│  │  ┌─────────┐  ┌────────────┐  ┌──────────┐         │  │
│  │  │   RDS   │  │     S3     │  │ Rekogni- │         │  │
│  │  │Postgres │  │   Media    │  │  tion    │         │  │
│  │  └─────────┘  └────────────┘  └──────────┘         │  │
│  │                                                       │  │
│  │  ┌──────────┐  ┌────────────┐                       │  │
│  │  │ Pinpoint │  │  Secrets   │                       │  │
│  │  │   SMS    │  │  Manager   │                       │  │
│  │  └──────────┘  └────────────┘                       │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Hybrid Development Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  LOCAL DEVELOPMENT                       │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Frontend │→ │ Backend  │→ │PostgreSQL│             │
│  │ Browser  │  │ Node.js  │  │  Local   │             │
│  └──────────┘  └────┬─────┘  └──────────┘             │
│                     │                                   │
│                     │ (Environment-based routing)       │
│                     ↓                                   │
└─────────────────────┼───────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ↓ (AWS_ENABLED=true)        ↓ (AWS_ENABLED=false)
┌───────────────────┐       ┌──────────────────┐
│   AWS SERVICES    │       │  LOCAL SERVICES  │
│                   │       │                  │
│  • S3             │       │  • Filesystem    │
│  • Rekognition    │       │  • Mock AI       │
│  • Pinpoint       │       │  • Console logs  │
└───────────────────┘       └──────────────────┘
```

## Component Design

### 1. Environment Configuration

**File: `src/config/aws.config.ts`**

```typescript
export interface AWSConfig {
  enabled: boolean;
  region: string;
  s3: {
    bucket: string;
    endpoint?: string; // For local testing with LocalStack
  };
  rekognition: {
    enabled: boolean;
  };
  pinpoint: {
    enabled: boolean;
    applicationId: string;
  };
  rds: {
    host: string;
    port: number;
    database: string;
    // Credentials from Secrets Manager
  };
}

export function getAWSConfig(): AWSConfig {
  return {
    enabled: process.env.AWS_ENABLED === 'true',
    region: process.env.AWS_REGION || 'ap-south-1', // Mumbai
    s3: {
      bucket: process.env.AWS_S3_BUCKET || 'bharat-mandi-media',
      endpoint: process.env.AWS_S3_ENDPOINT, // For LocalStack
    },
    rekognition: {
      enabled: process.env.AWS_REKOGNITION_ENABLED === 'true',
    },
    pinpoint: {
      enabled: process.env.AWS_PINPOINT_ENABLED === 'true',
      applicationId: process.env.AWS_PINPOINT_APP_ID || '',
    },
    rds: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'bharat_mandi',
    },
  };
}
```

### 2. Storage Service (S3 Integration)

**Updates to: `src/features/marketplace/storage.service.ts`**

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getAWSConfig } from '../../config/aws.config';

const awsConfig = getAWSConfig();
const s3Client = awsConfig.enabled ? new S3Client({ region: awsConfig.region }) : null;

export async function uploadToS3(
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  if (!awsConfig.enabled || !s3Client) {
    // Fallback to local storage
    return uploadToLocal(file, fileName, mimeType);
  }

  const key = `media/${Date.now()}-${fileName}`;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: awsConfig.s3.bucket,
    Key: key,
    Body: file,
    ContentType: mimeType,
  }));

  // Return S3 URL
  return `https://${awsConfig.s3.bucket}.s3.${awsConfig.region}.amazonaws.com/${key}`;
}

export async function getSignedDownloadUrl(s3Key: string): Promise<string> {
  if (!awsConfig.enabled || !s3Client) {
    return s3Key; // Return as-is for local files
  }

  const command = new GetObjectCommand({
    Bucket: awsConfig.s3.bucket,
    Key: s3Key,
  });

  // Generate signed URL valid for 1 hour
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}
```

### 3. AI Grading Service (Rekognition Integration)

**Updates to: `src/features/grading/grading.service.ts`**

```typescript
import { RekognitionClient, DetectLabelsCommand } from '@aws-sdk/client-rekognition';
import { getAWSConfig } from '../../config/aws.config';

const awsConfig = getAWSConfig();
const rekognitionClient = awsConfig.rekognition.enabled 
  ? new RekognitionClient({ region: awsConfig.region }) 
  : null;

export async function analyzeProduceImage(imageBuffer: Buffer): Promise<AIAnalysis> {
  if (!awsConfig.rekognition.enabled || !rekognitionClient) {
    // Fallback to mock analysis
    return mockAIAnalysis();
  }

  const command = new DetectLabelsCommand({
    Image: { Bytes: imageBuffer },
    MaxLabels: 10,
    MinConfidence: 70,
  });

  const response = await rekognitionClient.send(command);
  
  // Map Rekognition labels to produce types
  const detectedCrop = mapLabelsToProduceType(response.Labels || []);
  
  return {
    detectedCrop,
    confidence: calculateConfidence(response.Labels),
    details: extractQualityMetrics(response.Labels),
  };
}

function mapLabelsToProduceType(labels: any[]): string {
  const produceMap: Record<string, string> = {
    'Tomato': 'Tomato',
    'Potato': 'Potato',
    'Onion': 'Onion',
    // ... more mappings
  };

  for (const label of labels) {
    if (produceMap[label.Name]) {
      return produceMap[label.Name];
    }
  }

  return 'unknown';
}
```

### 4. SMS Service (Pinpoint Integration)

**Updates to: `src/features/auth/auth.service.ts`**

```typescript
import { PinpointClient, SendMessagesCommand } from '@aws-sdk/client-pinpoint';
import { getAWSConfig } from '../../config/aws.config';

const awsConfig = getAWSConfig();
const pinpointClient = awsConfig.pinpoint.enabled
  ? new PinpointClient({ region: awsConfig.region })
  : null;

async function sendOTP(phoneNumber: string, otp: string): Promise<void> {
  if (!awsConfig.pinpoint.enabled || !pinpointClient) {
    // Fallback to console logging
    console.log(`[SMS] Sending OTP ${otp} to ${phoneNumber}`);
    return;
  }

  const params = {
    ApplicationId: awsConfig.pinpoint.applicationId,
    MessageRequest: {
      Addresses: {
        [phoneNumber]: {
          ChannelType: 'SMS',
        },
      },
      MessageConfiguration: {
        SMSMessage: {
          Body: `Your Bharat Mandi OTP is: ${otp}. Valid for 10 minutes.`,
          MessageType: 'TRANSACTIONAL',
        },
      },
    },
  };

  await pinpointClient.send(new SendMessagesCommand(params));
}
```

### 5. Database Configuration

**Updates to: `src/shared/database/db-config.ts`**

```typescript
export function getDatabaseConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  const awsEnabled = process.env.AWS_ENABLED === 'true';

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'bharat_mandi',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: awsEnabled && isProduction ? {
      rejectUnauthorized: true,
      ca: process.env.RDS_CA_CERT, // RDS certificate
    } : false,
    max: awsEnabled ? 20 : 10, // Connection pool size
  };
}
```

## Deployment Strategy

### Environment Variables

**Local Development (`.env.local`)**:
```bash
NODE_ENV=development
AWS_ENABLED=false
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bharat_mandi
DB_USER=postgres
DB_PASSWORD=postgres
```

**AWS Staging (`.env.staging`)**:
```bash
NODE_ENV=staging
AWS_ENABLED=true
AWS_REGION=ap-south-1
AWS_S3_BUCKET=bharat-mandi-staging-media
AWS_REKOGNITION_ENABLED=true
AWS_PINPOINT_ENABLED=true
AWS_PINPOINT_APP_ID=<staging-app-id>
DB_HOST=<rds-staging-endpoint>
DB_PORT=5432
DB_NAME=bharat_mandi_staging
# DB credentials from Secrets Manager
```

**AWS Production (`.env.production`)**:
```bash
NODE_ENV=production
AWS_ENABLED=true
AWS_REGION=ap-south-1
AWS_S3_BUCKET=bharat-mandi-prod-media
AWS_REKOGNITION_ENABLED=true
AWS_PINPOINT_ENABLED=true
AWS_PINPOINT_APP_ID=<prod-app-id>
DB_HOST=<rds-prod-endpoint>
DB_PORT=5432
DB_NAME=bharat_mandi_prod
# DB credentials from Secrets Manager
```

## Infrastructure as Code

### AWS Resources (Terraform/CloudFormation)

**Resources to provision:**

1. **VPC and Networking**
   - VPC with public/private subnets
   - Internet Gateway
   - NAT Gateway (for private subnets)
   - Security Groups

2. **Compute**
   - EC2 instances (t3.small for staging, t3.medium for prod)
   - Auto Scaling Group (min: 2, max: 10)
   - Application Load Balancer
   - Target Groups

3. **Database**
   - RDS PostgreSQL (db.t3.micro for staging, db.t3.small for prod)
   - Multi-AZ for production
   - Automated backups (7 days retention)

4. **Storage**
   - S3 bucket for media
   - Lifecycle policies (archive after 90 days)
   - Versioning enabled

5. **AI/ML**
   - Rekognition (pay-per-use)

6. **Messaging**
   - Pinpoint SMS channel
   - SNS for notifications

7. **Security**
   - IAM roles and policies
   - Secrets Manager for credentials
   - ACM for SSL certificates

8. **Monitoring**
   - CloudWatch logs
   - CloudWatch alarms
   - SNS alerts

## Deployment Process

### 1. Build and Package
```bash
npm run build
zip -r app.zip dist/ node_modules/ package.json
```

### 2. Upload to S3
```bash
aws s3 cp app.zip s3://bharat-mandi-deployments/app-v1.0.0.zip
```

### 3. Deploy to EC2
```bash
# SSH to EC2 instance
ssh -i key.pem ec2-user@<instance-ip>

# Download and extract
aws s3 cp s3://bharat-mandi-deployments/app-v1.0.0.zip .
unzip app.zip

# Run migrations
npm run migrate

# Start application (with PM2)
pm2 start dist/app.js --name bharat-mandi
pm2 save
```

### 4. Health Check
```bash
curl https://api.bharatmandi.com/health
```

## Cost Estimation

### Staging Environment (Monthly)
- EC2 (t3.small): $15
- RDS (db.t3.micro): $15
- S3 (100GB): $2
- Data Transfer: $5
- Rekognition (1000 images): $1
- Pinpoint (1000 SMS): $10
- **Total: ~$50/month**

### Production Environment (Monthly)
- EC2 (2x t3.medium): $60
- RDS (db.t3.small, Multi-AZ): $50
- S3 (1TB): $23
- Data Transfer: $50
- Rekognition (10,000 images): $10
- Pinpoint (10,000 SMS): $100
- Load Balancer: $20
- **Total: ~$313/month**

## Rollback Strategy

1. Keep previous version in S3
2. PM2 can restart previous version
3. Database migrations are reversible
4. Load balancer can route to old instances

## Monitoring and Alerts

- CPU > 80% for 5 minutes
- Memory > 80% for 5 minutes
- Error rate > 5% for 5 minutes
- Response time > 1s (p95)
- Database connections > 80%
- S3 upload failures
- SMS delivery failures

## Security Considerations

1. **Network Security**
   - Private subnets for database
   - Security groups restrict access
   - HTTPS only (redirect HTTP)

2. **Data Security**
   - Encryption at rest (S3, RDS)
   - Encryption in transit (TLS 1.2+)
   - Secrets in Secrets Manager

3. **Access Control**
   - IAM roles (no hardcoded credentials)
   - Least privilege principle
   - MFA for AWS console

4. **Compliance**
   - Data residency (India region)
   - Audit logs enabled
   - Regular security scans
