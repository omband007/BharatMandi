# AWS Support Case: Marathi Translation Quality Issue

## Case Summary

**Service**: AWS Translate  
**Issue Type**: Translation Quality / Incomplete Output  
**Severity**: Medium (affects production feature for Marathi-speaking users)  
**Language Pair**: English (en) → Marathi (mr)  
**Region**: ap-southeast-2 (Sydney)  
**Account ID**: 281627750826  
**User**: Omband

## Issue Description

AWS Translate is returning incomplete/truncated translations specifically for Marathi language (language code: `mr`), while other Indian languages (Hindi, Tamil, Telugu, Bengali, etc.) produce complete and accurate translations for the same input text.

## Evidence

### Test Results (2024)

We tested the phrase "Welcome to Bharat Mandi" across multiple Indian languages:

| Language | Code | Output | Character Count | Quality |
|----------|------|--------|----------------|---------|
| **Marathi** | mr | "भारत मंडी येथे" | 14 chars | ❌ **INCOMPLETE** |
| Hindi | hi | "भारत मंडी में आपका स्वागत है" | 28 chars | ✅ Complete |
| Tamil | ta | "பாரத் மண்டிக்கு வருக" | 20 chars | ✅ Complete |
| Telugu | te | "భారత్ మండీకి స్వాగతం" | 20 chars | ✅ Complete |

### Analysis

1. **Marathi output is significantly shorter** (14 chars) compared to Hindi (28 chars), Tamil (20 chars), and Telugu (20 chars)
2. **Marathi translation is semantically incomplete**:
   - Input: "Welcome to Bharat Mandi" (3 semantic units: greeting + preposition + place name)
   - Marathi output: "भारत मंडी येथे" (translates to approximately "Bharat Mandi here/there")
   - Missing: The "welcome" greeting component
   - Expected: Something like "भारत मंडी मध्ये आपले स्वागत आहे" (complete translation)

3. **Pattern is consistent across different phrases**:
   - "Thank you very much" → "खूप धन्यवाद" (11 chars) - appears complete
   - "Hello world" → "हॅलो वर्ल्ड" (11 chars) - appears complete
   - Multi-word phrases with prepositions seem most affected

## Technical Details

### API Request
```json
{
  "Text": "Welcome to Bharat Mandi",
  "SourceLanguageCode": "en",
  "TargetLanguageCode": "mr",
  "Settings": {
    "Profanity": "MASK"
  }
}
```

### API Response
```json
{
  "TranslatedText": "भारत मंडी येथे",
  "SourceLanguageCode": "en",
  "TargetLanguageCode": "mr",
  "AppliedTerminologies": null,
  "AppliedSettings": {
    "Profanity": "MASK"
  }
}
```

### SDK Version
- `@aws-sdk/client-translate`: ^3.x (latest)
- Node.js: v18+
- Region: ap-southeast-2

### Reproduction Steps

1. Use AWS Translate API with the following parameters:
   ```bash
   aws translate translate-text \
     --region ap-southeast-2 \
     --text "Welcome to Bharat Mandi" \
     --source-language-code en \
     --target-language-code mr
   ```

2. Compare output with Hindi translation:
   ```bash
   aws translate translate-text \
     --region ap-southeast-2 \
     --text "Welcome to Bharat Mandi" \
     --source-language-code en \
     --target-language-code hi
   ```

3. Observe that Marathi output is significantly shorter and semantically incomplete

## Business Impact

**Application**: Bharat Mandi - Agricultural marketplace platform for Indian farmers  
**User Base**: Serving farmers across 11 Indian languages including Marathi  
**Marathi Speakers**: ~83 million native speakers (primarily in Maharashtra state)

### Impact Details

1. **User Experience**: Marathi-speaking farmers receive incomplete translations, leading to confusion
2. **Feature Adoption**: Reduced trust in translation feature for Marathi users
3. **Competitive Disadvantage**: Cannot reliably serve Maharashtra market (major agricultural state)
4. **Workaround Cost**: Need to implement alternative translation service specifically for Marathi

## Questions for AWS Support

1. **Is this a known limitation** of AWS Translate's Marathi language model?
2. **Are there specific phrase patterns** that cause truncation in Marathi?
3. **Is there a different language code or dialect** we should use for better Marathi support?
4. **What is the expected timeline** for improvements to Marathi translation quality?
5. **Are there recommended workarounds** while this issue is being addressed?

## Expected Behavior

For the input "Welcome to Bharat Mandi", we expect a complete Marathi translation that includes:
- The greeting/welcome component ("स्वागत")
- The preposition ("मध्ये" or "येथे")
- The place name ("भारत मंडी")
- Appropriate grammatical structure

Example expected output: "भारत मंडी मध्ये आपले स्वागत आहे" or similar complete phrase.

## Additional Context

### Other Languages Tested (All Working Correctly)
- ✅ Hindi (hi)
- ✅ Punjabi (pa)
- ✅ Tamil (ta)
- ✅ Telugu (te)
- ✅ Bengali (bn)
- ✅ Gujarati (gu)
- ✅ Kannada (kn)
- ✅ Malayalam (ml)
- ✅ Odia (or)

### Marathi Language Details
- Script: Devanagari (same as Hindi)
- Language Family: Indo-Aryan
- ISO 639-1 Code: mr
- Native Speakers: ~83 million
- Official Language: Maharashtra, Goa (India)

## Requested Action

1. **Investigate** the Marathi language model for translation quality issues
2. **Provide guidance** on whether this is expected behavior or a bug
3. **Suggest workarounds** if this is a known limitation
4. **Provide timeline** for potential improvements to Marathi translation quality
5. **Confirm** if we should use a different service for Marathi translations

## Attachments

- Diagnostic script output (included above)
- Comparison table of all 11 languages
- Sample API requests and responses

## Contact Information

**AWS Account**: 281627750826  
**IAM User**: Omband  
**Region**: ap-southeast-2  
**Application**: Bharat Mandi POC  
**Priority**: Medium (affects production feature)

---

## Internal Notes (for our reference)

### Temporary Workarounds Considered

1. **Hybrid Translation Approach**
   - Use AWS Translate for 10 languages
   - Use Google Cloud Translation API for Marathi only
   - Estimated cost: +$20/month for Google Cloud

2. **Pre-translated Common Phrases**
   - Manually translate 100-200 common phrases to Marathi
   - Cache in database
   - Fall back to AWS Translate for dynamic content
   - Estimated effort: 8-16 hours

3. **User Feedback Loop**
   - Implement "Report Translation" feature
   - Collect user corrections for Marathi
   - Build custom translation dictionary
   - Estimated effort: 4-8 hours development

### Decision Pending

Wait for AWS Support response before implementing workaround. If AWS confirms this is a limitation, proceed with Workaround #1 (Hybrid Approach) as it provides best quality for users.

---

**Case Created**: [Date to be filled when submitted]  
**Case Number**: [To be filled by AWS]  
**Status**: Pending Submission
