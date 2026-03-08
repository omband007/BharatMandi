/**
 * Crop Diagnosis Database Schemas
 * 
 * MongoDB schemas for crop disease diagnosis collections.
 * 
 * Requirements:
 * - 7.1: Store diagnosis records with all required fields
 * - 7.2: Associate records with user accounts
 * - 7.3: Support 2-year retention with automatic cleanup
 */

import { Schema } from 'mongoose';

// ============================================================================
// SUB-SCHEMAS
// ============================================================================

const ImageMetadataSchema = new Schema({
  format: { type: String, required: true, enum: ['jpeg', 'png', 'webp'] },
  sizeBytes: { type: Number, required: true, min: 0 },
  dimensions: {
    width: { type: Number, required: true, min: 0 },
    height: { type: Number, required: true, min: 0 }
  }
}, { _id: false });

const DiseaseSchema = new Schema({
  name: { type: String, required: true },
  scientificName: { type: String },
  type: { 
    type: String, 
    required: true,
    enum: ['fungal', 'bacterial', 'viral', 'pest', 'nutrient_deficiency']
  },
  severity: { 
    type: String, 
    required: true,
    enum: ['low', 'medium', 'high']
  },
  confidence: { type: Number, required: true, min: 0, max: 100 },
  affectedParts: [{ type: String }]
}, { _id: false });

const DiagnosisDataSchema = new Schema({
  cropType: { type: String, required: true },
  diseases: [DiseaseSchema],
  symptoms: [{ type: String }],
  confidence: { type: Number, required: true, min: 0, max: 100 }
}, { _id: false });

const ChemicalRemedySchema = new Schema({
  name: { type: String, required: true },
  genericName: { type: String, required: true },
  brandNames: [{ type: String }],
  dosage: { type: String, required: true },
  applicationMethod: { type: String, required: true },
  frequency: { type: String, required: true },
  duration: { type: String },
  preHarvestInterval: { type: Number, min: 0 },
  safetyPrecautions: [{ type: String }],
  estimatedCost: { type: String }
}, { _id: false });

const OrganicRemedySchema = new Schema({
  name: { type: String, required: true },
  ingredients: [{ type: String, required: true }],
  preparation: [{ type: String }],
  applicationMethod: { type: String, required: true },
  frequency: { type: String, required: true },
  effectiveness: { type: String },
  commercialProducts: [{ type: String }]
}, { _id: false });

const PreventiveMeasureSchema = new Schema({
  category: { 
    type: String, 
    required: true,
    enum: ['crop_rotation', 'irrigation', 'spacing', 'soil_health', 'timing']
  },
  description: { type: String, required: true },
  timing: { type: String },
  frequency: { type: String }
}, { _id: false });

const RemediesSchema = new Schema({
  chemical: [ChemicalRemedySchema],
  organic: [OrganicRemedySchema],
  preventive: [PreventiveMeasureSchema]
}, { _id: false });

const LocationSchema = new Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  state: { type: String },
  district: { type: String }
}, { _id: false });

const ExpertReviewSchema = new Schema({
  required: { type: Boolean, required: true, default: false },
  reviewedAt: { type: Date },
  reviewedBy: { type: String },
  expertDiagnosis: { type: String },
  expertRemedies: { type: String }
}, { _id: false });

const FeedbackSchema = new Schema({
  accurate: { type: Boolean, required: true },
  actualDisease: { type: String },
  comments: { type: String },
  submittedAt: { type: Date, default: Date.now }
}, { _id: false });

// ============================================================================
// DIAGNOSIS RECORD SCHEMA
// ============================================================================

export const DiagnosisRecordSchema = new Schema({
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  imageUrl: { 
    type: String, 
    required: true 
  },
  imageMetadata: { 
    type: ImageMetadataSchema, 
    required: true 
  },
  diagnosis: { 
    type: DiagnosisDataSchema, 
    required: true 
  },
  remedies: { 
    type: RemediesSchema, 
    required: true 
  },
  location: { 
    type: LocationSchema 
  },
  language: { 
    type: String, 
    required: true,
    enum: ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa', 'or']
  },
  expertReview: { 
    type: ExpertReviewSchema,
    default: () => ({ required: false })
  },
  feedback: { 
    type: FeedbackSchema 
  },
  deletedAt: { 
    type: Date,
    index: true
  }
}, {
  timestamps: true,
  collection: 'crop_diagnoses'
});

// ============================================================================
// INDEXES
// ============================================================================

// Compound index for user history queries (newest first)
// Requirement 7.4: Retrieve history sorted by date
DiagnosisRecordSchema.index({ userId: 1, createdAt: -1 });

// Index for filtering by crop type
// Requirement 7.7: Support filtering by crop type
DiagnosisRecordSchema.index({ 'diagnosis.cropType': 1 });

// Compound index for expert review queries
// Requirement 10.1: Route low-confidence diagnoses to experts
DiagnosisRecordSchema.index({ 
  'expertReview.required': 1, 
  'expertReview.reviewedAt': 1 
});

// TTL index for automatic cleanup after 2 years
// Requirement 7.5: Retain records for at least 2 years
DiagnosisRecordSchema.index(
  { createdAt: 1 }, 
  { 
    expireAfterSeconds: 63072000, // 2 years in seconds (365 * 2 * 24 * 60 * 60)
    partialFilterExpression: { deletedAt: { $exists: false } }
  }
);

// Index for soft delete queries
// Requirement 14.6: Support soft delete with deletedAt field
DiagnosisRecordSchema.index({ deletedAt: 1 });

// ============================================================================
// EXPERT REVIEW REQUEST SCHEMA
// ============================================================================

const AIDiagnosisSchema = new Schema({
  cropType: { type: String, required: true },
  diseases: [DiseaseSchema],
  confidence: { type: Number, required: true, min: 0, max: 100 }
}, { _id: false });

export const ExpertReviewRequestSchema = new Schema({
  diagnosisId: { 
    type: Schema.Types.ObjectId, 
    required: true, 
    index: true,
    ref: 'DiagnosisRecord'
  },
  userId: { 
    type: String, 
    required: true, 
    index: true 
  },
  imageUrl: { 
    type: String, 
    required: true 
  },
  aiDiagnosis: { 
    type: AIDiagnosisSchema, 
    required: true 
  },
  aiRemedies: { 
    type: RemediesSchema, 
    required: true 
  },
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'in_progress', 'completed'],
    default: 'pending',
    index: true
  },
  assignedTo: { 
    type: String,
    index: true
  },
  expertDiagnosis: { type: String },
  expertRemedies: { type: String },
  expertNotes: { type: String },
  reviewDurationMinutes: { type: Number, min: 0 },
  completedAt: { type: Date }
}, {
  timestamps: true,
  collection: 'expert_review_requests'
});

// ============================================================================
// EXPERT REVIEW REQUEST INDEXES
// ============================================================================

// Compound index for pending reviews (SLA monitoring)
// Requirement 10.1, 10.7: Track expert review requests and response times
ExpertReviewRequestSchema.index({ status: 1, createdAt: 1 });

// Compound index for expert workload queries
// Requirement 10.2: Notify available experts of pending reviews
ExpertReviewRequestSchema.index({ assignedTo: 1, status: 1 });
