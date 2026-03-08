import {
  LexRuntimeV2Client,
  RecognizeTextCommand,
  RecognizeUtteranceCommand,
  RecognizeTextCommandInput,
  RecognizeTextCommandOutput,
} from '@aws-sdk/client-lex-runtime-v2';
import { translationService } from './translation.service';
import { voiceService } from './voice.service';
import { bedrockService } from './bedrock.service';
import { MongoClient, Db } from 'mongodb';
import { DatabaseManager } from '../../shared/database/db-abstraction';
import { CropPriceHandler } from './handlers/crop-price.handler';
import { WeatherHandler } from './handlers/weather.handler';
import { FarmingAdviceHandler } from './handlers/farming-advice.handler';

const lexClient = new LexRuntimeV2Client({
  region: process.env.AWS_REGION || process.env.LEX_REGION || 'ap-south-1',
});

const BOT_ID = process.env.LEX_BOT_ID || '';
const BOT_ALIAS_ID = process.env.LEX_BOT_ALIAS_ID || '';

// Kisan Mitra Mode: mock, lex, or bedrock
// Set via KISAN_MITRA_MODE environment variable
// Default: bedrock (if BEDROCK_MODEL_ID is set), otherwise lex (if LEX_BOT_ID is set), otherwise mock
export type KisanMitraMode = 'mock' | 'lex' | 'bedrock';

function getKisanMitraMode(): KisanMitraMode {
  const mode = process.env.KISAN_MITRA_MODE?.toLowerCase();
  
  if (mode === 'mock' || mode === 'lex' || mode === 'bedrock') {
    return mode;
  }
  
  // Auto-detect mode based on configuration
  if (process.env.BEDROCK_MODEL_ID) {
    return 'bedrock';
  }
  
  if (BOT_ID && BOT_ALIAS_ID) {
    return 'lex';
  }
  
  return 'mock';
}

const KISAN_MITRA_MODE = getKisanMitraMode();
console.log(`[KisanMitra] Running in ${KISAN_MITRA_MODE.toUpperCase()} mode`);

// AWS Lex V2 locale configuration
// Currently only en_IN is configured in the bot
// All non-English queries are translated to English before sending to Lex
// Responses are translated back to the user's language
const LOCALE_ID_MAP: Record<string, string> = {
  en: 'en_IN',
  hi: 'en_IN', // Hindi queries are translated to English first
  pa: 'en_IN', // Punjabi queries are translated to English first
  mr: 'en_IN', // Marathi queries are translated to English first
  ta: 'en_IN', // Tamil queries are translated to English first
  te: 'en_IN', // Telugu queries are translated to English first
  bn: 'en_IN', // Bengali queries are translated to English first
  gu: 'en_IN', // Gujarati queries are translated to English first
  kn: 'en_IN', // Kannada queries are translated to English first
  ml: 'en_IN', // Malayalam queries are translated to English first
  or: 'en_IN', // Odia queries are translated to English first
};

export interface KisanMitraRequest {
  userId: string;
  sessionId: string;
  query: string;
  language: string;
  audioInput?: Buffer;
  mode?: 'mock' | 'lex' | 'bedrock' | 'bedrock-nova' | 'bedrock-claude'; // Optional mode override
  modelId?: string; // Optional model ID override for bedrock modes
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
  private dbManager: DatabaseManager;
  private handlerRegistry: Map<string, any>;

  constructor() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    this.mongoClient = new MongoClient(mongoUri);
    
    // Initialize database manager for handlers
    this.dbManager = new DatabaseManager();
    
    // Initialize handler registry
    this.handlerRegistry = new Map();
    this.registerHandlers();
  }

  /**
   * Register all intent handlers
   * Maps Lex intent names to their corresponding handler instances
   */
  private registerHandlers(): void {
    // Register CropPriceHandler for GetCropPrice intent
    this.handlerRegistry.set('GetCropPrice', new CropPriceHandler(this.dbManager));
    
    // Register WeatherHandler for GetWeather intent
    this.handlerRegistry.set('GetWeather', new WeatherHandler());
    
    // Register FarmingAdviceHandler for GetFarmingAdvice intent
    this.handlerRegistry.set('GetFarmingAdvice', new FarmingAdviceHandler());
    
    console.log('[KisanMitra] Registered handlers:', Array.from(this.handlerRegistry.keys()));
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
   * Supports three modes: mock, lex, and bedrock
   */
  async processQuery(request: KisanMitraRequest): Promise<KisanMitraResponse> {
    let queryText = request.query;
    let sourceLanguage = request.language;

    // Determine which mode to use (request mode overrides environment mode)
    const effectiveMode = request.mode || KISAN_MITRA_MODE;

    // Step 1: If audio input provided, transcribe first
    if (request.audioInput) {
      try {
        const transcription = await voiceService.transcribeAudio({
          audioBuffer: request.audioInput,
          audioFormat: 'mp3',
          language: request.language as any,
        });
        queryText = transcription.text;
        sourceLanguage = transcription.detectedLanguage || request.language;
      } catch (error) {
        console.error('[KisanMitra] Transcription failed:', error);
        throw new Error('Failed to transcribe audio input');
      }
    }

    // Step 2: Process query based on mode
    let responseText: string;
    let intent: string;
    let confidence: number;
    let slots: Record<string, string> = {};

    console.log(`[KisanMitra] Processing query in ${effectiveMode.toUpperCase()} mode`);

    // Determine model ID for bedrock modes
    let bedrockModelId: string | undefined;
    let actualMode = effectiveMode;
    
    if (effectiveMode === 'bedrock-nova') {
      actualMode = 'bedrock';
      bedrockModelId = 'amazon.nova-lite-v1:0';
    } else if (effectiveMode === 'bedrock-claude') {
      actualMode = 'bedrock';
      // Use AU inference profile for Claude Sonnet 4.6 (routes between Sydney and Melbourne)
      bedrockModelId = 'au.anthropic.claude-sonnet-4-6';
    } else if (effectiveMode === 'bedrock') {
      // Use default from environment or request
      bedrockModelId = request.modelId || process.env.BEDROCK_MODEL_ID;
    }

    switch (actualMode) {
      case 'mock':
        ({ responseText, intent, confidence } = await this.processMockQuery(queryText, sourceLanguage));
        break;
      
      case 'lex':
        ({ responseText, intent, confidence, slots } = await this.processLexQuery(
          request.sessionId,
          queryText,
          sourceLanguage
        ));
        break;
      
      case 'bedrock':
        ({ responseText, intent, confidence } = await this.processBedrockQuery(
          request.userId,
          request.sessionId,
          queryText,
          sourceLanguage,
          bedrockModelId
        ));
        break;
      
      default:
        throw new Error(`Invalid mode: ${effectiveMode}`);
    }

    // Step 3: Generate audio response asynchronously (don't block response)
    let audioUrl: string | undefined;
    
    // Start audio generation in background
    const audioPromise = voiceService.synthesizeSpeech({
      text: responseText,
      language: sourceLanguage as any,
    }).then(synthesis => {
      if (synthesis.success) {
        console.log('[KisanMitra] Audio synthesis completed');
        return synthesis.audioUrl;
      }
      return undefined;
    }).catch(error => {
      console.error('[KisanMitra] Speech synthesis failed:', error);
      return undefined;
    });

    console.log('[KisanMitra] Returning response immediately, audio generating in background');

    // Step 4: Log conversation (also async, don't block)
    this.logConversation(
      request.userId,
      request.sessionId,
      queryText,
      responseText,
      intent,
      confidence,
      sourceLanguage
    ).catch(error => {
      console.error('[KisanMitra] Failed to log conversation:', error);
    });

    // Return response immediately with pending audio
    const response: KisanMitraResponse = {
      text: responseText,
      audioUrl: undefined, // Will be generated shortly
      intent,
      confidence,
      slots,
      sessionAttributes: {},
    };

    // Wait a bit for audio if it completes quickly (max 2 seconds)
    const audioWithTimeout = Promise.race([
      audioPromise,
      new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), 2000))
    ]);

    audioUrl = await audioWithTimeout;
    if (audioUrl) {
      response.audioUrl = audioUrl;
      console.log('[KisanMitra] Audio ready within timeout');
    } else {
      console.log('[KisanMitra] Audio still generating, will be cached for next time');
    }

    return response;
  }

  /**
   * Process query in MOCK mode
   * Returns predefined responses for testing
   */
  private async processMockQuery(
    query: string,
    language: string
  ): Promise<{ responseText: string; intent: string; confidence: number }> {
    console.log(`[KisanMitra] Processing in MOCK mode:`, query);
    
    const lowerQuery = query.toLowerCase();
    
    // Simple keyword matching for mock responses
    if (lowerQuery.includes('price') || lowerQuery.includes('cost') || lowerQuery.includes('कीमत')) {
      const responseText = language === 'en' 
        ? 'Mock response: Tomato prices are around ₹25 per kg in your area.'
        : 'मॉक प्रतिक्रिया: आपके क्षेत्र में टमाटर की कीमत लगभग ₹25 प्रति किलो है।';
      return { responseText, intent: 'GetCropPrice', confidence: 1.0 };
    }
    
    if (lowerQuery.includes('weather') || lowerQuery.includes('मौसम')) {
      const responseText = language === 'en'
        ? 'Mock response: The weather today is sunny with a high of 28°C.'
        : 'मॉक प्रतिक्रिया: आज का मौसम धूप वाला है और अधिकतम तापमान 28°C है।';
      return { responseText, intent: 'GetWeather', confidence: 1.0 };
    }
    
    if (lowerQuery.includes('plant') || lowerQuery.includes('grow') || lowerQuery.includes('खेती')) {
      const responseText = language === 'en'
        ? 'Mock response: The best time to plant tomatoes is during the cooler months, typically October to February in most parts of India.'
        : 'मॉक प्रतिक्रिया: टमाटर लगाने का सबसे अच्छा समय ठंडे महीनों में होता है, आमतौर पर भारत के अधिकांश हिस्सों में अक्टूबर से फरवरी तक।';
      return { responseText, intent: 'GetFarmingAdvice', confidence: 1.0 };
    }
    
    // Default mock response
    const responseText = language === 'en'
      ? `Mock response: I'm Kisan Mitra, your farming assistant. I can help with crop prices, weather, and farming advice. (Running in MOCK mode)`
      : `मॉक प्रतिक्रिया: मैं किसान मित्र हूं, आपका कृषि सहायक। मैं फसल की कीमतों, मौसम और खेती की सलाह में मदद कर सकता हूं। (MOCK मोड में चल रहा है)`;
    
    return { responseText, intent: 'Welcome', confidence: 1.0 };
  }

  /**
   * Process query through AWS Bedrock (Claude)
   */
  private async processBedrockQuery(
    userId: string,
    sessionId: string,
    query: string,
    language: string,
    modelId?: string
  ): Promise<{ responseText: string; intent: string; confidence: number }> {
    try {
      console.log(`[KisanMitra] Processing query through Bedrock${modelId ? ` (${modelId})` : ''}:`, query);
      const bedrockResponse = await bedrockService.processQuery({
        userId,
        sessionId,
        query,
        language,
        modelId,
      });
      
      console.log('[KisanMitra] Bedrock response:', bedrockResponse.text);
      
      return {
        responseText: bedrockResponse.text,
        intent: 'GenericAssistant',
        confidence: 0.95,
      };
    } catch (error: any) {
      console.error('[KisanMitra] Bedrock query failed:', error);
      throw new Error(error.message || 'Failed to process query');
    }
  }

  /**
   * Process query through AWS Lex
   */
  private async processLexQuery(
    sessionId: string,
    query: string,
    language: string
  ): Promise<{ responseText: string; intent: string; confidence: number; slots: Record<string, string> }> {
    // Translate to English if needed (Lex only supports en_IN locale)
    let lexQuery = query;
    let needsTranslation = language !== 'en';

    if (needsTranslation) {
      try {
        console.log(`[KisanMitra] Translating from ${language} to English:`, query);
        const translation = await translationService.translateText({
          text: query,
          sourceLanguage: language,
          targetLanguage: 'en',
        });
        lexQuery = translation.translatedText;
        console.log('[KisanMitra] Translated query:', lexQuery);
      } catch (error) {
        console.error('[KisanMitra] Translation to English failed:', error);
        lexQuery = query;
      }
    }

    // Send to AWS Lex
    const localeId = LOCALE_ID_MAP[language] || LOCALE_ID_MAP['en'];
    const command: RecognizeTextCommandInput = {
      botId: BOT_ID,
      botAliasId: BOT_ALIAS_ID,
      localeId,
      sessionId,
      text: lexQuery,
    };

    let lexResponse: RecognizeTextCommandOutput;
    try {
      lexResponse = await lexClient.send(new RecognizeTextCommand(command));
    } catch (error: any) {
      console.error('[KisanMitra] Lex query failed:', error);
      
      if (error.name === 'DependencyFailedException') {
        throw new Error('Kisan Mitra is temporarily unavailable. Please try again later.');
      }
      
      throw new Error('Failed to process query');
    }

    // Extract intent and slots
    const intent = lexResponse.sessionState?.intent?.name || 'Unknown';
    const slots = lexResponse.sessionState?.intent?.slots || {};
    const intentState = lexResponse.sessionState?.intent?.state;
    
    const confidence = intentState === 'Fulfilled' ? 0.95 : 
                      intentState === 'InProgress' ? 0.75 : 0.5;

    // Get response text from Lex
    let responseText = lexResponse.messages?.[0]?.content || 
                      'I did not understand that. Can you please rephrase?';

    // Check if intent has a handler and call it
    const handler = this.handlerRegistry.get(intent);
    if (handler && intentState === 'Fulfilled') {
      try {
        console.log(`[KisanMitra] Calling handler for intent: ${intent}`);
        const handlerResponse = await this.callHandler(intent, handler, slots, language);
        
        if (handlerResponse) {
          responseText = handlerResponse;
          console.log('[KisanMitra] Handler response:', responseText);
        }
      } catch (error) {
        console.error(`[KisanMitra] Handler error for ${intent}:`, error);
        responseText = this.getHandlerErrorMessage(error, language);
      }
    }

    // Translate response back to user's language (if not already translated by handler)
    if (needsTranslation && !handler) {
      try {
        console.log(`[KisanMitra] Translating response from English to ${language}:`, responseText);
        const translation = await translationService.translateText({
          text: responseText,
          sourceLanguage: 'en',
          targetLanguage: language,
        });
        responseText = translation.translatedText;
        console.log('[KisanMitra] Translated response:', responseText);
      } catch (error) {
        console.error('[KisanMitra] Translation to target language failed:', error);
      }
    }

    return {
      responseText,
      intent,
      confidence,
      slots: this.extractSlotValues(slots),
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
   * Call the appropriate handler based on intent and slots
   * @param intent - Intent name
   * @param handler - Handler instance
   * @param slots - Lex slots
   * @param language - User's language
   * @returns Formatted response text
   */
  private async callHandler(
    intent: string,
    handler: any,
    slots: any,
    language: string
  ): Promise<string | null> {
    const slotValues = this.extractSlotValues(slots);

    switch (intent) {
      case 'GetCropPrice': {
        const crop = slotValues.crop;
        const location = slotValues.location;
        
        if (!crop) {
          throw new Error('Crop name is required for price query');
        }
        
        const priceData = await handler.handle(crop, location);
        const formatted = await handler.formatResponse(priceData, language);
        return formatted.text;
      }

      case 'GetWeather': {
        const location = slotValues.location;
        
        if (!location) {
          throw new Error('Location is required for weather query');
        }
        
        const weatherData = await handler.handle(location);
        const formatted = await handler.formatResponse(weatherData, language);
        return formatted.text;
      }

      case 'GetFarmingAdvice': {
        const crop = slotValues.crop;
        const topic = slotValues.topic || 'general';
        
        if (!crop) {
          throw new Error('Crop name is required for farming advice');
        }
        
        const adviceData = await handler.handle(crop, topic, language);
        const formatted = await handler.formatResponse(adviceData, language);
        return formatted.text;
      }

      default:
        console.warn(`[KisanMitra] No handler implementation for intent: ${intent}`);
        return null;
    }
  }

  /**
   * Get user-friendly error message for handler errors
   * @param error - Error object
   * @param language - User's language
   * @returns Error message in user's language
   */
  private getHandlerErrorMessage(error: any, language: string): string {
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    
    console.error('[KisanMitra] Handler error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      language,
    });
    
    // Check for specific error types and provide helpful messages
    if (errorMessage.includes('not found') || errorMessage.includes('No listings found')) {
      return errorMessage; // Already user-friendly
    }
    
    if (errorMessage.includes('API key not configured') || errorMessage.includes('unavailable')) {
      return 'Sorry, this service is temporarily unavailable. Please try again later.';
    }
    
    if (errorMessage.includes('Location not found')) {
      return errorMessage; // Already user-friendly
    }
    
    if (errorMessage.includes('required')) {
      return errorMessage; // Already user-friendly
    }
    
    // Generic error message for unexpected errors
    return 'I encountered an issue processing your request. Please try rephrasing your question.';
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
