# AWS Translate Content Safety Issue Investigation

**Date Discovered:** February 28, 2026  
**Severity:** HIGH  
**Status:** Reported to AWS - Awaiting Response  
**Reporter:** Bharat Mandi Development Team

---

## Quick Links

- **[Quick Summary](./QUICK-SUMMARY.md)** - 1-page overview for quick reference
- **[Full Report](./FULL-REPORT.md)** - Comprehensive technical report for AWS submission
- **[Evidence](./evidence/)** - Screenshots and logs (if available)

---

## Issue Overview

AWS Translate generated inappropriate religious content when translating Marathi text to Hindi with an incorrectly specified source language. The service hallucinated content that was not present in the original input.

### Key Facts

- **Service:** Amazon Translate
- **Region:** ap-south-1 (Asia Pacific - Mumbai)
- **Language Pair:** Marathi → Hindi (specified as English → Hindi)
- **Reproducibility:** 100% consistent
- **Impact:** Production blocker for translation features

---

## Timeline

| Date | Event |
|------|-------|
| 2026-02-28 | Issue discovered during POC UI testing |
| 2026-02-28 | Language detection bug fixed (< 20 char threshold removed) |
| 2026-02-28 | Language mismatch warning added to translation service |
| 2026-02-28 | Formal reports prepared for AWS submission |
| TBD | AWS response expected |

---

## Mitigation Status

### Implemented ✅
- Language detection threshold reduced from 20 to 3 characters
- Language mismatch warning logging added
- Client-side validation for language detection

### Pending AWS Response ⏳
- Server-side input validation
- Content safety filters
- Hallucination detection
- Error codes for language mismatches

---

## Related Files

### Code Changes
- `src/features/i18n/translation.service.ts` - Added language mismatch warning
- `src/features/i18n/__tests__/translation.service.test.ts` - Updated test threshold

### Documentation
- `docs/features/TRANSLATION-QUICK-START.md` - Translation service guide
- `docs/testing/I18N-MANUAL-TESTING-GUIDE.md` - Testing procedures

---

## Submission Checklist

- [x] Full technical report prepared
- [x] Quick summary prepared
- [ ] Screenshots attached
- [ ] AWS Support case created
- [ ] AWS Translate feedback form submitted
- [ ] AWS Forums post created (optional)
- [ ] Internal team notified
- [ ] Production deployment blocked until resolution

---

## Next Steps

1. **Submit to AWS Support** - Create technical support case
2. **Monitor Response** - Track AWS investigation progress
3. **Test Fix** - Verify resolution when AWS provides update
4. **Update Documentation** - Document lessons learned
5. **Resume Deployment** - Unblock production after verification

---

## Contact

For questions about this investigation:
- **Internal:** Bharat Mandi Development Team
- **AWS Support:** [Case Number TBD]

---

**Last Updated:** February 28, 2026
