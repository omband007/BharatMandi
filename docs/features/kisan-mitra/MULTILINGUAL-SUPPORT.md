# Kisan Mitra Multi-Language Support

## Overview

Kisan Mitra supports 11 Indian languages through a translation-based approach. Since AWS Lex currently only has the `en_IN` (English - India) locale configured, all non-English queries are automatically translated to English before processing, and responses are translated back to the user's language.

## Supported Languages

1. **English** (en) - Direct processing, no translation needed
2. **Hindi** (hi) - हिन्दी
3. **Punjabi** (pa) - ਪੰਜਾਬੀ
4. **Marathi** (mr) - मराठी
5. **Tamil** (ta) - தமிழ்
6. **Telugu** (te) - తెలుగు
7. **Bengali** (bn) - বাংলা
8. **Gujarati** (gu) - ગુજરાતી
9. **Kannada** (kn) - ಕನ್ನಡ
10. **Malayalam** (ml) - മലയാളം
11. **Odia** (or) - ଓଡ଼ିଆ

## How It Works

### Processing Flow

```
User Query (Any Language)
    ↓
[1] Voice Input (Optional)
    ↓ Transcribe to text
[2] Detect/Use Language
    ↓
[3] Translate to English (if not English)
    ↓
[4] Send to AWS Lex (en_IN locale)
    ↓ Process intent & generate response
[5] Get English Response
    ↓
[6] Translate back to User's Language
    ↓
[7] Generate Voice Output (Optional)
    ↓
Response in User's Language
```

### Step-by-Step Example

**User speaks in Hindi**: "टमाटर का भाव क्या है?"

1. **Voice Transcription**: Audio → "टमाटर का भाव क्या है?"
2. **Language Detection**: Detected as Hindi (hi)
3. **Translation to English**: "टमाटर का भाव क्या है?" → "What is the price of tomato?"
4. **Lex Processing**: 
   - Intent: `GetCropPrice`
   - Slot: `crop = tomato`
   - Response: "The current market price for tomato is ₹35 per kg."
5. **Translation to Hindi**: "The current market price for tomato is ₹35 per kg." → "टमाटर का वर्तमान बाजार मूल्य ₹35 प्रति किलो है।"
6. **Voice Synthesis**: Text → Audio in Hindi
7. **User receives**: Hindi text + Hindi audio response

## Technical Implementation

### Translation Service

The system uses AWS Translate for language translation:

```typescript
// Translate query to English
const translation = await translationService.translateText({
  text: queryText,
  sourceLanguage: 'hi',  // Hindi
  targetLanguage: 'en',   // English
});
```

### Locale Mapping

All languages map to the `en_IN` locale in AWS Lex:

```typescript
const LOCALE_ID_MAP = {
  en: 'en_IN',  // Direct
  hi: 'en_IN',  // Via translation
  pa: 'en_IN',  // Via translation
  // ... all other languages
};
```

### Service Configuration

The Kisan Mitra service handles the translation automatically:

```typescript
// Step 2: Translate to English if needed
let needsTranslation = sourceLanguage !== 'en';

if (needsTranslation) {
  lexQuery = await translateToEnglish(queryText, sourceLanguage);
}

// Step 3: Send to Lex (always en_IN)
const response = await lex.recognizeText({
  localeId: 'en_IN',
  text: lexQuery
});

// Step 6: Translate response back
if (needsTranslation) {
  responseText = await translateFromEnglish(responseText, sourceLanguage);
}
```

## Testing Multi-Language Support

### Test in Hindi

1. Open Kisan Mitra test page
2. Select **हिन्दी (Hindi)** from language dropdown
3. Type or speak: "मौसम कैसा है?"
4. Expected response in Hindi about weather

### Test in Tamil

1. Select **தமிழ் (Tamil)** from language dropdown
2. Type or speak: "தக்காளி விலை என்ன?"
3. Expected response in Tamil about tomato price

### Test in Punjabi

1. Select **ਪੰਜਾਬੀ (Punjabi)** from language dropdown
2. Type or speak: "ਕਣਕ ਕਿਵੇਂ ਉਗਾਈਏ?"
3. Expected response in Punjabi about wheat farming

## Advantages of This Approach

### ✅ Pros

1. **Single Lex Bot**: Only need to configure and maintain one bot with `en_IN` locale
2. **Consistent Intent Recognition**: All queries processed through same trained model
3. **Easy Updates**: Changes to intents/slots only need to be made once
4. **Cost Effective**: No need to train separate models for each language
5. **Scalable**: Easy to add more languages by just adding to translation service

### ⚠️ Considerations

1. **Translation Latency**: Additional ~200-500ms for translation steps
2. **Translation Accuracy**: Depends on AWS Translate quality for each language
3. **Context Loss**: Some cultural/contextual nuances may be lost in translation
4. **Cost**: AWS Translate charges per character translated

## Future Enhancements

### Option 1: Add Native Locales (When Available)

If AWS Lex adds support for more Indian languages:

```typescript
const LOCALE_ID_MAP = {
  en: 'en_IN',
  hi: 'hi_IN',  // Native Hindi support
  ta: 'ta_IN',  // Native Tamil support
  // ... etc
};
```

Then skip translation for languages with native support.

### Option 2: Hybrid Approach

Use native locales where available, translation for others:

```typescript
const NATIVE_LOCALES = ['en_IN', 'hi_IN'];

if (NATIVE_LOCALES.includes(localeId)) {
  // Direct processing
  response = await lex.recognizeText({ localeId, text: query });
} else {
  // Translation-based processing
  response = await processWithTranslation(query, language);
}
```

### Option 3: Custom NLU Model

Train a custom multilingual NLU model:
- Use services like Rasa, Dialogflow, or custom ML models
- Support all languages natively
- More control over intent recognition
- Higher development and maintenance cost

## Monitoring Translation Quality

### Check Server Logs

The service logs all translations:

```
[KisanMitra] Translating from hi to English: टमाटर का भाव क्या है?
[KisanMitra] Translated query: What is the price of tomato?
[KisanMitra] Translating response from English to hi: The current market price...
[KisanMitra] Translated response: टमाटर का वर्तमान बाजार मूल्य...
```

### Test Translation Accuracy

Use the translation test page:
```
http://localhost:3000/translation-test.html
```

Test common phrases in each language to verify quality.

## Troubleshooting

### Issue: Response is in English instead of user's language

**Cause**: Translation service might have failed

**Solution**: 
1. Check server logs for translation errors
2. Verify AWS Translate is configured in `.env`
3. Check AWS credentials have Translate permissions
4. Test translation service independently

### Issue: Wrong language detected

**Cause**: Language detection from voice input might be incorrect

**Solution**:
1. Speak more clearly
2. Use longer phrases (better detection)
3. Manually select language before speaking
4. Check transcription service logs

### Issue: Translation is incorrect or nonsensical

**Cause**: AWS Translate limitations with domain-specific terms

**Solution**:
1. Use simpler, more common phrases
2. Avoid highly technical agricultural terms
3. Consider adding custom terminology to AWS Translate
4. Report issues for future improvements

## Related Documentation

- [Translation Service](../src/features/i18n/translation.service.ts)
- [Voice Service](../src/features/i18n/voice.service.ts)
- [Kisan Mitra Service](../src/features/i18n/kisan-mitra.service.ts)
- [AWS Translate Documentation](https://docs.aws.amazon.com/translate/)

## Summary

Kisan Mitra provides seamless multi-language support through automatic translation. Users can interact in their preferred language, and the system handles all translation transparently. While this adds some latency, it provides a consistent experience across all 11 supported Indian languages without requiring separate bot configurations for each language.

The system is designed to be easily upgraded to native locale support as AWS Lex adds more Indian language locales in the future.
