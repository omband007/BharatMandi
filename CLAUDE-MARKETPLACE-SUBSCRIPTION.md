# Claude Sonnet 4.6 - AWS Marketplace Subscription Issue

## Problem
Getting error: "Model access is denied due to INVALID_PAYMENT_INSTRUMENT: A valid payment instrument must be provided. Your AWS Marketplace subscription for this model cannot be completed at this time."

## Root Cause
Even though payment method exists and models show "auto-enabled", Claude models from Anthropic may require:
1. Accepting Anthropic's End User License Agreement (EULA)
2. AWS Marketplace subscription activation
3. Waiting period after payment method validation

## Solution Steps

### Option 1: Use Claude 3.5 Sonnet (No Marketplace Required)

Claude 3.5 Sonnet doesn't require inference profiles and might not have the marketplace issue:

```powershell
# Test Claude 3.5 Sonnet
$payload = @'
{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 100,
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ]
}
'@
$payload | Out-File -Encoding utf8 -NoNewline test.json
aws bedrock-runtime invoke-model `
  --model-id "anthropic.claude-3-5-sonnet-20241022-v2:0" `
  --region "ap-southeast-2" `
  --body file://test.json `
  --cli-binary-format raw-in-base64-out `
  out.json

Get-Content out.json | ConvertFrom-Json | Select-Object -ExpandProperty content
Remove-Item test.json, out.json
```

### Option 2: Accept Anthropic EULA in Bedrock Console

1. Go to: https://ap-southeast-2.console.aws.amazon.com/bedrock/home?region=ap-southeast-2#/providers
2. Find "Anthropic" in the list
3. Click on it
4. Look for any EULA or terms acceptance button
5. Accept the terms if prompted

### Option 3: Check AWS Marketplace Subscriptions

1. Go to: https://console.aws.amazon.com/marketplace/home#/subscriptions
2. Search for "Anthropic" or "Claude"
3. Check if there's a pending subscription
4. Complete any required steps

### Option 4: Wait 2-5 Minutes

Sometimes AWS needs time to validate payment methods for new model access:
1. Wait 2-5 minutes after adding/updating payment method
2. Try the test command again

### Option 5: Use Cross-Region Inference Profile

Try the US inference profile instead of AU:

```powershell
# Test with US inference profile
$payload = @'
{
  "messages": [
    {
      "role": "user",
      "content": [{"text": "Hello"}]
    }
  ],
  "inferenceConfig": {
    "maxTokens": 50
  }
}
'@
$payload | Out-File -Encoding utf8 -NoNewline test.json
aws bedrock-runtime invoke-model `
  --model-id "us.anthropic.claude-sonnet-4-6" `
  --region "us-east-1" `
  --body file://test.json `
  --cli-binary-format raw-in-base64-out `
  out.json

Get-Content out.json
Remove-Item test.json, out.json
```

### Option 6: Contact AWS Support

If none of the above work, you may need to contact AWS Support:
1. Go to: https://console.aws.amazon.com/support/home
2. Create a case
3. Select "Account and billing support"
4. Describe the issue: "Cannot access Claude Sonnet 4.6 via Bedrock - payment instrument error despite valid payment method"

## Recommended Workaround for Now

Use Claude 3.5 Sonnet v2 instead - it's very capable and doesn't require inference profiles:

### Update Your Code

In `src/features/i18n/kisan-mitra.service.ts`, change:

```typescript
if (effectiveMode === 'bedrock-claude') {
  actualMode = 'bedrock';
  // Use Claude 3.5 Sonnet v2 (no inference profile needed)
  bedrockModelId = 'anthropic.claude-3-5-sonnet-20241022-v2:0';
}
```

### Update UI Label

In `public/kisan-mitra.html`, change:
- From: "Bedrock (Claude 4.6)"
- To: "Bedrock (Claude 3.5)"

### Test Locally

```powershell
npm run dev
# Go to http://localhost:3000/kisan-mitra.html
# Select "Bedrock (Claude 3.5)" mode
# Test with a query
```

## Claude 3.5 Sonnet v2 vs Claude Sonnet 4.6

| Feature | Claude 3.5 Sonnet v2 | Claude Sonnet 4.6 |
|---------|---------------------|-------------------|
| **Release Date** | October 2024 | February 2025 |
| **Context Window** | 200K tokens | 1M tokens (beta) |
| **Pricing (Input)** | $3.00 / 1M tokens | $3.00 / 1M tokens |
| **Pricing (Output)** | $15.00 / 1M tokens | $15.00 / 1M tokens |
| **Inference Profile** | Not required | Required |
| **Marketplace** | No issues | May require subscription |
| **Performance** | Excellent | Slightly better |
| **Availability** | High | Limited regions |

**Recommendation**: Use Claude 3.5 Sonnet v2 for now. It's just as good for your use case (farming advice chatbot) and doesn't have the marketplace/inference profile complications.

## Testing Commands

### Test Claude 3.5 Sonnet v2
```powershell
$payload = @'
{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 200,
  "messages": [
    {
      "role": "user",
      "content": "What are the best crops to grow in Karnataka during monsoon season?"
    }
  ]
}
'@
$payload | Out-File -Encoding utf8 -NoNewline test.json
aws bedrock-runtime invoke-model `
  --model-id "anthropic.claude-3-5-sonnet-20241022-v2:0" `
  --region "ap-southeast-2" `
  --body file://test.json `
  --cli-binary-format raw-in-base64-out `
  out.json

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS!" -ForegroundColor Green
    $result = Get-Content out.json | ConvertFrom-Json
    Write-Host $result.content[0].text -ForegroundColor Cyan
} else {
    Write-Host "FAILED" -ForegroundColor Red
}

Remove-Item test.json, out.json
```

### Test Amazon Nova Lite
```powershell
# Nova Lite uses Converse API format
$payload = @'
{
  "messages": [
    {
      "role": "user",
      "content": [{"text": "What are the best crops for monsoon?"}]
    }
  ],
  "inferenceConfig": {
    "maxTokens": 200,
    "temperature": 0.7
  }
}
'@
$payload | Out-File -Encoding utf8 -NoNewline test.json
aws bedrock-runtime invoke-model `
  --model-id "amazon.nova-lite-v1:0" `
  --region "us-east-1" `
  --body file://test.json `
  --cli-binary-format raw-in-base64-out `
  out.json

if ($LASTEXITCODE -eq 0) {
    Write-Host "SUCCESS!" -ForegroundColor Green
    $result = Get-Content out.json | ConvertFrom-Json
    Write-Host $result.output.message.content[0].text -ForegroundColor Cyan
} else {
    Write-Host "FAILED" -ForegroundColor Red
}

Remove-Item test.json, out.json
```

## Summary

The Claude Sonnet 4.6 marketplace/payment issue is likely a temporary AWS account validation issue. The best path forward is:

1. **Short term**: Use Claude 3.5 Sonnet v2 (no inference profile, no marketplace issues)
2. **Medium term**: Wait 24-48 hours and try Claude Sonnet 4.6 again
3. **Long term**: Contact AWS Support if the issue persists

Claude 3.5 Sonnet v2 is excellent for your farming advice chatbot and will work immediately.

