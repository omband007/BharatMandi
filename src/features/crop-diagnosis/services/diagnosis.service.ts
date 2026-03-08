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
import type { ImageAnalysisResult } from './nova-vision.service';
import type { RemedyResponse } from './remedy-generator.service';

// ============================================================================
// CONSTANTS
// ============================================================================

const CONFIDENCE_THRESHOLD = 80; // Requirement 3.2: Expert review required if <80%
const END_TO_END_TIMEOUT = 3000; // Requirement 12.6: <3000ms target

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
    }>;
    organic: Array<{
      name: string;
      ingredients: string[];
      preparation: string[];
      applicationMethod: string;
      frequency: string;
      effectiveness: string;
      commercialProducts?: string[];
    }>;
    preventive: Array<{
      category: 'crop_rotation' | 'irrigation' | 'spacing' | 'soil_health' | 'timing';
      description: string;
      timing?: string;
      frequency?: string;
    }>;
    regionalNotes?: string;
    seasonalNotes?: string;
  };
  expertReviewRequired: boolean;
  expertReviewId?: string;
  imageUrl: string;
  timestamp: Date;
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
        metadata: {
          cacheHit,
          processingTimeMs: totalTime,
          stages
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
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Default Diagnosis Service instance
 */
export const diagnosisService = new DiagnosisService();
