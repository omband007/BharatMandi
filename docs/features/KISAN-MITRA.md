# Kisan Mitra - AI-Powered Voice Assistant

## Overview

Kisan Mitra ("Farmer's Friend") is an AI-powered conversational assistant built using AWS Lex that helps Indian farmers navigate the Bharat Mandi marketplace, get crop prices, weather information, farming advice, and more - all in their local language.

## Features

### Core Capabilities

1. **Crop Price Queries**
   - Get current market prices for any crop
   - Location-based pricing information
   - Quality-based price variations

2. **Weather Information**
   - Current weather conditions
   - Forecast for farming activities
   - Rain predictions

3. **Farming Advice**
   - Crop-specific tips and best practices
   - Planting, watering, fertilizer guidance
   - Pest control recommendations
   - Harvesting and storage advice

4. **Listing Creation Guidance**
   - Step-by-step listing creation
   - Price recommendations
   - Photo and description guidance

5. **App Navigation**
   - Voice-controlled navigation
   - Quick access to key screens
   - Hands-free operation

6. **General Help**
   - Feature explanations
   - How-to guides
   - Command reference

### Multi-Language Support

- **Primary Languages**: English, Hindi
- **Regional Languages**: Punjabi, Marathi, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Odia
- **Auto-Translation**: Queries in any language are translated to English/Hindi for Lex, then responses are translated back

### Voice Interface

- **Voice Input**: Speak queries naturally
- **Voice Output**: Hear responses in your language
- **Hands-Free**: Complete voice-driven interaction
- **Speed Control**: Adjust playback speed (0.5x - 2.0x)

## Architecture

### Components

```
User → Voice Input → Transcription → Translation → AWS Lex
                                                      ↓
User ← Voice Output ← Translation ← Response ← Intent Recognition
```

### Services

1. **KisanMitraService** (`src/features/i18n/kisan-mitra.service.ts`)
   - Main service orchestrating the conversation flow
   - Handles transcription, translation, Lex interaction
   - Manages conversation logging and history

2. **AWS Lex Bot** (Cloud)
   - Intent recognition and slot filling
   - Conversation management
   - Context preservation

3. **TranslationService** (Existing)
   - Translates queries to English/Hindi
   - Translates responses back to user's language

4. **VoiceService** (Existing)
   - Speech-to-text (AWS Transcribe)
   - Text-to-speech (AWS Polly)

### Data Flow

1. User speaks query in local language
2. Audio transcribed to text (VoiceService)
3. Text translated to English if needed (TranslationService)
4. Query sent to AWS Lex for intent recognition
5. Lex returns response with intent and slots
6. Response translated back to user's language
7. Response synthesized to speech (VoiceService)
8. Conversation logged to MongoDB

## AWS Lex Bot Configuration

### Intents

| Intent | Purpose | Example Utterances |
|--------|---------|-------------------|
| GetCropPrice | Get crop prices | "What is the price of tomato?" |
| GetWeather | Get weather info | "What is the weather today?" |
| GetFarmingAdvice | Get farming tips | "How do I grow wheat?" |
| CreateListing | Guide listing creation | "I want to sell rice" |
| NavigateApp | Navigate to screens | "Go to my listings" |
| HelpIntent | General help | "What can you do?" |
| FallbackIntent | Handle unknown queries | (any unrecognized input) |

### Slot Types

- **CropType**: Tomato, Wheat, Rice, Potato, Onion, etc. (500+ crops)
- **FarmingTopic**: Planting, Watering, Fertilizer, Pest Control, Harvesting
- **ScreenName**: Home, My Listings, Search, Messages, Profile, Settings
- **Unit**: Kilogram, Quintal, Ton, Bag

### Locales

- `en_IN` - English (India)
- `hi_IN` - Hindi (India)

## API Endpoints

### POST /api/kisan-mitra/query

Send a query to Kisan Mitra.

**Request Body:**
```json
{
  "userId": "user-123",
  "sessionId": "session-456",  // optional
  "query": "What is the price of tomato?",
  "language": "en",
  "audioInput": "base64-encoded-audio"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "text": "The current market price for tomato is ₹30 per kg.",
  "audioUrl": "https://s3.../audio.mp3",
  "intent": "GetCropPrice",
  "confidence": 0.95,
  "slots": {
    "crop": "tomato"
  },
  "sessionId": "session-456"
}
```

### GET /api/kisan-mitra/history/:userId

Get conversation history for a user.

**Query Parameters:**
- `limit` (optional): Number of conversations to return (default: 10, max: 50)

**Response:**
```json
{
  "success": true,
  "conversations": [
    {
      "userId": "user-123",
      "sessionId": "session-456",
      "query": "What is the price of tomato?",
      "response": "The current price is ₹30 per kg.",
      "intent": "GetCropPrice",
      "confidence": 0.95,
      "language": "en",
      "timestamp": "2026-03-01T10:30:00Z"
    }
  ],
  "count": 1
}
```

### DELETE /api/kisan-mitra/session/:sessionId

Clear a conversation session.

**Response:**
```json
{
  "success": true,
  "message": "Session cleared successfully"
}
```

### GET /api/kisan-mitra/stats

Get usage statistics.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalQueries": 1250,
    "uniqueUsers": 450,
    "topIntents": [
      { "intent": "GetCropPrice", "count": 500 },
      { "intent": "GetWeather", "count": 300 },
      { "intent": "GetFarmingAdvice", "count": 250 }
    ],
    "averageConfidence": 0.87
  }
}
```

### GET /api/kisan-mitra/health

Health check endpoint.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "botConfigured": true,
  "message": "Kisan Mitra is ready"
}
```

## Setup Instructions

### 1. AWS Lex Bot Setup

Follow the detailed guide in `docs/aws/LEX-BOT-SETUP.md` to:
1. Create the Lex bot in AWS Console
2. Define intents and utterances
3. Configure slot types
4. Set up bot aliases (dev, staging, prod)
5. Test the bot

### 2. Environment Configuration

Add to `.env`:

```bash
# AWS Lex Configuration
LEX_BOT_ID=your_bot_id_here
LEX_BOT_ALIAS_ID=your_alias_id_here
LEX_REGION=ap-south-1

# MongoDB (for conversation logging)
MONGODB_URI=mongodb://localhost:27017/bharat_mandi

# AWS Credentials (if not using IAM roles)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
```

### 3. Install Dependencies

```bash
npm install @aws-sdk/client-lex-runtime-v2
```

### 4. Start the Server

```bash
npm run dev
```

### 5. Test the API

```bash
# Health check
curl http://localhost:3000/api/kisan-mitra/health

# Send a query
curl -X POST http://localhost:3000/api/kisan-mitra/query \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "query": "What is the price of tomato?",
    "language": "en"
  }'
```

## Usage Examples

### Text Query (English)

```javascript
const response = await fetch('/api/kisan-mitra/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    query: 'What is the price of tomato?',
    language: 'en'
  })
});

const data = await response.json();
console.log(data.text); // "The current price for tomato is ₹30 per kg."
```

### Text Query (Hindi)

```javascript
const response = await fetch('/api/kisan-mitra/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    query: 'टमाटर का भाव क्या है?',
    language: 'hi'
  })
});

const data = await response.json();
console.log(data.text); // "टमाटर की वर्तमान कीमत ₹30 प्रति किलो है।"
console.log(data.audioUrl); // URL to Hindi audio response
```

### Voice Query

```javascript
// Record audio from microphone
const audioBlob = await recordAudio();
const audioBase64 = await blobToBase64(audioBlob);

const response = await fetch('/api/kisan-mitra/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    audioInput: audioBase64,
    language: 'hi'
  })
});

const data = await response.json();
// Play audio response
playAudio(data.audioUrl);
```

### Follow-up Questions

```javascript
// First question
const response1 = await fetch('/api/kisan-mitra/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    query: 'What is the price of tomato?',
    language: 'en'
  })
});

const data1 = await response1.json();
const sessionId = data1.sessionId;

// Follow-up question (context maintained)
const response2 = await fetch('/api/kisan-mitra/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-123',
    sessionId: sessionId,  // Same session
    query: 'What about potato?',
    language: 'en'
  })
});

const data2 = await response2.json();
console.log(data2.text); // "The current price for potato is ₹25 per kg."
```

## Performance

### Response Times

- **Text Query**: < 3 seconds (target)
- **Voice Query**: < 5 seconds (includes transcription + processing + synthesis)
- **Cached Responses**: < 1 second

### Caching Strategy

- Translation caching via TranslationService
- TTS audio caching via VoiceService
- Lex responses not cached (dynamic data)

### Rate Limits

- 30 requests/minute per user (recommended)
- AWS Lex: 10,000 requests/month free tier
- AWS Transcribe: 60 minutes/month free tier
- AWS Polly: 5 million characters/month free tier

## Monitoring

### Key Metrics

- **Total Queries**: Number of queries processed
- **Unique Users**: Number of active users
- **Top Intents**: Most frequently used intents
- **Average Confidence**: Intent recognition accuracy
- **Response Time**: End-to-end latency
- **Error Rate**: Failed queries percentage

### Logging

All conversations are logged to MongoDB:
- Query text
- Response text
- Intent and confidence
- Language
- Timestamp
- Session ID

### Privacy

- Conversation data deleted after session TTL (24 hours)
- Users can delete their history
- Audio files deleted after transcription
- No PII stored in logs

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Bot not configured | Missing LEX_BOT_ID or LEX_BOT_ALIAS_ID | Set environment variables |
| Transcription failed | Invalid audio format | Use supported formats (WAV, MP3, OGG) |
| Translation failed | Unsupported language | Use supported languages |
| Lex unavailable | AWS service down | Retry with exponential backoff |
| Intent not recognized | Unclear query | Provide fallback response |

### Graceful Degradation

1. If transcription fails → Ask user to type
2. If translation fails → Use original language
3. If Lex fails → Provide generic help message
4. If TTS fails → Show text response only

## Future Enhancements

### Phase 1 (Current)
- ✅ Basic intent recognition
- ✅ Multi-language support
- ✅ Voice input/output
- ✅ Conversation logging

### Phase 2 (Next)
- [ ] Database integration for crop prices
- [ ] Weather API integration
- [ ] Farming tips knowledge base
- [ ] Listing creation workflow

### Phase 3 (Future)
- [ ] Context-aware responses
- [ ] Personalized recommendations
- [ ] Learning from user feedback
- [ ] Offline mode (limited)

### Phase 4 (Advanced)
- [ ] Multi-turn conversations
- [ ] Proactive suggestions
- [ ] Voice biometrics
- [ ] Regional dialect support

## Testing

### Unit Tests

```bash
npm test src/features/i18n/kisan-mitra.service.test.ts
```

### Integration Tests

```bash
npm test src/features/i18n/kisan-mitra.routes.test.ts
```

### Manual Testing

1. Test each intent with sample utterances
2. Test in multiple languages
3. Test voice input/output
4. Test follow-up questions
5. Test error scenarios

## Troubleshooting

### Bot not responding

1. Check LEX_BOT_ID and LEX_BOT_ALIAS_ID
2. Verify AWS credentials
3. Check CloudWatch logs
4. Test bot in AWS Console

### Poor intent recognition

1. Add more sample utterances
2. Review slot configurations
3. Check conversation logs
4. Retrain bot with user queries

### Slow responses

1. Check AWS service status
2. Optimize translation caching
3. Use batch operations
4. Implement request coalescing

## References

- [AWS Lex Documentation](https://docs.aws.amazon.com/lexv2/latest/dg/what-is.html)
- [Lex Bot Setup Guide](../aws/LEX-BOT-SETUP.md)
- [Voice Service Documentation](./VOICE-UI-COMPONENTS.md)
- [Translation Service Documentation](./TRANSLATION-SERVICE.md)

---

**Status**: ✅ Implemented (Tasks 23 & 24 complete)
**Last Updated**: 2026-03-01
**Related Tasks**: Tasks 23-29 - Kisan Mitra Implementation
