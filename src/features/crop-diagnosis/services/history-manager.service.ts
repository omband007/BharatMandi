/**
 * Diagnosis History Manager Service
 * 
 * Manages storage and retrieval of diagnosis records in MongoDB.
 * 
 * Requirements:
 * - 7.1: Store complete diagnosis record in MongoDB
 * - 7.2: Associate records with user accounts
 * - 7.3: Retrieve diagnosis by diagnosisId
 * - 7.4: Retrieve user history with filtering and pagination
 * - 7.6: View full details of past diagnoses
 * - 7.7: Support filtering by crop type and date range
 */

import mongoose from 'mongoose';
import { DiagnosisRecordModel } from '../models/diagnosis.model';
import type {
  DiagnosisRecord,
  DiagnosisData,
  Remedies,
  ImageMetadata,
  Location
} from '../models/diagnosis.model';

// ============================================================================
// TYPES
// ============================================================================

export interface SaveDiagnosisInput {
  userId: string;
  imageUrl: string;
  imageMetadata: ImageMetadata;
  diagnosis: DiagnosisData;
  remedies: Remedies;
  location?: Location;
  language: 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu' | 'pa' | 'or';
  expertReviewRequired?: boolean;
}

export interface HistoryFilters {
  cropType?: string;
  startDate?: Date;
  endDate?: Date;
  minConfidence?: number;
  expertReviewed?: boolean;
}

export interface PaginationOptions {
  limit?: number;
  skip?: number;
}

// ============================================================================
// HISTORY MANAGER SERVICE
// ============================================================================

export class HistoryManager {
  /**
   * Save a diagnosis record to MongoDB
   * 
   * Stores the complete diagnosis record including image metadata, diagnosis results,
   * remedies, and user information. Associates the record with the user's account.
   * 
   * Requirements:
   * - 7.1: Store complete diagnosis record in MongoDB
   * - 7.2: Associate records with user accounts
   * 
   * @param input - Diagnosis data to save
   * @returns Diagnosis ID
   */
  async saveDiagnosis(input: SaveDiagnosisInput): Promise<string> {
    try {
      const diagnosisRecord = new DiagnosisRecordModel({
        userId: input.userId,
        imageUrl: input.imageUrl,
        imageMetadata: input.imageMetadata,
        diagnosis: input.diagnosis,
        remedies: input.remedies,
        location: input.location,
        language: input.language,
        expertReview: {
          required: input.expertReviewRequired || false
        }
      });

      const saved = await diagnosisRecord.save();
      return saved._id.toString();
    } catch (error) {
      throw new Error(
        `Failed to save diagnosis: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get a diagnosis record by ID
   * 
   * Retrieves the complete diagnosis record including all metadata, diagnosis results,
   * remedies, and expert review information if available.
   * 
   * Requirements:
   * - 7.3: Retrieve diagnosis by diagnosisId
   * - 7.6: View full details of past diagnoses
   * 
   * @param diagnosisId - Diagnosis record ID
   * @returns Diagnosis record or null if not found
   */
  async getDiagnosis(diagnosisId: string): Promise<DiagnosisRecord | null> {
    try {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(diagnosisId)) {
        return null;
      }

      const diagnosis = await DiagnosisRecordModel
        .findOne({
          _id: diagnosisId,
          deletedAt: { $exists: false } // Exclude soft-deleted records
        })
        .lean()
        .exec();

      if (!diagnosis) {
        return null;
      }

      return this.mapToDiagnosisRecord(diagnosis);
    } catch (error) {
      throw new Error(
        `Failed to get diagnosis: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get user's diagnosis history with filtering and pagination
   * 
   * Retrieves all diagnosis records for a user, sorted by creation date (newest first).
   * Supports filtering by crop type, date range, confidence level, and expert review status.
   * Implements pagination with limit and skip parameters.
   * 
   * Requirements:
   * - 7.4: Retrieve user history sorted by date (newest first)
   * - 7.7: Support filtering by crop type and date range
   * 
   * @param userId - User ID
   * @param filters - Optional filters (cropType, date range, confidence, expert review)
   * @param pagination - Optional pagination (limit, skip)
   * @returns Array of diagnosis records
   */
  async getUserHistory(
    userId: string,
    filters: HistoryFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<DiagnosisRecord[]> {
    try {
      // Build query
      const query: any = {
        userId,
        deletedAt: { $exists: false } // Exclude soft-deleted records
      };

      // Apply crop type filter
      if (filters.cropType) {
        query['diagnosis.cropType'] = filters.cropType;
      }

      // Apply date range filter
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = filters.startDate;
        }
        if (filters.endDate) {
          query.createdAt.$lte = filters.endDate;
        }
      }

      // Apply confidence filter
      if (filters.minConfidence !== undefined) {
        query['diagnosis.confidence'] = { $gte: filters.minConfidence };
      }

      // Apply expert review filter
      if (filters.expertReviewed !== undefined) {
        if (filters.expertReviewed) {
          query['expertReview.reviewedAt'] = { $exists: true };
        } else {
          query['expertReview.reviewedAt'] = { $exists: false };
        }
      }

      // Set pagination defaults
      const limit = pagination.limit || 20;
      const skip = pagination.skip || 0;

      // Execute query
      const diagnoses = await DiagnosisRecordModel
        .find(query)
        .sort({ createdAt: -1 }) // Newest first
        .limit(limit)
        .skip(skip)
        .lean()
        .exec();

      return diagnoses.map(this.mapToDiagnosisRecord);
    } catch (error) {
      throw new Error(
        `Failed to get user history: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Delete a diagnosis record (soft delete)
   * 
   * Performs soft delete by setting deletedAt timestamp. Verifies user ownership
   * before deletion. Schedules S3 image deletion within 24 hours.
   * 
   * Requirements:
   * - 14.5: Allow farmers to delete their diagnosis history
   * - 14.6: Remove both database records and S3 images within 24 hours
   * 
   * @param diagnosisId - Diagnosis record ID
   * @param userId - User ID (for authorization)
   * @throws Error if diagnosis not found or user not authorized
   */
  async deleteDiagnosis(diagnosisId: string, userId: string): Promise<void> {
    try {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(diagnosisId)) {
        throw new Error('Invalid diagnosis ID format');
      }

      // Find the diagnosis and verify ownership
      const diagnosis = await DiagnosisRecordModel.findOne({
        _id: diagnosisId,
        deletedAt: { $exists: false } // Not already deleted
      }).exec();

      if (!diagnosis) {
        throw new Error('Diagnosis not found');
      }

      // Verify user owns the diagnosis
      if (diagnosis.userId !== userId) {
        throw new Error('Unauthorized: User does not own this diagnosis');
      }

      // Perform soft delete by setting deletedAt timestamp
      diagnosis.deletedAt = new Date();
      await diagnosis.save();

      // Schedule S3 image deletion within 24 hours
      // Using setTimeout for simplicity - in production, use a job queue (Bull, AWS SQS, etc.)
      const imageKey = diagnosis.imageUrl;
      const deletionDelay = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      setTimeout(async () => {
        try {
          // Import S3Service dynamically to avoid circular dependencies
          const { s3Service } = await import('./s3.service');
          await s3Service.deleteImage(imageKey);
          console.log(`[HistoryManager] Deleted S3 image: ${imageKey}`);
        } catch (error) {
          console.error(
            `[HistoryManager] Failed to delete S3 image ${imageKey}:`,
            error instanceof Error ? error.message : 'Unknown error'
          );
        }
      }, deletionDelay);

      console.log(
        `[HistoryManager] Soft deleted diagnosis ${diagnosisId}, S3 deletion scheduled for ${imageKey}`
      );
    } catch (error) {
      throw new Error(
        `Failed to delete diagnosis: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update feedback for a diagnosis record
   * 
   * Allows farmers to provide feedback on diagnosis accuracy. This feedback
   * is used to improve the system and track diagnosis quality.
   * 
   * @param diagnosisId - Diagnosis record ID
   * @param feedback - Feedback data
   * @throws Error if diagnosis not found
   */
  async updateFeedback(
    diagnosisId: string,
    feedback: { accurate: boolean; actualDisease?: string; comments?: string; submittedAt: Date }
  ): Promise<void> {
    try {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(diagnosisId)) {
        throw new Error('Invalid diagnosis ID format');
      }

      // Update the diagnosis with feedback
      const result = await DiagnosisRecordModel.updateOne(
        {
          _id: diagnosisId,
          deletedAt: { $exists: false } // Not deleted
        },
        {
          $set: {
            feedback: {
              accurate: feedback.accurate,
              actualDisease: feedback.actualDisease,
              comments: feedback.comments,
              submittedAt: feedback.submittedAt
            }
          }
        }
      ).exec();

      if (result.matchedCount === 0) {
        throw new Error('Diagnosis not found');
      }

      console.log(`[HistoryManager] Updated feedback for diagnosis ${diagnosisId}`);
    } catch (error) {
      throw new Error(
        `Failed to update feedback: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Map database document to DiagnosisRecord interface
   * 
   * @param doc - MongoDB document
   * @returns DiagnosisRecord
   */
  private mapToDiagnosisRecord(doc: any): DiagnosisRecord {
    return {
      userId: doc.userId,
      imageUrl: doc.imageUrl,
      imageMetadata: doc.imageMetadata,
      diagnosis: doc.diagnosis,
      remedies: doc.remedies,
      location: doc.location,
      language: doc.language,
      expertReview: doc.expertReview,
      feedback: doc.feedback,
      deletedAt: doc.deletedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
}

// Export singleton instance
export const historyManager = new HistoryManager();
