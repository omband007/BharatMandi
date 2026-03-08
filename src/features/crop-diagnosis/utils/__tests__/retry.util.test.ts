/**
 * Unit tests for Retry Utility
 * 
 * Tests retry logic, exponential backoff, jitter, and error classification
 */

import {
  retryWithBackoff,
  retryWithResult,
  retryBedrockCall,
  calculateBackoffDelay,
  isThrottlingError,
  isNetworkError,
  isRetryableError,
  bedrockErrorHandler,
  DEFAULT_RETRY_CONFIG,
  NETWORK_RETRY_CONFIG,
  RetryConfig,
} from '../retry.util';

// ============================================================================
// MOCK HELPERS
// ============================================================================

/**
 * Create a mock operation that fails N times then succeeds
 */
function createMockOperation<T>(
  failCount: number,
  successValue: T,
  errorToThrow: Error
): jest.Mock<Promise<T>> {
  let callCount = 0;
  return jest.fn(async () => {
    callCount++;
    if (callCount <= failCount) {
      throw errorToThrow;
    }
    return successValue;
  });
}

/**
 * Create a throttling error
 */
function createThrottlingError(): Error {
  const error = new Error('Rate exceeded');
  error.name = 'ThrottlingException';
  return error;
}

/**
 * Create a network error
 */
function createNetworkError(): Error {
  const error = new Error('Connection reset');
  (error as any).code = 'ECONNRESET';
  return error;
}

/**
 * Create a validation error (non-retryable)
 */
function createValidationError(): Error {
  const error = new Error('Invalid parameter');
  error.name = 'ValidationException';
  return error;
}

/**
 * Create a timeout error
 */
function createTimeoutError(): Error {
  return new Error('Request timed out');
}

// ============================================================================
// ERROR CLASSIFICATION TESTS
// ============================================================================

describe('Error Classification', () => {
  describe('isThrottlingError', () => {
    it('should identify ThrottlingException', () => {
      const error = new Error('Rate limit exceeded');
      error.name = 'ThrottlingException';
      expect(isThrottlingError(error)).toBe(true);
    });

    it('should identify TooManyRequestsException', () => {
      const error = new Error('Too many requests');
      error.name = 'TooManyRequestsException';
      expect(isThrottlingError(error)).toBe(true);
    });

    it('should identify throttling in error message', () => {
      const error = new Error('Request was throttled by service');
      expect(isThrottlingError(error)).toBe(true);
    });

    it('should not identify non-throttling errors', () => {
      const error = new Error('Invalid parameter');
      error.name = 'ValidationException';
      expect(isThrottlingError(error)).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('should identify ECONNRESET', () => {
      const error = new Error('Connection reset');
      (error as any).code = 'ECONNRESET';
      expect(isNetworkError(error)).toBe(true);
    });

    it('should identify ETIMEDOUT', () => {
      const error = new Error('Connection timed out');
      (error as any).code = 'ETIMEDOUT';
      expect(isNetworkError(error)).toBe(true);
    });

    it('should identify NetworkError in message', () => {
      const error = new Error('NetworkError: Failed to fetch');
      expect(isNetworkError(error)).toBe(true);
    });

    it('should identify socket hang up', () => {
      const error = new Error('socket hang up');
      expect(isNetworkError(error)).toBe(true);
    });

    it('should not identify non-network errors', () => {
      const error = new Error('Invalid input');
      expect(isNetworkError(error)).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should mark throttling errors as retryable', () => {
      const error = createThrottlingError();
      expect(isRetryableError(error)).toBe(true);
    });

    it('should mark network errors as retryable', () => {
      const error = createNetworkError();
      expect(isRetryableError(error)).toBe(true);
    });

    it('should mark validation errors as non-retryable', () => {
      const error = createValidationError();
      expect(isRetryableError(error)).toBe(false);
    });

    it('should mark authentication errors as non-retryable', () => {
      const error = new Error('Access denied');
      error.name = 'AccessDeniedException';
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('bedrockErrorHandler', () => {
    it('should retry throttling errors', () => {
      const error = createThrottlingError();
      expect(bedrockErrorHandler(error, 1)).toBe(true);
    });

    it('should retry network errors', () => {
      const error = createNetworkError();
      expect(bedrockErrorHandler(error, 1)).toBe(true);
    });

    it('should retry timeout errors', () => {
      const error = createTimeoutError();
      expect(bedrockErrorHandler(error, 1)).toBe(true);
    });

    it('should not retry validation errors', () => {
      const error = createValidationError();
      expect(bedrockErrorHandler(error, 1)).toBe(false);
    });
  });
});

// ============================================================================
// BACKOFF CALCULATION TESTS
// ============================================================================

describe('Backoff Calculation', () => {
  const config: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 500,
    maxDelayMs: 5000,
    backoffMultiplier: 2,
    enableJitter: false,
  };

  describe('calculateBackoffDelay without jitter', () => {
    it('should calculate correct delay for attempt 1', () => {
      const delay = calculateBackoffDelay(1, config);
      expect(delay).toBe(500); // 500 * 2^0 = 500
    });

    it('should calculate correct delay for attempt 2', () => {
      const delay = calculateBackoffDelay(2, config);
      expect(delay).toBe(1000); // 500 * 2^1 = 1000
    });

    it('should calculate correct delay for attempt 3', () => {
      const delay = calculateBackoffDelay(3, config);
      expect(delay).toBe(2000); // 500 * 2^2 = 2000
    });

    it('should cap delay at maxDelayMs', () => {
      const delay = calculateBackoffDelay(10, config);
      expect(delay).toBe(5000); // Capped at maxDelayMs
    });
  });

  describe('calculateBackoffDelay with jitter', () => {
    const jitterConfig: RetryConfig = {
      ...config,
      enableJitter: true,
    };

    it('should add jitter to delay', () => {
      const delays = new Set<number>();
      
      // Generate multiple delays - they should vary due to jitter
      for (let i = 0; i < 10; i++) {
        const delay = calculateBackoffDelay(1, jitterConfig);
        delays.add(delay);
        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay).toBeLessThanOrEqual(500);
      }
      
      // With jitter, we should get different values
      expect(delays.size).toBeGreaterThan(1);
    });

    it('should keep jittered delay within bounds', () => {
      for (let attempt = 1; attempt <= 5; attempt++) {
        const delay = calculateBackoffDelay(attempt, jitterConfig);
        const maxExpected = Math.min(
          config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelayMs
        );
        
        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay).toBeLessThanOrEqual(maxExpected);
      }
    });
  });
});

// ============================================================================
// RETRY LOGIC TESTS
// ============================================================================

describe('Retry Logic', () => {
  const testConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 10, // Short delay for tests
    maxDelayMs: 100,
    backoffMultiplier: 2,
    enableJitter: false,
  };

  describe('retryWithBackoff', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn(async () => 'success');
      
      const result = await retryWithBackoff(operation, testConfig);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error and succeed', async () => {
      const operation = createMockOperation(2, 'success', createThrottlingError());
      
      const result = await retryWithBackoff(operation, testConfig);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3); // 2 failures + 1 success
    });

    it('should throw after max attempts', async () => {
      const error = createThrottlingError();
      const operation = jest.fn(async () => {
        throw error;
      });
      
      await expect(retryWithBackoff(operation, testConfig)).rejects.toThrow(
        'Rate exceeded'
      );
      
      expect(operation).toHaveBeenCalledTimes(3); // maxAttempts
    });

    it('should not retry non-retryable errors', async () => {
      const error = createValidationError();
      const operation = jest.fn(async () => {
        throw error;
      });
      
      await expect(retryWithBackoff(operation, testConfig)).rejects.toThrow(
        'Invalid parameter'
      );
      
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should use custom error handler', async () => {
      const error = new Error('Custom error');
      const operation = createMockOperation(1, 'success', error);
      
      // Custom handler that always retries
      const errorHandler = jest.fn(() => true);
      
      const result = await retryWithBackoff(operation, testConfig, errorHandler);
      
      expect(result).toBe('success');
      expect(errorHandler).toHaveBeenCalledWith(error, 1);
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should respect custom error handler that returns false', async () => {
      const error = new Error('Custom error');
      const operation = jest.fn(async () => {
        throw error;
      });
      
      // Custom handler that never retries
      const errorHandler = jest.fn(() => false);
      
      await expect(
        retryWithBackoff(operation, testConfig, errorHandler)
      ).rejects.toThrow('Custom error');
      
      expect(errorHandler).toHaveBeenCalledWith(error, 1);
      expect(operation).toHaveBeenCalledTimes(1); // No retries
    });

    it('should wait between retries', async () => {
      const operation = createMockOperation(2, 'success', createNetworkError());
      const startTime = Date.now();
      
      await retryWithBackoff(operation, testConfig);
      
      const elapsed = Date.now() - startTime;
      
      // Should have waited at least baseDelay + (baseDelay * multiplier)
      // = 10ms + 20ms = 30ms
      expect(elapsed).toBeGreaterThanOrEqual(25); // Allow some margin
    });
  });

  describe('retryWithResult', () => {
    it('should return success result', async () => {
      const operation = jest.fn(async () => 'success');
      
      const result = await retryWithResult(operation, testConfig);
      
      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.error).toBeUndefined();
      expect(result.totalTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return error result on failure', async () => {
      const error = createThrottlingError();
      const operation = jest.fn(async () => {
        throw error;
      });
      
      const result = await retryWithResult(operation, testConfig);
      
      expect(result.success).toBe(false);
      expect(result.result).toBeUndefined();
      expect(result.error).toBe(error);
      expect(result.attempts).toBe(testConfig.maxAttempts);
      expect(result.totalTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('retryBedrockCall', () => {
    it('should retry Bedrock throttling errors', async () => {
      const operation = createMockOperation(1, 'success', createThrottlingError());
      
      const result = await retryBedrockCall(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry Bedrock network errors', async () => {
      const operation = createMockOperation(1, 'success', createNetworkError());
      
      const result = await retryBedrockCall(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry timeout errors', async () => {
      const operation = createMockOperation(1, 'success', createTimeoutError());
      
      const result = await retryBedrockCall(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry validation errors', async () => {
      const error = createValidationError();
      const operation = jest.fn(async () => {
        throw error;
      });
      
      await expect(retryBedrockCall(operation)).rejects.toThrow('Invalid parameter');
      
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });
});

// ============================================================================
// CONFIGURATION TESTS
// ============================================================================

describe('Retry Configurations', () => {
  it('should have valid DEFAULT_RETRY_CONFIG', () => {
    expect(DEFAULT_RETRY_CONFIG.maxAttempts).toBe(3);
    expect(DEFAULT_RETRY_CONFIG.baseDelayMs).toBe(500);
    expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(5000);
    expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2);
    expect(DEFAULT_RETRY_CONFIG.enableJitter).toBe(true);
  });

  it('should have valid NETWORK_RETRY_CONFIG', () => {
    expect(NETWORK_RETRY_CONFIG.maxAttempts).toBe(3);
    expect(NETWORK_RETRY_CONFIG.baseDelayMs).toBe(1000);
    expect(NETWORK_RETRY_CONFIG.maxDelayMs).toBe(10000);
    expect(NETWORK_RETRY_CONFIG.backoffMultiplier).toBe(2);
    expect(NETWORK_RETRY_CONFIG.enableJitter).toBe(true);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  const testConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelayMs: 10,
    maxDelayMs: 100,
    backoffMultiplier: 2,
    enableJitter: false,
  };

  it('should handle operation that throws non-Error object', async () => {
    const operation = jest.fn(async () => {
      throw 'string error'; // eslint-disable-line no-throw-literal
    });
    
    await expect(retryWithBackoff(operation, testConfig)).rejects.toBe('string error');
  });

  it('should handle maxAttempts = 1 (no retries)', async () => {
    const config: RetryConfig = { ...testConfig, maxAttempts: 1 };
    const operation = jest.fn(async () => {
      throw createThrottlingError();
    });
    
    await expect(retryWithBackoff(operation, config)).rejects.toThrow();
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should handle very large backoff multiplier', async () => {
    const config: RetryConfig = {
      ...testConfig,
      backoffMultiplier: 10,
      maxDelayMs: 1000,
    };
    
    const delay = calculateBackoffDelay(3, config);
    expect(delay).toBe(1000); // Should be capped at maxDelayMs
  });

  it('should handle zero base delay', async () => {
    const config: RetryConfig = {
      ...testConfig,
      baseDelayMs: 0,
    };
    
    const operation = createMockOperation(1, 'success', createThrottlingError());
    const startTime = Date.now();
    
    await retryWithBackoff(operation, config);
    
    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(50); // Should be very fast with no delay
  });
});
