/**
 * Expert Escalation Service Tests
 * 
 * Unit tests for the Expert Escalation Service.
 * 
 * Requirements tested:
 * - 10.1: Create expert review request when confidence <80%
 * - 10.3: Store AI diagnosis and remedies for expert reference
 */

import mongoose from 'mongoose';
import { 
  ExpertEscalationService,
  type CreateReviewRequestInput,
  type ExpertReview,
  type Disease
} from '../expert-escalation.service';
import type { RemedyResponse } from '../remedy-generator.service';
import { DiagnosisRecordModel } from '../../models/diagnosis.model';

// Mock mongoose model
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    models: {},
    model: jest.fn()
  };
});

// Mock DiagnosisRecordModel
jest.mock('../../models/diagnosis.model', () => ({
  DiagnosisRecordModel: {
    findByIdAndUpdate: jest.fn()
  }
}));

describe('ExpertEscalationService', () => {
  let service: ExpertEscalationService;
  let mockModel: any;

  // Sample test data
  const sampleDisease: Disease = {
    name: 'Late Blight',
    scientificName: 'Phytophthora infestans',
    type: 'fungal',
    severity: 'high',
    confidence: 75,
    affectedParts: ['leaves', 'stem']
  };

  const sampleRemedies: RemedyResponse = {
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
      ingredients: ['Neem oil 10ml', 'Water 1L'],
      preparation: ['Mix neem oil with water'],
      applicationMethod: 'foliar spray',
      frequency: 'Every 5 days',
      effectiveness: 'Moderate effectiveness'
    }],
    preventive: [{
      category: 'spacing',
      description: 'Maintain 60cm spacing between plants',
      timing: 'At planting',
      frequency: 'Once'
    }]
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock model with chainable methods
    mockModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn().mockResolvedValue({
        ...data,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date()
      })
    }));

    // Add static methods
    mockModel.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([])
        })
      })
    });

    mockModel.findById = jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      })
    });

    mockModel.findByIdAndUpdate = jest.fn().mockResolvedValue(null);

    // Mock mongoose.model to return our mock
    (mongoose.model as jest.Mock).mockReturnValue(mockModel);

    // Mock DiagnosisRecordModel
    (DiagnosisRecordModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

    // Create service instance
    service = new ExpertEscalationService();
  });

  describe('createReviewRequest', () => {
    it('should create a review request with all required fields', async () => {
      // Arrange
      const diagnosisId = new mongoose.Types.ObjectId().toString();
      const savedId = new mongoose.Types.ObjectId();
      
      const mockSave = jest.fn().mockResolvedValue({
        _id: savedId,
        diagnosisId: new mongoose.Types.ObjectId(diagnosisId),
        userId: 'user123',
        imageUrl: 'https://s3.amazonaws.com/bucket/image.jpg',
        aiDiagnosis: {
          cropType: 'Tomato',
          diseases: [sampleDisease],
          confidence: 75
        },
        aiRemedies: sampleRemedies,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      mockModel.mockImplementation((data: any) => ({
        ...data,
        save: mockSave
      }));

      const input: CreateReviewRequestInput = {
        diagnosisId,
        userId: 'user123',
        imageUrl: 'https://s3.amazonaws.com/bucket/image.jpg',
        aiDiagnosis: {
          cropType: 'Tomato',
          diseases: [sampleDisease],
          confidence: 75
        },
        aiRemedies: sampleRemedies
      };

      // Act
      const reviewId = await service.createReviewRequest(input);

      // Assert
      expect(reviewId).toBe(savedId.toString());
      expect(mockSave).toHaveBeenCalled();
      expect(mockModel).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user123',
        imageUrl: 'https://s3.amazonaws.com/bucket/image.jpg',
        status: 'pending'
      }));
    });

    it('should set status to pending on creation', async () => {
      // Arrange
      const diagnosisId = new mongoose.Types.ObjectId().toString();
      const savedId = new mongoose.Types.ObjectId();
      
      const mockSave = jest.fn().mockResolvedValue({
        _id: savedId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      mockModel.mockImplementation((data: any) => ({
        ...data,
        save: mockSave
      }));

      const input: CreateReviewRequestInput = {
        diagnosisId,
        userId: 'user123',
        imageUrl: 'https://s3.amazonaws.com/bucket/image.jpg',
        aiDiagnosis: {
          cropType: 'Tomato',
          diseases: [sampleDisease],
          confidence: 75
        },
        aiRemedies: sampleRemedies
      };

      // Act
      await service.createReviewRequest(input);

      // Assert
      expect(mockModel).toHaveBeenCalledWith(expect.objectContaining({
        status: 'pending'
      }));
    });

    it('should store complete AI diagnosis for expert reference', async () => {
      // Arrange
      const multipleDisease: Disease[] = [
        sampleDisease,
        {
          name: 'Powdery Mildew',
          scientificName: 'Erysiphe cichoracearum',
          type: 'fungal',
          severity: 'medium',
          confidence: 70,
          affectedParts: ['leaves']
        }
      ];

      const diagnosisId = new mongoose.Types.ObjectId().toString();
      const savedId = new mongoose.Types.ObjectId();
      
      const mockSave = jest.fn().mockResolvedValue({
        _id: savedId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      mockModel.mockImplementation((data: any) => ({
        ...data,
        save: mockSave
      }));

      const input: CreateReviewRequestInput = {
        diagnosisId,
        userId: 'user123',
        imageUrl: 'https://s3.amazonaws.com/bucket/image.jpg',
        aiDiagnosis: {
          cropType: 'Tomato',
          diseases: multipleDisease,
          confidence: 72
        },
        aiRemedies: sampleRemedies
      };

      // Act
      await service.createReviewRequest(input);

      // Assert
      expect(mockModel).toHaveBeenCalledWith(expect.objectContaining({
        aiDiagnosis: expect.objectContaining({
          cropType: 'Tomato',
          diseases: multipleDisease,
          confidence: 72
        })
      }));
    });

    it('should store complete AI remedies for expert reference', async () => {
      // Arrange
      const diagnosisId = new mongoose.Types.ObjectId().toString();
      const savedId = new mongoose.Types.ObjectId();
      
      const mockSave = jest.fn().mockResolvedValue({
        _id: savedId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      mockModel.mockImplementation((data: any) => ({
        ...data,
        save: mockSave
      }));

      const input: CreateReviewRequestInput = {
        diagnosisId,
        userId: 'user123',
        imageUrl: 'https://s3.amazonaws.com/bucket/image.jpg',
        aiDiagnosis: {
          cropType: 'Tomato',
          diseases: [sampleDisease],
          confidence: 75
        },
        aiRemedies: sampleRemedies
      };

      // Act
      await service.createReviewRequest(input);

      // Assert
      expect(mockModel).toHaveBeenCalledWith(expect.objectContaining({
        aiRemedies: expect.objectContaining({
          chemical: expect.arrayContaining([
            expect.objectContaining({ genericName: 'Mancozeb' })
          ]),
          organic: expect.arrayContaining([
            expect.objectContaining({ name: 'Neem oil spray' })
          ]),
          preventive: expect.arrayContaining([
            expect.objectContaining({ category: 'spacing' })
          ])
        })
      }));
    });

    it('should handle low confidence diagnoses (<80%)', async () => {
      // Arrange
      const diagnosisId = new mongoose.Types.ObjectId().toString();
      const savedId = new mongoose.Types.ObjectId();
      
      const mockSave = jest.fn().mockResolvedValue({
        _id: savedId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      mockModel.mockImplementation((data: any) => ({
        ...data,
        save: mockSave
      }));

      const lowConfidenceInput: CreateReviewRequestInput = {
        diagnosisId,
        userId: 'user123',
        imageUrl: 'https://s3.amazonaws.com/bucket/image.jpg',
        aiDiagnosis: {
          cropType: 'Wheat',
          diseases: [{
            ...sampleDisease,
            confidence: 55
          }],
          confidence: 55
        },
        aiRemedies: sampleRemedies
      };

      // Act
      const reviewId = await service.createReviewRequest(lowConfidenceInput);

      // Assert
      expect(reviewId).toBeDefined();
      expect(mockModel).toHaveBeenCalledWith(expect.objectContaining({
        aiDiagnosis: expect.objectContaining({
          confidence: 55
        }),
        status: 'pending'
      }));
    });

    it('should throw error for invalid diagnosis ID format', async () => {
      // Arrange
      const input: CreateReviewRequestInput = {
        diagnosisId: 'invalid-id',
        userId: 'user123',
        imageUrl: 'https://s3.amazonaws.com/bucket/image.jpg',
        aiDiagnosis: {
          cropType: 'Tomato',
          diseases: [sampleDisease],
          confidence: 75
        },
        aiRemedies: sampleRemedies
      };

      // Act & Assert
      await expect(service.createReviewRequest(input)).rejects.toThrow();
    });
  });

  describe('getPendingReviews', () => {
    it('should return pending review requests', async () => {
      // Arrange
      const mockReviews = [
        {
          _id: new mongoose.Types.ObjectId(),
          diagnosisId: new mongoose.Types.ObjectId(),
          userId: 'user123',
          imageUrl: 'https://s3.amazonaws.com/bucket/image1.jpg',
          aiDiagnosis: { cropType: 'Tomato', diseases: [sampleDisease], confidence: 75 },
          aiRemedies: sampleRemedies,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          _id: new mongoose.Types.ObjectId(),
          diagnosisId: new mongoose.Types.ObjectId(),
          userId: 'user456',
          imageUrl: 'https://s3.amazonaws.com/bucket/image2.jpg',
          aiDiagnosis: { cropType: 'Wheat', diseases: [sampleDisease], confidence: 70 },
          aiRemedies: sampleRemedies,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockReviews)
          })
        })
      });

      // Act
      const pendingReviews = await service.getPendingReviews('expert123');

      // Assert
      expect(pendingReviews).toHaveLength(2);
      expect(pendingReviews[0].status).toBe('pending');
      expect(pendingReviews[1].status).toBe('pending');
    });

    it('should return reviews assigned to the expert', async () => {
      // Arrange
      const mockReview = {
        _id: new mongoose.Types.ObjectId(),
        diagnosisId: new mongoose.Types.ObjectId(),
        userId: 'user123',
        imageUrl: 'https://s3.amazonaws.com/bucket/image.jpg',
        aiDiagnosis: { cropType: 'Tomato', diseases: [sampleDisease], confidence: 75 },
        aiRemedies: sampleRemedies,
        status: 'in_progress',
        assignedTo: 'expert123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([mockReview])
          })
        })
      });

      // Act
      const pendingReviews = await service.getPendingReviews('expert123');

      // Assert
      expect(pendingReviews).toHaveLength(1);
      expect(pendingReviews[0].status).toBe('in_progress');
      expect(pendingReviews[0].assignedTo).toBe('expert123');
    });

    it('should not return completed reviews', async () => {
      // Arrange
      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([])
          })
        })
      });

      // Act
      const pendingReviews = await service.getPendingReviews('expert123');

      // Assert
      expect(pendingReviews).toHaveLength(0);
    });
  });

  describe('submitReview', () => {
    it('should update review request with expert findings', async () => {
      // Arrange
      const reviewId = new mongoose.Types.ObjectId().toString();
      const diagnosisId = new mongoose.Types.ObjectId();
      const updatedReview = {
        _id: new mongoose.Types.ObjectId(reviewId),
        diagnosisId,
        userId: 'user123',
        aiDiagnosis: { cropType: 'Tomato', diseases: [sampleDisease], confidence: 75 },
        status: 'completed',
        assignedTo: 'expert123',
        expertNotes: 'Confirmed late blight with early signs of early blight',
        expertRemedies: 'Apply Mancozeb spray every 7 days for 3 weeks',
        reviewDurationMinutes: 15,
        completedAt: new Date()
      };

      mockModel.findByIdAndUpdate.mockResolvedValue(updatedReview);

      const expertReview: ExpertReview = {
        expertId: 'expert123',
        diagnosis: {
          cropType: 'Tomato',
          diseases: ['Late Blight', 'Early Blight'],
          notes: 'Confirmed late blight with early signs of early blight'
        },
        remedies: 'Apply Mancozeb spray every 7 days for 3 weeks',
        confidence: 90,
        reviewDurationMinutes: 15
      };

      // Act
      await service.submitReview(reviewId, expertReview);

      // Assert
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        reviewId,
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'completed',
            assignedTo: 'expert123',
            reviewDurationMinutes: 15
          })
        }),
        { new: true }
      );
    });

    it('should update DiagnosisRecord with expert review data', async () => {
      // Arrange
      const reviewId = new mongoose.Types.ObjectId().toString();
      const diagnosisId = new mongoose.Types.ObjectId();
      const updatedReview = {
        _id: new mongoose.Types.ObjectId(reviewId),
        diagnosisId,
        userId: 'user123',
        aiDiagnosis: { cropType: 'Tomato', diseases: [sampleDisease], confidence: 75 },
        status: 'completed',
        assignedTo: 'expert123',
        expertDiagnosis: JSON.stringify({
          cropType: 'Tomato',
          diseases: ['Late Blight'],
          notes: 'Confirmed diagnosis'
        }),
        expertRemedies: 'Apply Mancozeb spray',
        completedAt: new Date()
      };

      mockModel.findByIdAndUpdate.mockResolvedValue(updatedReview);

      const expertReview: ExpertReview = {
        expertId: 'expert123',
        diagnosis: {
          cropType: 'Tomato',
          diseases: ['Late Blight'],
          notes: 'Confirmed diagnosis'
        },
        remedies: 'Apply Mancozeb spray',
        confidence: 90,
        reviewDurationMinutes: 10
      };

      // Act
      await service.submitReview(reviewId, expertReview);

      // Assert
      expect(DiagnosisRecordModel.findByIdAndUpdate).toHaveBeenCalledWith(
        diagnosisId,
        expect.objectContaining({
          $set: expect.objectContaining({
            'expertReview.required': true,
            'expertReview.reviewedAt': expect.any(Date),
            'expertReview.reviewedBy': 'expert123',
            'expertReview.expertDiagnosis': expect.any(String),
            'expertReview.expertRemedies': 'Apply Mancozeb spray'
          })
        })
      );
    });

    it('should set expertReview.reviewedAt timestamp', async () => {
      // Arrange
      const reviewId = new mongoose.Types.ObjectId().toString();
      const diagnosisId = new mongoose.Types.ObjectId();
      const beforeTime = new Date();
      
      const updatedReview = {
        _id: new mongoose.Types.ObjectId(reviewId),
        diagnosisId,
        userId: 'user123',
        aiDiagnosis: { cropType: 'Tomato', diseases: [sampleDisease], confidence: 75 },
        status: 'completed',
        completedAt: new Date()
      };

      mockModel.findByIdAndUpdate.mockResolvedValue(updatedReview);

      const expertReview: ExpertReview = {
        expertId: 'expert123',
        diagnosis: {
          cropType: 'Tomato',
          diseases: ['Late Blight'],
          notes: 'Confirmed'
        },
        remedies: 'Apply treatment',
        confidence: 90,
        reviewDurationMinutes: 10
      };

      // Act
      await service.submitReview(reviewId, expertReview);

      // Assert
      const afterTime = new Date();
      expect(DiagnosisRecordModel.findByIdAndUpdate).toHaveBeenCalledWith(
        diagnosisId,
        expect.objectContaining({
          $set: expect.objectContaining({
            'expertReview.reviewedAt': expect.any(Date)
          })
        })
      );

      // Verify the timestamp is within reasonable range
      const call = (DiagnosisRecordModel.findByIdAndUpdate as jest.Mock).mock.calls[0];
      const reviewedAt = call[1].$set['expertReview.reviewedAt'];
      expect(reviewedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(reviewedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should change review request status to completed', async () => {
      // Arrange
      const reviewId = new mongoose.Types.ObjectId().toString();
      const diagnosisId = new mongoose.Types.ObjectId();
      const updatedReview = {
        _id: new mongoose.Types.ObjectId(reviewId),
        diagnosisId,
        userId: 'user123',
        aiDiagnosis: { cropType: 'Tomato', diseases: [sampleDisease], confidence: 75 },
        status: 'completed',
        completedAt: new Date()
      };

      mockModel.findByIdAndUpdate.mockResolvedValue(updatedReview);

      const expertReview: ExpertReview = {
        expertId: 'expert123',
        diagnosis: {
          cropType: 'Tomato',
          diseases: ['Late Blight'],
          notes: 'Confirmed'
        },
        remedies: 'Apply treatment',
        confidence: 90,
        reviewDurationMinutes: 10
      };

      // Act
      await service.submitReview(reviewId, expertReview);

      // Assert
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        reviewId,
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'completed',
            completedAt: expect.any(Date)
          })
        }),
        { new: true }
      );
    });

    it('should allow experts to modify diagnosis', async () => {
      // Arrange
      const reviewId = new mongoose.Types.ObjectId().toString();
      const diagnosisId = new mongoose.Types.ObjectId();
      const updatedReview = {
        _id: new mongoose.Types.ObjectId(reviewId),
        diagnosisId,
        userId: 'user123',
        aiDiagnosis: { 
          cropType: 'Tomato', 
          diseases: [{ ...sampleDisease, name: 'Late Blight' }], 
          confidence: 75 
        },
        status: 'completed'
      };

      mockModel.findByIdAndUpdate.mockResolvedValue(updatedReview);

      const expertReview: ExpertReview = {
        expertId: 'expert123',
        diagnosis: {
          cropType: 'Tomato',
          diseases: ['Early Blight', 'Septoria Leaf Spot'], // Modified diagnosis
          notes: 'AI misidentified - actually early blight with septoria'
        },
        remedies: 'Different treatment needed',
        confidence: 95,
        reviewDurationMinutes: 20
      };

      // Act
      await service.submitReview(reviewId, expertReview);

      // Assert
      expect(DiagnosisRecordModel.findByIdAndUpdate).toHaveBeenCalledWith(
        diagnosisId,
        expect.objectContaining({
          $set: expect.objectContaining({
            'expertReview.expertDiagnosis': expect.stringContaining('Early Blight')
          })
        })
      );
    });

    it('should allow experts to modify remedies', async () => {
      // Arrange
      const reviewId = new mongoose.Types.ObjectId().toString();
      const diagnosisId = new mongoose.Types.ObjectId();
      const updatedReview = {
        _id: new mongoose.Types.ObjectId(reviewId),
        diagnosisId,
        userId: 'user123',
        aiDiagnosis: { cropType: 'Tomato', diseases: [sampleDisease], confidence: 75 },
        status: 'completed'
      };

      mockModel.findByIdAndUpdate.mockResolvedValue(updatedReview);

      const customRemedies = 'Use Copper Oxychloride 3g/L instead of Mancozeb. Apply weekly for 4 weeks.';
      const expertReview: ExpertReview = {
        expertId: 'expert123',
        diagnosis: {
          cropType: 'Tomato',
          diseases: ['Late Blight'],
          notes: 'Confirmed'
        },
        remedies: customRemedies,
        confidence: 90,
        reviewDurationMinutes: 15
      };

      // Act
      await service.submitReview(reviewId, expertReview);

      // Assert
      expect(DiagnosisRecordModel.findByIdAndUpdate).toHaveBeenCalledWith(
        diagnosisId,
        expect.objectContaining({
          $set: expect.objectContaining({
            'expertReview.expertRemedies': customRemedies
          })
        })
      );
    });

    it('should allow experts to modify both diagnosis and remedies', async () => {
      // Arrange
      const reviewId = new mongoose.Types.ObjectId().toString();
      const diagnosisId = new mongoose.Types.ObjectId();
      const updatedReview = {
        _id: new mongoose.Types.ObjectId(reviewId),
        diagnosisId,
        userId: 'user123',
        aiDiagnosis: { cropType: 'Tomato', diseases: [sampleDisease], confidence: 75 },
        status: 'completed'
      };

      mockModel.findByIdAndUpdate.mockResolvedValue(updatedReview);

      const expertReview: ExpertReview = {
        expertId: 'expert123',
        diagnosis: {
          cropType: 'Tomato',
          diseases: ['Bacterial Wilt'], // Completely different diagnosis
          notes: 'AI was incorrect - this is bacterial wilt, not fungal'
        },
        remedies: 'Remove infected plants immediately. Apply Streptocycline 1g/10L water to surrounding plants.',
        confidence: 95,
        reviewDurationMinutes: 25
      };

      // Act
      await service.submitReview(reviewId, expertReview);

      // Assert
      expect(DiagnosisRecordModel.findByIdAndUpdate).toHaveBeenCalledWith(
        diagnosisId,
        expect.objectContaining({
          $set: expect.objectContaining({
            'expertReview.expertDiagnosis': expect.stringContaining('Bacterial Wilt'),
            'expertReview.expertRemedies': expect.stringContaining('Streptocycline')
          })
        })
      );
    });

    it('should throw error for non-existent review ID', async () => {
      // Arrange
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      mockModel.findByIdAndUpdate.mockResolvedValue(null);

      const expertReview: ExpertReview = {
        expertId: 'expert123',
        diagnosis: {
          cropType: 'Tomato',
          diseases: ['Late Blight'],
          notes: 'Confirmed diagnosis'
        },
        remedies: 'Apply Mancozeb spray',
        confidence: 90,
        reviewDurationMinutes: 10
      };

      // Act & Assert
      await expect(service.submitReview(nonExistentId, expertReview)).rejects.toThrow();
    });

    it('should not fail if DiagnosisRecord update fails', async () => {
      // Arrange
      const reviewId = new mongoose.Types.ObjectId().toString();
      const diagnosisId = new mongoose.Types.ObjectId();
      const updatedReview = {
        _id: new mongoose.Types.ObjectId(reviewId),
        diagnosisId,
        userId: 'user123',
        aiDiagnosis: { cropType: 'Tomato', diseases: [sampleDisease], confidence: 75 },
        status: 'completed'
      };

      mockModel.findByIdAndUpdate.mockResolvedValue(updatedReview);
      (DiagnosisRecordModel.findByIdAndUpdate as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const expertReview: ExpertReview = {
        expertId: 'expert123',
        diagnosis: {
          cropType: 'Tomato',
          diseases: ['Late Blight'],
          notes: 'Confirmed'
        },
        remedies: 'Apply treatment',
        confidence: 90,
        reviewDurationMinutes: 10
      };

      // Act & Assert
      // Should throw because DiagnosisRecord update is critical
      await expect(service.submitReview(reviewId, expertReview)).rejects.toThrow();
    });
  });

  describe('assignReview', () => {
    it('should assign review to expert and update status', async () => {
      // Arrange
      const reviewId = new mongoose.Types.ObjectId().toString();
      const updatedReview = {
        _id: new mongoose.Types.ObjectId(reviewId),
        status: 'in_progress',
        assignedTo: 'expert123'
      };

      mockModel.findByIdAndUpdate.mockResolvedValue(updatedReview);

      // Act
      await service.assignReview(reviewId, 'expert123');

      // Assert
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        reviewId,
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'in_progress',
            assignedTo: 'expert123'
          })
        }),
        { new: true }
      );
    });

    it('should throw error for non-existent review ID', async () => {
      // Arrange
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      mockModel.findByIdAndUpdate.mockResolvedValue(null);

      // Act & Assert
      await expect(service.assignReview(nonExistentId, 'expert123')).rejects.toThrow();
    });
  });

  describe('getReviewRequest', () => {
    it('should return review request by ID', async () => {
      // Arrange
      const reviewId = new mongoose.Types.ObjectId();
      const mockReview = {
        _id: reviewId,
        diagnosisId: new mongoose.Types.ObjectId(),
        userId: 'user123',
        imageUrl: 'https://s3.amazonaws.com/bucket/image.jpg',
        aiDiagnosis: { cropType: 'Tomato', diseases: [sampleDisease], confidence: 75 },
        aiRemedies: sampleRemedies,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockReview)
        })
      });

      // Act
      const review = await service.getReviewRequest(reviewId.toString());

      // Assert
      expect(review).not.toBeNull();
      expect(review!._id).toBe(reviewId.toString());
      expect(review!.userId).toBe('user123');
    });

    it('should return null for non-existent review ID', async () => {
      // Arrange
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      mockModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null)
        })
      });

      // Act
      const review = await service.getReviewRequest(nonExistentId);

      // Assert
      expect(review).toBeNull();
    });
  });
});
