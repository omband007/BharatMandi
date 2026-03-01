# Kisan Mitra Troubleshooting Guide

## Issue: "No listings found for [crop]" with suggestions like "pota?"

### Symptoms:
- You ask "potato prices" or "prices of potato"
- System responds: `No listings found for "pota". Did you mean: tomato, pota?`
- "pota" is not a real crop

### Root Cause:
This happens due to **two issues**:

1. **AWS Lex Slot Extraction Issue**: Lex is extracting "pota" instead of "potato" from your query
2. **No Marketplace Data**: Your marketplace database doesn't have any potato listings

### Why is Lex extracting "pota"?

AWS Lex needs to be configured with valid crop names in the slot type. Currently, the "crop" slot type in your Lex bot might not include "potato" as a valid value, so Lex is guessing and extracting partial words.

### Solutions:

#### Solution 1: Configure AWS Lex Slot Type (Recommended)

1. Go to AWS Lex Console
2. Open your bot (ID: YYEXVHRJQW)
3. Find the "crop" slot type
4. Add these crop values:
   ```
   tomato
   potato
   onion
   wheat
   rice
   maize
   cotton
   carrot
   cabbage
   cauliflower
   ```
5. Save and rebuild the bot

#### Solution 2: Add Marketplace Listings Data

Your marketplace database needs sample listings. Currently it's empty.

**Option A: Use Mock Mode**
- Click the "Mode" toggle in the POC UI to switch to "Mock" mode
- Mock mode simulates responses without needing real data

**Option B: Add Real Data**
- Create marketplace listings through the app
- Or run the seed script: `npm run seed:marketplace` (when implemented)

#### Solution 3: Improve Query Phrasing

Try these query formats that work better with Lex:

✅ **Good queries:**
- "What is the price of potato"
- "Show me potato prices"
- "Potato rate"
- "How much is potato"

❌ **Problematic queries:**
- "potato prices" (Lex might extract "pota")
- "prices of potato" (Lex might extract "pota")

### Temporary Workaround:

Use **Mock Mode** for testing:
1. Click the "Mode" toggle in the POC UI header
2. It will switch from "Live" to "Mock"
3. Mock mode simulates responses without AWS Lex
4. All features work with simulated data

### Verification:

After fixing, test with:
```
What is the price of potato?
```

Expected response:
```
📊 POTATO PRICE INFORMATION

🌾 FARM GATE PRICE (What farmers are selling at):
Average: ₹22 per kg
Range: ₹20 - ₹25 per kg

🏪 ESTIMATED RETAIL PRICE (Market price for consumers):
Average: ₹30.8 per kg
Range: ₹28 - ₹35 per kg

📈 Price Trend: STABLE
📍 Based on 3 active farmer listings
```

## Issue: Line Breaks Not Showing

### Symptoms:
- Response text appears as one long line
- No formatting or line breaks visible

### Solution:
✅ **Fixed in latest version!**

Refresh the page (Ctrl+F5 or Cmd+Shift+R) to get the latest version with proper line break formatting.

## Issue: Voice Input Not Working for Marathi

### Symptoms:
- Voice input button doesn't work when Marathi is selected
- Or transcription is incorrect

### Root Cause:
AWS Transcribe doesn't support Marathi voice input yet.

### Solution:
**For Marathi users:**
1. **Option 1**: Use text input (type in Marathi)
2. **Option 2**: Speak in Hindi or English, get response in Marathi
   - Select Marathi language
   - Click microphone
   - Speak in Hindi or English
   - Response will be in Marathi

## Issue: Weather Not Working

### Symptoms:
- Weather queries return errors
- "Service temporarily unavailable"

### Root Cause:
OpenWeatherMap API key not configured.

### Solution:
1. Get free API key from: https://openweathermap.org/api
2. Add to `.env` file:
   ```
   OPENWEATHER_API_KEY=your_api_key_here
   ```
3. Restart development server

## Issue: Farming Advice Not Working

### Symptoms:
- Farming advice queries return errors
- "No tips found"

### Root Cause:
MongoDB not seeded with farming tips.

### Solution:
Run the seed script:
```bash
npm run seed:farming-tips
```

Expected output:
```
✅ Successfully seeded 32 farming tips
```

## Issue: Translation Not Working

### Symptoms:
- Responses always in English
- Translation errors in console

### Root Cause:
AWS Translate credentials not configured or region issue.

### Solution:
1. Check AWS credentials are configured
2. Verify region is set to Sydney (ap-southeast-2)
3. Check `.env` file:
   ```
   AWS_REGION=ap-southeast-2
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   ```

## Issue: "Connected to AWS Lex" but Queries Fail

### Symptoms:
- UI shows "Mode: Live"
- All queries return errors

### Root Cause:
AWS Lex bot not properly configured or credentials issue.

### Solution:
1. Check bot configuration in `.env`:
   ```
   LEX_BOT_ID=YYEXVHRJQW
   LEX_BOT_ALIAS_ID=COP9IOYDL0
   AWS_REGION=ap-southeast-2
   ```
2. Verify AWS credentials have `AmazonLexRunBotsOnly` permission
3. Test connection: `npm run test:lex`

## Getting Help

If issues persist:

1. **Check console logs**: Open browser DevTools (F12) and check Console tab
2. **Check server logs**: Look at terminal where `npm run dev` is running
3. **Try Mock Mode**: Switch to Mock mode to isolate the issue
4. **Check documentation**: See `docs/features/kisan-mitra/` for more guides

## Common Error Messages

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "No listings found for [crop]" | No marketplace data | Add listings or use Mock mode |
| "Service temporarily unavailable" | API key missing | Configure API keys in `.env` |
| "Translation failed" | AWS Translate issue | Check credentials and region |
| "Failed to transcribe audio" | Microphone or AWS Transcribe issue | Check permissions and language support |
| "Kisan Mitra is temporarily unavailable" | Lex bot issue | Check bot configuration |

---

**Last Updated**: March 1, 2026
**Version**: Phase 1 Complete
