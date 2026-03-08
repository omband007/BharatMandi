#!/bin/bash
# Local deployment script - Run this on your local machine
# Builds and deploys the application to EC2

set -e

EC2_IP="13.236.3.139"
KEY_PATH="path/to/Test Key.pem"  # Update this path
EC2_USER="ubuntu"

echo "========================================="
echo "Bharat Mandi EC2 Deployment Script"
echo "========================================="
echo ""

# Build application
echo "Step 1: Building application..."
npm run build

# Create deployment package
echo ""
echo "Step 2: Creating deployment package..."
tar -czf bharat-mandi-app.tar.gz .build/ node_modules/ package.json package-lock.json .env.production public/

# Upload to EC2
echo ""
echo "Step 3: Uploading to EC2..."
scp -i "$KEY_PATH" bharat-mandi-app.tar.gz $EC2_USER@$EC2_IP:~
scp -i "$KEY_PATH" ec2-setup.sh $EC2_USER@$EC2_IP:~

echo ""
echo "========================================="
echo "Upload Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. SSH to EC2: ssh -i '$KEY_PATH' $EC2_USER@$EC2_IP"
echo "2. Run setup script: chmod +x ec2-setup.sh && ./ec2-setup.sh"
echo "3. Extract app: tar -xzf bharat-mandi-app.tar.gz"
echo "4. Setup .env: cp .env.production .env"
echo "5. Start app: pm2 start .build/index.js --name bharat-mandi"
echo "6. Save PM2: pm2 save && pm2 startup"
echo "7. Test: curl http://$EC2_IP:3000/api/health"
echo ""
