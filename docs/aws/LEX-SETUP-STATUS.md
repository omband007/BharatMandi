# AWS Lex Setup Status

## Current Status: Documentation Complete, Manual Setup Required

### What's Been Done ✅

1. **Documentation Created**
   - `docs/aws/LEX-BOT-SETUP-QUICKSTART.md` - Complete step-by-step guide
   - `docs/aws/LEX-BOT-SETUP.md` - Detailed technical documentation
   - `docs/aws/LEX-VISUAL-GUIDE.md` - Visual guide with ASCII diagrams
   - `docs/features/KISAN-MITRA-COMPLETE.md` - Implementation summary

2. **Test Script Created**
   - `scripts/test-lex-connection.js` - Automated connection testing
   - Tests bot connection, intent recognition, and slot filling
   - Provides detailed error messages and troubleshooting

3. **Application Code Ready**
   - `src/features/i18n/kisan-mitra.service.ts` - Service implementation
   - `src/features/i18n/kisan-mitra.routes.ts` - API endpoints
   - `public/kisan-mitra-test.html` - POC UI with mock mode
   - Mock mode works without AWS Lex for immediate testing

4. **Configuration Template**
   - `.env.example` updated with Lex configuration variables
   - Ready to receive bot IDs once created

### What Needs to Be Done Manually 🔧

AWS Lex bots **cannot be created programmatically** without additional setup. You need to:

1. **Create the Bot in AWS Console** (30-45 minutes)
   - Follow: `docs/aws/LEX-BOT-SETUP-QUICKSTART.md`
   - Create bot named "KisanMitra"
   - Add 7 intents (GetCropPrice, GetWeather, GetFarmingAdvice, CreateListing, NavigateApp, HelpIntent, FallbackIntent)
   - Create 2 custom slot types (CropType, ScreenName)
   - Build and test the bot
   - Create production alias

2. **Get Bot IDs**
   - Copy Bot ID from AWS Console
   - Copy Alias ID from AWS Console

3. **Update .env File**
   ```bash
   LEX_BOT_ID=YOUR_BOT_ID_HERE
   LEX_BOT_ALIAS_ID=YOUR_ALIAS_ID_HERE
   LEX_REGION=ap-south-1
   ```

4. **Test Connection**
   ```bash
   node scripts/test-lex-connection.js
   ```

5. **Verify Live Mode**
   - Open `http://localhost:3000/kisan-mitra-test.html`
   - Mode should show "Live" instead of "Mock"
   - Test queries should work with real AWS Lex

## Quick Start Instructions

### Option 1: Use Mock Mode (No AWS Setup Required)

The Kisan Mitra UI already works in **Mock Mode** without any AWS setup:

1. Open `http://localhost:3000/kisan-mitra-test.html`
2. Mode shows "Mock" - simulates AI responses
3. Test all features immediately
4. Perfect for development and demos

### Option 2: Set Up AWS Lex (Full AI Experience)

Follow these steps to enable real AWS Lex integration:

1. **Open the Quick Start Guide**
   ```bash
   # Open in your browser or editor
   docs/aws/LEX-BOT-SETUP-QUICKSTART.md
   ```

2. **Follow Step-by-Step Instructions**
   - Step 1: Create AWS Lex Bot (15 min)
   - Step 2: Create Intents (15 min)
   - Step 3: Build and Test (5 min)
   - Step 4: Create Bot Alias (5 min)
   - Step 5: Configure Application (2 min)
   - Step 6: Test Live Mode (3 min)

3. **Run Test Script**
   ```bash
   node scripts/test-lex-connection.js
   ```

4. **Verify Live Mode**
   - Open Kisan Mitra UI
   - Check mode is "Live"
   - Test queries

## Troubleshooting

### Bot Not Found Error
- Verify BOT_ID and ALIAS_ID are correct
- Check you're in the correct AWS region (ap-south-1)
- Ensure bot has been built

### Permission Denied Error
- Verify AWS credentials in .env
- Check IAM user has Lex permissions
- See troubleshooting section in quick start guide

### Intent Not Recognized
- Add more sample utterances
- Lower confidence threshold
- Rebuild the bot

## Cost Estimation

**AWS Lex V2 Pricing**:
- First 10,000 text requests/month: **FREE**
- Text requests: $0.00075 per request
- Speech requests: $0.004 per request

**Free Tier** (first 12 months):
- 10,000 text requests/month: FREE
- 5,000 speech requests/month: FREE

For development and testing, you'll stay within the free tier.

## Next Steps

Choose one of these paths:

### Path A: Continue with Mock Mode
- Mock mode is fully functional
- No AWS setup required
- Perfect for development
- Can switch to live mode later

### Path B: Set Up AWS Lex Now
1. Follow `docs/aws/LEX-BOT-SETUP-QUICKSTART.md`
2. Create bot in AWS Console (30-45 min)
3. Update .env with bot IDs
4. Run test script
5. Verify live mode works

### Path C: Continue with Other Features
- Implement voice commands (Task 21)
- Build regional crop database (Tasks 30-36)
- Add offline support (Tasks 37-43)
- Come back to AWS Lex setup later

## Support Resources

- [AWS Lex Documentation](https://docs.aws.amazon.com/lexv2/latest/dg/what-is.html)
- [Quick Start Guide](./LEX-BOT-SETUP-QUICKSTART.md)
- [Visual Guide](./LEX-VISUAL-GUIDE.md)
- [Test Script](../scripts/test-lex-connection.js)

---

**Status**: Ready for manual AWS Console setup
**Estimated Time**: 30-45 minutes
**Difficulty**: Intermediate
**Current Mode**: Mock (fully functional)
