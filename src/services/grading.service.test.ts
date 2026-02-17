import { GradingService } from './grading.service';
import { ProduceGrade } from '../types';

describe('GradingService', () => {
  let service: GradingService;

  beforeEach(() => {
    service = new GradingService();
  });

  describe('gradeProduceImage', () => {
    it('should return a grading result with valid grade', () => {
      const result = service.gradeProduceImage('mock_image_data', {
        lat: 30.7333,
        lng: 76.7794
      });

      expect(result).toBeDefined();
      expect(result.grade).toMatch(/^[ABC]$/);
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.location).toEqual({ lat: 30.7333, lng: 76.7794 });
    });

    it('should return confidence between 85% and 100%', () => {
      const result = service.gradeProduceImage('mock_image_data', {
        lat: 30.7333,
        lng: 76.7794
      });

      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
    });
  });

  describe('generateCertificate', () => {
    it('should generate a certificate with all required fields', () => {
      const gradingResult = service.gradeProduceImage('mock_image_data', {
        lat: 30.7333,
        lng: 76.7794
      });

      const certificate = service.generateCertificate(
        'farmer-123',
        'Wheat',
        gradingResult,
        'image_hash_123'
      );

      expect(certificate).toBeDefined();
      expect(certificate.id).toBeDefined();
      expect(certificate.farmerId).toBe('farmer-123');
      expect(certificate.produceType).toBe('Wheat');
      expect(certificate.grade).toBe(gradingResult.grade);
      expect(certificate.timestamp).toEqual(gradingResult.timestamp);
      expect(certificate.location).toEqual(gradingResult.location);
      expect(certificate.imageHash).toBe('image_hash_123');
    });
  });
});
