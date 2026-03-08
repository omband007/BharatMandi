# Bedrock API Error Handling

This directory contains custom error classes and error handling logic for AWS Bedrock API interactions in the Crop Disease Diagnosis feature.

## Overview

The error handling system provides:

1. **Custom Error Classes**: Specific error types for different failure scenarios
2. **Automatic Error Mapping**: AWS SDK errors are automatically mapped to custom error classes
3. **Retry Logic Integration**: Errors are classified as retryable or non-retryable
4. **User-Friendly Messages**: Clear, actionable error messages for farmers
5. **Error Context Preservation**: Original error information is preserved in details

## Error Classes

### BedrockError (Base Class)

Base class for all Bedrock-related errors. Provides:
- `code`: Error code (e.g., 'BEDROCK_THROTTLING')
- `message`: Human-readable error message
- `retryable`: Boolean indicating if operation should be retried
- `details`: Additional error context
- `toJSON()`: Serialize error to API response format

### BedrockThrottlingError

**Code**: `BEDROCK_THROTTLING`  
**Retryable**: Yes  
**Cause**: Request rate exceeds service limits  
**Action**: Automatically retried with exponential backoff

AWS SDK Errors Mapped:
- ThrottlingException
- TooManyRequestsException
- ProvisionedThroughputExceededException

### BedrockTimeoutError

**Code**: `BEDROCK_TIMEOUT`  
**Retryable**: Yes  
**Cause**: API call exceeds configured timeout (2000ms)  
**Action**: Automatically retried

AWS SDK Errors Mapped:
- TimeoutError
- Messages containing "timeout" or "timed out"

### BedrockValidationError

**Code**: `BEDROCK_VALIDATION_ERROR`  
**Retryable**: No  
**Cause**: Invalid request parameters  
**Action**: Client must fix request parameters

AWS SDK Errors Mapped:
- ValidationException
- InvalidParameterException
- InvalidRequestException

### BedrockAuthenticationError

**Code**: `BEDROCK_AUTHENTICATION_ERROR`  
**Retryable**: No  
**Cause**: Invalid AWS credentials or insufficient permissions  
**Action**: Fix AWS credentials or IAM permissions

AWS SDK Errors Mapped:
- AccessDeniedException
- UnauthorizedException
- ForbiddenException

### BedrockNetworkError

**Code**: `BEDROCK_NETWORK_ERROR`  
**Retryable**: Yes  
**Cause**: Network connectivity issues  
**Action**: Automatically retried

AWS SDK Errors Mapped:
- NetworkError, NetworkingError
- ECONNRESET, ECONNREFUSED, ETIMEDOUT, ENOTFOUND

### BedrockServiceUnavailableError

**Code**: `BEDROCK_SERVICE_UNAVAILABLE`  
**Retryable**: Yes  
**Cause**: Bedrock service temporarily unavailable  
**Action**: Automatically retried

AWS SDK Errors Mapped:
- ServiceUnavailable
- InternalServerError

### BedrockModelNotFoundError

**Code**: `BEDROCK_MODEL_NOT_FOUND`  
**Retryable**: No  
**Cause**: Specified model ID doesn't exist or isn't accessible  
**Action**: Fix model ID in configuration

AWS SDK Errors Mapped:
- ResourceNotFoundException
- Messages containing "model" and "not found"

### BedrockInvalidResponseError

**Code**: `BEDROCK_INVALID_RESPONSE`  
**Retryable**: Yes  
**Cause**: Bedrock returns unexpected or malformed response  
**Action**: Automatically retried (may be transient)

Thrown When:
- Response is not valid JSON
- Required fields are missing
- Field types are incorrect

### BedrockUnknownError

**Code**: `BEDROCK_UNKNOWN_ERROR`  
**Retryable**: No  
**Cause**: Unclassified error  
**Action**: Conservative approach - don't retry unknown errors

## Usage

### Automatic Error Mapping

Errors from AWS SDK are automatically mapped to custom error classes:

```typescript
import { NovaVisionService } from './services/nova-vision.service';

const service = new NovaVisionService();

try {
  const result = await service.analyzeImage(request);
} catch (error) {
  // Error is automatically mapped to appropriate BedrockError subclass
  if (error instanceof BedrockThrottlingError) {
    console.log('Rate limited - will be retried automatically');
  } else if (error instanceof BedrockValidationError) {
    console.log('Invalid request - fix parameters');
  }
}
```

### Manual Error Mapping

You can manually map AWS SDK errors:

```typescript
import { mapAwsErrorToBedrockError } from './errors/bedrock.errors';

try {
  // AWS SDK call
} catch (awsError) {
  const bedrockError = mapAwsErrorToBedrockError(awsError);
  console.log(`Error code: ${bedrockError.code}`);
  console.log(`Retryable: ${bedrockError.retryable}`);
}
```

### Error Type Checking

```typescript
import { isBedrockError, isRetryableBedrockError } from './errors/bedrock.errors';

if (isBedrockError(error)) {
  console.log(`Bedrock error: ${error.code}`);
  
  if (isRetryableBedrockError(error)) {
    console.log('This error will be retried');
  }
}
```

### Error Serialization

Convert errors to API response format:

```typescript
const error = new BedrockThrottlingError('Rate limit exceeded');
const response = error.toJSON();

// Response format:
// {
//   error: {
//     code: 'BEDROCK_THROTTLING',
//     message: 'Rate limit exceeded',
//     details: { ... },
//     retryable: true
//   },
//   timestamp: Date
// }
```

## Integration with Retry Logic

The error handling system integrates with the retry utility (`retry.util.ts`):

1. **Error Classification**: Errors are automatically classified as retryable or non-retryable
2. **Retry Handler**: The `bedrockErrorHandler` checks the `retryable` flag
3. **Exponential Backoff**: Retryable errors are retried with exponential backoff
4. **Max Attempts**: Maximum 3 attempts for retryable errors

```typescript
import { retryBedrockCall } from './utils/retry.util';

// Automatically retries throttling, timeout, and network errors
const result = await retryBedrockCall(() => bedrockClient.send(command));
```

## Error Response Format

All errors follow a consistent API response format:

```typescript
interface ErrorResponse {
  error: {
    code: string;           // Error code (e.g., 'BEDROCK_THROTTLING')
    message: string;        // Human-readable message
    details?: any;          // Additional context
    retryable: boolean;     // Whether client should retry
  };
  timestamp: Date;          // When error occurred
  requestId?: string;       // Optional request ID for tracking
}
```

## Testing

Comprehensive test coverage includes:

1. **Unit Tests** (`bedrock.errors.test.ts`):
   - All error class constructors
   - Error mapping logic
   - Type checking functions
   - JSON serialization

2. **Integration Tests** (`error-handling.integration.test.ts`):
   - End-to-end error handling flow
   - Retry behavior for each error type
   - Error context preservation

3. **Service Tests** (`nova-vision.service.test.ts`):
   - Error handling in Nova Vision Service
   - Error propagation through service layers

## Requirements Satisfied

- **3.7.1**: Handle throttling exceptions - ✅ BedrockThrottlingError with automatic retry
- **3.7.2**: Handle timeout errors - ✅ BedrockTimeoutError with automatic retry
- **3.7.3**: Handle validation errors - ✅ BedrockValidationError (non-retryable)
- **3.7.4**: Handle authentication errors - ✅ BedrockAuthenticationError (non-retryable)
- **1.5**: Return specific error messages - ✅ All errors have clear, specific messages

## Best Practices

1. **Always use custom error classes**: Don't throw generic Error objects
2. **Preserve error context**: Include original error information in details
3. **Provide actionable messages**: Tell users what went wrong and how to fix it
4. **Set retryable flag correctly**: Only retry transient errors
5. **Log errors with context**: Include request ID, user ID, and timing information

## Future Enhancements

Potential improvements:

1. **Error Metrics**: Track error rates by type for monitoring
2. **Circuit Breaker**: Stop retrying after sustained failures
3. **Custom Retry Strategies**: Different retry logic per error type
4. **Error Recovery**: Automatic fallback strategies for certain errors
5. **User Notifications**: Proactive notifications for non-retryable errors
