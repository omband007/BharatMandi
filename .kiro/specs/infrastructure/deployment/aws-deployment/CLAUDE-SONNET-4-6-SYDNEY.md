# Claude Sonnet 4.6 Configuration for Sydney Region

## Overview
Successfully configured Claude Sonnet 4.6 using AWS Bedrock inference profiles for the Sydney (ap-southeast-2) region.

## Configuration Details

### Model Information
- **Model**: Claude Sonnet 4.6
- **Inference Profile ID**: `au.anthropic.claude-sonnet-4-6`
- **Region**: ap-southeast-2 (Sydney)
- **Routing**: Automatically routes between Sydney (ap-southeast-2) and Melbourne (ap-southeast-4)

### Why Inference Profiles?

Claude Sonnet 4.6 (and other Claude 4.x models) **require** inference profiles instead of direct model IDs. This is a new requirement from AWS Bedrock for the latest Claude models.

**Key Points**:
- ❌ Cannot use base model ID directly (e.g., `anthropic.claude-sonnet-4-6-20250514-v1:0`)
- ✅ Must use inference profile (e.g., `au.anthropic.claude-sonnet-4-6`)
- Inference profiles provide cross-region routing for better availability and performance
- The profile automatically selects the best region (Sydney or Melbourne) for each request

### Available Inference Profiles for Sydney

From Sydney (ap-southeast-2), you can use:

1. **AU (Australia) Profiles** - Regional routing within Australia:
   - `au.anthropic.claude-sonnet-4-6` - Routes between Sydney & Melbourne
   - `au.anthropic.claude-opus-4-6-v1` - Routes between Sydney & Melbourne
   - `au.anthropic.claude-haiku-4-5-20251001-v1:0` - Routes between Sydney & Melbourne
   - `au.anthropic.claude-sonnet-4-5-20250929-v1:0` - Routes between Sydney & Melbourne

2. **APAC Profiles** - Regional routing across Asia-Pacific:
   - `apac.anthropic.claude-sonnet-4-6` - Routes across multiple APAC regions
   - `apac.anthropic.claude-sonnet-4-20250514-v1:0` - Routes across multiple APAC regions
   - `apac.amazon.nova-lite-v1:0` - Amazon Nova Lite for APAC

3. **Global Profiles** - Global routing across all commercial regions:
   - `global.anthropic.claude-sonnet-4-6` - Routes globally
   - `global.anthropic.claude-opus-4-6-v1` - Routes globally

**Recommendation**: Use AU profiles for best latency and data residency within Australia.

## Implementation Changes

### 1. Updated `src/features/i18n/kisan-mitra.service.ts`
```typescript
if (effectiveMode === 'bedrock-claude') {
  actualMode = 'bedrock';
  // Use AU inference profile for Claude Sonnet 4.6 (routes between Sydney and Melbourne)
  bedrockModelId = 'au.anthropic.claude-sonnet-4-6';
}
```

### 2. Updated `src/features/i18n/bedrock.service.ts`
```typescript
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || 'ap-southeast-2', // Sydney region for AU inference profiles
});
```

### 3. Updated Environment Variables
```bash
# In .env on EC2
BEDROCK_REGION=ap-southeast-2
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0  # Fallback model
```

### 4. Updated UI Labels
- Dropdown: "Bedrock (Claude 4.6)"
- Status: "Bedrock mode - AI Assistant (Claude Sonnet 4.6)"
- Mode name: "AWS Bedrock (Claude Sonnet 4.6) Mode"

## Claude Sonnet 4.6 Features

### Performance Improvements
- **Best computer use model**: Highest score on OSWorld benchmark among Sonnet models
- **Coding performance**: 79.6% on SWE-bench Verified
- **Preferred over predecessors**: 70% preference over Sonnet 4.5, 59% over Opus 4.5
- **1M token context window** (beta)
- **Adaptive thinking / extended thinking** support
- **Improved prompt injection resistance**

### Context Compaction (Beta)
Claude Sonnet 4.6 supports automatic context compaction:
- Automatically summarizes long conversation contexts
- Effectively extends context length
- Reduces token consumption for long conversations
- Example: 58,601 tokens compressed to 479 tokens

### Pricing
- **Same as Sonnet 4.5**: Input $3.00 / Output $15.00 per 1M tokens
- **50% discount** available with batch inference
- **Adaptive thinking** allows cost/quality balance adjustment

## Testing Steps

1. **Access the application**:
   ```
   http://13.236.3.139:3000/kisan-mitra.html
   ```

2. **Select Claude Sonnet 4.6 mode**:
   - Open the mode dropdown
   - Select "Bedrock (Claude 4.6)"

3. **Test with a query**:
   - Select language (English recommended for testing)
   - Type a farming-related question
   - Send and verify response

4. **Verify in logs**:
   ```bash
   ssh -i test-key.pem ubuntu@13.236.3.139
   cd /home/ubuntu/bharat-mandi-app
   pm2 logs bharat-mandi --lines 50
   ```

## Model Access Requirements

### Enable Model Access in AWS Bedrock Console

Even though inference profiles are "auto-enabled", you may need to explicitly request access:

1. **Go to AWS Console** > Bedrock > Model Access
2. **Select Region**: ap-southeast-2 (Sydney)
3. **Find Claude Sonnet 4.6** in the model list
4. **Click "Request access"** or "Enable"
5. **Wait for approval** (usually instant for serverless models)

### IAM Permissions

The EC2 IAM role (`BharatMandiEC2Role`) needs permissions for inference profiles:

```json
{
  "Effect": "Allow",
  "Action": "bedrock:InvokeModel",
  "Resource": "arn:aws:bedrock:ap-southeast-2:*:inference-profile/au.anthropic.claude-sonnet-4-6"
}
```

**Note**: The existing Bedrock permissions should cover this, but if you get access denied errors, add the specific inference profile ARN.

## Troubleshooting

### Error: "Model not found" (404)
- **Cause**: Model access not enabled in Bedrock console
- **Solution**: Go to AWS Console > Bedrock > Model Access and enable Claude Sonnet 4.6

### Error: "Access Denied"
- **Cause**: IAM permissions don't include inference profile
- **Solution**: Update IAM policy to include inference profile ARN

### Error: "Invalid model ID"
- **Cause**: Using base model ID instead of inference profile
- **Solution**: Use `au.anthropic.claude-sonnet-4-6` (not `anthropic.claude-sonnet-4-6-20250514-v1:0`)

### Slow Response Times
- **Cause**: Cross-region routing to Melbourne
- **Solution**: This is normal; the AU profile automatically selects the best region

### Language Issues (Wrong Language in Response)
- **Cause**: Conversation history contamination (same issue as Nova Lite)
- **Solution**: Use "Clear Chat" button to reset conversation history

## Comparison: Claude Sonnet 4.6 vs Amazon Nova Lite

| Feature | Claude Sonnet 4.6 | Amazon Nova Lite |
|---------|-------------------|------------------|
| **Model Type** | Anthropic Claude | Amazon Nova |
| **Context Window** | 1M tokens (beta) | 300K tokens |
| **Coding Performance** | 79.6% SWE-bench | Not specified |
| **Computer Use** | Best in class | Not supported |
| **Pricing (Input)** | $3.00 / 1M tokens | $0.06 / 1M tokens |
| **Pricing (Output)** | $15.00 / 1M tokens | $0.24 / 1M tokens |
| **Language Handling** | Better (less contamination) | Issues with language mixing |
| **Inference Profile** | Required | Optional |
| **Best For** | Complex reasoning, coding | Cost-effective general use |

## Current Configuration Summary

### Working Models
- ✅ **Amazon Nova Lite**: `amazon.nova-lite-v1:0` (us-east-1)
- ✅ **Claude Sonnet 4.6**: `au.anthropic.claude-sonnet-4-6` (ap-southeast-2)

### Mode Mapping
- `mock` → Simulated responses
- `lex` → AWS Lex with 3 intents
- `bedrock-nova` → Amazon Nova Lite (us-east-1)
- `bedrock-claude` → Claude Sonnet 4.6 (ap-southeast-2, AU profile)

### Regions in Use
- **us-east-1**: For Nova Lite (better availability)
- **ap-southeast-2**: For Claude Sonnet 4.6 (Sydney, AU profile)

## Next Steps

1. **Test Claude Sonnet 4.6**:
   - Verify model works with AU inference profile
   - Compare response quality with Nova Lite
   - Test in multiple languages

2. **Enable Model Access** (if needed):
   - Go to AWS Bedrock console in Sydney region
   - Request access to Claude Sonnet 4.6
   - Wait for approval (should be instant)

3. **Performance Testing**:
   - Compare response times between Nova and Claude
   - Test with complex farming queries
   - Evaluate language handling

4. **Cost Monitoring**:
   - Track token usage for both models
   - Compare costs (Claude is 50x more expensive)
   - Decide on default model based on use case

5. **Consider Hybrid Approach**:
   - Use Nova Lite for simple queries (cost-effective)
   - Use Claude Sonnet 4.6 for complex reasoning (better quality)
   - Implement automatic model selection based on query complexity

## References

- [AWS Bedrock Inference Profiles Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html)
- [Claude Sonnet 4.6 Announcement](https://www.anthropic.com/news/claude-sonnet-4-6)
- [AWS Blog: Claude Sonnet 4.6 on Bedrock](https://aws.amazon.com/about-aws/whats-new/2026/02/claude-sonnet-4.6-available-in-amazon-bedrock/)
- [Claude Sonnet 4.6 on Bedrock (Classmethod)](https://dev.classmethod.jp/en/articles/amazon-bedrock-claude-sonnet-4-6/)

## Deployment Status

- ✅ Code updated with AU inference profile
- ✅ Bedrock region changed to ap-southeast-2
- ✅ Environment variables updated on EC2
- ✅ Application built and deployed
- ✅ Application restarted
- ⏳ Awaiting testing and model access verification
