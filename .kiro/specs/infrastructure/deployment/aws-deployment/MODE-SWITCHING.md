# Kisan Mitra Mode Switching Feature

## Overview

Kisan Mitra now supports dynamic mode switching between three AI backends:
1. **Mock Mode** - Simulated responses for testing
2. **Lex Mode** - AWS Lex with 3 predefined intents
3. **Bedrock Mode** - AWS Bedrock (Claude) for open-ended conversations

Users can switch modes on-the-fly from the frontend without restarting the server.

## How It Works

### Frontend (User Interface)

The Kisan Mitra chat page (`/kisan-mitra.html`) now has a dropdown selector in the header:

```
Mode: [Mock ▼] [Lex] [Bedrock]
```

When a user selects a mode:
1. The frontend updates the status message
2. All subsequent queries use the selected mode
3. A system message appears in the chat confirming the mode switch

### Backend (API)

The `/api/kisan-mitra/query` endpoint now accepts an optional `mode` parameter:

```json
{
  "userId": "test-user",
  "query": "What is the price of tomatoes?",
  "language": "en",
  "mode": "bedrock"  // Optional: "mock", "lex", or "bedrock"
}
```

If `mode` is provided, it overrides the server's default mode (set via `KISAN_MITRA_MODE` environment variable).

## Mode Descriptions

### 1. Mock Mode
- **Purpose**: Testing and development
- **How it works**: Returns predefined responses based on keyword matching
- **Capabilities**:
  - Crop price queries (simulated prices)
  - Weather queries (simulated weather)
  - Farming advice (generic tips)
  - Help and navigation
- **Use when**: Testing frontend, no AWS services needed
- **Cost**: Free (no AWS calls)

### 2. Lex Mode
- **Purpose**: Structured intent-based conversations
- **How it works**: Uses AWS Lex V2 with 3 predefined intents
- **Capabilities**:
  - GetCropPrice - Returns crop prices from built-in database
  - GetWeather - Weather information (requires API integration)
  - GetFarmingAdvice - Farming tips and advice
- **Use when**: You want predictable, structured responses
- **Cost**: ~$0.75/month for 1000 queries
- **Requirements**: LEX_BOT_ID and LEX_BOT_ALIAS_ID configured

### 3. Bedrock Mode
- **Purpose**: Open-ended AI conversations
- **How it works**: Uses AWS Bedrock with Claude 3 Haiku
- **Capabilities**:
  - Can answer ANY farming question
  - Maintains conversation context
  - Natural language understanding
  - Culturally sensitive to Indian farming
- **Use when**: You want a true AI assistant
- **Cost**: ~$9/month for 1000 queries
- **Requirements**: 
  - BEDROCK_MODEL_ID configured
  - AWS Marketplace subscription to Claude 3 Haiku
  - IAM permissions for bedrock:InvokeModel

## Configuration

### Server Default Mode

Set the default mode via environment variable on EC2:

```bash
# In ~/.build/.env
KISAN_MITRA_MODE=lex  # or "mock" or "bedrock"
```

This determines which mode is used when:
1. The frontend doesn't specify a mode
2. Direct API calls don't include the mode parameter

### Auto-Detection

If `KISAN_MITRA_MODE` is not set, the system auto-detects:
1. If `BEDROCK_MODEL_ID` is set → Use Bedrock mode
2. Else if `LEX_BOT_ID` is set → Use Lex mode
3. Else → Use Mock mode

## Testing the Feature

### 1. Open Kisan Mitra Page

```
http://13.236.3.139:3000/kisan-mitra.html
```

### 2. Test Mock Mode

1. Select "Mock" from the mode dropdown
2. Ask: "What is the price of tomatoes?"
3. Expected: Simulated response with random price

### 3. Test Lex Mode

1. Select "Lex" from the mode dropdown
2. Ask: "What is the price of tomatoes?"
3. Expected: Response from AWS Lex with built-in crop prices

### 4. Test Bedrock Mode

1. Select "Bedrock" from the mode dropdown
2. Ask: "What is the best time to plant tomatoes?"
3. Expected: 
   - If subscription active: Detailed response from Claude
   - If subscription pending: Error message about model access

## API Examples

### Query with Mode Override

```bash
curl -X POST http://13.236.3.139:3000/api/kisan-mitra/query \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "query": "What is the price of tomatoes?",
    "language": "en",
    "mode": "bedrock"
  }'
```

### Query with Default Mode

```bash
curl -X POST http://13.236.3.139:3000/api/kisan-mitra/query \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "query": "What is the price of tomatoes?",
    "language": "en"
  }'
```

## Benefits

1. **Flexibility**: Switch between modes without server restart
2. **Testing**: Easy to compare responses from different backends
3. **Cost Control**: Use Mock mode for development, Lex for production, Bedrock for premium features
4. **Gradual Migration**: Test Bedrock mode while keeping Lex as fallback
5. **User Choice**: Let users choose their preferred AI backend

## Current Status

✅ **Mock Mode**: Fully functional
✅ **Lex Mode**: Fully functional (currently set as default)
⚠️ **Bedrock Mode**: Code complete, waiting for AWS Marketplace subscription

## Switching Modes on EC2

### Via Environment Variable (Server Default)

```bash
ssh -i test-key.pem ubuntu@13.236.3.139
cd ~/.build
nano .env
# Change: KISAN_MITRA_MODE=bedrock
pm2 restart bharat-mandi
```

### Via Frontend (Per-Request)

Just use the dropdown selector in the Kisan Mitra page - no server restart needed!

## Troubleshooting

### Mode Not Switching

1. Check browser console for errors
2. Verify API is responding: `curl http://13.236.3.139:3000/api/kisan-mitra/health`
3. Clear browser cache and reload

### Bedrock Mode Errors

If you get "Model access denied" errors:
1. Check AWS Marketplace subscription status
2. Verify IAM permissions include `bedrock:InvokeModel`
3. Ensure `BEDROCK_MODEL_ID` is set correctly
4. See BEDROCK-SETUP.md for detailed troubleshooting

### Lex Mode Errors

If you get "Kisan Mitra is temporarily unavailable":
1. Check LEX_BOT_ID and LEX_BOT_ALIAS_ID are set
2. Verify IAM permissions include `lex:RecognizeText`
3. Check PM2 logs: `pm2 logs bharat-mandi`

## Implementation Details

### Files Modified

1. **Frontend**:
   - `public/kisan-mitra.html` - Added mode selector dropdown and logic

2. **Backend**:
   - `src/features/i18n/kisan-mitra.routes.ts` - Added mode parameter validation
   - `src/features/i18n/kisan-mitra.service.ts` - Added mode override logic

### Code Changes

**Request Interface**:
```typescript
export interface KisanMitraRequest {
  userId: string;
  sessionId: string;
  query: string;
  language: string;
  audioInput?: Buffer;
  mode?: 'mock' | 'lex' | 'bedrock'; // New optional parameter
}
```

**Mode Selection Logic**:
```typescript
// Determine which mode to use (request mode overrides environment mode)
const effectiveMode = request.mode || KISAN_MITRA_MODE;

switch (effectiveMode) {
  case 'mock':
    // Use mock responses
  case 'lex':
    // Use AWS Lex
  case 'bedrock':
    // Use AWS Bedrock
}
```

## Future Enhancements

1. **User Preferences**: Save user's preferred mode in localStorage
2. **Auto-Fallback**: Automatically fall back to Lex if Bedrock fails
3. **Mode Comparison**: Side-by-side comparison of responses from different modes
4. **Analytics**: Track which mode users prefer
5. **Cost Dashboard**: Show estimated costs per mode

## Related Documentation

- `BEDROCK-SETUP.md` - Bedrock integration and troubleshooting
- `CURRENT-STATUS.md` - Overall system status
- `PHASE3-COMPLETE.md` - EC2 deployment details
