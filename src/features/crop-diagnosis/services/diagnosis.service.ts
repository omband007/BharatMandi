/**
 * Diagnosis Service
 * 
 * Orchestrates the end-to-end crop disease diagnosis flow.
 * Wires together all components: Validator → S3 → Cache → Nova → Remedies → History → Expert Escalation
 * 
 * Requirements:
 * - 2.1, 2.2, 2.3, 2.4: AI-powered disease identification via Nova Pro
 * - 3.1, 3.2: Confidence scoring and expert escalation
 * - 4.1, 5.1, 6.1: Chemical, organic, and preventive remedies
 * - 7.1: Diagnosis history storage
 * - 12.3: Caching to reduce Bedrock API calls
 * - 12.6: End-to-end performance <3000ms
 */

import { imageValidator } from './image-validator.service';
import { s3Service } from './s3.service';
import { diagnosisCacheService } from './diagnosis-cache.service';
import { novaVisionService } from './nova-vision.service';
import { remedyGenerator } from './remedy-generator.service';
import { expertEscalationService } from './expert-escalation.service';
import { historyManager } from './history-manager.service';
import { kisanMitraIntegrationService, generateDiagnosisSummary } from './kisan-mitra-integration.service';
import { getEmbeddingService } from './embedding.service';
import { vectorDatabaseService } from './vector-database.service';
import { getRAGRetrievalService } from './rag-retrieval.service';
import { getRAGResponseGenerator } from './rag-response-generator.service';
import type { ImageAnalysisResult } from './nova-vision.service';
import type { RemedyResponse } from './remedy-generator.service';
import type { EnhancedDiagnosisResponse } from './rag-response-generator.service';
import type { RetrievalResponse } from './rag-retrieval.service';

// ============================================================================
// CONSTANTS
// ============================================================================

const CONFIDENCE_THRESHOLD = 80; // Requirement 3.2: Expert review required if <80%
const END_TO_END_TIMEOUT = 3000; // Requirement 12.6: <3000ms target
const RAG_ENABLED = process.env.RAG_ENABLED !== 'false'; // Default: enabled
const RAG_RETRIEVAL_TIMEOUT = parseInt(process.env.RETRIEVAL_TIMEOUT_MS || '1500', 10); // 1500ms
const RAG_GENERATION_TIMEOUT = parseInt(process.env.GENERATION_TIMEOUT_MS || '2000', 10); // 2000ms

// Log RAG configuration on module load
console.log('='.repeat(60));
console.log('[DiagnosisService] RAG Configuration:');
console.log(`  RAG_ENABLED: ${RAG_ENABLED} (env: ${process.env.RAG_ENABLED})`);
console.log(`  RETRIEVAL_TIMEOUT: ${RAG_RETRIEVAL_TIMEOUT}ms`);
console.log(`  GENERATION_TIMEOUT: ${RAG_GENERATION_TIMEOUT}ms`);
console.log(`  POSTGRES_HOST: ${process.env.POSTGRES_HOST}`);
console.log(`  POSTGRES_PORT: ${process.env.POSTGRES_PORT}`);
console.log(`  POSTGRES_DB: ${process.env.POSTGRES_DB}`);
console.log('='.repeat(60));

// ============================================================================
// TYPES
// ============================================================================

export interface DiagnosisRequest {
  imageBuffer: Buffer;
  originalFilename: string;
  userId: string;
  sessionId?: string; // Optional Kisan Mitra session ID for context linking
  cropHint?: string;
  location?: {
    latitude: number;
    longitude: number;
    state: string;
    district?: string;
  };
  language?: 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu' | 'pa' | 'or';
  growthStage?: 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'maturity';
  shareWithKisanMitra?: boolean; // Whether to share context with Kisan Mitra (default: true)
  ragEnabled?: boolean; // Whether to enable RAG enhancement (default: true)
}

export interface DiagnosisResponse {
  diagnosisId: string;
  cropType: string;
  cropLocalName?: string;
  diseases: Array<{
    name: string;
    localName?: string;
    scientificName: string;
    type: 'fungal' | 'bacterial' | 'viral' | 'pest' | 'nutrient_deficiency';
    severity: 'low' | 'medium' | 'high';
    confidence: number;
    affectedParts: string[];
  }>;
  symptoms: string[];
  confidence: number;
  remedies: {
    chemical: Array<{
      name: string;
      genericName: string;
      brandNames: string[];
      dosage: string;
      applicationMethod: string;
      frequency: string;
      duration?: string;
      preHarvestInterval: number;
      safetyPrecautions: string[];
      estimatedCost: string;
      source?: 'rag' | 'basic'; // Indicates if remedy is from RAG or basic
      citationIds?: string[]; // Citation IDs if from RAG
      confidence?: number; // Confidence score
    }>;
    organic: Array<{
      name: string;
      ingredients: string[];
      preparation: string[];
      applicationMethod: string;
      frequency: string;
      effectiveness: string;
      commercialProducts?: string[];
      source?: 'rag' | 'basic'; // Indicates if remedy is from RAG or basic
      citationIds?: string[]; // Citation IDs if from RAG
      confidence?: number; // Confidence score
    }>;
    preventive: Array<{
      category: 'crop_rotation' | 'irrigation' | 'spacing' | 'soil_health' | 'timing';
      description: string;
      timing?: string;
      frequency?: string;
      source?: 'rag' | 'basic'; // Indicates if remedy is from RAG or basic
      citationIds?: string[]; // Citation IDs if from RAG
      confidence?: number; // Confidence score
    }>;
    regionalNotes?: string;
    seasonalNotes?: string;
  };
  expertReviewRequired: boolean;
  expertReviewId?: string;
  imageUrl: string;
  timestamp: Date;
  ragEnhanced?: boolean; // Indicates if RAG enhancement was applied
  ragMetadata?: {
    retrievalTimeMs: number;
    generationTimeMs: number;
    documentsRetrieved: number;
    similarityThreshold: number;
    cacheHit: boolean;
    fallbackReason?: string; // Reason for fallback if RAG failed
  };
  citations?: Array<{
    citationId: string;
    documentId: string;
    title: string;
    excerpt: string;
    source: string;
    author?: string;
    publicationDate?: string;
    url?: string;
    relevanceScore: number;
  }>;
  metadata: {
    cacheHit: boolean;
    processingTimeMs: number;
    stages: {
      validation: number;
      upload: number;
      cacheCheck: number;
      analysis: number;
      remedyGeneration: number;
      expertEscalation: number;
      historyStorage: number;
      ragRetrieval?: number;
      ragGeneration?: number;
    };
  };
}

export interface DiagnosisError {
  code: string;
  message: string;
  details?: any;
  stage?: string;
}

// ============================================================================
// DIAGNOSIS SERVICE
// ============================================================================

export class DiagnosisService {
  /**
   * Execute end-to-end diagnosis flow
   * 
   * Flow:
   * 1. Validate image (format, size, dimensions, quality)
   * 2. Check cache for existing diagnosis
   * 3. Upload image to S3
   * 4. Analyze with Nova Pro (if not cached)
   * 5. Generate remedies
   * 6. Check confidence and escalate to expert if needed
   * 7. Save to history
   * 8. Return complete diagnosis response
   * 
   * @param request - Diagnosis request with image and metadata
   * @returns Complete diagnosis response with remedies and metadata
   * @throws DiagnosisError if any stage fails
   */
  async diagnose(request: DiagnosisRequest): Promise<DiagnosisResponse> {
    const startTime = Date.now();
    const stages = {
      validation: 0,
      upload: 0,
      cacheCheck: 0,
      analysis: 0,
      remedyGeneration: 0,
      expertEscalation: 0,
      historyStorage: 0
    };

    let cacheHit = false;
    let diagnosisResult: ImageAnalysisResult | null = null;
    let remedies: RemedyResponse | null = null;
    let imageUrl = '';
    let s3Key = '';

    try {
      // ========================================================================
      // STAGE 1: VALIDATE IMAGE
      // ========================================================================
      const validationStart = Date.now();
      console.log('[DiagnosisService] Stage 1: Validating image...');

      const validation = await imageValidator.validateImage(
        request.imageBuffer,
        request.originalFilename
      );

      if (!validation.valid) {
        throw this.createError(
          'INVALID_IMAGE',
          `Image validation failed: ${validation.errors.join(', ')}`,
          { errors: validation.errors, warnings: validation.warnings },
          'validation'
        );
      }

      stages.validation = Date.now() - validationStart;
      console.log(`[DiagnosisService] ✓ Validation complete (${stages.validation}ms)`);

      // Log warnings if any
      if (validation.warnings.length > 0) {
        console.log('[DiagnosisService] Warnings:', validation.warnings);
      }

      // ========================================================================
      // STAGE 2: CHECK CACHE
      // ========================================================================
      const cacheStart = Date.now();
      console.log('[DiagnosisService] Stage 2: Checking cache...');

      const cached = await diagnosisCacheService.getCachedDiagnosis(request.imageBuffer);

      if (cached) {
        cacheHit = true;
        diagnosisResult = cached.diagnosis as ImageAnalysisResult;
        remedies = cached.remedies;
        stages.cacheCheck = Date.now() - cacheStart;
        console.log(`[DiagnosisService] ✓ Cache hit! (${stages.cacheCheck}ms)`);
      } else {
        stages.cacheCheck = Date.now() - cacheStart;
        console.log(`[DiagnosisService] ✗ Cache miss (${stages.cacheCheck}ms)`);
      }

      // ========================================================================
      // STAGE 3: UPLOAD TO S3
      // ========================================================================
      const uploadStart = Date.now();
      console.log('[DiagnosisService] Stage 3: Uploading to S3...');

      // Compress image before upload
      const compressedBuffer = await s3Service.compressImage(request.imageBuffer);

      // Generate temporary diagnosis ID for S3 key
      const tempDiagnosisId = `temp-${Date.now()}`;

      // Upload to S3
      s3Key = await s3Service.uploadImage(compressedBuffer, {
        userId: request.userId,
        diagnosisId: tempDiagnosisId,
        uploadedAt: new Date(),
        originalFilename: request.originalFilename,
        contentType: validation.metadata?.format === 'png' ? 'image/png' : 
                     validation.metadata?.format === 'webp' ? 'image/webp' : 'image/jpeg'
      });

      // Generate presigned URL (24 hour expiry)
      imageUrl = await s3Service.generatePresignedUrl(s3Key, 24);

      stages.upload = Date.now() - uploadStart;
      console.log(`[DiagnosisService] ✓ Upload complete (${stages.upload}ms)`);

      // ========================================================================
      // STAGE 4: ANALYZE WITH NOVA PRO (if not cached)
      // ========================================================================
      if (!cacheHit) {
        const analysisStart = Date.now();
        console.log('[DiagnosisService] Stage 4: Analyzing with Nova Pro...');

        diagnosisResult = await novaVisionService.analyzeImage({
          imageBuffer: compressedBuffer,
          imageFormat: validation.metadata?.format || 'jpeg',
          cropHint: request.cropHint,
          language: request.language || 'en'
        });

        stages.analysis = Date.now() - analysisStart;
        console.log(`[DiagnosisService] ✓ Analysis complete (${stages.analysis}ms)`);
        console.log(`[DiagnosisService]   Crop: ${diagnosisResult.cropType}`);
        console.log(`[DiagnosisService]   Diseases: ${diagnosisResult.diseases.length}`);
        console.log(`[DiagnosisService]   Confidence: ${diagnosisResult.confidence}%`);
      } else {
        stages.analysis = 0; // Skipped due to cache hit
      }

      // ========================================================================
      // STAGE 5: GENERATE REMEDIES (if not cached)
      // ========================================================================
      if (!cacheHit && diagnosisResult) {
        const remedyStart = Date.now();
        console.log('[DiagnosisService] Stage 5: Generating remedies...');

        // Generate remedies for each disease
        if (diagnosisResult.diseases.length > 0) {
          // Use the first (most severe) disease for remedy generation
          const primaryDisease = diagnosisResult.diseases[0];

          remedies = await remedyGenerator.generateRemedies({
            disease: primaryDisease,
            cropType: diagnosisResult.cropType,
            location: request.location,
            language: request.language || 'en',
            growthStage: request.growthStage,
            currentDate: new Date()
          });
        } else {
          // No diseases detected - return empty remedies
          remedies = {
            chemical: [],
            organic: [],
            preventive: []
          };
        }

        stages.remedyGeneration = Date.now() - remedyStart;
        console.log(`[DiagnosisService] ✓ Remedies generated (${stages.remedyGeneration}ms)`);

        // Cache the diagnosis and remedies for future requests
        await diagnosisCacheService.cacheDiagnosis(
          request.imageBuffer,
          diagnosisResult,
          remedies
        );
        console.log('[DiagnosisService] ✓ Cached diagnosis for future requests');
      } else {
        stages.remedyGeneration = 0; // Skipped due to cache hit
      }

      // Ensure we have diagnosis and remedies at this point
      if (!diagnosisResult || !remedies) {
        throw this.createError(
          'DIAGNOSIS_INCOMPLETE',
          'Diagnosis or remedies not available',
          {},
          'analysis'
        );
      }

      // ========================================================================
      // STAGE 5.5: RAG ENHANCEMENT (if enabled)
      // ========================================================================
      let ragEnhanced = false;
      let ragMetadata: DiagnosisResponse['ragMetadata'];
      let citations: DiagnosisResponse['citations'];
      let ragRetrievalTime = 0;
      let ragGenerationTime = 0;

      // Check if RAG is enabled: environment variable AND request parameter (default: true)
      const ragEnabledForRequest = RAG_ENABLED && (request.ragEnabled !== false);

      if (ragEnabledForRequest && diagnosisResult.diseases.length > 0) {
        console.log('[DiagnosisService] Stage 5.5: Attempting RAG enhancement...');
        
        try {
          const ragResult = await this.enhanceWithRAG(
            diagnosisResult,
            request.cropHint || diagnosisResult.cropType,
            request.location,
            request.language || 'en'
          );

          if (ragResult.success && ragResult.enhancedResponse) {
            ragEnhanced = true;
            ragRetrievalTime = ragResult.retrievalTimeMs;
            ragGenerationTime = ragResult.generationTimeMs;
            
            // Merge RAG-enhanced remedies with basic remedies
            remedies = this.mergeRemedies(remedies, ragResult.enhancedResponse);
            citations = ragResult.enhancedResponse.citations;

            ragMetadata = {
              retrievalTimeMs: ragResult.retrievalTimeMs,
              generationTimeMs: ragResult.generationTimeMs,
              documentsRetrieved: ragResult.documentsRetrieved,
              similarityThreshold: ragResult.similarityThreshold,
              cacheHit: ragResult.cacheHit
            };

            console.log(`[DiagnosisService] ✓ RAG enhancement successful`);
            console.log(`[DiagnosisService]   Retrieved: ${ragResult.documentsRetrieved} documents`);
            console.log(`[DiagnosisService]   Citations: ${citations?.length || 0}`);
            console.log(`[DiagnosisService]   Time: ${ragRetrievalTime + ragGenerationTime}ms`);
          } else {
            // RAG failed - use fallback mode
            console.log(`[DiagnosisService] ✗ RAG enhancement failed: ${ragResult.fallbackReason}`);
            ragMetadata = {
              retrievalTimeMs: 0,
              generationTimeMs: 0,
              documentsRetrieved: 0,
              similarityThreshold: 0,
              cacheHit: false,
              fallbackReason: ragResult.fallbackReason
            };
          }
        } catch (error) {
          // Log error but continue with basic diagnosis
          console.error('[DiagnosisService] RAG enhancement error:', error);
          ragMetadata = {
            retrievalTimeMs: 0,
            generationTimeMs: 0,
            documentsRetrieved: 0,
            similarityThreshold: 0,
            cacheHit: false,
            fallbackReason: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      } else if (!ragEnabledForRequest) {
        console.log('[DiagnosisService] Stage 5.5: RAG enhancement disabled');
      } else {
        console.log('[DiagnosisService] Stage 5.5: RAG enhancement skipped (no diseases detected)');
      }

      // ========================================================================
      // STAGE 6: CHECK CONFIDENCE & EXPERT ESCALATION
      // ========================================================================
      const escalationStart = Date.now();
      let expertReviewRequired = false;
      let expertReviewId: string | undefined;

      if (diagnosisResult.confidence < CONFIDENCE_THRESHOLD) {
        console.log('[DiagnosisService] Stage 6: Low confidence - escalating to expert...');
        expertReviewRequired = true;

        // Create expert review request (will be updated with actual diagnosisId later)
        try {
          expertReviewId = await expertEscalationService.createReviewRequest({
            diagnosisId: tempDiagnosisId, // Temporary ID, will be updated
            userId: request.userId,
            imageUrl: s3Key,
            aiDiagnosis: {
              cropType: diagnosisResult.cropType,
              diseases: diagnosisResult.diseases,
              confidence: diagnosisResult.confidence
            },
            aiRemedies: remedies
          });

          stages.expertEscalation = Date.now() - escalationStart;
          console.log(`[DiagnosisService] ✓ Expert review requested (${stages.expertEscalation}ms)`);
          console.log(`[DiagnosisService]   Review ID: ${expertReviewId}`);
        } catch (error) {
          // Log error but don't fail the diagnosis
          console.error('[DiagnosisService] Failed to create expert review:', error);
          stages.expertEscalation = Date.now() - escalationStart;
        }
      } else {
        stages.expertEscalation = 0;
        console.log('[DiagnosisService] Stage 6: Confidence sufficient - no expert review needed');
      }

      // ========================================================================
      // STAGE 7: SAVE TO HISTORY
      // ========================================================================
      const historyStart = Date.now();
      console.log('[DiagnosisService] Stage 7: Saving to history...');

      let diagnosisId: string;
      try {
        diagnosisId = await historyManager.saveDiagnosis({
          userId: request.userId,
          imageUrl: s3Key,
          imageMetadata: {
            format: validation.metadata?.format || 'jpeg',
            sizeBytes: validation.metadata?.sizeBytes || request.imageBuffer.length,
            dimensions: {
              width: validation.metadata?.width || 0,
              height: validation.metadata?.height || 0
            }
          },
          diagnosis: {
            cropType: diagnosisResult.cropType,
            diseases: diagnosisResult.diseases,
            symptoms: diagnosisResult.symptoms,
            confidence: diagnosisResult.confidence
          },
          remedies: {
            chemical: remedies.chemical,
            organic: remedies.organic,
            preventive: remedies.preventive
          },
          location: request.location,
          language: request.language || 'en',
          expertReviewRequired
        });

        stages.historyStorage = Date.now() - historyStart;
        console.log(`[DiagnosisService] ✓ History saved (${stages.historyStorage}ms)`);
        console.log(`[DiagnosisService]   Diagnosis ID: ${diagnosisId}`);
      } catch (error) {
        // Log error but don't fail the diagnosis - generate temporary ID
        console.error('[DiagnosisService] Failed to save history (MongoDB unavailable):', error);
        diagnosisId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        stages.historyStorage = Date.now() - historyStart;
        console.log(`[DiagnosisService] ⚠ Using temporary diagnosis ID: ${diagnosisId}`);
      }

      // ========================================================================
      // STAGE 8: SHARE CONTEXT WITH KISAN MITRA (if enabled)
      // ========================================================================
      const kisanMitraStart = Date.now();
      const shareWithKisanMitra = request.shareWithKisanMitra !== false; // Default to true

      if (shareWithKisanMitra) {
        console.log('[DiagnosisService] Stage 8: Sharing context with Kisan Mitra...');

        try {
          // Generate summary for chat context
          const summary = generateDiagnosisSummary(
            diagnosisResult.cropType,
            diagnosisResult.diseases,
            diagnosisResult.confidence,
            request.language || 'en'
          );

          // Share context with Kisan Mitra
          await kisanMitraIntegrationService.addContext({
            diagnosisId,
            userId: request.userId,
            sessionId: request.sessionId,
            cropType: diagnosisResult.cropType,
            diseases: diagnosisResult.diseases.map(d => ({
              name: d.name,
              scientificName: d.scientificName,
              type: d.type,
              severity: d.severity,
              confidence: d.confidence
            })),
            confidence: diagnosisResult.confidence,
            language: request.language || 'en',
            timestamp: new Date(),
            summary
          });

          const kisanMitraTime = Date.now() - kisanMitraStart;
          console.log(`[DiagnosisService] ✓ Context shared with Kisan Mitra (${kisanMitraTime}ms)`);
        } catch (error) {
          // Log error but don't fail the diagnosis
          const kisanMitraTime = Date.now() - kisanMitraStart;
          console.error('[DiagnosisService] Failed to share context with Kisan Mitra:', error);
          console.log(`[DiagnosisService] ✗ Kisan Mitra integration failed (${kisanMitraTime}ms)`);
        }
      } else {
        console.log('[DiagnosisService] Stage 8: Kisan Mitra integration skipped (disabled)');
      }

      // ========================================================================
      // STAGE 9: BUILD RESPONSE
      // ========================================================================
      const totalTime = Date.now() - startTime;
      console.log(`[DiagnosisService] ✓ Diagnosis complete (${totalTime}ms total)`);

      // Check if we exceeded the target time
      if (totalTime > END_TO_END_TIMEOUT) {
        console.warn(
          `[DiagnosisService] ⚠ Exceeded target time: ${totalTime}ms > ${END_TO_END_TIMEOUT}ms`
        );
      }

      return {
        diagnosisId,
        cropType: diagnosisResult.cropType,
        cropLocalName: diagnosisResult.cropLocalName,
        diseases: diagnosisResult.diseases,
        symptoms: diagnosisResult.symptoms,
        confidence: diagnosisResult.confidence,
        remedies: {
          chemical: remedies.chemical,
          organic: remedies.organic,
          preventive: remedies.preventive,
          regionalNotes: remedies.regionalNotes,
          seasonalNotes: remedies.seasonalNotes
        },
        expertReviewRequired,
        expertReviewId,
        imageUrl,
        timestamp: new Date(),
        ragEnhanced,
        ragMetadata,
        citations,
        metadata: {
          cacheHit,
          processingTimeMs: totalTime,
          stages: {
            ...stages,
            ragRetrieval: ragRetrievalTime,
            ragGeneration: ragGenerationTime
          }
        }
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error('[DiagnosisService] ✗ Diagnosis failed:', error);

      // If it's already a DiagnosisError, re-throw it
      if (this.isDiagnosisError(error)) {
        throw error;
      }

      // Wrap other errors
      throw this.createError(
        'DIAGNOSIS_FAILED',
        error instanceof Error ? error.message : 'Unknown error occurred',
        { originalError: error, processingTimeMs: totalTime },
        'unknown'
      );
    }
  }

  /**
   * Create a structured diagnosis error
   */
  private createError(
    code: string,
    message: string,
    details?: any,
    stage?: string
  ): DiagnosisError {
    return {
      code,
      message,
      details,
      stage
    };
  }

  /**
   * Type guard for DiagnosisError
   */
  private isDiagnosisError(error: any): error is DiagnosisError {
    return error && typeof error.code === 'string' && typeof error.message === 'string';
  }

  /**
   * Enhance diagnosis with RAG
   * 
   * Retrieves relevant documents and generates enhanced recommendations
   * with citations. Implements timeout handling and fallback mode.
   * 
   * @param diagnosisResult - Disease identification from Nova Pro
   * @param cropType - Identified crop type
   * @param location - Optional location information
   * @param language - Requested language
   * @returns RAG enhancement result with success/failure status
   */
  private async enhanceWithRAG(
    diagnosisResult: ImageAnalysisResult,
    cropType: string,
    location?: { state: string; district?: string },
    language: string = 'en'
  ): Promise<{
    success: boolean;
    enhancedResponse?: EnhancedDiagnosisResponse;
    retrievalTimeMs: number;
    generationTimeMs: number;
    documentsRetrieved: number;
    similarityThreshold: number;
    cacheHit: boolean;
    fallbackReason?: string;
  }> {
    const primaryDisease = diagnosisResult.diseases[0];
    let retrievalTimeMs = 0;
    let generationTimeMs = 0;
    let documentsRetrieved = 0;
    let similarityThreshold = 0;
    let cacheHit = false;

    try {
      // Initialize RAG services
      const embeddingService = getEmbeddingService();
      const ragRetrievalService = getRAGRetrievalService(
        embeddingService,
        vectorDatabaseService
      );
      const ragResponseGenerator = getRAGResponseGenerator();

      // Stage 1: Retrieve documents with timeout
      const retrievalStart = Date.now();
      const retrievalPromise = ragRetrievalService.retrieveDocuments({
        disease: {
          name: primaryDisease.name,
          scientificName: primaryDisease.scientificName,
          type: primaryDisease.type,
          severity: primaryDisease.severity,
        },
        cropType,
        location,
        language,
      });

      const retrievalTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Retrieval timeout')), RAG_RETRIEVAL_TIMEOUT);
      });

      let retrievalResponse: RetrievalResponse;
      try {
        retrievalResponse = await Promise.race([retrievalPromise, retrievalTimeoutPromise]);
      } catch (error) {
        retrievalTimeMs = Date.now() - retrievalStart;
        return {
          success: false,
          retrievalTimeMs,
          generationTimeMs: 0,
          documentsRetrieved: 0,
          similarityThreshold: 0,
          cacheHit: false,
          fallbackReason: error instanceof Error ? error.message : 'Retrieval failed',
        };
      }

      retrievalTimeMs = retrievalResponse.retrievalTimeMs;
      documentsRetrieved = retrievalResponse.documents.length;
      similarityThreshold = retrievalResponse.similarityThreshold;
      cacheHit = retrievalResponse.cacheHit;

      // Check if we have documents
      if (documentsRetrieved === 0) {
        return {
          success: false,
          retrievalTimeMs,
          generationTimeMs: 0,
          documentsRetrieved: 0,
          similarityThreshold,
          cacheHit,
          fallbackReason: 'No documents retrieved above similarity threshold',
        };
      }

      // Stage 2: Generate enhanced response with timeout
      const generationStart = Date.now();
      const generationPromise = ragResponseGenerator.generateEnhancedResponse({
        disease: {
          name: primaryDisease.name,
          scientificName: primaryDisease.scientificName,
          type: primaryDisease.type,
          severity: primaryDisease.severity,
          confidence: primaryDisease.confidence,
          symptoms: diagnosisResult.symptoms,
          affectedParts: primaryDisease.affectedParts,
        },
        cropType,
        retrievedDocuments: retrievalResponse.documents,
        location,
        language,
      });

      const generationTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Generation timeout')), RAG_GENERATION_TIMEOUT);
      });

      let enhancedResponse: EnhancedDiagnosisResponse;
      try {
        enhancedResponse = await Promise.race([generationPromise, generationTimeoutPromise]);
      } catch (error) {
        generationTimeMs = Date.now() - generationStart;
        return {
          success: false,
          retrievalTimeMs,
          generationTimeMs,
          documentsRetrieved,
          similarityThreshold,
          cacheHit,
          fallbackReason: error instanceof Error ? error.message : 'Generation failed',
        };
      }

      generationTimeMs = enhancedResponse.generationTimeMs;

      return {
        success: true,
        enhancedResponse,
        retrievalTimeMs,
        generationTimeMs,
        documentsRetrieved,
        similarityThreshold,
        cacheHit,
      };
    } catch (error) {
      console.error('[DiagnosisService] RAG enhancement error:', error);
      return {
        success: false,
        retrievalTimeMs,
        generationTimeMs,
        documentsRetrieved,
        similarityThreshold,
        cacheHit,
        fallbackReason: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Merge basic remedies with RAG-enhanced remedies
   * 
   * Strategy:
   * - Keep all basic remedies as baseline
   * - Add RAG-enhanced remedies that aren't duplicates
   * - Prefer RAG-enhanced versions when duplicates exist (higher confidence)
   * 
   * @param basicRemedies - Basic remedies from remedy generator
   * @param enhancedResponse - RAG-enhanced response with citations
   * @returns Merged remedies with best of both
   */
  private mergeRemedies(
    basicRemedies: RemedyResponse,
    enhancedResponse: EnhancedDiagnosisResponse
  ): RemedyResponse {
    // Merge chemical treatments
    const chemicalMap = new Map<string, any>();
    
    // Add basic chemical treatments
    basicRemedies.chemical.forEach(chem => {
      chemicalMap.set(chem.name.toLowerCase(), {
        ...chem,
        citationIds: [],
        confidence: 50, // Default confidence for basic remedies
        source: 'basic', // Mark as basic
      });
    });

    // Add or replace with RAG-enhanced chemical treatments
    enhancedResponse.chemicalTreatments.forEach(chem => {
      const key = chem.name.toLowerCase();
      // Always prefer RAG remedies when they exist (they have citations)
      chemicalMap.set(key, {
        name: chem.name,
        genericName: chem.activeIngredient,
        brandNames: [], // RAG doesn't provide brand names
        dosage: chem.dosage,
        applicationMethod: chem.applicationMethod,
        frequency: chem.frequency,
        duration: undefined,
        preHarvestInterval: 0, // RAG doesn't provide PHI
        safetyPrecautions: chem.precautions,
        estimatedCost: 'Varies', // RAG doesn't provide cost
        citationIds: chem.citationIds,
        confidence: chem.confidence,
        source: 'rag', // Mark as RAG-enhanced
      });
    });

    // Merge organic treatments
    const organicMap = new Map<string, any>();
    
    // Add basic organic treatments
    basicRemedies.organic.forEach(org => {
      organicMap.set(org.name.toLowerCase(), {
        ...org,
        citationIds: [],
        confidence: 50,
        source: 'basic', // Mark as basic
      });
    });

    // Add or replace with RAG-enhanced organic treatments
    enhancedResponse.organicTreatments.forEach(org => {
      const key = org.name.toLowerCase();
      // Always prefer RAG remedies when they exist (they have citations)
      organicMap.set(key, {
        name: org.name,
        ingredients: org.ingredients,
        preparation: [org.preparation], // Convert string to array
        applicationMethod: org.applicationMethod,
        frequency: org.frequency,
        effectiveness: org.effectivenessRate ? `${org.effectivenessRate}%` : 'Moderate',
        commercialProducts: [],
        citationIds: org.citationIds,
        confidence: org.confidence,
        source: 'rag', // Mark as RAG-enhanced
      });
    });

    // Merge preventive measures
    const preventiveMap = new Map<string, any>();
    
    // Add basic preventive measures
    basicRemedies.preventive.forEach(prev => {
      preventiveMap.set(prev.description.toLowerCase(), {
        ...prev,
        citationIds: [],
        confidence: 50,
        source: 'basic', // Mark as basic
      });
    });

    // Add or replace with RAG-enhanced preventive measures
    enhancedResponse.preventiveMeasures.forEach(prev => {
      const key = prev.measure.toLowerCase();
      // Always prefer RAG remedies when they exist (they have citations)
      preventiveMap.set(key, {
        category: 'crop_rotation' as const, // Default category
        description: prev.description,
        timing: prev.timing,
        frequency: undefined,
        citationIds: prev.citationIds,
        confidence: prev.confidence,
        source: 'rag', // Mark as RAG-enhanced
      });
    });

    // Use RAG regional/seasonal notes if available, otherwise keep basic
    const regionalNotes = enhancedResponse.regionalNotes || basicRemedies.regionalNotes;
    const seasonalNotes = enhancedResponse.seasonalNotes || basicRemedies.seasonalNotes;

    return {
      chemical: Array.from(chemicalMap.values()),
      organic: Array.from(organicMap.values()),
      preventive: Array.from(preventiveMap.values()),
      regionalNotes,
      seasonalNotes,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Default Diagnosis Service instance
 */
export const diagnosisService = new DiagnosisService();
