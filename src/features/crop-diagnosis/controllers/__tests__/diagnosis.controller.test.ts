/**
 * Diagnosis Controller Unit Tests
 * 
 * Tests for the Diagnosis API controller.
 * 
 * Requirements:
 * - 14.3: JWT authentication requirement
 * - 14.7: Rate limiting (10 requests/hour per user)
 * - Multipart form-data parsing
 * - Error response formatting
 */

import request from 'supertest';
import express, { Express } from 'express';
import { diagnosisController, RateLimiter } from '../diagnosis.controller';
import * as authService from '../../../profile/services/auth.service';

// ============================================================================
// TEST SETUP
// ============================================================================

let app: Express;

beforeAll(() => {
  // Create test Express app
  app = express();
  app.use(express.json());
  app.use('/api/diagnosis', diagnosisController);
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a valid JWT token for testing
 */
function generateTestToken(userId: string = 'test-user-123'): string {
  return authService.generateToken({
    userId,
    phoneNumber: '+919876543210',
    role: 'farmer'
  });
}

/**
 * Create a mock image buffer
 */
function createMockImageBuffer(sizeKB: number = 500): Buffer {
  return Buffer.alloc(sizeKB * 1024, 0xFF);
}

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================

describe('Diagnosis Controller - Authentication', () => {
  test('should reject requests without JWT token (401)', async () => {
    const response = await request(app)
      .post('/api/diagnosis')
      .attach('image', createMockImageBuffer(), 'test.jpg');

    expect(response.status).toBe(401);
    expect(response.body.error).toBeDefined();
    expect(response.body.error.code).toBe('No authorization header provided');
  });

  test('should reject requests with invalid JWT token (401)', async () => {
    const response = await request(app)
      .post('/api/diagnosis')
      .set('Authorization', 'Bearer invalid-token')
      .attach('image', createMockImageBuffer(), 'test.jpg');

    expect(response.status).toBe(401);
    expect(response.body.error).toBeDefined();
  });

  test('should accept requests with valid JWT token', async () => {
    const token = generateTestToken();
    
    const response = await request(app)
      .post('/api/diagnosis')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', createMockImageBuffer(), 'test.jpg');

    // Should not be 401 (may be other errors like validation)
    expect(response.status).not.toBe(401);
  });
});

// ============================================================================
// RATE LIMITING TESTS
// ============================================================================

describe('Diagnosis Controller - Rate Limiting', () => {
  test('should allow up to 10 requests per hour', async () => {
    const token = generateTestToken('rate-limit-test-user');
    
    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      const response = await request(app)
        .post('/api/diagnosis')
        .set('Authorization', `Bearer ${token}`)
        .attach('image', createMockImageBuffer(), 'test.jpg');

      // Should not be rate limited
      expect(response.status).not.toBe(429);
    }
  });

  test('should reject 11th request with 429 status', async () => {
    const token = generateTestToken('rate-limit-test-user-2');
    
    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/diagnosis')
        .set('Authorization', `Bearer ${token}`)
        .attach('image', createMockImageBuffer(), 'test.jpg');
    }

    // 11th request should be rate limited
    const response = await request(app)
      .post('/api/diagnosis')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', createMockImageBuffer(), 'test.jpg');

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(response.body.error.details).toBeDefined();
    expect(response.body.error.details.limit).toBe(10);
  });

  test('should include rate limit headers in response', async () => {
    const token = generateTestToken('rate-limit-headers-test');
    
    const response = await request(app)
      .post('/api/diagnosis')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', createMockImageBuffer(), 'test.jpg');

    expect(response.headers['x-ratelimit-limit']).toBe('10');
    expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    expect(response.headers['x-ratelimit-reset']).toBeDefined();
  });
});

// ============================================================================
// MULTIPART PARSING TESTS
// ============================================================================

describe('Diagnosis Controller - Multipart Parsing', () => {
  test('should reject requests without image file', async () => {
    const token = generateTestToken();
    
    const response = await request(app)
      .post('/api/diagnosis')
      .set('Authorization', `Bearer ${token}`)
      .field('cropType', 'tomato');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('MISSING_IMAGE');
  });

  test('should accept requests with image file', async () => {
    const token = generateTestToken();
    
    const response = await request(app)
      .post('/api/diagnosis')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', createMockImageBuffer(), 'test.jpg');

    // Should not be 400 for missing image
    expect(response.body.error?.code).not.toBe('MISSING_IMAGE');
  });

  test('should parse optional cropType field', async () => {
    const token = generateTestToken();
    
    const response = await request(app)
      .post('/api/diagnosis')
      .set('Authorization', `Bearer ${token}`)
      .field('cropType', 'tomato')
      .attach('image', createMockImageBuffer(), 'test.jpg');

    // Request should be processed (may fail at other stages)
    expect(response.body.error?.code).not.toBe('MISSING_IMAGE');
  });

  test('should parse optional location field', async () => {
    const token = generateTestToken();
    const location = JSON.stringify({
      latitude: 28.6139,
      longitude: 77.2090,
      state: 'Delhi'
    });
    
    const response = await request(app)
      .post('/api/diagnosis')
      .set('Authorization', `Bearer ${token}`)
      .field('location', location)
      .attach('image', createMockImageBuffer(), 'test.jpg');

    // Request should be processed
    expect(response.body.error?.code).not.toBe('MISSING_IMAGE');
  });

  test('should reject invalid location JSON', async () => {
    const token = generateTestToken();
    
    const response = await request(app)
      .post('/api/diagnosis')
      .set('Authorization', `Bearer ${token}`)
      .field('location', 'invalid-json')
      .attach('image', createMockImageBuffer(), 'test.jpg');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_LOCATION');
  });
});

// ============================================================================
// ERROR RESPONSE FORMAT TESTS
// ============================================================================

describe('Diagnosis Controller - Error Response Format', () => {
  test('should return consistent error format', async () => {
    const response = await request(app)
      .post('/api/diagnosis')
      .attach('image', createMockImageBuffer(), 'test.jpg');

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toHaveProperty('code');
    expect(response.body.error).toHaveProperty('message');
    expect(response.body.error).toHaveProperty('retryable');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('requestId');
  });

  test('error code should be a string', async () => {
    const response = await request(app)
      .post('/api/diagnosis')
      .attach('image', createMockImageBuffer(), 'test.jpg');

    expect(typeof response.body.error.code).toBe('string');
  });

  test('error message should be descriptive', async () => {
    const response = await request(app)
      .post('/api/diagnosis')
      .attach('image', createMockImageBuffer(), 'test.jpg');

    expect(response.body.error.message).toBeTruthy();
    expect(response.body.error.message.length).toBeGreaterThan(0);
  });

  test('retryable flag should be boolean', async () => {
    const response = await request(app)
      .post('/api/diagnosis')
      .attach('image', createMockImageBuffer(), 'test.jpg');

    expect(typeof response.body.error.retryable).toBe('boolean');
  });
});

// ============================================================================
// RATE LIMITER UNIT TESTS
// ============================================================================

describe('RateLimiter - Unit Tests', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
  });

  test('should not rate limit first request', () => {
    expect(rateLimiter.isRateLimited('user1')).toBe(false);
  });

  test('should track requests correctly', () => {
    rateLimiter.recordRequest('user1');
    expect(rateLimiter.getRemainingRequests('user1')).toBe(9);
  });

  test('should rate limit after 10 requests', () => {
    for (let i = 0; i < 10; i++) {
      rateLimiter.recordRequest('user1');
    }
    expect(rateLimiter.isRateLimited('user1')).toBe(true);
  });

  test('should track different users separately', () => {
    for (let i = 0; i < 10; i++) {
      rateLimiter.recordRequest('user1');
    }
    expect(rateLimiter.isRateLimited('user1')).toBe(true);
    expect(rateLimiter.isRateLimited('user2')).toBe(false);
  });

  test('should return correct remaining requests', () => {
    rateLimiter.recordRequest('user1');
    rateLimiter.recordRequest('user1');
    rateLimiter.recordRequest('user1');
    expect(rateLimiter.getRemainingRequests('user1')).toBe(7);
  });

  test('should return reset time when rate limited', () => {
    for (let i = 0; i < 10; i++) {
      rateLimiter.recordRequest('user1');
    }
    const resetTime = rateLimiter.getResetTime('user1');
    expect(resetTime).toBeGreaterThan(0);
  });
});

// ============================================================================
// HISTORY ENDPOINTS TESTS
// ============================================================================

describe('Diagnosis Controller - History Endpoints', () => {
  describe('GET /api/diagnosis/history', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/diagnosis/history');

      expect(response.status).toBe(401);
    });

    test('should return diagnosis history with default pagination', async () => {
      const token = generateTestToken();
      
      const response = await request(app)
        .get('/api/diagnosis/history')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.diagnoses).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.limit).toBe(20); // Default limit
      expect(response.body.data.pagination.skip).toBe(0); // Default skip
    });

    test('should accept custom pagination parameters', async () => {
      const token = generateTestToken();
      
      const response = await request(app)
        .get('/api/diagnosis/history?limit=10&skip=5')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.limit).toBe(10);
      expect(response.body.data.pagination.skip).toBe(5);
    });

    test('should limit maximum page size to 100', async () => {
      const token = generateTestToken();
      
      const response = await request(app)
        .get('/api/diagnosis/history?limit=200')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.limit).toBe(100); // Capped at 100
    });

    test('should accept cropType filter', async () => {
      const token = generateTestToken();
      
      const response = await request(app)
        .get('/api/diagnosis/history?cropType=tomato')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    test('should accept date range filters', async () => {
      const token = generateTestToken();
      const startDate = new Date('2024-01-01').toISOString();
      const endDate = new Date('2024-12-31').toISOString();
      
      const response = await request(app)
        .get(`/api/diagnosis/history?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    test('should reject invalid startDate format', async () => {
      const token = generateTestToken();
      
      const response = await request(app)
        .get('/api/diagnosis/history?startDate=invalid-date')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_DATE');
    });

    test('should reject invalid endDate format', async () => {
      const token = generateTestToken();
      
      const response = await request(app)
        .get('/api/diagnosis/history?endDate=invalid-date')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_DATE');
    });

    test('should accept minConfidence filter', async () => {
      const token = generateTestToken();
      
      const response = await request(app)
        .get('/api/diagnosis/history?minConfidence=80')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    test('should accept expertReviewed filter', async () => {
      const token = generateTestToken();
      
      const response = await request(app)
        .get('/api/diagnosis/history?expertReviewed=true')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });

    test('should accept multiple filters combined', async () => {
      const token = generateTestToken();
      const startDate = new Date('2024-01-01').toISOString();
      
      const response = await request(app)
        .get(`/api/diagnosis/history?cropType=tomato&startDate=${startDate}&minConfidence=80&limit=10`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
    });
  });

  describe('GET /api/diagnosis/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/diagnosis/test-id-123');

      expect(response.status).toBe(401);
    });

    test('should return 404 for non-existent diagnosis', async () => {
      const token = generateTestToken();
      
      const response = await request(app)
        .get('/api/diagnosis/507f1f77bcf86cd799439011') // Valid ObjectId format
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    test('should return 404 for invalid diagnosis ID format', async () => {
      const token = generateTestToken();
      
      const response = await request(app)
        .get('/api/diagnosis/invalid-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/diagnosis/:id', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/diagnosis/test-id-123');

      expect(response.status).toBe(401);
    });

    test('should return 404 for non-existent diagnosis', async () => {
      const token = generateTestToken();
      
      const response = await request(app)
        .delete('/api/diagnosis/507f1f77bcf86cd799439011') // Valid ObjectId format
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    test('should return 400 for invalid diagnosis ID format', async () => {
      const token = generateTestToken();
      
      const response = await request(app)
        .delete('/api/diagnosis/invalid-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    });
  });

  describe('POST /api/diagnosis/:id/feedback', () => {
    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/diagnosis/test-id-123/feedback')
        .send({ accurate: true });

      expect(response.status).toBe(401);
    });

    test('should require accurate field', async () => {
      const token = generateTestToken();
      
      const response = await request(app)
        .post('/api/diagnosis/507f1f77bcf86cd799439011/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_INPUT');
    });

    test('should require accurate to be boolean', async () => {
      const token = generateTestToken();
      
      const response = await request(app)
        .post('/api/diagnosis/507f1f77bcf86cd799439011/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({ accurate: 'yes' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_INPUT');
    });

    test('should accept valid feedback with accurate=true', async () => {
      const token = generateTestToken();
      
      const response = await request(app)
        .post('/api/diagnosis/507f1f77bcf86cd799439011/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({ accurate: true });

      // Will be 404 since diagnosis doesn't exist, but validates input
      expect(response.status).not.toBe(400);
    });

    test('should accept valid feedback with accurate=false and actualDisease', async () => {
      const token = generateTestToken();
      
      const response = await request(app)
        .post('/api/diagnosis/507f1f77bcf86cd799439011/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({
          accurate: false,
          actualDisease: 'Late Blight',
          comments: 'The diagnosis was incorrect'
        });

      // Will be 404 since diagnosis doesn't exist, but validates input
      expect(response.status).not.toBe(400);
    });

    test('should return 404 for non-existent diagnosis', async () => {
      const token = generateTestToken();
      
      const response = await request(app)
        .post('/api/diagnosis/507f1f77bcf86cd799439011/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({ accurate: true });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    test('should return 400 for invalid diagnosis ID format', async () => {
      const token = generateTestToken();
      
      const response = await request(app)
        .post('/api/diagnosis/invalid-id/feedback')
        .set('Authorization', `Bearer ${token}`)
        .send({ accurate: true });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_ID');
    });
  });
});

