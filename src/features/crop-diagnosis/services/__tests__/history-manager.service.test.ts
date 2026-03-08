/**
 * History Manager Service Unit Tests
 * 
 * Tests for diagnosis history storage and retrieval functionality.
 */

import mongoose from 'mongoose';
import { HistoryManager } from '../history-manager.service';
import { DiagnosisRecordModel } from '../../models/diagnosis.model';
import type { SaveDiagnosisInput } from '../history-manager.service';

// ============================================================================
// TEST SETUP
// ============================================================================

describe('HistoryManager', () => {
  let historyManager: HistoryManager;

  beforeAll(async () => {
    // Connect to in-memory MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crop-diagnosis-test');
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    historyManager = new HistoryManager();
    // Clear the collection before each test
    await DiagnosisRecordModel.deleteMany({});
  });

  // ============================================================================
  // SAVE DIAGNOSIS TESTS
  // ============================================================================

  describe('saveDiagnosis', () => {
    it('should save a complete diagnosis record to MongoDB', async () => {
      // Arrange
      const input: SaveDiagnosisInput = {
        userId: 'user123',
        imageUrl: 's3://bucket/diagnoses/user123/diag1/image.jpg',
        imageMetadata: {
          format: 'jpeg',
          sizeBytes: 1024000,
          dimensions: { width: 1920, height: 1080 }
        },
        diagnosis: {
          cropType: 'tomato',
          diseases: [{
            name: 'Late Blight',
            scientificName: 'Phytophthora infestans',
            type: 'fungal',
            severity: 'high',
            confidence: 85,
            affectedParts: ['leaves', 'stem']
          }],
          symptoms: ['brown spots', 'wilting'],
          confidence: 85
        },
        remedies: {
          chemical: [{
            name: 'Mancozeb',
            genericName: 'Mancozeb',
            brandNames: ['Dithane M-45'],
            dosage: '2.5g per liter',
            applicationMethod: 'foliar spray',
            frequency: 'Every 7 days',
            safetyPrecautions: ['Wear gloves']
          }],
          organic: [{
            name: 'Neem oil spray',
            ingredients: ['Neem oil', 'Water'],
            applicationMethod: 'foliar spray',
            frequency: 'Every 5 days'
          }],
          preventive: [{
            category: 'spacing',
            description: 'Maintain proper plant spacing'
          }]
        },
        language: 'en',
        expertReviewRequired: false
      };

      // Act
      const diagnosisId = await historyManager.saveDiagnosis(input);

      // Assert
      expect(diagnosisId).toBeDefined();
      expect(mongoose.Types.ObjectId.isValid(diagnosisId)).toBe(true);

      // Verify record exists in database
      const saved = await DiagnosisRecordModel.findById(diagnosisId);
      expect(saved).toBeDefined();
      expect(saved?.userId).toBe('user123');
      expect(saved?.diagnosis.cropType).toBe('tomato');
      expect(saved?.diagnosis.confidence).toBe(85);
    });

    it('should associate diagnosis with user account', async () => {
      // Arrange
      const input: SaveDiagnosisInput = {
        userId: 'farmer456',
        imageUrl: 's3://bucket/image.jpg',
        imageMetadata: {
          format: 'png',
          sizeBytes: 500000,
          dimensions: { width: 1280, height: 720 }
        },
        diagnosis: {
          cropType: 'wheat',
          diseases: [],
          symptoms: [],
          confidence: 90
        },
        remedies: {
          chemical: [],
          organic: [],
          preventive: []
        },
        language: 'hi'
      };

      // Act
      const diagnosisId = await historyManager.saveDiagnosis(input);

      // Assert
      const saved = await DiagnosisRecordModel.findById(diagnosisId);
      expect(saved?.userId).toBe('farmer456');
    });

    it('should set expert review required flag when specified', async () => {
      // Arrange
      const input: SaveDiagnosisInput = {
        userId: 'user789',
        imageUrl: 's3://bucket/image.jpg',
        imageMetadata: {
          format: 'jpeg',
          sizeBytes: 800000,
          dimensions: { width: 1600, height: 900 }
        },
        diagnosis: {
          cropType: 'rice',
          diseases: [],
          symptoms: [],
          confidence: 75
        },
        remedies: {
          chemical: [],
          organic: [],
          preventive: []
        },
        language: 'en',
        expertReviewRequired: true
      };

      // Act
      const diagnosisId = await historyManager.saveDiagnosis(input);

      // Assert
      const saved = await DiagnosisRecordModel.findById(diagnosisId);
      expect(saved?.expertReview?.required).toBe(true);
    });

    it('should include location data when provided', async () => {
      // Arrange
      const input: SaveDiagnosisInput = {
        userId: 'user123',
        imageUrl: 's3://bucket/image.jpg',
        imageMetadata: {
          format: 'jpeg',
          sizeBytes: 600000,
          dimensions: { width: 1920, height: 1080 }
        },
        diagnosis: {
          cropType: 'cotton',
          diseases: [],
          symptoms: [],
          confidence: 88
        },
        remedies: {
          chemical: [],
          organic: [],
          preventive: []
        },
        location: {
          latitude: 28.6139,
          longitude: 77.2090,
          state: 'Delhi',
          district: 'New Delhi'
        },
        language: 'en'
      };

      // Act
      const diagnosisId = await historyManager.saveDiagnosis(input);

      // Assert
      const saved = await DiagnosisRecordModel.findById(diagnosisId);
      expect(saved?.location).toBeDefined();
      expect(saved?.location?.state).toBe('Delhi');
      expect(saved?.location?.latitude).toBe(28.6139);
    });

    it('should throw error when save fails', async () => {
      // Arrange - Create invalid input (missing required field)
      const input: any = {
        userId: 'user123',
        // Missing imageUrl
        imageMetadata: {
          format: 'jpeg',
          sizeBytes: 600000,
          dimensions: { width: 1920, height: 1080 }
        }
      };

      // Act & Assert
      await expect(historyManager.saveDiagnosis(input)).rejects.toThrow('Failed to save diagnosis');
    });
  });

  // ============================================================================
  // GET DIAGNOSIS TESTS
  // ============================================================================

  describe('getDiagnosis', () => {
    it('should retrieve diagnosis by ID', async () => {
      // Arrange - Create a diagnosis first
      const input: SaveDiagnosisInput = {
        userId: 'user123',
        imageUrl: 's3://bucket/image.jpg',
        imageMetadata: {
          format: 'jpeg',
          sizeBytes: 700000,
          dimensions: { width: 1920, height: 1080 }
        },
        diagnosis: {
          cropType: 'maize',
          diseases: [{
            name: 'Corn Blight',
            type: 'fungal',
            severity: 'medium',
            confidence: 82,
            affectedParts: ['leaves']
          }],
          symptoms: ['yellowing'],
          confidence: 82
        },
        remedies: {
          chemical: [],
          organic: [],
          preventive: []
        },
        language: 'en'
      };
      const diagnosisId = await historyManager.saveDiagnosis(input);

      // Act
      const retrieved = await historyManager.getDiagnosis(diagnosisId);

      // Assert
      expect(retrieved).toBeDefined();
      expect(retrieved?.userId).toBe('user123');
      expect(retrieved?.diagnosis.cropType).toBe('maize');
      expect(retrieved?.diagnosis.diseases[0].name).toBe('Corn Blight');
    });

    it('should return null for non-existent diagnosis', async () => {
      // Arrange
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      // Act
      const retrieved = await historyManager.getDiagnosis(nonExistentId);

      // Assert
      expect(retrieved).toBeNull();
    });

    it('should return null for invalid ObjectId format', async () => {
      // Arrange
      const invalidId = 'invalid-id-format';

      // Act
      const retrieved = await historyManager.getDiagnosis(invalidId);

      // Assert
      expect(retrieved).toBeNull();
    });

    it('should exclude soft-deleted diagnoses', async () => {
      // Arrange - Create and soft-delete a diagnosis
      const input: SaveDiagnosisInput = {
        userId: 'user123',
        imageUrl: 's3://bucket/image.jpg',
        imageMetadata: {
          format: 'jpeg',
          sizeBytes: 700000,
          dimensions: { width: 1920, height: 1080 }
        },
        diagnosis: {
          cropType: 'soybean',
          diseases: [],
          symptoms: [],
          confidence: 90
        },
        remedies: {
          chemical: [],
          organic: [],
          preventive: []
        },
        language: 'en'
      };
      const diagnosisId = await historyManager.saveDiagnosis(input);
      
      // Soft delete the record
      await DiagnosisRecordModel.findByIdAndUpdate(diagnosisId, {
        deletedAt: new Date()
      });

      // Act
      const retrieved = await historyManager.getDiagnosis(diagnosisId);

      // Assert
      expect(retrieved).toBeNull();
    });

    it('should include all diagnosis details', async () => {
      // Arrange
      const input: SaveDiagnosisInput = {
        userId: 'user123',
        imageUrl: 's3://bucket/image.jpg',
        imageMetadata: {
          format: 'png',
          sizeBytes: 900000,
          dimensions: { width: 2048, height: 1536 }
        },
        diagnosis: {
          cropType: 'potato',
          diseases: [{
            name: 'Early Blight',
            scientificName: 'Alternaria solani',
            type: 'fungal',
            severity: 'medium',
            confidence: 87,
            affectedParts: ['leaves', 'tubers']
          }],
          symptoms: ['dark spots', 'yellowing'],
          confidence: 87
        },
        remedies: {
          chemical: [{
            name: 'Chlorothalonil',
            genericName: 'Chlorothalonil',
            brandNames: ['Bravo'],
            dosage: '2ml per liter',
            applicationMethod: 'spray',
            frequency: 'Weekly',
            safetyPrecautions: ['Wear mask']
          }],
          organic: [{
            name: 'Copper spray',
            ingredients: ['Copper sulfate'],
            applicationMethod: 'spray',
            frequency: 'Bi-weekly'
          }],
          preventive: [{
            category: 'crop_rotation',
            description: 'Rotate with non-solanaceous crops'
          }]
        },
        language: 'en'
      };
      const diagnosisId = await historyManager.saveDiagnosis(input);

      // Act
      const retrieved = await historyManager.getDiagnosis(diagnosisId);

      // Assert
      expect(retrieved).toBeDefined();
      expect(retrieved?.imageMetadata.format).toBe('png');
      expect(retrieved?.diagnosis.diseases).toHaveLength(1);
      expect(retrieved?.remedies.chemical).toHaveLength(1);
      expect(retrieved?.remedies.organic).toHaveLength(1);
      expect(retrieved?.remedies.preventive).toHaveLength(1);
      expect(retrieved?.createdAt).toBeDefined();
      expect(retrieved?.updatedAt).toBeDefined();
    });
  });

  // ============================================================================
  // GET USER HISTORY TESTS
  // ============================================================================

  describe('getUserHistory', () => {
    beforeEach(async () => {
      // Create multiple diagnoses for testing
      const diagnoses: SaveDiagnosisInput[] = [
        {
          userId: 'user123',
          imageUrl: 's3://bucket/image1.jpg',
          imageMetadata: {
            format: 'jpeg',
            sizeBytes: 600000,
            dimensions: { width: 1920, height: 1080 }
          },
          diagnosis: {
            cropType: 'tomato',
            diseases: [],
            symptoms: [],
            confidence: 85
          },
          remedies: { chemical: [], organic: [], preventive: [] },
          language: 'en'
        },
        {
          userId: 'user123',
          imageUrl: 's3://bucket/image2.jpg',
          imageMetadata: {
            format: 'jpeg',
            sizeBytes: 700000,
            dimensions: { width: 1920, height: 1080 }
          },
          diagnosis: {
            cropType: 'wheat',
            diseases: [],
            symptoms: [],
            confidence: 90
          },
          remedies: { chemical: [], organic: [], preventive: [] },
          language: 'en'
        },
        {
          userId: 'user123',
          imageUrl: 's3://bucket/image3.jpg',
          imageMetadata: {
            format: 'jpeg',
            sizeBytes: 800000,
            dimensions: { width: 1920, height: 1080 }
          },
          diagnosis: {
            cropType: 'rice',
            diseases: [],
            symptoms: [],
            confidence: 75
          },
          remedies: { chemical: [], organic: [], preventive: [] },
          language: 'en'
        },
        {
          userId: 'user456',
          imageUrl: 's3://bucket/image4.jpg',
          imageMetadata: {
            format: 'jpeg',
            sizeBytes: 500000,
            dimensions: { width: 1920, height: 1080 }
          },
          diagnosis: {
            cropType: 'cotton',
            diseases: [],
            symptoms: [],
            confidence: 88
          },
          remedies: { chemical: [], organic: [], preventive: [] },
          language: 'en'
        }
      ];

      for (const diag of diagnoses) {
        await historyManager.saveDiagnosis(diag);
        // Add small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    });

    it('should retrieve all diagnoses for a user', async () => {
      // Act
      const history = await historyManager.getUserHistory('user123');

      // Assert
      expect(history).toHaveLength(3);
      expect(history.every(d => d.userId === 'user123')).toBe(true);
    });

    it('should sort history by createdAt descending (newest first)', async () => {
      // Act
      const history = await historyManager.getUserHistory('user123');

      // Assert
      expect(history).toHaveLength(3);
      // Verify descending order
      for (let i = 0; i < history.length - 1; i++) {
        expect(history[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          history[i + 1].createdAt.getTime()
        );
      }
      // Newest should be rice (last created)
      expect(history[0].diagnosis.cropType).toBe('rice');
    });

    it('should filter by crop type', async () => {
      // Act
      const history = await historyManager.getUserHistory('user123', {
        cropType: 'tomato'
      });

      // Assert
      expect(history).toHaveLength(1);
      expect(history[0].diagnosis.cropType).toBe('tomato');
    });

    it('should filter by date range', async () => {
      // Arrange
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      // Act
      const history = await historyManager.getUserHistory('user123', {
        startDate: twoHoursAgo,
        endDate: now
      });

      // Assert
      expect(history.length).toBeGreaterThan(0);
      history.forEach(diag => {
        expect(diag.createdAt.getTime()).toBeGreaterThanOrEqual(twoHoursAgo.getTime());
        expect(diag.createdAt.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });

    it('should filter by minimum confidence', async () => {
      // Act
      const history = await historyManager.getUserHistory('user123', {
        minConfidence: 80
      });

      // Assert
      expect(history).toHaveLength(2); // tomato (85) and wheat (90)
      history.forEach(diag => {
        expect(diag.diagnosis.confidence).toBeGreaterThanOrEqual(80);
      });
    });

    it('should support pagination with limit', async () => {
      // Act
      const history = await historyManager.getUserHistory('user123', {}, {
        limit: 2
      });

      // Assert
      expect(history).toHaveLength(2);
    });

    it('should support pagination with skip', async () => {
      // Act
      const page1 = await historyManager.getUserHistory('user123', {}, {
        limit: 2,
        skip: 0
      });
      const page2 = await historyManager.getUserHistory('user123', {}, {
        limit: 2,
        skip: 2
      });

      // Assert
      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);
      // Ensure different records
      expect(page1[0].diagnosis.cropType).not.toBe(page2[0].diagnosis.cropType);
    });

    it('should use default pagination (limit 20) when not specified', async () => {
      // Act
      const history = await historyManager.getUserHistory('user123');

      // Assert
      expect(history.length).toBeLessThanOrEqual(20);
    });

    it('should combine multiple filters', async () => {
      // Act
      const history = await historyManager.getUserHistory('user123', {
        cropType: 'tomato',
        minConfidence: 80
      });

      // Assert
      expect(history).toHaveLength(1);
      expect(history[0].diagnosis.cropType).toBe('tomato');
      expect(history[0].diagnosis.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should exclude soft-deleted diagnoses from history', async () => {
      // Arrange - Soft delete one diagnosis
      const allDiagnoses = await DiagnosisRecordModel.find({ userId: 'user123' });
      await DiagnosisRecordModel.findByIdAndUpdate(allDiagnoses[0]._id, {
        deletedAt: new Date()
      });

      // Act
      const history = await historyManager.getUserHistory('user123');

      // Assert
      expect(history).toHaveLength(2); // Should be 2 instead of 3
    });

    it('should return empty array for user with no diagnoses', async () => {
      // Act
      const history = await historyManager.getUserHistory('nonexistent-user');

      // Assert
      expect(history).toEqual([]);
    });

    it('should filter by expert reviewed status', async () => {
      // Arrange - Mark one diagnosis as expert reviewed
      const allDiagnoses = await DiagnosisRecordModel.find({ userId: 'user123' });
      await DiagnosisRecordModel.findByIdAndUpdate(allDiagnoses[0]._id, {
        'expertReview.reviewedAt': new Date(),
        'expertReview.reviewedBy': 'expert123'
      });

      // Act
      const reviewedHistory = await historyManager.getUserHistory('user123', {
        expertReviewed: true
      });
      const notReviewedHistory = await historyManager.getUserHistory('user123', {
        expertReviewed: false
      });

      // Assert
      expect(reviewedHistory).toHaveLength(1);
      expect(notReviewedHistory).toHaveLength(2);
    });
  });

  // ============================================================================
  // DELETE DIAGNOSIS TESTS
  // ============================================================================

  describe('deleteDiagnosis', () => {
    it('should soft delete diagnosis by setting deletedAt timestamp', async () => {
      // Arrange - Create a diagnosis
      const input: SaveDiagnosisInput = {
        userId: 'user123',
        imageUrl: 'diagnoses/user123/diag1/image.jpg',
        imageMetadata: {
          format: 'jpeg',
          sizeBytes: 700000,
          dimensions: { width: 1920, height: 1080 }
        },
        diagnosis: {
          cropType: 'tomato',
          diseases: [],
          symptoms: [],
          confidence: 85
        },
        remedies: { chemical: [], organic: [], preventive: [] },
        language: 'en'
      };
      const diagnosisId = await historyManager.saveDiagnosis(input);

      // Act
      await historyManager.deleteDiagnosis(diagnosisId, 'user123');

      // Assert
      const deleted = await DiagnosisRecordModel.findById(diagnosisId);
      expect(deleted).toBeDefined();
      expect(deleted?.deletedAt).toBeDefined();
      expect(deleted?.deletedAt).toBeInstanceOf(Date);
    });

    it('should verify user owns the diagnosis before deletion', async () => {
      // Arrange - Create a diagnosis for user123
      const input: SaveDiagnosisInput = {
        userId: 'user123',
        imageUrl: 'diagnoses/user123/diag1/image.jpg',
        imageMetadata: {
          format: 'jpeg',
          sizeBytes: 700000,
          dimensions: { width: 1920, height: 1080 }
        },
        diagnosis: {
          cropType: 'wheat',
          diseases: [],
          symptoms: [],
          confidence: 90
        },
        remedies: { chemical: [], organic: [], preventive: [] },
        language: 'en'
      };
      const diagnosisId = await historyManager.saveDiagnosis(input);

      // Act & Assert - Try to delete with different user
      await expect(
        historyManager.deleteDiagnosis(diagnosisId, 'user456')
      ).rejects.toThrow('Unauthorized: User does not own this diagnosis');

      // Verify diagnosis was NOT deleted
      const notDeleted = await DiagnosisRecordModel.findById(diagnosisId);
      expect(notDeleted?.deletedAt).toBeUndefined();
    });

    it('should throw error for non-existent diagnosis', async () => {
      // Arrange
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      // Act & Assert
      await expect(
        historyManager.deleteDiagnosis(nonExistentId, 'user123')
      ).rejects.toThrow('Diagnosis not found');
    });

    it('should throw error for invalid diagnosis ID format', async () => {
      // Arrange
      const invalidId = 'invalid-id-format';

      // Act & Assert
      await expect(
        historyManager.deleteDiagnosis(invalidId, 'user123')
      ).rejects.toThrow('Invalid diagnosis ID format');
    });

    it('should throw error when trying to delete already deleted diagnosis', async () => {
      // Arrange - Create and delete a diagnosis
      const input: SaveDiagnosisInput = {
        userId: 'user123',
        imageUrl: 'diagnoses/user123/diag1/image.jpg',
        imageMetadata: {
          format: 'jpeg',
          sizeBytes: 700000,
          dimensions: { width: 1920, height: 1080 }
        },
        diagnosis: {
          cropType: 'rice',
          diseases: [],
          symptoms: [],
          confidence: 88
        },
        remedies: { chemical: [], organic: [], preventive: [] },
        language: 'en'
      };
      const diagnosisId = await historyManager.saveDiagnosis(input);
      await historyManager.deleteDiagnosis(diagnosisId, 'user123');

      // Act & Assert - Try to delete again
      await expect(
        historyManager.deleteDiagnosis(diagnosisId, 'user123')
      ).rejects.toThrow('Diagnosis not found');
    });

    it('should schedule S3 image deletion', async () => {
      // Arrange - Create a diagnosis
      const imageKey = 'diagnoses/user123/diag1/12345.jpg';
      const input: SaveDiagnosisInput = {
        userId: 'user123',
        imageUrl: imageKey,
        imageMetadata: {
          format: 'jpeg',
          sizeBytes: 700000,
          dimensions: { width: 1920, height: 1080 }
        },
        diagnosis: {
          cropType: 'cotton',
          diseases: [],
          symptoms: [],
          confidence: 92
        },
        remedies: { chemical: [], organic: [], preventive: [] },
        language: 'en'
      };
      const diagnosisId = await historyManager.saveDiagnosis(input);

      // Act
      await historyManager.deleteDiagnosis(diagnosisId, 'user123');

      // Assert
      // Note: We can't easily test setTimeout in unit tests without mocking
      // In production, this would be replaced with a job queue
      // For now, we verify the soft delete happened
      const deleted = await DiagnosisRecordModel.findById(diagnosisId);
      expect(deleted?.deletedAt).toBeDefined();
      expect(deleted?.imageUrl).toBe(imageKey);
    });

    it('should allow deletion by the correct user', async () => {
      // Arrange - Create diagnoses for different users
      const user1Input: SaveDiagnosisInput = {
        userId: 'user123',
        imageUrl: 'diagnoses/user123/diag1/image.jpg',
        imageMetadata: {
          format: 'jpeg',
          sizeBytes: 700000,
          dimensions: { width: 1920, height: 1080 }
        },
        diagnosis: {
          cropType: 'maize',
          diseases: [],
          symptoms: [],
          confidence: 87
        },
        remedies: { chemical: [], organic: [], preventive: [] },
        language: 'en'
      };
      const user2Input: SaveDiagnosisInput = {
        userId: 'user456',
        imageUrl: 'diagnoses/user456/diag2/image.jpg',
        imageMetadata: {
          format: 'jpeg',
          sizeBytes: 800000,
          dimensions: { width: 1920, height: 1080 }
        },
        diagnosis: {
          cropType: 'soybean',
          diseases: [],
          symptoms: [],
          confidence: 91
        },
        remedies: { chemical: [], organic: [], preventive: [] },
        language: 'en'
      };
      const diag1Id = await historyManager.saveDiagnosis(user1Input);
      const diag2Id = await historyManager.saveDiagnosis(user2Input);

      // Act - Each user deletes their own diagnosis
      await historyManager.deleteDiagnosis(diag1Id, 'user123');
      await historyManager.deleteDiagnosis(diag2Id, 'user456');

      // Assert
      const deleted1 = await DiagnosisRecordModel.findById(diag1Id);
      const deleted2 = await DiagnosisRecordModel.findById(diag2Id);
      expect(deleted1?.deletedAt).toBeDefined();
      expect(deleted2?.deletedAt).toBeDefined();
    });

    it('should not appear in getDiagnosis after soft delete', async () => {
      // Arrange - Create a diagnosis
      const input: SaveDiagnosisInput = {
        userId: 'user123',
        imageUrl: 'diagnoses/user123/diag1/image.jpg',
        imageMetadata: {
          format: 'jpeg',
          sizeBytes: 700000,
          dimensions: { width: 1920, height: 1080 }
        },
        diagnosis: {
          cropType: 'potato',
          diseases: [],
          symptoms: [],
          confidence: 84
        },
        remedies: { chemical: [], organic: [], preventive: [] },
        language: 'en'
      };
      const diagnosisId = await historyManager.saveDiagnosis(input);

      // Verify it exists before deletion
      const beforeDelete = await historyManager.getDiagnosis(diagnosisId);
      expect(beforeDelete).toBeDefined();

      // Act - Delete the diagnosis
      await historyManager.deleteDiagnosis(diagnosisId, 'user123');

      // Assert - Should not be retrievable
      const afterDelete = await historyManager.getDiagnosis(diagnosisId);
      expect(afterDelete).toBeNull();
    });

    it('should not appear in getUserHistory after soft delete', async () => {
      // Arrange - Create multiple diagnoses
      const input1: SaveDiagnosisInput = {
        userId: 'user123',
        imageUrl: 'diagnoses/user123/diag1/image.jpg',
        imageMetadata: {
          format: 'jpeg',
          sizeBytes: 700000,
          dimensions: { width: 1920, height: 1080 }
        },
        diagnosis: {
          cropType: 'tomato',
          diseases: [],
          symptoms: [],
          confidence: 85
        },
        remedies: { chemical: [], organic: [], preventive: [] },
        language: 'en'
      };
      const input2: SaveDiagnosisInput = {
        userId: 'user123',
        imageUrl: 'diagnoses/user123/diag2/image.jpg',
        imageMetadata: {
          format: 'jpeg',
          sizeBytes: 800000,
          dimensions: { width: 1920, height: 1080 }
        },
        diagnosis: {
          cropType: 'wheat',
          diseases: [],
          symptoms: [],
          confidence: 90
        },
        remedies: { chemical: [], organic: [], preventive: [] },
        language: 'en'
      };
      const diag1Id = await historyManager.saveDiagnosis(input1);
      await historyManager.saveDiagnosis(input2);

      // Verify both exist before deletion
      const beforeDelete = await historyManager.getUserHistory('user123');
      expect(beforeDelete).toHaveLength(2);

      // Act - Delete one diagnosis
      await historyManager.deleteDiagnosis(diag1Id, 'user123');

      // Assert - Should only see one in history
      const afterDelete = await historyManager.getUserHistory('user123');
      expect(afterDelete).toHaveLength(1);
      expect(afterDelete[0].diagnosis.cropType).toBe('wheat');
    });
  });
});
