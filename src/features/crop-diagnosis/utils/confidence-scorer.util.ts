/**
 * Confidence Scoring Utility for Crop Disease Diagnosis
 * 
 * Calculates and normalizes confidence scores for disease diagnoses.
 * Adjusts confidence based on image quality and multiple disease detection.
 * 
 * Requirements:
 * - 3.1: Calculate confidence score between 0 and 100
 * - 3.2: Evaluate confidence threshold (80%)
 * - 3.6: Consider image quality factors in confidence calculation
 */

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Confidence threshold levels
 */
export enum ConfidenceLevel {
  HIGH = 'high',    // ≥80%
  MEDIUM = 'medium', // 50-79%
  LOW = 'low'       // <50%
}

/**
 * Input parameters for confidence calculation
 */
export interface ConfidenceInput {
  /** Raw confidence from Nova Pro (0-100) */
  novaConfidence: number;
  
  /** Image quality assessment */
  imageQuality: 'excellent' | 'good' | 'fair' | 'poor';
  
  /** Number of diseases detected */
  diseaseCount: number;
  
  /** Optional: Individual disease confidences for weighted calculation */
  diseaseConfidences?: number[];
}

/**
 * Confidence scoring result
 */
export interface ConfidenceScore {
  /** Final normalized confidence score (0-100) */
  score: number;
  
  /** Confidence level category */
  level: ConfidenceLevel;
  
  /** Whether expert review is required (<80%) */
  requiresExpertReview: boolean;
  
  /** Breakdown of adjustments applied */
  adjustments: {
    original: number;
    imageQualityMultiplier: number;
    multiDiseaseMultiplier: number;
    final: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Confidence threshold for automatic diagnosis acceptance
 * Below this threshold, expert review is required
 */
export const CONFIDENCE_THRESHOLD = 80;

/**
 * Confidence level thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 50,
  LOW: 0,
} as const;

/**
 * Image quality multipliers for confidence adjustment
 * Lower quality images reduce confidence
 */
const IMAGE_QUALITY_MULTIPLIERS = {
  excellent: 1.0,
  good: 0.95,
  fair: 0.85,
  poor: 0.70,
};

/**
 * Multiple disease detection multipliers
 * More diseases increase uncertainty
 */
const MULTI_DISEASE_MULTIPLIERS = {
  single: 1.0,
  double: 0.90,
  multiple: 0.85,
};

/**
 * Maximum confidence cap
 * Never claim 100% certainty
 */
const MAX_CONFIDENCE = 95;

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Calculate overall confidence score with adjustments
 * 
 * Applies image quality and multiple disease adjustments to the raw confidence
 * from Nova Pro. Caps the final score at 95% to avoid overconfidence.
 * 
 * @param input - Confidence calculation input parameters
 * @returns Confidence score with level and expert review flag
 * 
 * @example
 * ```typescript
 * const score = calculateConfidence({
 *   novaConfidence: 85,
 *   imageQuality: 'good',
 *   diseaseCount: 1
 * });
 * // Returns: { score: 81, level: 'high', requiresExpertReview: false, ... }
 * ```
 */
export function calculateConfidence(input: ConfidenceInput): ConfidenceScore {
  const { novaConfidence, imageQuality, diseaseCount } = input;
  
  // Start with Nova Pro's confidence
  let confidence = novaConfidence;
  
  // Apply image quality adjustment
  const qualityMultiplier = IMAGE_QUALITY_MULTIPLIERS[imageQuality] || IMAGE_QUALITY_MULTIPLIERS.poor;
  confidence *= qualityMultiplier;
  
  // Apply multiple disease adjustment
  let diseaseMultiplier = MULTI_DISEASE_MULTIPLIERS.single;
  if (diseaseCount > 2) {
    diseaseMultiplier = MULTI_DISEASE_MULTIPLIERS.multiple;
  } else if (diseaseCount > 1) {
    diseaseMultiplier = MULTI_DISEASE_MULTIPLIERS.double;
  }
  confidence *= diseaseMultiplier;
  
  // Cap at maximum confidence (never 100% certain)
  confidence = Math.min(confidence, MAX_CONFIDENCE);
  
  // Round to integer
  const finalScore = Math.round(confidence);
  
  // Determine confidence level
  const level = getConfidenceLevel(finalScore);
  
  // Check if expert review is required
  const requiresExpertReview = finalScore < CONFIDENCE_THRESHOLD;
  
  return {
    score: finalScore,
    level,
    requiresExpertReview,
    adjustments: {
      original: novaConfidence,
      imageQualityMultiplier: qualityMultiplier,
      multiDiseaseMultiplier: diseaseMultiplier,
      final: finalScore,
    },
  };
}

/**
 * Normalize confidence score to 0-100 range
 * 
 * Ensures confidence scores are within valid range.
 * Clamps values outside the range.
 * 
 * @param score - Raw confidence score
 * @returns Normalized score (0-100)
 * 
 * @example
 * ```typescript
 * normalizeConfidence(105); // Returns: 100
 * normalizeConfidence(-5);  // Returns: 0
 * normalizeConfidence(75);  // Returns: 75
 * ```
 */
export function normalizeConfidence(score: number): number {
  return Math.min(Math.max(Math.round(score), 0), 100);
}

/**
 * Determine confidence level from score
 * 
 * @param score - Confidence score (0-100)
 * @returns Confidence level category
 * 
 * @example
 * ```typescript
 * getConfidenceLevel(85); // Returns: ConfidenceLevel.HIGH
 * getConfidenceLevel(65); // Returns: ConfidenceLevel.MEDIUM
 * getConfidenceLevel(45); // Returns: ConfidenceLevel.LOW
 * ```
 */
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) {
    return ConfidenceLevel.HIGH;
  } else if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return ConfidenceLevel.MEDIUM;
  } else {
    return ConfidenceLevel.LOW;
  }
}

/**
 * Check if confidence meets threshold for automatic acceptance
 * 
 * @param score - Confidence score (0-100)
 * @returns True if score meets or exceeds threshold (80%)
 * 
 * @example
 * ```typescript
 * meetsConfidenceThreshold(85); // Returns: true
 * meetsConfidenceThreshold(75); // Returns: false
 * ```
 */
export function meetsConfidenceThreshold(score: number): boolean {
  return score >= CONFIDENCE_THRESHOLD;
}

/**
 * Handle edge case: No disease detected (healthy crop)
 * 
 * When no diseases are detected, confidence should be 100% for healthy status.
 * 
 * @returns Confidence score for healthy crop
 * 
 * @example
 * ```typescript
 * const score = getHealthyCropConfidence();
 * // Returns: { score: 100, level: 'high', requiresExpertReview: false, ... }
 * ```
 */
export function getHealthyCropConfidence(): ConfidenceScore {
  return {
    score: 100,
    level: ConfidenceLevel.HIGH,
    requiresExpertReview: false,
    adjustments: {
      original: 100,
      imageQualityMultiplier: 1.0,
      multiDiseaseMultiplier: 1.0,
      final: 100,
    },
  };
}

/**
 * Handle edge case: Multiple diseases with individual confidences
 * 
 * Calculates weighted average confidence when multiple diseases are detected.
 * Uses severity as weight (high=3, medium=2, low=1).
 * 
 * @param diseases - Array of disease confidences with severity
 * @returns Weighted average confidence
 * 
 * @example
 * ```typescript
 * const avgConfidence = calculateWeightedConfidence([
 *   { confidence: 85, severity: 'high' },
 *   { confidence: 70, severity: 'medium' }
 * ]);
 * // Returns: ~79 (weighted average)
 * ```
 */
export function calculateWeightedConfidence(
  diseases: Array<{ confidence: number; severity: 'low' | 'medium' | 'high' }>
): number {
  if (diseases.length === 0) {
    return 0;
  }
  
  // Severity weights
  const severityWeights = {
    high: 3,
    medium: 2,
    low: 1,
  };
  
  let totalWeightedConfidence = 0;
  let totalWeight = 0;
  
  for (const disease of diseases) {
    const weight = severityWeights[disease.severity];
    totalWeightedConfidence += disease.confidence * weight;
    totalWeight += weight;
  }
  
  return totalWeight > 0 ? totalWeightedConfidence / totalWeight : 0;
}
