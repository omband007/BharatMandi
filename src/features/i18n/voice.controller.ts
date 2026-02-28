/**
 * Voice Controller
 * 
 * Handles HTTP requests for voice operations:
 * - Speech-to-text (transcription)
 * - Text-to-speech (synthesis)
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { voiceService, VoiceLanguageCode } from './voice.service';

const router = Router();

// Configure multer for audio uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/x-wav',
      'audio/flac',
      'audio/ogg'
    ];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Invalid audio format. Only MP3, WAV, FLAC, and OGG are supported'));
    }
    cb(null, true);
  }
});

/**
 * POST /api/voice/synthesize
 * Convert text to speech
 */
router.post('/synthesize', async (req: Request, res: Response) => {
  try {
    const { text, language, speed, ssml } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    if (!language) {
      return res.status(400).json({
        success: false,
        error: 'Language is required'
      });
    }

    const result = await voiceService.synthesizeSpeech({
      text,
      language: language as VoiceLanguageCode,
      speed: speed || 1.0,
      ssml: ssml || false
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('[VoiceController] Synthesis error:', error);
    res.status(500).json({
      success: false,
      error: 'Speech synthesis failed'
    });
  }
});

/**
 * POST /api/voice/transcribe
 * Convert speech to text
 */
router.post('/transcribe', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Audio file is required'
      });
    }

    const { format, language } = req.body;

    if (!format) {
      return res.status(400).json({
        success: false,
        error: 'Audio format is required'
      });
    }

    const result = await voiceService.transcribeAudio({
      audioBuffer: req.file.buffer,
      audioFormat: format as 'mp3' | 'wav' | 'flac' | 'ogg',
      language: language as VoiceLanguageCode | undefined
    });

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('[VoiceController] Transcription error:', error);
    res.status(500).json({
      success: false,
      error: 'Speech transcription failed'
    });
  }
});

/**
 * GET /api/voice/cache/stats
 * Get TTS cache statistics (in-memory and local SQLite)
 */
router.get('/cache/stats', async (req: Request, res: Response) => {
  try {
    const memoryStats = voiceService.getTTSCacheStats();
    const audioStats = voiceService.getAudioCacheStats();
    
    res.json({
      success: true,
      memory: memoryStats,
      audio: audioStats
    });
  } catch (error) {
    console.error('[VoiceController] Cache stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cache statistics'
    });
  }
});

/**
 * DELETE /api/voice/cache
 * Clear TTS cache (both in-memory and local SQLite)
 */
router.delete('/cache', async (req: Request, res: Response) => {
  try {
    const { cacheKey, cacheType } = req.body;
    
    if (cacheType === 'memory' || !cacheType) {
      voiceService.clearTTSCache(cacheKey);
    }
    
    if (cacheType === 'audio' || !cacheType) {
      voiceService.clearAudioCache(cacheKey);
    }
    
    res.json({
      success: true,
      message: cacheKey ? 'Cache key cleared' : 'Cache cleared'
    });
  } catch (error) {
    console.error('[VoiceController] Cache clear error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

/**
 * GET /api/voice/cache/audio/:language
 * Get cached audio entries by language
 */
router.get('/cache/audio/:language', async (req: Request, res: Response) => {
  try {
    const { language } = req.params;
    const cachedAudio = voiceService.getCachedAudioByLanguage(language);
    
    res.json({
      success: true,
      count: cachedAudio.length,
      entries: cachedAudio.map(entry => ({
        cacheKey: entry.cacheKey,
        text: entry.text,
        language: entry.language,
        speed: entry.speed,
        sizeBytes: entry.sizeBytes,
        createdAt: entry.createdAt,
        lastAccessedAt: entry.lastAccessedAt,
        accessCount: entry.accessCount
      }))
    });
  } catch (error) {
    console.error('[VoiceController] Get cached audio error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cached audio'
    });
  }
});

export const voiceController = router;


/**
 * POST /api/voice/preload/common
 * Preload common phrases for offline playback
 */
router.post('/preload/common', async (req: Request, res: Response) => {
  try {
    const { language } = req.body;

    if (!language) {
      return res.status(400).json({
        success: false,
        error: 'Language is required'
      });
    }

    const commonPhrases = (voiceService.constructor as any).getCommonPhrases();
    await voiceService.preloadCommonPhrases(language as VoiceLanguageCode, commonPhrases);

    res.json({
      success: true,
      message: `Preloaded ${commonPhrases.length} common phrases for ${language}`
    });
  } catch (error) {
    console.error('[VoiceController] Preload common phrases error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preload common phrases'
    });
  }
});

/**
 * POST /api/voice/preload/recent
 * Preload user's recent voice outputs
 */
router.post('/preload/recent', async (req: Request, res: Response) => {
  try {
    const { language, limit } = req.body;

    if (!language) {
      return res.status(400).json({
        success: false,
        error: 'Language is required'
      });
    }

    await voiceService.preloadRecentVoiceOutputs(language as VoiceLanguageCode, limit || 10);

    res.json({
      success: true,
      message: `Preloaded recent voice outputs for ${language}`
    });
  } catch (error) {
    console.error('[VoiceController] Preload recent outputs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preload recent voice outputs'
    });
  }
});
