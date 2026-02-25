import { Request, Response } from 'express';
import { i18nService, SUPPORTED_LANGUAGES } from './i18n.service';
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
}

export const i18nController = new I18nController();
