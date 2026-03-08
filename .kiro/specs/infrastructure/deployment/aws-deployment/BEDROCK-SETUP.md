# AWS Bedrock Integration - Setup Complete

## What Was Done

### 1. Code Changes
- Created `src/features/i18n/bedrock.service.ts` - New service for AWS Bedrock (Claude) integration
- Updated `src/features/i18n/kisan-mitra.service.ts` - Switched from Lex to Bedrock for query processing
- Updated `src/features/i18n/kisan-mitra.routes.ts` - Updated health check to detect Bedrock configuration
- Updated `.env` and `.env.production` - Added `BEDROCK_MODEL_ID` environment variable

### 2. IAM Policy Updates
- Updated `BharatMandiEC2Policy` (v2) with Bedrock permissions:
  ```json
  {
    "Sid": "BedrockAccess",
    "Effect": "Allow",
    "Action": [
      "bedrock:InvokeModel",
      "bedrock:InvokeModelWithResponseStream"
    ],
    "Resource": "arn:aws:bedrock:ap-southeast-2::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
  }
  ```

### 3. Package Installation
- Installed `@aws-sdk/client-bedrock-runtime` on EC2 instance
- Package version: 3.1003.0

### 4. Deployment
- Built and deployed updated code to EC2
- Updated environment variables on EC2
- Restarted application with PM2

## Current Status

✅ Code deployed successfully
✅ IAM permissions configured (including AWS Marketplace permissions)
✅ EC2 instance using IAM role (not user credentials)
✅ Health endpoint shows: `"service": "bedrock"`
✅ Use case submitted to Anthropic for Claude 3 Haiku
❌ **AWS Marketplace Subscription Expired Immediately** - Agreement created and expired within 1 minute

### Issue Details
- **Marketplace Agreement Status**: Created at 01:53 AM UTC, Expired at 01:54 AM UTC (March 7, 2026)
- **Agreement ID**: agmt-5l16wtgcno2zlc6ok983j8cpl
- **Product**: Claude 3 Haiku (Amazon Bedrock Edition)
- **Seller**: Anthropic, PBC
- **Error**: Model access denied - subscription expired immediately after creation

### Root Cause Analysis
The AWS Marketplace agreement expired within 1 minute of creation, which indicates:
1. **Possible IAM Permission Issue**: Even though we added marketplace permissions, the EC2 role might not have sufficient privileges to complete the subscription
2. **Account Verification Required**: New AWS accounts or accounts without payment history may require manual verification
3. **Subscription Process Incomplete**: The subscription might need to be completed through the AWS Console, not just the Bedrock model catalog
4. **Regional Availability**: Claude 3 Haiku might have specific requirements in ap-southeast-2 region

### What Happened
1. Submitted use case form in Bedrock console → Success
2. AWS created marketplace agreement → Success
3. Agreement expired immediately → **FAILURE**
4. Model access still denied → Need to resubscribe

## Next Steps: Fix AWS Marketplace Subscription

### STEP 1: Resubscribe to Claude 3 Haiku (REQUIRED)

The email says: "To use this product again, you must resubscribe to the product."

**How to resubscribe:**

1. **Go to AWS Bedrock Console**
   - Navigate to: https://console.aws.amazon.com/bedrock/
   - Region: ap-southeast-2 (Sydney)

2. **Access Model Catalog**
   - Click "Model catalog" in the left sidebar
   - Or go directly to: Bedrock → Foundation models → Model catalog

3. **Find Claude 3 Haiku**
   - Search for "Claude 3 Haiku"
   - Or filter by Provider: Anthropic

4. **Request Model Access (Again)**
   - Click on "Claude 3 Haiku"
   - Click "Request model access" or "Manage model access"
   - Fill out the use case form:
     - **Company name**: [Your company or "Individual Developer"]
     - **Industry**: Agriculture
     - **Use case**: "AI assistant for Indian farmers to get farming advice, crop information, and market guidance. External-facing application for end users (farmers)."
   - Submit the form

5. **Complete AWS Marketplace Subscription**
   - After submitting, you may be redirected to AWS Marketplace
   - Review the subscription terms
   - Click "Subscribe" or "Accept terms"
   - **IMPORTANT**: Make sure the subscription completes successfully (don't close the page immediately)

6. **Verify Subscription Status**
   - Go to: AWS Marketplace → Manage subscriptions
   - Look for "Claude 3 Haiku (Amazon Bedrock Edition)"
   - Status should be "Active" (not "Pending" or "Expired")

### STEP 2: Alternative - Use Your AWS Account (Not EC2 Role)

The issue might be that EC2 IAM roles cannot complete marketplace subscriptions. Try:

1. **Subscribe using your AWS Console login** (not the EC2 role)
   - Log into AWS Console with your user account
   - Follow STEP 1 above to subscribe
   - The subscription is account-wide, so EC2 can use it once you subscribe

2. **Verify your account has payment method**
   - Go to: AWS Console → Billing → Payment methods
   - Ensure a valid credit card is on file
   - Marketplace subscriptions require payment verification

### STEP 3: Check IAM User Permissions (If Using Root Account)

If you're logged in as root user, you should have all permissions. If using an IAM user:

1. Go to IAM → Users → [Your user]
2. Ensure you have these permissions:
   - `aws-marketplace:Subscribe`
   - `aws-marketplace:ViewSubscriptions`
   - `aws-marketplace:Unsubscribe`
3. Or attach the `AWSMarketplaceManageSubscriptions` managed policy

### STEP 4: Test After Resubscribing

Once subscription is active, test immediately:

```bash
# Test Bedrock access
curl -X POST http://13.236.3.139:3000/api/kisan-mitra/query \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","query":"What is the best time to plant tomatoes?","language":"en"}'
```

Expected: Should return Claude's response (not an error)

### ALTERNATIVE: Use Mode Switching (Recommended for Now)

Since Bedrock subscription is having issues, use the mode switching feature:

**Option A: Use Lex Mode (Immediate)**
```bash
ssh -i test-key.pem ubuntu@13.236.3.139
cd ~/.build
echo "KISAN_MITRA_MODE=lex" >> .env
pm2 restart bharat-mandi
```

**Option B: Use Mock Mode (Testing)**
```bash
ssh -i test-key.pem ubuntu@13.236.3.139
cd ~/.build
echo "KISAN_MITRA_MODE=mock" >> .env
pm2 restart bharat-mandi
```

**Option C: Keep Bedrock Mode (Wait for Subscription)**
```bash
# Already set to bedrock mode
# Just resubscribe and wait for approval
```

### Why Did the Subscription Expire Immediately?

Possible reasons:
1. **Payment verification failed** - Check billing console for alerts
2. **Account limits** - New AWS accounts may have marketplace restrictions
3. **Regional availability** - Some models have limited regional access
4. **Incomplete subscription flow** - Page might have been closed before completion
5. **IAM role limitation** - EC2 roles cannot complete marketplace subscriptions (only view/use them)

## Testing

Once model access is enabled, test with:

```bash
curl -X POST http://13.236.3.139:3000/api/kisan-mitra/query \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "query": "What is the best time to plant tomatoes?",
    "language": "en"
  }'
```

Expected response:
```json
{
  "success": true,
  "text": "The best time to plant tomatoes...",
  "intent": "GenericAssistant",
  "confidence": 0.95,
  "sessionId": "..."
}
```

## Benefits of Bedrock over Lex

1. **Open-ended conversations** - Can answer ANY farming question, not limited to 3 predefined intents
2. **Better context understanding** - Claude understands nuanced questions better
3. **Conversation history** - Maintains context across multiple questions
4. **More natural responses** - Claude provides detailed, helpful answers
5. **No bot training required** - Works immediately without intent/slot configuration

## Mode Switching Feature (IMPLEMENTED)

Kisan Mitra now supports three modes:

### 1. Mock Mode
- **Purpose**: Testing and development
- **How it works**: Returns predefined responses based on keyword matching
- **Use when**: Testing frontend, no AWS services needed
- **Configuration**: `KISAN_MITRA_MODE=mock`

### 2. Lex Mode
- **Purpose**: Structured intent-based conversations
- **How it works**: Uses AWS Lex with 3 predefined intents (GetCropPrice, GetWeather, GetFarmingAdvice)
- **Use when**: You want structured, predictable responses
- **Configuration**: `KISAN_MITRA_MODE=lex` (requires LEX_BOT_ID and LEX_BOT_ALIAS_ID)

### 3. Bedrock Mode
- **Purpose**: Open-ended AI conversations
- **How it works**: Uses AWS Bedrock (Claude) for natural language understanding
- **Use when**: You want a true AI assistant that can answer any farming question
- **Configuration**: `KISAN_MITRA_MODE=bedrock` (requires BEDROCK_MODEL_ID and AWS Marketplace subscription)

### Auto-Detection
If `KISAN_MITRA_MODE` is not set, the system auto-detects:
1. If `BEDROCK_MODEL_ID` is set → Use Bedrock mode
2. Else if `LEX_BOT_ID` is set → Use Lex mode
3. Else → Use Mock mode

### Switching Modes on EC2

**Switch to Lex (works now):**
```bash
ssh -i test-key.pem ubuntu@13.236.3.139
cd ~/.build
# Edit .env file
nano .env
# Add or change: KISAN_MITRA_MODE=lex
# Save and exit (Ctrl+X, Y, Enter)
pm2 restart bharat-mandi
```

**Switch to Mock (for testing):**
```bash
ssh -i test-key.pem ubuntu@13.236.3.139
cd ~/.build
nano .env
# Add or change: KISAN_MITRA_MODE=mock
pm2 restart bharat-mandi
```

**Switch to Bedrock (after subscription is active):**
```bash
ssh -i test-key.pem ubuntu@13.236.3.139
cd ~/.build
nano .env
# Add or change: KISAN_MITRA_MODE=bedrock
pm2 restart bharat-mandi
```

### Check Current Mode

```bash
curl http://13.236.3.139:3000/api/kisan-mitra/health
```

Response shows current mode:
```json
{
  "success": true,
  "status": "healthy",
  "mode": "lex",  // or "mock" or "bedrock"
  "botConfigured": true,
  "message": "Kisan Mitra is ready (powered by AWS Lex)"
}
```

## Configuration

### Environment Variables (EC2)
```bash
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
AWS_REGION=ap-southeast-2
# AWS credentials come from IAM role (no keys needed)
```

### System Prompt
The Bedrock service uses a custom system prompt that defines Kisan Mitra as:
- An AI assistant for Indian farmers
- Provides practical farming advice
- Helps with crop selection, planting, harvesting
- Offers pest/disease management tips
- Shares market price information
- Provides weather-related guidance
- Culturally sensitive to Indian farming practices

## Monitoring

Check application logs:
```bash
ssh -i test-key.pem ubuntu@13.236.3.139
pm2 logs bharat-mandi
```

Look for:
- `[Bedrock] Processing query through Bedrock:` - Query received
- `[Bedrock] Claude response:` - Response from Claude
- `[Bedrock] API call failed:` - Errors (check IAM permissions or model access)

## Cost Considerations

Claude 3 Haiku pricing (ap-southeast-2):
- Input: $0.00025 per 1K tokens (~$0.25 per 1M tokens)
- Output: $0.00125 per 1K tokens (~$1.25 per 1M tokens)

Typical conversation:
- User query: ~50 tokens
- Claude response: ~200 tokens
- Cost per query: ~$0.0003 (less than 1 cent)

For 1000 queries/day: ~$0.30/day or ~$9/month

Much cheaper than maintaining a Lex bot with custom intents!

## Rollback (if needed)

If you need to revert to Lex:
1. The Lex configuration is still in place (LEX_BOT_ID, LEX_BOT_ALIAS_ID)
2. Revert the code changes in `kisan-mitra.service.ts`
3. Redeploy and restart

However, Bedrock provides much better functionality for a generic AI assistant use case.
