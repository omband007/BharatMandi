# Local + AWS Parallel Development Workflow

## Overview
This guide explains how to run the Bharat Mandi app locally while maintaining a parallel AWS deployment, using the same codebase for both environments.

## Current Setup

### Environment Files
- `.env` - Local development (your machine)
- `.env.production` - AWS EC2 production
- `.env.example` - Template for new developers

### Key Differences

| Component | Local | AWS EC2 |
|-----------|-------|---------|
| **Database** | RDS (shared) | RDS (shared) |
| **MongoDB** | localhost:27017 | localhost:27017 (on EC2) |
| **Redis** | localhost:6379 | localhost:6379 (on EC2) |
| **AWS Credentials** | Access keys in .env | IAM role (no keys needed) |
| **S3** | Shared buckets | Shared buckets |
| **Bedrock** | Shared (via credentials) | Shared (via IAM role) |
| **Port** | 3000 | 3000 |

## Setup: Running Locally

### 1. Prerequisites

```bash
# Install dependencies
npm install

# Install local services (if not already installed)
# MongoDB
# Download from: https://www.mongodb.com/try/download/community

# Redis (Windows)
# Download from: https://github.com/microsoftarchive/redis/releases
# Or use WSL: sudo apt-get install redis-server

# PostgreSQL (optional - you're using RDS)
# Download from: https://www.postgresql.org/download/
```

### 2. Environment Configuration

Your `.env` file is already configured correctly:

```bash
# Local Development Environment
NODE_ENV=development
PORT=3000

# AWS Credentials (for Bedrock, S3, Translate, etc.)
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=AKIAUDESSOGVA7ANEUI4
AWS_SECRET_ACCESS_KEY=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

# Database (Shared RDS)
POSTGRES_HOST=bharat-mandi-testing.c1y0cuowi6cr.ap-southeast-2.rds.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=BharatMandi2026!
DB_SSL=true

# S3 (Shared buckets)
S3_AUDIO_BUCKET=bharat-mandi-voice-ap-south-1
S3_LISTINGS_BUCKET=bharat-mandi-listings-testing
S3_REGION=ap-southeast-2
USE_S3_FOR_LISTINGS=true

# Bedrock
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
BEDROCK_REGION=ap-southeast-2

# Local Services
REDIS_HOST=localhost
REDIS_PORT=6379
MONGODB_URI=mongodb://localhost:27017/bharat_mandi
```

### 3. Start Local Services

```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Start Redis
redis-server

# Terminal 3: Start the app
npm run dev
```

### 4. Access Local App

```
http://localhost:3000
```

## Deployment Workflow

### Option 1: Manual Deployment (Current)

```bash
# 1. Make changes locally
# Edit files in src/

# 2. Test locally
npm run dev
# Test at http://localhost:3000

# 3. Build
npm run build

# 4. Deploy to EC2
scp -i test-key.pem -r .build ubuntu@13.236.3.139:/home/ubuntu/bharat-mandi-app/
scp -i test-key.pem -r public ubuntu@13.236.3.139:/home/ubuntu/bharat-mandi-app/

# 5. Restart on EC2
ssh -i test-key.pem ubuntu@13.236.3.139 "cd /home/ubuntu/bharat-mandi-app && pm2 restart bharat-mandi"
```

### Option 2: Automated Deployment Script (Recommended)

Create `scripts/deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying to AWS EC2..."

# 1. Build
echo "📦 Building..."
npm run build

# 2. Deploy files
echo "📤 Uploading files..."
scp -i test-key.pem -r .build ubuntu@13.236.3.139:/home/ubuntu/bharat-mandi-app/
scp -i test-key.pem -r public ubuntu@13.236.3.139:/home/ubuntu/bharat-mandi-app/

# 3. Restart app
echo "🔄 Restarting application..."
ssh -i test-key.pem ubuntu@13.236.3.139 "cd /home/ubuntu/bharat-mandi-app && pm2 restart bharat-mandi"

echo "✅ Deployment complete!"
echo "🌐 App available at: http://13.236.3.139:3000"
```

Add to `package.json`:

```json
{
  "scripts": {
    "deploy": "bash scripts/deploy.sh",
    "deploy:quick": "npm run build && bash scripts/deploy.sh"
  }
}
```

Usage:
```bash
npm run deploy
```

### Option 3: Git-based Deployment (Best Practice)

```bash
# On EC2, set up git pull deployment
ssh -i test-key.pem ubuntu@13.236.3.139

# On EC2:
cd /home/ubuntu/bharat-mandi-app
git init
git remote add origin <your-git-repo-url>

# Create deployment script on EC2
cat > deploy.sh << 'EOF'
#!/bin/bash
set -e
echo "🔄 Pulling latest changes..."
git pull origin main
echo "📦 Installing dependencies..."
npm install
echo "🏗️ Building..."
npm run build
echo "🔄 Restarting..."
pm2 restart bharat-mandi
echo "✅ Deployment complete!"
EOF

chmod +x deploy.sh
```

Then from local:
```bash
# 1. Commit changes
git add .
git commit -m "Your changes"
git push origin main

# 2. Deploy on EC2
ssh -i test-key.pem ubuntu@13.236.3.139 "cd /home/ubuntu/bharat-mandi-app && ./deploy.sh"
```

## Environment-Specific Configuration

### Shared Resources (Same for Both)
- ✅ RDS PostgreSQL database
- ✅ S3 buckets (listings, audio)
- ✅ AWS Bedrock (AI models)
- ✅ AWS Translate
- ✅ AWS Polly (voice)
- ✅ AWS Lex

### Local-Only Resources
- MongoDB (localhost)
- Redis (localhost)

### AWS-Only Resources
- MongoDB (on EC2)
- Redis (on EC2)

## Managing Configuration Changes

### 1. Database Schema Changes

```bash
# Local: Test migration
npm run db:setup

# If successful, deploy to EC2
ssh -i test-key.pem ubuntu@13.236.3.139
cd /home/ubuntu/bharat-mandi-app
npm run db:setup
```

### 2. Environment Variable Changes

```bash
# Local: Update .env
# Edit .env file

# AWS: Update .env on EC2
ssh -i test-key.pem ubuntu@13.236.3.139
cd /home/ubuntu/bharat-mandi-app
nano .env
# Make changes
pm2 restart bharat-mandi --update-env
```

### 3. Dependency Changes

```bash
# Local: Install new package
npm install <package-name>

# Commit package.json and package-lock.json
git add package.json package-lock.json
git commit -m "Add <package-name>"

# Deploy to EC2
ssh -i test-key.pem ubuntu@13.236.3.139
cd /home/ubuntu/bharat-mandi-app
git pull
npm install
pm2 restart bharat-mandi
```

## Best Practices

### 1. Use Git for Version Control

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit"

# Add remote (GitHub/GitLab/Bitbucket)
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Never Commit Secrets

Add to `.gitignore`:
```
.env
.env.local
.env.production
test-key.pem
*.pem
```

Keep `.env.example` for documentation.

### 3. Use Environment-Specific Configs

```typescript
// src/config/environment.ts
export const config = {
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // Use different settings based on environment
  database: {
    pool: process.env.NODE_ENV === 'production' ? 20 : 5,
  },
  
  logging: {
    level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
  },
};
```

### 4. Test Locally Before Deploying

```bash
# Always test locally first
npm run dev
# Test all features

# Then deploy
npm run deploy
```

### 5. Use PM2 Ecosystem File (Advanced)

Create `ecosystem.config.js` on EC2:

```javascript
module.exports = {
  apps: [{
    name: 'bharat-mandi',
    script: '.build/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_file: 'logs/combined.log',
    time: true
  }]
};
```

Then use:
```bash
pm2 start ecosystem.config.js
pm2 save
```

## Troubleshooting

### Issue: Local and AWS have different data

**Solution**: They share the same RDS database, so data should be the same. If MongoDB/Redis data differs, that's expected (local services).

### Issue: AWS credentials not working locally

**Solution**: 
1. Check `.env` has correct `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
2. Verify IAM user has necessary permissions
3. Test with: `aws sts get-caller-identity`

### Issue: Can't connect to RDS from local

**Solution**:
1. Check RDS security group allows your IP
2. Verify `POSTGRES_HOST` in `.env`
3. Test connection: `psql -h <host> -U postgres -d postgres`

### Issue: Deployment fails

**Solution**:
```bash
# Check EC2 logs
ssh -i test-key.pem ubuntu@13.236.3.139
cd /home/ubuntu/bharat-mandi-app
pm2 logs bharat-mandi --lines 50

# Check build errors
npm run build

# Check file permissions
ls -la .build/
```

## Quick Reference

### Local Development
```bash
# Start local services
mongod & redis-server &

# Start app
npm run dev

# Access
http://localhost:3000
```

### Deploy to AWS
```bash
# Quick deploy
npm run build
scp -i test-key.pem -r .build public ubuntu@13.236.3.139:/home/ubuntu/bharat-mandi-app/
ssh -i test-key.pem ubuntu@13.236.3.139 "cd /home/ubuntu/bharat-mandi-app && pm2 restart bharat-mandi"

# Access
http://13.236.3.139:3000
```

### Check AWS Status
```bash
# SSH to EC2
ssh -i test-key.pem ubuntu@13.236.3.139

# Check app status
pm2 status

# View logs
pm2 logs bharat-mandi --lines 50

# Restart app
pm2 restart bharat-mandi
```

## Advanced: CI/CD Pipeline (Future)

For automated deployments, consider:

1. **GitHub Actions**:
```yaml
# .github/workflows/deploy.yml
name: Deploy to EC2
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run build
      - run: scp -r .build ubuntu@ec2:~/app/
      - run: ssh ubuntu@ec2 "pm2 restart app"
```

2. **AWS CodeDeploy**: Automated deployment service
3. **Docker**: Containerize the app for consistent environments

## Summary

✅ **Local Development**: Use `.env` with AWS credentials
✅ **AWS Deployment**: Use `.env.production` with IAM role
✅ **Shared Resources**: RDS, S3, Bedrock (same for both)
✅ **Local Resources**: MongoDB, Redis (separate instances)
✅ **Deployment**: Build locally, SCP to EC2, restart PM2
✅ **Best Practice**: Use Git, test locally, deploy to AWS

Your current setup is already well-configured for parallel development!
