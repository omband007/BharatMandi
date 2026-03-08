/**
 * Unit tests for Bedrock Error Classes
 * 
 * Tests custom error handling for Bedrock API failures.
 */

import {
  BedrockError,
  BedrockThrottlingError,
  BedrockTimeoutError,
  BedrockValidationError,
  BedrockAuthenticationError,
  BedrockNetworkError,
  BedrockServiceUnavailableError,
  BedrockModelNotFoundError,
  BedrockInvalidResponseError,
  BedrockUnknownError,
  BedrockErrorCode,
  mapAwsErrorToBedrockError,
  isBedrockError,
  isRetryableBedrockError,
} from '../bedrock.errors';

describe('Bedrock Error Classes', () => {
  describe('BedrockError (Base Class)', () => {
    it('should create error with all properties', () => {
      const error = new BedrockError('Test message', 'TEST_CODE', true, { key: 'value' });

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.retryable).toBe(true);
      expect(error.details).toEqual({ key: 'value' });
      expect(error.name).toBe('BedrockError');
    });

    it('should convert to JSON format', () => {
      const error = new BedrockError('Test message', 'TEST_CODE', false, { detail: 'info' });
      const json = error.toJSON();

      expect(json).toHaveProperty('error');
      expect(json.error.code).toBe('TEST_CODE');
      expect(json.error.message).toBe('Test message');
      expect(json.error.details).toEqual({ detail: 'info' });
      expect(json.error.retryable).toBe(false);
      expect(json).toHaveProperty('timestamp');
      expect(json.timestamp).toBeInstanceOf(Date);
    });

    it('should maintain proper stack trace', () => {
      const error = new BedrockError('Test', 'CODE', true);
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('BedrockError');
    });
  });

  describe('BedrockThrottlingError', () => {
    it('should create throttling error with default message', () => {
      const error = new BedrockThrottlingError();

      expect(error).toBeInstanceOf(BedrockError);
      expect(error.code).toBe('BEDROCK_THROTTLING');
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('Request rate exceeded');
    });

    it('should create throttling error with custom message', () => {
      const error = new BedrockThrottlingError('Custom throttling message');

      expect(error.message).toBe('Custom throttling message');
      expect(error.code).toBe('BEDROCK_THROTTLING');
      expect(error.retryable).toBe(true);
    });

    it('should include details', () => {
      const error = new BedrockThrottlingError('Throttled', { limit: 100 });

      expect(error.details).toEqual({ limit: 100 });
    });
  });

  describe('BedrockTimeoutError', () => {
    it('should create timeout error with timeout value', () => {
      const error = new BedrockTimeoutError(2000);

      expect(error).toBeInstanceOf(BedrockError);
      expect(error.code).toBe('BEDROCK_TIMEOUT');
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('2000ms');
      expect(error.details.timeoutMs).toBe(2000);
    });

    it('should include additional details', () => {
      const error = new BedrockTimeoutError(3000, { attempt: 2 });

      expect(error.details.timeoutMs).toBe(3000);
      expect(error.details.attempt).toBe(2);
    });
  });

  describe('BedrockValidationError', () => {
    it('should create validation error', () => {
      const error = new BedrockValidationError('Invalid parameter');

      expect(error).toBeInstanceOf(BedrockError);
      expect(error.code).toBe('BEDROCK_VALIDATION_ERROR');
      expect(error.retryable).toBe(false);
      expect(error.message).toBe('Invalid parameter');
    });

    it('should not be retryable', () => {
      const error = new BedrockValidationError('Validation failed');

      expect(error.retryable).toBe(false);
    });
  });

  describe('BedrockAuthenticationError', () => {
    it('should create authentication error with default message', () => {
      const error = new BedrockAuthenticationError();

      expect(error).toBeInstanceOf(BedrockError);
      expect(error.code).toBe('BEDROCK_AUTHENTICATION_ERROR');
      expect(error.retryable).toBe(false);
      expect(error.message).toContain('Authentication failed');
    });

    it('should create authentication error with custom message', () => {
      const error = new BedrockAuthenticationError('Access denied');

      expect(error.message).toBe('Access denied');
      expect(error.retryable).toBe(false);
    });
  });

  describe('BedrockNetworkError', () => {
    it('should create network error with default message', () => {
      const error = new BedrockNetworkError();

      expect(error).toBeInstanceOf(BedrockError);
      expect(error.code).toBe('BEDROCK_NETWORK_ERROR');
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('Network error');
    });

    it('should be retryable', () => {
      const error = new BedrockNetworkError('Connection refused');

      expect(error.retryable).toBe(true);
    });
  });

  describe('BedrockServiceUnavailableError', () => {
    it('should create service unavailable error', () => {
      const error = new BedrockServiceUnavailableError();

      expect(error).toBeInstanceOf(BedrockError);
      expect(error.code).toBe('BEDROCK_SERVICE_UNAVAILABLE');
      expect(error.retryable).toBe(true);
      expect(error.message).toContain('temporarily unavailable');
    });
  });

  describe('BedrockModelNotFoundError', () => {
    it('should create model not found error', () => {
      const error = new BedrockModelNotFoundError('amazon.nova-pro-v1:0');

      expect(error).toBeInstanceOf(BedrockError);
      expect(error.code).toBe('BEDROCK_MODEL_NOT_FOUND');
      expect(error.retryable).toBe(false);
      expect(error.message).toContain('amazon.nova-pro-v1:0');
      expect(error.details.modelId).toBe('amazon.nova-pro-v1:0');
    });
  });

  describe('BedrockInvalidResponseError', () => {
    it('should create invalid response error', () => {
      const error = new BedrockInvalidResponseError('Malformed JSON');

      expect(error).toBeInstanceOf(BedrockError);
      expect(error.code).toBe('BEDROCK_INVALID_RESPONSE');
      expect(error.retryable).toBe(true);
      expect(error.message).toBe('Malformed JSON');
    });
  });

  describe('BedrockUnknownError', () => {
    it('should create unknown error from original error', () => {
      const originalError = new Error('Something went wrong');
      const error = new BedrockUnknownError(originalError);

      expect(error).toBeInstanceOf(BedrockError);
      expect(error.code).toBe('BEDROCK_UNKNOWN_ERROR');
      expect(error.retryable).toBe(false);
      expect(error.message).toContain('Something went wrong');
      expect(error.details.originalError).toBe('Something went wrong');
    });
  });

  describe('mapAwsErrorToBedrockError', () => {
    it('should map ThrottlingException to BedrockThrottlingError', () => {
      const awsError = {
        name: 'ThrottlingException',
        message: 'Rate exceeded',
        code: 'ThrottlingException',
      };

      const error = mapAwsErrorToBedrockError(awsError);

      expect(error).toBeInstanceOf(BedrockThrottlingError);
      expect(error.retryable).toBe(true);
    });

    it('should map TooManyRequestsException to BedrockThrottlingError', () => {
      const awsError = {
        name: 'TooManyRequestsException',
        message: 'Too many requests',
      };

      const error = mapAwsErrorToBedrockError(awsError);

      expect(error).toBeInstanceOf(BedrockThrottlingError);
    });

    it('should map timeout errors to BedrockTimeoutError', () => {
      const awsError = {
        name: 'TimeoutError',
        message: 'Request timed out',
      };

      const error = mapAwsErrorToBedrockError(awsError);

      expect(error).toBeInstanceOf(BedrockTimeoutError);
      expect(error.retryable).toBe(true);
    });

    it('should map timeout message to BedrockTimeoutError', () => {
      const awsError = {
        name: 'Error',
        message: 'Connection timed out after 2000ms',
      };

      const error = mapAwsErrorToBedrockError(awsError);

      expect(error).toBeInstanceOf(BedrockTimeoutError);
    });

    it('should map ValidationException to BedrockValidationError', () => {
      const awsError = {
        name: 'ValidationException',
        message: 'Invalid input',
      };

      const error = mapAwsErrorToBedrockError(awsError);

      expect(error).toBeInstanceOf(BedrockValidationError);
      expect(error.retryable).toBe(false);
    });

    it('should map InvalidParameterException to BedrockValidationError', () => {
      const awsError = {
        name: 'InvalidParameterException',
        message: 'Parameter is invalid',
      };

      const error = mapAwsErrorToBedrockError(awsError);

      expect(error).toBeInstanceOf(BedrockValidationError);
    });

    it('should map AccessDeniedException to BedrockAuthenticationError', () => {
      const awsError = {
        name: 'AccessDeniedException',
        message: 'Access denied',
        code: 'AccessDeniedException',
      };

      const error = mapAwsErrorToBedrockError(awsError);

      expect(error).toBeInstanceOf(BedrockAuthenticationError);
      expect(error.retryable).toBe(false);
    });

    it('should map UnauthorizedException to BedrockAuthenticationError', () => {
      const awsError = {
        name: 'UnauthorizedException',
        message: 'Unauthorized',
      };

      const error = mapAwsErrorToBedrockError(awsError);

      expect(error).toBeInstanceOf(BedrockAuthenticationError);
    });

    it('should map network errors to BedrockNetworkError', () => {
      const awsError = {
        name: 'NetworkError',
        message: 'Network failure',
        code: 'ECONNRESET',
      };

      const error = mapAwsErrorToBedrockError(awsError);

      expect(error).toBeInstanceOf(BedrockNetworkError);
      expect(error.retryable).toBe(true);
    });

    it('should map ECONNREFUSED to BedrockNetworkError', () => {
      const awsError = {
        name: 'Error',
        message: 'Connection refused',
        code: 'ECONNREFUSED',
      };

      const error = mapAwsErrorToBedrockError(awsError);

      expect(error).toBeInstanceOf(BedrockNetworkError);
    });

    it('should map ServiceUnavailable to BedrockServiceUnavailableError', () => {
      const awsError = {
        name: 'ServiceUnavailable',
        message: 'Service is unavailable',
        code: 'ServiceUnavailable',
      };

      const error = mapAwsErrorToBedrockError(awsError);

      expect(error).toBeInstanceOf(BedrockServiceUnavailableError);
      expect(error.retryable).toBe(true);
    });

    it('should map ResourceNotFoundException to BedrockModelNotFoundError', () => {
      const awsError = {
        name: 'ResourceNotFoundException',
        message: 'Model not found',
      };

      const error = mapAwsErrorToBedrockError(awsError);

      expect(error).toBeInstanceOf(BedrockModelNotFoundError);
      expect(error.retryable).toBe(false);
    });

    it('should map unknown errors to BedrockUnknownError', () => {
      const awsError = {
        name: 'UnknownException',
        message: 'Something unexpected happened',
      };

      const error = mapAwsErrorToBedrockError(awsError);

      expect(error).toBeInstanceOf(BedrockUnknownError);
      expect(error.retryable).toBe(false);
    });

    it('should handle errors without name property', () => {
      const awsError = {
        message: 'Error without name',
      };

      const error = mapAwsErrorToBedrockError(awsError);

      expect(error).toBeInstanceOf(BedrockUnknownError);
    });

    it('should handle errors without message property', () => {
      const awsError = {
        name: 'SomeError',
      };

      const error = mapAwsErrorToBedrockError(awsError);

      expect(error).toBeInstanceOf(BedrockUnknownError);
      expect(error.message).toContain('Bedrock API error');
    });
  });

  describe('isBedrockError', () => {
    it('should return true for BedrockError instances', () => {
      const error = new BedrockError('Test', 'CODE', true);

      expect(isBedrockError(error)).toBe(true);
    });

    it('should return true for BedrockThrottlingError', () => {
      const error = new BedrockThrottlingError();

      expect(isBedrockError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('Regular error');

      expect(isBedrockError(error)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isBedrockError({})).toBe(false);
      expect(isBedrockError(null)).toBe(false);
      expect(isBedrockError(undefined)).toBe(false);
      expect(isBedrockError('error')).toBe(false);
    });
  });

  describe('isRetryableBedrockError', () => {
    it('should return true for retryable errors', () => {
      const error = new BedrockThrottlingError();

      expect(isRetryableBedrockError(error)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const error = new BedrockValidationError('Invalid');

      expect(isRetryableBedrockError(error)).toBe(false);
    });

    it('should return false for regular errors', () => {
      const error = new Error('Regular error');

      expect(isRetryableBedrockError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isRetryableBedrockError(null)).toBe(false);
      expect(isRetryableBedrockError(undefined)).toBe(false);
      expect(isRetryableBedrockError({})).toBe(false);
    });
  });

  describe('BedrockErrorCode enum', () => {
    it('should have all error codes defined', () => {
      expect(BedrockErrorCode.THROTTLING).toBe('BEDROCK_THROTTLING');
      expect(BedrockErrorCode.TIMEOUT).toBe('BEDROCK_TIMEOUT');
      expect(BedrockErrorCode.VALIDATION).toBe('BEDROCK_VALIDATION_ERROR');
      expect(BedrockErrorCode.AUTHENTICATION).toBe('BEDROCK_AUTHENTICATION_ERROR');
      expect(BedrockErrorCode.NETWORK).toBe('BEDROCK_NETWORK_ERROR');
      expect(BedrockErrorCode.SERVICE_UNAVAILABLE).toBe('BEDROCK_SERVICE_UNAVAILABLE');
      expect(BedrockErrorCode.MODEL_NOT_FOUND).toBe('BEDROCK_MODEL_NOT_FOUND');
      expect(BedrockErrorCode.INVALID_RESPONSE).toBe('BEDROCK_INVALID_RESPONSE');
      expect(BedrockErrorCode.UNKNOWN).toBe('BEDROCK_UNKNOWN_ERROR');
    });
  });

  describe('Error Inheritance', () => {
    it('should maintain instanceof relationships', () => {
      const throttlingError = new BedrockThrottlingError();

      expect(throttlingError instanceof BedrockThrottlingError).toBe(true);
      expect(throttlingError instanceof BedrockError).toBe(true);
      expect(throttlingError instanceof Error).toBe(true);
    });

    it('should have correct constructor names', () => {
      expect(new BedrockThrottlingError().name).toBe('BedrockThrottlingError');
      expect(new BedrockTimeoutError(2000).name).toBe('BedrockTimeoutError');
      expect(new BedrockValidationError('test').name).toBe('BedrockValidationError');
      expect(new BedrockAuthenticationError().name).toBe('BedrockAuthenticationError');
      expect(new BedrockNetworkError().name).toBe('BedrockNetworkError');
    });
  });

  describe('Error Details', () => {
    it('should preserve original error information', () => {
      const awsError = {
        name: 'ThrottlingException',
        message: 'Rate limit exceeded',
        code: 'ThrottlingException',
      };

      const error = mapAwsErrorToBedrockError(awsError);

      expect(error.details).toBeDefined();
      expect(error.details.originalError).toBe('ThrottlingException');
    });

    it('should allow adding custom details', () => {
      const error = new BedrockThrottlingError('Throttled', {
        requestId: '12345',
        retryAfter: 30,
      });

      expect(error.details.requestId).toBe('12345');
      expect(error.details.retryAfter).toBe(30);
    });
  });
});
