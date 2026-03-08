# Crop Diagnosis Utilities

This directory contains utility functions for the Crop Disease Diagnosis feature.

## Retry Utility (`retry.util.ts`)

Implements exponential backoff with jitter for handling transient failures from AWS Bedrock API and other external services.

### Features

- **Exponential Backoff**: Delays increase exponentially between retry attempts (base × 2^attempt)
- **Jitter**: Adds randomization to prevent thundering herd problem
- **Configurable**: Customizable max attempts, delays, and backoff multiplier
- **Error Classification**: Automatically identifies retryable vs non-retryable errors
- **AWS-Aware**: Handles AWS SDK throttling exceptions specifically

### Usage

#### Basic Retry with Default Configuration

```typescript
import { retryWithBackoff } from './utils/retry.util';

const result = await retryWithBackoff(async () => {
  return await someAsyncOperation();
});
```

#### Retry Bedrock API Calls

```typescript
import { retryBedrockCall } from './utils/retry.util';

const response = await retryBedrockCall(async () => {
  return await bedrockClient.send(command);
});
```

#### Custom Retry Configuration

```typescript
import { retryWithBackoff, RetryConfig } from './utils/retry.util';

const customConfig: RetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  enableJitter: true,
};

const result = await retryWithBackoff(
  async () => await operation(),
  customConfig
);
```

#### Custom Error Handler

```typescript
import { retryWithBackoff } from './utils/retry.util';

const result = await retryWithBackoff(
  async () => await operation(),
  DEFAULT_RETRY_CONFIG,
  (error, attempt) => {
    // Custom logic to determine if error is retryable
    return error.message.includes('temporary');
  }
);
```

#### Get Detailed Retry Result

```typescript
import { retryWithResult } from './utils/retry.util';

const result = await retryWithResult(async () => {
  return await operation();
});

if (result.success) {
  console.log('Operation succeeded:', result.result);
  console.log('Attempts:', result.attempts);
  console.log('Total time:', result.totalTimeMs, 'ms');
} else {
  console.error('Operation failed:', result.error);
  console.log('Attempts:', result.attempts);
}
```

### Default Configurations

#### DEFAULT_RETRY_CONFIG

For Bedrock API calls:
- Max attempts: 3
- Base delay: 500ms
- Max delay: 5000ms
- Backoff multiplier: 2
- Jitter: enabled

#### NETWORK_RETRY_CONFIG

For network operations:
- Max attempts: 3
- Base delay: 1000ms
- Max delay: 10000ms
- Backoff multiplier: 2
- Jitter: enabled

### Error Classification

The retry utility automatically classifies errors:

#### Retryable Errors

- **Throttling**: `ThrottlingException`, `TooManyRequestsException`, etc.
- **Network**: `ECONNRESET`, `ETIMEDOUT`, `NetworkError`, etc.
- **Timeout**: Any error message containing "timeout"

#### Non-Retryable Errors

- **Validation**: `ValidationException`, `InvalidParameterException`
- **Authentication**: `AccessDeniedException`, `UnauthorizedException`
- **Not Found**: `ResourceNotFoundException`

### Exponential Backoff Algorithm

The delay between retries follows this formula:

```
delay = min(baseDelay × multiplier^(attempt-1), maxDelay)
```

With jitter enabled:
```
delay = random(0, delay)
```

#### Example Delays (Default Config)

| Attempt | Base Delay | With Jitter (range) |
|---------|-----------|---------------------|
| 1       | 500ms     | 0-500ms            |
| 2       | 1000ms    | 0-1000ms           |
| 3       | 2000ms    | 0-2000ms           |
| 4       | 4000ms    | 0-4000ms           |
| 5       | 5000ms    | 0-5000ms (capped)  |

### Jitter Benefits

Jitter prevents the "thundering herd" problem where multiple clients retry simultaneously:

- **Without Jitter**: All clients retry at exactly 500ms, 1000ms, 2000ms
- **With Jitter**: Clients retry at random times within the delay window
- **Result**: Spreads load on the service, reducing likelihood of cascading failures

### Integration with Nova Vision Service

The retry logic is integrated into the Nova Vision Service for Bedrock API calls:

```typescript
// In nova-vision.service.ts
import { retryBedrockCall } from '../utils/retry.util';

const response = await retryBedrockCall(() => bedrockClient.send(command));
```

This automatically handles:
- AWS throttling exceptions
- Network timeouts
- Transient connection errors

### Testing

Comprehensive unit tests are available in `__tests__/retry.util.test.ts`:

- Error classification tests
- Backoff calculation tests
- Retry logic tests
- Configuration tests
- Edge case tests

Run tests:
```bash
npm test -- retry.util.test.ts
```

### Requirements Satisfied

- **Requirement 2.4**: Handle timeouts and retries for Bedrock API
- **Requirement 13.1**: Retry logic for network failures
- **Design Spec**: Exponential backoff with 500ms base, 5s max, 2x multiplier
- **Design Spec**: Maximum 3 retry attempts for throttling errors
- **Design Spec**: Jitter to prevent thundering herd

### Performance Considerations

- **Minimal Overhead**: Retry logic adds negligible overhead on success
- **Fast Failure**: Non-retryable errors fail immediately (no retries)
- **Bounded Time**: Max delay cap prevents excessive wait times
- **Logging**: All retry attempts are logged for debugging

### Best Practices

1. **Use Default Config**: Start with `DEFAULT_RETRY_CONFIG` for most cases
2. **Custom Error Handlers**: Only use when you need specific retry logic
3. **Monitor Logs**: Watch for frequent retries indicating systemic issues
4. **Set Timeouts**: Always set operation timeouts to prevent hanging
5. **Test Failures**: Test your code with simulated failures to verify retry behavior

### Future Enhancements

Potential improvements for future iterations:

- Circuit breaker pattern for cascading failures
- Adaptive backoff based on service health
- Retry budget to limit total retry time
- Metrics collection for retry rates and success
- Dead letter queue for permanently failed operations
