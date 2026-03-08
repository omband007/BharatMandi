/**
 * Retry Utility for Crop Disease Diagnosis
 * 
 * Implements exponential backoff with jitter for handling transient failures
 * from AWS Bedrock API and other external services.
 * 
 * Requirements:
 * - 2.4: Handle timeouts and retries for Bedrock API
 * - 13.1: Retry logic for network failures
 */

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (including initial attempt) */
  maxAttempts: number;
  /** Base delay in milliseconds before first retry */
  baseDelayMs: number;
  /** Maximum delay in milliseconds between retries */
  maxDelayMs: number;
  /** Multiplier for exponential backoff (typically 2) */
  backoffMultiplier: number;
  /** Whether to add jitter to prevent thundering herd */
  enableJitter: boolean;
}

/**
 * Error handler function to determine if an error is retryable
 * @param error - The error that occurred
 * @param attempt - Current attempt number (1-indexed)
 * @returns true if the operation should be retried, false otherwise
 */
export type ErrorHandler = (error: Error, attempt: number) => boolean;

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  /** The successful result, if operation succeeded */
  result?: T;
  /** The final error, if all attempts failed */
  error?: Error;
  /** Number of attempts made */
  attempts: number;
  /** Total time spent including delays (ms) */
  totalTimeMs: number;
  /** Whether the operation succeeded */
  success: boolean;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Default retry configuration for Bedrock API calls
 * Based on design document specifications
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  enableJitter: true,
};

/**
 * Retry configuration for network operations
 * More aggressive retries for transient network issues
 */
export const NETWORK_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  enableJitter: true,
};

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

/**
 * AWS SDK throttling exception names
 */
const THROTTLING_EXCEPTIONS = [
  'ThrottlingException',
  'TooManyRequestsException',
  'ProvisionedThroughputExceededException',
  'RequestLimitExceeded',
  'ServiceUnavailable',
];

/**
 * Network-related error indicators
 */
const NETWORK_ERROR_INDICATORS = [
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'NetworkError',
  'NetworkingError',
  'TimeoutError',
  'socket hang up',
];

/**
 * Non-retryable error types (validation, authentication, etc.)
 */
const NON_RETRYABLE_EXCEPTIONS = [
  'ValidationException',
  'InvalidParameterException',
  'AccessDeniedException',
  'UnauthorizedException',
  'ForbiddenException',
  'ResourceNotFoundException',
  'InvalidRequestException',
];

/**
 * Check if an error is a throttling error from AWS
 * 
 * @param error - Error to check
 * @returns true if error is throttling-related
 */
export function isThrottlingError(error: Error): boolean {
  const errorName = error.name || '';
  const errorMessage = error.message || '';
  
  // Check if error name matches throttling exceptions
  if (THROTTLING_EXCEPTIONS.some((exception) => errorName.includes(exception))) {
    return true;
  }
  
  // Check if error message contains throttling keywords
  const throttlingKeywords = ['throttl', 'rate limit', 'too many requests'];
  return throttlingKeywords.some((keyword) =>
    errorMessage.toLowerCase().includes(keyword)
  );
}

/**
 * Check if an error is a network error
 * 
 * @param error - Error to check
 * @returns true if error is network-related
 */
export function isNetworkError(error: Error): boolean {
  const errorMessage = error.message || '';
  const errorCode = (error as any).code || '';
  
  return NETWORK_ERROR_INDICATORS.some(
    (indicator) =>
      errorMessage.includes(indicator) || errorCode.includes(indicator)
  );
}

/**
 * Check if an error is retryable
 * 
 * @param error - Error to check
 * @returns true if error should be retried
 */
export function isRetryableError(error: Error): boolean {
  const errorName = error.name || '';
  
  // Check if explicitly non-retryable
  if (NON_RETRYABLE_EXCEPTIONS.some((exception) => errorName.includes(exception))) {
    return false;
  }
  
  // Retry throttling and network errors
  return isThrottlingError(error) || isNetworkError(error);
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Calculate delay for next retry attempt using exponential backoff
 * 
 * @param attempt - Current attempt number (1-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds before next retry
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig
): number {
  // Calculate exponential delay: baseDelay * (multiplier ^ (attempt - 1))
  const exponentialDelay =
    config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  
  // Cap at maximum delay
  let delay = Math.min(exponentialDelay, config.maxDelayMs);
  
  // Add jitter to prevent thundering herd
  if (config.enableJitter) {
    // Jitter: random value between 0 and delay
    // This spreads out retry attempts from multiple clients
    delay = Math.random() * delay;
  }
  
  return Math.floor(delay);
}

/**
 * Sleep for specified milliseconds
 * 
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 * 
 * @param operation - Async function to retry
 * @param config - Retry configuration
 * @param errorHandler - Optional function to determine if error is retryable
 * @returns Promise with the operation result
 * @throws The last error if all retry attempts fail
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  errorHandler?: ErrorHandler
): Promise<T> {
  const startTime = Date.now();
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      // Attempt the operation
      const result = await operation();
      
      // Success! Log if this was a retry
      if (attempt > 1) {
        console.log(
          `[Retry] Operation succeeded on attempt ${attempt}/${config.maxAttempts}`
        );
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      
      // Check if we should retry
      const shouldRetry = errorHandler
        ? errorHandler(lastError, attempt)
        : isRetryableError(lastError);
      
      // If this is the last attempt or error is not retryable, throw
      if (attempt >= config.maxAttempts || !shouldRetry) {
        console.error(
          `[Retry] Operation failed after ${attempt} attempt(s): ${lastError.message}`
        );
        throw lastError;
      }
      
      // Calculate delay for next attempt
      const delay = calculateBackoffDelay(attempt, config);
      
      console.log(
        `[Retry] Attempt ${attempt}/${config.maxAttempts} failed: ${lastError.message}. ` +
        `Retrying in ${delay}ms...`
      );
      
      // Wait before next attempt
      await sleep(delay);
    }
  }
  
  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Retry failed with unknown error');
}

/**
 * Retry an async operation and return detailed result
 * Does not throw on failure, returns error in result object
 * 
 * @param operation - Async function to retry
 * @param config - Retry configuration
 * @param errorHandler - Optional function to determine if error is retryable
 * @returns Promise with detailed retry result
 */
export async function retryWithResult<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  errorHandler?: ErrorHandler
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let attempts = 0;
  
  try {
    const result = await retryWithBackoff(operation, config, errorHandler);
    attempts = config.maxAttempts; // Estimate (we don't track in retryWithBackoff)
    
    return {
      result,
      success: true,
      attempts,
      totalTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      error: error as Error,
      success: false,
      attempts: config.maxAttempts,
      totalTimeMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Default error handler for Bedrock API calls
 * Retries on throttling and network errors only
 * 
 * @param error - Error that occurred
 * @param attempt - Current attempt number
 * @returns true if should retry
 */
export function bedrockErrorHandler(error: Error, attempt: number): boolean {
  // Check if it's a custom Bedrock error with retryable flag
  if ('retryable' in error && typeof (error as any).retryable === 'boolean') {
    return (error as any).retryable;
  }
  
  // Always retry throttling errors
  if (isThrottlingError(error)) {
    return true;
  }
  
  // Retry network errors
  if (isNetworkError(error)) {
    return true;
  }
  
  // Check for timeout errors
  if (error.message.includes('timeout') || error.message.includes('timed out')) {
    return true;
  }
  
  // Don't retry other errors (validation, auth, etc.)
  return false;
}

/**
 * Retry a Bedrock API call with appropriate configuration
 * 
 * @param operation - Bedrock API operation to retry
 * @returns Promise with operation result
 */
export async function retryBedrockCall<T>(
  operation: () => Promise<T>
): Promise<T> {
  return retryWithBackoff(operation, DEFAULT_RETRY_CONFIG, bedrockErrorHandler);
}
