/**
 * Comprehensive Error Handling for Crop Disease Diagnosis
 * 
 * Provides centralized error types, error response formatting, and logging utilities
 * for all diagnosis services.
 * 
 * Requirements:
 * - 1.5: Return specific error messages for validation failures
 * - 2.4: Handle Bedrock API errors (throttling, timeout, network)
 */

// ============================================================================
// ERROR CODES
// ============================================================================

export enum DiagnosisErrorCode {
  // Client errors (4xx) - User/input issues
  INVALID_IMAGE_FORMAT = 'INVALID_IMAGE_FORMAT',
  IMAGE_TOO_LARGE = 'IMAGE_TOO_LARGE',
  IMAGE_TOO_SMALL = 'IMAGE_TOO_SMALL',
  POOR_IMAGE_QUALITY = 'POOR_IMAGE_QUALITY',
  INVALID_DIMENSIONS = 'INVALID_DIMENSIONS',
  MISSING_IMAGE = 'MISSING_IMAGE',
  INVALID_LOCATION = 'INVALID_LOCATION',
  INVALID_LANGUAGE = 'INVALID_LANGUAGE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  
  // Server errors (5xx) - Infrastructure/service issues
  BEDROCK_UNAVAILABLE = 'BEDROCK_UNAVAILABLE',
  BEDROCK_THROTTLING = 'BEDROCK_THROTTLING',
  BEDROCK_TIMEOUT = 'BEDROCK_TIMEOUT',
  BEDROCK_NETWORK_ERROR = 'BEDROCK_NETWORK_ERROR',
  BEDROCK_AUTHENTICATION_ERROR = 'BEDROCK_AUTHENTICATION_ERROR',
  BEDROCK_INVALID_RESPONSE = 'BEDROCK_INVALID_RESPONSE',
  S3_UPLOAD_FAILED = 'S3_UPLOAD_FAILED',
  S3_DOWNLOAD_FAILED = 'S3_DOWNLOAD_FAILED',
  S3_DELETE_FAILED = 'S3_DELETE_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  TRANSLATION_FAILED = 'TRANSLATION_FAILED',
  
  // Business logic errors - Diagnosis-specific issues
  NO_CROP_DETECTED = 'NO_CROP_DETECTED',
  MULTIPLE_CROPS_DETECTED = 'MULTIPLE_CROPS_DETECTED',
  CONFIDENCE_TOO_LOW = 'CONFIDENCE_TOO_LOW',
  NO_DISEASE_DETECTED = 'NO_DISEASE_DETECTED',
  REMEDY_GENERATION_FAILED = 'REMEDY_GENERATION_FAILED',
  KNOWLEDGE_BASE_ERROR = 'KNOWLEDGE_BASE_ERROR',
  EXPERT_ESCALATION_FAILED = 'EXPERT_ESCALATION_FAILED',
  HISTORY_SAVE_FAILED = 'HISTORY_SAVE_FAILED',
  
  // Generic errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// ============================================================================
// ERROR RESPONSE INTERFACE
// ============================================================================

export interface ErrorResponse {
  error: {
    code: DiagnosisErrorCode | string;
    message: string;
    details?: any;
    retryable: boolean;
    retryGuidance?: string;
  };
  timestamp: Date;
  requestId?: string;
}

// ============================================================================
// ERROR CONTEXT FOR LOGGING
// ============================================================================

export interface ErrorContext {
  userId?: string;
  diagnosisId?: string;
  requestId?: string;
  service: string;
  operation: string;
  stage?: string;
  duration?: number;
  attempt?: number;
  finalAttempt?: boolean;
  delay?: number;
  error?: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// BASE DIAGNOSIS ERROR CLASS
// ============================================================================

export class DiagnosisError extends Error {
  public readonly code: DiagnosisErrorCode | string;
  public readonly retryable: boolean;
  public readonly httpStatus: number;
  public readonly details?: any;
  public readonly retryGuidance?: string;
  public readonly context?: ErrorContext;

  constructor(
    message: string,
    code: DiagnosisErrorCode | string,
    retryable: boolean,
    httpStatus: number = 500,
    details?: any,
    retryGuidance?: string,
    context?: ErrorContext
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.retryable = retryable;
    this.httpStatus = httpStatus;
    this.details = details;
    this.retryGuidance = retryGuidance;
    this.context = context;

    // Maintains proper stack trace (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to API response format
   */
  toJSON(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        retryable: this.retryable,
        retryGuidance: this.retryGuidance,
      },
      timestamp: new Date(),
      requestId: this.context?.requestId,
    };
  }

  /**
   * Get log-friendly representation with full context
   */
  toLogObject() {
    return {
      error: {
        name: this.name,
        code: this.code,
        message: this.message,
        retryable: this.retryable,
        httpStatus: this.httpStatus,
        details: this.details,
        stack: this.stack,
      },
      context: this.context,
      // timestamp is included in context if needed, not duplicated here
    };
  }
}

// ============================================================================
// CLIENT ERROR CLASSES (4xx)
// ============================================================================

export class ImageValidationError extends DiagnosisError {
  constructor(message: string, details?: any, context?: ErrorContext) {
    super(
      message,
      DiagnosisErrorCode.INVALID_IMAGE_FORMAT,
      false, // Not retryable - user must fix input
      400,
      details,
      'Please upload a valid JPEG, PNG, or WebP image that meets the size and quality requirements.',
      context
    );
  }
}

export class ImageTooLargeError extends DiagnosisError {
  constructor(sizeBytes: number, maxSizeBytes: number, context?: ErrorContext) {
    super(
      `Image size ${(sizeBytes / 1024 / 1024).toFixed(2)}MB exceeds maximum ${(maxSizeBytes / 1024 / 1024).toFixed(2)}MB`,
      DiagnosisErrorCode.IMAGE_TOO_LARGE,
      false,
      400,
      { sizeBytes, maxSizeBytes },
      'Please compress the image or use a smaller file.',
      context
    );
  }
}

export class ImageTooSmallError extends DiagnosisError {
  constructor(sizeBytes: number, minSizeBytes: number, context?: ErrorContext) {
    super(
      `Image size ${(sizeBytes / 1024).toFixed(2)}KB is below minimum ${(minSizeBytes / 1024).toFixed(2)}KB`,
      DiagnosisErrorCode.IMAGE_TOO_SMALL,
      false,
      400,
      { sizeBytes, minSizeBytes },
      'Please upload a higher quality image.',
      context
    );
  }
}

export class PoorImageQualityError extends DiagnosisError {
  constructor(qualityIssues: string[], suggestions: string[], context?: ErrorContext) {
    super(
      `Image quality is insufficient for accurate diagnosis: ${qualityIssues.join(', ')}`,
      DiagnosisErrorCode.POOR_IMAGE_QUALITY,
      true, // Retryable - user can take a better photo
      400,
      { qualityIssues, suggestions },
      `Please retake the photo: ${suggestions.join('; ')}`,
      context
    );
  }
}

export class RateLimitError extends DiagnosisError {
  constructor(limit: number, windowMs: number, retryAfter: number, context?: ErrorContext) {
    super(
      `Rate limit exceeded: maximum ${limit} requests per ${windowMs / 1000 / 60} minutes`,
      DiagnosisErrorCode.RATE_LIMIT_EXCEEDED,
      true,
      429,
      { limit, windowMs, retryAfter },
      `Please wait ${Math.ceil(retryAfter / 1000 / 60)} minutes before trying again.`,
      context
    );
  }
}

// ============================================================================
// SERVER ERROR CLASSES (5xx)
// ============================================================================

export class S3UploadError extends DiagnosisError {
  constructor(message: string, details?: any, context?: ErrorContext) {
    super(
      `Failed to upload image to storage: ${message}`,
      DiagnosisErrorCode.S3_UPLOAD_FAILED,
      true, // Retryable - might be transient
      500,
      details,
      'Please try again in a few moments.',
      context
    );
  }
}

export class S3DownloadError extends DiagnosisError {
  constructor(key: string, details?: any, context?: ErrorContext) {
    super(
      `Failed to retrieve image from storage: ${key}`,
      DiagnosisErrorCode.S3_DOWNLOAD_FAILED,
      true,
      500,
      { key, ...details },
      'Please try again in a few moments.',
      context
    );
  }
}

export class DatabaseError extends DiagnosisError {
  constructor(operation: string, details?: any, context?: ErrorContext) {
    super(
      `Database operation failed: ${operation}`,
      DiagnosisErrorCode.DATABASE_ERROR,
      true, // Retryable - might be transient
      500,
      { operation, ...details },
      'Please try again in a few moments.',
      context
    );
  }
}

export class CacheError extends DiagnosisError {
  constructor(operation: string, details?: any, context?: ErrorContext) {
    super(
      `Cache operation failed: ${operation}`,
      DiagnosisErrorCode.CACHE_ERROR,
      false, // Not retryable - proceed without cache
      500,
      { operation, ...details },
      undefined,
      context
    );
  }
}

export class TranslationError extends DiagnosisError {
  constructor(language: string, details?: any, context?: ErrorContext) {
    super(
      `Translation to ${language} failed`,
      DiagnosisErrorCode.TRANSLATION_FAILED,
      false, // Not retryable - will return English
      500,
      { language, ...details },
      'Results will be provided in English.',
      context
    );
  }
}

// ============================================================================
// BUSINESS LOGIC ERROR CLASSES
// ============================================================================

export class NoCropDetectedError extends DiagnosisError {
  constructor(confidence: number, suggestions: string[], context?: ErrorContext) {
    super(
      'No crop detected in the image',
      DiagnosisErrorCode.NO_CROP_DETECTED,
      true, // Retryable - user can take a better photo
      400,
      { confidence, suggestions },
      `Please ensure the crop is clearly visible: ${suggestions.join('; ')}`,
      context
    );
  }
}

export class LowConfidenceError extends DiagnosisError {
  constructor(
    confidence: number,
    threshold: number,
    expertReviewId?: string,
    context?: ErrorContext
  ) {
    super(
      `Diagnosis confidence ${confidence}% is below threshold ${threshold}%`,
      DiagnosisErrorCode.CONFIDENCE_TOO_LOW,
      false, // Not retryable - expert review required
      200, // Still return 200 with results
      { confidence, threshold, expertReviewId },
      expertReviewId
        ? `Expert review has been requested (ID: ${expertReviewId}). You will be notified when complete.`
        : 'Expert review is recommended for this diagnosis.',
      context
    );
  }
}

export class RemedyGenerationError extends DiagnosisError {
  constructor(disease: string, details?: any, context?: ErrorContext) {
    super(
      `Failed to generate remedies for ${disease}`,
      DiagnosisErrorCode.REMEDY_GENERATION_FAILED,
      false, // Not retryable - knowledge base issue
      500,
      { disease, ...details },
      'Diagnosis is available but remedy recommendations could not be generated.',
      context
    );
  }
}

export class ExpertEscalationError extends DiagnosisError {
  constructor(details?: any, context?: ErrorContext) {
    super(
      'Failed to create expert review request',
      DiagnosisErrorCode.EXPERT_ESCALATION_FAILED,
      false, // Not retryable - but diagnosis can proceed
      500,
      details,
      'Diagnosis is available but expert review could not be requested.',
      context
    );
  }
}

// ============================================================================
// ERROR LOGGING UTILITY
// ============================================================================

export class ErrorLogger {
  /**
   * Log error with full context
   */
  static logError(error: Error | DiagnosisError, context?: ErrorContext): void {
    if (error instanceof DiagnosisError) {
      const logObject = {
        level: 'error',
        ...error.toLogObject(),
      };
      
      console.error('[DiagnosisError]', JSON.stringify(logObject, null, 2));
      
      // In production, send to monitoring service (CloudWatch, Datadog, etc.)
      // await monitoringService.logError(logObject);
    } else {
      const timestamp = new Date().toISOString();
      const logObject = {
        timestamp,
        level: 'error',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        context,
      };
      
      console.error('[Error]', JSON.stringify(logObject, null, 2));
      
      // In production, send to monitoring service
      // await monitoringService.logError(logObject);
    }
  }

  /**
   * Log warning with context
   */
  static logWarning(message: string, context?: ErrorContext): void {
    const logObject = {
      timestamp: new Date().toISOString(),
      level: 'warning',
      message,
      context,
    };
    
    console.warn('[Warning]', JSON.stringify(logObject, null, 2));
  }

  /**
   * Log info with context
   */
  static logInfo(message: string, context?: ErrorContext): void {
    const logObject = {
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
    };
    
    console.log('[Info]', JSON.stringify(logObject, null, 2));
  }
}

// ============================================================================
// ERROR HANDLER UTILITY
// ============================================================================

export class ErrorHandler {
  /**
   * Convert any error to DiagnosisError
   */
  static toDiagnosisError(
    error: any,
    defaultCode: DiagnosisErrorCode = DiagnosisErrorCode.UNKNOWN_ERROR,
    context?: ErrorContext
  ): DiagnosisError {
    // Already a DiagnosisError
    if (error instanceof DiagnosisError) {
      return error;
    }

    // Standard Error
    if (error instanceof Error) {
      return new DiagnosisError(
        error.message,
        defaultCode,
        false,
        500,
        { originalError: error.name },
        undefined,
        context
      );
    }

    // Unknown error type
    return new DiagnosisError(
      'An unknown error occurred',
      defaultCode,
      false,
      500,
      { originalError: String(error) },
      undefined,
      context
    );
  }

  /**
   * Handle error and return appropriate response
   */
  static handleError(error: any, context?: ErrorContext): ErrorResponse {
    const diagnosisError = this.toDiagnosisError(error, DiagnosisErrorCode.UNKNOWN_ERROR, context);
    
    // Log the error
    ErrorLogger.logError(diagnosisError, context);
    
    // Return formatted response
    return diagnosisError.toJSON();
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: any): boolean {
    if (error instanceof DiagnosisError) {
      return error.retryable;
    }
    return false;
  }

  /**
   * Get HTTP status code from error
   */
  static getHttpStatus(error: any): number {
    if (error instanceof DiagnosisError) {
      return error.httpStatus;
    }
    return 500;
  }
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isDiagnosisError(error: any): error is DiagnosisError {
  return error instanceof DiagnosisError;
}

export function isRetryableError(error: any): boolean {
  return isDiagnosisError(error) && error.retryable;
}
