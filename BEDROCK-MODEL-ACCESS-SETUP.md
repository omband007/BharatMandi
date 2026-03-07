# AWS Bedrock Model Access Setup

## Issue
Getting "AccessDeniedException" or payment instrument errors when trying to use Bedrock models locally.

## Root Cause
AWS Bedrock requires:
1. Valid payment method on your AWS account
2. Model access explicitly enabled in the Bedrock console
3. IAM permissions for the user/role

## Solution Steps

### Step 1: Add Payment Method (If Missing)

1. Go to AWS Console > Billing Dashboard
2. Click "Payment methods" in the left sidebar
3. Click "Add a payment method"
4. Enter your credit/debit card details
5. Set it as default payment method

**Note**: AWS Bedrock is pay-as-you-go. You'll only be charged for actual usage.

### Step 2: Enable Model Access in Bedrock Console

#### For Amazon Nova Lite (us-east-1):

1. Go to AWS Console: https://console.aws.amazon.com/bedrock/
2. **Switch region to us-east-1** (top-right corner)
3. Click "Model access" in the left sidebar
4. Click "Manage model access" button (orange button)
5. Find "Amazon Nova Lite" in the list
6. Check the box next to it
7. Click "Request model access" at the bottom
8. Wait for approval (usually instant for Nova models)

#### For Claude Sonnet 4.6 (ap-southeast-2):

1. Go to AWS Console: https://console.aws.amazon.com/bedrock/
2. **Switch region to ap-southeast-2** (Sydney)
3. Click "Model access" in the left sidebar
4. Click "Manage model access" button
5. Find "Claude Sonnet 4.6" or "Anthropic Claude" in the list
6. Check the box next to it
7. Click "Request model access"
8. Wait for approval (usually instant)

### Step 3: Verify Model Access

After requesting access, you should see:
- Status: "Access granted" (green checkmark)
- This may take a few seconds to a few minutes

### Step 4: Add IAM Permissions to Your User

The `omband` IAM user needs Bedrock permissions. Run these commands:

```powershell
# Get your AWS Account ID
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text

# Create the policy
aws iam create-policy `
  --policy-name BharatMandiBedrock-Local `
  --policy-document file://bedrock-iam-policy-local.json

# Attach to your user
aws iam attach-user-policy `
  --user-name omband `
  --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/BharatMandiBedrock-Local"
```

**Or via AWS Console**:
1. Go to IAM > Users > omband
2. Click "Add permissions" > "Attach policies directly"
3. Search for "Bedrock"
4. Select "AmazonBedrockFullAccess" (or create custom policy)
5. Click "Add permissions"

### Step 5: Test Locally

```powershell
# Restart your app
npm run dev

# Test at http://localhost:3000/kisan-mitra.html
```

## Alternative: Use Mock Mode Locally

If you don't want to set up payment or wait for model access approval, you can:

1. Use "Mock" mode for local development
2. Use "Lex" mode for local development (if Lex is already set up)
3. Test Bedrock modes only on AWS EC2 (which already has access)

## Pricing Information

### Amazon Nova Lite
- Input: $0.06 per 1M tokens
- Output: $0.24 per 1M tokens
- **Very cheap** - suitable for development/testing

### Claude Sonnet 4.6
- Input: $3.00 per 1M tokens
- Output: $15.00 per 1M tokens
- **More expensive** - use for production or when quality matters

### Estimated Costs for Testing
- 100 test queries with Nova Lite: ~$0.01-0.05
- 100 test queries with Claude: ~$0.50-2.00

**AWS Free Tier**: Bedrock doesn't have a free tier, but costs are minimal for testing.

## Troubleshooting

### Error: "Payment instrument must be provided"
- **Solution**: Add a credit card in AWS Billing Dashboard

### Error: "Access denied" after adding payment
- **Solution**: Enable model access in Bedrock console (see Step 2)

### Error: "Model not found"
- **Solution**: Make sure you're in the correct region (us-east-1 for Nova, ap-southeast-2 for Claude)

### Error: Still getting access denied after enabling model access
- **Solution**: Add IAM permissions to your user (see Step 4)

### Model access request pending
- **Solution**: Wait a few minutes and refresh the page. If still pending after 10 minutes, contact AWS Support.

## Quick Test Commands

```powershell
# Test if your AWS credentials work
aws sts get-caller-identity

# Test if you can list Bedrock models (requires permissions)
aws bedrock list-foundation-models --region us-east-1

# Test if you can invoke a model (requires model access)
aws bedrock-runtime invoke-model `
  --model-id amazon.nova-lite-v1:0 `
  --region us-east-1 `
  --body '{"messages":[{"role":"user","content":[{"text":"Hello"}]}],"inferenceConfig":{"maxTokens":100}}' `
  --cli-binary-format raw-in-base64-out `
  output.json
```

## Summary

To use Bedrock locally, you need:
1. ✅ Valid payment method on AWS account
2. ✅ Model access enabled in Bedrock console (per region)
3. ✅ IAM permissions for your user
4. ✅ Correct model IDs and regions in your code

Once all these are set up, both Nova and Claude modes will work locally.

