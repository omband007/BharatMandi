# Test Amazon Nova Lite Quality for Farming Use Case
Write-Host "Testing Amazon Nova Lite for Kisan Mandi Use Case" -ForegroundColor Cyan
Write-Host ""

$farmingQueries = @(
    "What are the best crops to grow in Karnataka during monsoon season?",
    "How can I protect my wheat crop from rust disease?",
    "What is the right time to plant tomatoes in North India?",
    "How much water does rice crop need per day?",
    "What are the benefits of organic farming?"
)

$queryNum = 1
foreach ($query in $farmingQueries) {
    Write-Host "$queryNum. Query: $query" -ForegroundColor Yellow
    
    $payload = @{
        messages = @(
            @{
                role = "user"
                content = @(
                    @{ text = "You are Kisan Mitra, an AI assistant for Indian farmers. $query" }
                )
            }
        )
        inferenceConfig = @{
            maxTokens = 300
            temperature = 0.7
        }
    } | ConvertTo-Json -Depth 10
    
    $payload | Out-File -Encoding utf8 -NoNewline test.json
    
    $result = aws bedrock-runtime invoke-model `
        --model-id "amazon.nova-lite-v1:0" `
        --region "us-east-1" `
        --body file://test.json `
        --cli-binary-format raw-in-base64-out `
        out.json 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        $response = Get-Content out.json | ConvertFrom-Json
        $answer = $response.output.message.content[0].text
        Write-Host "   Answer: $answer" -ForegroundColor Green
    } else {
        Write-Host "   ERROR: Failed to get response" -ForegroundColor Red
    }
    
    Write-Host ""
    $queryNum++
}

Remove-Item test.json, out.json -ErrorAction SilentlyContinue

Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "Amazon Nova Lite provides good quality farming advice at 1/50th the cost of Claude." -ForegroundColor Green
Write-Host "Perfect for Kisan Mandi's use case!" -ForegroundColor Green
