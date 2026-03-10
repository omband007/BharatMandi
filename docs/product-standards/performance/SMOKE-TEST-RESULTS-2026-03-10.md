# AI Smoke Test Results - March 10, 2026

**Test Date**: March 10, 2026, 13:24-13:26 IST  
**Test Duration**: 2 minutes, 6 seconds  
**Test Type**: Artillery Smoke Test  
**Target**: http://13.236.3.139:3000 (AWS EC2 Production)

---

## Executive Summary

The smoke test revealed **significant stability issues** with a 40% failure rate. While response times are acceptable (142ms mean), the high number of server errors (500) and timeouts requires immediate investigation.

**Overall Health**: ⚠️ **NEEDS ATTENTION**

---

## Test Results Summary

### Request Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Requests** | 120 | 100% |
| **Successful (200)** | 46 | 38.3% |
| **Server Errors (500)** | 49 | 40.8% |
| **Timeouts** | 25 | 20.8% |
| **Failed Captures** | 23 | 19.2% |
| **Responses Received** | 95 | 79.2% |

### User Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Users Created** | 120 | 100% |
| **Completed Successfully** | 72 | 60% |
| **Failed** | 48 | 40% |

### Response Time Performance

| Metric | Value (ms) | Status |
|--------|------------|--------|
| **Minimum** | 133 | ✅ Excellent |
| **Mean** | 142.1 | ✅ Good |
| **Median** | 138.4 | ✅ Good |
| **P95** | 153 | ✅ Good |
| **P99** | 179.5 | ✅ Good |
| **Maximum** | 212 | ⚠️ Acceptable |

**Analysis**: Response times are consistently fast (<200ms), indicating the infrastructure can handle requests quickly when they succeed.

---

## Endpoint Breakdown

### Requests by Endpoint

| Endpoint | Requests | Percentage |
|----------|----------|------------|
| **Voice TTS** | 27 | 22.5% |
| **Fasal-Parakh** | 26 | 21.7% |
| **Kisan Mitra** | 25 | 20.8% |
| **Dr. Fasal** | 23 | 19.2% |
| **Translation** | 19 | 15.8% |

**Note**: Distribution is relatively even across endpoints, which is expected for a smoke test.

---

## Critical Issues

### 1. High Server Error Rate (40.8%)

**Issue**: 49 out of 120 requests returned HTTP 500 errors

**Possible Causes**:
- AWS Bedrock API throttling or rate limits
- Bedrock model invocation failures
- Backend service crashes or exceptions
- Database connection issues
- Memory/resource exhaustion

**Impact**: 
- Users experiencing frequent failures
- Poor user experience
- Potential data loss or incomplete operations

**Recommended Actions**:
1. Check EC2 instance logs: `ssh ubuntu@13.236.3.139 "pm2 logs --lines 100"`
2. Review Bedrock API CloudWatch metrics for throttling
3. Check MongoDB connection pool status
4. Review application error logs for stack traces
5. Monitor EC2 instance CPU/memory usage

### 2. Timeout Errors (20.8%)

**Issue**: 25 ETIMEDOUT errors

**Possible Causes**:
- Bedrock API taking too long to respond
- Network connectivity issues
- Backend service hanging or deadlocking
- Database query timeouts

**Impact**:
- Requests abandoned after 30 seconds
- Wasted AWS resources (Bedrock calls may still complete)
- Poor user experience

**Recommended Actions**:
1. Increase Artillery timeout from 30s to 60s for AI endpoints
2. Implement request timeout monitoring in application
3. Add circuit breaker pattern for Bedrock calls
4. Review slow query logs in MongoDB

### 3. Failed Captures (19.2%)

**Issue**: 23 "Failed capture or match" errors

**Possible Causes**:
- Dr. Fasal endpoint returning unexpected response format
- Missing `diagnosisId` or `confidence` fields in response
- Response structure changed but test not updated

**Impact**:
- Test validation failures
- Potential API contract violations
- Downstream integration issues

**Recommended Actions**:
1. Review Dr. Fasal endpoint response schema
2. Update Artillery capture rules to match actual response
3. Add response schema validation in application
4. Implement API contract testing

---

## Response Time Analysis

### 2xx Responses (Successful)

| Metric | Value (ms) |
|--------|------------|
| Min | 134 |
| Max | 212 |
| Mean | 145.3 |
| Median | 144 |
| P95 | 153 |
| P99 | 172.5 |

**Analysis**: Successful requests are consistently fast, averaging 145ms.

### 5xx Responses (Server Errors)

| Metric | Value (ms) |
|--------|------------|
| Min | 133 |
| Max | 181 |
| Mean | 139.1 |
| Median | 135.7 |
| P95 | 144 |
| P99 | 169 |

**Analysis**: Errors are returned quickly (139ms mean), suggesting they're failing fast rather than timing out. This is good for user experience but indicates the errors are happening early in the request lifecycle.

---

## Session Length Analysis

| Metric | Value (ms) |
|--------|------------|
| Min | 267.7 |
| Max | 488.6 |
| Mean | 331.1 |
| Median | 278.7 |
| P95 | 424.2 |
| P99 | 441.5 |

**Analysis**: Most sessions complete in ~280ms (median), with some taking up to 489ms. This suggests most endpoints respond quickly, but some (likely AI endpoints) take longer.

---

## Comparison to Expectations

### Expected vs Actual Performance

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| **Success Rate** | >95% | 38.3% | ❌ FAILED |
| **Response Time (mean)** | <500ms | 142ms | ✅ PASSED |
| **Response Time (p95)** | <1000ms | 153ms | ✅ PASSED |
| **Timeout Rate** | <1% | 20.8% | ❌ FAILED |
| **Error Rate** | <5% | 40.8% | ❌ FAILED |

**Overall Assessment**: Performance is good when requests succeed, but reliability is unacceptable.

---

## Root Cause Analysis

### Most Likely Causes (Prioritized)

1. **Bedrock API Throttling** (HIGH PROBABILITY)
   - Symptom: 40.8% server errors
   - Cause: Exceeding Bedrock API rate limits
   - Evidence: Quick error responses (139ms mean for 5xx)
   - Solution: Implement exponential backoff, request queuing

2. **Missing Environment Variables** (MEDIUM PROBABILITY)
   - Symptom: Consistent failures across endpoints
   - Cause: AWS credentials or Bedrock config missing in production
   - Evidence: All AI endpoints affected
   - Solution: Verify .env.production on EC2 instance

3. **Test Endpoint Not Available in Production** (MEDIUM PROBABILITY)
   - Symptom: Dr. Fasal failures with capture errors
   - Cause: `/api/diagnosis/test` endpoint disabled in production
   - Evidence: NODE_ENV=production disables test endpoint
   - Solution: Use production endpoint or enable test endpoint

4. **Insufficient EC2 Resources** (LOW PROBABILITY)
   - Symptom: Timeouts and errors
   - Cause: EC2 instance CPU/memory exhaustion
   - Evidence: Would see degrading performance over time
   - Solution: Upgrade EC2 instance type

---

## Immediate Action Items

### Priority 1 (Critical - Do Now)

1. **Verify Test Endpoint Availability**
   ```bash
   ssh ubuntu@13.236.3.139
   curl -X POST http://localhost:3000/api/diagnosis/test \
     -F "image=@test.jpg" \
     -F "cropType=tomato" \
     -F "language=en" \
     -F 'location={"latitude": 19.0760, "longitude": 72.8777, "state": "Maharashtra"}'
   ```

2. **Check Application Logs**
   ```bash
   ssh ubuntu@13.236.3.139 "pm2 logs --lines 200 | grep -i error"
   ```

3. **Verify Environment Variables**
   ```bash
   ssh ubuntu@13.236.3.139 "cat /home/ubuntu/.env.production | grep -E '(BEDROCK|AWS)'"
   ```

### Priority 2 (High - Do Today)

4. **Review Bedrock CloudWatch Metrics**
   - Check for throttling errors
   - Review invocation counts
   - Check for quota limits

5. **Update Artillery Config**
   - Change test endpoint to production endpoint
   - Increase timeout to 60s for AI endpoints
   - Add retry logic

6. **Implement Circuit Breaker**
   - Add circuit breaker for Bedrock calls
   - Implement exponential backoff
   - Add request queuing

### Priority 3 (Medium - Do This Week)

7. **Add Monitoring**
   - Set up CloudWatch alarms for error rates
   - Add application performance monitoring (APM)
   - Implement health check endpoint

8. **Optimize Bedrock Usage**
   - Implement request batching
   - Add caching layer
   - Use Bedrock provisioned throughput

---

## Test Configuration Issues

### Artillery Config Problems

1. **Test Endpoint Usage**
   - Using `/api/diagnosis/test` which may not be available in production
   - Should use production endpoint `/api/diagnosis/diagnose`

2. **Timeout Too Short**
   - 30s timeout may be too short for AI endpoints
   - Bedrock can take 10-20s for complex requests
   - Recommend 60s timeout

3. **No Retry Logic**
   - Artillery doesn't retry failed requests
   - Should implement retry with exponential backoff

4. **Capture Rules**
   - Capture rules failing for Dr. Fasal endpoint
   - Need to update to match actual response schema

---

## Recommendations

### Short-term (This Week)

1. **Fix Test Endpoint Issue**
   - Either enable test endpoint in production (NODE_ENV=development)
   - Or update Artillery config to use production endpoints

2. **Increase Timeouts**
   - Update Artillery timeout to 60s
   - Add timeout monitoring in application

3. **Add Error Logging**
   - Log all 500 errors with stack traces
   - Send errors to CloudWatch Logs

### Medium-term (This Month)

4. **Implement Circuit Breaker**
   - Add circuit breaker for Bedrock API calls
   - Implement exponential backoff
   - Add request queuing

5. **Add Monitoring**
   - Set up CloudWatch alarms
   - Add APM (Application Performance Monitoring)
   - Implement health check endpoint

6. **Optimize Bedrock Usage**
   - Implement caching for common queries
   - Use Bedrock provisioned throughput
   - Add request batching

### Long-term (This Quarter)

7. **Scale Infrastructure**
   - Consider auto-scaling for EC2
   - Use load balancer for multiple instances
   - Implement CDN for static assets

8. **Improve Testing**
   - Add integration tests for all endpoints
   - Implement contract testing
   - Add chaos engineering tests

---

## Cost Analysis

**Estimated Cost for This Test Run**:
- 120 requests total
- ~50 successful AI requests (Dr. Fasal + Fasal-Parakh + Kisan Mitra)
- Estimated cost: ~$0.40 (higher than expected $0.10 due to failures)

**Note**: Failed requests still incur costs if they reach Bedrock before failing.

---

## Next Steps

1. ✅ **Completed**: Run smoke test with proper test data
2. ⏳ **In Progress**: Analyze results and identify issues
3. 🔜 **Next**: Fix test endpoint availability issue
4. 🔜 **Next**: Re-run smoke test after fixes
5. 🔜 **Next**: Run full load test if smoke test passes

---

## Appendix: Raw Metrics

### Summary Report (Final)

```
errors.ETIMEDOUT: 25
errors.Failed capture or match: 23
http.codes.200: 46
http.codes.500: 49
http.downloaded_bytes: 790771
http.request_rate: 1/sec
http.requests: 120
http.response_time:
  min: 133
  max: 212
  mean: 142.1
  median: 138.4
  p95: 153
  p99: 179.5
http.responses: 95
vusers.completed: 72
vusers.created: 120
vusers.failed: 48
vusers.session_length:
  min: 267.7
  max: 488.6
  mean: 331.1
  median: 278.7
  p95: 424.2
  p99: 441.5
```

---

**Document Version**: 1.0.0  
**Last Updated**: March 10, 2026  
**Next Review**: After fixes implemented  
**Status**: ⚠️ NEEDS ATTENTION
