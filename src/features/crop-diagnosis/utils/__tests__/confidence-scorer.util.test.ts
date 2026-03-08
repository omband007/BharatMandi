/**
 * Unit Tests for Confidence Scoring Utility
 * 
 * Tests confidence calculation, normalization, thresholds, and edge cases.
 */

import {
  calculateConfidence,
  normalizeConfidence,
  getConfidenceLevel,
  meetsConfidenceThreshold,
  getHealthyCropConfidence,
  calculateWeightedConfidence,
  ConfidenceLevel,
  CONFIDENCE_THRESHOLD,
  CONFIDENCE_THRESHOLDS,
  type ConfidenceInput,
} from '../confidence-scorer.util';

describe('Confidence Scorer Utility', () => {
  // ============================================================================
  // calculateConfidence() Tests
  // ============================================================================

  describe('calculateConfidence', () => {
    it('should calculate confidence with excellent image quality and single disease', () => {
      const input: ConfidenceInput = {
        novaConfidence: 90,
        imageQuality: 'excellent',
        diseaseCount: 1,
      };

      const result = calculateConfidence(input);

      expect(result.score).toBe(90); // 90 * 1.0 * 1.0 = 90
      expect(result.level).toBe(ConfidenceLevel.HIGH);
      expect(result.requiresExpertReview).toBe(false);
      expect(result.adjustments.original).toBe(90);
      expect(result.adjustments.imageQualityMultiplier).toBe(1.0);
      expect(result.adjustments.multiDiseaseMultiplier).toBe(1.0);
    });

    it('should reduce confidence for good image quality', () => {
      const input: ConfidenceInput = {
        novaConfidence: 90,
        imageQuality: 'good',
        diseaseCount: 1,
      };

      const result = calculateConfidence(input);

      expect(result.score).toBe(86); // 90 * 0.95 * 1.0 = 85.5 → 86
      expect(result.level).toBe(ConfidenceLevel.HIGH);
      expect(result.requiresExpertReview).toBe(false);
    });

    it('should reduce confidence for fair image quality', () => {
      const input: ConfidenceInput = {
        novaConfidence: 90,
        imageQuality: 'fair',
        diseaseCount: 1,
      };

      const result = calculateConfidence(input);

      expect(result.score).toBe(77); // 90 * 0.85 * 1.0 = 76.5 → 77
      expect(result.level).toBe(ConfidenceLevel.MEDIUM);
      expect(result.requiresExpertReview).toBe(true);
    });

    it('should significantly reduce confidence for poor image quality', () => {
      const input: ConfidenceInput = {
        novaConfidence: 90,
        imageQuality: 'poor',
        diseaseCount: 1,
      };

      const result = calculateConfidence(input);

      expect(result.score).toBe(63); // 90 * 0.70 * 1.0 = 63
      expect(result.level).toBe(ConfidenceLevel.MEDIUM);
      expect(result.requiresExpertReview).toBe(true);
    });

    it('should reduce confidence for multiple diseases (2)', () => {
      const input: ConfidenceInput = {
        novaConfidence: 90,
        imageQuality: 'excellent',
        diseaseCount: 2,
      };

      const result = calculateConfidence(input);

      expect(result.score).toBe(81); // 90 * 1.0 * 0.90 = 81
      expect(result.level).toBe(ConfidenceLevel.HIGH);
      expect(result.requiresExpertReview).toBe(false);
      expect(result.adjustments.multiDiseaseMultiplier).toBe(0.90);
    });

    it('should reduce confidence for multiple diseases (3+)', () => {
      const input: ConfidenceInput = {
        novaConfidence: 90,
        imageQuality: 'excellent',
        diseaseCount: 3,
      };

      const result = calculateConfidence(input);

      expect(result.score).toBe(77); // 90 * 1.0 * 0.85 = 76.5 → 77
      expect(result.level).toBe(ConfidenceLevel.MEDIUM);
      expect(result.requiresExpertReview).toBe(true);
      expect(result.adjustments.multiDiseaseMultiplier).toBe(0.85);
    });

    it('should apply both image quality and multiple disease adjustments', () => {
      const input: ConfidenceInput = {
        novaConfidence: 85,
        imageQuality: 'good',
        diseaseCount: 2,
      };

      const result = calculateConfidence(input);

      // 85 * 0.95 * 0.90 = 72.675 → 73
      expect(result.score).toBe(73);
      expect(result.level).toBe(ConfidenceLevel.MEDIUM);
      expect(result.requiresExpertReview).toBe(true);
    });

    it('should cap confidence at 95% maximum', () => {
      const input: ConfidenceInput = {
        novaConfidence: 100,
        imageQuality: 'excellent',
        diseaseCount: 1,
      };

      const result = calculateConfidence(input);

      expect(result.score).toBe(95); // Capped at 95
      expect(result.level).toBe(ConfidenceLevel.HIGH);
      expect(result.requiresExpertReview).toBe(false);
    });

    it('should handle low confidence scores', () => {
      const input: ConfidenceInput = {
        novaConfidence: 40,
        imageQuality: 'poor',
        diseaseCount: 3,
      };

      const result = calculateConfidence(input);

      // 40 * 0.70 * 0.85 = 23.8 → 24
      expect(result.score).toBe(24);
      expect(result.level).toBe(ConfidenceLevel.LOW);
      expect(result.requiresExpertReview).toBe(true);
    });

    it('should handle edge case: zero confidence', () => {
      const input: ConfidenceInput = {
        novaConfidence: 0,
        imageQuality: 'excellent',
        diseaseCount: 1,
      };

      const result = calculateConfidence(input);

      expect(result.score).toBe(0);
      expect(result.level).toBe(ConfidenceLevel.LOW);
      expect(result.requiresExpertReview).toBe(true);
    });

    it('should handle boundary: exactly 80% threshold', () => {
      const input: ConfidenceInput = {
        novaConfidence: 80,
        imageQuality: 'excellent',
        diseaseCount: 1,
      };

      const result = calculateConfidence(input);

      expect(result.score).toBe(80);
      expect(result.level).toBe(ConfidenceLevel.HIGH);
      expect(result.requiresExpertReview).toBe(false); // Exactly at threshold
    });

    it('should handle boundary: just below 80% threshold', () => {
      const input: ConfidenceInput = {
        novaConfidence: 79,
        imageQuality: 'excellent',
        diseaseCount: 1,
      };

      const result = calculateConfidence(input);

      expect(result.score).toBe(79);
      expect(result.level).toBe(ConfidenceLevel.MEDIUM);
      expect(result.requiresExpertReview).toBe(true); // Below threshold
    });

    it('should handle boundary: exactly 50% threshold', () => {
      const input: ConfidenceInput = {
        novaConfidence: 50,
        imageQuality: 'excellent',
        diseaseCount: 1,
      };

      const result = calculateConfidence(input);

      expect(result.score).toBe(50);
      expect(result.level).toBe(ConfidenceLevel.MEDIUM);
      expect(result.requiresExpertReview).toBe(true);
    });

    it('should handle boundary: just below 50% threshold', () => {
      const input: ConfidenceInput = {
        novaConfidence: 49,
        imageQuality: 'excellent',
        diseaseCount: 1,
      };

      const result = calculateConfidence(input);

      expect(result.score).toBe(49);
      expect(result.level).toBe(ConfidenceLevel.LOW);
      expect(result.requiresExpertReview).toBe(true);
    });
  });

  // ============================================================================
  // normalizeConfidence() Tests
  // ============================================================================

  describe('normalizeConfidence', () => {
    it('should normalize valid confidence scores', () => {
      expect(normalizeConfidence(75)).toBe(75);
      expect(normalizeConfidence(50)).toBe(50);
      expect(normalizeConfidence(100)).toBe(100);
      expect(normalizeConfidence(0)).toBe(0);
    });

    it('should clamp scores above 100', () => {
      expect(normalizeConfidence(105)).toBe(100);
      expect(normalizeConfidence(150)).toBe(100);
      expect(normalizeConfidence(200)).toBe(100);
    });

    it('should clamp scores below 0', () => {
      expect(normalizeConfidence(-5)).toBe(0);
      expect(normalizeConfidence(-50)).toBe(0);
      expect(normalizeConfidence(-100)).toBe(0);
    });

    it('should round decimal scores', () => {
      expect(normalizeConfidence(75.4)).toBe(75);
      expect(normalizeConfidence(75.5)).toBe(76);
      expect(normalizeConfidence(75.6)).toBe(76);
    });

    it('should handle edge cases', () => {
      expect(normalizeConfidence(0.1)).toBe(0);
      expect(normalizeConfidence(99.9)).toBe(100);
      expect(normalizeConfidence(50.5)).toBe(51);
    });
  });

  // ============================================================================
  // getConfidenceLevel() Tests
  // ============================================================================

  describe('getConfidenceLevel', () => {
    it('should return HIGH for scores ≥80', () => {
      expect(getConfidenceLevel(80)).toBe(ConfidenceLevel.HIGH);
      expect(getConfidenceLevel(85)).toBe(ConfidenceLevel.HIGH);
      expect(getConfidenceLevel(90)).toBe(ConfidenceLevel.HIGH);
      expect(getConfidenceLevel(95)).toBe(ConfidenceLevel.HIGH);
      expect(getConfidenceLevel(100)).toBe(ConfidenceLevel.HIGH);
    });

    it('should return MEDIUM for scores 50-79', () => {
      expect(getConfidenceLevel(50)).toBe(ConfidenceLevel.MEDIUM);
      expect(getConfidenceLevel(60)).toBe(ConfidenceLevel.MEDIUM);
      expect(getConfidenceLevel(70)).toBe(ConfidenceLevel.MEDIUM);
      expect(getConfidenceLevel(79)).toBe(ConfidenceLevel.MEDIUM);
    });

    it('should return LOW for scores <50', () => {
      expect(getConfidenceLevel(0)).toBe(ConfidenceLevel.LOW);
      expect(getConfidenceLevel(10)).toBe(ConfidenceLevel.LOW);
      expect(getConfidenceLevel(25)).toBe(ConfidenceLevel.LOW);
      expect(getConfidenceLevel(49)).toBe(ConfidenceLevel.LOW);
    });

    it('should handle boundary values correctly', () => {
      expect(getConfidenceLevel(79.9)).toBe(ConfidenceLevel.MEDIUM);
      expect(getConfidenceLevel(80.0)).toBe(ConfidenceLevel.HIGH);
      expect(getConfidenceLevel(49.9)).toBe(ConfidenceLevel.LOW);
      expect(getConfidenceLevel(50.0)).toBe(ConfidenceLevel.MEDIUM);
    });
  });

  // ============================================================================
  // meetsConfidenceThreshold() Tests
  // ============================================================================

  describe('meetsConfidenceThreshold', () => {
    it('should return true for scores ≥80', () => {
      expect(meetsConfidenceThreshold(80)).toBe(true);
      expect(meetsConfidenceThreshold(85)).toBe(true);
      expect(meetsConfidenceThreshold(90)).toBe(true);
      expect(meetsConfidenceThreshold(100)).toBe(true);
    });

    it('should return false for scores <80', () => {
      expect(meetsConfidenceThreshold(79)).toBe(false);
      expect(meetsConfidenceThreshold(70)).toBe(false);
      expect(meetsConfidenceThreshold(50)).toBe(false);
      expect(meetsConfidenceThreshold(0)).toBe(false);
    });

    it('should handle boundary value exactly', () => {
      expect(meetsConfidenceThreshold(79.9)).toBe(false);
      expect(meetsConfidenceThreshold(80.0)).toBe(true);
      expect(meetsConfidenceThreshold(80.1)).toBe(true);
    });
  });

  // ============================================================================
  // getHealthyCropConfidence() Tests
  // ============================================================================

  describe('getHealthyCropConfidence', () => {
    it('should return 100% confidence for healthy crop', () => {
      const result = getHealthyCropConfidence();

      expect(result.score).toBe(100);
      expect(result.level).toBe(ConfidenceLevel.HIGH);
      expect(result.requiresExpertReview).toBe(false);
      expect(result.adjustments.original).toBe(100);
      expect(result.adjustments.imageQualityMultiplier).toBe(1.0);
      expect(result.adjustments.multiDiseaseMultiplier).toBe(1.0);
      expect(result.adjustments.final).toBe(100);
    });

    it('should always return the same result', () => {
      const result1 = getHealthyCropConfidence();
      const result2 = getHealthyCropConfidence();

      expect(result1).toEqual(result2);
    });
  });

  // ============================================================================
  // calculateWeightedConfidence() Tests
  // ============================================================================

  describe('calculateWeightedConfidence', () => {
    it('should calculate weighted average for multiple diseases', () => {
      const diseases = [
        { confidence: 90, severity: 'high' as const },
        { confidence: 70, severity: 'medium' as const },
      ];

      const result = calculateWeightedConfidence(diseases);

      // (90*3 + 70*2) / (3+2) = (270 + 140) / 5 = 410 / 5 = 82
      expect(result).toBe(82);
    });

    it('should weight high severity diseases more', () => {
      const diseases = [
        { confidence: 80, severity: 'high' as const },
        { confidence: 80, severity: 'low' as const },
      ];

      const result = calculateWeightedConfidence(diseases);

      // (80*3 + 80*1) / (3+1) = (240 + 80) / 4 = 320 / 4 = 80
      expect(result).toBe(80);
    });

    it('should handle single disease', () => {
      const diseases = [
        { confidence: 85, severity: 'high' as const },
      ];

      const result = calculateWeightedConfidence(diseases);

      expect(result).toBe(85);
    });

    it('should handle three diseases with different severities', () => {
      const diseases = [
        { confidence: 90, severity: 'high' as const },
        { confidence: 70, severity: 'medium' as const },
        { confidence: 50, severity: 'low' as const },
      ];

      const result = calculateWeightedConfidence(diseases);

      // (90*3 + 70*2 + 50*1) / (3+2+1) = (270 + 140 + 50) / 6 = 460 / 6 = 76.67 → 76.67
      expect(result).toBeCloseTo(76.67, 1);
    });

    it('should handle empty disease array', () => {
      const diseases: Array<{ confidence: number; severity: 'low' | 'medium' | 'high' }> = [];

      const result = calculateWeightedConfidence(diseases);

      expect(result).toBe(0);
    });

    it('should handle all same severity', () => {
      const diseases = [
        { confidence: 80, severity: 'medium' as const },
        { confidence: 70, severity: 'medium' as const },
        { confidence: 60, severity: 'medium' as const },
      ];

      const result = calculateWeightedConfidence(diseases);

      // (80*2 + 70*2 + 60*2) / (2+2+2) = (160 + 140 + 120) / 6 = 420 / 6 = 70
      expect(result).toBe(70);
    });

    it('should handle low confidence diseases', () => {
      const diseases = [
        { confidence: 30, severity: 'high' as const },
        { confidence: 20, severity: 'medium' as const },
      ];

      const result = calculateWeightedConfidence(diseases);

      // (30*3 + 20*2) / (3+2) = (90 + 40) / 5 = 130 / 5 = 26
      expect(result).toBe(26);
    });
  });

  // ============================================================================
  // Constants Tests
  // ============================================================================

  describe('Constants', () => {
    it('should have correct confidence threshold', () => {
      expect(CONFIDENCE_THRESHOLD).toBe(80);
    });

    it('should have correct confidence level thresholds', () => {
      expect(CONFIDENCE_THRESHOLDS.HIGH).toBe(80);
      expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBe(50);
      expect(CONFIDENCE_THRESHOLDS.LOW).toBe(0);
    });

    it('should have HIGH threshold greater than MEDIUM', () => {
      expect(CONFIDENCE_THRESHOLDS.HIGH).toBeGreaterThan(CONFIDENCE_THRESHOLDS.MEDIUM);
    });

    it('should have MEDIUM threshold greater than or equal to LOW', () => {
      expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBeGreaterThanOrEqual(CONFIDENCE_THRESHOLDS.LOW);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration scenarios', () => {
    it('should handle typical high-confidence diagnosis', () => {
      const input: ConfidenceInput = {
        novaConfidence: 88,
        imageQuality: 'good',
        diseaseCount: 1,
      };

      const result = calculateConfidence(input);

      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.level).toBe(ConfidenceLevel.HIGH);
      expect(result.requiresExpertReview).toBe(false);
    });

    it('should handle typical medium-confidence diagnosis', () => {
      const input: ConfidenceInput = {
        novaConfidence: 75,
        imageQuality: 'fair',
        diseaseCount: 2,
      };

      const result = calculateConfidence(input);

      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.score).toBeLessThan(80);
      expect(result.level).toBe(ConfidenceLevel.MEDIUM);
      expect(result.requiresExpertReview).toBe(true);
    });

    it('should handle typical low-confidence diagnosis', () => {
      const input: ConfidenceInput = {
        novaConfidence: 60,
        imageQuality: 'poor',
        diseaseCount: 3,
      };

      const result = calculateConfidence(input);

      expect(result.score).toBeLessThan(50);
      expect(result.level).toBe(ConfidenceLevel.LOW);
      expect(result.requiresExpertReview).toBe(true);
    });

    it('should handle worst-case scenario', () => {
      const input: ConfidenceInput = {
        novaConfidence: 50,
        imageQuality: 'poor',
        diseaseCount: 4,
      };

      const result = calculateConfidence(input);

      // 50 * 0.70 * 0.85 = 29.75 → 30
      expect(result.score).toBe(30);
      expect(result.level).toBe(ConfidenceLevel.LOW);
      expect(result.requiresExpertReview).toBe(true);
    });

    it('should handle best-case scenario', () => {
      const input: ConfidenceInput = {
        novaConfidence: 98,
        imageQuality: 'excellent',
        diseaseCount: 1,
      };

      const result = calculateConfidence(input);

      expect(result.score).toBe(95); // Capped at 95
      expect(result.level).toBe(ConfidenceLevel.HIGH);
      expect(result.requiresExpertReview).toBe(false);
    });
  });
});
