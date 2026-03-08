/**
 * Custom Error Classes for Bedrock API
 * 
 * Provides specific error types for different failure scenarios
 * in the Crop Disease Diagnosis feature.
 * 
 * Requirements:
 * - 1.5: Return specific error messages for validation failures
 * - 2.4: Handle timeouts and retries for Bedrock API
 */

/**
 * Base class for all Bedrock-related errors
 */
export class BedrockError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly details?: any;

  constructor(message: string, code: string, retryable: boolean, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.retryable = retryable;
    this.details = details;
    
    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to API response format
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        retryable: this.retryable,
      },
      timestamp: new Date(),
    };
  }
}

/**
 * Throttling exception from AWS Bedrock
 * Occurs when request rate exceeds service limits
 * Should be retried with exponential backoff
 */
export class BedrockThrottlingError extends BedrockError {
  constructor(message: string = 'Request rate exceeded. Please try again shortly.', details?: any) {
    super(
      message,
      'BEDROCK_THROTTLING',
      true, // Always retryable
      details
    );
  }
}

/**
 * Timeout error for Bedrock API calls
 * Occurs when API call exceeds configured timeout
 * Should be retried with potentially increased timeout
 */
export class BedrockTimeoutError extends BedrockError {
  constructor(timeoutMs: number, details?: any) {
    super(
      `Bedrock API call timed out after ${timeoutMs}ms`,
      'BEDROCK_TIMEOUT',
      true, // Retryable
      { timeoutMs, ...details }
    );
  }
}

/**
 * Validation error from Bedrock API
 * Occurs when request parameters are invalid
 * Should NOT be retried (client error)
 */
export class BedrockValidationError extends BedrockError {
  constructor(message: string, details?: any) {
    super(
      message,
      'BEDROCK_VALIDATION_ERROR',
      false, // Not retryable - client must fix request
      details
    );
  }
}

/**
 * Authentication/Authorization error from Bedrock API
 * Occurs when AWS credentials are invalid or insufficient permissions
 * Should NOT be retried (requires credential fix)
 */
export class BedrockAuthenticationError extends BedrockError {
  constructor(message: string = 'Authentication failed. Please check AWS credentials.', details?: any) {
    super(
      message,
      'BEDROCK_AUTHENTICATION_ERROR',
      false, // Not retryable - requires credential fix
      details
    );
  }
}

/**
 * Network error during Bedrock API call
 * Occurs when network connectivity issues prevent request
 * Should be retried
 */
export class BedrockNetworkError extends BedrockError {
  constructor(message: string = 'Network error occurred while calling Bedrock API', details?: any) {
    super(
      message,
      'BEDROCK_NETWORK_ERROR',
      true, // Retryable
      details
    );
  }
}

/**
 * Service unavailable error from Bedrock
 * Occurs when Bedrock service is temporarily unavailable
 * Should be retried
 */
export class BedrockServiceUnavailableError extends BedrockError {
  constructor(message: string = 'Bedrock service is temporarily unavailable', details?: any) {
    super(
      message,
      'BEDROCK_SERVICE_UNAVAILABLE',
      true, // Retryable
      details
    );
  }
}

/**
 * Model not found error
 * Occurs when specified model ID doesn't exist or isn't accessible
 * Should NOT be retried (configuration error)
 */
export class BedrockModelNotFoundError extends BedrockError {
  constructor(modelId: string, details?: any) {
    super(
      `Model '${modelId}' not found or not accessible`,
      'BEDROCK_MODEL_NOT_FOUND',
      false, // Not retryable - requires configuration fix
      { modelId, ...details }
    );
  }
}

/**
 * Invalid response error
 * Occurs when Bedrock returns unexpected or malformed response
 * May be retryable depending on cause
 */
export class BedrockInvalidResponseError extends BedrockError {
  constructor(message: string, details?: any) {
    super(
      message,
      'BEDROCK_INVALID_RESPONSE',
      true, // Retryable - might be transient
      details
    );
  }
}

/**
 * Generic Bedrock error for unclassified errors
 * Used as fallback when error type is unknown
 */
export class BedrockUnknownError extends BedrockError {
  constructor(originalError: Error, details?: any) {
    super(
      `Bedrock API error: ${originalError.message}`,
      'BEDROCK_UNKNOWN_ERROR',
      false, // Conservative: don't retry unknown errors
      { originalError: originalError.message, ...details }
    );
  }
}

/**
 * Error code enum for consistency
 */
export enum BedrockErrorCode {
  THROTTLING = 'BEDROCK_THROTTLING',
  TIMEOUT = 'BEDROCK_TIMEOUT',
  VALIDATION = 'BEDROCK_VALIDATION_ERROR',
  AUTHENTICATION = 'BEDROCK_AUTHENTICATION_ERROR',
  NETWORK = 'BEDROCK_NETWORK_ERROR',
  SERVICE_UNAVAILABLE = 'BEDROCK_SERVICE_UNAVAILABLE',
  MODEL_NOT_FOUND = 'BEDROCK_MODEL_NOT_FOUND',
  INVALID_RESPONSE = 'BEDROCK_INVALID_RESPONSE',
  UNKNOWN = 'BEDROCK_UNKNOWN_ERROR',
}

/**
 * Map AWS SDK error names to custom error classes
 * 
 * @param error - Original error from AWS SDK
 * @returns Custom BedrockError instance
 */
export function mapAwsErrorToBedrockError(error: any): BedrockError {
  const errorName = error.name || '';
  const errorMessage = error.message || 'Unknown error';
  const errorCode = error.code || '';

  // Throttling errors
  if (
    errorName.includes('ThrottlingException') ||
    errorName.includes('TooManyRequestsException') ||
    errorName.includes('ProvisionedThroughputExceededException') ||
    errorCode === 'ThrottlingException'
  ) {
    return new BedrockThrottlingError(errorMessage, { originalError: errorName });
  }

  // Timeout errors
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('timed out') ||
    errorName.includes('TimeoutError')
  ) {
    return new BedrockTimeoutError(2000, { originalError: errorName });
  }

  // Validation errors
  if (
    errorName.includes('ValidationException') ||
    errorName.includes('InvalidParameterException') ||
    errorName.includes('InvalidRequestException')
  ) {
    return new BedrockValidationError(errorMessage, { originalError: errorName });
  }

  // Authentication/Authorization errors
  if (
    errorName.includes('AccessDeniedException') ||
    errorName.includes('UnauthorizedException') ||
    errorName.includes('ForbiddenException') ||
    errorCode === 'AccessDeniedException'
  ) {
    return new BedrockAuthenticationError(errorMessage, { originalError: errorName });
  }

  // Network errors
  if (
    errorCode.includes('ECONNRESET') ||
    errorCode.includes('ECONNREFUSED') ||
    errorCode.includes('ETIMEDOUT') ||
    errorCode.includes('ENOTFOUND') ||
    errorName.includes('NetworkError') ||
    errorName.includes('NetworkingError')
  ) {
    return new BedrockNetworkError(errorMessage, { originalError: errorName });
  }

  // Service unavailable
  if (
    errorName.includes('ServiceUnavailable') ||
    errorName.includes('InternalServerError') ||
    errorCode === 'ServiceUnavailable'
  ) {
    return new BedrockServiceUnavailableError(errorMessage, { originalError: errorName });
  }

  // Model not found
  if (
    errorName.includes('ResourceNotFoundException') ||
    errorMessage.includes('model') && errorMessage.includes('not found')
  ) {
    return new BedrockModelNotFoundError('unknown', { originalError: errorName, message: errorMessage });
  }

  // Default to unknown error
  return new BedrockUnknownError(error);
}

/**
 * Check if an error is a Bedrock error
 */
export function isBedrockError(error: any): error is BedrockError {
  return error instanceof BedrockError;
}

/**
 * Check if an error is retryable
 */
export function isRetryableBedrockError(error: any): boolean {
  if (isBedrockError(error)) {
    return error.retryable;
  }
  return false;
}
