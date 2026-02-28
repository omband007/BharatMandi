# Scripts

Utility scripts for development, testing, and diagnostics.

## Structure

- `diagnostics/` - Diagnostic and troubleshooting scripts
  - AWS service testing
  - Database diagnostics
  - Performance testing
  - Issue reproduction scripts

## Usage

Scripts in this folder are meant to be run from the project root:

```bash
# Example
node scripts/diagnostics/test-marathi-translation.js
```

## Guidelines

1. Keep scripts focused on a single purpose
2. Add clear comments explaining what the script does
3. Include usage examples in script headers
4. Use descriptive filenames
