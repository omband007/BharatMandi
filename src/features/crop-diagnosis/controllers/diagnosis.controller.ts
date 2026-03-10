/**
 * Diagnosis API Controller
 * 
 * Handles HTTP requests for crop disease diagnosis.
 * 
 * Requirements:
 * - 14.3: JWT authentication for all diagnosis endpoints
 * - 14.7: Rate limiting (10 requests/hour per user)
 * - Multipart/form-data parsing for image uploads
 * - Request validation for required fields
 * - Consistent error response format
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireAuth } from '../../profile/middleware/auth.middleware';
import { imageValidator } from '../services/image-validator.service';
import { s3Service } from '../services/s3.service';
import { diagnosisService } from '../services/diagnosis.service';
import {
  DiagnosisError,
  DiagnosisErrorCode,
  ErrorResponse as DiagnosisErrorResponse,
  ErrorHandler,
  ErrorLogger,
  isDiagnosisError,
  ImageValidationError,
  ImageTooLargeError,
  RateLimitError,
} from '../errors/diagnosis.errors';

// ============================================================================
// TYPES
// ============================================================================

export interface DiagnosisRequest {
  image: Express.Multer.File;
  cropType?: string;
  location?: {
    latitude: number;
    longitude: number;
    state: string;
  };
  language: string;
}

export interface DiagnosisResponse {
  diagnosisId: string;
  cropType: string;
  cropLocalName?: string;
  diseases: Disease[];
  confidence: number;
  remedies: Remedy[];
  preventiveMeasures: string[];
  expertReviewRequired: boolean;
  imageUrl: string;
  timestamp: Date;
}

export interface Disease {
  name: string;
  localName?: string;
  scientificName: string;
  type: 'fungal' | 'bacterial' | 'viral' | 'pest' | 'nutrient_deficiency';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  affectedParts: string[];
}

export interface Remedy {
  type: 'chemical' | 'organic';
  name: string;
  dosage?: string;
  applicationMethod: string;
  frequency: string;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
  };
  timestamp: Date;
  requestId: string;
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Simple in-memory rate limiter
 * 
 * Requirement 14.7: Rate limiting (10 requests/hour per user)
 * 
 * Note: In production, use Redis for distributed rate limiting
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number = 10;
  private readonly windowMs: number = 60 * 60 * 1000; // 1 hour

  /**
   * Check if user has exceeded rate limit
   * 
   * @param userId - User ID to check
   * @returns True if rate limit exceeded
   */
  isRateLimited(userId: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    // Filter out requests outside the time window
    const recentRequests = userRequests.filter(timestamp => now - timestamp < this.windowMs);
    
    // Update stored requests
    this.requests.set(userId, recentRequests);
    
    // Check if limit exceeded
    return recentRequests.length >= this.maxRequests;
  }

  /**
   * Record a new request for a user
   * 
   * @param userId - User ID to record
   */
  recordRequest(userId: string): void {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    userRequests.push(now);
    this.requests.set(userId, userRequests);
  }

  /**
   * Get remaining requests for a user
   * 
   * @param userId - User ID to check
   * @returns Number of remaining requests
   */
  getRemainingRequests(userId: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    const recentRequests = userRequests.filter(timestamp => now - timestamp < this.windowMs);
    return Math.max(0, this.maxRequests - recentRequests.length);
  }

  /**
   * Get time until rate limit resets
   * 
   * @param userId - User ID to check
   * @returns Milliseconds until reset, or 0 if not rate limited
   */
  getResetTime(userId: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    
    if (userRequests.length === 0) {
      return 0;
    }
    
    const oldestRequest = Math.min(...userRequests);
    const resetTime = oldestRequest + this.windowMs;
    
    return Math.max(0, resetTime - now);
  }
}

const rateLimiter = new RateLimiter();

/**
 * Rate limiting middleware
 * 
 * Requirement 14.7: Rate limiting (10 requests/hour per user)
 */
function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        retryable: false
      },
      timestamp: new Date(),
      requestId: generateRequestId()
    } as ErrorResponse);
    return;
  }

  const userId = req.user.userId;

  if (rateLimiter.isRateLimited(userId)) {
    const resetTime = rateLimiter.getResetTime(userId);
    const resetDate = new Date(Date.now() + resetTime);

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Maximum 10 diagnoses per hour. Please try again later.',
        details: {
          limit: 10,
          windowMs: 60 * 60 * 1000,
          retryAfter: resetDate.toISOString(),
          resetInSeconds: Math.ceil(resetTime / 1000)
        },
        retryable: true
      },
      timestamp: new Date(),
      requestId: generateRequestId()
    } as ErrorResponse);
    return;
  }

  // Record this request
  rateLimiter.recordRequest(userId);

  // Add rate limit info to response headers
  res.setHeader('X-RateLimit-Limit', '10');
  res.setHeader('X-RateLimit-Remaining', rateLimiter.getRemainingRequests(userId).toString());
  res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiter.getResetTime(userId)).toISOString());

  next();
}

// ============================================================================
// MULTER CONFIGURATION
// ============================================================================

/**
 * Configure multer for image upload
 * 
 * - Store in memory (we'll process and upload to S3)
 * - Limit file size to 10MB (validation happens in imageValidator)
 * - Accept only image files
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1 // Only one file per request
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create error response
 */
function createErrorResponse(
  code: string,
  message: string,
  retryable: boolean = false,
  details?: any
): ErrorResponse {
  return {
    error: {
      code,
      message,
      details,
      retryable
    },
    timestamp: new Date(),
    requestId: generateRequestId()
  };
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

/**
 * POST /api/diagnosis
 * 
 * Submit image for crop disease diagnosis
 * 
 * Requirements:
 * - 14.3: JWT authentication required
 * - 14.7: Rate limiting (10 requests/hour)
 * - Multipart/form-data with image file
 * - Optional: cropType, location, language
 */
async function createDiagnosis(req: Request, res: Response): Promise<void> {
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  try {
    // Validate file upload
    if (!req.file) {
      const error = new DiagnosisError(
        'Image file is required',
        DiagnosisErrorCode.MISSING_IMAGE,
        false,
        400,
        { field: 'image' },
        'Please upload an image file in JPEG, PNG, or WebP format.',
        {
          service: 'DiagnosisController',
          operation: 'createDiagnosis',
          requestId,
        }
      );
      
      ErrorLogger.logError(error);
      res.status(error.httpStatus).json(error.toJSON());
      return;
    }

    // Get user ID from authenticated request
    const userId = req.user!.userId;

    // Parse optional fields
    const cropType = req.body.cropType;
    const language = req.body.language || 'en';
    
    let location: { latitude: number; longitude: number; state: string } | undefined;
    if (req.body.location) {
      try {
        location = typeof req.body.location === 'string' 
          ? JSON.parse(req.body.location) 
          : req.body.location;
      } catch (error) {
        const diagError = new DiagnosisError(
          'Location must be a valid JSON object',
          DiagnosisErrorCode.INVALID_LOCATION,
          false,
          400,
          { providedValue: req.body.location },
          'Please provide location as a JSON object with latitude, longitude, and state fields.',
          {
            service: 'DiagnosisController',
            operation: 'createDiagnosis',
            requestId,
            userId,
          }
        );
        
        ErrorLogger.logError(diagError);
        res.status(diagError.httpStatus).json(diagError.toJSON());
        return;
      }
    }

    // Validate image
    const validation = await imageValidator.validateImage(req.file.buffer, req.file.originalname);
    
    if (!validation.valid) {
      const error = new ImageValidationError(
        `Image validation failed: ${validation.errors.join(', ')}`,
        {
          errors: validation.errors,
          warnings: validation.warnings,
          metadata: validation.metadata,
        },
        {
          service: 'DiagnosisController',
          operation: 'createDiagnosis',
          requestId,
          userId,
        }
      );
      
      ErrorLogger.logError(error);
      res.status(error.httpStatus).json(error.toJSON());
      return;
    }

    // Call diagnosis service for full Nova Pro analysis
    const diagnosisResult = await diagnosisService.diagnose({
      userId,
      imageBuffer: req.file.buffer,
      originalFilename: req.file.originalname,
      cropHint: cropType,
      location,
      language,
      shareWithKisanMitra: true
    });

    const duration = Date.now() - startTime;
    
    // Log successful operation
    ErrorLogger.logInfo('Diagnosis created successfully', {
      service: 'DiagnosisController',
      operation: 'createDiagnosis',
      requestId,
      userId,
      diagnosisId: diagnosisResult.diagnosisId,
      duration,
    });

    // Map to controller response format
    const response: DiagnosisResponse = {
      diagnosisId: diagnosisResult.diagnosisId,
      cropType: diagnosisResult.cropType,
      cropLocalName: diagnosisResult.cropLocalName,
      diseases: diagnosisResult.diseases.map(d => ({
        name: d.name,
        localName: d.localName,
        scientificName: d.scientificName,
        type: d.type,
        severity: d.severity,
        confidence: d.confidence,
        affectedParts: d.affectedParts
      })),
      confidence: diagnosisResult.confidence,
      remedies: [
        ...diagnosisResult.remedies.chemical.map(r => ({
          type: 'chemical' as const,
          name: r.genericName,
          dosage: r.dosage,
          applicationMethod: r.applicationMethod,
          frequency: r.frequency
        })),
        ...diagnosisResult.remedies.organic.map(r => ({
          type: 'organic' as const,
          name: r.name,
          dosage: r.preparation?.join('; ') || 'As needed',
          applicationMethod: r.applicationMethod,
          frequency: r.frequency
        }))
      ],
      preventiveMeasures: diagnosisResult.remedies.preventive.map(p => p.description),
      expertReviewRequired: diagnosisResult.expertReviewRequired || false,
      imageUrl: diagnosisResult.imageUrl,
      timestamp: diagnosisResult.timestamp
    };

    res.status(201).json({
      success: true,
      data: response,
      requestId
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Handle DiagnosisError
    if (isDiagnosisError(error)) {
      ErrorLogger.logError(error, {
        service: 'DiagnosisController',
        operation: 'createDiagnosis',
        requestId,
        userId: req.user?.userId,
        duration,
      });
      
      res.status(error.httpStatus).json(error.toJSON());
      return;
    }
    
    // Handle generic errors
    const diagError = ErrorHandler.toDiagnosisError(
      error,
      DiagnosisErrorCode.INTERNAL_SERVER_ERROR,
      {
        service: 'DiagnosisController',
        operation: 'createDiagnosis',
        requestId,
        userId: req.user?.userId,
        duration,
      }
    );
    
    ErrorLogger.logError(diagError);
    res.status(diagError.httpStatus).json(diagError.toJSON());
  }
}

/**
 * GET /api/diagnosis/history
 * 
 * Get diagnosis history for authenticated user
 * 
 * Requirements:
 * - 14.3: JWT authentication required
 * - 7.4: Pagination support
 * - 7.7: Filtering by crop type, date range, confidence, expert review status
 */
async function getDiagnosisHistory(req: Request, res: Response): Promise<void> {
  const requestId = generateRequestId();
  
  try {
    const userId = req.user!.userId;
    
    // Parse pagination parameters
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100
    const skip = Math.max(parseInt(req.query.skip as string) || 0, 0);
    
    // Parse filter parameters
    const cropType = req.query.cropType as string;
    const minConfidence = req.query.minConfidence ? parseFloat(req.query.minConfidence as string) : undefined;
    const expertReviewed = req.query.expertReviewed === 'true' ? true : 
                          req.query.expertReviewed === 'false' ? false : undefined;
    
    // Parse date filters
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    
    if (req.query.startDate) {
      startDate = new Date(req.query.startDate as string);
      if (isNaN(startDate.getTime())) {
        res.status(400).json(
          createErrorResponse(
            'INVALID_DATE',
            'Invalid startDate format. Use ISO 8601 format.',
            false
          )
        );
        return;
      }
    }
    
    if (req.query.endDate) {
      endDate = new Date(req.query.endDate as string);
      if (isNaN(endDate.getTime())) {
        res.status(400).json(
          createErrorResponse(
            'INVALID_DATE',
            'Invalid endDate format. Use ISO 8601 format.',
            false
          )
        );
        return;
      }
    }

    // Import history manager
    const { historyManager } = await import('../services/history-manager.service');
    
    // Retrieve history with filters
    const diagnoses = await historyManager.getUserHistory(
      userId,
      {
        cropType,
        startDate,
        endDate,
        minConfidence,
        expertReviewed
      },
      {
        limit,
        skip
      }
    );
    
    res.status(200).json({
      success: true,
      data: {
        diagnoses,
        pagination: {
          limit,
          skip,
          count: diagnoses.length
        }
      },
      requestId
    });

  } catch (error) {
    console.error('[DiagnosisController] Error in getDiagnosisHistory:', error);
    res.status(500).json(
      createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to retrieve diagnosis history',
        true
      )
    );
  }
}

/**
 * GET /api/diagnosis/:id
 * 
 * Get specific diagnosis by ID
 * 
 * Requirements:
 * - 14.3: JWT authentication required
 * - Authorization: User can only access their own diagnoses
 */
async function getDiagnosisById(req: Request, res: Response): Promise<void> {
  const requestId = generateRequestId();
  
  try {
    const userId = req.user!.userId;
    const diagnosisId = req.params.id;

    // Import history manager
    const { historyManager } = await import('../services/history-manager.service');
    
    // Retrieve diagnosis
    const diagnosis = await historyManager.getDiagnosis(diagnosisId);
    
    if (!diagnosis) {
      res.status(404).json(
        createErrorResponse(
          'NOT_FOUND',
          'Diagnosis not found',
          false
        )
      );
      return;
    }
    
    // Verify user owns this diagnosis
    if (diagnosis.userId !== userId) {
      res.status(403).json(
        createErrorResponse(
          'FORBIDDEN',
          'You do not have permission to access this diagnosis',
          false
        )
      );
      return;
    }
    
    res.status(200).json({
      success: true,
      data: diagnosis,
      requestId
    });

  } catch (error) {
    console.error('[DiagnosisController] Error in getDiagnosisById:', error);
    res.status(500).json(
      createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to retrieve diagnosis',
        true
      )
    );
  }
}

/**
 * DELETE /api/diagnosis/:id
 * 
 * Delete diagnosis and associated image
 * 
 * Requirements:
 * - 14.3: JWT authentication required
 * - 14.5: Allow users to delete their diagnosis data
 * - 14.6: Remove both database record and S3 image
 */
async function deleteDiagnosis(req: Request, res: Response): Promise<void> {
  const requestId = generateRequestId();
  
  try {
    const userId = req.user!.userId;
    const diagnosisId = req.params.id;

    // Import history manager
    const { historyManager } = await import('../services/history-manager.service');
    
    // Delete diagnosis (includes authorization check)
    await historyManager.deleteDiagnosis(diagnosisId, userId);
    
    res.status(200).json({
      success: true,
      message: 'Diagnosis deleted successfully. Associated image will be removed within 24 hours.',
      requestId
    });

  } catch (error) {
    console.error('[DiagnosisController] Error in deleteDiagnosis:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        res.status(404).json(
          createErrorResponse(
            'NOT_FOUND',
            'Diagnosis not found',
            false
          )
        );
        return;
      }
      
      if (error.message.includes('Unauthorized')) {
        res.status(403).json(
          createErrorResponse(
            'FORBIDDEN',
            'You do not have permission to delete this diagnosis',
            false
          )
        );
        return;
      }
      
      if (error.message.includes('Invalid diagnosis ID')) {
        res.status(400).json(
          createErrorResponse(
            'INVALID_ID',
            'Invalid diagnosis ID format',
            false
          )
        );
        return;
      }
    }
    
    res.status(500).json(
      createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to delete diagnosis',
        true
      )
    );
  }
}

/**
 * POST /api/diagnosis/:id/feedback
 * 
 * Submit farmer feedback on diagnosis accuracy
 * 
 * Requirements:
 * - 14.3: JWT authentication required
 * - Allow farmers to provide feedback on diagnosis accuracy
 * - Store feedback for improving the system
 */
async function submitFeedback(req: Request, res: Response): Promise<void> {
  const requestId = generateRequestId();
  
  try {
    const userId = req.user!.userId;
    const diagnosisId = req.params.id;
    
    // Validate request body
    const { accurate, actualDisease, comments } = req.body;
    
    if (typeof accurate !== 'boolean') {
      res.status(400).json(
        createErrorResponse(
          'INVALID_INPUT',
          'Field "accurate" is required and must be a boolean',
          false
        )
      );
      return;
    }
    
    // Import history manager
    const { historyManager } = await import('../services/history-manager.service');
    
    // Get diagnosis to verify ownership
    const diagnosis = await historyManager.getDiagnosis(diagnosisId);
    
    if (!diagnosis) {
      res.status(404).json(
        createErrorResponse(
          'NOT_FOUND',
          'Diagnosis not found',
          false
        )
      );
      return;
    }
    
    // Verify user owns this diagnosis
    if (diagnosis.userId !== userId) {
      res.status(403).json(
        createErrorResponse(
          'FORBIDDEN',
          'You do not have permission to provide feedback for this diagnosis',
          false
        )
      );
      return;
    }
    
    // Update feedback
    await historyManager.updateFeedback(diagnosisId, {
      accurate,
      actualDisease,
      comments,
      submittedAt: new Date()
    });
    
    res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully. Thank you for helping us improve!',
      requestId
    });

  } catch (error) {
    console.error('[DiagnosisController] Error in submitFeedback:', error);
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('Invalid diagnosis ID')) {
        res.status(400).json(
          createErrorResponse(
            'INVALID_ID',
            'Invalid diagnosis ID format',
            false
          )
        );
        return;
      }
    }
    
    res.status(500).json(
      createErrorResponse(
        'INTERNAL_ERROR',
        'Failed to submit feedback',
        true
      )
    );
  }
}

// ============================================================================
// ROUTER SETUP
// ============================================================================

const router = Router();

// PUBLIC ENDPOINT FOR TESTING (NO AUTH REQUIRED)
// Only available in non-production environments for performance testing
if (process.env.NODE_ENV !== 'production') {
  router.post(
    '/test',
    upload.single('image'),
    async (req: Request, res: Response) => {
      // Mock user for testing
      req.user = {
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'farmer'
      } as any;
      
      await createDiagnosis(req, res);
    }
  );
  console.log('✓ Test endpoint enabled at POST /api/diagnosis/test (no auth required)');
}

// Apply authentication to all routes below
router.use(requireAuth);

// POST /api/diagnosis - Create new diagnosis
router.post(
  '/',
  rateLimitMiddleware,
  upload.single('image'),
  createDiagnosis
);

// GET /api/diagnosis/history - Get diagnosis history
router.get('/history', getDiagnosisHistory);

// GET /api/diagnosis/:id - Get specific diagnosis
router.get('/:id', getDiagnosisById);

// DELETE /api/diagnosis/:id - Delete diagnosis
router.delete('/:id', deleteDiagnosis);

// POST /api/diagnosis/:id - Submit feedback
router.post('/:id/feedback', submitFeedback);

// ============================================================================
// EXPORTS
// ============================================================================

export const diagnosisController = router;
export { RateLimiter }; // Export for testing
