/**
 * Kisan Mitra Integration Service
 * 
 * Provides lightweight integration between Crop Diagnosis and Kisan Mitra chat.
 * Shares diagnosis context with Kisan Mitra to enable contextual conversations.
 * 
 * Requirements:
 * - 15.1: Diagnosis accessible from Kisan Mitra chat interface
 * - 15.2: Allow follow-up questions via Kisan Mitra chat
 * - 15.3: Share diagnosis context with Kisan Mitra
 * - 15.6: Maintain consistent language settings
 */

import { MongoClient, Db } from 'mongodb';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Diagnosis context shared with Kisan Mitra
 * Stored in MongoDB for session-based retrieval
 */
export interface DiagnosisContext {
  diagnosisId: string;
  userId: string;
  sessionId?: string;
  cropType: string;
  diseases: Array<{
    name: string;
    scientificName: string;
    type: string;
    severity: string;
    confidence: number;
  }>;
  confidence: number;
  language: string;
  timestamp: Date;
  // Summary for quick reference in chat
  summary: string;
}

/**
 * Context retrieval result
 */
export interface ContextRetrievalResult {
  found: boolean;
  context?: DiagnosisContext;
  message?: string;
}

// ============================================================================
// KISAN MITRA INTEGRATION SERVICE
// ============================================================================

export class KisanMitraIntegrationService {
  private mongoClient: MongoClient;
  private db: Db | null = null;
  private readonly COLLECTION_NAME = 'diagnosis_chat_context';
  private readonly CONTEXT_TTL_HOURS = 24; // Context expires after 24 hours

  constructor() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    this.mongoClient = new MongoClient(mongoUri);
  }

  /**
   * Get MongoDB database connection
   */
  private async getDb(): Promise<Db> {
    if (!this.db) {
      await this.mongoClient.connect();
      this.db = this.mongoClient.db('bharat_mandi');
    }
    return this.db;
  }

  /**
   * Share diagnosis context with Kisan Mitra
   * 
   * Stores diagnosis information in MongoDB so that Kisan Mitra chat
   * can access it for contextual conversations.
   * 
   * Requirements: 15.2, 15.3, 15.6
   * 
   * @param context - Diagnosis context to share
   * @returns Promise that resolves when context is stored
   */
  async addContext(context: DiagnosisContext): Promise<void> {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.COLLECTION_NAME);

      // Calculate expiry time (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.CONTEXT_TTL_HOURS);

      // Store context with TTL
      await collection.insertOne({
        ...context,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`[KisanMitraIntegration] Context added for diagnosis ${context.diagnosisId}`);
      console.log(`[KisanMitraIntegration]   User: ${context.userId}`);
      console.log(`[KisanMitraIntegration]   Crop: ${context.cropType}`);
      console.log(`[KisanMitraIntegration]   Diseases: ${context.diseases.length}`);
      console.log(`[KisanMitraIntegration]   Language: ${context.language}`);
    } catch (error) {
      console.error('[KisanMitraIntegration] Failed to add context:', error);
      throw new Error('Failed to share diagnosis context with Kisan Mitra');
    }
  }

  /**
   * Get diagnosis context by diagnosis ID
   * 
   * Retrieves stored diagnosis context for use in Kisan Mitra chat.
   * 
   * Requirements: 15.2, 15.3
   * 
   * @param diagnosisId - Diagnosis ID to retrieve context for
   * @returns Context retrieval result
   */
  async getContextByDiagnosisId(diagnosisId: string): Promise<ContextRetrievalResult> {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.COLLECTION_NAME);

      const context = await collection.findOne({
        diagnosisId,
        expiresAt: { $gt: new Date() } // Only return non-expired contexts
      });

      if (!context) {
        return {
          found: false,
          message: 'Diagnosis context not found or has expired'
        };
      }

      return {
        found: true,
        context: {
          diagnosisId: context.diagnosisId,
          userId: context.userId,
          sessionId: context.sessionId,
          cropType: context.cropType,
          diseases: context.diseases,
          confidence: context.confidence,
          language: context.language,
          timestamp: context.timestamp,
          summary: context.summary
        }
      };
    } catch (error) {
      console.error('[KisanMitraIntegration] Failed to get context:', error);
      return {
        found: false,
        message: 'Failed to retrieve diagnosis context'
      };
    }
  }

  /**
   * Get most recent diagnosis context for a user
   * 
   * Useful for Kisan Mitra to reference the user's latest diagnosis
   * when they ask follow-up questions without specifying which diagnosis.
   * 
   * Requirements: 15.2, 15.3
   * 
   * @param userId - User ID to retrieve context for
   * @returns Context retrieval result
   */
  async getLatestContextForUser(userId: string): Promise<ContextRetrievalResult> {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.COLLECTION_NAME);

      const context = await collection.findOne(
        {
          userId,
          expiresAt: { $gt: new Date() } // Only return non-expired contexts
        },
        {
          sort: { timestamp: -1 } // Most recent first
        }
      );

      if (!context) {
        return {
          found: false,
          message: 'No recent diagnosis found for this user'
        };
      }

      return {
        found: true,
        context: {
          diagnosisId: context.diagnosisId,
          userId: context.userId,
          sessionId: context.sessionId,
          cropType: context.cropType,
          diseases: context.diseases,
          confidence: context.confidence,
          language: context.language,
          timestamp: context.timestamp,
          summary: context.summary
        }
      };
    } catch (error) {
      console.error('[KisanMitraIntegration] Failed to get latest context:', error);
      return {
        found: false,
        message: 'Failed to retrieve latest diagnosis context'
      };
    }
  }

  /**
   * Get diagnosis context by session ID
   * 
   * Allows Kisan Mitra to retrieve diagnosis context for the current chat session.
   * 
   * Requirements: 15.2, 15.3
   * 
   * @param sessionId - Session ID to retrieve context for
   * @returns Context retrieval result
   */
  async getContextBySessionId(sessionId: string): Promise<ContextRetrievalResult> {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.COLLECTION_NAME);

      const context = await collection.findOne(
        {
          sessionId,
          expiresAt: { $gt: new Date() } // Only return non-expired contexts
        },
        {
          sort: { timestamp: -1 } // Most recent first
        }
      );

      if (!context) {
        return {
          found: false,
          message: 'No diagnosis context found for this session'
        };
      }

      return {
        found: true,
        context: {
          diagnosisId: context.diagnosisId,
          userId: context.userId,
          sessionId: context.sessionId,
          cropType: context.cropType,
          diseases: context.diseases,
          confidence: context.confidence,
          language: context.language,
          timestamp: context.timestamp,
          summary: context.summary
        }
      };
    } catch (error) {
      console.error('[KisanMitraIntegration] Failed to get context by session:', error);
      return {
        found: false,
        message: 'Failed to retrieve diagnosis context for session'
      };
    }
  }

  /**
   * Update session ID for a diagnosis context
   * 
   * Associates a diagnosis with a Kisan Mitra chat session.
   * 
   * Requirements: 15.2, 15.3
   * 
   * @param diagnosisId - Diagnosis ID to update
   * @param sessionId - Session ID to associate
   */
  async updateSessionId(diagnosisId: string, sessionId: string): Promise<void> {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.COLLECTION_NAME);

      await collection.updateOne(
        { diagnosisId },
        {
          $set: {
            sessionId,
            updatedAt: new Date()
          }
        }
      );

      console.log(`[KisanMitraIntegration] Session ID updated for diagnosis ${diagnosisId}`);
    } catch (error) {
      console.error('[KisanMitraIntegration] Failed to update session ID:', error);
      throw new Error('Failed to update session ID');
    }
  }

  /**
   * Delete expired contexts (cleanup utility)
   * 
   * Can be called periodically to clean up expired contexts.
   * MongoDB TTL index will also handle this automatically.
   */
  async cleanupExpiredContexts(): Promise<number> {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.COLLECTION_NAME);

      const result = await collection.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      console.log(`[KisanMitraIntegration] Cleaned up ${result.deletedCount} expired contexts`);
      return result.deletedCount;
    } catch (error) {
      console.error('[KisanMitraIntegration] Failed to cleanup expired contexts:', error);
      return 0;
    }
  }

  /**
   * Ensure MongoDB indexes are created
   * 
   * Should be called during application startup.
   */
  async ensureIndexes(): Promise<void> {
    try {
      const db = await this.getDb();
      const collection = db.collection(this.COLLECTION_NAME);

      // Index for TTL (automatic expiry)
      await collection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
      );

      // Index for diagnosis ID lookup
      await collection.createIndex({ diagnosisId: 1 });

      // Index for user ID lookup (with timestamp for sorting)
      await collection.createIndex({ userId: 1, timestamp: -1 });

      // Index for session ID lookup
      await collection.createIndex({ sessionId: 1, timestamp: -1 });

      console.log('[KisanMitraIntegration] Indexes created successfully');
    } catch (error) {
      console.error('[KisanMitraIntegration] Failed to create indexes:', error);
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

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Default Kisan Mitra Integration Service instance
 */
export const kisanMitraIntegrationService = new KisanMitraIntegrationService();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a human-readable summary of the diagnosis
 * 
 * Used to create a concise summary for chat context.
 * 
 * @param cropType - Type of crop
 * @param diseases - Array of detected diseases
 * @param confidence - Overall confidence score
 * @param language - Language code
 * @returns Summary string
 */
export function generateDiagnosisSummary(
  cropType: string,
  diseases: Array<{ name: string; severity: string }>,
  confidence: number,
  language: string
): string {
  if (diseases.length === 0) {
    return language === 'en'
      ? `No diseases detected in ${cropType} (${confidence}% confidence)`
      : `${cropType} में कोई बीमारी नहीं मिली (${confidence}% विश्वास)`;
  }

  const diseaseNames = diseases.map(d => d.name).join(', ');
  const severity = diseases[0].severity;

  if (language === 'en') {
    return `${cropType}: ${diseaseNames} (${severity} severity, ${confidence}% confidence)`;
  } else {
    // For non-English, keep disease names in English but translate the structure
    return `${cropType}: ${diseaseNames} (${severity} गंभीरता, ${confidence}% विश्वास)`;
  }
}
