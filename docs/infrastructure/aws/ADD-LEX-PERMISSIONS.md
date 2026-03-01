# Add AWS Lex Permissions to IAM User

## Current Issue

Your IAM user `Omband` doesn't have permission to use AWS Lex. You're getting this error:

```
User: arn:aws:iam::281627750826:user/Omband is not authorized to perform: 
lex:RecognizeText on resource: arn:aws:lex:ap-southeast-2:281627750826:bot-alias/YYEXVHRJQW/COP9IOYDL0
```

## Solution: Add Lex Permissions to Your IAM User

### Option 1: Using AWS Console (Recommended - Easiest)

#### Step 1: Go to IAM Console

1. Open [AWS IAM Console](https://console.aws.amazon.com/iam/)
2. Click **"Users"** in the left sidebar
3. Click on your user: **"Omband"**

#### Step 2: Add Lex Permissions

1. Click the **"Permissions"** tab
2. Click **"Add permissions"** button
3. Select **"Attach policies directly"**
4. In the search box, type: **"Lex"**
5. Check the box next to **"AmazonLexRunBotsOnly"** policy
   - This gives you permission to use Lex bots (read-only, safe)
6. Click **"Next"**
7. Click **"Add permissions"**

#### Step 3: Verify Permissions

1. Go back to the **"Permissions"** tab
2. You should see **"AmazonLexRunBotsOnly"** in the list of policies

#### Step 4: Test Connection

```bash
node scripts/test-lex-connection.js
```

---

### Option 2: Using AWS CLI (Advanced)

If you prefer command line:

```bash
# Attach the AmazonLexRunBotsOnly policy to your user
aws iam attach-user-policy \
  --user-name Omband \
  --policy-arn arn:aws:iam::aws:policy/AmazonLexRunBotsOnly
```

Then test:
```bash
node scripts/test-lex-connection.js
```

---

### Option 3: Create Custom Policy (Most Secure)

If you want minimal permissions (only for your specific bot):

#### Step 1: Create Custom Policy

1. Go to [IAM Policies](https://console.aws.amazon.com/iam/home#/policies)
2. Click **"Create policy"**
3. Click **"JSON"** tab
4. Paste this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "lex:RecognizeText",
        "lex:RecognizeUtterance"
      ],
      "Resource": [
        "arn:aws:lex:ap-southeast-2:281627750826:bot-alias/YYEXVHRJQW/COP9IOYDL0"
      ]
    }
  ]
}
```

5. Click **"Next"**
6. **Policy name**: `KisanMitraLexAccess`
7. **Description**: `Allows access to KisanMitra Lex bot`
8. Click **"Create policy"**

#### Step 2: Attach Policy to User

1. Go to [IAM Users](https://console.aws.amazon.com/iam/home#/users)
2. Click on **"Omband"**
3. Click **"Add permissions"**
4. Select **"Attach policies directly"**
5. Search for: **"KisanMitraLexAccess"**
6. Check the box
7. Click **"Next"** → **"Add permissions"**

#### Step 3: Test

```bash
node scripts/test-lex-connection.js
```

---

## What Each Policy Does

### AmazonLexRunBotsOnly (Recommended)
- ✅ Allows using ANY Lex bot in your account
- ✅ Read-only access (safe)
- ✅ No ability to create/modify/delete bots
- ✅ Perfect for application users

### Custom Policy (Most Secure)
- ✅ Allows using ONLY your KisanMitra bot
- ✅ Most restrictive (best security)
- ❌ Need to update if you create new bots

### AmazonLexFullAccess (NOT Recommended)
- ❌ Allows creating/modifying/deleting bots
- ❌ Too much permission for application use
- ⚠️ Only use for bot development/management

---

## Troubleshooting

### Error: "Access Denied" when attaching policy

**Solution**: You need admin access to attach policies. Ask your AWS account administrator to:
1. Attach the **AmazonLexRunBotsOnly** policy to user **Omband**
2. Or give you IAM permissions to manage your own user

### Error: "Policy not found"

**Solution**: Make sure you're in the correct AWS region (ap-southeast-2) and account

### Still getting permission errors after adding policy

**Solution**: 
1. Wait 1-2 minutes for permissions to propagate
2. Try the test script again
3. If still failing, check that the policy is attached:
   ```bash
   aws iam list-attached-user-policies --user-name Omband
   ```

---

## Verification Checklist

After adding permissions, verify:

- [ ] Policy attached to user Omband
- [ ] Test script runs without permission errors
- [ ] Bot responds to queries
- [ ] Kisan Mitra UI works in live mode

---

## Next Steps

1. **Add Lex permissions** using Option 1 (easiest)
2. **Test connection**: `node scripts/test-lex-connection.js`
3. **Start server**: `npm run dev`
4. **Test Kisan Mitra**: Open `http://localhost:3000/kisan-mitra-test.html`
5. **Verify live mode**: Mode should show "Live" instead of "Mock"

---

## Summary

**Quick Fix**: Attach **AmazonLexRunBotsOnly** policy to user **Omband** in IAM Console

**Time**: 2-3 minutes

**Difficulty**: Easy

**Status**: Ready to implement
