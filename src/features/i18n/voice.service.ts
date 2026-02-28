/**
 * Voice Service
 * 
 * Handles speech-to-text (AWS Transcribe) and text-to-speech (AWS Polly) operations
 * for multi-language voice interface support.
 * 
 * Features:
 * - Audio transcription with language detection
 * - Speech synthesis with voice selection
 * - Audio caching for offline playback
 * - S3 integration for temporary audio storage
 * 
 * Requirements: 6.1, 6.6, 6.13, 7.1, 7.4, 7.5, 7.12, 7.13
 */

import { 
  TranscribeClient, 
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  TranscriptionJob,
  LanguageCode as TranscribeLanguageCode
} from '@aws-sdk/client-transcribe';
import { 
  PollyClient,
  SynthesizeSpeechCommand,
  VoiceId,
  Engine,
  OutputFormat,
  LanguageCode as PollyLanguageCode
} from '@aws-sdk/client-polly';
import { 
  S3Client, 
  PutObjectCommand, 
  DeleteObjectCommand,
  GetObjectCommand 
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { audioCacheService, AudioCacheService } from './audio-cache.service';
import { translationService } from './translation.service';

/**
 * Supported language codes for voice operations
 */
export type VoiceLanguageCode = 
  | 'en' | 'hi' | 'pa' | 'mr' | 'ta' 
  | 'te' | 'bn' | 'gu' | 'kn' | 'ml' | 'or';

/**
 * Voice transcription request
 */
export interface TranscriptionRequest {
  audioBuffer: Buffer;
  audioFormat: 'mp3' | 'wav' | 'flac' | 'ogg';
  language?: VoiceLanguageCode;
  sampleRate?: number;
}

/**
 * Voice transcription response
 */
export interface TranscriptionResponse {
  text: string;
  detectedLanguage?: VoiceLanguageCode;
  confidence?: number;
  success: boolean;
  error?: string;
}

/**
 * Text-to-speech request
 */
export interface SynthesisRequest {
  text: string;
  language: VoiceLanguageCode;
  speed?: number; // 0.5 to 2.0, default 1.0
  ssml?: boolean; // Whether text contains SSML markup
}

/**
 * Text-to-speech response
 */
export interface SynthesisResponse {
  audioUrl: string;
  audioBuffer?: Buffer;
  duration?: number;
  success: boolean;
  error?: string;
}

/**
 * Voice Service Configuration
 */
interface VoiceServiceConfig {
  awsRegion: string;
  s3Bucket: string;
  transcribeClient: TranscribeClient;
  pollyClient: PollyClient;
  s3Client: S3Client;
  ttsCache: Map<string, string>; // Cache key -> S3 URL
  audioCache: AudioCacheService; // Local SQLite cache for offline playback
}

/**
 * Language code mapping: our codes to AWS Transcribe codes
 */
const LANGUAGE_CODE_MAP: Record<VoiceLanguageCode, TranscribeLanguageCode> = {
  'en': 'en-IN' as TranscribeLanguageCode,
  'hi': 'hi-IN' as TranscribeLanguageCode,
  'pa': 'en-IN' as TranscribeLanguageCode, // Punjabi not supported, fallback to English
  'mr': 'en-IN' as TranscribeLanguageCode, // Marathi not supported, fallback to English
  'ta': 'ta-IN' as TranscribeLanguageCode,
  'te': 'te-IN' as TranscribeLanguageCode,
  'bn': 'en-IN' as TranscribeLanguageCode, // Bengali not supported, fallback to English
  'gu': 'en-IN' as TranscribeLanguageCode, // Gujarati not supported, fallback to English
  'kn': 'en-IN' as TranscribeLanguageCode, // Kannada not supported, fallback to English
  'ml': 'en-IN' as TranscribeLanguageCode, // Malayalam not supported, fallback to English
  'or': 'en-IN' as TranscribeLanguageCode  // Odia not supported, fallback to English
};

/**
 * Reverse mapping: AWS Transcribe codes to our codes
 */
const REVERSE_LANGUAGE_CODE_MAP: Record<string, VoiceLanguageCode> = {
  'en-IN': 'en',
  'hi-IN': 'hi',
  'ta-IN': 'ta',
  'te-IN': 'te'
};

/**
 * Voice ID mapping for AWS Polly
 * Maps our language codes to AWS Polly voice IDs
 * 
 * IMPORTANT: AWS Polly voices can only read text in their native script.
 * - Hindi (Aditi): Can read Devanagari script only
 * - English (Raveena): Can read Latin script only
 * 
 * For all non-Hindi Indian languages, we use English voice with English text
 * since Polly cannot read regional scripts (Gujarati, Tamil, Telugu, etc.)
 */
const VOICE_ID_MAP: Record<VoiceLanguageCode, VoiceId> = {
  'en': 'Raveena' as VoiceId,    // Indian English female
  'hi': 'Aditi' as VoiceId,      // Hindi female - ONLY language with native support
  'pa': 'Raveena' as VoiceId,    // Punjabi - use English voice with English text
  'mr': 'Raveena' as VoiceId,    // Marathi - use English voice with English text
  'ta': 'Raveena' as VoiceId,    // Tamil - use English voice with English text
  'te': 'Raveena' as VoiceId,    // Telugu - use English voice with English text
  'bn': 'Raveena' as VoiceId,    // Bengali - use English voice with English text
  'gu': 'Raveena' as VoiceId,    // Gujarati - use English voice with English text
  'kn': 'Raveena' as VoiceId,    // Kannada - use English voice with English text
  'ml': 'Raveena' as VoiceId,    // Malayalam - use English voice with English text
  'or': 'Raveena' as VoiceId     // Odia - use English voice with English text
};

/**
 * Voice Service
 * 
 * Provides speech-to-text and text-to-speech capabilities using AWS services.
 */
export class VoiceService {
  private config: VoiceServiceConfig;

  constructor() {
    const awsRegion = process.env.AWS_REGION || 'ap-south-1';
    const s3Bucket = process.env.AWS_S3_VOICE_BUCKET || 'bharat-mandi-voice-temp';

    this.config = {
      awsRegion,
      s3Bucket,
      transcribeClient: new TranscribeClient({ region: awsRegion }),
      pollyClient: new PollyClient({ region: awsRegion }),
      s3Client: new S3Client({ region: awsRegion }),
      ttsCache: new Map(),
      audioCache: audioCacheService
    };
  }

  /**
   * Transcribe audio to text using AWS Transcribe
   * 
   * Requirements: 6.1, 6.6, 6.13
   * 
   * @param request - Transcription request with audio buffer and metadata
   * @returns Transcription response with text and detected language
   */
  async transcribeAudio(request: TranscriptionRequest): Promise<TranscriptionResponse> {
    try {
      // 1. Generate unique job name
      const jobName = `transcribe-${uuidv4()}`;
      const s3Key = `audio/${jobName}.${request.audioFormat}`;

      // 2. Upload audio to S3
      await this.uploadAudioToS3(request.audioBuffer, s3Key, request.audioFormat);

      // 3. Start transcription job
      const languageCode = request.language 
        ? LANGUAGE_CODE_MAP[request.language]
        : 'en-IN' as TranscribeLanguageCode;

      const startCommand = new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        LanguageCode: languageCode,
        MediaFormat: request.audioFormat,
        Media: {
          MediaFileUri: `s3://${this.config.s3Bucket}/${s3Key}`
        }
        // Note: Removed Settings.ShowSpeakerLabels and MaxSpeakerLabels
        // AWS Transcribe requires MaxSpeakerLabels >= 2 when ShowSpeakerLabels is true
        // For simple transcription, we don't need speaker labels
      });

      await this.config.transcribeClient.send(startCommand);

      // 4. Poll for completion
      const transcriptionResult = await this.pollTranscriptionJob(jobName);

      // 5. Clean up S3 audio file
      await this.deleteAudioFromS3(s3Key);

      // 6. Parse and return result
      if (transcriptionResult && transcriptionResult.Transcript) {
        const transcriptUri = transcriptionResult.Transcript.TranscriptFileUri;
        if (transcriptUri) {
          const transcriptText = await this.fetchTranscript(transcriptUri);
          const detectedLanguage = this.mapTranscribeLanguageCode(
            transcriptionResult.LanguageCode as string
          );

          return {
            text: transcriptText,
            detectedLanguage,
            confidence: 0.9, // AWS Transcribe doesn't provide overall confidence
            success: true
          };
        }
      }

      throw new Error('Transcription failed: No transcript available');

    } catch (error) {
      console.error('[VoiceService] Transcription error:', error);
      
      return {
        text: '',
        success: false,
        error: error instanceof Error ? error.message : 'Transcription failed'
      };
    }
  }

  /**
   * Upload audio buffer to S3
   * 
   * @param audioBuffer - Audio data
   * @param s3Key - S3 object key
   * @param format - Audio format
   */
  private async uploadAudioToS3(
    audioBuffer: Buffer, 
    s3Key: string, 
    format: string
  ): Promise<void> {
    const contentType = this.getContentType(format);

    const command = new PutObjectCommand({
      Bucket: this.config.s3Bucket,
      Key: s3Key,
      Body: audioBuffer,
      ContentType: contentType
    });

    await this.config.s3Client.send(command);
  }

  /**
   * Delete audio file from S3
   * 
   * Requirements: 19.3
   * 
   * @param s3Key - S3 object key
   */
  private async deleteAudioFromS3(s3Key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.s3Bucket,
        Key: s3Key
      });

      await this.config.s3Client.send(command);
    } catch (error) {
      console.error('[VoiceService] Failed to delete audio from S3:', error);
      // Non-fatal error, continue
    }
  }

  /**
   * Poll transcription job until completion
   * 
   * @param jobName - Transcription job name
   * @returns Transcription job result
   */
  private async pollTranscriptionJob(
    jobName: string, 
    maxAttempts: number = 60,
    intervalMs: number = 2000
  ): Promise<TranscriptionJob | null> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const command = new GetTranscriptionJobCommand({
        TranscriptionJobName: jobName
      });

      const response = await this.config.transcribeClient.send(command);
      const job = response.TranscriptionJob;

      if (!job) {
        throw new Error('Transcription job not found');
      }

      if (job.TranscriptionJobStatus === 'COMPLETED') {
        return job;
      }

      if (job.TranscriptionJobStatus === 'FAILED') {
        throw new Error(`Transcription failed: ${job.FailureReason}`);
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Transcription timeout: Job did not complete in time');
  }

  /**
   * Fetch transcript text from S3 URL
   * 
   * @param transcriptUri - S3 URI of transcript JSON
   * @returns Transcript text
   */
  private async fetchTranscript(transcriptUri: string): Promise<string> {
    try {
      const response = await fetch(transcriptUri);
      const data: any = await response.json();

      // AWS Transcribe transcript format
      if (data.results && data.results.transcripts && data.results.transcripts[0]) {
        return data.results.transcripts[0].transcript;
      }

      throw new Error('Invalid transcript format');
    } catch (error) {
      console.error('[VoiceService] Failed to fetch transcript:', error);
      throw error;
    }
  }

  /**
   * Map AWS Transcribe language code to our language code
   * 
   * @param transcribeCode - AWS Transcribe language code
   * @returns Our language code
   */
  private mapTranscribeLanguageCode(transcribeCode: string): VoiceLanguageCode {
    return REVERSE_LANGUAGE_CODE_MAP[transcribeCode] || 'en';
  }

  /**
   * Get content type for audio format
   * 
   * @param format - Audio format
   * @returns MIME type
   */
  private getContentType(format: string): string {
    const contentTypes: Record<string, string> = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'flac': 'audio/flac',
      'ogg': 'audio/ogg'
    };

    return contentTypes[format] || 'application/octet-stream';
  }

  /**
   * Synthesize speech from text using AWS Polly
   * 
   * Requirements: 7.1, 7.4, 7.5, 7.12, 7.13, 7.14
   * 
   * @param request - Synthesis request with text and language
   * @returns Synthesis response with audio URL
   */
  async synthesizeSpeech(request: SynthesisRequest): Promise<SynthesisResponse> {
    try {
      // 1. Translate text to target language if not English
      let textToSpeak = request.text;
      
      // Only use translated text for Hindi (which has native Polly support)
      // For all other languages, use English text with appropriate voice
      if (request.language === 'hi') {
        console.log(`[VoiceService] Translating text to Hindi`);
        const translationResult = await translationService.translateText({
          text: request.text,
          sourceLanguage: 'en',
          targetLanguage: 'hi'
        });
        
        if (translationResult.translatedText) {
          textToSpeak = translationResult.translatedText;
          console.log(`[VoiceService] Translated to Hindi: "${request.text}" -> "${textToSpeak}"`);
        } else {
          console.warn(`[VoiceService] Hindi translation failed, using original text`);
        }
      } else if (request.language !== 'en') {
        // For all other Indian languages, use English text
        // AWS Polly doesn't support reading non-native scripts
        console.log(`[VoiceService] Using English text for ${request.language} (no native script support in Polly)`);
        textToSpeak = request.text;
      }

      // 2. Generate cache key (include translated text)
      const cacheKey = this.generateTTSCacheKey(
        textToSpeak, 
        request.language, 
        request.speed || 1.0
      );

      // 3. Check local audio cache first (for offline support)
      const cachedAudio = this.config.audioCache.getCachedAudio(cacheKey);
      if (cachedAudio) {
        // Return cached audio as data URL for offline playback
        const base64Audio = cachedAudio.audioData.toString('base64');
        const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
        
        return {
          audioUrl,
          audioBuffer: cachedAudio.audioData,
          success: true
        };
      }

      // 4. Check in-memory cache (S3 URLs)
      const cachedUrl = this.config.ttsCache.get(cacheKey);
      if (cachedUrl) {
        return {
          audioUrl: cachedUrl,
          success: true
        };
      }

      // 5. Get voice ID for language
      const voiceId = VOICE_ID_MAP[request.language];

      // 6. Prepare text with SSML if speed adjustment needed
      let textToSynthesize = textToSpeak;
      let textType: 'text' | 'ssml' = 'text';

      if (request.ssml) {
        textType = 'ssml';
      } else if (request.speed && request.speed !== 1.0) {
        // Wrap in SSML for speed control
        const speedPercent = Math.round(request.speed * 100);
        textToSynthesize = `<speak><prosody rate="${speedPercent}%">${textToSpeak}</prosody></speak>`;
        textType = 'ssml';
      }

      // 7. Synthesize speech - try neural first, fallback to standard
      let response;
      try {
        const command = new SynthesizeSpeechCommand({
          Text: textToSynthesize,
          TextType: textType,
          VoiceId: voiceId,
          OutputFormat: 'mp3' as OutputFormat,
          Engine: 'neural' as Engine, // Try neural engine for better quality
          LanguageCode: this.getPollyLanguageCode(request.language)
        });

        response = await this.config.pollyClient.send(command);
      } catch (error: any) {
        // If neural engine not supported, fallback to standard engine
        if (error.message && error.message.includes('does not support the selected engine')) {
          console.log(`[VoiceService] Neural engine not supported for ${voiceId}, falling back to standard`);
          
          const standardCommand = new SynthesizeSpeechCommand({
            Text: textToSynthesize,
            TextType: textType,
            VoiceId: voiceId,
            OutputFormat: 'mp3' as OutputFormat,
            Engine: 'standard' as Engine, // Fallback to standard engine
            LanguageCode: this.getPollyLanguageCode(request.language)
          });

          response = await this.config.pollyClient.send(standardCommand);
        } else {
          throw error;
        }
      }

      if (!response.AudioStream) {
        throw new Error('No audio stream in response');
      }

      // 8. Convert stream to buffer
      const audioBuffer = await this.streamToBuffer(response.AudioStream);

      // 9. Store in local audio cache for offline playback
      await this.config.audioCache.storeCachedAudio(
        cacheKey,
        audioBuffer,
        request.language,
        textToSpeak, // Store translated text
        request.speed || 1.0
      );

      // 10. Upload to S3
      const s3Key = `tts/${cacheKey}.mp3`;
      await this.uploadAudioToS3(audioBuffer, s3Key, 'mp3');

      // 11. Generate S3 URL
      const audioUrl = `https://${this.config.s3Bucket}.s3.${this.config.awsRegion}.amazonaws.com/${s3Key}`;

      // 12. Cache the URL (7-day TTL handled by S3 lifecycle policy)
      this.config.ttsCache.set(cacheKey, audioUrl);

      return {
        audioUrl,
        audioBuffer,
        success: true
      };

    } catch (error) {
      console.error('[VoiceService] Speech synthesis error:', error);
      
      return {
        audioUrl: '',
        success: false,
        error: error instanceof Error ? error.message : 'Speech synthesis failed'
      };
    }
  }

  /**
   * Generate cache key for TTS
   * 
   * Requirements: 7.12, 7.13
   * 
   * @param text - Text to synthesize
   * @param language - Language code
   * @param speed - Speech speed
   * @returns Cache key
   */
  private generateTTSCacheKey(text: string, language: VoiceLanguageCode, speed: number): string {
    const data = `${text}|${language}|${speed}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get Polly language code from our language code
   * 
   * @param languageCode - Our language code
   * @returns Polly language code
   */
  private getPollyLanguageCode(languageCode: VoiceLanguageCode): PollyLanguageCode {
    const pollyLanguageCodes: Record<VoiceLanguageCode, PollyLanguageCode> = {
      'en': 'en-IN' as PollyLanguageCode,
      'hi': 'hi-IN' as PollyLanguageCode,
      'pa': 'en-IN' as PollyLanguageCode,
      'mr': 'en-IN' as PollyLanguageCode,
      'ta': 'en-IN' as PollyLanguageCode,
      'te': 'en-IN' as PollyLanguageCode,
      'bn': 'en-IN' as PollyLanguageCode,
      'gu': 'en-IN' as PollyLanguageCode,
      'kn': 'en-IN' as PollyLanguageCode,
      'ml': 'en-IN' as PollyLanguageCode,
      'or': 'en-IN' as PollyLanguageCode
    };

    return pollyLanguageCodes[languageCode];
  }

  /**
   * Convert readable stream to buffer
   * 
   * @param stream - Readable stream
   * @returns Buffer
   */
  private async streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  }

  /**
   * Clear TTS cache
   * 
   * @param cacheKey - Optional specific cache key to clear
   */
  clearTTSCache(cacheKey?: string): void {
    if (cacheKey) {
      this.config.ttsCache.delete(cacheKey);
    } else {
      this.config.ttsCache.clear();
    }
  }

  /**
   * Get TTS cache statistics
   * 
   * @returns Cache statistics
   */
  getTTSCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.config.ttsCache.size,
      keys: Array.from(this.config.ttsCache.keys())
    };
  }

  /**
   * Get audio cache statistics (local SQLite cache)
   * 
   * Requirements: 13.8
   * 
   * @returns Audio cache statistics
   */
  getAudioCacheStats() {
    return this.config.audioCache.getStats();
  }

  /**
   * Clear audio cache (local SQLite cache)
   * 
   * @param cacheKey - Optional specific cache key to clear
   */
  clearAudioCache(cacheKey?: string): void {
    if (cacheKey) {
      this.config.audioCache.deleteCachedAudio(cacheKey);
    } else {
      this.config.audioCache.clearCache();
    }
  }

  /**
   * Get cached audio by language
   * 
   * @param language - Language code
   * @returns Array of cached audio entries
   */
  getCachedAudioByLanguage(language: string) {
    return this.config.audioCache.getCachedAudioByLanguage(language);
  }

  /**
   * Preload common phrases for offline playback
   * 
   * Requirements: 12.6
   * 
   * @param language - Language code
   * @param phrases - Array of common phrases to preload
   */
  async preloadCommonPhrases(language: VoiceLanguageCode, phrases: string[]): Promise<void> {
    console.log(`[VoiceService] Preloading ${phrases.length} phrases for ${language}`);
    
    const preloadPromises = phrases.map(async (phrase) => {
      try {
        // Check if already cached
        const cacheKey = this.generateTTSCacheKey(phrase, language, 1.0);
        const cached = this.config.audioCache.getCachedAudio(cacheKey);
        
        if (cached) {
          return; // Already cached
        }
        
        // Synthesize and cache
        await this.synthesizeSpeech({
          text: phrase,
          language,
          speed: 1.0
        });
      } catch (error) {
        console.error(`[VoiceService] Failed to preload phrase: ${phrase}`, error);
      }
    });
    
    await Promise.all(preloadPromises);
    console.log(`[VoiceService] Preloading complete for ${language}`);
  }

  /**
   * Preload user's recent voice outputs
   * 
   * Requirements: 12.6
   * 
   * @param language - Language code
   * @param limit - Number of recent entries to preload (default 10)
   */
  async preloadRecentVoiceOutputs(language: VoiceLanguageCode, limit: number = 10): Promise<void> {
    try {
      const recentEntries = this.config.audioCache.getCachedAudioByLanguage(language);
      
      // Sort by last accessed (most recent first) and take top N
      const topEntries = recentEntries
        .sort((a, b) => b.lastAccessedAt.getTime() - a.lastAccessedAt.getTime())
        .slice(0, limit);
      
      console.log(`[VoiceService] Found ${topEntries.length} recent voice outputs for ${language}`);
      
      // These are already cached, so just log for monitoring
      for (const entry of topEntries) {
        console.log(`[VoiceService] Cached: "${entry.text.substring(0, 50)}..." (accessed ${entry.accessCount} times)`);
      }
    } catch (error) {
      console.error('[VoiceService] Failed to preload recent voice outputs:', error);
    }
  }

  /**
   * Get common phrases for preloading
   * 
   * @returns Array of common phrases
   */
  static getCommonPhrases(): string[] {
    return [
      // Greetings
      'Welcome to Bharat Mandi',
      'Hello',
      'Good morning',
      'Good afternoon',
      'Good evening',
      
      // Navigation
      'Home',
      'My Listings',
      'Search',
      'Messages',
      'Profile',
      'Settings',
      
      // Actions
      'Create Listing',
      'View Orders',
      'Check Prices',
      'Save',
      'Cancel',
      'Submit',
      'Delete',
      'Edit',
      
      // Notifications
      'New message received',
      'Listing created successfully',
      'Order placed successfully',
      'Payment received',
      'Order completed',
      
      // Errors
      'Error occurred',
      'Please try again',
      'Invalid input',
      'Connection failed',
      
      // Voice commands
      'Listening',
      'Processing',
      'Command not recognized',
      'Please speak clearly'
    ];
  }
}

// Export singleton instance
export const voiceService = new VoiceService();
