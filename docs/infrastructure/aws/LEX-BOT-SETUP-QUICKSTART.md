# AWS Lex Bot Setup - Quick Start Guide

## Prerequisites

- AWS Account with admin access
- AWS CLI installed and configured
- Node.js and npm installed

## Step 1: Create AWS Lex Bot (AWS Console)

### 1.1 Navigate to AWS Lex

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Search for "Lex" in the services search bar
3. Click "Amazon Lex"
4. Make sure you're in the **ap-southeast-2 (Sydney)** region (top right)
   - **Note**: Mumbai (ap-south-1) doesn't support AWS Lex yet
   - Sydney is the closest available region to India

### 1.2 Create Bot

1. Click **"Create bot"**
2. Choose **"Create a blank bot"**
3. Bot configuration:
   - **Bot name**: `KisanMitra`
   - **Description**: `AI-powered voice assistant for Indian farmers`
   - **IAM permissions**: Choose "Create a role with basic Amazon Lex permissions"
   - **COPPA**: Select "No"
   - **Idle session timeout**: `5 minutes`
4. Click **"Next"**

### 1.3 Add Language

1. **Language**: Select `English (India)` - `en_IN`
2. **Voice interaction**: Choose `Aditi` (Indian English female voice)
3. **Intent classification confidence score threshold**: `0.40`
4. Click **"Done"**

## Step 2: Create Intents

### Intent 1: GetCropPrice

1. Click **"Add intent"** → **"Add empty intent"**
2. **Intent name**: `GetCropPrice`
3. **Description**: `Get current market prices for crops`

**Sample utterances** (click "Add utterance" for each):
```
What is the price of {crop}
How much is {crop} selling for
{crop} price
Tell me the rate of {crop}
What is the market price for {crop}
price of {crop}
{crop} rate
```

**Slots**:
1. Click **"Add slot"**
   - **Name**: `crop`
   - **Slot type**: Click "Add slot type" → Create new
     - **Slot type name**: `CropType`
     - **Slot resolution**: Expand values
     - **Values**: Add these (click "Add slot value" for each):
       ```
       Tomato
       Potato
       Onion
       Wheat
       Rice
       Corn
       Cotton
       Sugarcane
       Soybean
       Chickpea
       ```
   - **Required for this intent**: ✓ (checked)
   - **Prompt**: `Which crop would you like to know the price for?`

**Closing response**:
1. Scroll to "Closing response"
2. Click "Add message"
3. Message: `The current market price for {crop} is available in the app. Please check the prices section.`

4. Click **"Save intent"**

### Intent 2: GetWeather

1. Click **"Add intent"** → **"Add empty intent"**
2. **Intent name**: `GetWeather`
3. **Description**: `Provide weather information`

**Sample utterances**:
```
What is the weather
Tell me the weather forecast
Will it rain today
Weather today
What's the weather like
mausam kaisa hai
```

**Closing response**:
- Message: `I can help you check the weather. Please enable location access in the app for accurate weather information.`

Click **"Save intent"**

### Intent 3: GetFarmingAdvice

1. Click **"Add intent"** → **"Add empty intent"**
2. **Intent name**: `GetFarmingAdvice`
3. **Description**: `Provide farming tips and best practices`

**Sample utterances**:
```
How do I grow {crop}
Give me tips for {crop}
Best practices for {crop}
When should I plant {crop}
farming tips for {crop}
help me grow {crop}
```

**Slots**:
1. **Name**: `crop`
   - **Slot type**: `CropType` (select existing)
   - **Required**: ✓
   - **Prompt**: `Which crop would you like advice about?`

**Closing response**:
- Message: `For growing {crop}, I recommend checking our farming guide in the app. You can also consult with agricultural experts in your area.`

Click **"Save intent"**

### Intent 4: CreateListing

1. Click **"Add intent"** → **"Add empty intent"**
2. **Intent name**: `CreateListing`
3. **Description**: `Guide user through creating a listing`

**Sample utterances**:
```
I want to sell {crop}
Create a listing
Post my produce
List my {crop}
sell {crop}
I have {crop} to sell
```

**Slots**:
1. **Name**: `crop`
   - **Slot type**: `CropType`
   - **Required**: ✓
   - **Prompt**: `What crop would you like to sell?`

**Closing response**:
- Message: `Great! I'll help you create a listing for {crop}. Please go to the Create Listing section in the app to add photos, quantity, and price.`

Click **"Save intent"**

### Intent 5: NavigateApp

1. Click **"Add intent"** → **"Add empty intent"**
2. **Intent name**: `NavigateApp`
3. **Description**: `Navigate to different screens`

**Sample utterances**:
```
Go to {screen}
Open {screen}
Show me {screen}
Take me to {screen}
navigate to {screen}
```

**Slots**:
1. Click "Add slot type" → Create new
   - **Slot type name**: `ScreenName`
   - **Values**:
     ```
     home
     my listings
     search
     messages
     profile
     settings
     orders
     prices
     ```
2. **Name**: `screen`
   - **Slot type**: `ScreenName`
   - **Required**: ✓
   - **Prompt**: `Which screen would you like to go to?`

**Closing response**:
- Message: `Opening {screen} for you.`

Click **"Save intent"**

### Intent 6: HelpIntent (Built-in)

1. Click **"Add intent"** → **"Use built-in intent"**
2. Select **"AMAZON.HelpIntent"**
3. Add sample utterances:
```
Help
What can you do
How do I use this
Commands
```

**Closing response**:
- Message: `I'm Kisan Mitra, your farming assistant. I can help you with crop prices, weather, farming tips, creating listings, and navigation. What would you like help with?`

Click **"Save intent"**

### Intent 7: FallbackIntent (Built-in)

1. Click **"Add intent"** → **"Use built-in intent"**
2. Select **"AMAZON.FallbackIntent"**

**Closing response**:
- Message: `I didn't understand that. I can help with crop prices, weather, farming tips, creating listings, and navigation. What would you like to know?`

Click **"Save intent"**

## Step 3: Build and Test

### 3.1 Build the Bot

1. Click **"Build"** button (top right)
2. Wait for build to complete (1-2 minutes)
3. You'll see "Build successful" message

### 3.2 Test in Console

1. Click **"Test"** button (top right)
2. Try these queries:
   - "What is the price of tomato?"
   - "Tell me the weather"
   - "How do I grow wheat?"
   - "I want to sell rice"
   - "Go to my listings"
   - "Help"

3. Verify responses are correct

## Step 4: Create Bot Alias

### 4.1 Create Alias

1. In left sidebar, click **"Aliases"**
2. Click **"Create alias"**
3. **Alias name**: `prod`
4. **Description**: `Production alias`
5. **Associate with version**: Select `Latest`
6. Click **"Create"**

### 4.2 Get Bot IDs

1. In left sidebar, click **"Bot settings"**
2. Copy the **Bot ID** (looks like: `ABCDEFGHIJ`)
3. Go back to **"Aliases"**
4. Click on `prod` alias
5. Copy the **Alias ID** (looks like: `TSTALIASID`)

## Step 5: Configure Application

### 5.1 Update .env File

Add these to your `.env` file:

```bash
# AWS Lex Configuration
LEX_BOT_ID=YOUR_BOT_ID_HERE
LEX_BOT_ALIAS_ID=YOUR_ALIAS_ID_HERE
LEX_REGION=ap-southeast-2

# AWS Credentials (if not using IAM roles)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-southeast-2
```

### 5.2 Restart Server

```bash
npm run dev
```

## Step 6: Test Live Mode

### 6.1 Open Kisan Mitra UI

```
http://localhost:3000/kisan-mitra-test.html
```

### 6.2 Verify Live Mode

- Check that mode shows "Live" instead of "Mock"
- Status should say "Connected to AWS Lex"

### 6.3 Test Queries

Try these queries:
1. "What is the price of tomato?"
2. "What is the weather today?"
3. "How do I grow wheat?"
4. "I want to sell rice"
5. "Go to my listings"
6. "Help"

## Step 7: Add Hindi Support (Optional)

### 7.1 Add Hindi Language

1. In Lex console, click **"Languages"** in left sidebar
2. Click **"Add language"**
3. Select **"Hindi (India)"** - `hi_IN`
4. Choose voice: `Aditi` (supports Hindi)
5. Click **"Add"**

### 7.2 Copy Intents

1. For each intent, you'll need to add Hindi utterances
2. Example for GetCropPrice:
```
{crop} ka bhav kya hai
{crop} ki kimat batao
{crop} ka rate
```

3. Build the bot again

## Troubleshooting

### Bot Not Found Error

**Error**: `ResourceNotFoundException: Bot not found`

**Solution**:
- Verify BOT_ID is correct
- Verify ALIAS_ID is correct
- Check you're in the correct AWS region (ap-southeast-2)

### Permission Denied Error

**Error**: `AccessDeniedException`

**Solution**:
- Verify AWS credentials are correct
- Check IAM user has Lex permissions:
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "lex:RecognizeText",
          "lex:RecognizeUtterance"
        ],
        "Resource": "*"
      }
    ]
  }
  ```

### Intent Not Recognized

**Solution**:
- Add more sample utterances
- Lower confidence threshold (Bot settings)
- Rebuild the bot

### Slow Response Time

**Solution**:
- Check AWS region (use ap-southeast-2 for India)
- Verify network connectivity
- Check CloudWatch logs for errors

## Cost Estimation

**AWS Lex V2 Pricing** (as of 2024):
- Text requests: $0.00075 per request
- Speech requests: $0.004 per request
- First 10,000 text requests/month: **FREE**

**Example Monthly Cost** (10,000 users):
- 100,000 text requests: $75
- 50,000 speech requests: $200
- **Total**: ~$275/month

**Free Tier** (first 12 months):
- 10,000 text requests/month: FREE
- 5,000 speech requests/month: FREE

## Next Steps

1. ✅ Bot created and tested
2. ✅ Application configured
3. ✅ Live mode working

**Optional Enhancements**:
- Add more intents
- Integrate with Lambda for dynamic responses
- Add more languages
- Implement conversation logging
- Set up CloudWatch monitoring

## Support

- [AWS Lex Documentation](https://docs.aws.amazon.com/lexv2/latest/dg/what-is.html)
- [Lex V2 API Reference](https://docs.aws.amazon.com/lexv2/latest/APIReference/Welcome.html)
- [Troubleshooting Guide](https://docs.aws.amazon.com/lexv2/latest/dg/troubleshooting.html)

---

**Estimated Setup Time**: 30-45 minutes
**Difficulty**: Intermediate
**Status**: Ready to implement
