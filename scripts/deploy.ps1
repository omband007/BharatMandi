# PowerShell Deployment Script for Windows
# Deploy Bharat Mandi to AWS EC2

# Configuration
$EC2_HOST = "ubuntu@13.236.3.139"
$EC2_KEY = "test-key.pem"
$EC2_PATH = "/home/ubuntu/bharat-mandi-app"
$APP_NAME = "bharat-mandi"

Write-Host "Deploying Bharat Mandi to AWS EC2..." -ForegroundColor Blue
Write-Host ""

# 1. Build
Write-Host "Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "Build complete" -ForegroundColor Green
Write-Host ""

# 2. Deploy .build directory
Write-Host "Uploading .build directory..." -ForegroundColor Yellow
scp -i $EC2_KEY -r .build "${EC2_HOST}:${EC2_PATH}/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to upload .build directory!" -ForegroundColor Red
    exit 1
}
Write-Host ".build uploaded" -ForegroundColor Green
Write-Host ""

# 3. Deploy public directory
Write-Host "Uploading public directory..." -ForegroundColor Yellow
scp -i $EC2_KEY -r public "${EC2_HOST}:${EC2_PATH}/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to upload public directory!" -ForegroundColor Red
    exit 1
}
Write-Host "public uploaded" -ForegroundColor Green
Write-Host ""

# 4. Deploy package.json (for dependencies)
Write-Host "Uploading package.json..." -ForegroundColor Yellow
scp -i $EC2_KEY package.json package-lock.json "${EC2_HOST}:${EC2_PATH}/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to upload package files!" -ForegroundColor Red
    exit 1
}
Write-Host "package files uploaded" -ForegroundColor Green
Write-Host ""

# 5. Install dependencies on EC2
Write-Host "Installing dependencies on EC2..." -ForegroundColor Yellow
ssh -i $EC2_KEY $EC2_HOST "cd $EC2_PATH; npm install --production"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to install dependencies!" -ForegroundColor Red
    exit 1
}
Write-Host "Dependencies installed" -ForegroundColor Green
Write-Host ""

# 6. Restart application
Write-Host "Restarting application..." -ForegroundColor Yellow
ssh -i $EC2_KEY $EC2_HOST "cd $EC2_PATH; pm2 restart $APP_NAME"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to restart application!" -ForegroundColor Red
    exit 1
}
Write-Host "Application restarted" -ForegroundColor Green
Write-Host ""

# 7. Check status
Write-Host "Checking application status..." -ForegroundColor Yellow
ssh -i $EC2_KEY $EC2_HOST "pm2 status $APP_NAME"

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "App available at: http://13.236.3.139:3000" -ForegroundColor Blue
Write-Host "View logs with: ssh -i test-key.pem ubuntu@13.236.3.139 pm2 logs bharat-mandi" -ForegroundColor Cyan
