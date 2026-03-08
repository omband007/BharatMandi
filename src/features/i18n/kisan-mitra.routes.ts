import { Router, Request, Response } from 'express';
import { kisanMitraService } from './kisan-mitra.service';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/kisan-mitra/query
 * Send a query to Kisan Mitra assistant
 * 
 * Body:
 * - userId: string (required)
 * - sessionId?: string (optional, will be generated if not provided)
 * - query: string (required for text input)
 * - language: string (required, e.g., 'hi', 'en', 'ta')
 * - audioInput?: base64 string (optional, for voice input)
 * - mode?: string (optional, 'mock', 'lex', or 'bedrock' - overrides server default)
 * 
 * Response:
 * - text: string (response text)
 * - audioUrl?: string (URL to audio response)
 * - intent: string (recognized intent)
 * - confidence: number (0-1)
 * - slots?: object (extracted slot values)
 * - sessionId: string (session ID for follow-up questions)
 */
router.post('/query', async (req: Request, res: Response) => {
  try {
    const { userId, sessionId, query, language, audioInput, mode } = req.body;

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    if (!query && !audioInput) {
      return res.status(400).json({
        success: false,
        error: 'Either query or audioInput is required',
      });
    }

    if (!language) {
      return res.status(400).json({
        success: false,
        error: 'language is required',
      });
    }

    // Validate mode if provided
    if (mode && !['mock', 'lex', 'bedrock', 'bedrock-nova', 'bedrock-claude'].includes(mode)) {
      return res.status(400).json({
        success: false,
        error: 'mode must be one of: mock, lex, bedrock, bedrock-nova, bedrock-claude',
      });
    }

    // Generate session ID if not provided
    const effectiveSessionId = sessionId || `session-${userId}-${uuidv4()}`;

    // Convert base64 audio to buffer if provided
    let audioBuffer: Buffer | undefined;
    if (audioInput) {
      try {
        audioBuffer = Buffer.from(audioInput, 'base64');
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid audioInput format. Must be base64 encoded.',
        });
      }
    }

    // Process query with optional mode override
    const response = await kisanMitraService.processQuery({
      userId,
      sessionId: effectiveSessionId,
      query: query || '',
      language,
      audioInput: audioBuffer,
      mode, // Pass mode to service
    });

    res.json({
      success: true,
      ...response,
      sessionId: effectiveSessionId,
    });
  } catch (error: any) {
    console.error('[API] Kisan Mitra query failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process query',
    });
  }
});

/**
 * GET /api/kisan-mitra/history/:userId
 * Get conversation history for a user
 * 
 * Query params:
 * - limit?: number (default: 10, max: 50)
 * 
 * Response:
 * - conversations: array of conversation records
 */
router.get('/history/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    const conversations = await kisanMitraService.getConversationHistory(userId, limit);

    res.json({
      success: true,
      conversations,
      count: conversations.length,
    });
  } catch (error: any) {
    console.error('[API] Failed to fetch conversation history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch conversation history',
    });
  }
});

/**
 * DELETE /api/kisan-mitra/session/:sessionId
 * Clear a conversation session
 * 
 * Response:
 * - success: boolean
 */
router.delete('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required',
      });
    }

    await kisanMitraService.clearSession(sessionId);

    res.json({
      success: true,
      message: 'Session cleared successfully',
    });
  } catch (error: any) {
    console.error('[API] Failed to clear session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clear session',
    });
  }
});

/**
 * GET /api/kisan-mitra/stats
 * Get Kisan Mitra usage statistics
 * 
 * Response:
 * - totalQueries: number
 * - uniqueUsers: number
 * - topIntents: array of {intent, count}
 * - averageConfidence: number
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await kisanMitraService.getStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('[API] Failed to fetch stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch statistics',
    });
  }
});

/**
 * POST /api/kisan-mitra/generate-audio
 * Generate audio for a text response
 * 
 * Body:
 * - text: string (required)
 * - language: string (required)
 * 
 * Response:
 * - audioUrl: string (URL to audio file)
 */
router.post('/generate-audio', async (req: Request, res: Response) => {
  try {
    const { text, language } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'text is required',
      });
    }

    if (!language) {
      return res.status(400).json({
        success: false,
        error: 'language is required',
      });
    }

    // Import voice service
    const { voiceService } = await import('./voice.service');

    // Generate audio
    const synthesis = await voiceService.synthesizeSpeech({
      text,
      language: language as any,
    });

    if (!synthesis.success) {
      return res.status(500).json({
        success: false,
        error: synthesis.error || 'Failed to generate audio',
      });
    }

    res.json({
      success: true,
      audioUrl: synthesis.audioUrl,
    });
  } catch (error: any) {
    console.error('[API] Failed to generate audio:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate audio',
    });
  }
});

/**
 * GET /api/kisan-mitra/health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Determine current mode
    const mode = process.env.KISAN_MITRA_MODE?.toLowerCase() || 'auto';
    
    let actualMode = mode;
    let configured = false;
    let message = '';
    
    if (mode === 'mock' || actualMode === 'mock') {
      actualMode = 'mock';
      configured = true;
      message = 'Kisan Mitra is ready (MOCK mode - for testing)';
    } else if (mode === 'lex' || (process.env.LEX_BOT_ID && process.env.LEX_BOT_ALIAS_ID)) {
      actualMode = 'lex';
      configured = !!(process.env.LEX_BOT_ID && process.env.LEX_BOT_ALIAS_ID);
      message = configured 
        ? 'Kisan Mitra is ready (powered by AWS Lex)'
        : 'Lex not configured. Set LEX_BOT_ID and LEX_BOT_ALIAS_ID environment variables.';
    } else if (mode === 'bedrock' || process.env.BEDROCK_MODEL_ID) {
      actualMode = 'bedrock';
      const { BedrockService } = await import('./bedrock.service');
      configured = BedrockService.isConfigured();
      message = configured
        ? 'Kisan Mitra is ready (powered by AWS Bedrock)'
        : 'Bedrock not configured. Set AWS_REGION and BEDROCK_MODEL_ID environment variables.';
    } else {
      actualMode = 'mock';
      configured = true;
      message = 'Kisan Mitra is ready (MOCK mode - no service configured)';
    }

    res.json({
      success: true,
      status: configured ? 'healthy' : 'not_configured',
      mode: actualMode,
      botConfigured: configured,
      message,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
    });
  }
});

export default router;
