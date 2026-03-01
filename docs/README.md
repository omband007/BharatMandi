# Bharat Mandi Documentation

Welcome to the Bharat Mandi documentation! This folder contains comprehensive documentation for the agricultural marketplace platform.

## 📁 Documentation Structure

### 📦 [core/](./core/)
Essential platform documentation
- `QUICKSTART.md` - Quick start guide for new developers
- `PROJECT-STRUCTURE.md` - Codebase organization
- `NEXT-STEPS.md` - What to do after setup

### 🏗️ [architecture/](./architecture/)
Architecture decisions and code organization
- `ARCHITECTURE-COMPARISON.md` - Architecture comparison and decisions
- `CODE-ORGANIZATION.md` - Code structure and organization
- `VERTICAL-SLICING-GUIDE.md` - Vertical slicing architecture guide
- `VERTICAL-SLICING-MIGRATION.md` - Migration to vertical slicing
- `diagrams/` - Architecture diagrams and visuals

### 🗄️ [database/](./database/)
Database setup, schemas, and documentation
- `DATABASE-DOCUMENTATION.md` - Complete database documentation
- `DATABASE-ER-DIAGRAMS.md` - Entity-relationship diagrams
- `DATABASE-SETUP.md` - Setup instructions
- `DUAL-DATABASE-SETUP.md` - Dual-database (PostgreSQL + SQLite) setup
- `MONGODB-SETUP.md` - MongoDB configuration
- `DATABASE-SUMMARY.md` - Quick database overview

### ☁️ [infrastructure/](./infrastructure/)
AWS services, deployment, and infrastructure
- `aws/` - AWS service documentation (Lex, Transcribe, Polly, Translate)
- `deployment/` - Deployment guides
- `REDIS-SETUP.md` - Redis caching setup

### ✨ [features/](./features/)
Feature-specific documentation
- `kisan-mitra/` - AI Voice Assistant
- `translation/` - Internationalization & Translation
- `grading/` - AI-Powered Produce Grading
- `marketplace/` - Digital Marketplace
- `authentication/` - User Authentication
- `crop-detection/` - AI Crop Identification

### 🎨 [ui/](./ui/)
User interface components and guidelines
- `UI-GUIDE.md` - Complete UI component guide

### 🧪 [testing/](./testing/)
Testing strategy, guides, and test coverage reports
- `TEST-STRATEGY.md` - Comprehensive testing strategy
- `TESTING-OVERVIEW.md` - Visual overview of test types
- `TESTING-QUICK-REFERENCE.md` - Quick commands and patterns
- `DUAL-DATABASE-TESTING-GUIDE.md` - Testing dual-database architecture

### 📋 [standards/](./standards/)
Product quality standards and best practices
- `security/` - Security standards and audits
- Future: `accessibility/`, `performance/`, `supportability/`

### 🔍 [investigations/](./investigations/)
Research and technical investigations
- `aws-translate-content-safety-2026-02-28/`
- `marathi-translation/`

### 📦 [archive/](./archive/)
Historical documentation and old files
- Old scripts and migration files
- Historical reorganization documents

---

## 🚀 Quick Start

### For Developers
1. Start with [core/QUICKSTART.md](./core/QUICKSTART.md)
2. Review [architecture/CODE-ORGANIZATION.md](./architecture/CODE-ORGANIZATION.md)
3. Check [features/marketplace/API-WORKFLOW-GUIDE.md](./features/marketplace/API-WORKFLOW-GUIDE.md)

### For Testers
1. Read [testing/TESTING-OVERVIEW.md](./testing/TESTING-OVERVIEW.md)
2. Use [testing/TESTING-QUICK-REFERENCE.md](./testing/TESTING-QUICK-REFERENCE.md)
3. Follow [testing/TEST-STRATEGY.md](./testing/TEST-STRATEGY.md)

### For DevOps
1. Review [infrastructure/deployment/AWS-DEPLOYMENT-GUIDE.md](./infrastructure/deployment/AWS-DEPLOYMENT-GUIDE.md)
2. Check [database/DATABASE-SETUP.md](./database/DATABASE-SETUP.md)
3. Configure [database/DUAL-DATABASE-SETUP.md](./database/DUAL-DATABASE-SETUP.md)

### For Architects
1. Study [architecture/ARCHITECTURE-COMPARISON.md](./architecture/ARCHITECTURE-COMPARISON.md)
2. Review [architecture/VERTICAL-SLICING-GUIDE.md](./architecture/VERTICAL-SLICING-GUIDE.md)
3. Check [database/DATABASE-ER-DIAGRAMS.md](./database/DATABASE-ER-DIAGRAMS.md)

---

## 📖 Key Documents

### Essential Reading
- **[core/QUICKSTART.md](./core/QUICKSTART.md)** - Get started quickly
- **[features/marketplace/API-WORKFLOW-GUIDE.md](./features/marketplace/API-WORKFLOW-GUIDE.md)** - API usage patterns
- **[testing/TEST-STRATEGY.md](./testing/TEST-STRATEGY.md)** - Testing approach
- **[infrastructure/deployment/AWS-DEPLOYMENT-GUIDE.md](./infrastructure/deployment/AWS-DEPLOYMENT-GUIDE.md)** - Deployment process

### Architecture & Design
- **[architecture/ARCHITECTURE-COMPARISON.md](./architecture/ARCHITECTURE-COMPARISON.md)** - Architecture decisions
- **[architecture/VERTICAL-SLICING-GUIDE.md](./architecture/VERTICAL-SLICING-GUIDE.md)** - Feature-based organization
- **[architecture/CODE-ORGANIZATION.md](./architecture/CODE-ORGANIZATION.md)** - Code structure

### Database
- **[database/DATABASE-DOCUMENTATION.md](./database/DATABASE-DOCUMENTATION.md)** - Complete DB docs
- **[database/DUAL-DATABASE-SETUP.md](./database/DUAL-DATABASE-SETUP.md)** - Dual-DB architecture

### Testing
- **[testing/TESTING-OVERVIEW.md](./testing/TESTING-OVERVIEW.md)** - Testing at a glance
- **[testing/TESTING-QUICK-REFERENCE.md](./testing/TESTING-QUICK-REFERENCE.md)** - Quick commands

---

## 🔍 Finding Documentation

### By Topic

| Topic | Document |
|-------|----------|
| Getting Started | [core/QUICKSTART.md](./core/QUICKSTART.md) |
| API Usage | [features/marketplace/API-WORKFLOW-GUIDE.md](./features/marketplace/API-WORKFLOW-GUIDE.md) |
| Authentication | [features/authentication/](./features/authentication/) |
| Testing | [testing/TEST-STRATEGY.md](./testing/TEST-STRATEGY.md) |
| Database | [database/DATABASE-DOCUMENTATION.md](./database/DATABASE-DOCUMENTATION.md) |
| Deployment | [infrastructure/deployment/AWS-DEPLOYMENT-GUIDE.md](./infrastructure/deployment/AWS-DEPLOYMENT-GUIDE.md) |
| Architecture | [architecture/ARCHITECTURE-COMPARISON.md](./architecture/ARCHITECTURE-COMPARISON.md) |
| Multi-Language | [features/translation/](./features/translation/) |
| Kisan Mitra (AI Assistant) | [features/kisan-mitra/](./features/kisan-mitra/) |
| AI Grading | [features/grading/](./features/grading/) |
| Marketplace | [features/marketplace/](./features/marketplace/) |
| AWS Setup | [infrastructure/aws/](./infrastructure/aws/) |
| UI Components | [ui/UI-GUIDE.md](./ui/UI-GUIDE.md) |
| Security | [standards/security/](./standards/security/) |

### By Role

| Role | Recommended Reading |
|------|---------------------|
| **Backend Developer** | core/QUICKSTART → features/marketplace/API-WORKFLOW-GUIDE → database/DATABASE-DOCUMENTATION |
| **Frontend Developer** | core/QUICKSTART → ui/UI-GUIDE → features/marketplace/API-WORKFLOW-GUIDE |
| **QA Engineer** | testing/TESTING-OVERVIEW → testing/TESTING-QUICK-REFERENCE → testing/TEST-STRATEGY |
| **DevOps Engineer** | infrastructure/deployment/AWS-DEPLOYMENT-GUIDE → database/DATABASE-SETUP → infrastructure/REDIS-SETUP |
| **Architect** | architecture/ARCHITECTURE-COMPARISON → architecture/VERTICAL-SLICING-GUIDE → database/DATABASE-ER-DIAGRAMS |
| **Product Manager** | core/QUICKSTART → features/marketplace/POC-V2-GUIDE → features/grading/ |

---

## 🆕 Recent Updates

- **Mar 1, 2026** - Major documentation reorganization with parent folders
- **Mar 1, 2026** - Created `core/`, `infrastructure/`, `ui/`, and `standards/` folders
- **Mar 1, 2026** - Moved AWS docs to `infrastructure/aws/`
- **Mar 1, 2026** - Moved diagrams to `architecture/diagrams/`
- **Mar 1, 2026** - Created security standards in `standards/security/`
- **Mar 1, 2026** - Reorganized all feature documentation into proper subdirectories
- **Mar 1, 2026** - Created README hubs for Translation, Grading, and Marketplace features
- **Mar 1, 2026** - Recovered and organized AI Grading documentation

---

## 📝 Contributing to Documentation

### Documentation Standards
- Use Markdown format
- Include table of contents for long documents
- Add code examples where applicable
- Keep language clear and concise
- Update this README when adding new docs

### File Naming
- Use kebab-case for filenames
- Be descriptive but concise
- Group related docs in appropriate folders

### Organization
- Place docs in the appropriate category folder
- Create README.md hubs for new categories
- Update this README with new document links
- Add cross-references between related docs

---

## 🔗 External Resources

- [Project Repository](https://github.com/omband007/BharatMandi)
- [Jest Documentation](https://jestjs.io/)
- [AWS Documentation](https://docs.aws.amazon.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)

---

## 📧 Questions?

If you can't find what you're looking for:
1. Check the [core/QUICKSTART.md](./core/QUICKSTART.md)
2. Search this documentation folder
3. Check the code comments
4. Ask the development team

---

**Last Updated:** March 1, 2026  
**Maintained By:** Engineering Team

