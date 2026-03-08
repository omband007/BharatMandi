/**
 * Diagnosis Service Tests
 * 
 * Tests the end-to-end diagnosis flow orchestration.
 */

import { DiagnosisService } from '../diagnosis.service';
import { imageValidator } from '../image-validator.service';
import { s3Service } from '../s3.service';
import { diagnosisCacheService } from '../diagnosis-cache.service';
import { novaVisionService } from '../nova-vision.service';
import { remedyGenerator } from '../remedy-generator.service';
import { expertEscalationService } from '../expert-escalation.service';
import { historyManager } from '../history-manager.service';
import type { DiagnosisRequest } from '../diagnosis.service';

// Mock all dependencies
jest.mock('../image-validator.service');
jest.mock('../s3.service');
jest.mock('../diagnosis-cache.service');
jest.mock('../nova-vision.service');
jest.mock('../remedy-generator.service');
jest.mock('../expert-escalation.service');
jest.mock('../history-manager.service');

describe('DiagnosisService', () => {
  let diagnosisService: DiagnosisService;
  let mockImageBuffer: Buffer;
  let mockRequest: DiagnosisRequest;

  beforeEach(() => {
    diagnosisService = new DiagnosisService();
    mockImageBuffer = Buffer.from('fake-image-data');
    mockRequest = {
      imageBuffer: mockImageBuffer,
      originalFilename: 'test-crop.jpg',
      userId: 'user-123',
      cropHint: 'tomato',
      language: 'en'
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('diagnose()', () => {
    describe('successful diagnosis flow', () => {
      beforeEach(() => {
        // Mock successful validation
        (imageValidator.validateImage as jest.Mock).mockResolvedValue({
          valid: true,
          errors: [],
          warnings: [],
          metadata: {
            format: 'jpeg',
            width: 1920,
            height: 1080,
            sizeBytes: 500000,
            hasExif: false
          }
        });

        // Mock cache miss
        (diagnosisCacheService.getCachedDiagnosis as jest.Mock).mockResolvedValue(null);

        // Mock S3 operations
        (s3Service.compressImage as jest.Mock).mockResolvedValue(mockImageBuffer);
        (s3Service.uploadImage as jest.Mock).mockResolvedValue('diagnoses/user-123/test-id/123456.jpg');
        (s3Service.generatePresignedUrl as jest.Mock).mockResolvedValue('https://s3.amazonaws.com/presigned-url');

        // Mock Nova Pro analysis
        (novaVisionService.analyzeImage as jest.Mock).mockResolvedValue({
          cropType: 'tomato',
          diseases: [{
            name: 'Late Blight',
            scientificName: 'Phytophthora infestans',
            type: 'fungal',
            severity: 'high',
            confidence: 85,
            affectedParts: ['leaves', 'stems']
          }],
          symptoms: ['Brown spots on leaves', 'Wilting'],
          confidence: 85,
          imageQualityScore: 0.9,
          processingTimeMs: 1500
        });

        // Mock remedy generation
        (remedyGenerator.generateRemedies as jest.Mock).mockResolvedValue({
          chemical: [{
            name: 'Mancozeb',
            genericName: 'Mancozeb',
            brandNames: ['Dithane M-45'],
            dosage: '2.5g per liter',
            applicationMethod: 'foliar spray',
            frequency: 'Every 7 days',
            preHarvestInterval: 7,
            safetyPrecautions: ['Wear gloves'],
            estimatedCost: '₹200-300 per acre'
          }],
          organic: [{
            name: 'Neem oil spray',
            ingredients: ['Neem oil', 'Water'],
            preparation: ['Mix well'],
            applicationMethod: 'foliar spray',
            frequency: 'Every 5 days',
            effectiveness: 'Moderate'
          }],
          preventive: [{
            category: 'spacing',
            description: 'Maintain proper spacing'
          }]
        });

        // Mock cache set
        (diagnosisCacheService.cacheDiagnosis as jest.Mock).mockResolvedValue(undefined);

        // Mock history save
        (historyManager.saveDiagnosis as jest.Mock).mockResolvedValue('diagnosis-123');
      });

      it('should complete full diagnosis flow with high confidence', async () => {
        const result = await diagnosisService.diagnose(mockRequest);

        expect(result).toMatchObject({
          diagnosisId: 'diagnosis-123',
          cropType: 'tomato',
          confidence: 85,
          expertReviewRequired: false,
          metadata: {
            cacheHit: false
          }
        });

        expect(result.diseases).toHaveLength(1);
        expect(result.diseases[0].name).toBe('Late Blight');
        expect(result.remedies.chemical).toHaveLength(1);
        expect(result.remedies.organic).toHaveLength(1);
        expect(result.remedies.preventive).toHaveLength(1);
      });

      it('should call all services in correct order', async () => {
        await diagnosisService.diagnose(mockRequest);

        // Verify call order
        const callOrder = [
          imageValidator.validateImage,
          diagnosisCacheService.getCachedDiagnosis,
          s3Service.compressImage,
          s3Service.uploadImage,
          s3Service.generatePresignedUrl,
          novaVisionService.analyzeImage,
          remedyGenerator.generateRemedies,
          diagnosisCacheService.cacheDiagnosis,
          historyManager.saveDiagnosis
        ];

        callOrder.forEach(mock => {
          expect(mock).toHaveBeenCalled();
        });
      });

      it('should include timing metrics for all stages', async () => {
        const result = await diagnosisService.diagnose(mockRequest);

        expect(result.metadata.stages).toMatchObject({
          validation: expect.any(Number),
          upload: expect.any(Number),
          cacheCheck: expect.any(Number),
          analysis: expect.any(Number),
          remedyGeneration: expect.any(Number),
          expertEscalation: expect.any(Number),
          historyStorage: expect.any(Number)
        });

        expect(result.metadata.processingTimeMs).toBeGreaterThan(0);
      });

      it('should pass correct parameters to Nova Pro', async () => {
        await diagnosisService.diagnose(mockRequest);

        expect(novaVisionService.analyzeImage).toHaveBeenCalledWith({
          imageBuffer: mockImageBuffer,
          imageFormat: 'jpeg',
          cropHint: 'tomato',
          language: 'en'
        });
      });

      it('should pass correct parameters to remedy generator', async () => {
        await diagnosisService.diagnose(mockRequest);

        expect(remedyGenerator.generateRemedies).toHaveBeenCalledWith({
          disease: expect.objectContaining({
            name: 'Late Blight',
            type: 'fungal'
          }),
          cropType: 'tomato',
          location: undefined,
          language: 'en',
          growthStage: undefined,
          currentDate: expect.any(Date)
        });
      });

      it('should save complete diagnosis to history', async () => {
        await diagnosisService.diagnose(mockRequest);

        expect(historyManager.saveDiagnosis).toHaveBeenCalledWith({
          userId: 'user-123',
          imageUrl: 'diagnoses/user-123/test-id/123456.jpg',
          imageMetadata: expect.objectContaining({
            format: 'jpeg',
            sizeBytes: 500000
          }),
          diagnosis: expect.objectContaining({
            cropType: 'tomato',
            confidence: 85
          }),
          remedies: expect.any(Object),
          location: undefined,
          language: 'en',
          expertReviewRequired: false
        });
      });
    });

    describe('cache hit scenario', () => {
      beforeEach(() => {
        // Mock successful validation
        (imageValidator.validateImage as jest.Mock).mockResolvedValue({
          valid: true,
          errors: [],
          warnings: [],
          metadata: {
            format: 'jpeg',
            width: 1920,
            height: 1080,
            sizeBytes: 500000,
            hasExif: false
          }
        });

        // Mock cache hit
        (diagnosisCacheService.getCachedDiagnosis as jest.Mock).mockResolvedValue({
          diagnosis: {
            cropType: 'tomato',
            diseases: [{
              name: 'Late Blight',
              scientificName: 'Phytophthora infestans',
              type: 'fungal',
              severity: 'high',
              confidence: 85,
              affectedParts: ['leaves']
            }],
            symptoms: ['Brown spots'],
            confidence: 85,
            imageQualityScore: 0.9,
            processingTimeMs: 0
          },
          remedies: {
            chemical: [],
            organic: [],
            preventive: []
          }
        });

        // Mock S3 operations
        (s3Service.compressImage as jest.Mock).mockResolvedValue(mockImageBuffer);
        (s3Service.uploadImage as jest.Mock).mockResolvedValue('diagnoses/user-123/test-id/123456.jpg');
        (s3Service.generatePresignedUrl as jest.Mock).mockResolvedValue('https://s3.amazonaws.com/presigned-url');

        // Mock history save
        (historyManager.saveDiagnosis as jest.Mock).mockResolvedValue('diagnosis-123');
      });

      it('should skip Nova Pro analysis when cache hit', async () => {
        const result = await diagnosisService.diagnose(mockRequest);

        expect(result.metadata.cacheHit).toBe(true);
        expect(novaVisionService.analyzeImage).not.toHaveBeenCalled();
        expect(remedyGenerator.generateRemedies).not.toHaveBeenCalled();
      });

      it('should have zero analysis time on cache hit', async () => {
        const result = await diagnosisService.diagnose(mockRequest);

        expect(result.metadata.stages.analysis).toBe(0);
        expect(result.metadata.stages.remedyGeneration).toBe(0);
      });

      it('should still upload to S3 and save to history', async () => {
        await diagnosisService.diagnose(mockRequest);

        expect(s3Service.uploadImage).toHaveBeenCalled();
        expect(historyManager.saveDiagnosis).toHaveBeenCalled();
      });
    });

    describe('low confidence expert escalation', () => {
      beforeEach(() => {
        // Mock successful validation
        (imageValidator.validateImage as jest.Mock).mockResolvedValue({
          valid: true,
          errors: [],
          warnings: [],
          metadata: {
            format: 'jpeg',
            width: 1920,
            height: 1080,
            sizeBytes: 500000,
            hasExif: false
          }
        });

        // Mock cache miss
        (diagnosisCacheService.getCachedDiagnosis as jest.Mock).mockResolvedValue(null);

        // Mock S3 operations
        (s3Service.compressImage as jest.Mock).mockResolvedValue(mockImageBuffer);
        (s3Service.uploadImage as jest.Mock).mockResolvedValue('diagnoses/user-123/test-id/123456.jpg');
        (s3Service.generatePresignedUrl as jest.Mock).mockResolvedValue('https://s3.amazonaws.com/presigned-url');

        // Mock Nova Pro analysis with LOW confidence
        (novaVisionService.analyzeImage as jest.Mock).mockResolvedValue({
          cropType: 'tomato',
          diseases: [{
            name: 'Unknown Disease',
            scientificName: '',
            type: 'fungal',
            severity: 'medium',
            confidence: 65,
            affectedParts: ['leaves']
          }],
          symptoms: ['Unclear symptoms'],
          confidence: 65, // Below 80% threshold
          imageQualityScore: 0.7,
          processingTimeMs: 1500
        });

        // Mock remedy generation
        (remedyGenerator.generateRemedies as jest.Mock).mockResolvedValue({
          chemical: [],
          organic: [],
          preventive: []
        });

        // Mock cache set
        (diagnosisCacheService.cacheDiagnosis as jest.Mock).mockResolvedValue(undefined);

        // Mock expert escalation
        (expertEscalationService.createReviewRequest as jest.Mock).mockResolvedValue('review-456');

        // Mock history save
        (historyManager.saveDiagnosis as jest.Mock).mockResolvedValue('diagnosis-123');
      });

      it('should create expert review request when confidence <80%', async () => {
        const result = await diagnosisService.diagnose(mockRequest);

        expect(result.expertReviewRequired).toBe(true);
        expect(result.expertReviewId).toBe('review-456');
        expect(expertEscalationService.createReviewRequest).toHaveBeenCalled();
      });

      it('should pass correct data to expert escalation service', async () => {
        await diagnosisService.diagnose(mockRequest);

        expect(expertEscalationService.createReviewRequest).toHaveBeenCalledWith({
          diagnosisId: expect.any(String),
          userId: 'user-123',
          imageUrl: 'diagnoses/user-123/test-id/123456.jpg',
          aiDiagnosis: {
            cropType: 'tomato',
            diseases: expect.any(Array),
            confidence: 65
          },
          aiRemedies: expect.any(Object)
        });
      });

      it('should save expertReviewRequired flag to history', async () => {
        await diagnosisService.diagnose(mockRequest);

        expect(historyManager.saveDiagnosis).toHaveBeenCalledWith(
          expect.objectContaining({
            expertReviewRequired: true
          })
        );
      });

      it('should continue even if expert escalation fails', async () => {
        (expertEscalationService.createReviewRequest as jest.Mock).mockRejectedValue(
          new Error('Expert service unavailable')
        );

        const result = await diagnosisService.diagnose(mockRequest);

        // Should still complete successfully
        expect(result.diagnosisId).toBe('diagnosis-123');
        expect(result.expertReviewRequired).toBe(true);
        expect(result.expertReviewId).toBeUndefined();
      });
    });

    describe('error handling', () => {
      it('should throw error when image validation fails', async () => {
        (imageValidator.validateImage as jest.Mock).mockResolvedValue({
          valid: false,
          errors: ['Image too small', 'Invalid format'],
          warnings: []
        });

        await expect(diagnosisService.diagnose(mockRequest)).rejects.toMatchObject({
          code: 'INVALID_IMAGE',
          message: expect.stringContaining('Image validation failed'),
          stage: 'validation'
        });
      });

      it('should throw error when S3 upload fails', async () => {
        (imageValidator.validateImage as jest.Mock).mockResolvedValue({
          valid: true,
          errors: [],
          warnings: [],
          metadata: { format: 'jpeg', width: 1920, height: 1080, sizeBytes: 500000, hasExif: false }
        });

        (diagnosisCacheService.getCachedDiagnosis as jest.Mock).mockResolvedValue(null);
        (s3Service.compressImage as jest.Mock).mockResolvedValue(mockImageBuffer);
        (s3Service.uploadImage as jest.Mock).mockRejectedValue(new Error('S3 upload failed'));

        await expect(diagnosisService.diagnose(mockRequest)).rejects.toMatchObject({
          code: 'DIAGNOSIS_FAILED',
          message: expect.stringContaining('S3 upload failed')
        });
      });

      it('should throw error when Nova Pro analysis fails', async () => {
        (imageValidator.validateImage as jest.Mock).mockResolvedValue({
          valid: true,
          errors: [],
          warnings: [],
          metadata: { format: 'jpeg', width: 1920, height: 1080, sizeBytes: 500000, hasExif: false }
        });

        (diagnosisCacheService.getCachedDiagnosis as jest.Mock).mockResolvedValue(null);
        (s3Service.compressImage as jest.Mock).mockResolvedValue(mockImageBuffer);
        (s3Service.uploadImage as jest.Mock).mockResolvedValue('s3-key');
        (s3Service.generatePresignedUrl as jest.Mock).mockResolvedValue('url');
        (novaVisionService.analyzeImage as jest.Mock).mockRejectedValue(new Error('Bedrock timeout'));

        await expect(diagnosisService.diagnose(mockRequest)).rejects.toMatchObject({
          code: 'DIAGNOSIS_FAILED',
          message: expect.stringContaining('Bedrock timeout')
        });
      });

      it('should throw error when history save fails', async () => {
        (imageValidator.validateImage as jest.Mock).mockResolvedValue({
          valid: true,
          errors: [],
          warnings: [],
          metadata: { format: 'jpeg', width: 1920, height: 1080, sizeBytes: 500000, hasExif: false }
        });

        (diagnosisCacheService.getCachedDiagnosis as jest.Mock).mockResolvedValue(null);
        (s3Service.compressImage as jest.Mock).mockResolvedValue(mockImageBuffer);
        (s3Service.uploadImage as jest.Mock).mockResolvedValue('s3-key');
        (s3Service.generatePresignedUrl as jest.Mock).mockResolvedValue('url');
        (novaVisionService.analyzeImage as jest.Mock).mockResolvedValue({
          cropType: 'tomato',
          diseases: [],
          symptoms: [],
          confidence: 85,
          imageQualityScore: 0.9,
          processingTimeMs: 1000
        });
        (remedyGenerator.generateRemedies as jest.Mock).mockResolvedValue({
          chemical: [],
          organic: [],
          preventive: []
        });
        (diagnosisCacheService.cacheDiagnosis as jest.Mock).mockResolvedValue(undefined);
        (historyManager.saveDiagnosis as jest.Mock).mockRejectedValue(new Error('Database error'));

        await expect(diagnosisService.diagnose(mockRequest)).rejects.toMatchObject({
          code: 'DIAGNOSIS_FAILED',
          message: expect.stringContaining('Database error')
        });
      });
    });

    describe('edge cases', () => {
      beforeEach(() => {
        (imageValidator.validateImage as jest.Mock).mockResolvedValue({
          valid: true,
          errors: [],
          warnings: [],
          metadata: { format: 'jpeg', width: 1920, height: 1080, sizeBytes: 500000, hasExif: false }
        });

        (diagnosisCacheService.getCachedDiagnosis as jest.Mock).mockResolvedValue(null);
        (s3Service.compressImage as jest.Mock).mockResolvedValue(mockImageBuffer);
        (s3Service.uploadImage as jest.Mock).mockResolvedValue('s3-key');
        (s3Service.generatePresignedUrl as jest.Mock).mockResolvedValue('url');
        (diagnosisCacheService.cacheDiagnosis as jest.Mock).mockResolvedValue(undefined);
        (historyManager.saveDiagnosis as jest.Mock).mockResolvedValue('diagnosis-123');
      });

      it('should handle no diseases detected', async () => {
        (novaVisionService.analyzeImage as jest.Mock).mockResolvedValue({
          cropType: 'tomato',
          diseases: [], // No diseases
          symptoms: [],
          confidence: 90,
          imageQualityScore: 0.95,
          processingTimeMs: 1000
        });

        (remedyGenerator.generateRemedies as jest.Mock).mockResolvedValue({
          chemical: [],
          organic: [],
          preventive: []
        });

        const result = await diagnosisService.diagnose(mockRequest);

        expect(result.diseases).toHaveLength(0);
        expect(result.remedies.chemical).toHaveLength(0);
        expect(result.expertReviewRequired).toBe(false);
      });

      it('should handle multiple diseases', async () => {
        (novaVisionService.analyzeImage as jest.Mock).mockResolvedValue({
          cropType: 'tomato',
          diseases: [
            {
              name: 'Late Blight',
              scientificName: 'Phytophthora infestans',
              type: 'fungal',
              severity: 'high',
              confidence: 85,
              affectedParts: ['leaves']
            },
            {
              name: 'Aphids',
              scientificName: 'Aphidoidea',
              type: 'pest',
              severity: 'medium',
              confidence: 80,
              affectedParts: ['stems']
            }
          ],
          symptoms: ['Brown spots', 'Insect damage'],
          confidence: 82,
          imageQualityScore: 0.9,
          processingTimeMs: 1500
        });

        (remedyGenerator.generateRemedies as jest.Mock).mockResolvedValue({
          chemical: [{ name: 'Remedy 1' }],
          organic: [{ name: 'Organic 1' }],
          preventive: [{ category: 'spacing', description: 'Test' }]
        } as any);

        const result = await diagnosisService.diagnose(mockRequest);

        expect(result.diseases).toHaveLength(2);
        // Should use first disease for remedy generation
        expect(remedyGenerator.generateRemedies).toHaveBeenCalledWith(
          expect.objectContaining({
            disease: expect.objectContaining({ name: 'Late Blight' })
          })
        );
      });

      it('should handle optional location and growth stage', async () => {
        const requestWithExtras: DiagnosisRequest = {
          ...mockRequest,
          location: {
            latitude: 12.9716,
            longitude: 77.5946,
            state: 'Karnataka',
            district: 'Bangalore'
          },
          growthStage: 'flowering'
        };

        (novaVisionService.analyzeImage as jest.Mock).mockResolvedValue({
          cropType: 'tomato',
          diseases: [{
            name: 'Test Disease',
            scientificName: 'Test',
            type: 'fungal',
            severity: 'low',
            confidence: 85,
            affectedParts: []
          }],
          symptoms: [],
          confidence: 85,
          imageQualityScore: 0.9,
          processingTimeMs: 1000
        });

        (remedyGenerator.generateRemedies as jest.Mock).mockResolvedValue({
          chemical: [],
          organic: [],
          preventive: []
        });

        await diagnosisService.diagnose(requestWithExtras);

        expect(remedyGenerator.generateRemedies).toHaveBeenCalledWith(
          expect.objectContaining({
            location: requestWithExtras.location,
            growthStage: 'flowering'
          })
        );
      });
    });
  });
});
