# Performance Testing Guide

## Overview
This guide explains how to run performance tests on the Bharat Mandi AWS deployment and interpret the results.

## Prerequisites

1. **Node.js** (for Artillery)
2. **PowerShell** (Windows)
3. **AWS Deployment** running at http://13.236.3.139:3000

## Quick Start

### Step 1: Install Testing Tools

```powershell
.\scripts\install-perf-tools.ps1
```

This installs:
- **Artillery**: Load testing framework
- **k6** (optional): Alternative performance testing tool

### Step 2: Run Quick Benchmark

For a quick API response time check:

```powershell
.\scripts\quick-api-benchmark.ps1
```

This tests:
- Health check endpoint
- Marketplace listings API
- Translation API

**Duration**: ~2 minutes
**Output**: JSON file with results

### Step 3: Run Full Load Test

For comprehensive load testing:

```powershell
.\scripts\run-perf-tests.ps1
```

This runs:
- Warm-up phase (60s, 5 req/s)
- Normal load (120s, 20 req/s)
- Peak load (120s, 50 req/s)
- Stress test (60s, 100 req/s)

**Duration**: ~6 minutes
**Output**: JSON + HTML report

## Test Scenarios

### Scenario 1: Quick API Benchmark
**Purpose**: Verify basic API performance
**Duration**: 2 minutes
**Load**: 10 requests per endpoint
**Metrics**: Average, Min, Max, P95 response times

### Scenario 2: Normal Load Test
**Purpose**: Test typical usage patterns
**Duration**: 5 minutes
**Load**: 20 requests/second
**Expected**: < 200ms response time, < 1% error rate

### Scenario 3: Peak Load Test
**Purpose**: Test high traffic scenarios
**Duration**: 5 minutes
**Load**: 50 requests/second
**Expected**: < 500ms response time, < 2% error rate

### Scenario 4: Stress Test
**Purpose**: Find breaking point
**Duration**: 2 minutes
**Load**: 100 requests/second
**Expected**: Identify bottlenecks

## Interpreting Results

### Response Time Metrics

| Metric | Good | Acceptable | Poor |
|--------|------|------------|------|
| Average | < 200ms | 200-500ms | > 500ms |
| P95 | < 500ms | 500-1000ms | > 1000ms |
| P99 | < 1000ms | 1000-2000ms | > 2000ms |

### Success Rate

| Rate | Status |
|------|--------|
| > 99% | Excellent |
| 95-99% | Good |
| 90-95% | Acceptable |
| < 90% | Poor |

### Throughput

| Requests/Second | Status |
|----------------|--------|
| > 100 | Excellent |
| 50-100 | Good |
| 20-50 | Acceptable |
| < 20 | Poor |

## Common Issues & Solutions

### Issue 1: High Response Times
**Symptoms**: Average > 500ms
**Possible Causes**:
- Database query optimization needed
- AWS service latency
- Network congestion
**Solutions**:
- Add database indexes
- Implement caching
- Use CDN for static assets

### Issue 2: High Error Rate
**Symptoms**: Error rate > 5%
**Possible Causes**:
- Server overload
- Database connection pool exhausted
- Memory issues
**Solutions**:
- Scale horizontally (add instances)
- Increase connection pool size
- Optimize memory usage

### Issue 3: Low Throughput
**Symptoms**: < 50 req/s
**Possible Causes**:
- CPU bottleneck
- Blocking I/O operations
- Inefficient code
**Solutions**:
- Use async/await properly
- Implement connection pooling
- Profile and optimize hot paths

## Test Results Location

All test results are saved to:
```
docs/performance/test-results/
├── quick-benchmark-YYYY-MM-DD_HH-mm-ss.json
├── perf-test-YYYY-MM-DD_HH-mm-ss.json
└── perf-test-YYYY-MM-DD_HH-mm-ss.html
```

## Updating Benchmarks Document

After running tests, update `docs/performance/performance-benchmarks.md` with:

1. **Actual response times** from test results
2. **Throughput numbers** achieved
3. **Error rates** observed
4. **Resource utilization** during tests
5. **Comparison** with baseline metrics

## Advanced Testing

### Custom Test Configuration

Edit `scripts/perf-tests/artillery-config.yml` to:
- Change target URL
- Adjust load phases
- Add new scenarios
- Modify thresholds

### Testing Specific Endpoints

Create custom Artillery config:

```yaml
config:
  target: "http://13.236.3.139:3000"
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: "Custom Test"
    flow:
      - get:
          url: "/api/your-endpoint"
```

Run with:
```powershell
artillery run custom-config.yml
```

## Monitoring During Tests

### Server Metrics to Watch

1. **CPU Usage**: Should stay < 80%
2. **Memory Usage**: Should stay < 90%
3. **Network I/O**: Monitor bandwidth
4. **Database Connections**: Check pool usage

### AWS CloudWatch Metrics

Monitor:
- EC2 CPU utilization
- RDS connections
- S3 request rate
- Bedrock API calls

### Application Logs

Check PM2 logs during tests:
```bash
ssh -i test-key.pem ubuntu@13.236.3.139 "pm2 logs bharat-mandi --lines 100"
```

## Best Practices

1. **Run tests during off-peak hours** to avoid affecting real users
2. **Start with quick benchmark** before full load test
3. **Monitor server resources** during tests
4. **Compare results** with baseline metrics
5. **Document findings** in performance-benchmarks.md
6. **Run tests regularly** (weekly/monthly) to track trends

## Automated Testing

### Schedule Regular Tests

Create a scheduled task to run tests automatically:

```powershell
# Run every Monday at 2 AM
$trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 2am
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-File C:\path\to\run-perf-tests.ps1"
Register-ScheduledTask -TaskName "BharatMandiPerfTest" -Trigger $trigger -Action $action
```

### CI/CD Integration

Add performance tests to deployment pipeline:

```yaml
# Example GitHub Actions workflow
- name: Run Performance Tests
  run: |
    npm install -g artillery
    artillery run scripts/perf-tests/artillery-config.yml
```

## Reporting

### Generate Performance Report

After running tests, create a summary report:

1. Open HTML report in browser
2. Take screenshots of key metrics
3. Update performance-benchmarks.md
4. Share findings with team

### Key Metrics to Report

- Average response time
- P95 and P99 response times
- Throughput (req/s)
- Error rate
- Resource utilization
- Cost implications

## Next Steps

1. ✅ Install testing tools
2. ✅ Run quick benchmark
3. ✅ Run full load test
4. ✅ Analyze results
5. ✅ Update benchmarks document
6. ✅ Identify optimization opportunities
7. ✅ Implement improvements
8. ✅ Re-test to validate improvements

## Support

For issues or questions:
- Check Artillery docs: https://www.artillery.io/docs
- Review k6 docs: https://k6.io/docs/
- Check AWS CloudWatch for server metrics
- Review application logs for errors

---

**Last Updated**: March 9, 2026
**Version**: 1.0.0
