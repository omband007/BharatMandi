# Translation & Internationalization (i18n)

Multi-language support for Bharat Mandi, enabling farmers to use the platform in their native language.

## Features

- 11 Indian languages supported (English, Hindi, Punjabi, Marathi, Tamil, Telugu, Bengali, Gujarati, Kannada, Malayalam, Odia)
- AWS Translate integration for real-time translation
- Redis caching for improved performance
- Batch translation for marketplace listings
- Translation feedback system
- Locale formatting (dates, numbers, currency)

## Documentation

- [Quick Start Guide](QUICK-START.md) - Get started with translation service
- [AWS Translate Setup](AWS-TRANSLATE-SETUP.md) - Configure AWS Translate
- [Batch Translation](BATCH-TRANSLATION.md) - Optimize listing translations
- [Phase 2 Service](PHASE2-SERVICE.md) - Translation service implementation
- [Feedback Setup](FEEDBACK-SETUP.md) - Translation feedback system
- [Status](STATUS.md) - Current implementation status
- [i18n Testing Guide](I18N-TESTING-GUIDE.md) - Testing multi-language support

## Related Specs

See `.kiro/specs/features/multi-language-support/` for requirements, design, and tasks.

## Related Features

- [Kisan Mitra](../kisan-mitra/) - Voice assistant with multi-language support
