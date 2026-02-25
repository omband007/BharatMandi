import i18next from 'i18next';
import { getDatabaseManager } from '../../shared/database/db-abstraction';

export interface LanguageConfig {
  code: string; // ISO 639-1 code (e.g., 'hi', 'en', 'pa')
  name: string; // Native name (e.g., 'हिन्दी', 'English', 'ਪੰਜਾਬੀ')
  direction: 'ltr' | 'rtl';
  dateFormat: string;
  numberFormat: string;
  currencyFormat: string;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'en', name: 'English', direction: 'ltr', dateFormat: 'DD/MM/YYYY', numberFormat: 'en-IN', currencyFormat: '₹#,##,###.##' },
  { code: 'hi', name: 'हिन्दी', direction: 'ltr', dateFormat: 'DD/MM/YYYY', numberFormat: 'hi-IN', currencyFormat: '₹#,##,###.##' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', direction: 'ltr', dateFormat: 'DD/MM/YYYY', numberFormat: 'pa-IN', currencyFormat: '₹#,##,###.##' },
  { code: 'mr', name: 'मराठी', direction: 'ltr', dateFormat: 'DD/MM/YYYY', numberFormat: 'mr-IN', currencyFormat: '₹#,##,###.##' },
  { code: 'ta', name: 'தமிழ்', direction: 'ltr', dateFormat: 'DD/MM/YYYY', numberFormat: 'ta-IN', currencyFormat: '₹#,##,###.##' },
  { code: 'te', name: 'తెలుగు', direction: 'ltr', dateFormat: 'DD/MM/YYYY', numberFormat: 'te-IN', currencyFormat: '₹#,##,###.##' },
  { code: 'bn', name: 'বাংলা', direction: 'ltr', dateFormat: 'DD/MM/YYYY', numberFormat: 'bn-IN', currencyFormat: '₹#,##,###.##' },
  { code: 'gu', name: 'ગુજરાતી', direction: 'ltr', dateFormat: 'DD/MM/YYYY', numberFormat: 'gu-IN', currencyFormat: '₹#,##,###.##' },
  { code: 'kn', name: 'ಕನ್ನಡ', direction: 'ltr', dateFormat: 'DD/MM/YYYY', numberFormat: 'kn-IN', currencyFormat: '₹#,##,###.##' },
  { code: 'ml', name: 'മലയാളം', direction: 'ltr', dateFormat: 'DD/MM/YYYY', numberFormat: 'ml-IN', currencyFormat: '₹#,##,###.##' },
  { code: 'or', name: 'ଓଡ଼ିଆ', direction: 'ltr', dateFormat: 'DD/MM/YYYY', numberFormat: 'or-IN', currencyFormat: '₹#,##,###.##' },
];

export class I18nService {
  private initialized = false;

  async initialize(defaultLanguage: string = 'en'): Promise<void> {
    if (this.initialized) return;

    await i18next.init({
      lng: defaultLanguage,
      fallbackLng: 'en',
      supportedLngs: SUPPORTED_LANGUAGES.map(l => l.code),
      resources: await this.loadAllBundles(),
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ['querystring', 'cookie', 'localStorage', 'navigator'],
        caches: ['localStorage', 'cookie'],
      },
    });

    this.initialized = true;
  }

  private async loadAllBundles(): Promise<Record<string, any>> {
    const resources: Record<string, any> = {};
    
    for (const lang of SUPPORTED_LANGUAGES) {
      try {
        // Load from local bundle files
        const bundle = await import(`./locales/${lang.code}/translation.json`);
        resources[lang.code] = { translation: bundle };
      } catch (error) {
        console.error(`Failed to load bundle for ${lang.code}:`, error);
      }
    }
    
    return resources;
  }

  async changeLanguage(userId: string, languageCode: string): Promise<void> {
    if (!SUPPORTED_LANGUAGES.find(l => l.code === languageCode)) {
      throw new Error(`Unsupported language: ${languageCode}`);
    }

    await i18next.changeLanguage(languageCode);
    
    // Persist preference to database
    const db = getDatabaseManager();
    await db.updateUser(userId, { language_preference: languageCode });
  }

  translate(key: string, options?: any): string {
    const translation = i18next.t(key, options);
    
    // Log missing translations in development
    if (translation === key && process.env.NODE_ENV === 'development') {
      console.warn(`[I18n] Missing translation key: ${key}`);
    }
    
    return translation;
  }

  formatDate(date: Date, languageCode: string): string {
    const config = SUPPORTED_LANGUAGES.find(l => l.code === languageCode);
    if (!config) return date.toLocaleDateString();
    
    return new Intl.DateTimeFormat(config.numberFormat).format(date);
  }

  formatNumber(value: number, languageCode: string): string {
    const config = SUPPORTED_LANGUAGES.find(l => l.code === languageCode);
    if (!config) return value.toString();
    
    return new Intl.NumberFormat(config.numberFormat).format(value);
  }

  formatCurrency(value: number, languageCode: string): string {
    const config = SUPPORTED_LANGUAGES.find(l => l.code === languageCode);
    if (!config) return `₹${value}`;
    
    return new Intl.NumberFormat(config.numberFormat, {
      style: 'currency',
      currency: 'INR',
    }).format(value);
  }

  getCurrentLanguage(): string {
    return i18next.language;
  }

  getSupportedLanguages(): LanguageConfig[] {
    return SUPPORTED_LANGUAGES;
  }

  async validateTranslationCompleteness(): Promise<{ missing: string[], incomplete: string[] }> {
    const englishKeys = this.getAllKeys('en');
    const missing: string[] = [];
    const incomplete: string[] = [];

    for (const lang of SUPPORTED_LANGUAGES) {
      if (lang.code === 'en') continue;
      
      const langKeys = this.getAllKeys(lang.code);
      const missingKeys = englishKeys.filter(key => !langKeys.includes(key));
      
      if (missingKeys.length > 0) {
        incomplete.push(lang.code);
        missing.push(...missingKeys.map(key => `${lang.code}:${key}`));
      }
    }

    return { missing, incomplete };
  }

  private getAllKeys(languageCode: string): string[] {
    const bundle = i18next.getResourceBundle(languageCode, 'translation');
    return this.flattenKeys(bundle);
  }

  private flattenKeys(obj: any, prefix: string = ''): string[] {
    let keys: string[] = [];
    
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        keys = keys.concat(this.flattenKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
    
    return keys;
  }
}

export const i18nService = new I18nService();
