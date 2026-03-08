# AWS Bedrock Model Comparison for Kisan Mitra

## Overview

This document compares different AI models available in AWS Bedrock for use with Kisan Mitra.

## Current Configuration ✅

**Active Model**: Amazon Nova Lite
- **Model ID**: `amazon.nova-lite-v1:0`
- **Region**: us-east-1
- **Status**: ✅ Working perfectly
- **No subscription required**: Works immediately with auto-enabled access

## Available Models Comparison

### 1. Amazon Nova Lite ⭐ RECOMMENDED & WORKING

**Model ID**: `amazon.nova-lite-v1:0`

**Pros**:
- ✅ No AWS Marketplace subscription needed
- ✅ Auto-enabled access (no manual approval required)
- ✅ Available immediately in us-east-1
- ✅ Very cost-effective
- ✅ Excellent for conversational AI
- ✅ Fast response times
- ✅ Good quality responses for farming Q&A
- ✅ Supports multimodal inputs (text, images, video)
- ✅ Latest Amazon model (released December 2024)

**Cons**:
- Newer model, less documentation available
- Smaller context window than premium models

**Best for**: 
- Quick deployment without subscription hassles
- Cost-effective production use
- General farming Q&A
- Budget-conscious applications
- POC and testing

**Status**: ✅ Currently active and working

---

### 2. Amazon Titan Text Models ⚠️ DEPRECATED

**Model IDs**: 
- `amazon.titan-text-express-v1` (DEPRECATED)
- `amazon.titan-text-premier-v1:0` (NOT FOUND)
- `amazon.titan-text-lite-v1` (NOT FOUND)

**Status**: ❌ These models have reached end-of-life or are not available in us-east-1
- Error: "This model version has reached the end of its life"
- Error: "Model not found" (404)

**Do NOT use these models** - they are no longer available.

---

### 3. Amazon Nova Pro

**Model ID**: `amazon.nova-pro-v1:0`

**Pros**:
- ✅ More capable than Nova Lite
- ✅ Better reasoning and complex tasks
- ✅ Multimodal support
- ✅ Auto-enabled access

**Cons**:
- More expensive than Nova Lite
- May be overkill for simple farming Q&A

**Best for**:
- Complex reasoning tasks
- When quality matters more than cost
- Advanced farming advice

**Status**: ⚠️ Available but not tested yet

---

### 4. Anthropic Claude 3 Haiku

**Model ID**: `anthropic.claude-3-haiku-20240307-v1:0`

**Pros**:
- ✅ Excellent conversational abilities
- ✅ Very good at understanding context
- ✅ Culturally sensitive responses
- ✅ Handles complex, nuanced questions well
- ✅ Good multilingual support
- ✅ Fast response times

**Cons**:
- ❌ Requires AWS Marketplace subscription
- ❌ Subscription approval can take time
- ❌ More expensive than Nova
- ❌ Subscription issues (as we experienced)

**Best for**:
- High-quality conversational AI
- Complex farming advice
- Premium user experience
- When quality matters more than cost

**Status**: ⚠️ Requires AWS Marketplace subscription (currently not subscribed)

---

## Recommendation Matrix

| Use Case | Recommended Model | Reason |
|----------|------------------|---------|
| **Quick Testing** | Amazon Nova Lite | No subscription, works immediately |
| **Cost-Effective Production** | Amazon Nova Lite | Best price/performance ratio |
| **High Quality Responses** | Amazon Nova Pro or Claude 3 Haiku | Better reasoning capabilities |
| **POC/Demo** | Amazon Nova Lite | Works out of the box |
| **Premium Experience** | Claude 3 Haiku | Best overall quality (requires subscription) |

## Current Setup ✅

**Active Model**: Amazon Nova Lite (`amazon.nova-lite-v1:0`)
- **Why**: No subscription needed, works immediately, cost-effective, good quality
- **Performance**: Excellent for farming Q&A
- **Region**: us-east-1 (better model availability than ap-southeast-2)
- **Cost**: Very low (pay-per-use, no minimum)

## How to Switch Models

### Option 1: Via Environment Variable (Server Default)

```bash
ssh -i test-key.pem ubuntu@13.236.3.139
cd ~/.build
nano .env

# Change BEDROCK_MODEL_ID to one of:
# amazon.nova-lite-v1:0 (current - working)
# amazon.nova-pro-v1:0 (more capable, not tested)
# anthropic.claude-3-haiku-20240307-v1:0 (requires subscription)

pm2 restart bharat-mandi
```

### Option 2: Via Frontend (Dynamic)

Just select "Bedrock" mode from the dropdown in the Kisan Mitra page - the model is determined by the `BEDROCK_MODEL_ID` environment variable.

## Testing Bedrock

### Test via Browser
1. Open http://13.236.3.139:3000/kisan-mitra.html
2. Select "Bedrock" from the mode dropdown
3. Ask a question in English or Hindi
4. You should get a response from Amazon Nova Lite

### Test via API
```bash
curl -X POST http://13.236.3.139:3000/api/kisan-mitra/query \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test",
    "query": "What is the best time to plant tomatoes?",
    "language": "en",
    "mode": "bedrock"
  }'
```

## Model Availability by Region

| Model | us-east-1 | ap-southeast-2 | Subscription Required |
|-------|-----------|----------------|----------------------|
| Amazon Nova Lite | ✅ Available | ⚠️ Unknown | ❌ No (auto-enabled) |
| Amazon Nova Pro | ✅ Available | ⚠️ Unknown | ❌ No (auto-enabled) |
| Amazon Titan | ❌ Deprecated | ❌ Deprecated | N/A |
| Claude 3 Haiku | ✅ Available | ✅ Available | ✅ Yes |

## Code Implementation

The Bedrock service (`src/features/i18n/bedrock.service.ts`) now supports multiple model formats:

- **Claude models**: Uses Anthropic's message format with `anthropic_version` and `max_tokens`
- **Titan models**: Uses Amazon's text generation format with `inputText` and `textGenerationConfig`
- **Nova models**: Uses Amazon's Converse API format with `messages` and `inferenceConfig`

The code automatically detects the model type based on the `BEDROCK_MODEL_ID` and uses the appropriate request/response format.

## Cost Comparison (Estimated for 1000 queries/day)

| Model | Monthly Cost | Quality | Speed | Availability |
|-------|-------------|---------|-------|--------------|
| Amazon Nova Lite | $2-4 | Very Good | Fast | ✅ Immediate |
| Amazon Nova Pro | $8-12 | Excellent | Fast | ✅ Immediate |
| Claude 3 Haiku | $9-12 | Excellent | Fast | ⚠️ Requires subscription |
| Amazon Titan | N/A | N/A | N/A | ❌ Deprecated |

## Troubleshooting

### Model Not Found Error (404)
- ✅ SOLVED: Use `amazon.nova-lite-v1:0` instead of deprecated Titan models
- Check if model ID is correct
- Verify model is available in us-east-1 region
- Check AWS Bedrock console for model availability

### Access Denied Error
- For Nova models: Should work immediately (auto-enabled)
- For Claude: Check AWS Marketplace subscription
- Verify IAM permissions include `bedrock:InvokeModel`

### Malformed Input Request
- ✅ SOLVED: Different models use different API formats
- Nova uses Converse API format (messages with inferenceConfig)
- Claude uses Anthropic format (anthropic_version with max_tokens)
- Titan uses text generation format (inputText with textGenerationConfig)

### Subscription Issues
- Nova models: No subscription needed (auto-enabled)
- Claude models: Go to AWS Bedrock → Model access → Request access
- Wait for approval (5-30 minutes usually)

## Next Steps

1. **Current**: Using Amazon Nova Lite (working perfectly) ✅
2. **Optional**: Test Amazon Nova Pro for better quality
3. **Optional**: Subscribe to Claude 3 Haiku for premium experience
4. **Monitor**: Track costs and quality to optimize model choice

## Related Documentation

- `MODE-SWITCHING.md` - How to switch between Mock, Lex, and Bedrock modes
- `BEDROCK-SETUP.md` - Bedrock integration setup and troubleshooting
- `CURRENT-STATUS.md` - Overall system status
