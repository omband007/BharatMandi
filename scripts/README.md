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

---

## Archive Rules for AI Agents

### When to Move Scripts to `scripts/archive/`

Move scripts to archive when they are:
- ✅ **One-time setup scripts** (e.g., `setup-crop-diagnosis-s3.ps1`)
- ✅ **One-time migration scripts** (e.g., `migrate-to-ap-south-1.ps1`, `update-sale-channel-enum.ts`)
- ✅ **Investigation/diagnostic scripts** for specific bugs (e.g., `diagnose-aws-issue.js`, `test-marathi-translation.js`)
- ✅ **One-time sync/fix scripts** (e.g., `sync-all-html-from-aws.ps1`, `download-index-from-aws.ps1`)
- ✅ **Verification scripts** for one-time setup validation (e.g., `verify-crop-diagnosis-s3.ps1`)
- ✅ **Download/setup scripts** for initial project setup (e.g., `download-test-images.py`)

### What to Keep in Active Directories

Keep scripts in their functional directories when they are:
- ❌ **Reusable deployment scripts** (e.g., `deploy.ps1`, `deploy.sh`)
- ❌ **Ongoing diagnostic tools** (e.g., `test-marketplace-api.ts`, `diagnose-marketplace.ts`)
- ❌ **Seed/data generation scripts** used regularly (e.g., `seed-farming-tips.ts`)
- ❌ **Utility scripts** used repeatedly (e.g., `clear-audio-cache.js`)
- ❌ **Test runners** and test infrastructure (e.g., `run-perf-tests.ps1`)
- ❌ **Code sync verification** tools (e.g., `check-code-sync.ps1`)

### Decision Criteria

Ask yourself:
1. **Will this script be run again?** If no → archive
2. **Was this for a specific one-time task?** If yes → archive
3. **Is this investigating a specific bug?** If yes → archive after bug is fixed
4. **Is this setting up something already set up?** If yes → archive
5. **Is this a migration that's already been run?** If yes → archive

### Examples

**Archive** ✅:
- `setup-crop-diagnosis-s3.ps1` - S3 bucket already created
- `migrate-to-ap-south-1.ps1` - Migration already completed
- `sync-all-html-from-aws.ps1` - Code drift already fixed
- `update-sale-channel-enum.ts` - Schema already updated
- `test-marathi-translation.js` - Investigation already completed

**Keep** ❌:
- `deploy.ps1` - Used for every deployment
- `check-code-sync.ps1` - Used to verify sync status anytime
- `seed-farming-tips.ts` - Used to regenerate test data
- `clear-audio-cache.js` - Used when audio cache needs clearing
- `test-marketplace-api.ts` - Used to test marketplace functionality

---

## Archive Organization

Unlike `docs/archive/` which uses dated folders, `scripts/archive/` is a flat directory containing all archived scripts. This is because:
- Scripts are self-documenting with comments
- Script filenames indicate their purpose
- Less overhead for script archival
- Easy to search and reference if needed later

If you need to reference why a script was archived, check:
- `docs/archive/{task-type}-{YYYY-MM-DD}/README.md` - Work documentation
- Git commit history - Shows when and why script was archived
