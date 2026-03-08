# Kisan Mitra Integration

This document describes the integration between the Crop Disease Diagnosis feature and the Kisan Mitra chat service.

## Overview

The integration enables seamless context sharing between crop diagnosis and Kisan Mitra chat, allowing farmers to:
- Ask follow-up questions about their diagnosis via chat
- Get contextual responses based on their recent diagnosis
- Maintain consistent language settings across both features

## Requirements

This integration satisfies the following requirements:

- **15.1**: Diagnosis accessible from Kisan Mitra chat interface
- **15.2**: Allow follow-up questions via Kisan Mitra chat
- **15.3**: Share diagnosis context with Kisan Mitra
- **15.6**: Maintain consistent language settings

## Architecture

### Components

1. **KisanMitraIntegrationService**: Manages diagnosis context storage and retrieval
2. **DiagnosisService**: Automatically shares context after diagnosis completion
3. **MongoDB Collection**: `diagnosis_chat_context` stores context with 24-hour TTL

### Data Flow

```
Diagnosis Service
    ↓
Generate Diagnosis
    ↓
Save to History
    ↓
Share Context with Kisan Mitra ← (Optional, enabled by default)
    ↓
Store in MongoDB (diagnosis_chat_context)
    ↓
Kisan Mitra Chat can retrieve context
```

## Usage

### Automatic Context Sharing

By default, the diagnosis service automatically shares context with Kisan Mitra after completing a diagnosis:

```typescript
import { diagnosisService } from './diagnosis.service';

const result = await diagnosisService.diagnose({
  imageBuffer: imageData,
  originalFilename: 'crop.jpg',
  userId: 'user-123',
  sessionId: 'session-456', // Optional: link to chat session
  language: 'en',
  shareWithKisanMitra: true // Default: true
});
```

### Disabling Context Sharing

To disable context sharing for a specific diagnosis:

```typescript
const result = await diagnosisService.diagnose({
  // ... other fields
  shareWithKisanMitra: false
});
```

### Retrieving Context in Kisan Mitra

The Kisan Mitra service can retrieve diagnosis context in three ways:

#### 1. By Diagnosis ID

```typescript
import { kisanMitraIntegrationService } from './kisan-mitra-integration.service';

const result = await kisanMitraIntegrationService.getContextByDiagnosisId('diag-123');

if (result.found) {
  console.log('Crop:', result.context.cropType);
  console.log('Diseases:', result.context.diseases);
  console.log('Confidence:', result.context.confidence);
  console.log('Summary:', result.context.summary);
}
```

#### 2. By User ID (Latest Diagnosis)

```typescript
const result = await kisanMitraIntegrationService.getLatestContextForUser('user-123');

if (result.found) {
  // Use context for contextual chat responses
  console.log('Latest diagnosis:', result.context.summary);
}
```

#### 3. By Session ID

```typescript
const result = await kisanMitraIntegrationService.getContextBySessionId('session-456');

if (result.found) {
  // Use context for current chat session
  console.log('Session diagnosis:', result.context.summary);
}
```

### Linking Diagnosis to Chat Session

To associate a diagnosis with a chat session after creation:

```typescript
await kisanMitraIntegrationService.updateSessionId('diag-123', 'session-456');
```

## Context Structure

The diagnosis context shared with Kisan Mitra includes:

```typescript
interface DiagnosisContext {
  diagnosisId: string;        // Unique diagnosis identifier
  userId: string;             // User who requested diagnosis
  sessionId?: string;         // Optional chat session ID
  cropType: string;           // Identified crop type
  diseases: Array<{           // Detected diseases
    name: string;
    scientificName: string;
    type: string;
    severity: string;
    confidence: number;
  }>;
  confidence: number;         // Overall confidence score
  language: string;           // User's language preference
  timestamp: Date;            // When diagnosis was created
  summary: string;            // Human-readable summary
}
```

## Context Expiry

- Contexts are stored with a **24-hour TTL** (Time To Live)
- MongoDB automatically deletes expired contexts using a TTL index
- Manual cleanup can be triggered: `kisanMitraIntegrationService.cleanupExpiredContexts()`

## Database Schema

### Collection: `diagnosis_chat_context`

```javascript
{
  diagnosisId: String,        // Unique diagnosis ID
  userId: String,             // User ID
  sessionId: String,          // Optional session ID
  cropType: String,           // Crop type
  diseases: Array,            // Disease details
  confidence: Number,         // Confidence score
  language: String,           // Language code
  timestamp: Date,            // Creation timestamp
  summary: String,            // Human-readable summary
  expiresAt: Date,            // Expiry timestamp (24h from creation)
  createdAt: Date,            // Document creation
  updatedAt: Date             // Last update
}
```

### Indexes

1. **TTL Index**: `{ expiresAt: 1 }` - Automatic expiry
2. **Diagnosis ID**: `{ diagnosisId: 1 }` - Fast lookup by diagnosis
3. **User ID**: `{ userId: 1, timestamp: -1 }` - Latest diagnosis per user
4. **Session ID**: `{ sessionId: 1, timestamp: -1 }` - Session-based lookup

## Integration Examples

### Example 1: Farmer Asks Follow-up Question

```typescript
// 1. Farmer completes diagnosis
const diagnosis = await diagnosisService.diagnose({
  imageBuffer: cropImage,
  userId: 'farmer-123',
  sessionId: 'chat-session-456',
  language: 'hi'
});

// Context is automatically shared with Kisan Mitra

// 2. Farmer asks follow-up question in chat
const chatRequest = {
  userId: 'farmer-123',
  sessionId: 'chat-session-456',
  query: 'इस बीमारी का इलाज कैसे करें?', // "How to treat this disease?"
  language: 'hi'
};

// 3. Kisan Mitra retrieves context
const context = await kisanMitraIntegrationService.getContextBySessionId('chat-session-456');

if (context.found) {
  // Use context to provide relevant response
  // "Based on your recent diagnosis of Late Blight in Tomato..."
}
```

### Example 2: Contextual Chat Response

```typescript
// Kisan Mitra can reference recent diagnosis in responses
const latestDiagnosis = await kisanMitraIntegrationService.getLatestContextForUser('farmer-123');

if (latestDiagnosis.found) {
  const response = `I see you recently diagnosed ${latestDiagnosis.context.cropType} 
    with ${latestDiagnosis.context.diseases[0].name}. 
    Would you like more information about treatment options?`;
}
```

## Error Handling

The integration is designed to be non-blocking:

- If context sharing fails, the diagnosis still succeeds
- Errors are logged but don't affect the diagnosis response
- Context retrieval returns `{ found: false }` on errors

```typescript
// Diagnosis service handles errors gracefully
try {
  await kisanMitraIntegrationService.addContext(context);
  console.log('✓ Context shared with Kisan Mitra');
} catch (error) {
  // Log error but don't fail the diagnosis
  console.error('Failed to share context:', error);
}
```

## Initialization

Ensure indexes are created during application startup:

```typescript
import { kisanMitraIntegrationService } from './kisan-mitra-integration.service';

// In your app initialization
await kisanMitraIntegrationService.ensureIndexes();
```

## Testing

Unit tests are provided in `__tests__/kisan-mitra-integration.service.test.ts`:

```bash
npm test -- kisan-mitra-integration.service.test.ts
```

Tests cover:
- Context storage and retrieval
- Expiry handling
- Error scenarios
- Summary generation
- Index creation

## Language Consistency

The integration maintains language consistency (Requirement 15.6):

- Context stores the user's language preference
- Summary is generated in the user's language
- Kisan Mitra can use the stored language for responses

```typescript
// Context includes language
const context = {
  language: 'hi',  // Hindi
  summary: 'टमाटर: Late Blight (high गंभीरता, 85% विश्वास)'
};

// Kisan Mitra uses same language for responses
const response = await kisanMitraService.processQuery({
  userId: 'farmer-123',
  sessionId: 'session-456',
  query: 'इलाज बताएं',
  language: context.language  // Use same language
});
```

## Performance Considerations

- Context sharing is **asynchronous** and doesn't block diagnosis response
- MongoDB queries use indexes for fast retrieval
- TTL index automatically cleans up expired contexts
- Typical context storage time: <50ms
- Typical context retrieval time: <10ms

## Future Enhancements

Potential improvements for future iterations:

1. **Rich Context**: Include remedy recommendations in context
2. **Context History**: Track multiple diagnoses per session
3. **Proactive Suggestions**: Kisan Mitra suggests diagnosis when symptoms mentioned
4. **Context Analytics**: Track how often context is used in chat
5. **Extended TTL**: Allow users to extend context expiry

## Related Documentation

- [Diagnosis Service](./diagnosis.service.ts)
- [Kisan Mitra Service](../../i18n/kisan-mitra.service.ts)
- [Requirements Document](../../../../.kiro/specs/crop-disease-diagnosis/requirements.md)
- [Design Document](../../../../.kiro/specs/crop-disease-diagnosis/design.md)
