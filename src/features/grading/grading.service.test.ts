import { GradingService } from './grading.service';
import { ProduceGrade } from '../../shared/types/common.types';

describe('GradingService', () => {
  let service: GradingService;

  beforeEach(() => {
    service = new GradingService();
  });

  describe('gradeProduceImage', () => {
    it('should return a grading result with valid grade', async () => {
      const mockImageBuffer = Buffer.from('mock_image_data');
      const result = await service.gradeProduceImage(mockImageBuffer, {
        lat: 30.7333,
        lng: 76.7794
      });

      expect(result).toBeDefined();
      expect(result.gradingResult.grade).toMatch(/^[ABC]$/);
      expect(result.gradingResult.confidence).toBeGreaterThanOrEqual(0.85);
      expect(result.gradingResult.confidence).toBeLessThanOrEqual(1.0);
      expect(result.gradingResult.timestamp).toBeInstanceOf(Date);
      expect(result.gradingResult.location).toEqual({ lat: 30.7333, lng: 76.7794 });
    });

    it('should return confidence between 85% and 100%', async () => {
      const mockImageBuffer = Buffer.from('mock_image_data');
      const result = await service.gradeProduceImage(mockImageBuffer, {
        lat: 30.7333,
        lng: 76.7794
      });

      expect(result.gradingResult.confidence).toBeGreaterThanOrEqual(0.85);
      expect(result.gradingResult.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('generateCertificate', () => {
    it('should generate a certificate with all required fields', async () => {
      const mockImageBuffer = Buffer.from('mock_image_data');
      const { gradingResult } = await service.gradeProduceImage(mockImageBuffer, {
        lat: 30.7333,
        lng: 76.7794
      });

      const certificate = service.generateCertificate(
        'farmer-123',
        'Wheat',
        gradingResult,
        mockImageBuffer,
        'Wheat'
      );

      expect(certificate).toBeDefined();
      expect(certificate.id).toBeDefined();
      expect(certificate.farmerId).toBe('farmer-123');
      expect(certificate.produceType).toBe('Wheat');
      expect(certificate.grade).toBe(gradingResult.grade);
      expect(certificate.timestamp).toEqual(gradingResult.timestamp);
      expect(certificate.location).toEqual(gradingResult.location);
      expect(certificate.imageHash).toBeDefined();
    });
  });
});
