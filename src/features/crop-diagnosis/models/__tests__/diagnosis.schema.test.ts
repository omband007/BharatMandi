/**
 * Diagnosis Schema Tests
 * 
 * Unit tests for MongoDB schema definitions.
 */

import mongoose from 'mongoose';
import { 
  DiagnosisRecordSchema, 
  ExpertReviewRequestSchema 
} from '../diagnosis.schema';

describe('DiagnosisRecordSchema', () => {
  it('should have required fields defined', () => {
    const requiredPaths = DiagnosisRecordSchema.requiredPaths();
    
    expect(requiredPaths).toContain('userId');
    expect(requiredPaths).toContain('imageUrl');
    expect(requiredPaths).toContain('imageMetadata');
    expect(requiredPaths).toContain('diagnosis');
    expect(requiredPaths).toContain('remedies');
    expect(requiredPaths).toContain('language');
  });

  it('should have correct indexes defined', () => {
    const indexes = DiagnosisRecordSchema.indexes();
    
    // Check for compound index (userId, createdAt)
    const userHistoryIndex = indexes.find(
      idx => idx[0].userId === 1 && idx[0].createdAt === -1
    );
    expect(userHistoryIndex).toBeDefined();
    
    // Check for crop type index
    const cropTypeIndex = indexes.find(
      idx => idx[0]['diagnosis.cropType'] === 1
    );
    expect(cropTypeIndex).toBeDefined();
    
    // Check for expert review index
    const expertReviewIndex = indexes.find(
      idx => idx[0]['expertReview.required'] === 1 && idx[0]['expertReview.reviewedAt'] === 1
    );
    expect(expertReviewIndex).toBeDefined();
    
    // Check for deletedAt index
    const deletedAtIndex = indexes.find(
      idx => idx[0].deletedAt === 1
    );
    expect(deletedAtIndex).toBeDefined();
    
    // Check for TTL index
    const ttlIndex = indexes.find(
      idx => idx[0].createdAt === 1 && idx[1].expireAfterSeconds !== undefined
    );
    expect(ttlIndex).toBeDefined();
    expect(ttlIndex![1].expireAfterSeconds).toBe(63072000); // 2 years
  });

  it('should have timestamps enabled', () => {
    expect(DiagnosisRecordSchema.options.timestamps).toBe(true);
  });

  it('should use correct collection name', () => {
    expect(DiagnosisRecordSchema.options.collection).toBe('crop_diagnoses');
  });

  it('should validate language enum values', () => {
    const languagePath = DiagnosisRecordSchema.path('language');
    const enumValues = (languagePath as any).enumValues;
    
    expect(enumValues).toContain('en');
    expect(enumValues).toContain('hi');
    expect(enumValues).toContain('ta');
    expect(enumValues).toContain('te');
    expect(enumValues).toContain('kn');
    expect(enumValues).toContain('ml');
    expect(enumValues).toContain('mr');
    expect(enumValues).toContain('bn');
    expect(enumValues).toContain('gu');
    expect(enumValues).toContain('pa');
    expect(enumValues).toContain('or');
  });

  it('should validate image format enum values', () => {
    const imageMetadataPath = DiagnosisRecordSchema.path('imageMetadata');
    const formatPath = (imageMetadataPath as any).schema.path('format');
    const enumValues = formatPath.enumValues;
    
    expect(enumValues).toContain('jpeg');
    expect(enumValues).toContain('png');
    expect(enumValues).toContain('webp');
  });

  it('should validate disease type enum values', () => {
    const diagnosisPath = DiagnosisRecordSchema.path('diagnosis');
    const diseasesPath = (diagnosisPath as any).schema.path('diseases');
    const typePath = diseasesPath.schema.path('type');
    const enumValues = typePath.enumValues;
    
    expect(enumValues).toContain('fungal');
    expect(enumValues).toContain('bacterial');
    expect(enumValues).toContain('viral');
    expect(enumValues).toContain('pest');
    expect(enumValues).toContain('nutrient_deficiency');
  });

  it('should validate disease severity enum values', () => {
    const diagnosisPath = DiagnosisRecordSchema.path('diagnosis');
    const diseasesPath = (diagnosisPath as any).schema.path('diseases');
    const severityPath = diseasesPath.schema.path('severity');
    const enumValues = severityPath.enumValues;
    
    expect(enumValues).toContain('low');
    expect(enumValues).toContain('medium');
    expect(enumValues).toContain('high');
  });

  it('should validate confidence score range', () => {
    const diagnosisPath = DiagnosisRecordSchema.path('diagnosis');
    const confidencePath = (diagnosisPath as any).schema.path('confidence');
    
    expect(confidencePath.options.min).toBe(0);
    expect(confidencePath.options.max).toBe(100);
  });

  it('should validate preventive measure category enum values', () => {
    const remediesPath = DiagnosisRecordSchema.path('remedies');
    const preventivePath = (remediesPath as any).schema.path('preventive');
    const categoryPath = preventivePath.schema.path('category');
    const enumValues = categoryPath.enumValues;
    
    expect(enumValues).toContain('crop_rotation');
    expect(enumValues).toContain('irrigation');
    expect(enumValues).toContain('spacing');
    expect(enumValues).toContain('soil_health');
    expect(enumValues).toContain('timing');
  });
});

describe('ExpertReviewRequestSchema', () => {
  it('should have required fields defined', () => {
    const requiredPaths = ExpertReviewRequestSchema.requiredPaths();
    
    expect(requiredPaths).toContain('diagnosisId');
    expect(requiredPaths).toContain('userId');
    expect(requiredPaths).toContain('imageUrl');
    expect(requiredPaths).toContain('aiDiagnosis');
    expect(requiredPaths).toContain('aiRemedies');
    expect(requiredPaths).toContain('status');
  });

  it('should have correct indexes defined', () => {
    const indexes = ExpertReviewRequestSchema.indexes();
    
    // Check for diagnosisId index
    const diagnosisIdIndex = indexes.find(
      idx => idx[0].diagnosisId === 1
    );
    expect(diagnosisIdIndex).toBeDefined();
    
    // Check for userId index
    const userIdIndex = indexes.find(
      idx => idx[0].userId === 1
    );
    expect(userIdIndex).toBeDefined();
    
    // Check for status index
    const statusIndex = indexes.find(
      idx => idx[0].status === 1
    );
    expect(statusIndex).toBeDefined();
    
    // Check for assignedTo index
    const assignedToIndex = indexes.find(
      idx => idx[0].assignedTo === 1
    );
    expect(assignedToIndex).toBeDefined();
    
    // Check for compound index (status, createdAt) - for SLA monitoring
    const statusCreatedAtIndex = indexes.find(
      idx => idx[0].status === 1 && idx[0].createdAt === 1
    );
    expect(statusCreatedAtIndex).toBeDefined();
    
    // Check for compound index (assignedTo, status) - for expert workload
    const assignedToStatusIndex = indexes.find(
      idx => idx[0].assignedTo === 1 && idx[0].status === 1
    );
    expect(assignedToStatusIndex).toBeDefined();
  });

  it('should validate status enum values', () => {
    const statusPath = ExpertReviewRequestSchema.path('status');
    const enumValues = (statusPath as any).enumValues;
    
    expect(enumValues).toContain('pending');
    expect(enumValues).toContain('in_progress');
    expect(enumValues).toContain('completed');
  });

  it('should have default status as pending', () => {
    const statusPath = ExpertReviewRequestSchema.path('status');
    expect((statusPath as any).defaultValue).toBe('pending');
  });

  it('should have timestamps enabled', () => {
    expect(ExpertReviewRequestSchema.options.timestamps).toBe(true);
  });

  it('should use correct collection name', () => {
    expect(ExpertReviewRequestSchema.options.collection).toBe('expert_review_requests');
  });

  it('should validate review duration minimum value', () => {
    const durationPath = ExpertReviewRequestSchema.path('reviewDurationMinutes');
    expect((durationPath as any).options.min).toBe(0);
  });

  it('should have completedAt field for tracking review completion', () => {
    const completedAtPath = ExpertReviewRequestSchema.path('completedAt');
    expect(completedAtPath).toBeDefined();
    expect((completedAtPath as any).instance).toBe('Date');
  });

  it('should have optional expert fields for review results', () => {
    const expertDiagnosisPath = ExpertReviewRequestSchema.path('expertDiagnosis');
    const expertRemediesPath = ExpertReviewRequestSchema.path('expertRemedies');
    const expertNotesPath = ExpertReviewRequestSchema.path('expertNotes');
    
    expect(expertDiagnosisPath).toBeDefined();
    expect(expertRemediesPath).toBeDefined();
    expect(expertNotesPath).toBeDefined();
    
    // These should not be required
    const requiredPaths = ExpertReviewRequestSchema.requiredPaths();
    expect(requiredPaths).not.toContain('expertDiagnosis');
    expect(requiredPaths).not.toContain('expertRemedies');
    expect(requiredPaths).not.toContain('expertNotes');
  });

  it('should reference DiagnosisRecord collection', () => {
    const diagnosisIdPath = ExpertReviewRequestSchema.path('diagnosisId');
    expect((diagnosisIdPath as any).options.ref).toBe('DiagnosisRecord');
  });
});
