/**
 * Service Error Wrapper Utility
 * 
 * Provides consistent error handling wrappers for all diagnosis services.
 * Automatically catches errors, logs them with context, and converts to DiagnosisError.
 * 
 * Requirements:
 * - 1.5: Return specific error messages for validation failures
 * - 2.4: Handle Bedrock API errors with proper logging
 */

import {
  DiagnosisError,
  DiagnosisErrorCode,
  ErrorContext,
  ErrorLogger,
  ErrorHandler,
  S3UploadError,
  S3DownloadError,
  DatabaseError,
  CacheError,
  TranslationError,
  RemedyGenerationError,
  ExpertEscalationError,
} from '../errors/diagnosis.errors';
import {
  BedrockError,
  mapAwsErrorToBedrockError,
  isBedrockError,
} from '../errors/bedrock.errors';

// ============================================================================
// SERVICE ERROR WRAPPER
// ============================================================================

export class ServiceErrorWrapper {
  /**
   * Wrap a service operation with error handling
   * 
   * @param operation - Async function to execute
   * @param context - Error context for logging
   * @param errorMapper - Optional custom error mapper
   * @returns Result of operation or throws DiagnosisError
   */
  static async wrap<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    errorMapper?: (error: any) => DiagnosisError
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      
      // Log successful operation
      const duration = Date.now() - startTime;
      ErrorLogger.logInfo(`${context.operation} completed successfully`, {
        ...context,
        duration,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const contextWithDuration = { ...context, duration };
      
      // Use custom error mapper if provided
      if (errorMapper) {
        const diagnosisError = errorMapper(error);
        ErrorLogger.logError(diagnosisError, contextWithDuration);
        throw diagnosisError;
      }
      
      // Use default error handling
      const diagnosisError = ErrorHandler.toDiagnosisError(
        error,
        DiagnosisErrorCode.INTERNAL_SERVER_ERROR,
        contextWithDuration
      );
      
      ErrorLogger.logError(diagnosisError, contextWithDuration);
      throw diagnosisError;
    }
  }

  /**
   * Wrap S3 operations with specific error handling
   */
  static async wrapS3Operation<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: Partial<ErrorContext>
  ): Promise<T> {
    return this.wrap(
      operation,
      {
        service: 'S3Service',
        operation: operationName,
        ...context,
      },
      (error) => {
        if (operationName.includes('upload')) {
          return new S3UploadError(
            error.message || 'Upload failed',
            { originalError: error.name },
            { service: 'S3Service', operation: operationName, ...context }
          );
        } else if (operationName.includes('download') || operationName.includes('get')) {
          return new S3DownloadError(
            context.metadata?.key || 'unknown',
            { originalError: error.name },
            { service: 'S3Service', operation: operationName, ...context }
          );
        } else {
          return new DiagnosisError(
            `S3 operation failed: ${error.message}`,
            DiagnosisErrorCode.S3_UPLOAD_FAILED,
            true,
            500,
            { originalError: error.name },
            'Please try again in a few moments.',
            { service: 'S3Service', operation: operationName, ...context }
          );
        }
      }
    );
  }

  /**
   * Wrap Bedrock operations with specific error handling
   */
  static async wrapBedrockOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: Partial<ErrorContext>
  ): Promise<T> {
    return this.wrap(
      operation,
      {
        service: 'BedrockService',
        operation: operationName,
        ...context,
      },
      (error) => {
        // Map AWS errors to Bedrock errors
        if (!isBedrockError(error)) {
          const bedrockError = mapAwsErrorToBedrockError(error);
          
          // Convert BedrockError to DiagnosisError
          return new DiagnosisError(
            bedrockError.message,
            bedrockError.code,
            bedrockError.retryable,
            bedrockError.retryable ? 503 : 500,
            bedrockError.details,
            bedrockError.retryable ? 'Please try again in a few moments.' : undefined,
            { service: 'BedrockService', operation: operationName, ...context }
          );
        }
        
        // Already a BedrockError, convert to DiagnosisError
        return new DiagnosisError(
          error.message,
          error.code,
          error.retryable,
          error.retryable ? 503 : 500,
          error.details,
          error.retryable ? 'Please try again in a few moments.' : undefined,
          { service: 'BedrockService', operation: operationName, ...context }
        );
      }
    );
  }

  /**
   * Wrap database operations with specific error handling
   */
  static async wrapDatabaseOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: Partial<ErrorContext>
  ): Promise<T> {
    return this.wrap(
      operation,
      {
        service: 'DatabaseService',
        operation: operationName,
        ...context,
      },
      (error) => {
        return new DatabaseError(
          operationName,
          { originalError: error.message },
          { service: 'DatabaseService', operation: operationName, ...context }
        );
      }
    );
  }

  /**
   * Wrap cache operations with specific error handling
   * Note: Cache errors should not fail the operation, just log and continue
   */
  static async wrapCacheOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: Partial<ErrorContext>,
    fallbackValue: T
  ): Promise<T> {
    try {
      return await this.wrap(
        operation,
        {
          service: 'CacheService',
          operation: operationName,
          ...context,
        },
        (error) => {
          return new CacheError(
            operationName,
            { originalError: error.message },
            { service: 'CacheService', operation: operationName, ...context }
          );
        }
      );
    } catch (error) {
      // Cache errors should not fail the operation
      ErrorLogger.logWarning(
        `Cache operation failed, continuing without cache: ${operationName}`,
        { service: 'CacheService', operation: operationName, ...context }
      );
      return fallbackValue;
    }
  }

  /**
   * Wrap translation operations with specific error handling
   * Note: Translation errors should not fail the operation, return English
   */
  static async wrapTranslationOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    language: string,
    context: Partial<ErrorContext>,
    fallbackValue: T
  ): Promise<T> {
    try {
      return await this.wrap(
        operation,
        {
          service: 'TranslationService',
          operation: operationName,
          ...context,
        },
        (error) => {
          return new TranslationError(
            language,
            { originalError: error.message },
            { service: 'TranslationService', operation: operationName, ...context }
          );
        }
      );
    } catch (error) {
      // Translation errors should not fail the operation
      ErrorLogger.logWarning(
        `Translation to ${language} failed, returning English content`,
        { service: 'TranslationService', operation: operationName, ...context }
      );
      return fallbackValue;
    }
  }

  /**
   * Wrap remedy generation with specific error handling
   */
  static async wrapRemedyOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    disease: string,
    context: Partial<ErrorContext>
  ): Promise<T> {
    return this.wrap(
      operation,
      {
        service: 'RemedyGenerator',
        operation: operationName,
        ...context,
      },
      (error) => {
        return new RemedyGenerationError(
          disease,
          { originalError: error.message },
          { service: 'RemedyGenerator', operation: operationName, ...context }
        );
      }
    );
  }

  /**
   * Wrap expert escalation with specific error handling
   * Note: Expert escalation errors should not fail the diagnosis
   */
  static async wrapExpertEscalationOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: Partial<ErrorContext>,
    fallbackValue: T
  ): Promise<T> {
    try {
      return await this.wrap(
        operation,
        {
          service: 'ExpertEscalationService',
          operation: operationName,
          ...context,
        },
        (error) => {
          return new ExpertEscalationError(
            { originalError: error.message },
            { service: 'ExpertEscalationService', operation: operationName, ...context }
          );
        }
      );
    } catch (error) {
      // Expert escalation errors should not fail the diagnosis
      ErrorLogger.logWarning(
        `Expert escalation failed, diagnosis will proceed: ${operationName}`,
        { service: 'ExpertEscalationService', operation: operationName, ...context }
      );
      return fallbackValue;
    }
  }
}

// ============================================================================
// RETRY WRAPPER WITH ERROR HANDLING
// ============================================================================

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export class RetryWrapper {
  /**
   * Retry an operation with exponential backoff and error handling
   * 
   * @param operation - Async function to execute
   * @param config - Retry configuration
   * @param context - Error context for logging
   * @param shouldRetry - Optional function to determine if error is retryable
   * @returns Result of operation or throws DiagnosisError
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig,
    context: ErrorContext,
    shouldRetry?: (error: any, attempt: number) => boolean
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          ErrorLogger.logInfo(
            `${context.operation} succeeded on attempt ${attempt}`,
            { ...context, attempt }
          );
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        const isRetryable = shouldRetry
          ? shouldRetry(error, attempt)
          : ErrorHandler.isRetryable(error);
        
        if (!isRetryable || attempt >= config.maxAttempts) {
          ErrorLogger.logError(
            error instanceof Error ? error : new Error(String(error)),
            { ...context, attempt, finalAttempt: true }
          );
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelayMs
        );
        
        ErrorLogger.logWarning(
          `${context.operation} failed on attempt ${attempt}, retrying in ${delay}ms`,
          { ...context, attempt, delay, error: error instanceof Error ? error.message : String(error) }
        );
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Should never reach here, but TypeScript needs it
    throw lastError;
  }
}
