# Performance Testing Documentation

This folder contains all performance testing documentation, configurations, and results for Bharat Mandi.

---

## Quick Links

- **[Testing Status](./TESTING-STATUS.md)** - What's been tested, what's pending
- **[Basic API Results](./AWS-DEPLOYMENT-PERFORMANCE-TEST-RESULTS.md)** - Results from basic endpoint testing
- **[AI Testing Guide](./AI-ENDPOINTS-PERFORMANCE-TESTING.md)** - Guide for testing AI endpoints
- **[General Testing Guide](./PERFORMANCE-TESTING-GUIDE.md)** - How to run performance tests

---

## What's Been Tested ✅

### Basic API Endpoints (March 9, 2026)

**Results**: Excellent performance
- Average response time: 140ms
- P95: 153ms, P99: 169ms
- Success rate: 100%
- Throughput: 63 req/s

**Endpoints**:
- Health check
- Marketplace listings
- Translation API

**Verdict**: ✅ Production-ready for basic CRUD operations

---

## What Needs Testing ⏳

### AI-Powered Endpoints (HIGH PRIORITY)

**Status**: Test configuration ready, awaiting execution

**Why Critical**: These are the core differentiators of Bharat Mandi:
1. **Dr. Fasal** - Crop disease diagnosis (3-8s response time expected)
2. **Fasal-Parakh** - Produce grading (2-5s response time expected)
3. **Kisan Mitra** - AI assistant (1-3s response time expected)
4. **Voice Services** - TTS/STT (0.5-2s response time expected)

**Cost**: ~$15 per test run (AWS Bedrock, Polly, Translate costs)

**See**: [AI Endpoints Performance Testing Guide](./AI-ENDPOINTS-PERFORMANCE-TESTING.md)

---

## Test Configurations

### Basic API Test
- **File**: `scripts/perf-tests/artillery-config.yml`
- **Target**: Standard CRUD endpoints
- **Duration**: 6 minutes
- **Load**: 5-100 req/s progressive
- **Cost**: Free (no AI services)

### AI Endpoints Test
- **File**: `scripts/perf-tests/artillery-ai-endpoints.yml`
- **Target**: AI-powered features
- **Duration**: 10 minutes
- **Load**: 2-15 req/s progressive
- **Cost**: ~$15 per run

---

## Running Tests

### Quick Start

```powershell
# Install Artillery
.\scripts\install-perf-tools.ps1

# Run basic API test
cd scripts/perf-tests
artillery run artillery-config.yml

# Run AI endpoints test (when ready)
artillery run artillery-ai-endpoints.yml
```

### Detailed Instructions

See [Performance Testing Guide](./PERFORMANCE-TESTING-GUIDE.md)

---

## Performance Targets

### Basic APIs
- Average: < 200ms ✅ (Achieved: 140ms)
- P95: < 500ms ✅ (Achieved: 153ms)
- P99: < 1000ms ✅ (Achieved: 169ms)
- Success rate: > 99% ✅ (Achieved: 100%)

### AI Endpoints (Targets)
- **Diagnosis**: < 8s average, > 95% success
- **Grading**: < 6s average, > 95% success
- **Kisan Mitra**: < 3s average, > 98% success
- **Voice**: < 2s average, > 99% success

---

## Cost Tracking

| Test Type | Cost per Run | Frequency | Monthly Cost |
|-----------|--------------|-----------|--------------|
| Basic API | $0 | 4x/month | $0 |
| AI Endpoints | $15 | 4x/month | $60 |
| Voice Services | $5 | 4x/month | $20 |
| **Total** | | | **$80/month** |

---

## Next Steps

1. **Prepare test data** for AI endpoints:
   - Crop disease images
   - Produce images for grading
   - Audio files for transcription

2. **Run AI performance test**:
   ```powershell
   cd scripts/perf-tests
   artillery run artillery-ai-endpoints.yml
   ```

3. **Document results** in new markdown file

4. **Optimize** based on findings

5. **Set up monitoring** for production

---

## Files in This Folder

```
performance/
├── README.md (this file)
├── TESTING-STATUS.md - Current testing status
├── AWS-DEPLOYMENT-PERFORMANCE-TEST-RESULTS.md - Basic API results
├── AI-ENDPOINTS-PERFORMANCE-TESTING.md - AI testing guide
├── PERFORMANCE-TESTING-GUIDE.md - General testing guide
├── performance-benchmarks.md - Performance standards
└── test-results/ - Test output files
    └── quick-benchmark-2026-03-09_17-47-30.json
```

---

## Related Documentation

- [AWS Services Overview](../../architecture/aws-services-overview.md)
- [Architecture Documentation](../../architecture/)
- [Testing Documentation](../../testing/)

---

**Maintained By**: Performance Testing Team  
**Last Updated**: March 9, 2026
