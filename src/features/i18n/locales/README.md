# Translation Bundles

This directory contains translation bundles for all supported languages in Bharat Mandi.

## Supported Languages

- `en` - English
- `hi` - हिन्दी (Hindi)
- `pa` - ਪੰਜਾਬੀ (Punjabi)
- `mr` - मराठी (Marathi)
- `ta` - தமிழ் (Tamil)
- `te` - తెలుగు (Telugu)
- `bn` - বাংলা (Bengali)
- `gu` - ગુજરાતી (Gujarati)
- `kn` - ಕನ್ನಡ (Kannada)
- `ml` - മലയാളം (Malayalam)
- `or` - ଓଡ଼ିଆ (Odia)

## Translation Key Naming Conventions

### Structure

Translation keys follow a hierarchical structure:
```
{feature}.{component}.{element}
```

### Examples

```json
{
  "common.welcome": "Welcome",
  "auth.login": "Login",
  "marketplace.createListing": "Create Listing",
  "errors.networkError": "Network error"
}
```

### Categories

1. **common** - Shared UI elements (buttons, labels, etc.)
2. **auth** - Authentication and user management
3. **marketplace** - Marketplace listings and search
4. **grading** - Produce grading and certificates
5. **transactions** - Orders and payments
6. **errors** - Error messages
7. **validation** - Form validation messages
8. **notifications** - Push and in-app notifications

### Variable Interpolation

Use double curly braces for variables:
```json
{
  "grading.gradeResult": "Grade: {{grade}}",
  "marketplace.pricePerKg": "₹{{price}} per kg"
}
```

### Pluralization

Use `_one`, `_other` suffixes for plural forms:
```json
{
  "marketplace.listings_one": "{{count}} listing",
  "marketplace.listings_other": "{{count}} listings"
}
```

### Context-Specific Translations

Use `_context` suffix for context-specific translations:
```json
{
  "common.save": "Save",
  "common.save_listing": "Save Listing",
  "common.save_profile": "Save Profile"
}
```

## Adding New Translations

1. Add the key to `en/translation.json` first (base language)
2. Add the same key to all other language files
3. Run `npm run i18n:validate` to check for missing keys
4. Get translations reviewed by native speakers

## Translation Guidelines

### For Translators

1. **Preserve Variables**: Keep `{{variable}}` placeholders unchanged
2. **Maintain Tone**: Use respectful, farmer-friendly language
3. **Agricultural Terms**: Use locally recognized crop and farming terms
4. **Currency**: Always use ₹ symbol for Indian Rupees
5. **Measurements**: Use metric system (kg, liters, acres)
6. **Dates**: Follow DD/MM/YYYY format
7. **Numbers**: Use Indian numbering system (lakhs, crores)

### Quality Checklist

- [ ] All keys from English bundle are present
- [ ] Variables are preserved correctly
- [ ] Agricultural terminology is accurate
- [ ] Tone is appropriate for target audience
- [ ] No offensive or inappropriate content
- [ ] Reviewed by native speaker
- [ ] Tested in the app UI

## File Structure

```
locales/
├── README.md (this file)
├── en/
│   └── translation.json
├── hi/
│   └── translation.json
├── pa/
│   └── translation.json
├── mr/
│   └── translation.json
├── ta/
│   └── translation.json
├── te/
│   └── translation.json
├── bn/
│   └── translation.json
├── gu/
│   └── translation.json
├── kn/
│   └── translation.json
├── ml/
│   └── translation.json
└── or/
    └── translation.json
```

## Validation

Run the translation validation script to check for:
- Missing keys
- Incomplete translations
- Variable mismatches
- Syntax errors

```bash
npm run i18n:validate
```

## Testing

Test translations in the app:
1. Change language in settings
2. Navigate through all screens
3. Verify all text is translated
4. Check for layout issues with longer text
5. Test with screen readers for accessibility

## Contributing

When adding new features:
1. Add translation keys to all language files
2. Use descriptive key names
3. Group related keys together
4. Document any special formatting requirements
5. Submit for native speaker review before merging
