/**
 * Unit Tests: Kisan Mitra Integration Service
 * 
 * Tests the integration between Crop Diagnosis and Kisan Mitra chat.
 * 
 * Requirements:
 * - 15.1: Diagnosis accessible from Kisan Mitra chat interface
 * - 15.2: Allow follow-up questions via Kisan Mitra chat
 * - 15.3: Share diagnosis context with Kisan Mitra
 * - 15.6: Maintain consistent language settings
 */

import { MongoClient, Db, Collection } from 'mongodb';
import {
  KisanMitraIntegrationService,
  DiagnosisContext,
  generateDiagnosisSummary
} from '../kisan-mitra-integration.service';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('mongodb');

describe('KisanMitraIntegrationService', () => {
  let service: KisanMitraIntegrationService;
  let mockDb: jest.Mocked<Db>;
  let mockCollection: jest.Mocked<Collection>;
  let mockMongoClient: jest.Mocked<MongoClient>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock collection
    mockCollection = {
      insertOne: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      deleteMany: jest.fn(),
      createIndex: jest.fn()
    } as any;

    // Create mock database
    mockDb = {
      collection: jest.fn().mockReturnValue(mockCollection)
    } as any;

    // Create mock MongoDB client
    mockMongoClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      db: jest.fn().mockReturnValue(mockDb),
      close: jest.fn().mockResolvedValue(undefined)
    } as any;

    // Mock MongoClient constructor
    (MongoClient as jest.MockedClass<typeof MongoClient>).mockImplementation(
      () => mockMongoClient
    );

    // Create service instance
    service = new KisanMitraIntegrationService();
  });

  afterEach(async () => {
    await service.close();
  });

  // ==========================================================================
  // ADD CONTEXT TESTS
  // ==========================================================================

  describe('addContext', () => {
    it('should store diagnosis context in MongoDB', async () => {
      // Arrange
      const context: DiagnosisContext = {
        diagnosisId: 'diag-123',
        userId: 'user-456',
        sessionId: 'session-789',
        cropType: 'Tomato',
        diseases: [
          {
            name: 'Late Blight',
            scientificName: 'Phytophthora infestans',
            type: 'fungal',
            severity: 'high',
            confidence: 85
          }
        ],
        confidence: 85,
        language: 'en',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        summary: 'Tomato: Late Blight (high severity, 85% confidence)'
      };

      mockCollection.insertOne.mockResolvedValue({ acknowledged: true } as any);

      // Act
      await service.addContext(context);

      // Assert
      expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);
      const insertedDoc = mockCollection.insertOne.mock.calls[0][0];
      expect(insertedDoc).toMatchObject({
        diagnosisId: 'diag-123',
        userId: 'user-456',
        sessionId: 'session-789',
        cropType: 'Tomato',
        diseases: context.diseases,
        confidence: 85,
        language: 'en',
        summary: context.summary
      });
      expect(insertedDoc.expiresAt).toBeInstanceOf(Date);
      expect(insertedDoc.createdAt).toBeInstanceOf(Date);
      expect(insertedDoc.updatedAt).toBeInstanceOf(Date);
    });

    it('should set expiry time to 24 hours from now', async () => {
      // Arrange
      const context: DiagnosisContext = {
        diagnosisId: 'diag-123',
        userId: 'user-456',
        cropType: 'Wheat',
        diseases: [],
        confidence: 90,
        language: 'hi',
        timestamp: new Date(),
        summary: 'Wheat: No diseases detected'
      };

      mockCollection.insertOne.mockResolvedValue({ acknowledged: true } as any);

      const beforeTime = new Date();
      beforeTime.setHours(beforeTime.getHours() + 24);

      // Act
      await service.addContext(context);

      // Assert
      const insertedDoc = mockCollection.insertOne.mock.calls[0][0];
      const expiresAt = insertedDoc.expiresAt;
      const afterTime = new Date();
      afterTime.setHours(afterTime.getHours() + 24);

      // Expiry should be approximately 24 hours from now (within 1 minute tolerance)
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime() - 60000);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(afterTime.getTime() + 60000);
    });

    it('should throw error if MongoDB operation fails', async () => {
      // Arrange
      const context: DiagnosisContext = {
        diagnosisId: 'diag-123',
        userId: 'user-456',
        cropType: 'Rice',
        diseases: [],
        confidence: 80,
        language: 'en',
        timestamp: new Date(),
        summary: 'Rice: No diseases detected'
      };

      mockCollection.insertOne.mockRejectedValue(new Error('MongoDB connection failed'));

      // Act & Assert
      await expect(service.addContext(context)).rejects.toThrow(
        'Failed to share diagnosis context with Kisan Mitra'
      );
    });
  });

  // ==========================================================================
  // GET CONTEXT BY DIAGNOSIS ID TESTS
  // ==========================================================================

  describe('getContextByDiagnosisId', () => {
    it('should retrieve context by diagnosis ID', async () => {
      // Arrange
      const storedContext = {
        diagnosisId: 'diag-123',
        userId: 'user-456',
        sessionId: 'session-789',
        cropType: 'Tomato',
        diseases: [
          {
            name: 'Early Blight',
            scientificName: 'Alternaria solani',
            type: 'fungal',
            severity: 'medium',
            confidence: 82
          }
        ],
        confidence: 82,
        language: 'en',
        timestamp: new Date('2024-01-15T10:00:00Z'),
        summary: 'Tomato: Early Blight (medium severity, 82% confidence)',
        expiresAt: new Date('2024-01-16T10:00:00Z')
      };

      mockCollection.findOne.mockResolvedValue(storedContext);

      // Act
      const result = await service.getContextByDiagnosisId('diag-123');

      // Assert
      expect(result.found).toBe(true);
      expect(result.context).toMatchObject({
        diagnosisId: 'diag-123',
        userId: 'user-456',
        sessionId: 'session-789',
        cropType: 'Tomato',
        confidence: 82,
        language: 'en'
      });
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        diagnosisId: 'diag-123',
        expiresAt: { $gt: expect.any(Date) }
      });
    });

    it('should return not found if context does not exist', async () => {
      // Arrange
      mockCollection.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getContextByDiagnosisId('nonexistent');

      // Assert
      expect(result.found).toBe(false);
      expect(result.message).toBe('Diagnosis context not found or has expired');
      expect(result.context).toBeUndefined();
    });

    it('should return not found if context has expired', async () => {
      // Arrange
      mockCollection.findOne.mockResolvedValue(null); // Expired contexts are filtered by query

      // Act
      const result = await service.getContextByDiagnosisId('diag-expired');

      // Assert
      expect(result.found).toBe(false);
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        diagnosisId: 'diag-expired',
        expiresAt: { $gt: expect.any(Date) }
      });
    });

    it('should handle MongoDB errors gracefully', async () => {
      // Arrange
      mockCollection.findOne.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.getContextByDiagnosisId('diag-123');

      // Assert
      expect(result.found).toBe(false);
      expect(result.message).toBe('Failed to retrieve diagnosis context');
    });
  });

  // ==========================================================================
  // GET LATEST CONTEXT FOR USER TESTS
  // ==========================================================================

  describe('getLatestContextForUser', () => {
    it('should retrieve most recent context for user', async () => {
      // Arrange
      const storedContext = {
        diagnosisId: 'diag-latest',
        userId: 'user-456',
        cropType: 'Wheat',
        diseases: [],
        confidence: 90,
        language: 'hi',
        timestamp: new Date('2024-01-15T12:00:00Z'),
        summary: 'Wheat: No diseases detected',
        expiresAt: new Date('2024-01-16T12:00:00Z')
      };

      mockCollection.findOne.mockResolvedValue(storedContext);

      // Act
      const result = await service.getLatestContextForUser('user-456');

      // Assert
      expect(result.found).toBe(true);
      expect(result.context?.diagnosisId).toBe('diag-latest');
      expect(mockCollection.findOne).toHaveBeenCalledWith(
        {
          userId: 'user-456',
          expiresAt: { $gt: expect.any(Date) }
        },
        {
          sort: { timestamp: -1 }
        }
      );
    });

    it('should return not found if user has no recent diagnoses', async () => {
      // Arrange
      mockCollection.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getLatestContextForUser('user-new');

      // Assert
      expect(result.found).toBe(false);
      expect(result.message).toBe('No recent diagnosis found for this user');
    });
  });

  // ==========================================================================
  // GET CONTEXT BY SESSION ID TESTS
  // ==========================================================================

  describe('getContextBySessionId', () => {
    it('should retrieve context by session ID', async () => {
      // Arrange
      const storedContext = {
        diagnosisId: 'diag-123',
        userId: 'user-456',
        sessionId: 'session-789',
        cropType: 'Rice',
        diseases: [],
        confidence: 88,
        language: 'ta',
        timestamp: new Date('2024-01-15T11:00:00Z'),
        summary: 'Rice: No diseases detected',
        expiresAt: new Date('2024-01-16T11:00:00Z')
      };

      mockCollection.findOne.mockResolvedValue(storedContext);

      // Act
      const result = await service.getContextBySessionId('session-789');

      // Assert
      expect(result.found).toBe(true);
      expect(result.context?.sessionId).toBe('session-789');
      expect(mockCollection.findOne).toHaveBeenCalledWith(
        {
          sessionId: 'session-789',
          expiresAt: { $gt: expect.any(Date) }
        },
        {
          sort: { timestamp: -1 }
        }
      );
    });

    it('should return not found if session has no diagnosis context', async () => {
      // Arrange
      mockCollection.findOne.mockResolvedValue(null);

      // Act
      const result = await service.getContextBySessionId('session-new');

      // Assert
      expect(result.found).toBe(false);
      expect(result.message).toBe('No diagnosis context found for this session');
    });
  });

  // ==========================================================================
  // UPDATE SESSION ID TESTS
  // ==========================================================================

  describe('updateSessionId', () => {
    it('should update session ID for a diagnosis', async () => {
      // Arrange
      mockCollection.updateOne.mockResolvedValue({ acknowledged: true } as any);

      // Act
      await service.updateSessionId('diag-123', 'new-session-456');

      // Assert
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { diagnosisId: 'diag-123' },
        {
          $set: {
            sessionId: 'new-session-456',
            updatedAt: expect.any(Date)
          }
        }
      );
    });

    it('should throw error if update fails', async () => {
      // Arrange
      mockCollection.updateOne.mockRejectedValue(new Error('Update failed'));

      // Act & Assert
      await expect(
        service.updateSessionId('diag-123', 'session-456')
      ).rejects.toThrow('Failed to update session ID');
    });
  });

  // ==========================================================================
  // CLEANUP EXPIRED CONTEXTS TESTS
  // ==========================================================================

  describe('cleanupExpiredContexts', () => {
    it('should delete expired contexts', async () => {
      // Arrange
      mockCollection.deleteMany.mockResolvedValue({ deletedCount: 5 } as any);

      // Act
      const count = await service.cleanupExpiredContexts();

      // Assert
      expect(count).toBe(5);
      expect(mockCollection.deleteMany).toHaveBeenCalledWith({
        expiresAt: { $lt: expect.any(Date) }
      });
    });

    it('should return 0 if cleanup fails', async () => {
      // Arrange
      mockCollection.deleteMany.mockRejectedValue(new Error('Cleanup failed'));

      // Act
      const count = await service.cleanupExpiredContexts();

      // Assert
      expect(count).toBe(0);
    });
  });

  // ==========================================================================
  // ENSURE INDEXES TESTS
  // ==========================================================================

  describe('ensureIndexes', () => {
    it('should create all required indexes', async () => {
      // Arrange
      mockCollection.createIndex.mockResolvedValue('index_name' as any);

      // Act
      await service.ensureIndexes();

      // Assert
      expect(mockCollection.createIndex).toHaveBeenCalledTimes(4);
      
      // TTL index
      expect(mockCollection.createIndex).toHaveBeenCalledWith(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
      );
      
      // Diagnosis ID index
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ diagnosisId: 1 });
      
      // User ID index
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ userId: 1, timestamp: -1 });
      
      // Session ID index
      expect(mockCollection.createIndex).toHaveBeenCalledWith({ sessionId: 1, timestamp: -1 });
    });

    it('should handle index creation errors gracefully', async () => {
      // Arrange
      mockCollection.createIndex.mockRejectedValue(new Error('Index creation failed'));

      // Act & Assert - should not throw
      await expect(service.ensureIndexes()).resolves.toBeUndefined();
    });
  });
});

// ============================================================================
// HELPER FUNCTION TESTS
// ============================================================================

describe('generateDiagnosisSummary', () => {
  it('should generate summary for diagnosis with diseases (English)', () => {
    // Arrange
    const diseases = [
      { name: 'Late Blight', severity: 'high' },
      { name: 'Early Blight', severity: 'medium' }
    ];

    // Act
    const summary = generateDiagnosisSummary('Tomato', diseases, 85, 'en');

    // Assert
    expect(summary).toBe('Tomato: Late Blight, Early Blight (high severity, 85% confidence)');
  });

  it('should generate summary for diagnosis with no diseases (English)', () => {
    // Act
    const summary = generateDiagnosisSummary('Wheat', [], 92, 'en');

    // Assert
    expect(summary).toBe('No diseases detected in Wheat (92% confidence)');
  });

  it('should generate summary for diagnosis with diseases (Hindi)', () => {
    // Arrange
    const diseases = [
      { name: 'Powdery Mildew', severity: 'low' }
    ];

    // Act
    const summary = generateDiagnosisSummary('Wheat', diseases, 78, 'hi');

    // Assert
    expect(summary).toBe('Wheat: Powdery Mildew (low गंभीरता, 78% विश्वास)');
  });

  it('should generate summary for diagnosis with no diseases (Hindi)', () => {
    // Act
    const summary = generateDiagnosisSummary('Rice', [], 88, 'hi');

    // Assert
    expect(summary).toBe('Rice में कोई बीमारी नहीं मिली (88% विश्वास)');
  });

  it('should handle single disease', () => {
    // Arrange
    const diseases = [
      { name: 'Bacterial Wilt', severity: 'high' }
    ];

    // Act
    const summary = generateDiagnosisSummary('Tomato', diseases, 90, 'en');

    // Assert
    expect(summary).toBe('Tomato: Bacterial Wilt (high severity, 90% confidence)');
  });
});
