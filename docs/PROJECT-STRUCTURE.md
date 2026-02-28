# Project Structure

Clean, organized folder structure for Bharat Mandi POC.

## Root Folders

```
bharat-mandi/
├── .build/              # Build output (hidden, gitignored)
├── .github/             # GitHub workflows and configs
├── .kiro/               # Kiro specs and configuration
├── .vscode/             # VS Code settings
├── data/                # Runtime data (databases, media)
├── docs/                # All documentation
├── node_modules/        # Dependencies (gitignored)
├── public/              # Static web files
├── scripts/             # Utility scripts and configs
├── src/                 # Source code
├── .env                 # Environment variables (gitignored)
├── .env.example         # Environment template
├── .gitignore           # Git ignore rules
├── docker-compose.yml   # Docker services
├── package.json         # NPM configuration
├── README.md            # Project readme
└── tsconfig.json        # TypeScript configuration
```

## Documentation Structure (`docs/`)

```
docs/
├── archive/             # Old scripts and historical docs
├── features/            # Feature documentation
├── investigations/      # Technical investigations
│   └── marathi-translation/  # Marathi translation issue
├── setup/               # Setup and configuration guides
├── testing/             # Testing documentation and reports
│   ├── coverage/        # Test coverage reports (gitignored)
│   ├── config-coverage/ # Config test coverage
│   └── test-images/     # Test image assets
├── NEXT-STEPS.md        # Current next steps
└── README.md            # Documentation index
```

## Scripts Structure (`scripts/`)

```
scripts/
├── diagnostics/         # Diagnostic and troubleshooting scripts
│   ├── diagnose-aws-issue.js
│   ├── test-marathi-improvements.js
│   └── test-marathi-translation.js
├── jest.config.js       # Jest test configuration
├── test-workflow.ps1    # Test workflow script
└── README.md            # Scripts documentation
```

## Source Code Structure (`src/`)

```
src/
├── features/            # Feature modules
│   ├── auth/            # Authentication
│   ├── dev/             # Development utilities
│   ├── grading/         # Produce grading
│   ├── i18n/            # Internationalization
│   ├── marketplace/     # Marketplace listings
│   ├── transactions/    # Transaction management
│   └── users/           # User management
├── shared/              # Shared utilities
│   ├── cache/           # Caching (Redis)
│   ├── database/        # Database abstraction
│   └── types/           # Shared TypeScript types
├── types/               # Global type definitions
├── app.ts               # Express app setup
└── index.ts             # Application entry point
```

## Key Principles

1. **Clean Root**: Only essential folders in root directory
2. **Hidden Build**: Build output in `.build/` (hidden folder)
3. **Organized Docs**: All documentation in `docs/` with clear structure
4. **Centralized Scripts**: All utility scripts in `scripts/`
5. **Feature-Based**: Source code organized by feature
6. **Clear Separation**: Development, testing, and production concerns separated

## Build Output

- TypeScript compiles to `.build/` directory
- SQL files copied to `.build/shared/database/`
- `.build/` is gitignored and hidden from file explorers

## Test Coverage

- Coverage reports generated in `docs/testing/coverage/`
- HTML reports for easy viewing
- Gitignored to avoid repository bloat

## Archive

- Historical documents and old scripts in `docs/archive/`
- Kept for reference but not actively maintained
- Can be safely deleted if space is needed

---

**Last Updated**: 2024  
**Maintained By**: Development Team
