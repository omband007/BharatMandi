#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EC2_HOST="ubuntu@13.236.3.139"
EC2_KEY="test-key.pem"
EC2_PATH="/home/ubuntu/bharat-mandi-app"
APP_NAME="bharat-mandi"

echo -e "${BLUE}🚀 Deploying Bharat Mandi to AWS EC2...${NC}\n"

# 1. Build
echo -e "${YELLOW}📦 Building application...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build complete${NC}\n"

# 2. Deploy .build directory
echo -e "${YELLOW}📤 Uploading .build directory...${NC}"
scp -i $EC2_KEY -r .build $EC2_HOST:$EC2_PATH/
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to upload .build directory!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ .build uploaded${NC}\n"

# 3. Deploy public directory
echo -e "${YELLOW}📤 Uploading public directory...${NC}"
scp -i $EC2_KEY -r public $EC2_HOST:$EC2_PATH/
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to upload public directory!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ public uploaded${NC}\n"

# 4. Deploy package.json (for dependencies)
echo -e "${YELLOW}📤 Uploading package.json...${NC}"
scp -i $EC2_KEY package.json package-lock.json $EC2_HOST:$EC2_PATH/
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to upload package files!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ package files uploaded${NC}\n"

# 5. Install dependencies on EC2 (if package.json changed)
echo -e "${YELLOW}📦 Installing dependencies on EC2...${NC}"
ssh -i $EC2_KEY $EC2_HOST "cd $EC2_PATH && npm install --production"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dependencies installed${NC}\n"

# 6. Restart application
echo -e "${YELLOW}🔄 Restarting application...${NC}"
ssh -i $EC2_KEY $EC2_HOST "cd $EC2_PATH && pm2 restart $APP_NAME"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to restart application!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Application restarted${NC}\n"

# 7. Check status
echo -e "${YELLOW}📊 Checking application status...${NC}"
ssh -i $EC2_KEY $EC2_HOST "pm2 status $APP_NAME"

echo -e "\n${GREEN}✅ Deployment complete!${NC}"
echo -e "${BLUE}🌐 App available at: http://13.236.3.139:3000${NC}"
echo -e "${BLUE}📝 View logs: ssh -i $EC2_KEY $EC2_HOST 'pm2 logs $APP_NAME'${NC}"
