# Troubleshooting AWS Lex ResourceNotFoundException (404 Error)

## Problem
You're getting a `ResourceNotFoundException` (404 error) when trying to use the Kisan Mitra service, even though the test connection script works.

## Root Cause
The bot exists and the test connection works, but there might be an issue with:
1. The bot not being fully built after recent changes
2. The locale (`en_IN`) not being properly configured
3. The bot version not being associated with the alias

## Solution Steps

### Step 1: Verify Bot Build Status

1. Go to [AWS Lex Console](https://ap-southeast-2.console.aws.amazon.com/lexv2/home?region=ap-southeast-2#bots)
2. Click on your bot (ID: `YYEXVHRJQW`)
3. Select the `en_IN` locale
4. Check if there's a banner saying "Bot needs to be built"
5. If yes, click **Build** button in the top right
6. Wait for the build to complete (usually 1-2 minutes)

### Step 2: Verify Locale Configuration

1. In the bot, go to **Languages** section
2. Confirm `en_IN` (English - India) is listed and enabled
3. Click on `en_IN` to open it
4. Verify that your intents are configured:
   - GetCropPrice
   - GetWeather
   - GetFarmingAdvice
   - CreateListing
   - NavigateApp
   - AMAZON.HelpIntent
   - AMAZON.FallbackIntent

### Step 3: Verify Bot Version and Alias

1. Go to **Deployment** → **Aliases** in the left sidebar
2. Find your alias (ID: `COP9IOYDL0`)
3. Click on it to view details
4. Check **Associated bot version**
5. If it says "No version associated" or "Draft":
   - Go to **Deployment** → **Versions**
   - Click **Create version**
   - Add a description like "Initial version with en_IN locale"
   - Click **Create**
   - Wait for version creation
   - Go back to **Aliases**
   - Click on your alias
   - Click **Edit**
   - Select the version you just created
   - Click **Save**

### Step 4: Test Again

After completing the above steps, test the connection:

```bash
node scripts/test-lex-connection.js
```

If the test passes, try the Kisan Mitra service again.

### Step 5: Check Intent Configuration

If the error persists, verify that your intents are properly configured:

1. Go to your bot → `en_IN` locale
2. Click on each intent and verify:
   - **Sample utterances** are added
   - **Slots** are configured (if needed)
   - **Fulfillment** is set to "Close the intent"
   - **Closing response** has a message configured

### Common Issues

#### Issue: "Bot needs to be built"
**Solution**: Click the Build button and wait for completion

#### Issue: "Alias not associated with version"
**Solution**: Create a version and associate it with the alias (see Step 3)

#### Issue: "Locale not found"
**Solution**: Ensure `en_IN` locale is added and built

#### Issue: "Intent not recognized"
**Solution**: Add more sample utterances to your intents and rebuild

## Verification Checklist

- [ ] Bot is built (no "needs to be built" banner)
- [ ] `en_IN` locale exists and is enabled
- [ ] All intents are configured with sample utterances
- [ ] Bot version is created
- [ ] Alias is associated with the version (not Draft)
- [ ] Test connection script passes
- [ ] Kisan Mitra service works

## Still Having Issues?

If you've completed all steps and still see the error:

1. Check the exact error message in the server logs
2. Verify your AWS credentials have the correct permissions
3. Ensure you're in the correct region (ap-southeast-2)
4. Try creating a new alias and updating `.env` with the new alias ID

## Next Steps

Once the bot is working:
- Test with different queries in different languages
- Monitor the conversation logs in MongoDB
- Add more intents as needed
- Configure Hindi locale (`hi_IN`) if needed
