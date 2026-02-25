import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
import path from 'path';
import { SUPPORTED_LANGUAGES } from './i18n.service';

// Initialize i18next for backend
i18next
  .use(Backend)
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map(l => l.code),
    preload: SUPPORTED_LANGUAGES.map(l => l.code),
    
    backend: {
      loadPath: path.join(__dirname, 'locales/{{lng}}/translation.json'),
    },
    
    detection: {
      order: ['header', 'querystring', 'cookie'],
      caches: false, // Don't cache on server
      lookupHeader: 'accept-language',
      lookupQuerystring: 'lang',
      lookupCookie: 'i18next',
    },
    
    interpolation: {
      escapeValue: false,
    },
    
    saveMissing: false,
    
    // Log missing keys in development
    missingKeyHandler: (lng, ns, key) => {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[i18n Backend] Missing translation key: ${key} for language: ${lng}`);
      }
    },
  });

export const i18nextMiddleware = middleware.handle(i18next);
export { i18next as i18nextBackend };
