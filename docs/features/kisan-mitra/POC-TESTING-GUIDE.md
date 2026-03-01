# Kisan Mitra POC UI Testing Guide

## Quick Start

1. **Open the POC UI**: Navigate to http://localhost:3000/kisan-mitra-test.html
2. **Development server is already running** on port 3000
3. **Current mode**: Mock mode (AWS Lex not required for basic testing)

## What's Been Implemented (Phase 1 Complete ✓)

### 1. Crop Price Handler ✓
- Shows **farm gate prices** (what farmers sell at)
- Shows **estimated retail prices** (market prices with 40% markup)
- Price statistics (average, min, max)
- Price trend analysis (up/down/stable)
- Multi-language support

### 2. Weather Handler ✓
- Current weather conditions
- 3-day forecast
- Farming advice based on weather
- Multi-language support

### 3. Farming Advice Handler ✓
- 32 farming tips across 7 major crops
- Multi-language support
- Fuzzy matching for crop names

## Testing Scenarios

### Scenario 1: Test Crop Price Query (Farm Gate + Retail)

**Test in English:**
1. Select "English" from language dropdown
2. Type: "What is the price of tomato?"
3. Click Send or press Enter

**Expected Response:**
```
📊 TOMATO PRICE INFORMATION

🌾 FARM GATE PRICE (What farmers are selling at):
   Average: ₹35 per kg
   Range: ₹30 - ₹40 per kg

🏪 ESTIMATED RETAIL PRICE (Market price for consumers):
   Average: ₹49 per kg
   Range: ₹42 - ₹56 per kg

📈 Price Trend: STABLE
📍 Based on 3 active farmer listings

💡 Note: Retail prices include transportation, handling, and market fees.
```

**Test in Hindi:**
1. Select "हिन्दी (Hindi)" from language dropdown
2. Type: "टमाटर का भाव क्या है?"
3. Click Send

**Expected**: Same information translated to Hindi

**Test in Marathi:**
1. Select "मराठी (Marathi)" from language dropdown
2. Type: "टोमॅटोची किंमत काय आहे?"
3. Click Send

**Expected**: Same information translated to Marathi

### Scenario 2: Test Weather Query

**Quick Action Button:**
1. Click the "🌤️ Weather" quick action button

**Expected Response:**
- Current weather conditions
- Temperature
- 3-day forecast
- Farming advice based on weather

**Manual Query:**
1. Type: "What is the weather today?"
2. Click Send

### Scenario 3: Test Farming Advice

**Quick Action Button:**
1. Click the "🌾 Farming Tips" quick action button

**Expected Response:**
- Farming tips for wheat
- Planting season
- Irrigation advice
- Fertilizer recommendations
- Harvest timing

**Test Different Crops:**
1. Type: "How do I grow rice?"
2. Type: "Tell me about tomato farming"
3. Type: "Potato cultivation tips"

**Available Crops** (32 tips total):
- Wheat
- Rice
- Tomato
- Potato
- Onion
- Maize
- Cotton

### Scenario 4: Test Voice Input

**Note**: Voice input requires speaking in English or Hindi (AWS Transcribe limitation)

1. Click the microphone button (🎤)
2. Allow microphone permissions if prompted
3. Speak your query clearly: "What is the price of tomato?"
4. The button will turn red (⏹️) while recording
5. Stop speaking - transcription will appear automatically
6. Message will be sent automatically

**Marathi Users**: Use text input instead of voice (speak in English/Hindi for voice)

### Scenario 5: Test Multi-Language Support

**Test All 11 Languages:**
1. English
2. Hindi (हिन्दी)
3. Punjabi (ਪੰਜਾਬੀ)
4. Marathi (मराठी)
5. Tamil (தமிழ்)
6. Telugu (తెలుగు)
7. Bengali (বাংলা)
8. Gujarati (ગુજરાતી)
9. Kannada (ಕನ್ನಡ)
10. Malayalam (മലയാളം)
11. Odia (ଓଡ଼ିଆ)

**For each language:**
1. Select language from dropdown
2. Type a query in that language
3. Verify response is translated correctly

### Scenario 6: Test Quick Actions

**All Quick Action Buttons:**
1. 🍅 Tomato Price - Tests crop price handler
2. 🌤️ Weather - Tests weather handler
3. 🌾 Farming Tips - Tests farming advice handler
4. 📝 Create Listing - Tests intent recognition (not implemented yet)
5. ❓ Help - Tests help intent

### Scenario 7: Test Session Statistics

**Monitor the stats panel at the bottom:**
- **Messages Sent**: Increments with each message
- **Intents Recognized**: Increments when AI recognizes intent
- **Avg Confidence**: Shows AI confidence level (0-100%)
- **Current Language**: Shows selected language

## Mock Mode vs Live Mode

### Current Setup: Mock Mode
- **No AWS Lex required**
- Simulates AI responses
- Good for UI/UX testing
- Instant responses

**To test in Mock Mode:**
- Just use the UI as-is
- All features work with simulated data

### Switching to Live Mode (AWS Lex)

**Prerequisites:**
1. AWS Lex bot configured (already done: ID YYEXVHRJQW)
2. Environment variables set in `.env`:
   ```
   LEX_BOT_ID=YYEXVHRJQW
   LEX_BOT_ALIAS_ID=COP9IOYDL0
   AWS_REGION=ap-southeast-2
   ```
3. AWS credentials configured

**To enable Live Mode:**
1. Restart the development server
2. The UI will auto-detect AWS Lex configuration
3. Mode toggle will show "Live" instead of "Mock"

## Database Requirements

### For Full Functionality:

**1. MongoDB (Farming Advice) ✓**
- Already seeded with 32 farming tips
- Working perfectly

**2. PostgreSQL/SQLite (Crop Prices)**
- Needs marketplace listings data
- Currently using mock data in Mock Mode

**3. OpenWeatherMap API (Weather)**
- Needs `OPENWEATHER_API_KEY` in `.env`
- Get free API key from: https://openweathermap.org/api

## Known Limitations

### Voice Input:
- **Marathi**: AWS Transcribe doesn't support Marathi voice input
  - **Workaround**: Use text input, or speak in English/Hindi
- **Other languages**: Voice input works (speak in English/Hindi, response in selected language)

### Database:
- **Crop prices**: Need real marketplace data for accurate prices
- **Weather**: Need OpenWeatherMap API key for real weather data

### AWS Lex:
- **Mock mode**: Simulated responses (good for testing)
- **Live mode**: Requires AWS Lex configuration

## Troubleshooting

### Issue: "API not available, using mock mode"
**Solution**: This is normal if AWS Lex is not configured. Mock mode works fine for testing.

### Issue: Voice input not working
**Solution**: 
1. Check microphone permissions in browser
2. Ensure you're using HTTPS or localhost
3. Speak clearly in English or Hindi

### Issue: No crop price data
**Solution**: 
1. In Mock mode: Uses simulated data (this is normal)
2. In Live mode: Need to seed marketplace database with listings

### Issue: Weather not working
**Solution**: 
1. In Mock mode: Uses simulated weather (this is normal)
2. In Live mode: Add `OPENWEATHER_API_KEY` to `.env`

### Issue: Translation not working
**Solution**: 
1. Check AWS credentials are configured
2. Check AWS Translate service is accessible in Sydney region
3. In Mock mode: Translation is simulated

## Next Steps (Phase 2-5)

After testing Phase 1, we'll implement:

**Phase 2: Conversation Context** (2-3 days)
- Remember previous queries
- Context-aware responses
- Follow-up questions

**Phase 3: Conversation History** (2-3 days)
- Save conversation history
- View past conversations
- Search history

**Phase 4: Privacy Controls** (1-2 days)
- Clear conversation history
- Data retention settings
- Privacy preferences

**Phase 5: Testing & Polish** (2-3 days)
- Integration tests
- Performance optimization
- Bug fixes

## Feedback

Please test all scenarios and provide feedback on:
1. Response accuracy
2. Translation quality
3. UI/UX experience
4. Performance
5. Any bugs or issues

---

**Last Updated**: March 1, 2026
**Phase**: 1 Complete (Database Integrations)
**Next Phase**: 2 (Conversation Context)
