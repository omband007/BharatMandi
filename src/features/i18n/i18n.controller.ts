import { Request, Response } from 'express';
import { i18nService, SUPPORTED_LANGUAGES } from './i18n.service';
import { translationService } from './translation.service';
import fs from 'fs/promises';
import path from 'path';

export class I18nController {
  /**
   * Get translation bundle for a specific language
   * GET /api/i18n/translations/:lang
   */
  async getTranslations(req: Request, res: Response): Promise<void> {
    try {
      const { lang } = req.params;

      // Validate language code
      if (!SUPPORTED_LANGUAGES.find(l => l.code === lang)) {
        res.status(400).json({
          success: false,
          message: `Unsupported language: ${lang}`
        });
        return;
      }

      // Read translation file
      const translationPath = path.join(__dirname, 'locales', lang, 'translation.json');
      const translationData = await fs.readFile(translationPath, 'utf-8');
      const translations = JSON.parse(translationData);

      res.json(translations);
    } catch (error) {
      console.error('Error loading translations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to load translations'
      });
    }
  }

  /**
   * Get list of supported languages
   * GET /api/i18n/languages
   */
  async getSupportedLanguages(req: Request, res: Response): Promise<void> {
    try {
      const languages = i18nService.getSupportedLanguages();
      res.json({
        success: true,
        languages
      });
    } catch (error) {
      console.error('Error getting supported languages:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get supported languages'
      });
    }
  }

  /**
   * Validate translation completeness
   * GET /api/i18n/validate
   */
  async validateTranslations(req: Request, res: Response): Promise<void> {
    try {
      await i18nService.initialize();
      const validation = await i18nService.validateTranslationCompleteness();
      
      res.json({
        success: true,
        validation: {
          incomplete: validation.incomplete,
          missingKeys: validation.missing,
          totalMissing: validation.missing.length
        }
      });
    } catch (error) {
      console.error('Error validating translations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate translations'
      });
    }
  }

  /**
   * Change user language preference
   * POST /api/i18n/change-language
   */
  async changeLanguage(req: Request, res: Response): Promise<void> {
    try {
      const { userId, languageCode } = req.body;

      if (!userId || !languageCode) {
        res.status(400).json({
          success: false,
          message: 'userId and languageCode are required'
        });
        return;
      }

      await i18nService.changeLanguage(userId, languageCode);

      res.json({
        success: true,
        message: 'Language preference updated successfully',
        language: languageCode
      });
    } catch (error: any) {
      console.error('Error changing language:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to change language'
      });
    }
  }

  /**
   * Get user language preference
   * GET /api/i18n/user-language/:userId
   */
  async getUserLanguage(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const languageCode = await i18nService.getUserLanguagePreference(userId);

      res.json({
        success: true,
        language: languageCode
      });
    } catch (error) {
      console.error('Error getting user language:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user language preference'
      });
    }
  }

  /**
   * Translate text using AWS Translate
   * POST /api/i18n/translate
   * Body: { text, sourceLanguage?, targetLanguage }
   */
  async translateText(req: Request, res: Response): Promise<void> {
    try {
      const { text, sourceLanguage, targetLanguage } = req.body;

      if (!text || !targetLanguage) {
        res.status(400).json({
          success: false,
          message: 'text and targetLanguage are required'
        });
        return;
      }

      const result = await translationService.translateText({
        text,
        sourceLanguage,
        targetLanguage
      });

      res.json({
        success: true,
        translation: result
      });
    } catch (error: any) {
      console.error('Error translating text:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Translation failed'
      });
    }
  }

  /**
   * Translate multiple texts in batch
   * POST /api/i18n/translate-batch
   * Body: { texts: string[], sourceLanguage, targetLanguage }
   */
  async translateBatch(req: Request, res: Response): Promise<void> {
    try {
      const { texts, sourceLanguage, targetLanguage } = req.body;

      if (!texts || !Array.isArray(texts) || !sourceLanguage || !targetLanguage) {
        res.status(400).json({
          success: false,
          message: 'texts (array), sourceLanguage, and targetLanguage are required'
        });
        return;
      }

      const translations = await translationService.translateBatch(
        texts,
        sourceLanguage,
        targetLanguage
      );

      res.json({
        success: true,
        translations
      });
    } catch (error: any) {
      console.error('Error translating batch:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Batch translation failed'
      });
    }
  }

  /**
   * Detect language of text
   * POST /api/i18n/detect-language
   * Body: { text }
   */
  async detectLanguage(req: Request, res: Response): Promise<void> {
    try {
      const { text } = req.body;

      if (!text) {
        res.status(400).json({
          success: false,
          message: 'text is required'
        });
        return;
      }

      const language = await translationService.detectLanguage(text);

      res.json({
        success: true,
        language
      });
    } catch (error: any) {
      console.error('Error detecting language:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Language detection failed'
      });
    }
  }

  /**
   * Get cache statistics
   * GET /api/i18n/cache-stats
   */
  async getCacheStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await translationService.getCacheStats();

      res.json({
        success: true,
        stats
      });
    } catch (error: any) {
      console.error('Error getting cache stats:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get cache stats'
      });
    }
  }
}

export const i18nController = new I18nController();
