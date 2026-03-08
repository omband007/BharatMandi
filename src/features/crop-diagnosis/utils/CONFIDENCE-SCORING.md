# Confidence Scoring Algorithm

## Overview

The confidence scoring algorithm calculates and normalizes confidence scores for crop disease diagnoses. It adjusts the raw confidence from Amazon Nova Pro based on image quality and the number of diseases detected, ensuring accurate and reliable diagnosis results.

## Requirements

This implementation satisfies the following requirements:

- **Requirement 3.1**: Calculate confidence score between 0 and 100
- **Requirement 3.2**: Evaluate confidence threshold (80%)
- **Requirement 3.6**: Consider image quality factors in confidence calculation

## Algorithm

### Input Parameters

```typescript
interface ConfidenceInput {
  novaConfidence: number;      // Raw confidence from Nova Pro (0-100)
  imageQuality: 'excellent' | 'good' | 'fair' | 'poor';
  diseaseCount: number;        // Number of diseases detected
}
```

### Calculation Steps

1. **Start with Nova Pro confidence**: Use the raw confidence score from the AI model
2. **Apply image quality adjustment**: Multiply by quality-based factor
   - Excellent: 1.0 (no reduction)
   - Good: 0.95 (5% reduction)
   - Fair: 0.85 (15% reduction)
   - Poor: 0.70 (30% reduction)
3. **Apply multiple disease adjustment**: Multiply by disease count factor
   - Single disease: 1.0 (no reduction)
   - Two diseases: 0.90 (10% reduction)
   - Three or more: 0.85 (15% reduction)
4. **Cap at maximum**: Never exceed 95% confidence (avoid overconfidence)
5. **Round to integer**: Return whole number percentage

### Confidence Levels

The final score is categorized into three levels:

- **HIGH** (≥80%): Automatic diagnosis acceptance, no expert review required
- **MEDIUM** (50-79%): Expert review recommended
- **LOW** (<50%): Expert review required

### Confidence Threshold

The system uses an **80% threshold** for automatic diagnosis acceptance:
- Scores ≥80%: Diagnosis accepted automatically
- Scores <80%: Flagged for expert review

## Examples

### Example 1: High Confidence Diagnosis

```typescript
const input = {
  novaConfidence: 90,
  imageQuality: 'excellent',
  diseaseCount: 1
};

const result = calculateConfidence(input);
// Result: { score: 90, level: 'high', requiresExpertReview: false }
```

**Calculation**: 90 × 1.0 × 1.0 = 90

### Example 2: Good Quality with Multiple Diseases

```typescript
const input = {
  novaConfidence: 85,
  imageQuality: 'good',
  diseaseCount: 2
};

const result = calculateConfidence(input);
// Result: { score: 73, level: 'medium', requiresExpertReview: true }
```

**Calculation**: 85 × 0.95 × 0.90 = 72.675 → 73

### Example 3: Poor Quality Image

```typescript
const input = {
  novaConfidence: 80,
  imageQuality: 'poor',
  diseaseCount: 1
};

const result = calculateConfidence(input);
// Result: { score: 56, level: 'medium', requiresExpertReview: true }
```

**Calculation**: 80 × 0.70 × 1.0 = 56

### Example 4: Worst Case Scenario

```typescript
const input = {
  novaConfidence: 60,
  imageQuality: 'poor',
  diseaseCount: 3
};

const result = calculateConfidence(input);
// Result: { score: 36, level: 'low', requiresExpertReview: true }
```

**Calculation**: 60 × 0.70 × 0.85 = 35.7 → 36

## Edge Cases

### Healthy Crop (No Disease Detected)

When no diseases are detected, the system returns 100% confidence for healthy status:

```typescript
const result = getHealthyCropConfidence();
// Result: { score: 100, level: 'high', requiresExpertReview: false }
```

### Multiple Diseases with Individual Confidences

For multiple diseases, you can calculate a weighted average based on severity:

```typescript
const diseases = [
  { confidence: 90, severity: 'high' },
  { confidence: 70, severity: 'medium' }
];

const avgConfidence = calculateWeightedConfidence(diseases);
// Result: 82 (weighted by severity: high=3, medium=2, low=1)
```

**Calculation**: (90×3 + 70×2) / (3+2) = 410/5 = 82

### Invalid Confidence Values

The `normalizeConfidence()` function clamps values to the valid 0-100 range:

```typescript
normalizeConfidence(105);  // Returns: 100
normalizeConfidence(-5);   // Returns: 0
normalizeConfidence(75.6); // Returns: 76 (rounded)
```

## Integration with Nova Vision Service

The confidence scoring algorithm is integrated into the Nova Vision Service's `convertToAnalysisResult()` method:

```typescript
// Calculate overall confidence using confidence scoring algorithm
const confidenceScore = calculateConfidence({
  novaConfidence: normalizeConfidence(novaResponse.overallConfidence),
  imageQuality: novaResponse.imageQuality,
  diseaseCount: diseases.length,
});

return {
  // ... other fields
  confidence: confidenceScore.score,
};
```

## API Usage

### Basic Usage

```typescript
import { calculateConfidence } from './confidence-scorer.util';

const score = calculateConfidence({
  novaConfidence: 85,
  imageQuality: 'good',
  diseaseCount: 1
});

console.log(score.score);                  // 81
console.log(score.level);                  // 'high'
console.log(score.requiresExpertReview);   // false
```

### Check Threshold

```typescript
import { meetsConfidenceThreshold } from './confidence-scorer.util';

const meetsThreshold = meetsConfidenceThreshold(85);  // true
const needsReview = meetsConfidenceThreshold(75);     // false
```

### Get Confidence Level

```typescript
import { getConfidenceLevel, ConfidenceLevel } from './confidence-scorer.util';

const level = getConfidenceLevel(85);  // ConfidenceLevel.HIGH
```

## Testing

The confidence scoring algorithm has comprehensive unit tests covering:

- All image quality levels
- All disease count scenarios
- Boundary conditions (exactly 80%, 50%, etc.)
- Edge cases (zero confidence, maximum confidence)
- Clamping behavior
- Weighted confidence calculations
- Integration scenarios

Run tests:

```bash
npm test -- confidence-scorer.util.test.ts
```

## Constants

```typescript
// Confidence threshold for automatic acceptance
export const CONFIDENCE_THRESHOLD = 80;

// Confidence level thresholds
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 50,
  LOW: 0,
};

// Maximum confidence cap (never 100% certain)
const MAX_CONFIDENCE = 95;
```

## Design Rationale

### Why Adjust for Image Quality?

Poor image quality (blur, low lighting, unclear focus) reduces the AI model's ability to accurately identify diseases. The adjustment reflects this uncertainty in the final confidence score.

### Why Adjust for Multiple Diseases?

When multiple diseases are detected simultaneously, there's increased uncertainty about:
- Whether all diseases are correctly identified
- Whether some symptoms overlap between diseases
- Whether the AI is confusing similar-looking conditions

The adjustment accounts for this increased complexity.

### Why Cap at 95%?

No AI system should claim 100% certainty. Capping at 95% acknowledges:
- Inherent limitations of AI models
- Possibility of rare or unusual disease presentations
- Value of human expert validation

### Why 80% Threshold?

The 80% threshold balances:
- **Automation**: High enough to trust most diagnoses automatically
- **Safety**: Low enough to catch uncertain cases for expert review
- **User Experience**: Minimizes unnecessary expert escalations while maintaining accuracy

## Performance

The confidence scoring algorithm is highly efficient:
- **Time Complexity**: O(1) - constant time operations
- **Space Complexity**: O(1) - no additional memory allocation
- **Execution Time**: <1ms per calculation

## Future Enhancements

Potential improvements for future iterations:

1. **Machine Learning Calibration**: Train a model to optimize multipliers based on historical accuracy data
2. **Regional Adjustments**: Factor in disease prevalence by region and season
3. **Crop-Specific Thresholds**: Different confidence thresholds for different crop types
4. **Temporal Patterns**: Consider time-series data for recurring diagnoses
5. **User Feedback Integration**: Adjust confidence based on farmer feedback accuracy

## References

- Design Document: `.kiro/specs/crop-disease-diagnosis/design.md`
- Requirements: `.kiro/specs/crop-disease-diagnosis/requirements.md`
- Tasks: `.kiro/specs/crop-disease-diagnosis/tasks.md` (Task 3.5)
