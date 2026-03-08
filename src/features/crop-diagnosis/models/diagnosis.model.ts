/**
 * Crop Diagnosis Mongoose Models
 * 
 * Exports Mongoose models for crop disease diagnosis collections.
 */

import mongoose, { Model, Document } from 'mongoose';
import { 
  DiagnosisRecordSchema, 
  ExpertReviewRequestSchema 
} from './diagnosis.schema';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ImageMetadata {
  format: 'jpeg' | 'png' | 'webp';
  sizeBytes: number;
  dimensions: {
    width: number;
    height: number;
  };
}

export interface Disease {
  name: string;
  scientificName?: string;
  type: 'fungal' | 'bacterial' | 'viral' | 'pest' | 'nutrient_deficiency';
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  affectedParts: string[];
}

export interface DiagnosisData {
  cropType: string;
  diseases: Disease[];
  symptoms: string[];
  confidence: number;
}

export interface ChemicalRemedy {
  name: string;
  genericName: string;
  brandNames: string[];
  dosage: string;
  applicationMethod: string;
  frequency: string;
  duration?: string;
  preHarvestInterval?: number;
  safetyPrecautions: string[];
  estimatedCost?: string;
}

export interface OrganicRemedy {
  name: string;
  ingredients: string[];
  preparation?: string[];
  applicationMethod: string;
  frequency: string;
  effectiveness?: string;
  commercialProducts?: string[];
}

export interface PreventiveMeasure {
  category: 'crop_rotation' | 'irrigation' | 'spacing' | 'soil_health' | 'timing';
  description: string;
  timing?: string;
  frequency?: string;
}

export interface Remedies {
  chemical: ChemicalRemedy[];
  organic: OrganicRemedy[];
  preventive: PreventiveMeasure[];
}

export interface Location {
  latitude: number;
  longitude: number;
  state?: string;
  district?: string;
}

export interface ExpertReview {
  required: boolean;
  reviewedAt?: Date;
  reviewedBy?: string;
  expertDiagnosis?: string;
  expertRemedies?: string;
}

export interface Feedback {
  accurate: boolean;
  actualDisease?: string;
  comments?: string;
  submittedAt: Date;
}

export interface DiagnosisRecord {
  userId: string;
  imageUrl: string;
  imageMetadata: ImageMetadata;
  diagnosis: DiagnosisData;
  remedies: Remedies;
  location?: Location;
  language: 'en' | 'hi' | 'ta' | 'te' | 'kn' | 'ml' | 'mr' | 'bn' | 'gu' | 'pa' | 'or';
  expertReview?: ExpertReview;
  feedback?: Feedback;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIDiagnosis {
  cropType: string;
  diseases: Disease[];
  confidence: number;
}

export interface ExpertReviewRequest {
  diagnosisId: mongoose.Types.ObjectId;
  userId: string;
  imageUrl: string;
  aiDiagnosis: AIDiagnosis;
  aiRemedies: Remedies;
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

// ============================================================================
// DOCUMENT INTERFACES
// ============================================================================

export interface DiagnosisRecordDocument extends DiagnosisRecord, Document {
  _id: mongoose.Types.ObjectId;
}

export interface ExpertReviewRequestDocument extends ExpertReviewRequest, Document {
  _id: mongoose.Types.ObjectId;
}

// ============================================================================
// MODELS
// ============================================================================

export const DiagnosisRecordModel: Model<DiagnosisRecordDocument> = 
  mongoose.models.DiagnosisRecord || 
  mongoose.model<DiagnosisRecordDocument>('DiagnosisRecord', DiagnosisRecordSchema);

export const ExpertReviewRequestModel: Model<ExpertReviewRequestDocument> = 
  mongoose.models.ExpertReviewRequest || 
  mongoose.model<ExpertReviewRequestDocument>('ExpertReviewRequest', ExpertReviewRequestSchema);
