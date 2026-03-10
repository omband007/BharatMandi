# PowerShell script to update EC2 IAM role with crop diagnosis permissions
# This adds S3 and Bedrock permissions to the BharatMandiEC2Role

$ROLE_NAME = "BharatMandiEC2Role"
$POLICY_NAME = "CropDiagnosisPolicy"
$POLICY_FILE = "scripts/crop-diagnosis-iam-policy.json"

Write-Host "Updating IAM role: $ROLE_NAME" -ForegroundColor Blue
Write-Host ""

# Check if policy file exists
if (-not (Test-Path $POLICY_FILE)) {
    Write-Host "Error: Policy file not found: $POLICY_FILE" -ForegroundColor Red
    exit 1
}

# Read policy document
$policyDocument = Get-Content $POLICY_FILE -Raw

Write-Host "Creating/updating inline policy: $POLICY_NAME" -ForegroundColor Yellow

# Put role policy (creates or updates inline policy)
aws iam put-role-policy `
    --role-name $ROLE_NAME `
    --policy-name $POLICY_NAME `
    --policy-document $policyDocument

if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Policy attached successfully" -ForegroundColor Green
    Write-Host ""
    Write-Host "Permissions added:" -ForegroundColor Cyan
    Write-Host "  - S3: PutObject, GetObject, DeleteObject on bharat-mandi-crop-diagnosis bucket"
    Write-Host "  - Bedrock: InvokeModel for amazon.nova-pro-v1:0"
    Write-Host ""
    Write-Host "Note: Changes take effect immediately. No need to restart EC2 instance." -ForegroundColor Yellow
} else {
    Write-Host "Error: Failed to attach policy" -ForegroundColor Red
    Write-Host "Make sure you have AWS CLI configured with appropriate permissions" -ForegroundColor Yellow
    exit 1
}
