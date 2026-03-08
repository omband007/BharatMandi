# Multi-Model Support for Kisan Mitra

**Date**: March 7, 2026
**Status**: ✅ Implemented

## Overview

Kisan Mitra now supports 4 different modes that can be switched dynamically from the UI without any server restart or configuration changes:

1. **Mock Mode** - Testing with simulated responses
2. **Lex Mode** - AWS Lex with 3 predefined intents
3. **Bedrock (Nova) Mode** - Amazon Nova Lite model
4. **Bedrock (Claude) Mode** - Claude 3 Haiku model

## Features

### Dynamic Mode Switching ✅
- Switch between modes from the dropdown in the UI
- No server restart required
- No configuration file changes needed
- Each mode uses a different AI model/service

### Model-Specific Modes ✅
- **bedrock-nova**: Uses `amazon.nova-lite-v1:0`
  - Fast, cost-effective
  - Good for general farming Q&A
  - No subscription required
  
- **bedrock-claude**: Uses `anthropic.claude-3-haiku-20240307-v1:0`
  - Premium conversational AI
  - Better quality responses
  - Requires AWS Marketplace subscription

### Clear Chat Button ✅
- Clears conversation history
- Generates new session ID
- Resets the chat to start fresh
- Useful when switching between models or languages

## How It Works

### Frontend
The mode selector dropdown sends the selected mode to the backend:
```javascript
{
  userId: "user-123",
  query: "What is tomato?",
  language: "en",
  mode: "bedrock-nova"  // or "bedrock-claude", "lex", "mock"
}
```

### Backend
The backend maps the mode to the appropriate model:
- `bedrock-nova` → `amazon.nova-lite-v1:0`
- `bedrock-claude` → `anthropic.claude-3-haiku-20240307-v1:0`
- `bedrock` → Uses `BEDROCK_MODEL_ID` from environment (default)
- `lex` → Uses AWS Lex bot
- `mock` → Returns simulated responses

### Code Changes

**1. Updated Interfaces**:
```typescript
export interface KisanMitraRequest {
  userId: string;
  sessionId: string;
  query: string;
  language: string;
  audioInput?: Buffer;
  mode?: 'mock' | 'lex' | 'bedrock' | 'bedrock-nova' | 'bedrock-claude';
  modelId?: string;
}

export interface BedrockRequest {
  userId: string;
  sessionId: string;
  query: string;
  language: string;
  conversationHistory?: ConversationMessage[];
  modelId?: string;
}
```

**2. Mode Mapping Logic**:
```typescript
let bedrockModelId: string | undefined;
let actualMode = effectiveMode;

if (effectiveMode === 'bedrock-nova') {
  actualMode = 'bedrock';
  bedrockModelId = 'amazon.nova-lite-v1:0';
} else if (effectiveMode === 'bedrock-claude') {
  actualMode = 'bedrock';
  bedrockModelId = 'anthropic.claude-3-haiku-20240307-v1:0';
}
```

**3. Model ID Override**:
The bedrock service now accepts a `modelId` parameter that overrides the environment variable:
```typescript
const effectiveModelId = modelId || MODEL_ID;
await this.invokeClaude(messages, effectiveModelId);
```

## Usage

### Via Browser
1. Open http://13.236.3.139:3000/kisan-mitra.html
2. Select mode from dropdown:
   - Mock
   - Lex
   - Bedrock (Nova)
   - Bedrock (Claude)
3. Ask your question
4. The response will come from the selected model

### Via API
```bash
# Test with Nova
curl -X POST http://13.236.3.139:3000/api/kisan-mitra/query \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test",
    "query": "What is the best time to plant tomatoes?",
    "language": "en",
    "mode": "bedrock-nova"
  }'

# Test with Claude
curl -X POST http://13.236.3.139:3000/api/kisan-mitra/query \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test",
    "query": "What is the best time to plant tomatoes?",
    "language": "en",
    "mode": "bedrock-claude"
  }'
```

## Benefits

1. **Easy Testing**: Compare responses from different models side-by-side
2. **No Configuration Changes**: Switch models without editing config files
3. **No Server Restart**: Changes take effect immediately
4. **Flexible**: Can add more models in the future easily
5. **Cost Control**: Use cheaper models (Nova) for testing, premium models (Claude) for production

## Model Comparison

| Mode | Model | Cost | Quality | Subscription Required |
|------|-------|------|---------|----------------------|
| Mock | N/A | Free | N/A | No |
| Lex | AWS Lex | $0.75/1000 | Good | No |
| Bedrock (Nova) | Amazon Nova Lite | $2-4/1000 | Very Good | No |
| Bedrock (Claude) | Claude 3 Haiku | $9-12/1000 | Excellent | Yes |

## Notes

### Claude Subscription
To use Bedrock (Claude) mode, you need to:
1. Go to AWS Console → Bedrock → Model access
2. Request access to Claude 3 Haiku
3. Complete AWS Marketplace subscription
4. Wait for approval (5-30 minutes)

### Nova Model
- Works immediately (auto-enabled)
- No subscription required
- Good quality for farming Q&A
- Cost-effective for production use

### System Prompt
Both Bedrock modes use the same system prompt that explicitly instructs the model to:
- Always respond in English
- Provide practical farming advice
- Keep responses concise (2-3 paragraphs)
- Be culturally sensitive to Indian farming practices

## Files Modified

1. `src/features/i18n/kisan-mitra.service.ts` - Added mode mapping logic
2. `src/features/i18n/bedrock.service.ts` - Added modelId parameter support
3. `src/features/i18n/kisan-mitra.routes.ts` - Updated mode validation
4. `public/kisan-mitra.html` - Added new mode options and clear chat button

## Related Documentation

- `BEDROCK-SUCCESS.md` - Bedrock integration details
- `BEDROCK-MODELS.md` - Model comparison and pricing
- `MODE-SWITCHING.md` - Original mode switching feature
- `CURRENT-STATUS.md` - Overall system status
