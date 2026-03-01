# Kisan Mitra - AI Voice Assistant

## Overview

Kisan Mitra is an AI-powered voice assistant for farmers, providing conversational support in 11 Indian languages. It helps farmers with crop prices, weather information, farming advice, and app navigation through natural language conversations.

## Documentation Structure

### 📚 Core Documentation

1. **[MULTILINGUAL-SUPPORT.md](./MULTILINGUAL-SUPPORT.md)**
   - How multi-language translation works
   - Translation flow (User Language → English → Lex → English → User Language)
   - Technical implementation details
   - Advantages and considerations

2. **[LANGUAGE-SUPPORT.md](./LANGUAGE-SUPPORT.md)**
   - Complete language support matrix
   - Text input vs voice input capabilities
   - AWS Transcribe and Polly limitations
   - Troubleshooting for each language
   - Best practices and workarounds

3. **[VOICE-INPUT.md](./VOICE-INPUT.md)**
   - Voice input functionality guide
   - VoiceInputButton component usage
   - Recording, transcription, and auto-send
   - Browser compatibility and troubleshooting

4. **[PERFORMANCE.md](./PERFORMANCE.md)**
   - Audio generation performance optimization
   - Async processing and caching strategies
   - Performance metrics and improvements
   - 50-85% faster response times

5. **[AUDIO-FIX.md](./AUDIO-FIX.md)**
   - Audio-text mismatch bug fix
   - Double translation issue explanation
   - Cache key mismatch resolution
   - Testing and verification

## Quick Links

### AWS Setup Guides
- [AWS Lex Bot Setup](../../aws/LEX-BOT-SETUP-QUICKSTART.md)
- [AWS Lex Permissions](../../aws/ADD-LEX-PERMISSIONS.md)
- [Troubleshooting Lex 404](../../aws/TROUBLESHOOT-LEX-404.md)
- [AWS Region Decision](../../aws/REGION-DECISION.md)

### Related Features
- [Translation Service](../TRANSLATION-QUICK-START.md)
- [Voice Interface](../VOICE-POC-INTEGRATION.md)
- [i18n System](../i18n/)

### Specifications
- [Requirements](./../../../.kiro/specs/features/multi-language-support/requirements.md)
- [Design](./../../../.kiro/specs/features/multi-language-support/design.md)
- [Tasks](./../../../.kiro/specs/features/multi-language-support/tasks.md)

## Features

### ✅ Implemented

- **Multi-Language Support**: 11 Indian languages (English, Hindi, Punjabi, Marathi, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Odia)
- **Voice Input**: Speech-to-text using AWS Transcribe
- **Voice Output**: Text-to-speech using AWS Polly
- **Translation**: Automatic translation using AWS Translate
- **Conversational AI**: AWS Lex for intent recognition
- **Audio Caching**: Local and S3-based caching for performance
- **Async Processing**: Non-blocking audio generation
- **Mock Mode**: Testing without AWS Lex configuration

### 🚧 In Progress

- Additional AWS Lex intents
- Hindi locale support in Lex
- Custom terminology for agricultural terms

### 📋 Planned

- Offline voice support
- Custom NLU models for regional languages
- Voice command shortcuts
- Conversation history

## Supported Languages

| Language | Code | Text Input | Voice Input | Voice Output | Native Support |
|----------|------|------------|-------------|--------------|----------------|
| English | en | ✅ | ✅ | ✅ | Full |
| Hindi | hi | ✅ | ✅ | ✅ | Full |
| Tamil | ta | ✅ | ✅ | ✅ | Partial |
| Telugu | te | ✅ | ✅ | ✅ | Partial |
| Punjabi | pa | ✅ | ⚠️ | ✅ | Via Translation |
| Marathi | mr | ✅ | ⚠️ | ✅ | Via Translation |
| Bengali | bn | ✅ | ⚠️ | ✅ | Via Translation |
| Gujarati | gu | ✅ | ⚠️ | ✅ | Via Translation |
| Kannada | kn | ✅ | ⚠️ | ✅ | Via Translation |
| Malayalam | ml | ✅ | ⚠️ | ✅ | Via Translation |
| Odia | or | ✅ | ⚠️ | ✅ | Via Translation |

**Legend**:
- ✅ Fully Supported
- ⚠️ Fallback to English (speak in English, get response in selected language)

## Architecture

### High-Level Flow

```
User Query (Any Language)
    ↓
[Voice Input] → Transcribe to Text
    ↓
[Translation] → Translate to English
    ↓
[AWS Lex] → Process Intent & Generate Response
    ↓
[Translation] → Translate back to User Language
    ↓
[Voice Output] → Generate Audio (Async)
    ↓
Response (Text + Audio)
```

### Key Components

1. **Kisan Mitra Service** (`src/features/i18n/kisan-mitra.service.ts`)
   - Main orchestration service
   - Handles translation flow
   - Manages AWS Lex integration

2. **Voice Service** (`src/features/i18n/voice.service.ts`)
   - Speech-to-text (AWS Transcribe)
   - Text-to-speech (AWS Polly)
   - Audio caching

3. **Translation Service** (`src/features/i18n/translation.service.ts`)
   - Text translation (AWS Translate)
   - Language detection
   - Translation caching

4. **Frontend** (`public/kisan-mitra-test.html`)
   - Chat interface
   - Voice input button
   - Audio playback
   - Language selector

## Getting Started

### Prerequisites

1. **AWS Account** with services enabled:
   - AWS Lex V2
   - AWS Transcribe
   - AWS Polly
   - AWS Translate
   - S3 (for audio storage)

2. **Environment Variables** (`.env`):
   ```env
   AWS_REGION=ap-southeast-2
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   LEX_BOT_ID=your_bot_id
   LEX_BOT_ALIAS_ID=your_alias_id
   S3_AUDIO_BUCKET=your_bucket_name
   ```

3. **IAM Permissions**:
   - `AmazonLexRunBotsOnly`
   - `AmazonTranscribeFullAccess`
   - `AmazonPollyFullAccess`
   - `TranslateReadOnly`
   - S3 read/write for audio bucket

### Quick Start

1. **Setup AWS Lex Bot**:
   ```bash
   # Follow the guide
   cat docs/aws/LEX-BOT-SETUP-QUICKSTART.md
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your AWS credentials
   ```

3. **Start Server**:
   ```bash
   npm run dev
   ```

4. **Test Kisan Mitra**:
   ```
   http://localhost:3000/kisan-mitra-test.html
   ```

5. **Try Different Languages**:
   - Select language from dropdown
   - Type or speak your question
   - Get response in selected language

### Testing

**Test Phrases**:
- English: "What is the price of tomato?"
- Hindi: "टमाटर का भाव क्या है?"
- Marathi: "टोमॅटोची किंमत काय आहे?"
- Tamil: "தக்காளி விலை என்ன?"

**Expected Behavior**:
- Text response appears in 4-6 seconds
- Audio plays (if cached, 1-2 seconds)
- Intent recognized correctly
- Response relevant to query

## Performance

### Metrics

| Metric | Before Optimization | After Optimization | Improvement |
|--------|-------------------|-------------------|-------------|
| Text Response | 8-37s | 4-6s | 50-85% faster |
| Cached Audio | 8-37s | 1-2s | 90-95% faster |
| Audio Generation | Blocking | Async | Non-blocking |

### Optimization Strategies

1. **Async Audio Generation**: Don't wait for audio before returning text
2. **Smart Timeout**: Wait max 2 seconds for audio
3. **Multi-Level Caching**: Local SQLite + S3 + In-memory
4. **Parallel Processing**: Translation and logging run in parallel
5. **Cache Warming**: Preload common phrases

## Troubleshooting

### Common Issues

1. **"ResourceNotFoundException" from AWS Lex**
   - Bot not built → Build the bot in AWS Console
   - Alias not associated → Associate alias with a version
   - See: [TROUBLESHOOT-LEX-404.md](../../aws/TROUBLESHOOT-LEX-404.md)

2. **Audio and text don't match**
   - Clear audio cache: `node scripts/clear-audio-cache.js`
   - Restart server
   - See: [AUDIO-FIX.md](./AUDIO-FIX.md)

3. **Marathi voice input not working**
   - Expected behavior (AWS Transcribe doesn't support Marathi)
   - Use text input or speak in English
   - See: [LANGUAGE-SUPPORT.md](./LANGUAGE-SUPPORT.md)

4. **Slow audio generation**
   - Check AWS region (use ap-southeast-2)
   - Verify caching is working
   - See: [PERFORMANCE.md](./PERFORMANCE.md)

### Debug Commands

```bash
# Test AWS Lex connection
node scripts/test-lex-connection.js

# Clear audio cache
node scripts/clear-audio-cache.js

# Check server logs
npm run dev
# Look for [KisanMitra] and [VoiceService] logs
```

## API Reference

### POST /api/kisan-mitra/query

Send a query to Kisan Mitra.

**Request**:
```json
{
  "userId": "user-123",
  "sessionId": "session-456",
  "query": "टमाटर का भाव क्या है?",
  "language": "hi"
}
```

**Response**:
```json
{
  "success": true,
  "text": "टमाटर का वर्तमान बाजार मूल्य ₹35 प्रति किलो है।",
  "audioUrl": "https://s3.../audio.mp3",
  "intent": "GetCropPrice",
  "confidence": 0.95,
  "slots": { "crop": "tomato" },
  "sessionId": "session-456"
}
```

### POST /api/kisan-mitra/generate-audio

Generate audio for text (on-demand).

**Request**:
```json
{
  "text": "टमाटर का वर्तमान बाजार मूल्य ₹35 प्रति किलो है।",
  "language": "hi"
}
```

**Response**:
```json
{
  "success": true,
  "audioUrl": "https://s3.../audio.mp3"
}
```

## Contributing

### Adding New Intents

1. Configure intent in AWS Lex Console
2. Add sample utterances
3. Define slots if needed
4. Build and test bot
5. Update documentation

### Adding New Languages

1. Check AWS service support
2. Add language code to `LOCALE_ID_MAP`
3. Add voice mapping to `VOICE_ID_MAP`
4. Test translation flow
5. Update language support matrix

### Improving Translations

1. Test with native speakers
2. Report issues via translation feedback
3. Add custom terminology for agricultural terms
4. Update Regional Crop Database

## Resources

### AWS Documentation
- [AWS Lex V2](https://docs.aws.amazon.com/lexv2/)
- [AWS Transcribe](https://docs.aws.amazon.com/transcribe/)
- [AWS Polly](https://docs.aws.amazon.com/polly/)
- [AWS Translate](https://docs.aws.amazon.com/translate/)

### Internal Documentation
- [Project README](../../../README.md)
- [Architecture](../../architecture/)
- [Database](../../database/)
- [Testing](../../testing/)

## Support

For issues or questions:
1. Check troubleshooting guides above
2. Review AWS service status
3. Check server logs for errors
4. Consult specification documents

## License

Part of Bharat Mandi project.
