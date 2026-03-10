# Bharat Mandi - Agricultural Marketplace Platform

A comprehensive agricultural marketplace platform addressing systemic issues in agricultural trade through AI-powered crop disease diagnosis, produce grading, secure escrow payments, and multilingual support.

## Quick Start

```bash
# Install dependencies
npm install

# Start local services (MongoDB, Redis)
docker-compose up -d

# Start development server
npm run dev

# Access the app
http://localhost:3000
```

For detailed setup instructions, see [Development Guide](docs/core/DEVELOPMENT.md).

## Documentation

All project documentation is organized in the `docs/` folder:

### Core Documentation
- **[Development Guide](docs/core/DEVELOPMENT.md)** - Development setup and workflows
- [Quickstart Guide](docs/core/QUICKSTART.md) - Get started quickly
- [Project Structure](docs/core/PROJECT-STRUCTURE.md) - Codebase organization
- [File Organization](docs/core/FILE-ORGANIZATION.md) - File structure guide

### Architecture & Design
- [Architecture Overview](docs/architecture/README.md) - System architecture
- [Technology Stack](docs/architecture/technology-stack.md) - Technologies used
- [AWS Cloud Architecture](docs/architecture/aws-cloud-architecture.md) - Cloud infrastructure
- [Vertical Slicing Guide](docs/architecture/VERTICAL-SLICING-GUIDE.md) - Feature-based architecture

### Features
- [Crop Disease Diagnosis](docs/features/crop-detection/) - AI-powered disease detection
- [Marketplace](docs/features/marketplace/) - Listing and trading
- [Translation](docs/features/translation/) - Multilingual support
- [Kisan Mitra](docs/features/kisan-mitra/) - AI farming assistant

### Database & Infrastructure
- [Database Documentation](docs/database/DATABASE-DOCUMENTATION.md) - Schema and models
- [Database Setup](docs/database/DATABASE-SETUP.md) - Configuration guide
- [AWS Services](docs/infrastructure/aws/) - AWS configuration

### Testing & Performance
- [Testing Overview](docs/testing/TESTING-OVERVIEW.md) - Testing strategy
- [Performance Testing](docs/product-standards/performance/) - Performance benchmarks

## Project Structure

```
bharat-mandi/
├── config/                 # Configuration files
│   ├── .env.example       # Environment template
│   ├── .env.production    # Production config
│   └── README.md
├── docs/                   # 📚 Documentation
│   ├── architecture/      # System architecture
│   ├── core/             # Core documentation
│   ├── database/         # Database docs
│   ├── features/         # Feature documentation
│   ├── infrastructure/   # Infrastructure docs
│   └── testing/          # Testing documentation
├── scripts/               # 🔧 Utility scripts
│   ├── deployment/       # Deployment scripts
│   ├── aws-setup/        # AWS infrastructure setup
│   ├── database/         # Database scripts
│   ├── diagnostics/      # Diagnostic scripts
│   ├── perf-tests/       # Performance testing
│   └── utilities/        # Utility scripts
├── src/                   # 💻 Source code
│   ├── features/         # Feature modules (vertical slices)
│   │   ├── auth/        # Authentication
│   │   ├── crop-diagnosis/ # AI disease diagnosis
│   │   ├── grading/     # Produce grading
│   │   ├── i18n/        # Translation & localization
│   │   ├── marketplace/ # Marketplace listings
│   │   └── transactions/ # Transaction management
│   ├── shared/          # Shared utilities
│   │   ├── database/    # Database connections
│   │   ├── cache/       # Redis caching
│   │   └── types/       # Type definitions
│   ├── app.ts           # Express app setup
│   └── index.ts         # Server entry point
├── public/               # Static HTML files
├── data/                 # Local database files
├── test-images/          # Test images for AI features
├── docker-compose.yml    # Docker services (MongoDB, Redis)
├── package.json
├── tsconfig.json
└── README.md
```

### Architecture: Vertical Slicing (Feature-Based)

This project uses **vertical slicing** architecture where each feature is self-contained with its own:
- Controller (HTTP routes)
- Service (business logic)
- Types (type definitions)
- Tests (unit & integration)

**Benefits:**
- ✅ High cohesion - all related code in one place
- ✅ Low coupling - features are independent
- ✅ Easy navigation - everything for a feature is together
- ✅ Scalable - add features without touching existing ones
- ✅ Team friendly - teams can own entire features

See [Vertical Slicing Guide](docs/architecture/VERTICAL-SLICING-GUIDE.md) for details.

## Key Features

### 🌾 AI-Powered Crop Disease Diagnosis (Dr. Fasal)
- Real-time disease detection using AWS Bedrock
- Support for multiple crops (tomato, potato, pepper, corn)
- Multilingual diagnosis reports (English, Hindi, Marathi)
- Treatment recommendations

### 🎯 Produce Grading (Fasal-Parakh)
- AI-powered quality assessment
- Standardized grading system
- Digital certificates

### 🌐 Multilingual Support
- Translation service with Redis caching
- Support for English, Hindi, Marathi
- Voice integration (Text-to-Speech)

### 🤖 Kisan Mitra (AI Farming Assistant)
- Conversational AI for farming queries
- Context-aware responses
- Farming tips and advice

### 💰 Marketplace & Transactions
- Secure listing management
- Escrow payment system
- Transaction lifecycle tracking

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Databases**: 
  - PostgreSQL (RDS) - Primary database
  - MongoDB - Conversation logs, farming tips
  - SQLite - Offline support
  - Redis - Translation caching
- **AI/ML**: AWS Bedrock (Claude, Nova models)
- **Cloud**: AWS (EC2, S3, RDS, Bedrock)
- **Testing**: Jest, Artillery (performance)
- **Deployment**: PM2, Docker

## Development

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- AWS credentials (for AI features)

### Environment Setup

1. Copy environment template:
```bash
cp config/.env.example .env
```

2. Configure AWS credentials in `.env`:
```
AWS_REGION=ap-southeast-2
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
```

3. Start local services:
```bash
docker-compose up -d
```

4. Run database migrations:
```bash
npm run db:setup
```

### Running Tests

```bash
# Unit tests
npm test

# Performance tests
npm run perf:test

# Smoke tests
cd scripts/perf-tests
artillery run artillery-ai-smoke-test.yml
```

## Deployment

### AWS EC2 Deployment

```bash
# Deploy to production
./scripts/deployment/deploy.ps1

# Or using bash
./scripts/deployment/deploy.sh
```

The application is deployed on AWS EC2 with:
- IAM role-based authentication
- S3 for media storage
- RDS for database
- PM2 for process management

See [AWS Cloud Architecture](docs/architecture/aws-cloud-architecture.md) for details.

## Contributing

See [Development Guide](docs/core/DEVELOPMENT.md) for contribution guidelines.

## Project Status

**Current Phase**: Production deployment on AWS EC2

**Recent Updates**:
- ✅ AI-powered crop disease diagnosis (Dr. Fasal)
- ✅ Multilingual support (English, Hindi, Marathi)
- ✅ AWS Bedrock integration
- ✅ Performance testing infrastructure
- ✅ File structure cleanup and organization

## License

MIT
