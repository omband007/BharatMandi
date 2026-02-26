import { Router } from 'express';
import { i18nController } from './i18n.controller';

const router = Router();

// Get translation bundle for a specific language
router.get('/translations/:lang', (req, res) => i18nController.getTranslations(req, res));

// Get list of supported languages
router.get('/languages', (req, res) => i18nController.getSupportedLanguages(req, res));

// Validate translation completeness
router.get('/validate', (req, res) => i18nController.validateTranslations(req, res));

// Change user language preference
router.post('/change-language', (req, res) => i18nController.changeLanguage(req, res));

// Get user language preference
router.get('/user-language/:userId', (req, res) => i18nController.getUserLanguage(req, res));

// Translate text using AWS Translate
router.post('/translate', (req, res) => i18nController.translateText(req, res));

// Translate multiple texts in batch
router.post('/translate-batch', (req, res) => i18nController.translateBatch(req, res));

// Detect language of text
router.post('/detect-language', (req, res) => i18nController.detectLanguage(req, res));

// Get cache statistics
router.get('/cache-stats', (req, res) => i18nController.getCacheStats(req, res));

export default router;
