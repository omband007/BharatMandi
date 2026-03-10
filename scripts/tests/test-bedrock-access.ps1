# Test Bedrock Model Access
Write-Host "Testing Bedrock Model Access..." -ForegroundColor Cyan

# Test 1: Check AWS credentials
Write-Host ""
Write-Host "1. Checking AWS credentials..." -ForegroundColor Yellow
$identity = aws sts get-caller-identity 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - AWS credentials valid" -ForegroundColor Green
} else {
    Write-Host "FAIL - AWS credentials invalid" -ForegroundColor Red
    exit 1
}

# Test 2: Try to invoke Nova Lite model
Write-Host ""
Write-Host "2. Testing Amazon Nova Lite (us-east-1)..." -ForegroundColor Yellow

$novaPayload = '{"messages":[{"role":"user","content":[{"text":"Say hello"}]}],"inferenceConfig":{"maxTokens":100,"temperature":0.7}}'
$novaPayload | Out-File -FilePath "nova-test-payload.json" -Encoding utf8 -NoNewline

$novaResult = aws bedrock-runtime invoke-model --model-id "amazon.nova-lite-v1:0" --region "us-east-1" --body "file://nova-test-payload.json" --cli-binary-format raw-in-base64-out "nova-output.json" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Nova Lite access granted and working!" -ForegroundColor Green
} else {
    Write-Host "FAIL - Nova Lite access denied" -ForegroundColor Red
    Write-Host $novaResult -ForegroundColor Red
}

# Test 3: Try to invoke Claude Sonnet 4.6
Write-Host ""
Write-Host "3. Testing Claude Sonnet 4.6 (ap-southeast-2)..." -ForegroundColor Yellow

$claudePayload = '{"messages":[{"role":"user","content":[{"text":"Say hello"}]}],"inferenceConfig":{"maxTokens":100,"temperature":0.7}}'
$claudePayload | Out-File -FilePath "claude-test-payload.json" -Encoding utf8 -NoNewline

$claudeResult = aws bedrock-runtime invoke-model --model-id "au.anthropic.claude-sonnet-4-6" --region "ap-southeast-2" --body "file://claude-test-payload.json" --cli-binary-format raw-in-base64-out "claude-output.json" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK - Claude Sonnet 4.6 access granted and working!" -ForegroundColor Green
} else {
    Write-Host "FAIL - Claude Sonnet 4.6 access denied" -ForegroundColor Red
    Write-Host $claudeResult -ForegroundColor Red
}

# Cleanup
Remove-Item -Path "nova-test-payload.json" -ErrorAction SilentlyContinue
Remove-Item -Path "claude-test-payload.json" -ErrorAction SilentlyContinue
Remove-Item -Path "nova-output.json" -ErrorAction SilentlyContinue
Remove-Item -Path "claude-output.json" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "If you see access denied errors, enable model access in AWS Console:" -ForegroundColor Yellow
Write-Host "  Nova: https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/modelaccess"
Write-Host "  Claude: https://ap-southeast-2.console.aws.amazon.com/bedrock/home?region=ap-southeast-2#/modelaccess"
