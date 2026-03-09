# AI Endpoints Performance Testing Guide

**Purpose**: Comprehensive performance testing for Bharat Mandi's AI-powered features  
**Target**: AWS EC2 Deployment (http://13.236.3.139:3000)  
**Last Updated**: March 9, 2026

---

## Overview

This guide covers performance testing for the core AI features that differentiate Bharat Mandi:

1. **Dr. Fasal** - Crop disease diagnosis using AWS Bedrock Nova Pro Vision
2. **Fasal-Parakh** - Produce grading using AWS Bedrock Nova Pro Vision  
3. **Kisan Mitra** - AI assistant using AWS Bedrock Claude/Nova
4. **Voice Services** - Text-to-speech and speech-to-text using AWS Polly/Transcribe
5. **Translation** - Multi-language support using AWS Translate

---

## Why AI Endpoints Need Special Testing

### Different Performance Characteristics

AI endpoints have fundamentally different performance profiles compared to standard CRUD APIs:

| Endpoint Type | Expected Response Time | Primary Bottleneck |
|---------------|----------------------|-------------------|
| Standard API (GET/POST) | 50-200ms | Database queries, network |
| AI Vision (Diagnosis/Grading) | 3-8 seconds | AWS Bedrock Nova Pro processing |
| AI Text (Kisan Mitra) | 1-3 seconds | AWS Bedrock Claude/Nova processing |
| Voice (TTS/STT) | 0.5-2 seconds | AWS Polly/Transcribe processing |
| Translation | 0.3-1 second | AWS Translate API |

### Cost Implications

- **Bedrock Nova Pro**: ~$0.008 per image (vision analysis)
- **Bedrock Claude**: ~$0.003 per 1K tokens (text generation)
- **Polly**: ~$4 per 1M characters (TTS)
- **Translate**: ~$15 per 1M characters

High-volume load testing can incur significant AWS costs. Plan accordingly.

---

## Test Configuration

### Test Phases

```yaml
Phase 1: Warm-up (120s, 2 req/s)
  Purpose: Initialize AI services, warm up Lambda functions
  Expected: Higher latency as services cold-start

Phase 2: Normal Load (180s, 5 req/s)
  Purpose: Simulate typical farmer usage
  Expected: Stable response times

Phase 3: Peak Load (180s, 10 req/s)
  Purpose: Simulate high-activity periods (morning/evening)
  Expected: Slight latency increase

Phase 4: Stress Test (120s, 15 req/s)
  Purpose: Test maximum capacity
  Expected: Some rate limiting, increased latency
```

### Endpoint Distribution

Based on expected real-world usage patterns:

- **Dr. Fasal (Diagnosis)**: 30% - Most compute-intensive
- **Fasal-Parakh (Grading)**: 25% - Compute-intensive
- **Kisan Mitra (Assistant)**: 20% - Moderate compute
- **Voice Services**: 15% - Light compute
- **Translation**: 10% - Light compute

---

## Running AI Performance Tests

### Prerequisites

1. **Artillery installed**:
   ```powershell
   .\scripts\install-perf-tools.ps1
   ```

2. **Test data prepared**:
   - Sample crop disease images in `scripts/perf-tests/test-data/`
   - Sample produce images for grading
   - Sample audio files for transcription
   - CSV file with test queries

3. **AWS services configured**:
   - Bedrock Nova Pro access enabled
   - Polly, Transcribe, Translate APIs enabled
   - Sufficient AWS credits/budget for testing

### Running the Test

```powershell
# Navigate to test directory
cd scripts/perf-tests

# Run AI-focused performance test
artillery run artillery-ai-endpoints.yml --output ../../docs/product-standards/performance/test-results/ai-test-results.json

# Generate HTML report
artillery report ../../docs/product-standards/performance/test-results/ai-test-results.json --output ../../docs/product-standards/performance/test-results/ai-test-report.html
```

### Quick Test (Reduced Load)

For quick validation without high AWS costs:

```powershell
# Run with reduced phases (30s each, 1-2 req/s)
artillery run artillery-ai-endpoints.yml --overrides '{"config":{"phases":[{"duration":30,"arrivalRate":1},{"duration":30,"arrivalRate":2}]}}'
```

---

## Performance Targets

### Dr. Fasal (Crop Disease Diagnosis)

**Endpoint**: `POST /api/diagnosis`

| Metric | Target | Acceptable | Critical |
|--------|--------|-----------|----------|
| Average Response Time | < 5s | < 8s | > 10s |
| P95 Response Time | < 8s | < 12s | > 15s |
| P99 Response Time | < 12s | < 18s | > 25s |
| Success Rate | > 95% | > 90% | < 85% |
| Throughput | 5-10 req/s | 3-5 req/s | < 3 req/s |

**Key Metrics to Monitor**:
- Nova Pro vision analysis time
- S3 image upload time
- Database write time
- Confidence scores (should be > 0.7)

### Fasal-Parakh (Produce Grading)

**Endpoint**: `POST /api/grading/grade-with-image`

| Metric | Target | Acceptable | Critical |
|--------|--------|-----------|----------|
| Average Response Time | < 4s | < 6s | > 8s |
| P95 Response Time | < 6s | < 10s | > 12s |
| P99 Response Time | < 10s | < 15s | > 20s |
| Success Rate | > 95% | > 90% | < 85% |
| Throughput | 5-10 req/s | 3-5 req/s | < 3 req/s |

**Key Metrics to Monitor**:
- Nova Pro vision analysis time
- Grade accuracy (A, B, C distribution)
- Certificate generation time

### Kisan Mitra (AI Assistant)

**Endpoint**: `POST /api/kisan-mitra/query`

| Metric | Target | Acceptable | Critical |
|--------|--------|-----------|----------|
| Average Response Time | < 2s | < 3s | > 5s |
| P95 Response Time | < 3s | < 5s | > 8s |
| P99 Response Time | < 5s | < 8s | > 12s |
| Success Rate | > 98% | > 95% | < 90% |
| Throughput | 10-20 req/s | 5-10 req/s | < 5 req/s |

**Key Metrics to Monitor**:
- Intent recognition accuracy
- Confidence scores
- Session management overhead
- Context retention across conversations

### Voice Services

**Endpoints**: `POST /api/voice/synthesize`, `POST /api/voice/transcribe`

| Metric | Target | Acceptable | Critical |
|--------|--------|-----------|----------|
| Average Response Time | < 1s | < 2s | > 3s |
| P95 Response Time | < 2s | < 3s | > 5s |
| P99 Response Time | < 3s | < 5s | > 8s |
| Success Rate | > 99% | > 97% | < 95% |
| Throughput | 20-30 req/s | 10-20 req/s | < 10 req/s |

**Key Metrics to Monitor**:
- Audio quality (sample rate, bitrate)
- Cache hit rate (TTS should cache common phrases)
- Transcription accuracy

### Translation Services

**Endpoint**: `POST /api/i18n/translate`

| Metric | Target | Acceptable | Critical |
|--------|--------|-----------|----------|
| Average Response Time | < 500ms | < 1s | > 2s |
| P95 Response Time | < 1s | < 2s | > 3s |
| P99 Response Time | < 2s | < 3s | > 5s |
| Success Rate | > 99% | > 98% | < 95% |
| Throughput | 30-50 req/s | 20-30 req/s | < 20 req/s |

**Key Metrics to Monitor**:
- Translation accuracy
- Cache hit rate
- Supported language pairs

---

## Interpreting Results

### Success Criteria

✅ **PASS** if:
- All AI endpoints meet "Target" or "Acceptable" thresholds
- No critical errors (5xx responses < 1%)
- Rate limiting works correctly (429 responses when expected)
- AWS costs within budget

⚠️ **WARNING** if:
- Some endpoints in "Acceptable" range
- Success rate 90-95%
- Occasional timeouts (< 5%)

❌ **FAIL** if:
- Any endpoint in "Critical" range
- Success rate < 85%
- Frequent timeouts (> 10%)
- AWS service errors (Bedrock throttling, etc.)

### Common Issues and Solutions

#### Issue: High Latency on Diagnosis/Grading

**Symptoms**: Response times > 10s consistently

**Possible Causes**:
- Bedrock Nova Pro cold start
- Large image files (> 5MB)
- Network latency to AWS region
- Insufficient EC2 instance resources

**Solutions**:
1. Implement image compression before upload
2. Use Bedrock provisioned throughput
3. Add CloudFront CDN for image delivery
4. Scale EC2 instance vertically

#### Issue: Rate Limiting Errors

**Symptoms**: Many 429 responses

**Possible Causes**:
- Diagnosis rate limit (10/hour per user) hit
- AWS Bedrock throttling
- AWS API rate limits

**Solutions**:
1. Increase rate limits for performance testing
2. Request AWS quota increases
3. Implement request queuing
4. Add Redis-based distributed rate limiting

#### Issue: Low Success Rate

**Symptoms**: Success rate < 90%

**Possible Causes**:
- AWS service outages
- Authentication failures
- Image validation failures
- Database connection issues

**Solutions**:
1. Check AWS service health dashboard
2. Verify authentication tokens
3. Review image validation rules
4. Monitor database connection pool

---

## Cost Estimation

### Per Test Run (600 seconds, ~3000 requests)

Assuming distribution: 30% diagnosis, 25% grading, 20% Kisan Mitra, 15% voice, 10% translation

| Service | Requests | Cost per Request | Total Cost |
|---------|----------|-----------------|------------|
| Bedrock Nova Pro (Diagnosis) | 900 | $0.008 | $7.20 |
| Bedrock Nova Pro (Grading) | 750 | $0.008 | $6.00 |
| Bedrock Claude (Kisan Mitra) | 600 | $0.003 | $1.80 |
| Polly (Voice) | 450 | $0.0001 | $0.05 |
| Translate | 300 | $0.00002 | $0.01 |
| **Total per test run** | | | **~$15.06** |

**Monthly testing budget** (4 runs/week): ~$240

**Note**: Actual costs may vary based on:
- Image sizes
- Text lengths
- Token usage
- AWS region pricing

---

## Monitoring and Alerts

### Key Metrics to Track

1. **Response Time Percentiles**:
   - P50, P95, P99 for each AI endpoint
   - Track trends over time

2. **Success Rates**:
   - 2xx, 4xx, 5xx response codes
   - Rate limit hits (429)

3. **AI-Specific Metrics**:
   - Diagnosis confidence scores
   - Grading accuracy distribution
   - Kisan Mitra intent recognition rate
   - Voice transcription accuracy

4. **AWS Service Metrics**:
   - Bedrock invocation count
   - Bedrock throttling errors
   - S3 upload/download times
   - Lambda cold starts

### Recommended Alerts

```yaml
Critical Alerts:
  - AI endpoint P95 > 15s for 5 minutes
  - Success rate < 85% for 5 minutes
  - AWS Bedrock throttling > 10% of requests
  - EC2 CPU > 90% for 10 minutes

Warning Alerts:
  - AI endpoint P95 > 10s for 10 minutes
  - Success rate < 95% for 10 minutes
  - Rate limit hits > 20% of requests
  - Database connection pool > 80%
```

---

## Next Steps

After running AI performance tests:

1. **Document Results**: Create a results document similar to `AWS-DEPLOYMENT-PERFORMANCE-TEST-RESULTS.md`

2. **Identify Bottlenecks**: Analyze which AI service is the slowest

3. **Optimize**:
   - Implement caching for common queries
   - Add request queuing for high load
   - Consider Bedrock provisioned throughput
   - Optimize image preprocessing

4. **Scale Planning**:
   - Determine when to add more EC2 instances
   - Plan for horizontal scaling with load balancer
   - Consider serverless alternatives (Lambda + API Gateway)

5. **Cost Optimization**:
   - Implement aggressive caching
   - Use cheaper models for simple queries
   - Batch requests where possible

---

## Related Documentation

- [Performance Testing Guide](./PERFORMANCE-TESTING-GUIDE.md) - General performance testing
- [AWS Deployment Performance Results](./AWS-DEPLOYMENT-PERFORMANCE-TEST-RESULTS.md) - Basic API results
- [AWS Services Overview](../../architecture/aws-services-overview.md) - AWS architecture

---

**For**: Development Team, DevOps, QA  
**Maintained By**: Performance Testing Team  
**Review Frequency**: After major AI feature changes
