#!/bin/bash
# EC2 Instance Setup Script for Bharat Mandi POC
# Run this script on the EC2 instance after SSH

set -e

echo "========================================="
echo "Bharat Mandi EC2 Setup Script"
echo "========================================="
echo ""

# Update system
echo "Step 1: Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 20.x
echo ""
echo "Step 2: Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Install PM2
echo ""
echo "Step 3: Installing PM2..."
sudo npm install -g pm2

# Install Redis
echo ""
echo "Step 4: Installing Redis..."
sudo apt-get install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
echo "Redis status:"
sudo systemctl status redis-server --no-pager

# Install MongoDB
echo ""
echo "Step 5: Installing MongoDB..."
sudo apt-get install -y mongodb
sudo systemctl enable mongodb
sudo systemctl start mongodb
echo "MongoDB status:"
sudo systemctl status mongodb --no-pager

# Install PostgreSQL client
echo ""
echo "Step 6: Installing PostgreSQL client..."
sudo apt-get install -y postgresql-client

# Configure firewall
echo ""
echo "Step 7: Configuring firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
echo "Firewall status:"
sudo ufw status

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Upload application: scp -i 'Test Key.pem' bharat-mandi-app.tar.gz ubuntu@13.236.3.139:~"
echo "2. Extract: tar -xzf bharat-mandi-app.tar.gz"
echo "3. Create .env file with production settings"
echo "4. Start application: pm2 start .build/index.js --name bharat-mandi"
echo "5. Save PM2 config: pm2 save && pm2 startup"
echo ""
