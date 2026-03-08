# AWS Deployment - Ready for Application Deployment

**Status**: Infrastructure Complete - Ready for App Deployment
**Date**: March 6, 2026

## Summary

All AWS infrastructure is now set up and ready. The EC2 instance is running and waiting for the application to be deployed.

## What's Complete

### ✅ Phase 1: S3 Integration
- S3 bucket created: `bharat-mandi-listings-testing`
- Storage service updated to use S3
- Tested and working from local machine

### ✅ Phase 2: RDS Database
- RDS PostgreSQL instance created: `bharat-mandi-testing`
- Database schema initialized
- SSL/TLS connection configured
- Tested and working from local machine

### ✅ Phase 3: EC2 Infrastructure (Partial)
- IAM role and policies created
- Security groups configured
- EC2 instance launched and running
- **Waiting**: Application deployment and configuration

## EC2 Instance Information

```
Instance ID: i-00ef6a62e7ce355a8
Public IP: 13.236.3.139
Instance Type: t3.micro
Region: ap-southeast-2
Status: Running
```

## Quick Deployment Guide

### Option 1: Automated Deployment (Recommended)

1. **Update the key path** in `deploy-to-ec2.sh`:
   ```bash
   KEY_PATH="C:/path/to/Test Key.pem"  # Update this
   ```

2. **Run deployment script**:
   ```bash
   bash deploy-to-ec2.sh
   ```

3. **SSH to EC2**:
   ```bash
   ssh -i "path/to/Test Key.pem" ubuntu@13.236.3.139
   ```

4. **Run setup script on EC2**:
   ```bash
   chmod +x ec2-setup.sh
   ./ec2-setup.sh
   ```

5. **Deploy application on EC2**:
   ```bash
   tar -xzf bharat-mandi-app.tar.gz
   cp .env.production .env
   pm2 start .build/index.js --name bharat-mandi
   pm2 save
   pm2 startup
   ```

6. **Test**:
   ```bash
   curl http://13.236.3.139:3000/api/health
   ```

### Option 2: Manual Deployment

See `PHASE3-EC2-SETUP.md` for detailed manual deployment steps.

## Files Created

- `ec2-setup.sh` - EC2 instance setup script (run on EC2)
- `deploy-to-ec2.sh` - Local deployment script (run on your machine)
- `.env.production` - Production environment template
- `ec2-trust-policy.json` - IAM trust policy
- `ec2-permissions-policy.json` - IAM permissions policy
- `PHASE3-EC2-SETUP.md` - Detailed EC2 setup guide

## Testing Checklist

After deployment, test these features:

- [ ] Health endpoint: `http://13.236.3.139:3000/api/health`
- [ ] Create listing (with S3 upload)
- [ ] View listings
- [ ] Kisan Mitra chatbot (Lex)
- [ ] Voice services (Polly, Transcribe)
- [ ] Translation services
- [ ] Database operations (RDS)

## Cost Summary

With AWS Free Tier (first 12 months):
- EC2 t3.micro: FREE (750 hours/month)
- RDS db.t3.micro: FREE (750 hours/month)
- S3: ~$1/month
- Other services: ~$1/month
- **Total: ~$2/month**

After Free Tier:
- EC2: ~$9/month
- RDS: ~$18/month
- S3: ~$1/month
- Other services: ~$1/month
- **Total: ~$29/month**

## Next Steps

1. Deploy application to EC2 (see Quick Deployment Guide above)
2. Test all features end-to-end
3. Set up CloudWatch billing alerts
4. Document any issues or improvements
5. (Optional) Configure Nginx for production
6. (Optional) Set up custom domain

## Support

If you encounter issues:
1. Check PM2 logs: `pm2 logs bharat-mandi`
2. Check system logs: `sudo journalctl -u mongodb` or `sudo journalctl -u redis-server`
3. Verify security groups allow traffic
4. Verify IAM role is attached to EC2
5. See troubleshooting section in `PHASE3-EC2-SETUP.md`

## Rollback

To stop/delete resources:
```bash
# Stop EC2 (to save costs)
aws ec2 stop-instances --instance-ids i-00ef6a62e7ce355a8 --region ap-southeast-2

# Terminate EC2 (permanent)
aws ec2 terminate-instances --instance-ids i-00ef6a62e7ce355a8 --region ap-southeast-2
```

See `PHASE3-EC2-SETUP.md` for complete rollback procedures.
