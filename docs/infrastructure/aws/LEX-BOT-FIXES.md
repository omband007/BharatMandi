# AWS Lex Bot Fixes - GetWeather Intent

**Date**: March 11, 2026  
**Issue**: Build language failure with slot validation errors

---

## Problem Summary

The GetWeather intent has errors because:
1. Response message references slots (`{condition}`, `{temp}`, `{rain_forecast}`) that don't exist as input slots
2. `slotToElicit` is set in the success response (should only be in prompts)
3. Need to connect to user profile for location data

---

## Quick Fix (Apply This First)

### Step 1: Fix GetWeather Intent Response

1. Go to AWS Lex Console → Bots → KisanMitra
2. Select GetWeather intent
3. Scroll to "Closing response" section
4. **Replace the response message with**:
   ```
   I'll check the weather for you.
   ```
5. Make sure "Next step" is set to **"End conversation"** (NOT "Elicit slot")
6. Click "Save intent"
7. Click "Build" button at top

This removes the slot reference errors and the elicitSlot error.

---

## Connecting to User Profile for Location

### Architecture Flow

```
Frontend → Backend API → Get User Profile → Extract Location → Lex Bot → Lambda (optional)
```

### Implementation

#### Option 1: Client-Side Handling (Simpler)

**Step 1**: Update Kisan Mitra Service

```typescript
// src/features/kisan-mitra/kisan-mitra.service.ts

async sendMessage(userId: string, message: string): Promise<any> {
    try {
        // Get user profile
        const userProfile = await this.getUserProfile(userId);
        
        // Prepare session attributes with user data
        const sessionAttributes = {
            userId: userId,
            userLocation: userProfile?.city || userProfile?.location || null,
            userName: userProfile?.name || null
        };
        
        // Call Lex
        const lexResponse = await this.lexClient.send(
            new RecognizeTextCommand({
                botId: process.env.LEX_BOT_ID,
                botAliasId: process.env.LEX_BOT_ALIAS_ID,
                localeId: 'en_IN',
                sessionId: `user-${userId}`,
                text: message,
                sessionState: {
                    sessionAttributes: sessionAttributes
                }
            })
        );
        
        // If GetWeather intent, fetch weather using user location
        if (lexResponse.sessionState.intent.name === 'GetWeather') {
            const location = lexResponse.sessionState.intent.slots?.location?.value?.interpretedValue 
                || sessionAttributes.userLocation;
            
            if (location) {
                const weather = await this.getWeather(location);
                return {
                    ...lexResponse,
                    weatherData: weather,
                    message: `The weather in ${location} is ${weather.condition} with a temperature of ${weather.temp}°C. ${weather.rainForecast}`
                };
            }
        }
        
        return lexResponse;
    } catch (error) {
        console.error('Lex error:', error);
        throw error;
    }
}

private async getUserProfile(userId: string): Promise<any> {
    const profile = await this.profileModel.findOne({ userId }).exec();
    return profile;
}

private async getWeather(location: string): Promise<any> {
    // Call weather API
    const apiKey = process.env.WEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    return {
        condition: data.weather[0].description,
        temp: Math.round(data.main.temp),
        rainForecast: data.weather[0].main === 'Rain' ? 'Rain is expected today.' : 'No rain expected today.'
    };
}
```

**Step 2**: Update Frontend

```javascript
// public/js/kisan-mitra.js

async function sendMessage(message) {
    try {
        const response = await fetch('/api/kisan-mitra/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        
        const data = await response.json();
        
        // Display response
        if (data.weatherData) {
            displayMessage(data.message, 'bot');
        } else {
            displayMessage(data.messages[0].content, 'bot');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}
```

#### Option 2: Lambda Fulfillment (More Scalable)

**Step 1**: Create Lambda Function

Create file: `lambda/kisan-mitra-weather/index.js`

```javascript
const axios = require('axios');

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    const intent = event.sessionState.intent;
    const slots = intent.slots;
    const sessionAttributes = event.sessionState.sessionAttributes || {};
    
    // Get location from slot or session (user profile)
    let location = slots.location?.value?.interpretedValue || sessionAttributes.userLocation;
    
    if (!location) {
        return {
            sessionState: {
                dialogAction: { type: 'ElicitSlot', slotToElicit: 'location' },
                intent: intent
            },
            messages: [{
                contentType: 'PlainText',
                content: 'Which location would you like weather for?'
            }]
        };
    }
    
    try {
        const apiKey = process.env.WEATHER_API_KEY;
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`;
        
        const response = await axios.get(url);
        const weather = response.data;
        
        const condition = weather.weather[0].description;
        const temp = Math.round(weather.main.temp);
        const rainForecast = weather.weather[0].main === 'Rain' 
            ? 'Rain is expected today.' 
            : 'No rain expected today.';
        
        return {
            sessionState: {
                dialogAction: { type: 'Close' },
                intent: { name: intent.name, state: 'Fulfilled' }
            },
            messages: [{
                contentType: 'PlainText',
                content: `The weather in ${location} is ${condition} with a temperature of ${temp}°C. ${rainForecast}`
            }]
        };
        
    } catch (error) {
        console.error('Weather API error:', error);
        return {
            sessionState: {
                dialogAction: { type: 'Close' },
                intent: { name: intent.name, state: 'Failed' }
            },
            messages: [{
                contentType: 'PlainText',
                content: `Sorry, I couldn't get weather information for ${location}.`
            }]
        };
    }
};
```

**Step 2**: Deploy Lambda

```bash
# Create deployment package
cd lambda/kisan-mitra-weather
npm install axios
zip -r function.zip .

# Upload to Lambda
aws lambda create-function \
  --function-name kisan-mitra-weather \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-lex-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --environment Variables={WEATHER_API_KEY=your_api_key}
```

**Step 3**: Connect Lambda to Lex

1. Go to Lex Console → GetWeather intent
2. Scroll to "Fulfillment"
3. Select "Use a Lambda function for fulfillment"
4. Choose `kisan-mitra-weather`
5. **Remove** the closing response message (Lambda provides it)
6. Save and Build

---

## Testing

### Test 1: Weather Without Location
```
User: "What is the weather?"
Bot: "Which location would you like weather for?"
User: "Mumbai"
Bot: "The weather in Mumbai is clear with a temperature of 28°C. No rain expected today."
```

### Test 2: Weather With User Profile Location
```
[User profile has location: "Pune"]
User: "What is the weather?"
Bot: "The weather in Pune is partly cloudy with a temperature of 25°C. No rain expected today."
```

### Test 3: Weather With Specific Location
```
User: "Weather in Delhi"
Bot: "The weather in Delhi is hazy with a temperature of 32°C. No rain expected today."
```

---

## Environment Variables

Add to `.env`:

```bash
# Weather API (OpenWeatherMap)
WEATHER_API_KEY=your_openweathermap_api_key

# AWS Lex
LEX_BOT_ID=your_bot_id
LEX_BOT_ALIAS_ID=your_alias_id
LEX_REGION=ap-south-1
```

---

## Summary

**Immediate Action** (to fix build errors):
1. Change GetWeather success response to: "I'll check the weather for you."
2. Set next step to "End conversation"
3. Save and Build

**User Profile Integration**:
- Option 1 (Simpler): Handle weather in backend API, pass user location via session attributes
- Option 2 (Better): Use Lambda fulfillment, pass user location via session attributes

**Key Points**:
- Session attributes carry user data from backend to Lex/Lambda
- User profile location is extracted from MongoDB
- Weather API is called with user's location
- Response is formatted and returned to user

