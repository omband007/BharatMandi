# Deployment Workflow - Preventing Code Drift

**Date**: March 11, 2026  
**Purpose**: Prevent code drift between local development, Git repository, and AWS deployment

---

## 🚨 What Happened (Code Drift Incident)

### The Problem:
- **12 out of 19 HTML files** were different between local and AWS
- AWS deployment was done using **tar.gz file** (manual deployment)
- Changes were made directly on AWS without committing to Git
- This created "deployment drift" where AWS had newer code than Git

### Root Cause:
1. AWS deployment is NOT using Git
2. Code was deployed manually (tar.gz upload)
3. Changes were made directly on AWS EC2 instance
4. Those changes were never committed back to Git

---

## ✅ Correct Deployment Workflow

### Step 1: Make Changes Locally
```bash
# Edit files locally
code public/index.html

# Test locally
npm run dev
```

### Step 2: Commit to Git (ALWAYS!)
```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: Add new feature XYZ"

# Push to GitHub
git push origin main
```

### Step 3: Deploy to AWS
```bash
# SSH into EC2
ssh -i scripts/deployment/test-key.pem ubuntu@13.236.3.139

# Pull latest code from Git
cd /home/ubuntu
git pull origin main

# Install dependencies (if package.json changed)
npm install

# Restart application
pm2 restart all
```

---

## 🛠️ Tools We Created to Help

### 1. Sync HTML Files from AWS
```powershell
.\scripts\deployment\sync-all-html-from-aws.ps1
```
- Downloads all HTML files from AWS
- Compares with local files
- Only updates files that are different

### 2. Check Code Sync Status
```powershell
.\scripts\deployment\check-code-sync.ps1
```
- Checks if AWS is using Git
- Compares Git commits between local and AWS
- Provides recommendations

### 3. Download Specific File
```powershell
.\scripts\deployment\download-file-from-aws.ps1 -RemoteFile "/path/to/file" -LocalFile "local/path"
```

---

## 🚫 What NOT to Do

### ❌ NEVER Edit Files Directly on AWS
```bash
# DON'T DO THIS on AWS EC2:
nano /home/ubuntu/public/index.html  # ❌ BAD!
vim /home/ubuntu/public/listing.html  # ❌ BAD!
```

**Why?** Changes made directly on AWS are not tracked in Git and will be lost or cause drift.

### ❌ NEVER Deploy Without Committing First
```bash
# DON'T DO THIS:
# 1. Make changes locally
# 2. Deploy to AWS immediately
# 3. Forget to commit to Git  # ❌ BAD!
```

### ❌ NEVER Use Manual Deployment (tar.gz)
```bash
# DON'T DO THIS:
tar -czf app.tar.gz .
scp app.tar.gz ubuntu@ec2:~/  # ❌ BAD!
```

**Why?** Manual deployment bypasses Git and makes it impossible to track what's deployed.

---

## 📋 Deployment Checklist

Before deploying, check:

- [ ] All changes committed locally
- [ ] All commits pushed to GitHub
- [ ] Tests passing locally
- [ ] No uncommitted changes (`git status` is clean)
- [ ] Deployment uses `git pull` (not manual file copy)

---

## 🔄 Setting Up Git-Based Deployment on AWS

### Current State (Manual Deployment):
```
Local → tar.gz → AWS EC2
         ↓
      (No Git tracking)
```

### Recommended State (Git-Based Deployment):
```
Local → Git → GitHub → AWS EC2
                         ↓
                    (git pull)
```

### How to Set Up:

1. **SSH into AWS EC2**:
   ```bash
   ssh -i scripts/deployment/test-key.pem ubuntu@13.236.3.139
   ```

2. **Clone repository** (if not already done):
   ```bash
   cd /home/ubuntu
   git clone https://github.com/omband007/BharatMandi.git
   cd BharatMandi
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Set up environment**:
   ```bash
   cp config/.env.production .env
   # Edit .env with production values
   ```

5. **Start with PM2**:
   ```bash
   pm2 start npm --name "bharat-mandi" -- start
   pm2 save
   ```

6. **Future deployments**:
   ```bash
   cd /home/ubuntu/BharatMandi
   git pull origin main
   npm install
   pm2 restart bharat-mandi
   ```

---

## 🤖 Automated Deployment Script

We can create an automated deployment script:

```powershell
# scripts/deployment/deploy-to-aws.ps1
# 1. Checks if all changes are committed
# 2. Pushes to GitHub
# 3. SSHs to AWS and pulls latest code
# 4. Restarts the application
```

Would you like me to create this script?

---

## 📊 Monitoring Deployment Drift

### Check for Drift Regularly:
```powershell
# Run this weekly
.\scripts\deployment\check-code-sync.ps1
```

### Signs of Drift:
- Git commits don't match between local and AWS
- Files are different when you download from AWS
- Features work on AWS but not locally (or vice versa)

---

## 🎯 Best Practices

### 1. **Single Source of Truth: Git**
- Git repository is the ONLY source of truth
- All changes MUST go through Git
- AWS deployment MUST pull from Git

### 2. **Never Skip Commits**
- Even small changes should be committed
- Use descriptive commit messages
- Push to GitHub immediately

### 3. **Test Before Deploying**
- Always test locally first
- Run `npm run build` to check for errors
- Run tests if available

### 4. **Document Deployments**
- Keep a deployment log
- Note what was deployed and when
- Track any issues that occurred

### 5. **Use Deployment Scripts**
- Automate the deployment process
- Reduce human error
- Ensure consistency

---

## 🆘 If Drift Happens Again

### Step 1: Sync from AWS
```powershell
.\scripts\deployment\sync-all-html-from-aws.ps1
```

### Step 2: Review Changes
```bash
git diff
```

### Step 3: Commit Synced Files
```bash
git add .
git commit -m "sync: Update files from AWS deployment"
git push origin main
```

### Step 4: Set Up Proper Deployment
Follow the "Setting Up Git-Based Deployment" section above.

---

## 📚 Related Documentation

- [AWS Deployment Guide](./AWS-DEPLOYMENT-GUIDE.md)
- [Production Setup](../../../config/PRODUCTION-SETUP.md)
- [Security Incident Report](../../archive/security-incident-2026-03-10/INCIDENT-REPORT.md)

---

## 🔗 Quick Links

- **GitHub Repository**: https://github.com/omband007/BharatMandi
- **AWS EC2 IP**: 13.236.3.139
- **SSH Key**: `scripts/deployment/test-key.pem`

---

**Last Updated**: March 11, 2026  
**Maintained By**: Engineering Team

**Remember**: Git is your friend. Always commit, always push, always deploy from Git! 🚀
