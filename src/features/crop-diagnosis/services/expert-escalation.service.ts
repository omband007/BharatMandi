/**
 * Expert Escalation Service
 * 
 * Routes low-confidence diagnoses to agricultural experts for review.
 * 
 * Requirements:
 * - 10.1: Create expert review request when confidence <80%
 * - 10.3: Provide experts with original image, AI analysis, and confidence scores
 */

import mongoose from 'mongoose';
import { ExpertReviewRequestSchema } from '../models/diagnosis.schema';
import { DiagnosisRecordModel } from '../models/diagnosis.model';
import type { RemedyResponse } from './remedy-generator.service';
import { notificationService } from './notification.service';

// ============================================================================
// TYPES
// ============================================================================

export interface Disease {
  name: string;
  scientificName: string;
  type: 'fungal' | 'bacterial' | 'viral' | 'pest' | 'nutrient_deficiency';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  affectedParts: string[];
}

export interface AIDiagnosis {
  cropType: string;
  diseases: Disease[];
  confidence: number;
}

export interface CreateReviewRequestInput {
  diagnosisId: string;
  userId: string;
  imageUrl: string;
  aiDiagnosis: AIDiagnosis;
  aiRemedies: RemedyResponse;
}

export interface ReviewRequest {
  _id: string;
  diagnosisId: string;
  userId: string;
  imageUrl: string;
  aiDiagnosis: AIDiagnosis;
  aiRemedies: RemedyResponse;
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo?: string;
  expertDiagnosis?: string;
  expertRemedies?: string;
  expertNotes?: string;
  reviewDurationMinutes?: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpertReview {
  expertId: string;
  diagnosis: {
    cropType: string;
    diseases: string[];
    notes: string;
  };
  remedies: string;
  confidence: number;
  reviewDurationMinutes: number;
}

// ============================================================================
// EXPERT ESCALATION SERVICE
// ============================================================================

export class ExpertEscalationService {
  private reviewRequestModel: mongoose.Model<any>;

  constructor() {
    // Create or retrieve the model
    this.reviewRequestModel = mongoose.models.ExpertReviewRequest || 
      mongoose.model('ExpertReviewRequest', ExpertReviewRequestSchema);
  }

  /**
   * Create a review request for expert evaluation
   * 
   * Automatically creates a review request when AI confidence is below 80%.
   * Stores the complete AI diagnosis and remedies for expert reference.
   * Sends notifications to available experts.
   * 
   * Requirements:
   * - 10.1: Create expert review request when confidence <80%
   * - 10.2: Notify available experts when review request created
   * - 10.3: Store AI diagnosis and remedies for expert reference
   * 
   * @param input - Review request data including diagnosis and remedies
   * @returns Review request ID
   */
  async createReviewRequest(input: CreateReviewRequestInput): Promise<string> {
    try {
      // Create review request document
      const reviewRequest = new this.reviewRequestModel({
        diagnosisId: new mongoose.Types.ObjectId(input.diagnosisId),
        userId: input.userId,
        imageUrl: input.imageUrl,
        aiDiagnosis: {
          cropType: input.aiDiagnosis.cropType,
          diseases: input.aiDiagnosis.diseases,
          confidence: input.aiDiagnosis.confidence
        },
        aiRemedies: {
          chemical: input.aiRemedies.chemical,
          organic: input.aiRemedies.organic,
          preventive: input.aiRemedies.preventive
        },
        status: 'pending'
      });

      // Save to database
      const saved = await reviewRequest.save();
      const reviewRequestId = saved._id.toString();

      // Notify available experts (async, don't block on notification failures)
      try {
        const diseaseType = input.aiDiagnosis.diseases[0]?.type;
        await notificationService.notifyExpertReviewRequest(reviewRequestId, {
          diagnosisId: input.diagnosisId,
          cropType: input.aiDiagnosis.cropType,
          confidence: input.aiDiagnosis.confidence,
          imageUrl: input.imageUrl,
          diseaseType
        });
      } catch (notificationError) {
        // Log notification failure but don't fail the review request creation
        console.error('Failed to notify experts:', notificationError);
      }

      return reviewRequestId;
    } catch (error) {
      throw new Error(
        `Failed to create review request: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get pending review requests for an expert
   * 
   * Retrieves all review requests that are either pending or assigned to the expert.
   * 
   * @param expertId - Expert user ID
   * @returns Array of review requests
   */
  async getPendingReviews(expertId: string): Promise<ReviewRequest[]> {
    try {
      const reviews = await this.reviewRequestModel
        .find({
          $or: [
            { status: 'pending' },
            { assignedTo: expertId, status: 'in_progress' }
          ]
        })
        .sort({ createdAt: 1 }) // Oldest first (FIFO)
        .lean()
        .exec();

      return reviews.map(this.mapToReviewRequest);
    } catch (error) {
      throw new Error(
        `Failed to get pending reviews: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Submit expert review for a diagnosis
   * 
   * Updates the review request with expert findings and marks it as completed.
   * Also updates the original DiagnosisRecord with expert review data.
   * Notifies the farmer that their review is complete.
   * 
   * Requirements:
   * - 10.4: Notify farmer when expert completes review
   * - 10.5: Allow experts to modify diagnosis and remedies
   * - 10.6: Mark expert-reviewed diagnoses with verification badge
   * 
   * @param reviewId - Review request ID
   * @param review - Expert review data
   */
  async submitReview(reviewId: string, review: ExpertReview): Promise<void> {
    try {
      // Update the review request
      const updated = await this.reviewRequestModel.findByIdAndUpdate(
        reviewId,
        {
          $set: {
            status: 'completed',
            assignedTo: review.expertId,
            expertDiagnosis: JSON.stringify(review.diagnosis),
            expertRemedies: review.remedies,
            expertNotes: review.diagnosis.notes,
            reviewDurationMinutes: review.reviewDurationMinutes,
            completedAt: new Date()
          }
        },
        { new: true }
      );

      if (!updated) {
        throw new Error(`Review request not found: ${reviewId}`);
      }

      // Update the original DiagnosisRecord with expert review data
      const diagnosisId = updated.diagnosisId;
      await DiagnosisRecordModel.findByIdAndUpdate(
        diagnosisId,
        {
          $set: {
            'expertReview.required': true,
            'expertReview.reviewedAt': new Date(),
            'expertReview.reviewedBy': review.expertId,
            'expertReview.expertDiagnosis': JSON.stringify(review.diagnosis),
            'expertReview.expertRemedies': review.remedies
          }
        }
      );

      // Notify farmer that review is complete (async, don't block on notification failures)
      try {
        await notificationService.notifyFarmerReviewCompleted(updated.userId, {
          diagnosisId: updated.diagnosisId.toString(),
          expertName: `Expert ${review.expertId}`, // In production, fetch expert name from database
          cropType: updated.aiDiagnosis.cropType
        });
      } catch (notificationError) {
        // Log notification failure but don't fail the review submission
        console.error('Failed to notify farmer:', notificationError);
      }
    } catch (error) {
      throw new Error(
        `Failed to submit review: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get review request by ID
   * 
   * @param reviewId - Review request ID
   * @returns Review request or null if not found
   */
  async getReviewRequest(reviewId: string): Promise<ReviewRequest | null> {
    try {
      const review = await this.reviewRequestModel
        .findById(reviewId)
        .lean()
        .exec();

      return review ? this.mapToReviewRequest(review) : null;
    } catch (error) {
      throw new Error(
        `Failed to get review request: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Assign a review request to an expert
   * 
   * @param reviewId - Review request ID
   * @param expertId - Expert user ID
   */
  async assignReview(reviewId: string, expertId: string): Promise<void> {
    try {
      const updated = await this.reviewRequestModel.findByIdAndUpdate(
        reviewId,
        {
          $set: {
            status: 'in_progress',
            assignedTo: expertId
          }
        },
        { new: true }
      );

      if (!updated) {
        throw new Error(`Review request not found: ${reviewId}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to assign review: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Map database document to ReviewRequest interface
   */
  private mapToReviewRequest(doc: any): ReviewRequest {
    return {
      _id: doc._id.toString(),
      diagnosisId: doc.diagnosisId.toString(),
      userId: doc.userId,
      imageUrl: doc.imageUrl,
      aiDiagnosis: doc.aiDiagnosis,
      aiRemedies: doc.aiRemedies,
      status: doc.status,
      assignedTo: doc.assignedTo,
      expertDiagnosis: doc.expertDiagnosis,
      expertRemedies: doc.expertRemedies,
      expertNotes: doc.expertNotes,
      reviewDurationMinutes: doc.reviewDurationMinutes,
      completedAt: doc.completedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}

// Export singleton instance
export const expertEscalationService = new ExpertEscalationService();
