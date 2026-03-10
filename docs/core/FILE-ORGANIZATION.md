# File Organization Guide

**Last Updated**: March 10, 2026

This document explains the project's file organization structure after the root folder cleanup.

---

## Root Directory (Minimal)

The root directory contains only essential project files:

```
/
├── .env                    # Local environment variables (gitignored)
├── .gitignore             # Git ignore rules
├── docker-compose.yml     # Docker services (MongoDB, Redis)
├── package.json           # Node.js dependencies
├── package-lock.json      # Dependency lock file
├── README.md              # Project overview
├── tsconfig.json          # TypeScript configuration
└── test-key.pem          # EC2 SSH key (gitignored) - TODO: Move to scripts/deployment/
```

---

## Directory Structure

### `/config/` - Configuration Files
Environment configuration templates and settings:
- `.env.example` - Template for local development
- `.env.production` - Production environment config
- `.env.rds-test` - RDS test environment config
- `README.md` - Configuration documentation

**Note**: Actual `.env` file stays in root (gitignored, used by app)

### `/docs/` - Documentation
All project documentation organized by category:

```
docs/
├── core/                  # Core documentation
│   ├── DEVELOPMENT.md    # Development guide (moved from root)
│   ├── QUICKSTART.md     # Quick start guide
│   ├── PROJECT-STRUCTURE.md
│   └── FILE-ORGANIZATION.md (this file)
│
├── architecture/          # Architecture docs
├── database/             # Database docs (SQL scripts moved to scripts/)
├── features/             # Feature documentation
├── infrastructure/       # Infrastructure docs
│   └── aws/             # AWS config files (JSON policies)
│
├── testing/              # Testing documentation
├── product-standards/    # Standards and guidelines
└── archive/              # Historical docs + dated work folders
    ├── cleanup-YYYY-MM-DD/   # Temporary cleanup work documents
    ├── investigation-YYYY-MM-DD/  # Investigation work documents
    └── [historical .md files]     # Old implementation notes
```

### `/scripts/` - Utility Scripts
Organized by purpose:

```
scripts/
├── deployment/           # Deployment scripts
│   ├── deploy-to-ec2.sh
│   ├── ec2-setup.sh
│   └── test-key.pem     # EC2 SSH key (TODO: move here)
│
├── database/            # Database scripts
│   ├── sql/            # SQL scripts (moved from docs/)
│   │   ├── check-users-references.sql
│   │   ├── create-more-listings.sql
│   │   ├── create-test-listing.sql
│   │   ├── drop-users-table.sql
│   │   ├── insert-user.sql
│   │   ├── migrate-to-user-profiles.sql
│   │   └── rds-schema-init.sql
│   ├── seed-farming-tips.ts
│   └── ...
│
├── tests/               # Test scripts
│   ├── test-bedrock-access.ps1
│   ├── test-claude-marketplace.ps1
│   └── ...
│
├── perf-tests/          # Performance testing
│   ├── artillery-*.yml
│   ├── quick-test-single.ps1
│   └── test-data/
│
├── archive/             # Archived scripts (moved from docs/)
│   ├── check-db.js
│   ├── diagnose-connection.js
│   └── ... (20 JS files)
│
└── ...                  # Other utility scripts
```

### `/src/` - Source Code
Application source code (TypeScript)

### `/public/` - Public Assets
HTML files and static assets served to users

### `/data/` - Local Data
Local database files and media (gitignored)

### `/test-images/` - Test Images
Test images for AI features

---

## File Movement Summary

### Moved to `docs/archive/`
- All `*-IMPLEMENTATION.md` files
- All `*-COMPLETE.md` files
- All `*-FEATURE.md` files
- Historical implementation notes
- **Note**: JS scripts moved to `scripts/archive/`

### Moved to `docs/infrastructure/aws/`
- `bedrock-iam-policy-local.json`
- `bedrock-policy-update.json`
- `ec2-permissions-policy.json`
- `ec2-trust-policy.json`
- `s3-bucket-policy.json`
- `s3-cors-config.json`

### Moved to `scripts/database/sql/`
- All `.sql` files from `docs/database/`
- Database migration scripts

### Moved to `scripts/tests/`
- All `test-*.ps1` files
- All `test-*.js` files
- Test documentation

### Moved to `scripts/deployment/`
- `deploy-to-ec2.sh`
- `ec2-setup.sh`
- `test-key.pem` (TODO: complete move)

### Moved to `docs/core/`
- `DEVELOPMENT.md`

### Moved to root `/`
- `docker-compose.yml` (from `docs/infrastructure/`)

### Moved to `config/`
- `.env.example`
- `.env.production`
- `.env.rds-test`

### Moved to `scripts/archive/`
- 20 JS files from `docs/archive/`
- Old diagnostic and migration scripts

---

## Maintenance Guidelines

### Keep in Root
✅ Essential config files (`.env`, `package.json`, `tsconfig.json`, `.gitignore`)  
✅ Main documentation (`README.md`)  
✅ SSH keys for deployment (`.pem` files - gitignored)

### Move to `docs/archive/`
❌ Implementation completion notes (`*-COMPLETE.md`, `*-IMPLEMENTATION.md`)  
❌ Feature summaries (`*-FEATURE.md`, `*-SUMMARY.md`)  
❌ One-time fix documentation (`*-FIX.md`)

### Move to Appropriate Folders
❌ AWS configs → `docs/infrastructure/aws/`  
❌ SQL scripts → `docs/database/`  
❌ Test scripts → `scripts/tests/`  
❌ Deployment scripts → `scripts/deployment/`  
❌ Environment templates → `config/`

### Delete
❌ Compressed archives (`.tar.gz`, `.zip`)  
❌ Temporary files  
❌ Duplicate files

---

## Benefits of This Structure

1. **Clean Root**: Only 6-7 essential files in root
2. **Logical Organization**: Files grouped by purpose
3. **Easy Navigation**: Clear directory structure
4. **Better Gitignore**: Prevents future clutter
5. **Professional**: Industry-standard organization

---

## TODO

- [ ] Complete move of `test-key.pem` to `scripts/deployment/`
- [ ] Update all script references to new paths
- [ ] Add `scripts/README.md` to document script organization
- [ ] Consider moving `test-images/` to `docs/testing/test-images/`

---

## References

- [Project Structure](./PROJECT-STRUCTURE.md)
- [Development Guide](./DEVELOPMENT.md)
- [Root Folder Cleanup Log](../archive/ROOT-FOLDER-CLEANUP-2026-03-10.md)
