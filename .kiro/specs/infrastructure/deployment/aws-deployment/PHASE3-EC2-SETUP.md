# Phase 3: EC2 Instance Setup and Configuration

**Status**: In Progress
**Created**: March 6, 2026

## EC2 Instance Details

- **Instance ID**: `i-00ef6a62e7ce355a8`
- **Instance Type**: `t3.micro` (2 vCPU, 1GB RAM)
- **AMI**: Ubuntu 22.04 LTS (ami-0818a4d7794d429b1)
- **Public IP**: `13.236.3.139`
- **Private IP**: `172.31.22.33`
- **Region**: `ap-southeast-2` (Sydney)
- **Key Pair**: `Test Key`

## IAM Configuration

- **IAM Role**: `BharatMandiEC2Role`
- **Instance Profile**: `BharatMandiEC2Profile`
- **Policy**: `BharatMandiEC2Policy`

### Permissions Granted:
- S3: Read/Write access to `bharat-mandi-listings-testing` and `bharat-mandi-voice-ap-south-1`
- Lex: Full access to bot `YYEXVHRJQW`
- Polly: Speech synthesis
- Transcribe: Speech-to-text
- Translate: Text translation
- Comprehend: Language detection

## Security Groups

### EC2 Security Group: `sg-05377865b0bb7f05f`
- **HTTP (80)**: 0.0.0.0/0 (public access)
- **HTTPS (443)**: 0.0.0.0/0 (public access)
- **SSH (22)**: 49.205.201.240/32 (your IP only)

### RDS Security Group: `sg-0ba1a575118cff895`
- **PostgreSQL (5432)**: From EC2 security group (sg-05377865b0bb7f05f)
- **PostgreSQL (5432)**: From your IP (49.205.201.240/32)

## Next Steps

### 1. SSH to EC2 Instance

```bash
ssh -i "path/to/Test Key.pem" ubuntu@13.236.3.139
```

### 2. Install Dependencies

Run these commands on the EC2 instance:

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Redis
sudo apt-get install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Install MongoDB
sudo apt-get install -y mongodb
sudo systemctl enable mongodb
sudo systemctl start mongodb

# Install PostgreSQL client
sudo apt-get install -y postgresql-client

# Configure firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

### 3. Deploy Application

On your local machine:

```bash
# Build application
npm run build

# Create deployment package
tar -czf bharat-mandi-app.tar.gz .build/ node_modules/ package.json package-lock.json

# Upload to EC2
scp -i "path/to/Test Key.pem" bharat-mandi-app.tar.gz ubuntu@13.236.3.139:~
```

On EC2 instance:

```bash
# Extract application
tar -xzf bharat-mandi-app.tar.gz

# Create .env file
cat > .env << 'EOF'
# Server
NODE_ENV=production
PORT=3000

# AWS
AWS_REGION=ap-southeast-2

# S3
S3_AUDIO_BUCKET=bharat-mandi-voice-ap-south-1
S3_LISTINGS_BUCKET=bharat-mandi-listings-testing
S3_REGION=ap-southeast-2
USE_S3_FOR_LISTINGS=true

# Lex
LEX_BOT_ID=YYEXVHRJQW
LEX_BOT_ALIAS_ID=COP9IOYDL0
LEX_REGION=ap-southeast-2

# Database (RDS)
POSTGRES_HOST=bharat-mandi-testing.c1y0cuowi6cr.ap-southeast-2.rds.amazonaws.com
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=BharatMandi2026!
DB_SSL=true

# Local services
REDIS_HOST=localhost
REDIS_PORT=6379
MONGODB_URI=mongodb://localhost:27017/bharat_mandi
EOF

# Start application with PM2
pm2 start .build/index.js --name bharat-mandi
pm2 save
pm2 startup
```

### 4. Test Application

```bash
# From local machine
curl http://13.236.3.139:3000/api/health

# Should return:
# {"status":"ok","timestamp":"...","databases":{"postgresql":{"connected":true}}}
```

### 5. Configure Nginx (Optional - for production)

```bash
# Install Nginx
sudo apt-get install -y nginx

# Create Nginx configuration
sudo tee /etc/nginx/sites-available/bharat-mandi << 'EOF'
server {
    listen 80;
    server_name 13.236.3.139;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/bharat-mandi /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

## Cost Estimate

### EC2 t3.micro (Monthly)
- Instance: ~$7.50/month (730 hours × $0.0104/hour)
- Storage (8GB): ~$0.80/month
- Data transfer: ~$1/month (first 1GB free)
- **Total: ~$9.30/month**

### With Free Tier (First 12 Months)
- 750 hours/month of t3.micro: FREE
- **Total: ~$0/month for first year**

### Combined AWS Costs (All Services)
- EC2: ~$0/month (free tier)
- RDS: ~$0/month (free tier)
- S3: ~$1/month (storage + requests)
- Other services: ~$1/month (Lex, Polly, etc.)
- **Total: ~$2/month with free tier**

## AWS Resources Summary

| Resource | Name/ID | Type | Region | Purpose |
|----------|---------|------|--------|---------|
| EC2 Instance | i-00ef6a62e7ce355a8 | t3.micro | ap-southeast-2 | Application server |
| IAM Role | BharatMandiEC2Role | IAM Role | Global | EC2 permissions |
| Instance Profile | BharatMandiEC2Profile | IAM Profile | Global | Attach role to EC2 |
| Security Group | sg-05377865b0bb7f05f | EC2 SG | ap-southeast-2 | EC2 firewall |
| RDS Instance | bharat-mandi-testing | db.t3.micro | ap-southeast-2 | PostgreSQL database |
| S3 Bucket | bharat-mandi-listings-testing | S3 | ap-southeast-2 | Listing media |
| S3 Bucket | bharat-mandi-voice-ap-south-1 | S3 | ap-south-1 | Audio cache |

## Troubleshooting

### Cannot SSH to EC2
- Verify your IP hasn't changed (current: 49.205.201.240)
- Update security group if needed:
  ```bash
  aws ec2 authorize-security-group-ingress --group-id sg-05377865b0bb7f05f --protocol tcp --port 22 --cidr YOUR_NEW_IP/32 --region ap-southeast-2
  ```

### Application won't start
- Check PM2 logs: `pm2 logs bharat-mandi`
- Verify environment variables: `cat .env`
- Check Redis: `redis-cli ping`
- Check MongoDB: `mongosh --eval "db.version()"`

### Database connection fails
- Verify RDS security group allows EC2 access
- Test connection: `psql -h bharat-mandi-testing.c1y0cuowi6cr.ap-southeast-2.rds.amazonaws.com -U postgres -d postgres`

### S3 access denied
- Verify IAM role is attached: `aws sts get-caller-identity`
- Check instance profile: `curl http://169.254.169.254/latest/meta-data/iam/security-credentials/BharatMandiEC2Profile`

## Rollback

### Stop EC2 Instance (to save costs)
```bash
aws ec2 stop-instances --instance-ids i-00ef6a62e7ce355a8 --region ap-southeast-2
```

### Terminate EC2 Instance
```bash
aws ec2 terminate-instances --instance-ids i-00ef6a62e7ce355a8 --region ap-southeast-2
```

### Delete Security Group
```bash
aws ec2 delete-security-group --group-id sg-05377865b0bb7f05f --region ap-southeast-2
```

### Delete IAM Resources
```bash
# Remove role from instance profile
aws iam remove-role-from-instance-profile --instance-profile-name BharatMandiEC2Profile --role-name BharatMandiEC2Role

# Delete instance profile
aws iam delete-instance-profile --instance-profile-name BharatMandiEC2Profile

# Detach policy
aws iam detach-role-policy --role-name BharatMandiEC2Role --policy-arn arn:aws:iam::281627750826:policy/BharatMandiEC2Policy

# Delete role
aws iam delete-role --role-name BharatMandiEC2Role

# Delete policy
aws iam delete-policy --policy-arn arn:aws:iam::281627750826:policy/BharatMandiEC2Policy
```

## Notes

- EC2 instance uses IAM role - no AWS credentials needed in .env
- Application runs on port 3000 (can add Nginx for port 80)
- PM2 manages application process and auto-restart
- Redis and MongoDB run locally on EC2
- RDS and S3 are managed AWS services
- Free tier covers most costs for first 12 months
