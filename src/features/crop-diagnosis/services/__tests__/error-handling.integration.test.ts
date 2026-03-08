/**
 * Integration tests for Bedrock API error handling
 * 
 * Tests the complete error handling flow from Nova Vision Service
 * through retry logic to custom error classes.
 * 
 * Requirements:
 * - 3.7.1: Handle throttling exceptions
 * - 3.7.2: Handle timeout errors
 * - 3.7.3: Handle validation errors
 * - 3.7.4: Handle authentication errors
 */

import { NovaVisionService, ImageAnalysisRequest } from '../nova-vision.service';
import { getBedrockClientForModel } from '../bedrock.service';
import {
  BedrockThrottlingError,
  BedrockTimeoutError,
  BedrockValidationError,
  BedrockAuthenticationError,
  BedrockNetworkError,
  BedrockServiceUnavailableError,
  BedrockInvalidResponseError,
  BedrockUnknownError,
} from '../../errors/bedrock.errors';

// Mock the Bedrock service
jest.mock('../bedrock.service');

describe('Bedrock API Error Handling Integration', () => {
  let service: NovaVisionService;
  let mockBedrockClient: any;

  const validRequest: ImageAnalysisRequest = {
    imageBuffer: Buffer.from('fake-image-data'),
    imageFormat: 'jpeg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NovaVisionService();
    mockBedrockClient = {
      send: jest.fn(),
    };
    (getBedrockClientForModel as jest.Mock).mockReturnValue(mockBedrockClient);
  });

  describe('Throttling Exception Handling (3.7.1)', () => {
    it('should map ThrottlingException to BedrockThrottlingError', async () => {
      const throttlingError = {
        name: 'ThrottlingException',
        message: 'Rate limit exceeded',
        code: 'ThrottlingException',
      };

      mockBedrockClient.send.mockRejectedValue(throttlingError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BedrockThrottlingError);
        expect((error as BedrockThrottlingError).retryable).toBe(true);
        expect((error as BedrockThrottlingError).code).toBe('BEDROCK_THROTTLING');
      }
    });

    it('should map TooManyRequestsException to BedrockThrottlingError', async () => {
      const tooManyRequestsError = {
        name: 'TooManyRequestsException',
        message: 'Too many requests',
      };

      mockBedrockClient.send.mockRejectedValue(tooManyRequestsError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BedrockThrottlingError);
        expect((error as BedrockThrottlingError).retryable).toBe(true);
      }
    });

    it('should mark throttling errors as retryable', async () => {
      const throttlingError = {
        name: 'ProvisionedThroughputExceededException',
        message: 'Provisioned throughput exceeded',
      };

      mockBedrockClient.send.mockRejectedValue(throttlingError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect((error as BedrockThrottlingError).retryable).toBe(true);
      }
    });
  });

  describe('Timeout Error Handling (3.7.2)', () => {
    it('should map timeout errors to BedrockTimeoutError', async () => {
      const timeoutError = {
        name: 'TimeoutError',
        message: 'Request timed out',
      };

      mockBedrockClient.send.mockRejectedValue(timeoutError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BedrockTimeoutError);
        expect((error as BedrockTimeoutError).retryable).toBe(true);
        expect((error as BedrockTimeoutError).code).toBe('BEDROCK_TIMEOUT');
      }
    });

    it('should map timeout messages to BedrockTimeoutError', async () => {
      const timeoutError = {
        name: 'Error',
        message: 'Connection timed out after 2000ms',
      };

      mockBedrockClient.send.mockRejectedValue(timeoutError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BedrockTimeoutError);
        expect((error as BedrockTimeoutError).retryable).toBe(true);
      }
    });

    it('should mark timeout errors as retryable', async () => {
      const timeoutError = {
        name: 'TimeoutError',
        message: 'Timeout',
      };

      mockBedrockClient.send.mockRejectedValue(timeoutError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect((error as BedrockTimeoutError).retryable).toBe(true);
      }
    });
  });

  describe('Validation Error Handling (3.7.3)', () => {
    it('should map ValidationException to BedrockValidationError', async () => {
      const validationError = {
        name: 'ValidationException',
        message: 'Invalid parameter: maxTokens must be positive',
      };

      mockBedrockClient.send.mockRejectedValue(validationError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BedrockValidationError);
        expect((error as BedrockValidationError).retryable).toBe(false);
        expect((error as BedrockValidationError).code).toBe('BEDROCK_VALIDATION_ERROR');
      }
    });

    it('should map InvalidParameterException to BedrockValidationError', async () => {
      const invalidParamError = {
        name: 'InvalidParameterException',
        message: 'Parameter is invalid',
      };

      mockBedrockClient.send.mockRejectedValue(invalidParamError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BedrockValidationError);
        expect((error as BedrockValidationError).retryable).toBe(false);
      }
    });

    it('should NOT retry validation errors', async () => {
      const validationError = {
        name: 'ValidationException',
        message: 'Invalid input',
      };

      mockBedrockClient.send.mockRejectedValue(validationError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect((error as BedrockValidationError).retryable).toBe(false);
      }
    });
  });

  describe('Authentication Error Handling (3.7.4)', () => {
    it('should map AccessDeniedException to BedrockAuthenticationError', async () => {
      const accessDeniedError = {
        name: 'AccessDeniedException',
        message: 'Access denied to model',
        code: 'AccessDeniedException',
      };

      mockBedrockClient.send.mockRejectedValue(accessDeniedError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BedrockAuthenticationError);
        expect((error as BedrockAuthenticationError).retryable).toBe(false);
        expect((error as BedrockAuthenticationError).code).toBe('BEDROCK_AUTHENTICATION_ERROR');
      }
    });

    it('should map UnauthorizedException to BedrockAuthenticationError', async () => {
      const unauthorizedError = {
        name: 'UnauthorizedException',
        message: 'Unauthorized',
      };

      mockBedrockClient.send.mockRejectedValue(unauthorizedError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BedrockAuthenticationError);
        expect((error as BedrockAuthenticationError).retryable).toBe(false);
      }
    });

    it('should NOT retry authentication errors', async () => {
      const authError = {
        name: 'ForbiddenException',
        message: 'Forbidden',
      };

      mockBedrockClient.send.mockRejectedValue(authError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect((error as BedrockAuthenticationError).retryable).toBe(false);
      }
    });
  });

  describe('Network Error Handling', () => {
    it('should map network errors to BedrockNetworkError', async () => {
      const networkError = {
        name: 'NetworkError',
        message: 'Network failure',
        code: 'ECONNRESET',
      };

      mockBedrockClient.send.mockRejectedValue(networkError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BedrockNetworkError);
        expect((error as BedrockNetworkError).retryable).toBe(true);
        expect((error as BedrockNetworkError).code).toBe('BEDROCK_NETWORK_ERROR');
      }
    });

    it('should map ECONNREFUSED to BedrockNetworkError', async () => {
      const connRefusedError = {
        name: 'Error',
        message: 'Connection refused',
        code: 'ECONNREFUSED',
      };

      mockBedrockClient.send.mockRejectedValue(connRefusedError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BedrockNetworkError);
        expect((error as BedrockNetworkError).retryable).toBe(true);
      }
    });

    it('should mark network errors as retryable', async () => {
      const networkError = {
        name: 'NetworkingError',
        message: 'Network issue',
        code: 'ETIMEDOUT',
      };

      mockBedrockClient.send.mockRejectedValue(networkError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect((error as BedrockNetworkError).retryable).toBe(true);
      }
    });
  });

  describe('Service Unavailable Error Handling', () => {
    it('should map ServiceUnavailable to BedrockServiceUnavailableError', async () => {
      const serviceUnavailableError = {
        name: 'ServiceUnavailable',
        message: 'Service is unavailable',
        code: 'ServiceUnavailable',
      };

      mockBedrockClient.send.mockRejectedValue(serviceUnavailableError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BedrockServiceUnavailableError);
        expect((error as BedrockServiceUnavailableError).retryable).toBe(true);
        expect((error as BedrockServiceUnavailableError).code).toBe('BEDROCK_SERVICE_UNAVAILABLE');
      }
    });

    it('should mark service unavailable errors as retryable', async () => {
      const serviceError = {
        name: 'InternalServerError',
        message: 'Internal server error',
      };

      mockBedrockClient.send.mockRejectedValue(serviceError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect((error as BedrockServiceUnavailableError).retryable).toBe(true);
      }
    });
  });

  describe('Invalid Response Error Handling', () => {
    it('should throw BedrockInvalidResponseError for malformed JSON', async () => {
      mockBedrockClient.send.mockResolvedValue({
        output: {
          message: {
            content: [
              {
                text: 'Not valid JSON',
              },
            ],
          },
        },
      });

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BedrockInvalidResponseError);
        expect((error as BedrockInvalidResponseError).retryable).toBe(true);
        expect((error as BedrockInvalidResponseError).code).toBe('BEDROCK_INVALID_RESPONSE');
      }
    });

    it('should throw BedrockInvalidResponseError for missing fields', async () => {
      mockBedrockClient.send.mockResolvedValue({
        output: {
          message: {
            content: [
              {
                text: JSON.stringify({
                  cropType: 'wheat',
                  // Missing required fields
                }),
              },
            ],
          },
        },
      });

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BedrockInvalidResponseError);
        expect((error as BedrockInvalidResponseError).retryable).toBe(true);
      }
    });

    it('should include error details for invalid responses', async () => {
      mockBedrockClient.send.mockResolvedValue({
        output: {
          message: {
            content: [
              {
                text: 'Invalid response',
              },
            ],
          },
        },
      });

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect((error as BedrockInvalidResponseError).details).toBeDefined();
        expect((error as BedrockInvalidResponseError).details.responsePreview).toBeDefined();
      }
    });
  });

  describe('Unknown Error Handling', () => {
    it('should map unknown errors to BedrockUnknownError', async () => {
      const unknownError = {
        name: 'UnknownException',
        message: 'Something unexpected happened',
      };

      mockBedrockClient.send.mockRejectedValue(unknownError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(BedrockUnknownError);
        expect((error as BedrockUnknownError).retryable).toBe(false);
        expect((error as BedrockUnknownError).code).toBe('BEDROCK_UNKNOWN_ERROR');
      }
    });

    it('should NOT retry unknown errors by default', async () => {
      const unknownError = {
        name: 'WeirdError',
        message: 'Weird error',
      };

      mockBedrockClient.send.mockRejectedValue(unknownError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect((error as BedrockUnknownError).retryable).toBe(false);
      }
    });
  });

  describe('Error JSON Serialization', () => {
    it('should serialize errors to JSON format', async () => {
      const throttlingError = {
        name: 'ThrottlingException',
        message: 'Rate limit exceeded',
      };

      mockBedrockClient.send.mockRejectedValue(throttlingError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        const json = (error as BedrockThrottlingError).toJSON();
        
        expect(json).toHaveProperty('error');
        expect(json.error.code).toBe('BEDROCK_THROTTLING');
        expect(json.error.retryable).toBe(true);
        expect(json).toHaveProperty('timestamp');
      }
    });
  });

  describe('Error Context Preservation', () => {
    it('should preserve original error information in details', async () => {
      const originalError = {
        name: 'ThrottlingException',
        message: 'Rate exceeded',
        code: 'ThrottlingException',
      };

      mockBedrockClient.send.mockRejectedValue(originalError);

      try {
        await service.analyzeImage(validRequest);
        fail('Should have thrown error');
      } catch (error) {
        expect((error as BedrockThrottlingError).details).toBeDefined();
        expect((error as BedrockThrottlingError).details.originalError).toBe('ThrottlingException');
      }
    });
  });
});
