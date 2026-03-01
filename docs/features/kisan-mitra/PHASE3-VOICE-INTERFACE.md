# Phase 3: Voice Interface Implementation Guide

**Status:** Ready to Start  
**Duration:** Weeks 5-6  
**Dependencies:** Phase 1 & 2 Complete ✓

## Overview

Phase 3 implements comprehensive voice interface capabilities using AWS Transcribe (speech-to-text), AWS Polly (text-to-speech), and voice command recognition. This enables farmers and buyers to interact with the app using voice in their preferred language.

## AWS Services Required

### 1. AWS Transcribe
- **Purpose:** Convert speech to text
- **Languages:** All 11 supported languages
- **IAM Permissions:** `transcribe:StartTranscriptionJob`, `transcribe:GetTranscriptionJob`
- **S3 Bucket:** Required for temporary audio storage

### 2. AWS Polly
- **Purpose:** Convert text to speech
- **Languages:** All 11 supported languages
- **IAM Permissions:** `polly:SynthesizeSpeech`
- **Voice IDs:** Map each language to appropriate voice

### 3. S3 Bucket
- **Purpose:** Temporary audio file storage
- **Lifecycle:** Auto-delete after 24 hours
- **Encryption:** Server-side encryption enabled

## Implementation Tasks

### Task 16: Voice Service with AWS Transcribe (Week 5)

**Files to Create:**
- `src/features/i18n/voice.service.ts` - Main voice service
- `src/features/i18n/__tests__/voice.service.test.ts` - Unit tests
- `src/features/i18n/__tests__/voice.service.pbt.test.ts` - Property tests

**Key Methods:**
```typescript
class VoiceService {
  // Upload audio to S3 and transcribe
  async transcribeAudio(audioBlob: Blob, language?: string): Promise<TranscriptionResult>
  
  // Synthesize text to speech
  async synthesizeSpeech(text: string, language: string, options?: TTSOptions): Promise<AudioURL>
  
  // Detect language from audio
  async detectLanguageFromAudio(audioBlob: Blob): Promise<string>
  
  // Cleanup temporary files
  async cleanupAudioFiles(jobId: string): Promise<void>
}
```

**Implementation Steps:**
1. Set up AWS SDK clients (Transcribe, S3)
2. Implement audio upload to S3
3. Start transcription job and poll for completion
4. Parse transcription results
5. Implement automatic cleanup
6. Add language detection integration
7. Write comprehensive tests

**Testing:**
- Test with sample audio files in multiple languages
- Test error handling (invalid format, timeout)
- Test cleanup functionality
- Property test: Language consistency

### Task 17: Text-to-Speech with AWS Polly (Week 5)

**Voice ID Mapping:**
```typescript
const VOICE_IDS = {
  'en': 'Joanna',      // English (US)
  'hi': 'Aditi',       // Hindi
  'pa': 'Aditi',       // Punjabi (use Hindi voice)
  'mr': 'Aditi',       // Marathi (use Hindi voice)
  'ta': 'Aditi',       // Tamil (use Hindi voice)
  'te': 'Aditi',       // Telugu (use Hindi voice)
  'bn': 'Aditi',       // Bengali (use Hindi voice)
  'gu': 'Aditi',       // Gujarati (use Hindi voice)
  'kn': 'Aditi',       // Kannada (use Hindi voice)
  'ml': 'Aditi',       // Malayalam (use Hindi voice)
  'or': 'Aditi'        // Odia (use Hindi voice)
};
```

**Implementation Steps:**
1. Set up AWS Polly client
2. Implement speech synthesis
3. Upload synthesized audio to S3
4. Implement TTS caching (7-day TTL)
5. Add SSML support for prosody control
6. Write comprehensive tests

**Caching Strategy:**
- Cache key: `tts:${hash(text + language + speed)}`
- Store audio URL in Redis
- TTL: 7 days
- Preload common phrases

### Task 18: Audio Caching (Week 5)

**SQLite Schema:**
```sql
CREATE TABLE audio_cache (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  language TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  audio_data BLOB,
  created_at INTEGER NOT NULL,
  last_accessed INTEGER NOT NULL,
  access_count INTEGER DEFAULT 0
);

CREATE INDEX idx_audio_cache_language ON audio_cache(language);
CREATE INDEX idx_audio_cache_accessed ON audio_cache(last_accessed);
```

**LRU Eviction:**
- Max cache size: 50MB
- Evict least recently accessed when full
- Keep frequently accessed items

### Task 19: Voice Input UI Components (Week 6)

**Components to Create:**
- `VoiceInputButton.tsx` - Microphone button with recording indicator
- `AudioWaveform.tsx` - Visual feedback during recording
- `TranscriptionDisplay.tsx` - Show transcription result

**Integration Points:**
1. Listing creation (title, description, price, quantity)
2. Search bar (voice search)
3. Chat messages (when chat feature is implemented)

**UI/UX Considerations:**
- Show recording indicator (red dot, waveform)
- Display transcription in real-time if possible
- Allow editing before submission
- Show language detected
- Provide fallback to text input

### Task 20: Voice Output Controls (Week 6)

**Components to Create:**
- `AudioPlayer.tsx` - Play/pause, speed control
- `ReadAloudButton.tsx` - Speaker icon for content
- `TextHighlighter.tsx` - Highlight text during playback

**Features:**
- Speed control: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x
- Text highlighting synchronized with audio
- Auto-read error messages (with opt-out)

**Integration Points:**
1. Notifications - "Read Aloud" button
2. Listing details - Read title, price, description
3. Error messages - Auto-read with option to disable

### Task 21: Voice Commands (Week 6)

**Command Patterns:**
```typescript
const VOICE_COMMANDS = {
  navigation: {
    'home': () => navigate('/'),
    'my listings': () => navigate('/my-listings'),
    'search': () => navigate('/search'),
    'messages': () => navigate('/messages'),
    'profile': () => navigate('/profile'),
    'settings': () => navigate('/settings')
  },
  actions: {
    'create listing': () => navigate('/create-listing'),
    'view orders': () => navigate('/orders'),
    'check prices': () => navigate('/market-prices')
  }
};
```

**Implementation:**
- Fuzzy matching for command recognition
- Disambiguation UI when multiple matches
- Voice feedback for unrecognized commands
- Interactive tutorial for available commands
- Performance target: < 500ms navigation

## Environment Variables

Add to `.env`:
```bash
# AWS Transcribe
AWS_TRANSCRIBE_BUCKET=bharat-mandi-audio-temp
AWS_TRANSCRIBE_REGION=ap-south-1

# AWS Polly
AWS_POLLY_REGION=ap-south-1

# Audio Settings
AUDIO_MAX_DURATION=30  # seconds
AUDIO_SAMPLE_RATE=16000
AUDIO_FORMAT=wav

# Cache Settings
TTS_CACHE_TTL=604800  # 7 days in seconds
AUDIO_CACHE_MAX_SIZE=52428800  # 50MB in bytes
```

## Testing Strategy

### Unit Tests
- Voice service methods
- Audio upload and cleanup
- TTS synthesis and caching
- Command recognition

### Integration Tests
- AWS Transcribe with sample audio
- AWS Polly with sample text
- S3 upload and cleanup
- Cache operations

### E2E Tests
- Voice input in listing creation
- Voice search
- Voice output playback
- Voice command navigation

### Property Tests
- **Property 11:** Voice transcription language consistency
- **Property 12:** TTS caching determinism
- **Property 23:** Voice command navigation performance

## Performance Targets

- Voice transcription: < 3s for 30s audio
- TTS synthesis: < 1s
- Audio playback start: < 200ms
- Voice command navigation: < 500ms
- Cache retrieval: < 50ms

## Security Considerations

1. **Audio Privacy:**
   - Delete audio files after transcription
   - No long-term storage of voice data
   - Encrypt audio in transit (TLS 1.3)

2. **S3 Security:**
   - Private bucket with IAM-only access
   - Lifecycle policy: Delete after 24 hours
   - Server-side encryption enabled

3. **Rate Limiting:**
   - Voice transcription: 10 req/min per user
   - Voice synthesis: 20 req/min per user

## Cost Optimization

1. **Caching:**
   - Cache TTS audio for 7 days
   - Preload common phrases
   - Target 80%+ cache hit rate

2. **Audio Compression:**
   - Use appropriate sample rate (16kHz)
   - Compress audio before upload
   - Use efficient audio formats

3. **Batch Processing:**
   - Batch TTS requests when possible
   - Preload audio during idle time

## Next Steps

1. **Start with Task 16:** Implement VoiceService with AWS Transcribe
2. **Test thoroughly:** Use sample audio files in multiple languages
3. **Add Task 17:** Implement TTS with AWS Polly
4. **Build UI:** Create voice input and output components
5. **Integrate:** Add voice features to existing screens
6. **Test E2E:** Verify complete voice workflows

## Success Criteria

Phase 3 will be complete when:
- ✓ Voice transcription works for all 11 languages
- ✓ Text-to-speech works for all 11 languages
- ✓ Voice input integrated in listing creation and search
- ✓ Voice output available for notifications and listings
- ✓ Voice commands navigate correctly
- ✓ Audio caching achieves 80%+ hit rate
- ✓ Performance targets met
- ✓ All tests pass (unit, integration, E2E)

## Resources

- [AWS Transcribe Documentation](https://docs.aws.amazon.com/transcribe/)
- [AWS Polly Documentation](https://docs.aws.amazon.com/polly/)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder)

---

**Ready to start Phase 3!** Begin with Task 16 (VoiceService implementation) and work through the tasks sequentially.
