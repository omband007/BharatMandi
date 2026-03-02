/**
 * Translation Feedback Tests
 * 
 * Tests for translation feedback mechanism
 * Requirements: 16.1, 16.2, 16.3, 16.5
 * 
 * NOTE: These tests are currently skipped because the translation_feedback table
 * does not exist in the database schema. This feature is planned but not yet implemented.
 */

import { DatabaseManager } from '../../../shared/database/db-abstraction';
import type { TranslationFeedback } from '../../../features/notifications/notification.types';

describe.skip('Translation Feedback', () => {
  let db: DatabaseManager;
  let testUserId: string;
  let testFeedbackId: string;

  beforeAll(async () => {
    db = new DatabaseManager();
    await db.start();

    // Create a test user
    const testUser = await db.createUser({
      id: `test-user-${Date.now()}`,
      phoneNumber: `+91${Math.floor(Math.random() * 10000000000)}`,
      name: 'Test User',
      userType: 'farmer' as const,
      location: { 
        latitude: 28.7041, 
        longitude: 77.1025,
        address: 'Test Location, Delhi'
      },
      createdAt: new Date()
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    db.stop();
  });

  describe('createTranslationFeedback', () => {
    it('should create translation feedback with all required fields', async () => {
      const feedback = await db.createTranslationFeedback({
        userId: testUserId,
        originalText: 'Hello, how are you?',
        translatedText: 'नमस्ते, आप कैसे हैं?',
        sourceLanguage: 'en',
        targetLanguage: 'hi',
        feedbackType: 'incorrect',
        status: 'pending'
      });

      expect(feedback).toBeDefined();
      expect(feedback.id).toBeDefined();
      expect(feedback.userId).toBe(testUserId);
      expect(feedback.originalText).toBe('Hello, how are you?');
      expect(feedback.translatedText).toBe('नमस्ते, आप कैसे हैं?');
      expect(feedback.sourceLanguage).toBe('en');
      expect(feedback.targetLanguage).toBe('hi');
      expect(feedback.feedbackType).toBe('incorrect');
      expect(feedback.status).toBe('pending');
      expect(feedback.createdAt).toBeInstanceOf(Date);
      expect(feedback.updatedAt).toBeInstanceOf(Date);

      testFeedbackId = feedback.id;
    });

    it('should create feedback with suggested translation', async () => {
      const feedback = await db.createTranslationFeedback({
        userId: testUserId,
        originalText: 'Good morning',
        translatedText: 'सुप्रभात',
        sourceLanguage: 'en',
        targetLanguage: 'hi',
        suggestedTranslation: 'शुभ प्रभात',
        feedbackType: 'suggestion',
        context: 'Greeting context',
        status: 'pending'
      });

      expect(feedback).toBeDefined();
      expect(feedback.suggestedTranslation).toBe('शुभ प्रभात');
      expect(feedback.context).toBe('Greeting context');
    });

    it('should create feedback with different feedback types', async () => {
      const feedbackTypes: Array<'incorrect' | 'poor_quality' | 'suggestion' | 'offensive'> = [
        'incorrect',
        'poor_quality',
        'suggestion',
        'offensive'
      ];

      for (const type of feedbackTypes) {
        const feedback = await db.createTranslationFeedback({
          userId: testUserId,
          originalText: `Test text for ${type}`,
          translatedText: `Translated text for ${type}`,
          sourceLanguage: 'en',
          targetLanguage: 'hi',
          feedbackType: type,
          status: 'pending'
        });

        expect(feedback.feedbackType).toBe(type);
      }
    });
  });

  describe('getTranslationFeedback', () => {
    it('should retrieve feedback by ID', async () => {
      const feedback = await db.getTranslationFeedback(testFeedbackId);

      expect(feedback).toBeDefined();
      expect(feedback?.id).toBe(testFeedbackId);
      expect(feedback?.userId).toBe(testUserId);
    });

    it('should return undefined for non-existent feedback', async () => {
      const feedback = await db.getTranslationFeedback('non-existent-id');
      expect(feedback).toBeUndefined();
    });
  });

  describe('updateTranslationFeedback', () => {
    it('should update feedback status', async () => {
      const updated = await db.updateTranslationFeedback(testFeedbackId, {
        status: 'reviewed',
        reviewedAt: new Date(),
        reviewedBy: testUserId
      });

      expect(updated).toBeDefined();
      expect(updated?.status).toBe('reviewed');
      expect(updated?.reviewedAt).toBeInstanceOf(Date);
      expect(updated?.reviewedBy).toBe(testUserId);
    });

    it('should update admin notes', async () => {
      const updated = await db.updateTranslationFeedback(testFeedbackId, {
        adminNotes: 'Translation has been corrected'
      });

      expect(updated).toBeDefined();
      expect(updated?.adminNotes).toBe('Translation has been corrected');
    });
  });

  describe('getTranslationFeedbackStats', () => {
    beforeAll(async () => {
      // Create multiple feedback entries for stats testing
      const languages = ['hi', 'mr', 'ta'];
      const types: Array<'incorrect' | 'poor_quality' | 'suggestion' | 'offensive'> = [
        'incorrect',
        'poor_quality',
        'suggestion'
      ];

      for (const lang of languages) {
        for (const type of types) {
          await db.createTranslationFeedback({
            userId: testUserId,
            originalText: `Test for ${lang} ${type}`,
            translatedText: `Translation for ${lang} ${type}`,
            sourceLanguage: 'en',
            targetLanguage: lang,
            feedbackType: type,
            status: 'pending'
          });
        }
      }
    });

    it('should return overall statistics', async () => {
      const stats = await db.getTranslationFeedbackStats();

      expect(stats).toBeDefined();
      expect(stats.totalFeedback).toBeGreaterThan(0);
      expect(stats.byLanguage).toBeDefined();
      expect(stats.byType).toBeDefined();
      expect(stats.byStatus).toBeDefined();
    });

    it('should return statistics for specific language', async () => {
      const stats = await db.getTranslationFeedbackStats('hi');

      expect(stats).toBeDefined();
      expect(stats.totalFeedback).toBeGreaterThan(0);
      expect(stats.byLanguage['hi']).toBeGreaterThan(0);
    });

    it('should include feedback counts by type', async () => {
      const stats = await db.getTranslationFeedbackStats();

      expect(stats.byType).toBeDefined();
      // At least one of the types should have feedback
      const totalByType = Object.values(stats.byType).reduce((sum: number, count) => sum + (count as number), 0);
      expect(totalByType).toBeGreaterThan(0);
    });

    it('should include feedback counts by status', async () => {
      const stats = await db.getTranslationFeedbackStats();

      expect(stats.byStatus).toBeDefined();
      expect(stats.byStatus['pending']).toBeGreaterThan(0);
    });

    it('should calculate average resolution time when feedback is reviewed', async () => {
      // Create and immediately review a feedback
      const feedback = await db.createTranslationFeedback({
        userId: testUserId,
        originalText: 'Test for resolution time',
        translatedText: 'Translation for resolution time',
        sourceLanguage: 'en',
        targetLanguage: 'hi',
        feedbackType: 'incorrect',
        status: 'pending'
      });

      // Wait a bit and then review
      await new Promise(resolve => setTimeout(resolve, 100));
      await db.updateTranslationFeedback(feedback.id, {
        status: 'reviewed',
        reviewedAt: new Date()
      });

      const stats = await db.getTranslationFeedbackStats();
      expect(stats.averageResolutionTime).toBeDefined();
      if (stats.averageResolutionTime !== undefined) {
        expect(stats.averageResolutionTime).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Requirements Validation', () => {
    it('should capture original text, translation, and user language (Req 16.2)', async () => {
      const feedback = await db.createTranslationFeedback({
        userId: testUserId,
        originalText: 'Original text',
        translatedText: 'Translated text',
        sourceLanguage: 'en',
        targetLanguage: 'hi',
        feedbackType: 'incorrect',
        status: 'pending'
      });

      expect(feedback.originalText).toBe('Original text');
      expect(feedback.translatedText).toBe('Translated text');
      expect(feedback.sourceLanguage).toBe('en');
      expect(feedback.targetLanguage).toBe('hi');
    });

    it('should allow users to suggest alternative translations (Req 16.3)', async () => {
      const feedback = await db.createTranslationFeedback({
        userId: testUserId,
        originalText: 'Test',
        translatedText: 'परीक्षण',
        sourceLanguage: 'en',
        targetLanguage: 'hi',
        suggestedTranslation: 'टेस्ट',
        feedbackType: 'suggestion',
        status: 'pending'
      });

      expect(feedback.suggestedTranslation).toBe('टेस्ट');
    });

    it('should track translation quality metrics per language (Req 16.5)', async () => {
      const stats = await db.getTranslationFeedbackStats('hi');

      expect(stats.byLanguage).toBeDefined();
      expect(stats.byType).toBeDefined();
      expect(stats.byStatus).toBeDefined();
      expect(stats.totalFeedback).toBeGreaterThan(0);
    });
  });
});
