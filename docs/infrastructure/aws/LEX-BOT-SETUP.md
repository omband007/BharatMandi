# AWS Lex Bot Setup Guide - Kisan Mitra

## Overview

This guide provides step-by-step instructions for creating and configuring the "Kisan Mitra" AWS Lex bot for the Bharat Mandi marketplace. Kisan Mitra is an AI-powered voice assistant that helps farmers with crop prices, weather information, farming advice, and app navigation.

## Prerequisites

- AWS Account with Lex V2 access
- IAM permissions for Lex bot creation
- AWS CLI configured (optional)

## Bot Configuration

### Basic Settings

- **Bot Name**: `KisanMitra`
- **Description**: AI-powered voice assistant for Indian farmers
- **IAM Role**: Create new role or use existing with Lex permissions
- **COPPA**: No (not directed at children under 13)
- **Idle Session Timeout**: 5 minutes
- **Session TTL**: 24 hours

### Language Support

Create the following locales:

1. **English (India)** - `en_IN` (Primary)
2. **Hindi (India)** - `hi_IN` (Primary)

Note: AWS Lex V2 has limited language support. For other Indian languages (Tamil, Telugu, Punjabi, etc.), we'll translate queries to English/Hindi before sending to Lex, then translate responses back.

## Intents

### 1. GetCropPrice Intent

**Purpose**: Get current market prices for crops

**Sample Utterances**:
- What is the price of {crop}
- How much is {crop} selling for
- {crop} price
- Tell me the rate of {crop}
- What is the market price for {crop}
- {crop} ka bhav kya hai (Hindi)
- {crop} ki kimat batao (Hindi)

**Slots**:
- **crop** (Required)
  - Slot Type: Custom - `CropType`
  - Prompt: "Which crop would you like to know the price for?"

**Fulfillment**: Lambda function or return to client

**Sample Response**:
```
The current market price for {crop} is ₹{price} per {unit}. 
Prices may vary by location and quality.
```

### 2. GetWeather Intent

**Purpose**: Provide weather information for user's location

**Sample Utterances**:
- What is the weather
- Tell me the weather forecast
- Will it rain today
- Weather in {location}
- Mausam kaisa hai (Hindi)
- Barish hogi kya (Hindi)

**Slots**:
- **location** (Optional)
  - Slot Type: AMAZON.City
  - Prompt: "Which location would you like weather for?"

**Fulfillment**: Lambda function or return to client

**Sample Response**:
```
The weather in {location} is {condition} with a temperature of {temp}°C. 
{rain_forecast}
```

### 3. GetFarmingAdvice Intent

**Purpose**: Provide farming tips and best practices

**Sample Utterances**:
- How do I grow {crop}
- Give me tips for {crop}
- Best practices for {crop}
- When should I plant {crop}
- {crop} ki kheti kaise karein (Hindi)
- {crop} ke liye tips do (Hindi)

**Slots**:
- **crop** (Required)
  - Slot Type: Custom - `CropType`
  - Prompt: "Which crop would you like advice about?"
- **topic** (Optional)
  - Slot Type: Custom - `FarmingTopic`
  - Values: planting, watering, fertilizer, pest_control, harvesting
  - Prompt: "What specific topic would you like help with?"

**Fulfillment**: Lambda function or return to client

**Sample Response**:
```
For {crop}, here are some tips for {topic}:
{advice_text}
```

### 4. CreateListing Intent

**Purpose**: Guide user through creating a marketplace listing

**Sample Utterances**:
- I want to sell {crop}
- Create a listing
- Post my produce
- List my {crop}
- Mujhe {crop} bechna hai (Hindi)
- Listing banao (Hindi)

**Slots**:
- **crop** (Required)
  - Slot Type: Custom - `CropType`
- **quantity** (Required)
  - Slot Type: AMAZON.Number
  - Prompt: "How much {crop} do you want to sell?"
- **unit** (Required)
  - Slot Type: Custom - `Unit`
  - Values: kg, quintal, ton, bag
  - Prompt: "What unit? (kg, quintal, ton, or bag)"
- **price** (Required)
  - Slot Type: AMAZON.Number
  - Prompt: "What price per {unit}?"

**Fulfillment**: Return to client (multi-step process)

**Sample Response**:
```
Great! I'll help you create a listing for {quantity} {unit} of {crop} at ₹{price} per {unit}.
Would you like to add photos and description?
```

### 5. NavigateApp Intent

**Purpose**: Navigate to different screens in the app

**Sample Utterances**:
- Go to {screen}
- Open {screen}
- Show me {screen}
- Take me to {screen}
- {screen} dikhao (Hindi)
- {screen} par jao (Hindi)

**Slots**:
- **screen** (Required)
  - Slot Type: Custom - `ScreenName`
  - Values: home, my_listings, search, messages, profile, settings, orders, prices
  - Prompt: "Which screen would you like to go to?"

**Fulfillment**: Return to client

**Sample Response**:
```
Opening {screen} for you.
```

### 6. HelpIntent

**Purpose**: Provide general help and list available commands

**Sample Utterances**:
- Help
- What can you do
- How do I use this
- Commands
- Madad chahiye (Hindi)
- Kya kar sakte ho (Hindi)

**Fulfillment**: Static response

**Sample Response**:
```
I'm Kisan Mitra, your farming assistant. I can help you with:
- Crop prices: "What is the price of tomato?"
- Weather: "What is the weather today?"
- Farming tips: "How do I grow wheat?"
- Create listings: "I want to sell rice"
- Navigate: "Go to my listings"

What would you like help with?
```

### 7. FallbackIntent

**Purpose**: Handle unrecognized queries

**Sample Response**:
```
I didn't understand that. I can help you with crop prices, weather, farming tips, 
creating listings, and navigation. What would you like to know?
```

## Custom Slot Types

### CropType

**Values** (add more as needed):
```
Tomato, टमाटर
Wheat, गेहूं
Rice, चावल
Potato, आलू
Onion, प्याज
Corn, मक्का
Cotton, कपास
Sugarcane, गन्ना
Soybean, सोयाबीन
Chickpea, चना
Lentil, दाल
Mango, आम
Banana, केला
Apple, सेब
Grapes, अंगूर
```

### FarmingTopic

**Values**:
```
Planting, बुवाई
Watering, सिंचाई
Fertilizer, खाद
Pest Control, कीट नियंत्रण
Harvesting, कटाई
Storage, भंडारण
```

### ScreenName

**Values**:
```
Home, होम
My Listings, मेरी लिस्टिंग
Search, खोज
Messages, संदेश
Profile, प्रोफाइल
Settings, सेटिंग्स
Orders, ऑर्डर
Prices, भाव
```

### Unit

**Values**:
```
Kilogram, किलो
Quintal, क्विंटल
Ton, टन
Bag, बोरी
```

## Bot Aliases

Create the following aliases:

1. **Development** - `dev`
   - For testing and development
   - Points to `$LATEST` version

2. **Staging** - `staging`
   - For pre-production testing
   - Points to specific version

3. **Production** - `prod`
   - For live users
   - Points to stable version

## Lambda Fulfillment (Optional)

If using Lambda for fulfillment:

1. Create Lambda function: `kisan-mitra-fulfillment`
2. Runtime: Node.js 18.x or Python 3.11
3. Attach IAM role with:
   - DynamoDB access (for crop prices)
   - External API access (for weather)
   - CloudWatch Logs

**Sample Lambda Response Format**:
```json
{
  "sessionState": {
    "dialogAction": {
      "type": "Close"
    },
    "intent": {
      "name": "GetCropPrice",
      "state": "Fulfilled"
    }
  },
  "messages": [
    {
      "contentType": "PlainText",
      "content": "The current price for tomato is ₹30 per kg."
    }
  ]
}
```

## Environment Variables

Add these to your application:

```bash
# AWS Lex Configuration
LEX_BOT_ID=<your-bot-id>
LEX_BOT_ALIAS_ID=<your-alias-id>
LEX_REGION=ap-south-1

# Session Configuration
LEX_SESSION_TIMEOUT=300000  # 5 minutes in ms
LEX_SESSION_TTL=86400       # 24 hours in seconds
```

## Testing the Bot

### In AWS Console

1. Go to Lex Console → Bots → KisanMitra
2. Click "Test" button
3. Try sample utterances:
   - "What is the price of tomato?"
   - "Tell me the weather"
   - "How do I grow wheat?"
   - "I want to sell rice"
   - "Go to my listings"

### With API

```bash
# Test with AWS CLI
aws lexv2-runtime recognize-text \
  --bot-id <bot-id> \
  --bot-alias-id <alias-id> \
  --locale-id en_IN \
  --session-id test-session-123 \
  --text "What is the price of tomato?"
```

## Monitoring and Logs

### CloudWatch Metrics

Monitor these metrics:
- **MissedUtterance**: Queries not matched to any intent
- **RuntimeRequestCount**: Total number of requests
- **RuntimeLatency**: Response time
- **RuntimeThrottles**: Rate limit hits

### Conversation Logs

Enable conversation logs for:
- Debugging intent recognition
- Improving utterances
- Understanding user patterns

**Storage Options**:
- CloudWatch Logs
- S3 bucket (for long-term storage)

## Cost Estimation

**AWS Lex V2 Pricing** (as of 2024):
- Text requests: $0.00075 per request
- Speech requests: $0.004 per request
- First 10,000 text requests/month: Free

**Estimated Monthly Cost** (for 10,000 users):
- 100,000 text requests: $75
- 50,000 speech requests: $200
- **Total**: ~$275/month

## Security Best Practices

1. **IAM Permissions**: Use least privilege principle
2. **Encryption**: Enable encryption at rest for conversation logs
3. **Session Management**: Implement session timeout and cleanup
4. **PII Redaction**: Enable PII redaction in conversation logs
5. **Rate Limiting**: Implement rate limiting in application layer

## Troubleshooting

### Common Issues

**Issue**: Intent not recognized
- **Solution**: Add more sample utterances, check slot values

**Issue**: Slow response time
- **Solution**: Optimize Lambda function, use caching

**Issue**: Language not supported
- **Solution**: Translate to English/Hindi before sending to Lex

**Issue**: Session expired
- **Solution**: Implement session refresh, increase timeout

## Next Steps

After bot creation:
1. Test all intents thoroughly
2. Implement KisanMitraService in application
3. Create API endpoints
4. Build UI components
5. Integrate with existing voice components
6. Add conversation logging
7. Monitor and iterate based on user feedback

## References

- [AWS Lex V2 Documentation](https://docs.aws.amazon.com/lexv2/latest/dg/what-is.html)
- [Lex V2 API Reference](https://docs.aws.amazon.com/lexv2/latest/APIReference/Welcome.html)
- [Best Practices for Lex](https://docs.aws.amazon.com/lexv2/latest/dg/best-practices.html)

---

**Status**: Ready for implementation
**Last Updated**: 2026-03-01
**Related Tasks**: Task 23 - Design and create AWS Lex bot
