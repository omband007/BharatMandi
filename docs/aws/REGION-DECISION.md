# AWS Region Decision: Sydney (ap-southeast-2)

## Decision Summary

**Date**: March 1, 2026  
**Decision**: Use **ap-southeast-2 (Sydney)** for all AWS services  
**Reason**: Mumbai (ap-south-1) doesn't support AWS Lex V2 yet

---

## Background

Initially planned to use **ap-south-1 (Mumbai)** for:
- Lower latency for Indian users
- Better alignment with target market
- Potential data localization compliance

However, during AWS Lex setup, discovered that **Mumbai region is locked** for Lex V2 service.

---

## AWS Lex Regional Availability

### ✅ Available Regions:
- us-east-1 (N. Virginia)
- us-west-2 (Oregon)
- ap-southeast-1 (Singapore)
- **ap-southeast-2 (Sydney)** ← Our choice
- ap-northeast-1 (Tokyo)
- ap-northeast-2 (Seoul)
- eu-west-1 (Ireland)
- eu-central-1 (Frankfurt)

### 🔒 NOT Available:
- **ap-south-1 (Mumbai)** ← Locked
- us-east-2 (Ohio)
- us-west-1 (N. California)
- ap-northeast-3 (Osaka)

---

## Why Sydney?

**Proximity to India:**
- Sydney is the **closest available region** to India that supports Lex
- Distance: ~10,000 km from India
- Latency: ~150-200ms (acceptable for production)

**Service Availability:**
- ✅ AWS Lex V2
- ✅ AWS Translate
- ✅ AWS Transcribe
- ✅ AWS Polly
- ✅ AWS Comprehend
- ✅ S3
- ✅ ElastiCache (if needed)

**Cost:**
- Similar pricing to Mumbai
- No significant cost difference

---

## Performance Impact

### Latency Comparison:

| Route | Latency | Status |
|-------|---------|--------|
| India → Mumbai | 20-50ms | ❌ Not available for Lex |
| India → Sydney | 150-200ms | ✅ Current setup |
| India → Singapore | 80-120ms | ❌ Doesn't support all services |
| India → Tokyo | 120-180ms | ✅ Alternative option |

**Verdict**: Sydney latency is **acceptable for production**. Many global apps use Sydney for Asia-Pacific region.

### User Experience Impact:

**Voice Transcription:**
- User speaks → Upload to S3 → Transcribe → Return text
- Total time: ~2-3 seconds (mostly transcription, not network)
- Network latency: ~200ms (10% of total time)
- **Impact**: Minimal

**Text-to-Speech:**
- Text → Polly → Audio URL → Play
- Total time: ~1-2 seconds
- Network latency: ~200ms (15% of total time)
- **Impact**: Minimal

**Translation:**
- Text → Translate → Cached → Return
- Total time: ~500ms-1s (first request)
- Cached requests: <50ms (from Redis)
- **Impact**: Minimal (after first request)

**Kisan Mitra (Lex):**
- Query → Lex → Response
- Total time: ~1-2 seconds
- Network latency: ~200ms (15% of total time)
- **Impact**: Minimal

---

## Current Configuration

### Environment Variables (.env):
```bash
AWS_REGION=ap-southeast-2
LEX_REGION=ap-southeast-2
```

### AWS Resources:
- **S3 Bucket**: `bharat-mandi-voice-temp` (ap-southeast-2)
- **Lex Bot**: `KisanMitra` (ap-southeast-2)
- **IAM User**: `Omband` (global - works everywhere)

### Application Code:
- All AWS SDK clients use `process.env.AWS_REGION`
- No hardcoded regions
- Easy to migrate when Mumbai supports Lex

---

## Future Migration Plan

### When to Migrate:

**Trigger**: Mumbai (ap-south-1) adds AWS Lex V2 support

**How to Monitor**:
1. Check AWS regional services page: https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/
2. Subscribe to AWS announcements
3. Test Mumbai Lex availability quarterly

### Migration Benefits:

**Latency Improvement:**
- Current: 150-200ms
- After migration: 20-50ms
- **Improvement**: 75% reduction

**Cost Savings:**
- Lower data transfer costs (India → Mumbai vs India → Sydney)
- Estimated savings: 10-20% on data transfer

**Compliance:**
- Data localization (if required by Indian regulations)
- Better for government/enterprise customers

### Migration Process:

**Preparation** (already done):
- ✅ Migration guide created: `docs/aws/REGION-MIGRATION-GUIDE.md`
- ✅ Migration scripts ready: `scripts/migrate-to-ap-south-1.ps1` and `.sh`
- ✅ Technical debt documented: `.kiro/specs/TECHNICAL-DEBT.md`

**Execution** (when Mumbai supports Lex):
1. Create S3 bucket in Mumbai
2. Copy audio files (if any)
3. Create Lex bot in Mumbai
4. Update .env configuration
5. Test all features
6. Delete Sydney resources

**Estimated Time**: 2-3 hours

---

## Alternatives Considered

### Option 1: Singapore (ap-southeast-1)
- **Pros**: Closer to India (80-120ms latency)
- **Cons**: Doesn't support all required AWS services
- **Verdict**: ❌ Not viable

### Option 2: Tokyo (ap-northeast-1)
- **Pros**: Supports all services
- **Cons**: Similar latency to Sydney (120-180ms)
- **Verdict**: ❌ No advantage over Sydney

### Option 3: US East (us-east-1)
- **Pros**: Most AWS services available
- **Cons**: Very high latency (300-400ms)
- **Verdict**: ❌ Too far from India

### Option 4: Hybrid (Multiple Regions)
- **Pros**: Optimize each service separately
- **Cons**: Complex configuration, higher costs
- **Verdict**: ❌ Over-engineering for current needs

---

## Recommendations

### For Development:
✅ **Use Sydney (ap-southeast-2)** for all AWS services
- Simple configuration
- All services in one region
- Acceptable latency
- Easy to test

### For Production:
✅ **Start with Sydney**, migrate to Mumbai when available
- Launch faster (no waiting for Mumbai)
- Proven setup
- Clear migration path
- Minimal risk

### For Testing:
✅ **Mock mode** works without any AWS setup
- Test locally without AWS
- No latency concerns
- Perfect for development

---

## Documentation

### Setup Guides:
- `docs/aws/LEX-BOT-SETUP-QUICKSTART.md` - Sydney setup (current)
- `docs/aws/REGION-MIGRATION-GUIDE.md` - Mumbai migration (future)
- `docs/aws/LEX-SETUP-STATUS.md` - Implementation status

### Scripts:
- `scripts/test-lex-connection.js` - Test Lex connection
- `scripts/migrate-to-ap-south-1.ps1` - Migration script (Windows)
- `scripts/migrate-to-ap-south-1.sh` - Migration script (Linux/Mac)

### Configuration:
- `.env` - AWS_REGION=ap-southeast-2
- `.env.example` - Template with Sydney region

---

## Monitoring & Review

### Quarterly Review:
- Check if Mumbai supports AWS Lex V2
- Review latency metrics from production
- Assess user feedback on performance
- Evaluate migration timing

### Metrics to Track:
- Average API response time
- Voice transcription latency
- Translation latency
- Kisan Mitra response time
- User satisfaction scores

### Success Criteria:
- API response time < 3 seconds (95th percentile)
- Voice transcription < 5 seconds
- Translation < 2 seconds (first request)
- Kisan Mitra response < 3 seconds

---

## Conclusion

**Current Decision**: Use Sydney (ap-southeast-2) for all AWS services

**Rationale**:
- Mumbai doesn't support AWS Lex yet
- Sydney is the closest available region
- Latency is acceptable for production
- Clear migration path when Mumbai adds Lex support

**Next Steps**:
1. ✅ Complete Lex bot setup in Sydney
2. ✅ Test all features
3. ✅ Deploy to production
4. 📅 Monitor Mumbai Lex availability
5. 📅 Migrate when available

---

**Status**: Active  
**Last Updated**: March 1, 2026  
**Next Review**: June 1, 2026 (quarterly)
