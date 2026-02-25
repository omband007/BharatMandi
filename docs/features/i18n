# Multi-Language Support POC Testing Guide

## Overview
This guide explains how to test the multi-language support (i18n) implementation for Bharat Mandi.

## What's Implemented

✅ **11 Indian Languages Supported:**
- English (en)
- Hindi (hi) - हिन्दी
- Punjabi (pa) - ਪੰਜਾਬੀ
- Marathi (mr) - मराठी
- Tamil (ta) - தமிழ்
- Telugu (te) - తెలుగు
- Bengali (bn) - বাংলা
- Gujarati (gu) - ગુજરાતી
- Kannada (kn) - ಕನ್ನಡ
- Malayalam (ml) - മലയാളം
- Odia (or) - ଓଡ଼ିଆ

✅ **Features:**
- Complete translation bundles for all UI elements
- I18nService with language switching
- Locale formatting (dates, numbers, currency)
- User language preference storage
- Real-time language switching
- Translation validation

## Testing the POC UI

### Step 1: Start the Server

```bash
npm run dev
```

The server should start on `http://localhost:3000`

### Step 2: Open the POC UI

Navigate to: **http://localhost:3000/i18n-test.html**

### Step 3: Test Language Switching

1. **Language Selector**: Click on any language button to switch languages
2. **Real-time Updates**: All UI elements update immediately
3. **Translation Display**: See translations for:
   - Common UI elements (buttons, labels)
   - Authentication (login, register, OTP)
   - Marketplace (listings, orders)
   - Grading (produce grading)
   - Transactions (orders, status)
   - Error messages

### Step 4: Verify Translations

The POC UI shows:
- **Translation Statistics**: Total keys, current language, completeness
- **Translation Items**: Key-value pairs for each section
- **Demo Buttons**: Live buttons that change text based on language

### Step 5: Test API Endpoints

You can also test the API endpoints directly:

#### Get Translations for a Language
```bash
curl http://localhost:3000/api/i18n/translations/hi
```

#### Get Supported Languages
```bash
curl http://localhost:3000/api/i18n/languages
```

#### Validate Translation Completeness
```bash
curl http://localhost:3000/api/i18n/validate
```

#### Change User Language (requires userId)
```bash
curl -X POST http://localhost:3000/api/i18n/change-language \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id", "languageCode": "hi"}'
```

## What to Look For

### ✅ Successful Tests:
1. All 11 languages load without errors
2. Translations display correctly in native scripts
3. Language switching is instant (< 100ms)
4. All translation keys are present
5. No missing translations (100% completeness)
6. Demo buttons update with correct text

### ❌ Potential Issues:
1. Missing translation keys (check browser console)
2. Incorrect character encoding (should see native scripts)
3. Slow language switching (> 100ms)
4. API errors (check server logs)

## Translation Coverage

Current translation coverage includes:

### Common UI Elements (15 keys)
- welcome, loading, error, success
- cancel, confirm, save, delete, edit
- back, next, submit, search, filter, sort, close

### Authentication (12 keys)
- login, logout, register
- phone, otp, verifyOtp, requestOtp
- enterPhone, enterOtp
- invalidPhone, invalidOtp

### Marketplace (14 keys)
- listings, myListings, createListing
- viewListing, editListing, deleteListing
- title, description, price, quantity
- crop, grade, location, photos, addPhotos, noListings

### Grading (6 keys)
- gradeProduce, takePhoto, analyzing
- gradeResult, confidence, certificate

### Transactions (10 keys)
- orders, myOrders, orderDetails, orderStatus
- pending, accepted, rejected
- inTransit, delivered, completed

### Error Messages (5 keys)
- networkError, serverError, notFound
- unauthorized, validationError

**Total: 62 translation keys × 11 languages = 682 translations**

## Next Steps

After verifying the POC works:

1. ✅ Phase 1 Foundation - Complete
2. ⏳ Phase 2: Dynamic Translation (AWS Translate)
3. ⏳ Phase 3: Voice Interface (AWS Transcribe/Polly)
4. ⏳ Phase 4: Kisan Mitra (AWS Lex)
5. ⏳ Phase 5: Regional Crop Database (MongoDB)
6. ⏳ Phase 6: Offline Support (SQLite caching)
7. ⏳ Phase 7: Performance Optimization
8. ⏳ Phase 8: Testing & QA

## Troubleshooting

### Issue: Translations not loading
**Solution**: Check that translation files exist in `src/features/i18n/locales/{lang}/translation.json`

### Issue: Language not switching
**Solution**: Check browser console for errors, verify API endpoint is accessible

### Issue: Characters not displaying correctly
**Solution**: Ensure UTF-8 encoding is set in HTML and server responses

### Issue: API returns 404
**Solution**: Verify server is running and i18n routes are registered in app.ts

## Database Migration

To apply the language preference columns to your database:

```bash
# For PostgreSQL
psql -U your_user -d bharat_mandi -f src/shared/database/migrations/002_add_language_preferences.sql

# For SQLite (automatic on next app start)
# The schema is already updated in sqlite-schema.sql
```

## Performance Metrics

Expected performance:
- Language switching: < 100ms
- Translation lookup: < 1ms
- API response time: < 50ms
- Bundle size per language: ~2-3 KB

## Feedback

If you find any issues or have suggestions:
1. Check translation accuracy for your language
2. Report missing translations
3. Suggest improvements to UI/UX
4. Test on different devices/browsers

---

**Status**: ✅ POC Ready for Testing
**Last Updated**: 2026-02-25
**Version**: 1.0.0
