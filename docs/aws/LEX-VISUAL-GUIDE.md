# AWS Lex Visual Setup Guide

## Overview

This guide provides a visual walkthrough for setting up the Kisan Mitra bot in AWS Lex. Follow the screenshots and instructions below.

## Table of Contents

1. [Create Bot](#1-create-bot)
2. [Add Intents](#2-add-intents)
3. [Configure Slots](#3-configure-slots)
4. [Build and Test](#4-build-and-test)
5. [Create Alias](#5-create-alias)
6. [Get Bot IDs](#6-get-bot-ids)

---

## 1. Create Bot

### Step 1.1: Navigate to Amazon Lex

1. Go to AWS Console: https://console.aws.amazon.com/
2. Search for "Lex" in the services search bar
3. Click "Amazon Lex"
4. **Important**: Select **ap-south-1 (Mumbai)** region in top right

```
┌─────────────────────────────────────────────────────────┐
│ AWS Console                                    [Mumbai ▼]│
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Search: [Lex                                        🔍] │
│                                                           │
│  Services:                                                │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Amazon Lex                                       │    │
│  │ Build conversational interfaces                  │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Step 1.2: Create New Bot

Click **"Create bot"** button

```
┌─────────────────────────────────────────────────────────┐
│ Amazon Lex V2                          [Create bot]      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Bots (0)                                                 │
│                                                           │
│  No bots found                                            │
│  Get started by creating your first bot                  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Step 1.3: Bot Configuration

Choose **"Create a blank bot"**

```
┌─────────────────────────────────────────────────────────┐
│ Create bot                                                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ○ Start with an example                                 │
│  ● Create a blank bot                                    │
│                                                           │
│  Bot name: [KisanMitra                              ]    │
│                                                           │
│  Description: [AI-powered voice assistant for Indian]    │
│               [farmers                              ]    │
│                                                           │
│  IAM permissions:                                         │
│  ● Create a role with basic Amazon Lex permissions       │
│  ○ Use an existing role                                  │
│                                                           │
│  COPPA:                                                   │
│  ● No                                                     │
│  ○ Yes                                                    │
│                                                           │
│  Idle session timeout: [5] minutes                       │
│                                                           │
│                              [Cancel]  [Next]            │
└─────────────────────────────────────────────────────────┘
```

### Step 1.4: Add Language

```
┌─────────────────────────────────────────────────────────┐
│ Add language to KisanMitra                                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Language: [English (India) - en_IN            ▼]        │
│                                                           │
│  Voice interaction:                                       │
│  Voice: [Aditi - Female                        ▼]        │
│                                                           │
│  Intent classification confidence score threshold:        │
│  [0.40                                          ]         │
│                                                           │
│                              [Cancel]  [Done]            │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Add Intents

### Step 2.1: Create GetCropPrice Intent

Click **"Add intent"** → **"Add empty intent"**

```
┌─────────────────────────────────────────────────────────┐
│ KisanMitra > en_IN                                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Intents (0)                          [Add intent ▼]     │
│                                                           │
│  No intents found                                         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Step 2.2: Intent Configuration

```
┌─────────────────────────────────────────────────────────┐
│ GetCropPrice                                              │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Intent name: [GetCropPrice                         ]    │
│  Description: [Get current market prices for crops  ]    │
│                                                           │
│  Sample utterances:                    [Add utterance]   │
│  ┌───────────────────────────────────────────────────┐  │
│  │ What is the price of {crop}                       │  │
│  │ How much is {crop} selling for                    │  │
│  │ {crop} price                                      │  │
│  │ Tell me the rate of {crop}                        │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  Slots:                                [Add slot]        │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Name: crop                                        │  │
│  │ Slot type: CropType                               │  │
│  │ Required: ✓                                       │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│  Closing response:                     [Add message]     │
│  ┌───────────────────────────────────────────────────┐  │
│  │ The current market price for {crop} is available │  │
│  │ in the app. Please check the prices section.     │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
│                              [Cancel]  [Save intent]     │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Configure Slots

### Step 3.1: Create CropType Slot

Click **"Add slot type"** in the slot configuration

```
┌─────────────────────────────────────────────────────────┐
│ Create slot type                                          │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Slot type name: [CropType                          ]    │
│                                                           │
│  Slot resolution: ● Expand values                        │
│                   ○ Restrict to slot values              │
│                                                           │
│  Slot values:                          [Add slot value]  │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Value         │ Synonyms                          │  │
│  ├───────────────┼───────────────────────────────────┤  │
│  │ Tomato        │                                   │  │
│  │ Potato        │                                   │  │
│  │ Onion         │                                   │  │
│  │ Wheat         │                                   │  │
│  │ Rice          │                                   │  │
│  │ Corn          │                                   │  │
│  │ Cotton        │                                   │  │
│  │ Sugarcane     │                                   │  │
│  │ Soybean       │                                   │  │
│  │ Chickpea      │                                   │  │
│  └───────────────┴───────────────────────────────────┘  │
│                                                           │
│                              [Cancel]  [Add]             │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Build and Test

### Step 4.1: Build Bot

Click **"Build"** button in top right

```
┌─────────────────────────────────────────────────────────┐
│ KisanMitra > en_IN                    [Build]  [Test]    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Building bot...                                          │
│  ████████████████████░░░░░░░░░░░░░░░░░░░░░░░ 60%        │
│                                                           │
│  This may take a few minutes...                           │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Step 4.2: Test Bot

Click **"Test"** button after build completes

```
┌─────────────────────────────────────────────────────────┐
│ Test bot                                          [Close] │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Bot: Hello! How can I help you?                 │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ You: What is the price of tomato?              │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Bot: The current market price for tomato is     │    │
│  │      available in the app. Please check the     │    │
│  │      prices section.                             │    │
│  │                                                   │    │
│  │ Intent: GetCropPrice                             │    │
│  │ Confidence: 0.95                                 │    │
│  │ Slots: crop=tomato                               │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  [Type your message...                          ] [Send] │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Create Alias

### Step 5.1: Navigate to Aliases

Click **"Aliases"** in left sidebar

```
┌──────────────────┬──────────────────────────────────────┐
│ KisanMitra       │ Aliases                              │
│                  ├──────────────────────────────────────┤
│ ▼ Bot versions   │                                      │
│   Languages      │ Aliases (0)          [Create alias]  │
│   Aliases        │                                      │
│   Bot settings   │ No aliases found                     │
│   Deployment     │                                      │
│                  │                                      │
└──────────────────┴──────────────────────────────────────┘
```

### Step 5.2: Create Production Alias

```
┌─────────────────────────────────────────────────────────┐
│ Create alias                                              │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Alias name: [prod                                  ]    │
│                                                           │
│  Description: [Production alias                     ]    │
│                                                           │
│  Associate with version:                                  │
│  ● Latest                                                 │
│  ○ Specific version                                      │
│                                                           │
│                              [Cancel]  [Create]          │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Get Bot IDs

### Step 6.1: Get Bot ID

Click **"Bot settings"** in left sidebar

```
┌──────────────────┬──────────────────────────────────────┐
│ KisanMitra       │ Bot settings                         │
│                  ├──────────────────────────────────────┤
│ ▼ Bot versions   │                                      │
│   Languages      │ General                              │
│   Aliases        │                                      │
│   Bot settings   │ Bot ID: ABCD1234EFGH                 │
│   Deployment     │ [Copy]                               │
│                  │                                      │
│                  │ Bot name: KisanMitra                 │
│                  │                                      │
│                  │ Description: AI-powered voice        │
│                  │ assistant for Indian farmers         │
│                  │                                      │
└──────────────────┴──────────────────────────────────────┘
```

**Copy the Bot ID**: `ABCD1234EFGH`

### Step 6.2: Get Alias ID

Click **"Aliases"** → Click on **"prod"** alias

```
┌──────────────────┬──────────────────────────────────────┐
│ KisanMitra       │ Alias: prod                          │
│                  ├──────────────────────────────────────┤
│ ▼ Bot versions   │                                      │
│   Languages      │ Alias ID: TSTALIASID                 │
│   Aliases        │ [Copy]                               │
│   Bot settings   │                                      │
│   Deployment     │ Alias name: prod                     │
│                  │                                      │
│                  │ Description: Production alias        │
│                  │                                      │
│                  │ Associated version: Latest           │
│                  │                                      │
└──────────────────┴──────────────────────────────────────┘
```

**Copy the Alias ID**: `TSTALIASID`

---

## 7. Configure Application

### Step 7.1: Update .env File

Open your `.env` file and add:

```bash
# AWS Lex Configuration
LEX_BOT_ID=ABCD1234EFGH
LEX_BOT_ALIAS_ID=TSTALIASID
LEX_REGION=ap-south-1
```

### Step 7.2: Test Connection

Run the test script:

```bash
node scripts/test-lex-connection.js
```

Expected output:

```
============================================================
AWS Lex Connection Test
============================================================

1. Checking environment variables...
   ✓ LEX_BOT_ID: ABCD1234EFGH
   ✓ LEX_BOT_ALIAS_ID: TSTALIASID
   ✓ Region: ap-south-1

2. Initializing AWS Lex client...
   ✓ Lex client initialized

3. Testing connection with sample query...
   Query: "What is the price of tomato?"
   ✓ Connection successful!

4. Response details:
   Intent: GetCropPrice
   Intent State: Fulfilled
   Response: The current market price for tomato is available...
   Slots:
     - crop: tomato

5. Testing multiple intents...
   ✓ "What is the weather today?" → GetWeather
   ✓ "How do I grow wheat?" → GetFarmingAdvice
   ✓ "I want to sell rice" → CreateListing
   ✓ "Go to my listings" → NavigateApp
   ✓ "Help" → AMAZON.HelpIntent

============================================================
Test Summary
============================================================
Total tests: 6
Passed: 6

✓ AWS Lex is configured and working!

You can now use Kisan Mitra in live mode.
Open: http://localhost:3000/kisan-mitra-test.html
```

---

## 8. Test in Application

### Step 8.1: Start Server

```bash
npm run dev
```

### Step 8.2: Open Kisan Mitra UI

Navigate to: `http://localhost:3000/kisan-mitra-test.html`

### Step 8.3: Verify Live Mode

```
┌─────────────────────────────────────────────────────────┐
│ Kisan Mitra                    Mode: Live               │
├─────────────────────────────────────────────────────────┤
│ Status: Connected to AWS Lex                             │
└─────────────────────────────────────────────────────────┘
```

### Step 8.4: Test Queries

Try these queries in the chat:

1. "What is the price of tomato?"
2. "What is the weather today?"
3. "How do I grow wheat?"
4. "I want to sell rice"
5. "Go to my listings"
6. "Help"

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Bot not found | Verify Bot ID and Alias ID are correct |
| Permission denied | Check AWS credentials and IAM permissions |
| Intent not recognized | Add more sample utterances and rebuild |
| Slow response | Check AWS region (use ap-south-1) |

### Getting Help

- AWS Lex Documentation: https://docs.aws.amazon.com/lexv2/
- Support: Check CloudWatch logs for detailed errors
- Test script: Run `node scripts/test-lex-connection.js`

---

## Next Steps

✅ Bot created and configured
✅ Application connected
✅ Live mode working

**Optional Enhancements:**
- Add more intents
- Add Hindi language support
- Integrate with Lambda
- Set up CloudWatch monitoring

---

**Estimated Time**: 30-45 minutes
**Difficulty**: Intermediate
**Last Updated**: 2026-03-01
