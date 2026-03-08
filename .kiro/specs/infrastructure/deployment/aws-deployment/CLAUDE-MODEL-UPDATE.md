# Claude 3.5 Sonnet Model Update

## Issue
The Claude 3.5 Sonnet v1 model ID (`anthropic.claude-3-5-sonnet-20240620-v1:0`) was returning a 404 "Model not found" error when trying to use it in AWS Bedrock.

## Solution Applied
Updated to Claude 3.5 Sonnet v2 model ID: `anthropic.claude-3-5-sonnet-20241022-v2:0`

### Changes Made

1. **Updated `src/features/i18n/kisan-mitra.service.ts`**:
   - Changed model ID from v1 to v2
   - Model ID: `anthropic.claude-3-5-sonnet-20241022-v2:0`

2. **Updated `public/kisan-mitra.html`**:
   - Updated UI labels to show "Claude 3.5 Sonnet v2"
   - Updated status messages
   - Updated dropdown option text

## Claude 3.5 Sonnet v2 Benefits

According to AWS documentation:
- **Double output tokens**: 8k tokens (vs 4k in v1)
- **Same pricing** as v1
- **Improved performance** across software development lifecycle
- **Better agentic reasoning** compared to Claude 3 Opus

## Model Access Requirements

Even though AWS Marketplace shows "auto-enabled access" for serverless models, you may need to:

1. **Enable Model Access in AWS Bedrock Console**:
   - Go to AWS Console > Bedrock > Model Access
   - Find "Claude 3.5 Sonnet v2" in the list
   - Click "Request access" or "Enable"
   - Wait for approval (usually instant for serverless models)

2. **Verify IAM Permissions**:
   - The EC2 IAM role (`BharatMandiEC2Role`) already has Bedrock permissions
   - Ensure the policy includes `bedrock:InvokeModel` for the specific model

## Testing Steps

1. **Test the updated model**:
   ```bash
   # Access the Kisan Mitra page
   http://13.236.3.139:3000/kisan-mitra.html
   
   # Select "Bedrock (Claude 3.5 v2)" from the mode dropdown
   # Try sending a test message
   ```

2. **If still getting 404 error**:
   - Check AWS Bedrock console for model access status
   - Verify the model is available in us-east-1 region
   - Check CloudWatch logs for detailed error messages

3. **Alternative model IDs to try** (if v2 doesn't work):
   - Claude 3 Sonnet (older): `anthropic.claude-3-sonnet-20240229-v1:0`
   - Claude 4 Sonnet (if available): Check AWS console for exact ID
   - Use inference profiles: `us.anthropic.claude-sonnet-4-*`

## Current Model Configuration

### Working Models
- ✅ **Amazon Nova Lite**: `amazon.nova-lite-v1:0` (working perfectly)
- ⏳ **Claude 3.5 Sonnet v2**: `anthropic.claude-3-5-sonnet-20241022-v2:0` (needs testing)

### Mode Mapping
- `bedrock-nova` → Amazon Nova Lite
- `bedrock-claude` → Claude 3.5 Sonnet v2

## Known Issues

### Language Issue with Nova Lite
Amazon Nova Lite sometimes responds in the wrong language (Hindi/Marathi) even when English is selected. This is due to conversation history contamination.

**Workaround**:
- Use the "Clear Chat" button to reset conversation history
- This generates a new session ID and clears server-side history

**Root Cause**:
- The conversation history includes messages in multiple languages
- Nova Lite picks up on the language patterns from history
- Even with explicit "ALWAYS RESPOND IN ENGLISH ONLY" in system prompt

**Potential Solutions**:
1. Clear conversation history more aggressively
2. Filter conversation history to only include English messages
3. Add language detection and correction in post-processing
4. Use separate sessions for different languages

## Next Steps

1. **Test Claude 3.5 Sonnet v2**:
   - Verify the model works with the new ID
   - Compare response quality with Nova Lite
   - Test in multiple languages

2. **Enable Model Access** (if needed):
   - Go to AWS Bedrock console
   - Request access to Claude 3.5 Sonnet v2
   - Wait for approval

3. **Fix Language Issue**:
   - Implement conversation history filtering
   - Add language detection and correction
   - Consider using separate sessions per language

4. **Update Documentation**:
   - Document working model IDs
   - Add troubleshooting guide
   - Update deployment instructions

## References

- [AWS Bedrock Claude 3.5 Sonnet v2 Announcement](https://aws.amazon.com/blogs/aws/upgraded-claude-3-5-sonnet-from-anthropic-available-now-computer-use-public-beta-and-claude-3-5-haiku-coming-soon-in-amazon-bedrock/)
- [Claude 3.5 Sonnet v2: Double Output Tokens](https://community.aws/content/2uun3vJOQHdwN9l4ZEqbkbnyUFG/claude-3-5-sonnet-v2-double-output-tokens-on-aws-bedrock)
- [AWS Bedrock Model IDs Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/model-ids-arns.html)

## Deployment Status

- ✅ Code updated and built
- ✅ Deployed to EC2 (13.236.3.139)
- ✅ Application restarted
- ⏳ Awaiting testing and model access verification
