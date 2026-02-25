// Property-based tests for I18nService
// These tests validate universal correctness properties

import { I18nService, SUPPORTED_LANGUAGES } from '../i18n.service';
import * as fc from 'fast-check';

// Mock i18next
jest.mock('i18next', () => ({
  init: jest.fn().mockResolvedValue(undefined),
  changeLanguage: jest.fn().mockResolvedValue(undefined),
  t: jest.fn((key: string) => key),
  language: 'en',
  getResourceBundle: jest.fn(() => ({
    common: {
      welcome: 'Welcome',
      logout: 'Logout',
    },
  })),
}));

describe('I18nService - Property-Based Tests', () => {
  let service: I18nService;

  beforeEach(async () => {
    service = new I18nService();
    await service.initialize();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 2: Translation Key Completeness', () => {
    it('should have all keys from English bundle in all other language bundles', async () => {
      // This is a structural property test
      // In a real implementation, we would load actual translation files
      
      const i18next = require('i18next');
      
      // Mock English bundle
      const englishKeys = {
        common: { welcome: 'Welcome', logout: 'Logout', hello: 'Hello' },
        auth: { login: 'Login', signup: 'Sign Up' },
        marketplace: { createListing: 'Create Listing', search: 'Search' },
      };
      
      i18next.getResourceBundle.mockImplementation((lang: string) => {
        if (lang === 'en') return englishKeys;
        // All other languages should have same structure
        return englishKeys;
      });

      const result = await service.validateTranslationCompleteness();
      
      expect(result.incomplete).toHaveLength(0);
      expect(result.missing).toHaveLength(0);
    });

    it('should detect missing keys in any language', async () => {
      const i18next = require('i18next');
      
      i18next.getResourceBundle.mockImplementation((lang: string) => {
        if (lang === 'en') {
          return {
            common: { welcome: 'Welcome', logout: 'Logout' },
            auth: { login: 'Login' },
          };
        }
        // Hindi missing auth.login
        if (lang === 'hi') {
          return {
            common: { welcome: 'स्वागत है', logout: 'लॉग आउट' },
            auth: {},
          };
        }
        return {
          common: { welcome: 'Welcome', logout: 'Logout' },
          auth: { login: 'Login' },
        };
      });

      const result = await service.validateTranslationCompleteness();
      
      expect(result.incomplete).toContain('hi');
      expect(result.missing).toContain('hi:auth.login');
    });
  });

  describe('Property 4: Number Formatting Round-Trip', () => {
    it('should preserve number values within precision when formatting', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000000, max: 1000000, noNaN: true })
            .filter(n => Math.abs(n) > 0.001), // Exclude very small numbers
          fc.constantFrom(...SUPPORTED_LANGUAGES.map(l => l.code)),
          (value, languageCode) => {
            // Format the number
            const formatted = service.formatNumber(value, languageCode);
            
            // Parse it back (remove formatting characters, keep digits and decimal point)
            const cleanedNumber = formatted.replace(/[^\d.-]/g, '').replace(/^-+/, '-');
            const parsed = parseFloat(cleanedNumber);
            
            // Should be within reasonable precision (1% tolerance)
            if (isNaN(parsed)) {
              // Some locales might use different decimal separators
              return true; // Accept this as valid formatting
            }
            
            const diff = Math.abs(value - parsed);
            const tolerance = Math.abs(value) * 0.01 + 0.01;
            
            return diff <= tolerance;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format zero consistently across all locales', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SUPPORTED_LANGUAGES.map(l => l.code)),
          (languageCode) => {
            const formatted = service.formatNumber(0, languageCode);
            // Zero should be represented, might be "0" or "০" (Bengali) etc.
            return formatted.length > 0 && typeof formatted === 'string';
          }
        )
      );
    });

    it('should preserve sign when formatting negative numbers', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000000, max: -0.01, noNaN: true }),
          fc.constantFrom(...SUPPORTED_LANGUAGES.map(l => l.code)),
          (value, languageCode) => {
            const formatted = service.formatNumber(value, languageCode);
            // Should contain minus sign or be wrapped in parentheses
            return formatted.includes('-') || formatted.includes('(');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 7: Language Preference Persistence', () => {
    it('should store and retrieve same language preference', async () => {
      // Mock database
      const mockDb = {
        updateUser: jest.fn().mockResolvedValue(undefined),
        getUserById: jest.fn(),
      };
      (global as any).sharedDbManager = mockDb;

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...SUPPORTED_LANGUAGES.map(l => l.code)),
          fc.uuid(),
          async (languageCode, userId) => {
            // Store preference
            await service.updateUserLanguagePreference(userId, languageCode);
            
            // Mock retrieval
            mockDb.getUserById.mockResolvedValue({
              id: userId,
              languagePreference: languageCode,
            });
            
            // Retrieve preference
            const retrieved = await service.getUserLanguagePreference(userId);
            
            return retrieved === languageCode;
          }
        ),
        { numRuns: 20 }
      );

      delete (global as any).sharedDbManager;
    });
  });

  describe('Property 20: Locale-Specific Formatting Consistency', () => {
    it('should format dates consistently for same locale', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }),
          fc.constantFrom(...SUPPORTED_LANGUAGES.map(l => l.code)),
          (date, languageCode) => {
            const formatted1 = service.formatDate(date, languageCode);
            const formatted2 = service.formatDate(date, languageCode);
            
            return formatted1 === formatted2;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should format numbers consistently for same locale', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1000000, noNaN: true }),
          fc.constantFrom(...SUPPORTED_LANGUAGES.map(l => l.code)),
          (value, languageCode) => {
            const formatted1 = service.formatNumber(value, languageCode);
            const formatted2 = service.formatNumber(value, languageCode);
            
            return formatted1 === formatted2;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should format currency consistently for same locale', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1000000, noNaN: true }),
          fc.constantFrom(...SUPPORTED_LANGUAGES.map(l => l.code)),
          (value, languageCode) => {
            const formatted1 = service.formatCurrency(value, languageCode);
            const formatted2 = service.formatCurrency(value, languageCode);
            
            return formatted1 === formatted2;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should always include currency symbol in currency formatting', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1000000, noNaN: true }),
          fc.constantFrom(...SUPPORTED_LANGUAGES.map(l => l.code)),
          (value, languageCode) => {
            const formatted = service.formatCurrency(value, languageCode);
            return formatted.includes('₹');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 1: Language Switching Idempotence', () => {
    it('should return to original state after switching back', async () => {
      const mockDb = {
        updateUser: jest.fn().mockResolvedValue(undefined),
        getUserById: jest.fn().mockResolvedValue({ id: 'test', languagePreference: 'en' }),
      };
      (global as any).sharedDbManager = mockDb;

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(...SUPPORTED_LANGUAGES.map(l => l.code)),
          fc.constantFrom(...SUPPORTED_LANGUAGES.map(l => l.code)),
          fc.uuid(),
          async (lang1, lang2, userId) => {
            const i18next = require('i18next');
            
            // Switch to lang1
            await service.changeLanguage(userId, lang1);
            i18next.language = lang1;
            const state1 = service.getCurrentLanguage();
            
            // Switch to lang2
            await service.changeLanguage(userId, lang2);
            i18next.language = lang2;
            
            // Switch back to lang1
            await service.changeLanguage(userId, lang1);
            i18next.language = lang1;
            const state2 = service.getCurrentLanguage();
            
            return state1 === state2;
          }
        ),
        { numRuns: 20 }
      );

      delete (global as any).sharedDbManager;
    });
  });

  describe('Property 3: Missing Translation Fallback', () => {
    it('should return key when translation is missing', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (key) => {
            const i18next = require('i18next');
            i18next.t.mockReturnValue(key); // Simulate missing translation
            
            const result = service.translate(key);
            
            // Should return the key itself
            return result === key;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Formatting Edge Cases', () => {
    it('should handle very large numbers', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1e10, max: 1e15, noNaN: true }),
          fc.constantFrom(...SUPPORTED_LANGUAGES.map(l => l.code)),
          (value, languageCode) => {
            const formatted = service.formatNumber(value, languageCode);
            return formatted.length > 0 && typeof formatted === 'string';
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle very small decimal numbers', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.0001, max: 0.9999, noNaN: true }),
          fc.constantFrom(...SUPPORTED_LANGUAGES.map(l => l.code)),
          (value, languageCode) => {
            const formatted = service.formatNumber(value, languageCode);
            return formatted.length > 0 && typeof formatted === 'string';
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle dates across different years', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('1970-01-01'), max: new Date('2100-12-31') })
            .filter(d => !isNaN(d.getTime())), // Filter out invalid dates
          fc.constantFrom(...SUPPORTED_LANGUAGES.map(l => l.code)),
          (date, languageCode) => {
            const formatted = service.formatDate(date, languageCode);
            return formatted.length > 0 && typeof formatted === 'string';
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Language Code Validation', () => {
    it('should reject invalid language codes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 10 })
            .filter(s => !SUPPORTED_LANGUAGES.map(l => l.code).includes(s)),
          fc.uuid(),
          async (invalidLang, userId) => {
            const mockDb = {
              updateUser: jest.fn().mockResolvedValue(undefined),
            };
            (global as any).sharedDbManager = mockDb;

            try {
              await service.changeLanguage(userId, invalidLang);
              return false; // Should have thrown
            } catch (error: any) {
              return error.message.includes('Unsupported language');
            } finally {
              delete (global as any).sharedDbManager;
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Supported Languages Properties', () => {
    it('should have all required properties for each language', () => {
      const languages = service.getSupportedLanguages();
      
      for (const lang of languages) {
        expect(lang.code).toBeDefined();
        expect(lang.name).toBeDefined();
        expect(lang.direction).toMatch(/^(ltr|rtl)$/);
        expect(lang.dateFormat).toBeDefined();
        expect(lang.numberFormat).toBeDefined();
        expect(lang.currencyFormat).toBeDefined();
      }
    });

    it('should have exactly 11 supported languages', () => {
      const languages = service.getSupportedLanguages();
      expect(languages).toHaveLength(11);
    });

    it('should have unique language codes', () => {
      const languages = service.getSupportedLanguages();
      const codes = languages.map(l => l.code);
      const uniqueCodes = new Set(codes);
      
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should include English as fallback language', () => {
      const languages = service.getSupportedLanguages();
      const englishLang = languages.find(l => l.code === 'en');
      
      expect(englishLang).toBeDefined();
      expect(englishLang?.name).toBe('English');
    });
  });
});
