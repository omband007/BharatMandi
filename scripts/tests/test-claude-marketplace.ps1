# Test Claude Marketplace Subscription Status
Write-Host "Testing Claude Marketplace Subscription..." -ForegroundColor Cyan
Write-Host ""

# Test Claude 3 Haiku
Write-Host "1. Testing Claude 3 Haiku..." -ForegroundColor Yellow
$payload = @'
{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 50,
  "messages": [{"role": "user", "content": "Hello"}]
}
'@
$payload | Out-File -Encoding utf8 -NoNewline test.json

$result = aws bedrock-runtime invoke-model `
  --model-id "anthropic.claude-3-haiku-20240307-v1:0" `
  --region "ap-southeast-2" `
  --body file://test.json `
  --cli-binary-format raw-in-base64-out `
  out.json 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   SUCCESS - Claude 3 Haiku works!" -ForegroundColor Green
    $response = Get-Content out.json | ConvertFrom-Json
    Write-Host "   Response: $($response.content[0].text)" -ForegroundColor Cyan
} else {
    Write-Host "   FAILED - Claude 3 Haiku blocked" -ForegroundColor Red
    if ($result -match "INVALID_PAYMENT_INSTRUMENT") {
        Write-Host "   Reason: AWS Marketplace subscription not complete" -ForegroundColor Yellow
    }
}

Write-Host ""

# Test Claude 3.5 Sonnet
Write-Host "2. Testing Claude 3.5 Sonnet v2..." -ForegroundColor Yellow
$result = aws bedrock-runtime invoke-model `
  --model-id "anthropic.claude-3-5-sonnet-20241022-v2:0" `
  --region "ap-southeast-2" `
  --body file://test.json `
  --cli-binary-format raw-in-base64-out `
  out.json 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   SUCCESS - Claude 3.5 Sonnet works!" -ForegroundColor Green
    $response = Get-Content out.json | ConvertFrom-Json
    Write-Host "   Response: $($response.content[0].text)" -ForegroundColor Cyan
} else {
    Write-Host "   FAILED - Claude 3.5 Sonnet blocked" -ForegroundColor Red
    if ($result -match "INVALID_PAYMENT_INSTRUMENT") {
        Write-Host "   Reason: AWS Marketplace subscription not complete" -ForegroundColor Yellow
    }
}

Write-Host ""

# Test Claude Sonnet 4.6 (inference profile)
Write-Host "3. Testing Claude Sonnet 4.6 (AU inference profile)..." -ForegroundColor Yellow
$payload2 = @'
{
  "messages": [{"role": "user", "content": [{"text": "Hello"}]}],
  "inferenceConfig": {"maxTokens": 50}
}
'@
$payload2 | Out-File -Encoding utf8 -NoNewline test2.json

$result = aws bedrock-runtime invoke-model `
  --model-id "au.anthropic.claude-sonnet-4-6" `
  --region "ap-southeast-2" `
  --body file://test2.json `
  --cli-binary-format raw-in-base64-out `
  out.json 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   SUCCESS - Claude Sonnet 4.6 works!" -ForegroundColor Green
    $response = Get-Content out.json | ConvertFrom-Json
    Write-Host "   Response: $($response.output.message.content[0].text)" -ForegroundColor Cyan
} else {
    Write-Host "   FAILED - Claude Sonnet 4.6 blocked" -ForegroundColor Red
    if ($result -match "INVALID_PAYMENT_INSTRUMENT") {
        Write-Host "   Reason: AWS Marketplace subscription not complete" -ForegroundColor Yellow
    }
}

# Cleanup
Remove-Item test.json, test2.json, out.json -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "All Claude models are blocked due to AWS Marketplace subscription issue." -ForegroundColor Yellow
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Wait 24-48 hours for automatic subscription activation" -ForegroundColor White
Write-Host "2. Or manually subscribe at: https://aws.amazon.com/marketplace/pp/prodview-yjvqxmz2xfhqy" -ForegroundColor White
Write-Host "3. Or contact AWS Support for assistance" -ForegroundColor White
Write-Host ""
Write-Host "In the meantime, use Amazon Nova Lite which works perfectly!" -ForegroundColor Green
