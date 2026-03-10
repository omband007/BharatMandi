# Configuration Files

This directory contains environment configuration templates and environment-specific settings.

## Files

### `.env.example`
Template for local development environment variables. Copy this to `.env` in the root directory and fill in your values.

```bash
cp config/.env.example .env
```

### `.env.production`
Production environment configuration for AWS EC2 deployment. Used by deployment scripts.

### `.env.rds-test`
Test environment configuration for RDS database testing.

## Usage

### Local Development
1. Copy `.env.example` to root as `.env`:
   ```bash
   cp config/.env.example .env
   ```

2. Fill in your local values in `.env`

3. The `.env` file in root is gitignored and used by the application

### Production Deployment
The deployment scripts automatically use `config/.env.production` when deploying to EC2.

### RDS Testing
Use `config/.env.rds-test` for testing with RDS database.

## Security Notes

- ⚠️ Never commit actual `.env` files with real credentials
- ✅ Only commit `.env.example` template
- ✅ Keep `.env` in root directory gitignored
- ✅ Store production secrets in AWS Secrets Manager or EC2 environment

## Environment Variables

See `.env.example` for complete list of required environment variables and their descriptions.
