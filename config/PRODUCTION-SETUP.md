# Production Environment Setup

This guide explains how to set up the production environment on AWS EC2.

## Environment Variables

The `config/.env.production` file is a template. You must set actual values via environment variables on your EC2 instance.

### Required Environment Variables

Set these on your EC2 instance before starting the application:

```bash
# Database Configuration
export POSTGRES_HOST="your-rds-endpoint.rds.amazonaws.com"
export POSTGRES_PASSWORD="your-secure-password"

# Optional: Override other settings if needed
export NODE_ENV="production"
export PORT="3000"
```

### Using AWS Systems Manager Parameter Store (Recommended)

For better security, store sensitive values in AWS Systems Manager Parameter Store:

```bash
# Store the password
aws ssm put-parameter \
  --name "/bharat-mandi/production/postgres-password" \
  --value "your-secure-password" \
  --type "SecureString"

# Retrieve in your application or startup script
export POSTGRES_PASSWORD=$(aws ssm get-parameter \
  --name "/bharat-mandi/production/postgres-password" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text)
```

### Using AWS Secrets Manager (Alternative)

```bash
# Store credentials
aws secretsmanager create-secret \
  --name bharat-mandi/production/db-credentials \
  --secret-string '{"host":"your-rds-endpoint","password":"your-password"}'

# Retrieve in your application
aws secretsmanager get-secret-value \
  --secret-id bharat-mandi/production/db-credentials
```

## EC2 Setup Steps

1. **Copy the template**:
   ```bash
   cp config/.env.production .env
   ```

2. **Set environment variables**:
   ```bash
   export POSTGRES_HOST="your-rds-endpoint.rds.amazonaws.com"
   export POSTGRES_PASSWORD="your-secure-password"
   ```

3. **Verify IAM role**:
   - Ensure EC2 instance has IAM role: `BharatMandiEC2Profile`
   - This provides AWS service access without access keys

4. **Start the application**:
   ```bash
   npm start
   ```

## Security Best Practices

- ✅ **Never commit real credentials** to Git
- ✅ **Use IAM roles** for AWS service access (already configured)
- ✅ **Use Parameter Store or Secrets Manager** for database passwords
- ✅ **Rotate credentials regularly**
- ✅ **Enable MFA** on AWS accounts
- ✅ **Use security groups** to restrict database access

## IAM Role Configuration

The EC2 instance uses IAM role `BharatMandiEC2Profile` which provides access to:
- AWS Lex
- AWS Transcribe
- AWS Polly
- AWS Translate
- AWS Bedrock
- S3 buckets
- CloudWatch Logs

No AWS access keys are needed on the EC2 instance.

## Troubleshooting

### Application can't connect to database
- Check `POSTGRES_HOST` environment variable is set
- Check `POSTGRES_PASSWORD` environment variable is set
- Verify RDS security group allows EC2 instance access
- Check RDS endpoint is correct

### AWS services not working
- Verify EC2 instance has IAM role attached
- Check IAM role has required permissions
- Verify AWS region is correct in .env file

## Related Documentation

- [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)
- [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager/)
- [IAM Roles for EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html)
