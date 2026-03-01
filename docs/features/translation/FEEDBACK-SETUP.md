# Translation Feedback Setup Guide

## Overview

The translation feedback mechanism allows users to report translation issues and suggest improvements. This feature implements Requirements 16.1, 16.2, 16.3, and 16.5 from the multi-language support specification.

## Database Migration

Before using the translation feedback feature, you need to run the database migration to create the `translation_feedback` table.

### Running the Migration

```bash
# Connect to your PostgreSQL database
psql -U your_username -d bharat_mandi

# Run the migration script
\i src/shared/database/migrations/004_create_translation_feedback.sql
```

Or using a PostgreSQL client:

```sql
-- Execute the contents of:
-- src/shared/database/migrations/004_create_translation_feedback.sql
```

### Migration Details

The migration creates:
- `translation_feedback` table with all required columns
- Indexes for efficient querying:
  - `idx_translation_feedback_user_id` - for user-specific queries
  - `idx_translation_feedback_status` - for filtering by status
  - `idx_translation_feedback_target_language` - for language-specific queries
  - `idx_translation_feedback_created_at` - for time-based queries
  - `idx_translation_feedback_feedback_type` - for filtering by feedback type
  - `idx_translation_feedback_language_status` - composite index for quality metrics
- Automatic `updated_at` timestamp trigger

## API Endpoints

### 1. Submit Translation Feedback

**Endpoint:** `POST /api/i18n/translate/feedback`

**Request Body:**
```json
{
  "userId": "user-uuid",
  "originalText": "Hello, how are you?",
  "translatedText": "नमस्ते, आप कैसे हैं?",
  "sourceLanguage": "en",
  "targetLanguage": "hi",
  "suggestedTranslation": "नमस्ते, आप कैसे हो?",
  "feedbackType": "incorrect",
  "context": "Informal greeting"
}
```

**Feedback Types:**
- `incorrect` - Translation is wrong
- `poor_quality` - Translation is technically correct but poor quality
- `suggestion` - User has a better translation suggestion
- `offensive` - Translation contains offensive content

**Response:**
```json
{
  "success": true,
  "message": "Translation feedback submitted successfully",
  "feedback": {
    "id": "feedback-uuid",
    "status": "pending",
    "createdAt": "2025-02-25T10:30:00Z"
  }
}
```

### 2. Get Translation Feedback Statistics

**Endpoint:** `GET /api/i18n/translate/feedback/stats`

**Query Parameters:**
- `targetLanguage` (optional) - Filter stats by specific language (e.g., `hi`, `mr`, `ta`)

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalFeedback": 150,
    "byLanguage": {
      "hi": 50,
      "mr": 30,
      "ta": 40,
      "te": 30
    },
    "byType": {
      "incorrect": 60,
      "poor_quality": 40,
      "suggestion": 35,
      "offensive": 15
    },
    "byStatus": {
      "pending": 80,
      "reviewed": 50,
      "resolved": 15,
      "rejected": 5
    },
    "averageResolutionTime": 24.5
  }
}
```

## Database Schema

### translation_feedback Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User who submitted feedback (FK to users) |
| original_text | TEXT | Original text before translation |
| translated_text | TEXT | The translation being reported |
| source_language | VARCHAR(10) | Source language code (e.g., 'en') |
| target_language | VARCHAR(10) | Target language code (e.g., 'hi') |
| suggested_translation | TEXT | User's suggested alternative (optional) |
| feedback_type | VARCHAR(50) | Type of feedback (incorrect, poor_quality, suggestion, offensive) |
| context | TEXT | Additional context about the translation (optional) |
| status | VARCHAR(20) | Review status (pending, reviewed, resolved, rejected) |
| admin_notes | TEXT | Admin notes during review (optional) |
| created_at | TIMESTAMP | When feedback was submitted |
| updated_at | TIMESTAMP | Last update time (auto-updated) |
| reviewed_at | TIMESTAMP | When feedback was reviewed (optional) |
| reviewed_by | UUID | Admin who reviewed (FK to users, optional) |

## Usage Examples

### Submit Feedback from Frontend

```typescript
async function reportTranslation(
  userId: string,
  originalText: string,
  translatedText: string,
  sourceLanguage: string,
  targetLanguage: string,
  feedbackType: 'incorrect' | 'poor_quality' | 'suggestion' | 'offensive',
  suggestedTranslation?: string
) {
  const response = await fetch('/api/i18n/translate/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      originalText,
      translatedText,
      sourceLanguage,
      targetLanguage,
      feedbackType,
      suggestedTranslation,
    }),
  });

  return await response.json();
}
```

### Get Statistics for Hindi Translations

```typescript
async function getHindiFeedbackStats() {
  const response = await fetch('/api/i18n/translate/feedback/stats?targetLanguage=hi');
  const data = await response.json();
  return data.stats;
}
```

## Testing

Run the translation feedback tests:

```bash
npm test -- translation-feedback.test.ts
```

**Note:** Tests require the database migration to be run first.

## Requirements Mapping

- **Requirement 16.1:** "Report Translation" option implemented via POST endpoint
- **Requirement 16.2:** Captures original text, translation, and user's language
- **Requirement 16.3:** Allows users to suggest alternative translations via `suggestedTranslation` field
- **Requirement 16.5:** Tracks translation quality metrics per language via stats endpoint

## Admin Workflow

1. User submits feedback → Status: `pending`
2. Admin reviews feedback → Status: `reviewed`, sets `reviewed_at` and `reviewed_by`
3. Admin takes action:
   - Fixes translation → Status: `resolved`
   - Rejects feedback → Status: `rejected`
4. System tracks `averageResolutionTime` for quality metrics

## Future Enhancements

- Admin dashboard for reviewing feedback
- Automatic notification to users when their feedback is resolved
- Integration with translation service to automatically update translations
- Machine learning to identify patterns in feedback
- Bulk feedback operations for admins
