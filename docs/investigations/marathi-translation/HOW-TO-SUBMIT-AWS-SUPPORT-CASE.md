# How to Submit AWS Support Case for Marathi Translation Issue

## Prerequisites

✅ You have an AWS account (281627750826)  
✅ You have AWS Support plan (check your plan level)  
✅ You have the evidence document ready (`AWS-SUPPORT-CASE-MARATHI-TRANSLATION.md`)

## Support Plan Check

First, check your AWS Support plan level:

1. Go to [AWS Support Center](https://console.aws.amazon.com/support/home)
2. Check your plan in the top-right corner

**Support Plans:**
- **Basic** (Free): No technical support, only billing/account support
- **Developer** ($29/month): Business hours email support, 12-24 hour response
- **Business** ($100/month): 24/7 phone/chat/email, 1-hour response for urgent issues
- **Enterprise** ($15,000/month): Dedicated TAM, 15-minute response for critical issues

**Note**: If you have Basic plan, you can only submit billing/account cases. For technical support, you'll need to upgrade to Developer plan ($29/month minimum).

## Option 1: Submit via AWS Console (Recommended)

### Step 1: Open AWS Support Center

1. Sign in to [AWS Console](https://console.aws.amazon.com/)
2. Click your account name (top-right) → "Support Center"
3. Or go directly to: https://console.aws.amazon.com/support/home

### Step 2: Create Case

1. Click **"Create case"** button
2. Choose case type:
   - If you have Developer/Business/Enterprise plan: Select **"Technical support"**
   - If you have Basic plan: You'll need to upgrade first

### Step 3: Fill Case Details

**Service:**
- Select: **"Translate"**

**Category:**
- Select: **"Translation Quality"** (or "Other" if not available)

**Severity:**
- Select: **"General guidance"** or **"System impaired"** (if you have Business+ plan)

**Subject:**
```
Marathi (mr) translations incomplete - missing semantic components
```

**Description:**
Copy and paste the content from `AWS-SUPPORT-CASE-MARATHI-TRANSLATION.md`, specifically:

```
AWS Translate is returning incomplete/truncated translations specifically for Marathi language (language code: mr), while other Indian languages (Hindi, Tamil, Telugu, Bengali, etc.) produce complete and accurate translations for the same input text.

EVIDENCE:
We tested "Welcome to Bharat Mandi" across multiple languages:
- Marathi (mr): "भारत मंडी येथे" (14 chars) - INCOMPLETE
- Hindi (hi): "भारत मंडी में आपका स्वागत है" (28 chars) - Complete
- Tamil (ta): "பாரத் மண்டிக்கு வருக" (20 chars) - Complete
- Telugu (te): "భారత్ మండీకి స్వాగతం" (20 chars) - Complete

ANALYSIS:
The Marathi translation is missing the "welcome" greeting component. It only translates to "Bharat Mandi here/there" instead of the complete "Welcome to Bharat Mandi".

REPRODUCTION:
aws translate translate-text \
  --region ap-southeast-2 \
  --text "Welcome to Bharat Mandi" \
  --source-language-code en \
  --target-language-code mr

BUSINESS IMPACT:
Our agricultural marketplace serves 83 million Marathi-speaking farmers in Maharashtra. Incomplete translations reduce trust and feature adoption.

QUESTIONS:
1. Is this a known limitation of AWS Translate's Marathi model?
2. What is the expected timeline for improvements?
3. Are there recommended workarounds?
4. Should we use a different service for Marathi?

TECHNICAL DETAILS:
- SDK: @aws-sdk/client-translate (latest)
- Region: ap-southeast-2
- Account: 281627750826
- All other 10 Indian languages work correctly
```

**Attachments:**
- Attach the full `AWS-SUPPORT-CASE-MARATHI-TRANSLATION.md` file
- Attach diagnostic script output if you saved it

### Step 4: Contact Options

**Preferred contact language:** English

**Contact methods:**
- **Web** (always available)
- **Phone** (if Business+ plan)
- **Chat** (if Business+ plan)

### Step 5: Submit

1. Review all details
2. Click **"Submit"**
3. Note the **Case ID** (e.g., case-123456789)

## Option 2: Submit via AWS CLI

If you prefer CLI:

```bash
aws support create-case \
  --subject "Marathi (mr) translations incomplete - missing semantic components" \
  --service-code "translate" \
  --severity-code "low" \
  --category-code "other" \
  --communication-body "$(cat AWS-SUPPORT-CASE-MARATHI-TRANSLATION.md)" \
  --language "en" \
  --region us-east-1
```

**Note**: AWS Support API is only available in us-east-1 region.

## Option 3: Submit via Email (if Developer+ plan)

If you have Developer or higher plan:

1. Email: Your support email (check AWS Support Center for your specific email)
2. Subject: `[Case] Marathi (mr) translations incomplete - missing semantic components`
3. Body: Copy content from `AWS-SUPPORT-CASE-MARATHI-TRANSLATION.md`
4. Attach: The full markdown file

## After Submission

### What to Expect

**Response Times** (based on severity and plan):
- **Developer Plan**: 12-24 hours (business hours)
- **Business Plan**: 1-12 hours (24/7)
- **Enterprise Plan**: 15 minutes - 1 hour (24/7)

### Track Your Case

1. Go to [AWS Support Center](https://console.aws.amazon.com/support/home)
2. Click **"Your support cases"**
3. Find your case by Case ID
4. You'll receive email notifications for updates

### Possible Responses

**Scenario 1: Known Limitation**
- AWS confirms Marathi model has limited training data
- They provide timeline for improvements (if any)
- **Action**: Implement Workaround #1 (Hybrid approach with Google Translate)

**Scenario 2: Configuration Issue**
- AWS suggests using different settings or language code
- **Action**: Test their suggestions and update our code

**Scenario 3: Bug Confirmed**
- AWS acknowledges this as a bug
- They provide timeline for fix
- **Action**: Implement temporary workaround, plan to revert after fix

**Scenario 4: Working as Designed**
- AWS states this is expected behavior for Marathi
- No plans to improve
- **Action**: Switch to alternative translation service for Marathi

## If You Don't Have Technical Support

### Option A: Upgrade to Developer Plan

**Cost**: $29/month (or 3% of monthly AWS usage, whichever is higher)

**Benefits**:
- Email support during business hours
- 12-24 hour response time
- Unlimited cases
- Access to AWS Trusted Advisor

**To Upgrade**:
1. Go to [AWS Support Plans](https://console.aws.amazon.com/support/plans/home)
2. Click **"Change plan"**
3. Select **"Developer"**
4. Confirm billing

### Option B: Post in AWS Forums (Free)

1. Go to [AWS re:Post](https://repost.aws/)
2. Create account (free)
3. Post your question with tag `aws-translate`
4. Include evidence from the support case document

**Note**: Forum responses are from community, not official AWS support. Response time varies.

### Option C: Contact AWS Sales

If this is blocking a production deployment:
1. Contact AWS Sales: https://aws.amazon.com/contact-us/
2. Explain the business impact
3. They may escalate to technical team

## Follow-Up Actions

After receiving AWS response:

1. **Update** `AWS-SUPPORT-CASE-MARATHI-TRANSLATION.md` with:
   - Case number
   - AWS response summary
   - Recommended solution

2. **Decide** on implementation approach:
   - If AWS provides fix timeline: Wait or implement temporary workaround
   - If AWS confirms limitation: Implement permanent workaround

3. **Update** `MARATHI-TRANSLATION-ISSUE.md` with resolution

4. **Commit** all updates to Git

## Questions?

If you need help with any step, let me know and I can guide you through the process.

---

**Document Created**: 2024  
**Last Updated**: 2024  
**Status**: Ready for submission
