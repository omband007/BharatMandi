# i18n Manual Testing Guide

## Overview

This guide provides step-by-step instructions for manually testing the multi-language support (i18n) implementation in Bharat Mandi. The current implementation includes Phase 1 (Foundation) features:

- i18next infrastructure for backend
- Translation bundles for 11 languages
- I18nService with language switching and translation lookup
- Locale formatting utilities (dates, numbers, currency, weights)
- Language preference storage in database
- i18n API endpoints

## Prerequisites

Before testing, ensure:
1. PostgreSQL database is running and accessible
2. SQLite database is initialized
3. All dependencies are installed (`npm install`)
4. Environment variables are configured (`.env` file)

## Starting the Server

Run the development server:

```bash
npm run dev
```

Or for production mode:

```bash
npm start
```

The server should start on `http://localhost:3000` (or the port specified in your `.env` file).

Verify the server is running by checking the health endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-26T...",
  "databases": {
    "postgresql": {
      "isConnected": true
    },
    "sqlite": {
      "connected": true
    }
  }
}
```

## Test Scenarios

### 1. Get Supported Languages

**Endpoint:** `GET /api/i18n/languages`

**Test with curl:**
```bash
curl http://localhost:3000/api/i18n/languages
```

**Expected Response:**
```json
{
  "success": true,
  "languages": [
    { "code": "en", "name": "English", "nativeName": "English", "direction": "ltr" },
    { "code": "hi", "name": "Hindi", "nativeName": "हिन्दी", "direction": "ltr" },
    { "code": "pa", "name": "Punjabi", "nativeName": "ਪੰਜਾਬੀ", "direction": "ltr" },
    { "code": "mr", "name": "Marathi", "nativeName": "मराठी", "direction": "ltr" },
    { "code": "ta", "name": "Tamil", "nativeName": "தமிழ்", "direction": "ltr" },
    { "code": "te", "name": "Telugu", "nativeName": "తెలుగు", "direction": "ltr" },
    { "code": "bn", "name": "Bengali", "nativeName": "বাংলা", "direction": "ltr" },
    { "code": "gu", "name": "Gujarati", "nativeName": "ગુજરાતી", "direction": "ltr" },
    { "code": "kn", "name": "Kannada", "nativeName": "ಕನ್ನಡ", "direction": "ltr" },
    { "code": "ml", "name": "Malayalam", "nativeName": "മലയാളം", "direction": "ltr" },
    { "code": "or", "name": "Odia", "nativeName": "ଓଡ଼ିଆ", "direction": "ltr" }
  ]
}
```

**Validation:**
- ✓ Response contains all 11 supported languages
- ✓ Each language has code, name, nativeName, and direction
- ✓ Native names are in correct scripts

---

### 2. Get Translation Bundle

**Endpoint:** `GET /api/i18n/translations/:lang`

**Test with English:**
```bash
curl http://localhost:3000/api/i18n/translations/en
```

**Test with Hindi:**
```bash
curl http://localhost:3000/api/i18n/translations/hi
```

**Expected Response Structure:**
```json
{
  "common": {
    "appName": "Bharat Mandi",
    "welcome": "Welcome",
    "loading": "Loading...",
    ...
  },
  "auth": {
    "login": "Login",
    "register": "Register",
    ...
  },
  "marketplace": {
    "listings": "Listings",
    "createListing": "Create Listing",
    ...
  },
  "time": {
    "justNow": "Just now",
    "minutesAgo": "{{count}} minute ago",
    "minutesAgo_plural": "{{count}} minutes ago",
    ...
  },
  "number": {
    "thousands": "{{value}}K",
    "lakhs": "{{value}}L",
    "crores": "{{value}}Cr",
    "percentage": "{{value}}%"
  },
  "units": {
    "kg": "{{value}} kg",
    "grams": "{{value}} g",
    "tonnes": "{{value}} tonnes"
  }
}
```

**Validation:**
- ✓ Response contains translation keys organized by namespace
- ✓ Hindi translations are in Devanagari script
- ✓ Pluralization keys exist (e.g., `minutesAgo` and `minutesAgo_plural`)
- ✓ Variable interpolation placeholders are present (e.g., `{{count}}`, `{{value}}`)

**Test Invalid Language:**
```bash
curl http://localhost:3000/api/i18n/translations/invalid
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Unsupported language: invalid"
}
```

---

### 3. Validate Translation Completeness

**Endpoint:** `GET /api/i18n/validate`

**Test with curl:**
```bash
curl http://localhost:3000/api/i18n/validate
```

**Expected Response:**
```json
{
  "success": true,
  "validation": {
    "incomplete": [],
    "missingKeys": [],
    "totalMissing": 0
  }
}
```

**Validation:**
- ✓ `incomplete` array should be empty (all languages have all keys)
- ✓ `missingKeys` array should be empty
- ✓ `totalMissing` should be 0

**Note:** If there are missing keys, the response will show which languages are incomplete:
```json
{
  "success": true,
  "validation": {
    "incomplete": ["hi", "pa"],
    "missingKeys": ["common.newKey", "auth.newField"],
    "totalMissing": 2
  }
}
```

---

### 4. Change User Language Preference

**Endpoint:** `POST /api/i18n/change-language`

**Test with curl:**
```bash
curl -X POST http://localhost:3000/api/i18n/change-language \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "languageCode": "hi"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Language preference updated successfully",
  "language": "hi"
}
```

**Test with Different Languages:**
```bash
# Change to Punjabi
curl -X POST http://localhost:3000/api/i18n/change-language \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123", "languageCode": "pa"}'

# Change to Tamil
curl -X POST http://localhost:3000/api/i18n/change-language \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123", "languageCode": "ta"}'
```

**Test Invalid Language:**
```bash
curl -X POST http://localhost:3000/api/i18n/change-language \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123", "languageCode": "invalid"}'
```

**Expected Error Response:**
```json
{
  "success": false,
  "message": "Unsupported language: invalid"
}
```

**Test Missing Parameters:**
```bash
curl -X POST http://localhost:3000/api/i18n/change-language \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-123"}'
```

**Expected Error Response:**
```json
{
  "success": false,
  "message": "userId and languageCode are required"
}
```

**Validation:**
- ✓ Language preference is updated in database
- ✓ Response confirms the language change
- ✓ Invalid languages are rejected
- ✓ Missing parameters return appropriate error

---

### 5. Get User Language Preference

**Endpoint:** `GET /api/i18n/user-language/:userId`

**Test with curl:**
```bash
curl http://localhost:3000/api/i18n/user-language/test-user-123
```

**Expected Response:**
```json
{
  "success": true,
  "language": "hi"
}
```

**Test with New User (No Preference Set):**
```bash
curl http://localhost:3000/api/i18n/user-language/new-user-456
```

**Expected Response:**
```json
{
  "success": true,
  "language": "en"
}
```

**Validation:**
- ✓ Returns the user's saved language preference
- ✓ Returns default language (en) for users without preference
- ✓ Preference persists across requests

---

### 6. Test Language Preference Persistence

**Complete Flow Test:**

1. **Set language to Hindi:**
```bash
curl -X POST http://localhost:3000/api/i18n/change-language \
  -H "Content-Type: application/json" \
  -d '{"userId": "persistence-test", "languageCode": "hi"}'
```

2. **Verify it was saved:**
```bash
curl http://localhost:3000/api/i18n/user-language/persistence-test
```

Expected: `{"success": true, "language": "hi"}`

3. **Change to Gujarati:**
```bash
curl -X POST http://localhost:3000/api/i18n/change-language \
  -H "Content-Type: application/json" \
  -d '{"userId": "persistence-test", "languageCode": "gu"}'
```

4. **Verify it was updated:**
```bash
curl http://localhost:3000/api/i18n/user-language/persistence-test
```

Expected: `{"success": true, "language": "gu"}`

**Validation:**
- ✓ Language preference persists in database
- ✓ Updates overwrite previous preferences
- ✓ Each user has independent preferences

---

## Testing Formatting Utilities

The formatting utilities are used internally by the i18n service. While they don't have direct API endpoints, you can test them through the automated test suite:

```bash
npm test -- src/features/i18n/__tests__/formatting.utils.test.ts
```

**Expected Output:**
```
PASS  src/features/i18n/__tests__/formatting.utils.test.ts
  Date Formatting
    ✓ formats dates in English locale
    ✓ formats dates in Hindi locale
    ✓ formats relative dates in English
    ✓ formats relative dates in Hindi
  Number Formatting
    ✓ formats numbers in English locale
    ✓ formats numbers in Hindi locale (Indian numbering)
  Currency Formatting
    ✓ formats currency in English
    ✓ formats currency in Hindi
  Indian Number Formatting
    ✓ formats thousands
    ✓ formats lakhs
    ✓ formats crores
  Weight Formatting
    ✓ formats grams
    ✓ formats kilograms
    ✓ formats tonnes
  Percentage Formatting
    ✓ formats percentages

Test Suites: 1 passed, 1 total
Tests:       45 passed, 45 total
```

---

## Postman Collection

For easier testing, you can import this Postman collection:

```json
{
  "info": {
    "name": "Bharat Mandi i18n API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Get Supported Languages",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/i18n/languages"
      }
    },
    {
      "name": "Get English Translations",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/i18n/translations/en"
      }
    },
    {
      "name": "Get Hindi Translations",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/i18n/translations/hi"
      }
    },
    {
      "name": "Validate Translations",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/i18n/validate"
      }
    },
    {
      "name": "Change Language to Hindi",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"userId\": \"test-user-123\",\n  \"languageCode\": \"hi\"\n}"
        },
        "url": "{{baseUrl}}/api/i18n/change-language"
      }
    },
    {
      "name": "Get User Language",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/i18n/user-language/test-user-123"
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000"
    }
  ]
}
```

Save this as `i18n-api-tests.postman_collection.json` and import into Postman.

---

## Browser Testing

You can also test the API endpoints directly in your browser:

1. **Get Supported Languages:**
   - Open: `http://localhost:3000/api/i18n/languages`

2. **Get Translation Bundle:**
   - English: `http://localhost:3000/api/i18n/translations/en`
   - Hindi: `http://localhost:3000/api/i18n/translations/hi`

3. **Validate Translations:**
   - Open: `http://localhost:3000/api/i18n/validate`

4. **Get User Language:**
   - Open: `http://localhost:3000/api/i18n/user-language/test-user-123`

**Note:** POST requests (change language) cannot be tested directly in the browser address bar. Use curl, Postman, or a browser extension like RESTClient.

---

## Troubleshooting

### Server Won't Start

**Issue:** Server fails to start with database connection errors

**Solution:**
1. Check PostgreSQL is running: `pg_isready`
2. Verify database credentials in `.env` file
3. Check SQLite database exists: `ls data/bharat-mandi.db`

### Translation Bundle Not Found

**Issue:** `GET /api/i18n/translations/:lang` returns 500 error

**Solution:**
1. Verify translation files exist: `ls src/features/i18n/locales/*/translation.json`
2. Check file permissions
3. Restart the server

### Language Preference Not Persisting

**Issue:** User language preference doesn't save

**Solution:**
1. Check PostgreSQL connection
2. Verify `users` table has `language_preference` column
3. Check database logs for errors

### Invalid Language Code

**Issue:** API accepts invalid language codes

**Solution:**
- This should not happen. If it does, check the validation logic in `i18n.controller.ts`

---

## Test Checklist

Use this checklist to track your manual testing progress:

- [ ] Server starts successfully
- [ ] Health check endpoint responds
- [ ] Get supported languages returns all 11 languages
- [ ] Get English translation bundle works
- [ ] Get Hindi translation bundle works
- [ ] Get translation bundle for all other languages works
- [ ] Invalid language code is rejected
- [ ] Validate translations shows no missing keys
- [ ] Change language to Hindi works
- [ ] Change language to other languages works
- [ ] Invalid language change is rejected
- [ ] Missing parameters return error
- [ ] Get user language returns saved preference
- [ ] Get user language returns default for new users
- [ ] Language preference persists across requests
- [ ] Language preference updates correctly
- [ ] Formatting utility tests pass

---

## Next Steps

After completing manual testing:

1. **Report Issues:** Document any bugs or unexpected behavior
2. **Performance Testing:** Note any slow responses (should be < 100ms for most endpoints)
3. **Move to Phase 2:** Once Phase 1 is validated, proceed with Dynamic Translation implementation

---

## Support

If you encounter issues during testing:
1. Check server logs for error messages
2. Verify database connectivity
3. Review the implementation files in `src/features/i18n/`
4. Run automated tests: `npm test`

---

## Phase 1 Implementation Summary

### ✅ **Completed Features**

**Backend Infrastructure:**
- i18next backend configuration with Express middleware
- Translation bundles for 11 languages (en, hi, pa, mr, ta, te, bn, gu, kn, ml, or)
- I18nService with language switching and translation lookup
- Locale formatting utilities (dates, numbers, currency, Indian numbering, weights)
- Language preference storage in PostgreSQL database

**API Endpoints:**
- `GET /api/i18n/languages` - Get supported languages
- `GET /api/i18n/translations/:lang` - Get translation bundle
- `GET /api/i18n/validate` - Validate translation completeness
- `POST /api/i18n/change-language` - Change user language preference
- `GET /api/i18n/user-language/:userId` - Get user language preference

**Testing:**
- 51 unit tests for i18n.service.ts
- 20 property-based tests for i18n.service.pbt.test.ts
- 45 tests for formatting.utils.test.ts
- **Total: 116 tests passing**

**Database:**
- Added `language_preference`, `voice_language_preference`, `recent_languages` columns to users table
- Indexed for efficient querying

### 📋 **Next Phase: Dynamic Translation (Phase 2)**

**Upcoming Features:**
- AWS Translate integration for dynamic content translation
- ElastiCache Redis for translation caching (90%+ hit rate target)
- AWS Comprehend for language detection
- Translation for marketplace listings, messages, and notifications
- Batch translation optimization

**When to Start Phase 2:**
- After completing manual testing of Phase 1 endpoints
- After verifying all 116 automated tests pass
- After confirming language preferences persist correctly

### 🎯 **Testing Recommendations**

Before moving to Phase 2:
1. Test all 6 API endpoints with curl/Postman
2. Verify translation completeness for all 11 languages
3. Test language preference persistence across server restarts
4. Verify formatting utilities work correctly (run automated tests)
5. Check database has language preference columns

**Ready for Phase 2?** Once manual testing is complete and all endpoints work as expected, you can proceed with AWS Translate integration.
