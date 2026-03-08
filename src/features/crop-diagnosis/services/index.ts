/**
 * Crop Diagnosis Services Export
 * 
 * Central export point for all crop diagnosis services.
 */

export {
  ImageValidator,
  imageValidator,
  type ValidationResult,
  type ImageFormat,
  type ImageMetadata,
  type QualityAssessment
} from './image-validator.service';

export {
  S3Service,
  s3Service,
  type UploadResult
} from './s3.service';

export {
  getBedrockClient,
  getRegionForModel,
  getBedrockClientForModel,
  clearBedrockClients,
  getClientPoolSize,
  isBedrockConfigured,
  DEFAULT_BEDROCK_CONFIG,
  type BedrockConfig
} from './bedrock.service';

export {
  RemedyGenerator,
  remedyGenerator,
  type Disease,
  type RemedyRequest,
  type ChemicalRemedy,
  type OrganicRemedy,
  type PreventiveMeasure,
  type RemedyResponse
} from './remedy-generator.service';

export {
  HistoryManager,
  historyManager,
  type SaveDiagnosisInput,
  type HistoryFilters,
  type PaginationOptions
} from './history-manager.service';

export {
  CacheService,
  cacheService,
  type CachedDiagnosis
} from './cache.service';

export {
  DiagnosisCacheService,
  diagnosisCacheService,
  type DiagnosisResult,
  type RemedyResult
} from './diagnosis-cache.service';

export {
  DiagnosisService,
  diagnosisService,
  type DiagnosisRequest,
  type DiagnosisResponse,
  type DiagnosisError
} from './diagnosis.service';

export {
  NovaVisionService,
  novaVisionService,
  type ImageAnalysisRequest,
  type ImageAnalysisResult
} from './nova-vision.service';

export {
  ExpertEscalationService,
  expertEscalationService,
  type CreateReviewRequestInput,
  type ReviewRequest,
  type ExpertReview
} from './expert-escalation.service';
