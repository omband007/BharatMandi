# Infrastructure Documentation

AWS services, deployment guides, and infrastructure setup for Bharat Mandi.

## Documentation Structure

### AWS Services
- [AWS Lex Bot Setup (Quick Start)](aws/LEX-BOT-SETUP-QUICKSTART.md) - Quick guide to set up AWS Lex
- [AWS Lex Permissions](aws/ADD-LEX-PERMISSIONS.md) - IAM permissions for Lex
- [Troubleshoot Lex 404](aws/TROUBLESHOOT-LEX-404.md) - Fixing Lex errors
- [AWS Region Decision](aws/REGION-DECISION.md) - Why we use Sydney (ap-southeast-2)
- [Region Migration Guide](aws/REGION-MIGRATION-GUIDE.md) - Future migration to Mumbai

### Deployment
- [AWS Deployment Guide](deployment/AWS-DEPLOYMENT-GUIDE.md) - Complete deployment guide

### Services Setup
- [Redis Setup](REDIS-SETUP.md) - Redis configuration for caching

## AWS Services Used

Bharat Mandi uses the following AWS services:

- **AWS Lex V2**: Conversational AI for Kisan Mitra
- **AWS Transcribe**: Speech-to-text for voice input
- **AWS Polly**: Text-to-speech for voice output
- **AWS Translate**: Multi-language translation
- **S3**: Audio file storage and media
- **EC2/ECS**: Application hosting (deployment)
- **RDS**: PostgreSQL database hosting

## AWS Region

**Current Region**: Sydney (ap-southeast-2)

**Why Sydney?**
- Mumbai (ap-south-1) doesn't support AWS Lex V2 yet
- All services available in Sydney
- See [REGION-DECISION.md](aws/REGION-DECISION.md) for details

**Future**: Migrate to Mumbai when Lex V2 becomes available (see [REGION-MIGRATION-GUIDE.md](aws/REGION-MIGRATION-GUIDE.md))

## Quick Start

1. **AWS Account Setup**: Ensure you have an AWS account with appropriate permissions
2. **Configure Services**: Follow service-specific guides in `aws/` folder
3. **Deploy**: Use [deployment/AWS-DEPLOYMENT-GUIDE.md](deployment/AWS-DEPLOYMENT-GUIDE.md)
4. **Redis**: Set up caching with [REDIS-SETUP.md](REDIS-SETUP.md)

## Related Documentation

- [Features](../features/) - Feature-specific AWS integrations
- [Architecture](../architecture/) - Infrastructure architecture
- [Database](../database/) - Database deployment

---

**For**: DevOps Engineers, Cloud Architects  
**Purpose**: AWS services, deployment, and infrastructure management
