# Marathi Translation Truncation Issue

## Issue Summary

AWS Translate is returning truncated translations specifically for Marathi language, while other Indian languages (Hindi, Tamil, Telugu, etc.) work correctly.

## Confirmed Working

✅ AWS Translate service is operational
✅ Translation API endpoints are working
✅ Redis caching is working (graceful degradation when Redis not running)
✅ Server is running on port 3000
✅ Hindi translations are complete: "भारत मंडी में आपका स्वागत है"
✅ Other languages appear to work correctly

## Problem

❌ Marathi translations are truncated:
- Input: "Welcome to Bharat Mandi"
- Expected: Full Marathi translation (similar length to Hindi)
- Actual: "भारत मंडी घेथे" (incomplete/truncated)

## Investigation Steps Taken

1. ✅ Added CSS word-wrap to rule out display issue
2. ✅ User confirmed it's NOT a display issue - text is actually truncated
3. ✅ Added detailed logging to translation service for Marathi translations
4. ✅ Created diagnostic script `test-marathi-translation.js`

## Next Steps

### Step 1: Run Diagnostic Script

Run the diagnostic script to test Marathi translations directly with AWS Translate:

```bash
node test-marathi-translation.js
```

This will:
- Test the original phrase that's truncated
- Test simpler phrases to see if issue is consistent
- Compare Marathi with Hindi, Tamil, Telugu for same input
- Show full AWS response metadata
- Identify if this is an AWS API issue or our code issue

### Step 2: Check Server Logs

1. Translate "Welcome to Bharat Mandi" to Marathi again in the test page
2. Check the server console for the debug logs:
   - Look for `[TranslationService] Marathi Translation Debug:`
   - Check input length vs output length
   - Review full AWS response

### Step 3: Test with AWS CLI (if needed)

If the diagnostic script shows truncation, test directly with AWS CLI to rule out SDK issues:

```bash
aws translate translate-text \
  --region ap-southeast-2 \
  --text "Welcome to Bharat Mandi" \
  --source-language-code en \
  --target-language-code mr
```

### Step 4: Research AWS Translate Marathi Support

Check AWS documentation:
- [AWS Translate Supported Languages](https://docs.aws.amazon.com/translate/latest/dg/what-is-languages.html)
- Look for known limitations with Marathi (mr)
- Check if Marathi has limited language model support

## Possible Root Causes

1. **AWS Translate API Issue**: AWS may have limited Marathi language model that produces incomplete translations
2. **Character Encoding**: Devanagari script encoding issue specific to Marathi
3. **AWS Service Limitation**: Known limitation in AWS Translate for Marathi language
4. **Regional Variation**: Marathi may require specific dialect or region code

## Workarounds (if AWS issue confirmed)

If this is confirmed as an AWS Translate limitation:

1. **Use Alternative Translation Service**: Consider Google Cloud Translation API for Marathi
2. **Hybrid Approach**: Use AWS for most languages, alternative service for Marathi
3. **Manual Translation**: Pre-translate common phrases to Marathi and cache them
4. **Report to AWS**: Submit support ticket to AWS about Marathi translation quality

## Files Modified

- `src/features/i18n/translation.service.ts` - Added debug logging for Marathi
- `test-marathi-translation.js` - Created diagnostic script
- `MARATHI-TRANSLATION-ISSUE.md` - This document

## Phase 2 Status

### Completed Tasks ✅
- Task 9: Implement Translation Service with AWS Translate
- Task 10: Add language detection with AWS Comprehend
- Task 11: Implement translation caching
- Task 13.1: Create translateBatch() method

### Remaining Phase 2 Tasks
- Task 12: Add translation for listings, messages, notifications
- Task 13.2-13.3: Optimize listing page translation with batching
- Task 14: Add translation feedback mechanism
- Task 15: Checkpoint - Dynamic translation complete

## Recommendation

**Run the diagnostic script first** to determine if this is:
- An AWS API issue (truncation happens in AWS response)
- Our code issue (truncation happens in our processing)

Based on the results, we can decide whether to:
- Report to AWS Support
- Implement a workaround
- Use alternative translation service for Marathi
