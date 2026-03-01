# Bharat Mandi Documentation

Welcome to the Bharat Mandi documentation! This folder contains comprehensive documentation for the agricultural marketplace platform.

## 📁 Documentation Structure

### 🧪 [testing/](./testing/)
Testing strategy, guides, and test coverage reports
- `TEST-STRATEGY.md` - Comprehensive testing strategy and automation framework
- `TESTING-OVERVIEW.md` - Visual overview of test types and execution
- `TESTING-QUICK-REFERENCE.md` - Quick commands and patterns
- `DUAL-DATABASE-TESTING-GUIDE.md` - Testing dual-database architecture

### 🗄️ [database/](./database/)
Database setup, schemas, and documentation
- `DATABASE-DOCUMENTATION.md` - Complete database documentation
- `DATABASE-ER-DIAGRAMS.md` - Entity-relationship diagrams
- `DATABASE-SETUP.md` - Setup instructions
- `DUAL-DATABASE-SETUP.md` - Dual-database (PostgreSQL + SQLite) setup
- `MONGODB-SETUP.md` - MongoDB configuration

### 🚀 [deployment/](./deployment/)
Deployment guides and AWS configuration
- `AWS-DEPLOYMENT-GUIDE.md` - Complete AWS deployment guide

### 🏗️ [architecture/](./architecture/)
Architecture decisions and code organization
- `ARCHITECTURE-COMPARISON.md` - Architecture comparison and decisions
- `CODE-ORGANIZATION.md` - Code structure and organization
- `VERTICAL-SLICING-GUIDE.md` - Vertical slicing architecture guide
- `VERTICAL-SLICING-MIGRATION.md` - Migration to vertical slicing

### 📚 [guides/](./guides/)
Feature guides and API documentation
- `QUICKSTART.md` - Quick start guide
- `API-WORKFLOW-GUIDE.md` - API workflow and usage
- `AUTH-API-GUIDE.md` - Authentication API guide
- `AI-GRADING-GUIDE.md` - AI-powered grading system
- `CROP-DETECTION-UPDATE.md` - Crop detection feature
- `POC-V2-GUIDE.md` - POC version 2 guide
- `UI-GUIDE.md` - UI components and usage

### ✨ [features/](./features/)
Feature-specific documentation

#### [features/kisan-mitra/](./features/kisan-mitra/)
Kisan Mitra AI Voice Assistant
- `README.md` - Complete Kisan Mitra documentation hub
- `MULTILINGUAL-SUPPORT.md` - Multi-language translation system
- `LANGUAGE-SUPPORT.md` - Language support matrix and guides
- `VOICE-INPUT.md` - Voice input functionality
- `PERFORMANCE.md` - Audio performance optimization
- `AUDIO-FIX.md` - Audio-text mismatch fix

#### [features/i18n/](./features/i18n/)
Multi-language support documentation
- `test-coverage.md` - I18n test coverage report
- `validation-tests.md` - I18n validation test plan

#### [features/aws/](./aws/)
AWS service integration
- `LEX-BOT-SETUP-QUICKSTART.md` - AWS Lex setup guide
- `ADD-LEX-PERMISSIONS.md` - IAM permissions for Lex
- `TROUBLESHOOT-LEX-404.md` - Troubleshooting Lex errors
- `REGION-DECISION.md` - AWS region selection rationale
- `REGION-MIGRATION-GUIDE.md` - Region migration guide

### 📊 [diagrams/](./diagrams/)
Architecture diagrams and visual documentation
- AWS Architecture diagrams
- Use case diagrams

---

## 🚀 Quick Start

### For Developers
1. Start with [QUICKSTART.md](./guides/QUICKSTART.md)
2. Review [CODE-ORGANIZATION.md](./architecture/CODE-ORGANIZATION.md)
3. Check [API-WORKFLOW-GUIDE.md](./guides/API-WORKFLOW-GUIDE.md)

### For Testers
1. Read [TESTING-OVERVIEW.md](./testing/TESTING-OVERVIEW.md)
2. Use [TESTING-QUICK-REFERENCE.md](./testing/TESTING-QUICK-REFERENCE.md)
3. Follow [TEST-STRATEGY.md](./testing/TEST-STRATEGY.md)

### For DevOps
1. Review [AWS-DEPLOYMENT-GUIDE.md](./deployment/AWS-DEPLOYMENT-GUIDE.md)
2. Check [DATABASE-SETUP.md](./database/DATABASE-SETUP.md)
3. Configure [DUAL-DATABASE-SETUP.md](./database/DUAL-DATABASE-SETUP.md)

### For Architects
1. Study [ARCHITECTURE-COMPARISON.md](./architecture/ARCHITECTURE-COMPARISON.md)
2. Review [VERTICAL-SLICING-GUIDE.md](./architecture/VERTICAL-SLICING-GUIDE.md)
3. Check [DATABASE-ER-DIAGRAMS.md](./database/DATABASE-ER-DIAGRAMS.md)

---

## 📖 Key Documents

### Essential Reading
- **[QUICKSTART.md](./guides/QUICKSTART.md)** - Get started quickly
- **[API-WORKFLOW-GUIDE.md](./guides/API-WORKFLOW-GUIDE.md)** - API usage patterns
- **[TEST-STRATEGY.md](./testing/TEST-STRATEGY.md)** - Testing approach
- **[AWS-DEPLOYMENT-GUIDE.md](./deployment/AWS-DEPLOYMENT-GUIDE.md)** - Deployment process

### Architecture & Design
- **[ARCHITECTURE-COMPARISON.md](./architecture/ARCHITECTURE-COMPARISON.md)** - Architecture decisions
- **[VERTICAL-SLICING-GUIDE.md](./architecture/VERTICAL-SLICING-GUIDE.md)** - Feature-based organization
- **[CODE-ORGANIZATION.md](./architecture/CODE-ORGANIZATION.md)** - Code structure

### Database
- **[DATABASE-DOCUMENTATION.md](./database/DATABASE-DOCUMENTATION.md)** - Complete DB docs
- **[DUAL-DATABASE-SETUP.md](./database/DUAL-DATABASE-SETUP.md)** - Dual-DB architecture

### Testing
- **[TESTING-OVERVIEW.md](./testing/TESTING-OVERVIEW.md)** - Testing at a glance
- **[TESTING-QUICK-REFERENCE.md](./testing/TESTING-QUICK-REFERENCE.md)** - Quick commands

---

## 🔍 Finding Documentation

### By Topic

| Topic | Document |
|-------|----------|
| Getting Started | [QUICKSTART.md](./guides/QUICKSTART.md) |
| API Usage | [API-WORKFLOW-GUIDE.md](./guides/API-WORKFLOW-GUIDE.md) |
| Authentication | [AUTH-API-GUIDE.md](./guides/AUTH-API-GUIDE.md) |
| Testing | [TEST-STRATEGY.md](./testing/TEST-STRATEGY.md) |
| Database | [DATABASE-DOCUMENTATION.md](./database/DATABASE-DOCUMENTATION.md) |
| Deployment | [AWS-DEPLOYMENT-GUIDE.md](./deployment/AWS-DEPLOYMENT-GUIDE.md) |
| Architecture | [ARCHITECTURE-COMPARISON.md](./architecture/ARCHITECTURE-COMPARISON.md) |
| Multi-Language | [features/i18n/](./features/i18n/) |
| Kisan Mitra (AI Assistant) | [features/kisan-mitra/](./features/kisan-mitra/) |
| AWS Lex Setup | [aws/LEX-BOT-SETUP-QUICKSTART.md](./aws/LEX-BOT-SETUP-QUICKSTART.md) |
| AI Grading | [AI-GRADING-GUIDE.md](./guides/AI-GRADING-GUIDE.md) |
| UI Components | [UI-GUIDE.md](./guides/UI-GUIDE.md) |

### By Role

| Role | Recommended Reading |
|------|---------------------|
| **Backend Developer** | QUICKSTART → API-WORKFLOW-GUIDE → DATABASE-DOCUMENTATION |
| **Frontend Developer** | QUICKSTART → UI-GUIDE → API-WORKFLOW-GUIDE |
| **QA Engineer** | TESTING-OVERVIEW → TESTING-QUICK-REFERENCE → TEST-STRATEGY |
| **DevOps Engineer** | AWS-DEPLOYMENT-GUIDE → DATABASE-SETUP → DUAL-DATABASE-SETUP |
| **Architect** | ARCHITECTURE-COMPARISON → VERTICAL-SLICING-GUIDE → DATABASE-ER-DIAGRAMS |
| **Product Manager** | QUICKSTART → POC-V2-GUIDE → AI-GRADING-GUIDE |

---

## 🆕 Recent Updates

- **Mar 1, 2026** - Reorganized Kisan Mitra documentation into structured folder
- **Mar 1, 2026** - Created comprehensive Kisan Mitra README with all guides
- **Feb 25, 2026** - Reorganized documentation structure
- **Feb 25, 2026** - Added comprehensive testing strategy
- **Feb 25, 2026** - Added I18n test coverage documentation
- **Feb 25, 2026** - Created testing quick reference guide

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
1. Check the [QUICKSTART.md](./guides/QUICKSTART.md)
2. Search this documentation folder
3. Check the code comments
4. Ask the development team

---

**Last Updated:** February 25, 2026  
**Maintained By:** Engineering Team
