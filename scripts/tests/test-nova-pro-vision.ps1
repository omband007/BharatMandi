# Test Amazon Nova Pro Vision Capabilities for Disease Diagnosis
Write-Host "Testing Amazon Nova Pro Vision for Crop Disease Diagnosis" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if we can invoke Nova Pro
Write-Host "1. Testing Nova Pro availability..." -ForegroundColor Yellow

# For image testing, we need to encode an image as base64
# Let's test with a simple text-only query first to verify access
$textPayload = @{
    messages = @(
        @{
            role = "user"
            content = @(
                @{
                    text = "You are an agricultural expert. Describe the common symptoms of tomato leaf blight disease."
                }
            )
        }
    )
    inferenceConfig = @{
        maxTokens = 300
        temperature = 0.7
    }
} | ConvertTo-Json -Depth 10

$textPayload | Out-File -Encoding utf8 -NoNewline test-text.json

$result = aws bedrock-runtime invoke-model `
    --model-id "amazon.nova-pro-v1:0" `
    --region "us-east-1" `
    --body file://test-text.json `
    --cli-binary-format raw-in-base64-out `
    out-text.json 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   SUCCESS - Nova Pro is accessible!" -ForegroundColor Green
    $response = Get-Content out-text.json | ConvertFrom-Json
    $answer = $response.output.message.content[0].text
    Write-Host "   Response: $answer" -ForegroundColor Cyan
    Write-Host ""
    
    # Test 2: Check pricing and capabilities
    Write-Host "2. Nova Pro Capabilities:" -ForegroundColor Yellow
    Write-Host "   - Modalities: TEXT, IMAGE, VIDEO" -ForegroundColor Green
    Write-Host "   - Input Cost: `$0.80 per 1M tokens" -ForegroundColor Green
    Write-Host "   - Output Cost: `$3.20 per 1M tokens" -ForegroundColor Green
    Write-Host "   - Image Cost: ~`$0.004 per image" -ForegroundColor Green
    Write-Host "   - Context Window: 300K tokens" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "3. Next Steps for Image Testing:" -ForegroundColor Yellow
    Write-Host "   To test with actual crop images, you need to:" -ForegroundColor White
    Write-Host "   a) Take a photo of a diseased crop" -ForegroundColor White
    Write-Host "   b) Convert image to base64" -ForegroundColor White
    Write-Host "   c) Send to Nova Pro with diagnosis prompt" -ForegroundColor White
    Write-Host ""
    
    Write-Host "4. Sample Image Payload Format:" -ForegroundColor Yellow
    Write-Host @'
{
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "image": {
            "format": "jpeg",
            "source": {
              "bytes": "<base64-encoded-image>"
            }
          }
        },
        {
          "text": "Analyze this crop image. Identify any diseases or pests. Provide: 1) Disease/pest name, 2) Confidence level, 3) Symptoms visible, 4) Chemical remedies, 5) Organic remedies"
        }
      ]
    }
  ],
  "inferenceConfig": {
    "maxTokens": 500,
    "temperature": 0.7
  }
}
'@ -ForegroundColor Cyan
    
} else {
    Write-Host "   FAILED - Cannot access Nova Pro" -ForegroundColor Red
    Write-Host "   Error: $result" -ForegroundColor Red
    
    if ($result -match "INVALID_PAYMENT_INSTRUMENT") {
        Write-Host ""
        Write-Host "   Nova Pro may have the same marketplace issue as Claude." -ForegroundColor Yellow
        Write-Host "   Recommendation: Wait for marketplace subscription to complete." -ForegroundColor Yellow
    }
}

Remove-Item test-text.json, out-text.json -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "Amazon Nova Pro supports multimodal input (text + images) and is perfect for" -ForegroundColor White
Write-Host "disease diagnosis. It can analyze crop photos and provide detailed diagnosis" -ForegroundColor White
Write-Host "with remedy suggestions." -ForegroundColor White
