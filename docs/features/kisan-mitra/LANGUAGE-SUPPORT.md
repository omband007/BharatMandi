# Language Support Guide

## Overview

Kisan Mitra supports 11 Indian languages with different levels of support for text input vs voice input.

## Language Support Matrix

| Language | Code | Text Input | Voice Input (Transcribe) | Voice Output (Polly) |
|----------|------|------------|-------------------------|---------------------|
| English | en | ✅ Native | ✅ Native (en-IN) | ✅ Native (Raveena) |
| Hindi | hi | ✅ Via Translation | ✅ Native (hi-IN) | ✅ Native (Aditi) |
| Tamil | ta | ✅ Via Translation | ✅ Native (ta-IN) | ✅ Via Translation |
| Telugu | te | ✅ Via Translation | ✅ Native (te-IN) | ✅ Via Translation |
| Punjabi | pa | ✅ Via Translation | ⚠️ Fallback to English | ✅ Via Translation |
| Marathi | mr | ✅ Via Translation | ⚠️ Fallback to English | ✅ Via Translation |
| Bengali | bn | ✅ Via Translation | ⚠️ Fallback to English | ✅ Via Translation |
| Gujarati | gu | ✅ Via Translation | ⚠️ Fallback to English | ✅ Via Translation |
| Kannada | kn | ✅ Via Translation | ⚠️ Fallback to English | ✅ Via Translation |
| Malayalam | ml | ✅ Via Translation | ⚠️ Fallback to English | ✅ Via Translation |
| Odia | or | ✅ Via Translation | ⚠️ Fallback to English | ✅ Via Translation |

## Text Input (Typing)

### How It Works

When you **type** in any language:

1. Select your language from the dropdown
2. Type your question in that language's script
3. System translates to English
4. Sends to AWS Lex
5. Translates response back to your language

### Supported Scripts

- **Devanagari**: Hindi (हिन्दी), Marathi (मराठी)
- **Gurmukhi**: Punjabi (ਪੰਜਾਬੀ)
- **Bengali**: Bengali (বাংলা)
- **Gujarati**: Gujarati (ગુજરાતી)
- **Tamil**: Tamil (தமிழ்)
- **Telugu**: Telugu (తెలుగు)
- **Kannada**: Kannada (ಕನ್ನಡ)
- **Malayalam**: Malayalam (മലയാളം)
- **Odia**: Odia (ଓଡ଼ିଆ)
- **Latin**: English

### Example: Marathi Text Input

1. **Select**: मराठी (Marathi) from dropdown
2. **Type**: "टोमॅटोची किंमत काय आहे?"
3. **System**:
   - Detects language: Marathi (mr)
   - Translates to English: "What is the price of tomato?"
   - Sends to Lex
   - Gets response in English
   - Translates back to Marathi
4. **You see**: Marathi response

## Voice Input (Microphone)

### How It Works

When you **speak**:

1. Select your language from the dropdown
2. Click microphone button
3. Speak your question
4. System transcribes audio to text
5. Processes like text input above

### AWS Transcribe Support

AWS Transcribe only supports these Indian languages:
- ✅ English (en-IN)
- ✅ Hindi (hi-IN)
- ✅ Tamil (ta-IN)
- ✅ Telugu (te-IN)

### Unsupported Languages (Marathi, Punjabi, etc.)

For languages not supported by AWS Transcribe:

**Option 1: Speak in English**
- Select Marathi from dropdown
- Speak in English
- System will:
  - Transcribe as English
  - Process query
  - Respond in Marathi (text + audio)

**Option 2: Speak in Hindi**
- Select Marathi from dropdown
- Speak in Hindi (similar to Marathi)
- System will:
  - Transcribe as Hindi
  - Translate to English
  - Process query
  - Respond in Marathi

**Option 3: Type Instead**
- Use text input for full Marathi support
- Type in Marathi script
- Works perfectly!

## Voice Output (Audio Response)

### How It Works

Audio responses are generated using AWS Polly:

1. System has text response in your language
2. Generates audio using appropriate voice
3. Caches audio for future use

### Voice Selection

- **English**: Raveena (Indian English female)
- **Hindi**: Aditi (Hindi female) - Only language with native voice
- **All others**: Raveena with translated text

### Marathi Audio Output

For Marathi:
1. Response text is in Marathi (translated)
2. Audio is generated using Raveena voice
3. Raveena reads the Marathi text with English pronunciation
4. Result: Understandable but with English accent

## Troubleshooting

### Issue: "I selected Marathi but it's treating my input as English"

**For Text Input**:
- ✅ Should work fine - check if you're typing in Marathi script
- ✅ Make sure language dropdown shows "मराठी (Marathi)"
- ✅ Check browser console for errors

**For Voice Input**:
- ⚠️ Expected behavior - Marathi voice transcription not supported
- ✅ Solution: Speak in English or Hindi, or use text input

### Issue: "Audio sounds wrong for Marathi"

- ⚠️ Expected - AWS Polly doesn't have native Marathi voice
- ✅ Audio uses English voice reading Marathi text
- ✅ Text response is correct, audio has English accent

### Issue: "Translation is incorrect"

- Check if text is in correct script
- Try simpler phrases
- Report specific examples for improvement

## Best Practices

### For Marathi Users

**Text Input** (Recommended):
```
1. Select: मराठी (Marathi)
2. Type: "टोमॅटोची किंमत काय आहे?"
3. Get: Marathi text response + audio
```

**Voice Input** (Workaround):
```
1. Select: मराठी (Marathi)
2. Speak: "What is the price of tomato?" (in English)
3. Get: Marathi text response + audio
```

### For Hindi Users

**Full Support**:
```
1. Select: हिन्दी (Hindi)
2. Type or Speak: "टमाटर का भाव क्या है?"
3. Get: Hindi text + native Hindi audio
```

### For Tamil/Telugu Users

**Good Support**:
```
1. Select: தமிழ் (Tamil) or తెలుగు (Telugu)
2. Type or Speak in your language
3. Get: Native text + audio with English accent
```

## Language Detection

### Automatic Detection

For voice input, AWS Transcribe can auto-detect language among:
- English (en-IN)
- Hindi (hi-IN)
- Tamil (ta-IN)
- Telugu (te-IN)

### Manual Selection

Always select your preferred language from dropdown for:
- Correct response language
- Better translation accuracy
- Appropriate voice selection

## Future Improvements

### Planned Enhancements

1. **More Native Voices**: When AWS Polly adds Marathi, Tamil, Telugu voices
2. **Better Transcription**: When AWS Transcribe adds more Indian languages
3. **Hybrid Approach**: Use Google/Azure for unsupported languages
4. **Custom Models**: Train custom speech recognition for regional languages

### Workarounds Until Then

1. **Text input** for full language support
2. **English voice input** with native language output
3. **Hindi as bridge language** for similar scripts

## Testing Each Language

### Quick Test Phrases

**English**: "What is the price of tomato?"
**Hindi**: "टमाटर का भाव क्या है?"
**Marathi**: "टोमॅटोची किंमत काय आहे?"
**Punjabi**: "ਟਮਾਟਰ ਦੀ ਕੀਮਤ ਕੀ ਹੈ?"
**Tamil**: "தக்காளி விலை என்ன?"
**Telugu**: "టమోటా ధర ఎంత?"
**Bengali**: "টমেটোর দাম কত?"
**Gujarati**: "ટામેટાની કિંમત શું છે?"
**Kannada**: "ಟೊಮೇಟೊ ಬೆಲೆ ಎಷ್ಟು?"
**Malayalam**: "തക്കാളിയുടെ വില എന്താണ്?"
**Odia**: "ଟମାଟୋର ଦାମ କେତେ?"

### Expected Results

- **Text appears** in your selected language
- **Audio plays** (may have English accent for some languages)
- **Intent recognized** correctly
- **Response relevant** to your query

## Summary

| Feature | Fully Supported | Partially Supported | Workaround Needed |
|---------|----------------|---------------------|-------------------|
| Text Input | All 11 languages | - | - |
| Voice Input | English, Hindi, Tamil, Telugu | - | Marathi, Punjabi, Bengali, Gujarati, Kannada, Malayalam, Odia |
| Voice Output | English, Hindi | Tamil, Telugu, Marathi, Punjabi, Bengali, Gujarati, Kannada, Malayalam, Odia | - |

**Recommendation for Marathi**: Use **text input** for best experience. Voice input works but requires speaking in English or Hindi.
