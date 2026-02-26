# Translation Service - Quick Start Guide

## Setup (5 minutes)

### 1. Start Redis

```bash
docker-compose up -d redis
```

Verify Redis is running:
```bash
docker-compose ps
```

You should see `bharat-mandi-redis` with status "Up".

### 2. Configure AWS Credentials

Add to your `.env` file:

```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 3. Test the Implementation

Run the tests:

```bash
npm test -- translation.service
```

Expected output:
```
Test Suites: 2 passed, 2 total
Tests:       1 skipped, 16 passed, 17 total
```

## Usage Examples

### Basic Translation

```typescript
import { translationService } from './src/features/i18n/translation.service';

// Translate English to Hindi
const result = await translationService.translateText({
  text: 'Welcome to Bharat Mandi',
  sourceLanguage: 'en',
  targetLanguage: 'hi'
});

console.log(result.translatedText); // "भारत मंडी में आपका स्वागत है"
console.log(result.cached); // false (first time)

// Second call - cached
const result2 = await translationService.translateText({
  text: 'Welcome to Bharat Mandi',
  sourceLanguage: 'en',
  targetLanguage: 'hi'
});

console.log(result2.cached); // true (from cache)
```

### Auto-Detect Language

```typescript
// Don't specify source language - it will be auto-detected
const result = await translationService.translateText({
  text: 'नमस्ते दुनिया',
  targetLanguage: 'en'
});

console.log(result.sourceLanguage); // "hi" (detected)
console.log(result.translatedText); // "Hello World"
```

### Batch Translation

```typescript
const texts = [
  'Hello',
  'Thank you',
  'Goodbye',
  'How are you?',
  'Welcome'
];

const translations = await translationService.translateBatch(
  texts,
  'en',
  'hi'
);

console.log(translations);
// [
//   "नमस्ते",
//   "धन्यवाद",
//   "अलविदा",
//   "आप कैसे हैं?",
//   "स्वागत है"
// ]
```

### Preload Common Phrases

```typescript
// Preload common phrases for faster first access
await translationService.preloadCommonTranslations('hi');

// Now these phrases are cached and will be instant
const result = await translationService.translateText({
  text: 'Welcome to Bharat Mandi',
  sourceLanguage: 'en',
  targetLanguage: 'hi'
});

console.log(result.cached); // true
```

### Check Cache Statistics

```typescript
const stats = await translationService.getCacheStats();

console.log(`Cache size: ${stats.size} entries`);
console.log(`Hit rate: ${stats.hitRate}%`);
```

## Supported Languages

All 11 Indian languages are supported:

| Code | Language | Native Name |
|------|----------|-------------|
| en   | English  | English     |
| hi   | Hindi    | हिन्दी      |
| pa   | Punjabi  | ਪੰਜਾਬੀ     |
| mr   | Marathi  | मराठी       |
| ta   | Tamil    | தமிழ்       |
| te   | Telugu   | తెలుగు      |
| bn   | Bengali  | বাংলা       |
| gu   | Gujarati | ગુજરાતી     |
| kn   | Kannada  | ಕನ್ನಡ       |
| ml   | Malayalam| മലയാളം      |
| or   | Odia     | ଓଡ଼ିଆ       |

## Monitoring Cache Performance

### View Cache Keys

```bash
docker exec -it bharat-mandi-redis redis-cli KEYS "translation:*"
```

### Get Cache Size

```bash
docker exec -it bharat-mandi-redis redis-cli DBSIZE
```

### View a Cached Translation

```bash
# Get a cache key from the KEYS command above
docker exec -it bharat-mandi-redis redis-cli GET "translation:<hash>"
```

### Clear Cache

```bash
docker exec -it bharat-mandi-redis redis-cli FLUSHDB
```

## Troubleshooting

### AWS Subscription Required Error

**Error**: `SubscriptionRequiredException: The AWS Access Key Id needs a subscription for the service`

**This is expected if you haven't enabled AWS Translate yet!** The service has graceful degradation built-in.

**Solutions**:
1. **Enable AWS Translate** in your AWS Console (see `docs/features/AWS-TRANSLATE-SETUP.md`)
2. **Continue without AWS** - The service will return original text (graceful degradation working correctly)
3. **Reduce console noise** - Comment out preloading in i18n.controller.ts

See `docs/features/AWS-TRANSLATE-SETUP.md` for detailed instructions.

### Redis Connection Failed

**Error**: `ECONNREFUSED 127.0.0.1:6379`

**Solution**:
```bash
# Check if Redis is running
docker-compose ps

# If not running, start it
docker-compose up -d redis

# Check logs
docker-compose logs redis
```

### AWS Credentials Not Found

**Error**: `Missing credentials in config`

**Solution**:
1. Verify `.env` file has AWS credentials
2. Restart your application to reload environment variables
3. Check AWS credentials are valid:
   ```bash
   aws sts get-caller-identity
   ```

### Translation Returns Original Text

**Possible Causes**:
1. AWS Translate service unavailable (graceful degradation)
2. Invalid AWS credentials
3. Rate limit exceeded

**Check**:
- Look for error logs: `[TranslationService] Translation failed:`
- Verify AWS credentials
- Check AWS Translate quotas in AWS Console

### Tests Failing

**If Redis tests fail**:
- Tests are designed to skip cache tests if Redis is unavailable
- Ensure Redis is running: `docker-compose up -d redis`
- Check Redis connection: `docker exec -it bharat-mandi-redis redis-cli ping`

**If AWS tests fail**:
- AWS SDK clients are mocked in tests
- Tests should pass without real AWS credentials
- Check Jest configuration

## Performance Tips

1. **Preload Common Phrases**: Call `preloadCommonTranslations()` at startup
2. **Batch Translations**: Use `translateBatch()` for multiple texts
3. **Monitor Cache Hit Rate**: Aim for 90%+ hit rate
4. **Adjust TTL**: Increase TTL for stable content, decrease for dynamic content

## Cost Optimization

### Free Tier Usage

AWS Translate free tier: 2M characters/month

**Example**: 
- 1000 users × 10 translations/day × 100 chars = 1M chars/day
- Free tier covers: 2 days/month
- After free tier: ~$450/month

**With 90% cache hit rate**:
- Only 10% hits AWS Translate
- Cost: ~$45/month
- **Savings: $405/month (90%)**

### Monitor Usage

Check AWS Translate usage in AWS Console:
1. Go to AWS Translate service
2. Click "Usage" in left sidebar
3. View character count and costs

## Next Steps

1. **Integrate with Listings**: Add translation to marketplace listings
2. **Integrate with Messages**: Add real-time message translation
3. **Integrate with Notifications**: Translate notifications to user's language
4. **Add Feedback**: Implement translation quality feedback
5. **Optimize Caching**: Fine-tune TTL and preloading strategy

## Support

For issues or questions:
- Check `docs/setup/REDIS-SETUP.md` for detailed Redis setup
- Check `docs/features/PHASE2-TRANSLATION-SERVICE.md` for architecture details
- Review test files for usage examples
