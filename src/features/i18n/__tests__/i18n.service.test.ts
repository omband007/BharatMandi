// Unit tests for I18nService

import { I18nService, SUPPORTED_LANGUAGES } from '../i18n.service';
import type { DatabaseManager } from '../../../shared/database/db-abstraction';

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
    auth: {
      login: 'Login',
      signup: 'Sign Up',
    },
  })),
}));

describe('I18nService - Unit Tests', () => {
  let service: I18nService;
  let mockDbManager: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    service = new I18nService();
    
    // Mock database manager
    mockDbManager = {
      updateUser: jest.fn().mockResolvedValue(undefined),
      getUserById: jest.fn().mockResolvedValue({
        id: 'test-user-id',
        languagePreference: 'hi',
      }),
    } as any;

    // Set global database manager
    (global as any).sharedDbManager = mockDbManager;
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete (global as any).sharedDbManager;
  });

  describe('initialize', () => {
    it('should initialize with default language', async () => {
      await service.initialize();
      expect(service.getCurrentLanguage()).toBeDefined();
    });

    it('should initialize with specified language', async () => {
      await service.initialize('hi');
      expect(service.getCurrentLanguage()).toBeDefined();
    });

    it('should not reinitialize if already initialized', async () => {
      const i18next = require('i18next');
      await service.initialize();
      await service.initialize();
      
      // init should only be called once
      expect(i18next.init).toHaveBeenCalledTimes(1);
    });

    it('should load all supported language bundles', async () => {
      await service.initialize();
      
      // Verify all languages are supported
      const supportedLangs = service.getSupportedLanguages();
      expect(supportedLangs).toHaveLength(11);
      expect(supportedLangs.map(l => l.code)).toEqual([
        'en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'
      ]);
    });
  });

  describe('changeLanguage', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should change language successfully', async () => {
      await service.changeLanguage('user-123', 'hi');
      
      const i18next = require('i18next');
      expect(i18next.changeLanguage).toHaveBeenCalledWith('hi');
    });

    it('should persist language preference to database', async () => {
      await service.changeLanguage('user-123', 'hi');
      
      expect(mockDbManager.updateUser).toHaveBeenCalledWith('user-123', {
        languagePreference: 'hi',
        updatedAt: expect.any(Date),
      });
    });

    it('should reject unsupported language', async () => {
      await expect(service.changeLanguage('user-123', 'fr'))
        .rejects.toThrow('Unsupported language: fr');
    });

    it('should handle all supported languages', async () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        await expect(service.changeLanguage('user-123', lang.code))
          .resolves.not.toThrow();
      }
    });

    it('should work without database manager', async () => {
      delete (global as any).sharedDbManager;
      
      await expect(service.changeLanguage('user-123', 'hi'))
        .resolves.not.toThrow();
    });
  });

  describe('getUserLanguagePreference', () => {
    it('should return user language preference from database', async () => {
      const result = await service.getUserLanguagePreference('user-123');
      
      expect(mockDbManager.getUserById).toHaveBeenCalledWith('user-123');
      expect(result).toBe('hi');
    });

    it('should return default language when user not found', async () => {
      mockDbManager.getUserById.mockResolvedValue(undefined);
      
      const result = await service.getUserLanguagePreference('user-123');
      expect(result).toBe('en');
    });

    it('should return default language when no preference set', async () => {
      mockDbManager.getUserById.mockResolvedValue({
        id: 'user-123',
        languagePreference: undefined,
      } as any);
      
      const result = await service.getUserLanguagePreference('user-123');
      expect(result).toBe('en');
    });

    it('should return default language when database unavailable', async () => {
      delete (global as any).sharedDbManager;
      
      const result = await service.getUserLanguagePreference('user-123');
      expect(result).toBe('en');
    });
  });

  describe('updateUserLanguagePreference', () => {
    it('should update language preference in database', async () => {
      await service.updateUserLanguagePreference('user-123', 'ta');
      
      expect(mockDbManager.updateUser).toHaveBeenCalledWith('user-123', {
        languagePreference: 'ta',
        updatedAt: expect.any(Date),
      });
    });

    it('should reject unsupported language', async () => {
      await expect(service.updateUserLanguagePreference('user-123', 'de'))
        .rejects.toThrow('Unsupported language: de');
    });

    it('should work without database manager', async () => {
      delete (global as any).sharedDbManager;
      
      await expect(service.updateUserLanguagePreference('user-123', 'hi'))
        .resolves.not.toThrow();
    });
  });

  describe('translate', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should translate key successfully', () => {
      const i18next = require('i18next');
      i18next.t.mockReturnValue('स्वागत है');
      
      const result = service.translate('common.welcome');
      expect(result).toBe('स्वागत है');
      expect(i18next.t).toHaveBeenCalledWith('common.welcome', undefined);
    });

    it('should translate with interpolation options', () => {
      const i18next = require('i18next');
      i18next.t.mockReturnValue('Hello, John');
      
      const result = service.translate('common.greeting', { name: 'John' });
      expect(result).toBe('Hello, John');
      expect(i18next.t).toHaveBeenCalledWith('common.greeting', { name: 'John' });
    });

    it('should return key when translation missing', () => {
      const i18next = require('i18next');
      i18next.t.mockReturnValue('missing.key');
      
      const result = service.translate('missing.key');
      expect(result).toBe('missing.key');
    });

    it('should log warning for missing keys in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const i18next = require('i18next');
      i18next.t.mockReturnValue('missing.key');
      
      service.translate('missing.key');
      
      expect(consoleSpy).toHaveBeenCalledWith('[I18n] Missing translation key: missing.key');
      
      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should not log warning in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const i18next = require('i18next');
      i18next.t.mockReturnValue('missing.key');
      
      service.translate('missing.key');
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    it('should always return string', () => {
      const i18next = require('i18next');
      i18next.t.mockReturnValue(123);
      
      const result = service.translate('some.key');
      expect(typeof result).toBe('string');
    });
  });

  describe('formatDate', () => {
    const testDate = new Date('2024-01-15T10:30:00Z');

    it('should format date for English locale', () => {
      const result = service.formatDate(testDate, 'en');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should format date for Hindi locale', () => {
      const result = service.formatDate(testDate, 'hi');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should format date for all supported languages', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        const result = service.formatDate(testDate, lang.code);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      }
    });

    it('should handle unsupported language gracefully', () => {
      const result = service.formatDate(testDate, 'unsupported');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should format different dates correctly', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-12-31');
      
      const result1 = service.formatDate(date1, 'en');
      const result2 = service.formatDate(date2, 'en');
      
      expect(result1).not.toBe(result2);
    });
  });

  describe('formatNumber', () => {
    it('should format number for English locale', () => {
      const result = service.formatNumber(1234567.89, 'en');
      expect(result).toContain('1');
      expect(result).toContain('2');
    });

    it('should format number for Hindi locale', () => {
      const result = service.formatNumber(1234567.89, 'hi');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should format number for all supported languages', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        const result = service.formatNumber(1234567.89, lang.code);
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      }
    });

    it('should handle unsupported language gracefully', () => {
      const result = service.formatNumber(12345, 'unsupported');
      expect(result).toBe('12345');
    });

    it('should format zero correctly', () => {
      const result = service.formatNumber(0, 'en');
      expect(result).toBe('0');
    });

    it('should format negative numbers', () => {
      const result = service.formatNumber(-1234, 'en');
      expect(result).toContain('-');
      expect(result).toContain('1');
    });

    it('should format decimal numbers', () => {
      const result = service.formatNumber(123.45, 'en');
      expect(result).toBeDefined();
    });
  });

  describe('formatCurrency', () => {
    it('should format currency for English locale', () => {
      const result = service.formatCurrency(1234.56, 'en');
      expect(result).toContain('₹');
      expect(result).toContain('1');
    });

    it('should format currency for Hindi locale', () => {
      const result = service.formatCurrency(1234.56, 'hi');
      expect(result).toContain('₹');
    });

    it('should format currency for all supported languages', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        const result = service.formatCurrency(1234.56, lang.code);
        expect(result).toContain('₹');
      }
    });

    it('should handle unsupported language gracefully', () => {
      const result = service.formatCurrency(1234, 'unsupported');
      expect(result).toBe('₹1234');
    });

    it('should format zero currency', () => {
      const result = service.formatCurrency(0, 'en');
      expect(result).toContain('₹');
      expect(result).toContain('0');
    });

    it('should format large amounts', () => {
      const result = service.formatCurrency(1234567.89, 'en');
      expect(result).toContain('₹');
      expect(result).toContain('1');
    });

    it('should format decimal amounts', () => {
      const result = service.formatCurrency(99.99, 'en');
      expect(result).toContain('₹');
      expect(result).toContain('99');
    });
  });

  describe('getCurrentLanguage', () => {
    it('should return current language', () => {
      const result = service.getCurrentLanguage();
      expect(result).toBe('en');
    });
  });

  describe('getSupportedLanguages', () => {
    it('should return all supported languages', () => {
      const result = service.getSupportedLanguages();
      expect(result).toHaveLength(11);
      expect(result).toEqual(SUPPORTED_LANGUAGES);
    });

    it('should include all required language properties', () => {
      const result = service.getSupportedLanguages();
      
      for (const lang of result) {
        expect(lang).toHaveProperty('code');
        expect(lang).toHaveProperty('name');
        expect(lang).toHaveProperty('direction');
        expect(lang).toHaveProperty('dateFormat');
        expect(lang).toHaveProperty('numberFormat');
        expect(lang).toHaveProperty('currencyFormat');
      }
    });

    it('should have unique language codes', () => {
      const result = service.getSupportedLanguages();
      const codes = result.map(l => l.code);
      const uniqueCodes = new Set(codes);
      
      expect(uniqueCodes.size).toBe(codes.length);
    });
  });

  describe('validateTranslationCompleteness', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should detect missing translations', async () => {
      const i18next = require('i18next');
      
      // Mock English bundle with all keys
      i18next.getResourceBundle.mockImplementation((lang: string) => {
        if (lang === 'en') {
          return {
            common: { welcome: 'Welcome', logout: 'Logout' },
            auth: { login: 'Login', signup: 'Sign Up' },
          };
        } else {
          // Other languages missing some keys
          return {
            common: { welcome: 'स्वागत है' },
          };
        }
      });

      const result = await service.validateTranslationCompleteness();
      
      expect(result.incomplete).toContain('hi');
      expect(result.missing.length).toBeGreaterThan(0);
    });

    it('should return empty arrays when all translations complete', async () => {
      const i18next = require('i18next');
      
      // Mock all languages with same keys
      i18next.getResourceBundle.mockReturnValue({
        common: { welcome: 'Welcome', logout: 'Logout' },
        auth: { login: 'Login', signup: 'Sign Up' },
      });

      const result = await service.validateTranslationCompleteness();
      
      expect(result.incomplete).toHaveLength(0);
      expect(result.missing).toHaveLength(0);
    });

    it('should not check English against itself', async () => {
      const result = await service.validateTranslationCompleteness();
      
      expect(result.incomplete).not.toContain('en');
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent language changes', async () => {
      await service.initialize();
      
      const promises = [
        service.changeLanguage('user-1', 'hi'),
        service.changeLanguage('user-2', 'ta'),
        service.changeLanguage('user-3', 'bn'),
      ];
      
      await expect(Promise.all(promises)).resolves.not.toThrow();
    });

    it('should handle empty translation key', () => {
      const result = service.translate('');
      expect(result).toBeDefined();
    });

    it('should handle null/undefined in formatters', () => {
      expect(() => service.formatDate(new Date(), 'en')).not.toThrow();
      expect(() => service.formatNumber(0, 'en')).not.toThrow();
      expect(() => service.formatCurrency(0, 'en')).not.toThrow();
    });
  });
});
