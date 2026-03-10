# Scripts

Utility scripts for development, testing, deployment, and diagnostics.

## Structure

```
scripts/
├── deployment/          # Deployment scripts
│   ├── deploy.ps1      # PowerShell deployment
│   ├── deploy.sh       # Bash deployment
│   ├── deploy-to-ec2.sh
│   ├── ec2-setup.sh
│   ├── update-ec2-iam-role.ps1
│   └── test-key.pem    # EC2 SSH key
│
├── aws-setup/          # AWS infrastructure setup
│   ├── setup-crop-diagnosis-s3.ps1
│   ├── setup-crop-diagnosis-s3.sh
│   ├── setup-crop-diagnosis-s3-clean.ps1
│   ├── verify-crop-diagnosis-s3.ps1
│   ├── verify-crop-diagnosis-s3.sh
│   ├── migrate-to-ap-south-1.ps1
│   └── migrate-to-ap-south-1.sh
│
├── database/           # Database scripts
│   ├── sql/           # SQL migration scripts
│   ├── seed-farming-tips.ts
│   ├── seed-marketplace-listings.ts
│   ├── translate-and-seed-farming-tips.ts
│   ├── update-sale-channel-enum.ts
│   ├── update-user-type.ts
│   └── update-user-type.sql
│
├── diagnostics/        # Diagnostic and troubleshooting scripts
│   ├── diagnose-marketplace.ts
│   ├── test-kisan-mitra-live.ts
│   ├── test-lex-connection.js
│   └── test-marketplace-api.ts
│
├── utilities/          # Utility scripts
│   ├── clear-audio-cache.js
│   ├── download-test-images.ps1
│   ├── download-test-images.py
│   ├── download-test-images.sh
│   └── test-image-requirements.txt
│
├── tests/             # Test scripts
├── perf-tests/        # Performance testing
├── archive/           # Archived/deprecated scripts
│
├── README.md          # This file
├── install-perf-tools.ps1  # Install performance testing tools
├── run-perf-tests.ps1      # Run performance tests
└── jest.config.js          # Jest configuration
```

## Usage

Scripts in this folder are meant to be run from the project root:

```bash
# Deployment
.\scripts\deployment\deploy.ps1

# AWS Setup
.\scripts\aws-setup\setup-crop-diagnosis-s3.ps1

# Database Seeding
npx ts-node scripts/database/seed-farming-tips.ts

# Diagnostics
npx ts-node scripts/diagnostics/diagnose-marketplace.ts

# Performance Testing
.\scripts\install-perf-tools.ps1
.\scripts\run-perf-tests.ps1
```

## AWS Configuration Files

AWS infrastructure configuration files (JSON) are located in `docs/infrastructure/aws/`:
- `crop-diagnosis-cors.json` - S3 CORS configuration
- `crop-diagnosis-iam-policy.json` - IAM policy
- `crop-diagnosis-lifecycle.json` - S3 lifecycle rules

These are Infrastructure-as-Code documentation and are referenced by scripts in `aws-setup/`.

## Guidelines

1. Keep scripts focused on a single purpose
2. Add clear comments explaining what the script does
3. Include usage examples in script headers
4. Use descriptive filenames
