import {
  formatDate,
  formatRelativeDate,
  formatNumber,
  formatCurrency,
  formatIndianNumber,
  formatWeight,
  formatPercentage
} from '../formatting.utils';
import { i18nService } from '../i18n.service';

describe('Formatting Utilities - Unit Tests', () => {
  beforeAll(async () => {
    await i18nService.initialize('en');
  });

  describe('formatDate', () => {
    it('should format date in English', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date, 'en');
      expect(result).toMatch(/15\/0?1\/2024|1\/15\/2024/); // Different formats possible (with or without leading zero)
    });

    it('should format date in Hindi', () => {
      const date = new Date('2024-01-15');
      const result = formatDate(date, 'hi');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });

    it('should handle all supported languages', () => {
      const date = new Date('2024-01-15');
      const languages = ['en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'];
      
      languages.forEach(lang => {
        const result = formatDate(date, lang);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
      });
    });
  });

  describe('formatRelativeDate', () => {
    it('should return "Just now" for recent dates', () => {
      const now = new Date();
      const result = formatRelativeDate(now, 'en');
      expect(result).toContain('now');
    });

    it('should format minutes ago', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = formatRelativeDate(fiveMinutesAgo, 'en');
      expect(result).toContain('minute');
    });

    it('should format hours ago', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = formatRelativeDate(twoHoursAgo, 'en');
      expect(result).toContain('hour');
    });

    it('should format days ago', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const result = formatRelativeDate(threeDaysAgo, 'en');
      expect(result).toContain('day');
    });

    it('should format weeks ago', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const result = formatRelativeDate(twoWeeksAgo, 'en');
      expect(result).toContain('week');
    });

    it('should format months ago', () => {
      const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      const result = formatRelativeDate(twoMonthsAgo, 'en');
      expect(result).toContain('month');
    });

    it('should format years ago', () => {
      const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000);
      const result = formatRelativeDate(twoYearsAgo, 'en');
      expect(result).toContain('year');
    });

    it('should work in Hindi', () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = formatRelativeDate(oneDayAgo, 'hi');
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('formatNumber', () => {
    it('should format number in English', () => {
      const result = formatNumber(1234567, 'en');
      expect(result).toContain('1');
      expect(result).toContain('567'); // Indian numbering system uses 12,34,567
    });

    it('should format number in Hindi', () => {
      const result = formatNumber(1234567, 'hi');
      expect(result).toBeTruthy();
    });

    it('should handle zero', () => {
      const result = formatNumber(0, 'en');
      expect(result).toBe('0');
    });

    it('should handle negative numbers', () => {
      const result = formatNumber(-1234, 'en');
      expect(result).toContain('-');
      expect(result).toContain('1');
    });

    it('should handle decimal numbers', () => {
      const result = formatNumber(1234.56, 'en');
      expect(result).toContain('1');
      expect(result).toContain('234');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency in English', () => {
      const result = formatCurrency(1234.56, 'en');
      expect(result).toContain('₹');
      expect(result).toContain('1');
    });

    it('should format currency in Hindi', () => {
      const result = formatCurrency(1234.56, 'hi');
      expect(result).toContain('₹');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0, 'en');
      expect(result).toContain('₹');
      expect(result).toContain('0');
    });

    it('should handle large amounts', () => {
      const result = formatCurrency(1234567.89, 'en');
      expect(result).toContain('₹');
      expect(result).toContain('1');
    });
  });

  describe('formatIndianNumber', () => {
    it('should format crores', () => {
      const result = formatIndianNumber(10000000, 'en');
      expect(result).toContain('Cr');
      expect(result).toContain('1.00');
    });

    it('should format lakhs', () => {
      const result = formatIndianNumber(100000, 'en');
      expect(result).toContain('L');
      expect(result).toContain('1.00');
    });

    it('should format thousands', () => {
      const result = formatIndianNumber(1000, 'en');
      expect(result).toContain('K');
      expect(result).toContain('1.00');
    });

    it('should format small numbers normally', () => {
      const result = formatIndianNumber(500, 'en');
      expect(result).toContain('500');
    });

    it('should work in Hindi', () => {
      const result = formatIndianNumber(100000, 'hi');
      expect(result).toContain('लाख');
    });

    it('should handle edge cases', () => {
      expect(formatIndianNumber(0, 'en')).toBe('0');
      expect(formatIndianNumber(999, 'en')).toContain('999');
      expect(formatIndianNumber(99999, 'en')).toContain('K');
      expect(formatIndianNumber(9999999, 'en')).toContain('L');
      expect(formatIndianNumber(100000000, 'en')).toContain('Cr');
    });
  });

  describe('formatWeight', () => {
    it('should format tonnes', () => {
      const result = formatWeight(1000, 'en');
      expect(result).toContain('1.00');
      expect(result).toContain('tonnes');
    });

    it('should format kilograms', () => {
      const result = formatWeight(50, 'en');
      expect(result).toContain('50.00');
      expect(result).toContain('kg');
    });

    it('should format grams', () => {
      const result = formatWeight(0.5, 'en');
      expect(result).toContain('500');
      expect(result).toContain('g');
    });

    it('should work in Hindi', () => {
      const result = formatWeight(50, 'hi');
      expect(result).toContain('किलो');
    });

    it('should handle edge cases', () => {
      expect(formatWeight(0.001, 'en')).toContain('g');
      expect(formatWeight(1, 'en')).toContain('kg');
      expect(formatWeight(999, 'en')).toContain('kg');
      expect(formatWeight(1000, 'en')).toContain('tonnes');
      expect(formatWeight(5000, 'en')).toContain('tonnes');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentage', () => {
      const result = formatPercentage(75.5, 'en');
      expect(result).toContain('75.5');
      expect(result).toContain('%');
    });

    it('should handle zero', () => {
      const result = formatPercentage(0, 'en');
      expect(result).toContain('0');
      expect(result).toContain('%');
    });

    it('should handle 100%', () => {
      const result = formatPercentage(100, 'en');
      expect(result).toContain('100');
      expect(result).toContain('%');
    });

    it('should work in Hindi', () => {
      const result = formatPercentage(50, 'hi');
      expect(result).toBeTruthy();
      expect(result).toContain('%');
    });

    it('should format decimal percentages', () => {
      const result = formatPercentage(33.333, 'en');
      expect(result).toContain('33.3');
      expect(result).toContain('%');
    });
  });

  describe('Integration with i18nService', () => {
    it('should use i18nService for date formatting', () => {
      const date = new Date('2024-01-15');
      const result1 = formatDate(date, 'en');
      const result2 = i18nService.formatDate(date, 'en');
      expect(result1).toBe(result2);
    });

    it('should use i18nService for number formatting', () => {
      const result1 = formatNumber(1234, 'en');
      const result2 = i18nService.formatNumber(1234, 'en');
      expect(result1).toBe(result2);
    });

    it('should use i18nService for currency formatting', () => {
      const result1 = formatCurrency(1234, 'en');
      const result2 = i18nService.formatCurrency(1234, 'en');
      expect(result1).toBe(result2);
    });
  });

  describe('All Supported Languages', () => {
    const languages = ['en', 'hi', 'pa', 'mr', 'ta', 'te', 'bn', 'gu', 'kn', 'ml', 'or'];

    it('should format dates in all languages', () => {
      const date = new Date('2024-01-15');
      languages.forEach(lang => {
        const result = formatDate(date, lang);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
      });
    });

    it('should format numbers in all languages', () => {
      languages.forEach(lang => {
        const result = formatNumber(1234567, lang);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
      });
    });

    it('should format currency in all languages', () => {
      languages.forEach(lang => {
        const result = formatCurrency(1234.56, lang);
        expect(result).toContain('₹');
        expect(typeof result).toBe('string');
      });
    });

    it('should format Indian numbers in all languages', () => {
      languages.forEach(lang => {
        const result = formatIndianNumber(100000, lang);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
      });
    });

    it('should format weights in all languages', () => {
      languages.forEach(lang => {
        const result = formatWeight(50, lang);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
      });
    });

    it('should format percentages in all languages', () => {
      languages.forEach(lang => {
        const result = formatPercentage(75, lang);
        expect(result).toContain('%');
        expect(typeof result).toBe('string');
      });
    });
  });
});
