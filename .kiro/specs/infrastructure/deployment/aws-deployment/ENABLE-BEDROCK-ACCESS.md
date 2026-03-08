# How to Enable AWS Bedrock Model Access

## Current Issue

When you try to use Bedrock mode, you get an error:
```
Model amazon.titan-text-express-v1 not found. Please check model ID.
```

This happens because **model access needs to be enabled** in AWS Bedrock console, even for free models like Amazon Titan.

## Solution: Enable Model Access (5 minutes)

### Step 1: Go to AWS Bedrock Console

1. Log into AWS Console with your user (omband)
2. Navigate to: https://console.aws.amazon.com/bedrock/
3. **IMPORTANT**: Make sure you're in region **ap-southeast-2 (Sydney)**
   - Check the region selector in the top-right corner
   - Switch to "Asia Pacific (Sydney) ap-southeast-2" if needed

### Step 2: Access Model Management

1. In the left sidebar, click **"Model access"**
2. Click the orange **"Manage model access"** button
3. You'll see a list of all available models

### Step 3: Enable Amazon Titan (Recommended - Free)

1. Scroll down to the **"Amazon"** section
2. Check the boxes next to:
   - ✅ **Titan Text G1 - Express** (recommended)
   - ✅ **Titan Text G1 - Lite** (even cheaper)
   - ✅ **Titan Embeddings G1 - Text** (optional, for future use)

3. Scroll to the bottom and click **"Request model access"** or **"Save changes"**

4. **Access is granted immediately** for Amazon models!
   - No waiting period
   - No subscription required
   - No payment required
   - No use case form

5. Verify: You should see **"Access granted"** with a green checkmark

### Step 4: Optional - Enable Other Models

While you're there, you can also enable:

**Claude 3 Haiku** (Best quality, requires subscription):
- Scroll to **"Anthropic"** section
- Check **"Claude 3 Haiku"**
- Fill out use case form
- Wait for approval (5-30 minutes)

**Meta Llama 3** (Good quality, may be free):
- Scroll to **"Meta"** section  
- Check **"Llama 3 70B Instruct"**
- May be granted immediately or require approval

**Mistral** (Fast and cheap):
- Scroll to **"Mistral AI"** section
- Check **"Mistral 7B Instruct"**
- Usually granted immediately

### Step 5: Test Bedrock Mode

Once access is granted:

1. Go to: http://13.236.3.139:3000/kisan-mitra.html
2. Select **"Bedrock"** from the mode dropdown
3. Ask: "What is the best time to plant tomatoes?"
4. Should work immediately!

## Model Access Status

After enabling access, here's what you'll have:

| Model | Access Type | Cost | Quality | Speed |
|-------|------------|------|---------|-------|
| **Amazon Titan Express** | ✅ Free access | $1-3/month | Good | Fast |
| **Amazon Titan Lite** | ✅ Free access | $0.50-1/month | Good | Very Fast |
| Claude 3 Haiku | ⚠️ Requires subscription | $9-12/month | Excellent | Fast |
| Llama 3 70B | ⚠️ May require approval | $6-8/month | Very Good | Medium |
| Mistral 7B | ⚠️ May require approval | $2-3/month | Good | Very Fast |

## Why This Happens

AWS Bedrock requires explicit model access for security and compliance reasons:
- Prevents accidental usage of expensive models
- Allows AWS to track which models are being used
- Enables usage quotas and rate limiting
- Required even for free Amazon models

## Troubleshooting

### "Model not found" Error
- **Cause**: Model access not enabled
- **Solution**: Follow steps above to enable model access
- **Time**: 2-5 minutes for Amazon models

### "Access Denied" Error  
- **Cause**: IAM permissions or subscription issue
- **Solution**: 
  - For Amazon Titan: Just enable model access (no subscription)
  - For Claude: Need AWS Marketplace subscription
  - Check IAM permissions include `bedrock:InvokeModel`

### Models Not Showing in Console
- **Cause**: Wrong region selected
- **Solution**: Switch to ap-southeast-2 (Sydney) region
- **Check**: Region selector in top-right corner

### Access Request Pending
- **Amazon models**: Should be instant
- **Claude models**: 5-30 minutes (sometimes up to 24 hours)
- **Other models**: Varies by provider

## Quick Reference

**To enable Amazon Titan (works immediately)**:
1. AWS Console → Bedrock → Model access
2. Manage model access
3. Check "Titan Text G1 - Express"
4. Save changes
5. Done! Access granted immediately

**To enable Claude (requires subscription)**:
1. AWS Console → Bedrock → Model access
2. Manage model access
3. Check "Claude 3 Haiku"
4. Fill out use case form
5. Wait for approval (5-30 minutes)
6. Complete AWS Marketplace subscription

## After Enabling Access

The Bedrock mode will work immediately. No code changes needed, no server restart needed. Just:

1. Open Kisan Mitra page
2. Select "Bedrock" mode
3. Start chatting!

The application will automatically use the model specified in `BEDROCK_MODEL_ID` environment variable (currently set to `amazon.titan-text-express-v1`).

## Cost Estimate

With Amazon Titan Express for 1000 queries/day:
- Input tokens: ~50 tokens/query × 1000 = 50K tokens/day
- Output tokens: ~200 tokens/query × 1000 = 200K tokens/day
- Daily cost: ~$0.10-0.15
- Monthly cost: ~$3-5

Much cheaper than Claude ($9-12/month) and works immediately!
