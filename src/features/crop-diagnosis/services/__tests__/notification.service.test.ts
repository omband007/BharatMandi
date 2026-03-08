/**
 * Unit Tests for Notification Service
 * 
 * Tests multi-channel notification system for expert escalation and farmer updates.
 */

import mongoose from 'mongoose';
import { NotificationService } from '../notification.service';

// Mock mongoose model
jest.mock('mongoose', () => {
  const actualMongoose = jest.requireActual('mongoose');
  return {
    ...actualMongoose,
    models: {},
    model: jest.fn(),
    Schema: actualMongoose.Schema
  };
});

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockModel: any;
  let mockSave: jest.Mock;
  let mockFindByIdAndUpdate: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock save function
    mockSave = jest.fn();
    mockFindByIdAndUpdate = jest.fn();

    // Create mock model
    mockModel = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: new mongoose.Types.ObjectId(),
      save: mockSave
    }));

    mockModel.findById = jest.fn().mockReturnValue({
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      })
    });

    mockModel.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([])
          })
        })
      })
    });

    mockModel.findByIdAndUpdate = mockFindByIdAndUpdate;

    // Mock mongoose.model to return our mock
    (mongoose.model as jest.Mock).mockReturnValue(mockModel);

    // Create service instance
    notificationService = new NotificationService();
  });

  describe('Expert Notification', () => {
    it('should notify available experts when review request is created', async () => {
      const savedId = new mongoose.Types.ObjectId();
      mockSave.mockResolvedValue({ _id: savedId });
      mockFindByIdAndUpdate.mockResolvedValue({ _id: savedId, status: 'sent' });

      const reviewRequestId = new mongoose.Types.ObjectId().toString();
      const diagnosisData = {
        diagnosisId: new mongoose.Types.ObjectId().toString(),
        cropType: 'rice',
        confidence: 65,
        imageUrl: 'https://s3.example.com/image.jpg'
      };

      const results = await notificationService.notifyExpertReviewRequest(
        reviewRequestId,
        diagnosisData
      );

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('sent');
      expect(results[0].recipientId).toBeDefined();
      expect(results[0].channels.length).toBeGreaterThan(0);
      expect(mockSave).toHaveBeenCalled();
    });

    it('should select expert with matching specialization', async () => {
      const savedId = new mongoose.Types.ObjectId();
      mockSave.mockResolvedValue({ _id: savedId });
      mockFindByIdAndUpdate.mockResolvedValue({ _id: savedId, status: 'sent' });

      const reviewRequestId = new mongoose.Types.ObjectId().toString();
      const diagnosisData = {
        diagnosisId: new mongoose.Types.ObjectId().toString(),
        cropType: 'rice',
        confidence: 65,
        imageUrl: 'https://s3.example.com/image.jpg',
        diseaseType: 'fungal'
      };

      const results = await notificationService.notifyExpertReviewRequest(
        reviewRequestId,
        diagnosisData
      );

      expect(results).toHaveLength(1);
      // Expert-001 has fungal specialization
      expect(results[0].recipientId).toBe('expert-001');
    });

    it('should set urgent priority for very low confidence', async () => {
      const savedId = new mongoose.Types.ObjectId();
      mockSave.mockResolvedValue({ _id: savedId });
      mockFindByIdAndUpdate.mockResolvedValue({ _id: savedId, status: 'sent' });

      const reviewRequestId = new mongoose.Types.ObjectId().toString();
      const diagnosisData = {
        diagnosisId: new mongoose.Types.ObjectId().toString(),
        cropType: 'rice',
        confidence: 45, // Very low confidence
        imageUrl: 'https://s3.example.com/image.jpg'
      };

      await notificationService.notifyExpertReviewRequest(
        reviewRequestId,
        diagnosisData
      );

      expect(mockModel).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'urgent'
        })
      );
    });

    it('should set high priority for moderate confidence', async () => {
      const savedId = new mongoose.Types.ObjectId();
      mockSave.mockResolvedValue({ _id: savedId });
      mockFindByIdAndUpdate.mockResolvedValue({ _id: savedId, status: 'sent' });

      const reviewRequestId = new mongoose.Types.ObjectId().toString();
      const diagnosisData = {
        diagnosisId: new mongoose.Types.ObjectId().toString(),
        cropType: 'rice',
        confidence: 70, // Moderate confidence
        imageUrl: 'https://s3.example.com/image.jpg'
      };

      await notificationService.notifyExpertReviewRequest(
        reviewRequestId,
        diagnosisData
      );

      expect(mockModel).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'high'
        })
      );
    });

    it('should throw error when no experts available', async () => {
      // Make all experts unavailable
      const availableExperts = notificationService.getAvailableExperts();
      availableExperts.forEach(expert => {
        notificationService.updateExpertAvailability(expert.expertId, false);
      });

      const reviewRequestId = new mongoose.Types.ObjectId().toString();
      const diagnosisData = {
        diagnosisId: new mongoose.Types.ObjectId().toString(),
        cropType: 'rice',
        confidence: 65,
        imageUrl: 'https://s3.example.com/image.jpg'
      };

      await expect(
        notificationService.notifyExpertReviewRequest(reviewRequestId, diagnosisData)
      ).rejects.toThrow('No available experts found');
    });

    it('should track expert load after notification', async () => {
      const savedId = new mongoose.Types.ObjectId();
      mockSave.mockResolvedValue({ _id: savedId });
      mockFindByIdAndUpdate.mockResolvedValue({ _id: savedId, status: 'sent' });

      const expertsBefore = notificationService.getAvailableExperts();
      const initialLoad = expertsBefore[0].currentLoad;

      const reviewRequestId = new mongoose.Types.ObjectId().toString();
      const diagnosisData = {
        diagnosisId: new mongoose.Types.ObjectId().toString(),
        cropType: 'rice',
        confidence: 65,
        imageUrl: 'https://s3.example.com/image.jpg'
      };

      await notificationService.notifyExpertReviewRequest(
        reviewRequestId,
        diagnosisData
      );

      const expertsAfter = notificationService.getAvailableExperts();
      const notifiedExpert = expertsAfter.find(e => e.currentLoad > initialLoad);
      
      expect(notifiedExpert).toBeDefined();
      expect(notifiedExpert!.currentLoad).toBe(initialLoad + 1);
    });
  });

  describe('Farmer Notification', () => {
    it('should notify farmer when expert completes review', async () => {
      const savedId = new mongoose.Types.ObjectId();
      mockSave.mockResolvedValue({ _id: savedId });
      mockFindByIdAndUpdate.mockResolvedValue({ _id: savedId, status: 'sent' });

      const farmerId = 'farmer-123';
      const reviewData = {
        diagnosisId: new mongoose.Types.ObjectId().toString(),
        expertName: 'Dr. Rajesh Kumar',
        cropType: 'rice'
      };

      const result = await notificationService.notifyFarmerReviewCompleted(
        farmerId,
        reviewData
      );

      expect(result.status).toBe('sent');
      expect(result.recipientId).toBe(farmerId);
      expect(result.channels).toContain('sms');
      expect(result.channels).toContain('push');
    });

    it('should include expert name and crop type in notification', async () => {
      const savedId = new mongoose.Types.ObjectId();
      mockSave.mockResolvedValue({ _id: savedId });
      mockFindByIdAndUpdate.mockResolvedValue({ _id: savedId, status: 'sent' });

      const farmerId = 'farmer-123';
      const reviewData = {
        diagnosisId: new mongoose.Types.ObjectId().toString(),
        expertName: 'Dr. Rajesh Kumar',
        cropType: 'wheat'
      };

      await notificationService.notifyFarmerReviewCompleted(
        farmerId,
        reviewData
      );

      expect(mockModel).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expertName: 'Dr. Rajesh Kumar',
            cropType: 'wheat'
          })
        })
      );
    });

    it('should set high priority for farmer notifications', async () => {
      const savedId = new mongoose.Types.ObjectId();
      mockSave.mockResolvedValue({ _id: savedId });
      mockFindByIdAndUpdate.mockResolvedValue({ _id: savedId, status: 'sent' });

      const farmerId = 'farmer-123';
      const reviewData = {
        diagnosisId: new mongoose.Types.ObjectId().toString(),
        expertName: 'Dr. Rajesh Kumar',
        cropType: 'rice'
      };

      await notificationService.notifyFarmerReviewCompleted(
        farmerId,
        reviewData
      );

      expect(mockModel).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'high'
        })
      );
    });
  });

  describe('Expert Availability Management', () => {
    it('should get available experts', () => {
      const experts = notificationService.getAvailableExperts();
      
      expect(experts.length).toBeGreaterThan(0);
      experts.forEach(expert => {
        expect(expert.isAvailable).toBe(true);
        expect(expert.currentLoad).toBeLessThan(expert.maxLoad);
      });
    });

    it('should update expert availability', () => {
      const experts = notificationService.getAvailableExperts();
      const expertId = experts[0].expertId;

      notificationService.updateExpertAvailability(expertId, false);

      const updatedExperts = notificationService.getAvailableExperts();
      const unavailableExpert = updatedExperts.find(e => e.expertId === expertId);
      
      expect(unavailableExpert).toBeUndefined();
    });

    it('should reset expert load', async () => {
      const savedId = new mongoose.Types.ObjectId();
      mockSave.mockResolvedValue({ _id: savedId });
      mockFindByIdAndUpdate.mockResolvedValue({ _id: savedId, status: 'sent' });

      const experts = notificationService.getAvailableExperts();
      const expertId = experts[0].expertId;

      // Simulate some load
      await notificationService.notifyExpertReviewRequest(
        new mongoose.Types.ObjectId().toString(),
        {
          diagnosisId: new mongoose.Types.ObjectId().toString(),
          cropType: 'rice',
          confidence: 65,
          imageUrl: 'https://s3.example.com/image.jpg'
        }
      );

      // Reset load
      notificationService.resetExpertLoad(expertId);

      const updatedExperts = notificationService.getAvailableExperts();
      const resetExpert = updatedExperts.find(e => e.expertId === expertId);
      
      expect(resetExpert!.currentLoad).toBe(0);
    });
  });

  describe('Multi-Channel Support', () => {
    it('should support SMS channel', async () => {
      const savedId = new mongoose.Types.ObjectId();
      mockSave.mockResolvedValue({ _id: savedId });
      mockFindByIdAndUpdate.mockResolvedValue({ _id: savedId, status: 'sent' });

      const farmerId = 'farmer-123';
      const reviewData = {
        diagnosisId: new mongoose.Types.ObjectId().toString(),
        expertName: 'Dr. Rajesh Kumar',
        cropType: 'rice'
      };

      const result = await notificationService.notifyFarmerReviewCompleted(
        farmerId,
        reviewData
      );

      expect(result.channels).toContain('sms');
    });

    it('should support email channel', async () => {
      const savedId = new mongoose.Types.ObjectId();
      mockSave.mockResolvedValue({ _id: savedId });
      mockFindByIdAndUpdate.mockResolvedValue({ _id: savedId, status: 'sent' });

      const reviewRequestId = new mongoose.Types.ObjectId().toString();
      const diagnosisData = {
        diagnosisId: new mongoose.Types.ObjectId().toString(),
        cropType: 'rice',
        confidence: 65,
        imageUrl: 'https://s3.example.com/image.jpg'
      };

      const results = await notificationService.notifyExpertReviewRequest(
        reviewRequestId,
        diagnosisData
      );

      expect(results[0].channels).toContain('email');
    });

    it('should support push notification channel', async () => {
      const savedId = new mongoose.Types.ObjectId();
      mockSave.mockResolvedValue({ _id: savedId });
      mockFindByIdAndUpdate.mockResolvedValue({ _id: savedId, status: 'sent' });

      const farmerId = 'farmer-123';
      const reviewData = {
        diagnosisId: new mongoose.Types.ObjectId().toString(),
        expertName: 'Dr. Rajesh Kumar',
        cropType: 'rice'
      };

      const result = await notificationService.notifyFarmerReviewCompleted(
        farmerId,
        reviewData
      );

      expect(result.channels).toContain('push');
    });
  });

  describe('Notification Types', () => {
    it('should create expert_review_request notification', async () => {
      const savedId = new mongoose.Types.ObjectId();
      mockSave.mockResolvedValue({ _id: savedId });
      mockFindByIdAndUpdate.mockResolvedValue({ _id: savedId, status: 'sent' });

      const reviewRequestId = new mongoose.Types.ObjectId().toString();
      const diagnosisData = {
        diagnosisId: new mongoose.Types.ObjectId().toString(),
        cropType: 'rice',
        confidence: 65,
        imageUrl: 'https://s3.example.com/image.jpg'
      };

      await notificationService.notifyExpertReviewRequest(
        reviewRequestId,
        diagnosisData
      );

      expect(mockModel).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'expert_review_request'
        })
      );
    });

    it('should create expert_review_completed notification', async () => {
      const savedId = new mongoose.Types.ObjectId();
      mockSave.mockResolvedValue({ _id: savedId });
      mockFindByIdAndUpdate.mockResolvedValue({ _id: savedId, status: 'sent' });

      const farmerId = 'farmer-123';
      const reviewData = {
        diagnosisId: new mongoose.Types.ObjectId().toString(),
        expertName: 'Dr. Rajesh Kumar',
        cropType: 'rice'
      };

      await notificationService.notifyFarmerReviewCompleted(
        farmerId,
        reviewData
      );

      expect(mockModel).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'expert_review_completed'
        })
      );
    });
  });
});
