import {
  LexRuntimeV2Client,
  RecognizeTextCommand,
  RecognizeUtteranceCommand,
  RecognizeTextCommandInput,
  RecognizeTextCommandOutput,
} from '@aws-sdk/client-lex-runtime-v2';
import { translationService } from './translation.service';
import { voiceService } from './voice.service';
import { MongoClient, Db } from 'mongodb';

const lexClient = new LexRuntimeV2Client({
  region: process.env.AWS_REGION || process.env.LEX_REGION || 'ap-south-1',
});

const BOT_ID = process.env.LEX_BOT_ID || '';
const BOT_ALIAS_ID = process.env.LEX_BOT_ALIAS_ID || '';

// AWS Lex V2 supports limited languages
const LOCALE_ID_MAP: Record<string, string> = {
  en: 'en_IN',
  hi: 'hi_IN',
  // For other languages, we'll translate to English
};

export interface KisanMitraRequest {
  userId: string;
  sessionId: string;
  query: string;
  language: string;
  audioInput?: Buffer;
}

export interface KisanMitraResponse {
  text: string;
  audioUrl?: string;
  intent: string;
  confidence: number;
  slots?: Record<string, string>;
  sessionAttributes?: Record<string, string>;
}

export interface VoiceQuery {
  userId: string;
  sessionId: string;
  query: string;
  response: string;
  intent: string;
  confidence: number;
  language: string;
  timestamp: Date;
}

export class KisanMitraService {
  private mongoClient: MongoClient;
  private db: Db | null = null;

  constructor() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    this.mongoClient = new MongoClient(mongoUri);
  }

  private async getDb(): Promise<Db> {
    if (!this.db) {
      await this.mongoClient.connect();
      this.db = this.mongoClient.db('bharat_mandi');
    }
    return this.db;
  }

  /**
   * Process a user query through Kisan Mitra
   * Handles voice input, translation, Lex interaction, and response generation
   */
  async processQuery(request: KisanMitraRequest): Promise<KisanMitraResponse> {
    let queryText = request.query;
    let sourceLanguage = request.language;

    // Step 1: If audio input provided, transcribe first
    if (request.audioInput) {
      try {
        const transcription = await voiceService.transcribeAudio({
          audioData: request.audioInput,
          languageCode: request.language,
        });
        queryText = transcription.text;
        sourceLanguage = transcription.language || request.language;
      } catch (error) {
        console.error('[KisanMitra] Transcription failed:', error);
        throw new Error('Failed to transcribe audio input');
      }
    }

    // Step 2: Translate to English if needed (Lex works best with English)
    let lexQuery = queryText;
    let needsTranslation = sourceLanguage !== 'en' && sourceLanguage !== 'hi';

    if (needsTranslation) {
      try {
        const translation = await translationService.translateText({
          text: queryText,
          sourceLanguage,
          targetLanguage: 'en',
        });
        lexQuery = translation.translatedText;
      } catch (error) {
        console.error('[KisanMitra] Translation to English failed:', error);
        // Continue with original text
        lexQuery = queryText;
      }
    }

    // Step 3: Send to AWS Lex
    const localeId = LOCALE_ID_MAP[sourceLanguage] || LOCALE_ID_MAP['en'];
    const command: RecognizeTextCommandInput = {
      botId: BOT_ID,
      botAliasId: BOT_ALIAS_ID,
      localeId,
      sessionId: request.sessionId,
      text: lexQuery,
    };

    let lexResponse: RecognizeTextCommandOutput;
    try {
      lexResponse = await lexClient.send(new RecognizeTextCommand(command));
    } catch (error: any) {
      console.error('[KisanMitra] Lex query failed:', error);
      
      // Handle specific Lex errors
      if (error.name === 'DependencyFailedException') {
        throw new Error('Kisan Mitra is temporarily unavailable. Please try again later.');
      }
      
      throw new Error('Failed to process query');
    }

    // Step 4: Extract intent and slots
    const intent = lexResponse.sessionState?.intent?.name || 'Unknown';
    const slots = lexResponse.sessionState?.intent?.slots || {};
    const intentState = lexResponse.sessionState?.intent?.state;
    
    // Calculate confidence based on intent state
    const confidence = intentState === 'Fulfilled' ? 0.95 : 
                      intentState === 'InProgress' ? 0.75 : 0.5;

    // Step 5: Get response text from Lex
    let responseText = lexResponse.messages?.[0]?.content || 
                      'I did not understand that. Can you please rephrase?';

    // Step 6: Translate response back to user's language
    if (needsTranslation) {
      try {
        const translation = await translationService.translateText({
          text: responseText,
          sourceLanguage: 'en',
          targetLanguage: sourceLanguage,
        });
        responseText = translation.translatedText;
      } catch (error) {
        console.error('[KisanMitra] Translation to target language failed:', error);
        // Continue with English response
      }
    }

    // Step 7: Generate audio response
    let audioUrl: string | undefined;
    try {
      const synthesis = await voiceService.synthesizeSpeech({
        text: responseText,
        languageCode: sourceLanguage,
      });
      audioUrl = synthesis.audioUrl;
    } catch (error) {
      console.error('[KisanMitra] Speech synthesis failed:', error);
      // Continue without audio
    }

    // Step 8: Log conversation
    try {
      await this.logConversation(
        request.userId,
        request.sessionId,
        queryText,
        responseText,
        intent,
        confidence,
        sourceLanguage
      );
    } catch (error) {
      console.error('[KisanMitra] Failed to log conversation:', error);
      // Don't fail the request if logging fails
    }

    return {
      text: responseText,
      audioUrl,
      intent,
      confidence,
      slots: this.extractSlotValues(slots),
      sessionAttributes: lexResponse.sessionState?.sessionAttributes,
    };
  }

  /**
   * Extract slot values from Lex response
   */
  private extractSlotValues(slots: any): Record<string, string> {
    const values: Record<string, string> = {};

    for (const [key, slot] of Object.entries(slots)) {
      if (slot && typeof slot === 'object' && 'value' in slot) {
        const slotValue = (slot as any).value;
        if (slotValue && 'interpretedValue' in slotValue) {
          values[key] = slotValue.interpretedValue;
        }
      }
    }

    return values;
  }

  /**
   * Log conversation to MongoDB for analytics and improvement
   */
  private async logConversation(
    userId: string,
    sessionId: string,
    query: string,
    response: string,
    intent: string,
    confidence: number,
    language: string
  ): Promise<void> {
    try {
      const db = await this.getDb();
      const collection = db.collection<VoiceQuery>('voice_queries');

      await collection.insertOne({
        userId,
        sessionId,
        query,
        response,
        intent,
        confidence,
        language,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('[KisanMitra] Failed to log conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation history for a user
   */
  async getConversationHistory(userId: string, limit: number = 10): Promise<VoiceQuery[]> {
    try {
      const db = await this.getDb();
      const collection = db.collection<VoiceQuery>('voice_queries');

      return await collection
        .find({ userId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();
    } catch (error) {
      console.error('[KisanMitra] Failed to fetch history:', error);
      return [];
    }
  }

  /**
   * Clear conversation session
   * Note: AWS Lex sessions expire automatically after 5 minutes of inactivity
   */
  async clearSession(sessionId: string): Promise<void> {
    try {
      const db = await this.getDb();
      const collection = db.collection<VoiceQuery>('voice_queries');

      // Mark session as cleared (for analytics)
      await collection.updateMany(
        { sessionId },
        { $set: { sessionCleared: true, clearedAt: new Date() } }
      );
    } catch (error) {
      console.error('[KisanMitra] Failed to clear session:', error);
    }
  }

  /**
   * Get conversation statistics
   */
  async getStats(): Promise<{
    totalQueries: number;
    uniqueUsers: number;
    topIntents: Array<{ intent: string; count: number }>;
    averageConfidence: number;
  }> {
    try {
      const db = await this.getDb();
      const collection = db.collection<VoiceQuery>('voice_queries');

      const [totalQueries, uniqueUsers, topIntents, avgConfidence] = await Promise.all([
        collection.countDocuments(),
        collection.distinct('userId').then((users) => users.length),
        collection
          .aggregate([
            { $group: { _id: '$intent', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            { $project: { intent: '$_id', count: 1, _id: 0 } },
          ])
          .toArray(),
        collection
          .aggregate([{ $group: { _id: null, avg: { $avg: '$confidence' } } }])
          .toArray()
          .then((result) => result[0]?.avg || 0),
      ]);

      return {
        totalQueries,
        uniqueUsers,
        topIntents: topIntents as Array<{ intent: string; count: number }>,
        averageConfidence: avgConfidence,
      };
    } catch (error) {
      console.error('[KisanMitra] Failed to get stats:', error);
      return {
        totalQueries: 0,
        uniqueUsers: 0,
        topIntents: [],
        averageConfidence: 0,
      };
    }
  }

  /**
   * Close MongoDB connection
   */
  async close(): Promise<void> {
    await this.mongoClient.close();
    this.db = null;
  }
}

export const kisanMitraService = new KisanMitraService();
