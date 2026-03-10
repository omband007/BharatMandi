# Bharat Mandi - Development Guide

## Quick Start

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start local services (MongoDB, Redis)
# MongoDB: Run mongod in a separate terminal
# Redis: Run redis-server in a separate terminal

# 3. Start the app
npm run dev

# 4. Access the app
# http://localhost:3000
```

### Deploy to AWS

```bash
# Option 1: Build and deploy separately
npm run build
npm run deploy

# Option 2: Build and deploy in one command
npm run deploy:build
```

## Environment Setup

### Local (.env)
- Uses AWS credentials (access keys)
- Connects to shared RDS database
- Uses local MongoDB and Redis
- Same S3 buckets as production

### AWS EC2 (.env on server)
- Uses IAM role (no access keys)
- Connects to shared RDS database
- Uses EC2-local MongoDB and Redis
- Same S3 buckets as local

## Common Tasks

### Run Locally
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Deploy to AWS
```bash
npm run deploy
```

### View AWS Logs
```bash
ssh -i test-key.pem ubuntu@13.236.3.139 "pm2 logs bharat-mandi --lines 50"
```

### Restart AWS App
```bash
ssh -i test-key.pem ubuntu@13.236.3.139 "pm2 restart bharat-mandi"
```

### Database Migrations
```bash
# Local
npm run db:setup

# AWS (after deploying)
ssh -i test-key.pem ubuntu@13.236.3.139
cd /home/ubuntu/bharat-mandi-app
npm run db:setup
```

## Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## Project Structure

```
bharat-mandi-poc/
├── src/                    # Source code
│   ├── features/          # Feature modules
│   │   ├── auth/         # Authentication
│   │   ├── listings/     # Marketplace listings
│   │   ├── i18n/         # Kisan Mitra AI assistant
│   │   └── ...
│   ├── shared/           # Shared utilities
│   └── index.ts          # Entry point
├── public/               # Static files (HTML, CSS, JS)
├── .build/              # Compiled JavaScript (generated)
├── scripts/             # Deployment and utility scripts
├── .env                 # Local environment config
└── package.json         # Dependencies and scripts
```

## Key Features

### Kisan Mitra AI Assistant
- **Location**: `src/features/i18n/`
- **Models**: Claude Sonnet 4.6, Amazon Nova Lite
- **Languages**: 11 Indian languages
- **Modes**: Mock, Lex, Bedrock (Nova), Bedrock (Claude)

### Marketplace
- **Location**: `src/features/listings/`
- **Features**: Create, browse, search listings
- **Storage**: S3 for images, RDS for data

### Multi-language Support
- **Location**: `src/features/i18n/`
- **Service**: AWS Translate
- **Languages**: English, Hindi, Punjabi, Marathi, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Odia

## Troubleshooting

### Can't connect to RDS
- Check security group allows your IP
- Verify credentials in `.env`

### AWS credentials not working
- Check `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env`
- Verify IAM user has necessary permissions

### Deployment fails
- Check build succeeded: `npm run build`
- Verify SSH key: `test-key.pem`
- Check EC2 is running

### App not starting locally
- Ensure MongoDB is running: `mongod`
- Ensure Redis is running: `redis-server`
- Check port 3000 is available

## Resources

- **AWS Console**: https://console.aws.amazon.com/
- **EC2 Instance**: 13.236.3.139
- **RDS Database**: bharat-mandi-testing.c1y0cuowi6cr.ap-southeast-2.rds.amazonaws.com
- **Documentation**: `.kiro/specs/infrastructure/deployment/`

## Support

For detailed deployment workflows, see:
- `LOCAL-AWS-PARALLEL-WORKFLOW.md` - Complete guide for parallel development
- `CLAUDE-SONNET-4-6-SYDNEY.md` - Claude Sonnet 4.6 configuration
- `BEDROCK-SUCCESS.md` - Bedrock setup and testing
