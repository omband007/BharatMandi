import { i18nService } from './i18n.service';

/**
 * Format a date according to the user's locale
 * @param date - Date to format
 * @param languageCode - Language code (e.g., 'hi', 'en')
 * @returns Formatted date string
 */
export function formatDate(date: Date, languageCode: string): string {
  return i18nService.formatDate(date, languageCode);
}

/**
 * Format a date as relative time (e.g., "2 days ago")
 * @param date - Date to format
 * @param languageCode - Language code
 * @returns Relative time string
 */
export function formatRelativeDate(date: Date, languageCode: string): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  // Translation keys for relative time
  if (diffSec < 60) {
    return i18nService.translate('time.justNow', { lng: languageCode });
  } else if (diffMin < 60) {
    return i18nService.translate('time.minutesAgo', { 
      count: diffMin, 
      lng: languageCode 
    });
  } else if (diffHour < 24) {
    return i18nService.translate('time.hoursAgo', { 
      count: diffHour, 
      lng: languageCode 
    });
  } else if (diffDay < 7) {
    return i18nService.translate('time.daysAgo', { 
      count: diffDay, 
      lng: languageCode 
    });
  } else if (diffWeek < 4) {
    return i18nService.translate('time.weeksAgo', { 
      count: diffWeek, 
      lng: languageCode 
    });
  } else if (diffMonth < 12) {
    return i18nService.translate('time.monthsAgo', { 
      count: diffMonth, 
      lng: languageCode 
    });
  } else {
    return i18nService.translate('time.yearsAgo', { 
      count: diffYear, 
      lng: languageCode 
    });
  }
}

/**
 * Format a number according to the user's locale
 * @param value - Number to format
 * @param languageCode - Language code
 * @returns Formatted number string
 */
export function formatNumber(value: number, languageCode: string): string {
  return i18nService.formatNumber(value, languageCode);
}

/**
 * Format a currency value (INR) according to the user's locale
 * @param value - Amount to format
 * @param languageCode - Language code
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, languageCode: string): string {
  return i18nService.formatCurrency(value, languageCode);
}

/**
 * Format a number in Indian numbering system (lakhs, crores)
 * @param value - Number to format
 * @param languageCode - Language code
 * @returns Formatted number with lakhs/crores
 */
export function formatIndianNumber(value: number, languageCode: string): string {
  if (value >= 10000000) {
    // Crores
    const crores = value / 10000000;
    return i18nService.translate('number.crores', { 
      value: crores.toFixed(2), 
      lng: languageCode 
    });
  } else if (value >= 100000) {
    // Lakhs
    const lakhs = value / 100000;
    return i18nService.translate('number.lakhs', { 
      value: lakhs.toFixed(2), 
      lng: languageCode 
    });
  } else if (value >= 1000) {
    // Thousands
    const thousands = value / 1000;
    return i18nService.translate('number.thousands', { 
      value: thousands.toFixed(2), 
      lng: languageCode 
    });
  } else {
    return formatNumber(value, languageCode);
  }
}

/**
 * Format a weight value with appropriate unit
 * @param value - Weight in kg
 * @param languageCode - Language code
 * @returns Formatted weight string
 */
export function formatWeight(value: number, languageCode: string): string {
  if (value >= 1000) {
    // Tonnes
    const tonnes = value / 1000;
    return i18nService.translate('units.tonnes', { 
      value: tonnes.toFixed(2), 
      lng: languageCode 
    });
  } else if (value >= 1) {
    // Kilograms
    return i18nService.translate('units.kg', { 
      value: value.toFixed(2), 
      lng: languageCode 
    });
  } else {
    // Grams
    const grams = value * 1000;
    return i18nService.translate('units.grams', { 
      value: grams.toFixed(0), 
      lng: languageCode 
    });
  }
}

/**
 * Format a percentage value
 * @param value - Percentage value (0-100)
 * @param languageCode - Language code
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, languageCode: string): string {
  return i18nService.translate('number.percentage', { 
    value: value.toFixed(1), 
    lng: languageCode 
  });
}
