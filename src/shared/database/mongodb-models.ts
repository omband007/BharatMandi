import { model, Model, Document } from 'mongoose';
import {
  PhotoLogSchema,
  QualityCertificateSchema,
  PricePredictionSchema,
  VoiceQuerySchema,
  FeedbackCommentSchema,
  DiseaseDiagnosisSchema,
  SoilTestReportSchema,
  SmartAlertSchema,
  TraceabilityRecordSchema,
  AdListingSchema,
  FarmingTipSchema
} from './mongodb-schemas';

// Import types
import {
  PhotoLogEntry,
  DigitalQualityCertificate,
  PricePrediction,
  VoiceQuery,
  DiseaseDiagnosis,
  SoilTestReport,
  SmartAlert,
  TraceabilityRecord,
  AdListing
} from '../../types';

// ============================================================================
// DOCUMENT INTERFACES (Mongoose Documents)
// ============================================================================

export interface PhotoLogDocument extends Omit<PhotoLogEntry, 'id'>, Document {}
export interface QualityCertificateDocument extends Omit<DigitalQualityCertificate, 'id'>, Document {}
export interface PricePredictionDocument extends Omit<PricePrediction, 'id'>, Document {}
export interface VoiceQueryDocument extends Omit<VoiceQuery, 'id'>, Document {}
export interface DiseaseDiagnosisDocument extends Omit<DiseaseDiagnosis, 'id'>, Document {}
export interface SoilTestReportDocument extends Omit<SoilTestReport, 'id'>, Document {}
export interface SmartAlertDocument extends Omit<SmartAlert, 'id'>, Document {}
export interface TraceabilityRecordDocument extends Omit<TraceabilityRecord, 'id'>, Document {}
export interface AdListingDocument extends Omit<AdListing, 'id'>, Document {}

export interface FeedbackComment {
  transactionId: string;
  fromUserId: string;
  toUserId: string;
  rating: number;
  comment?: string;
  response?: string;
  timestamp: Date;
}

export interface FeedbackCommentDocument extends FeedbackComment, Document {}

export interface FarmingTip {
  crop: string;
  topic: 'planting' | 'irrigation' | 'pest-control' | 'harvesting';
  advice: string;
  tips: string[];
  season?: string;
  region?: string;
  language: string;
  references: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FarmingTipDocument extends FarmingTip, Document {}

// ============================================================================
// MODELS
// ============================================================================

export const PhotoLogModel: Model<PhotoLogDocument> = model<PhotoLogDocument>(
  'PhotoLog',
  PhotoLogSchema
);

export const QualityCertificateModel: Model<QualityCertificateDocument> = model<QualityCertificateDocument>(
  'QualityCertificate',
  QualityCertificateSchema
);

export const PricePredictionModel: Model<PricePredictionDocument> = model<PricePredictionDocument>(
  'PricePrediction',
  PricePredictionSchema
);

export const VoiceQueryModel: Model<VoiceQueryDocument> = model<VoiceQueryDocument>(
  'VoiceQuery',
  VoiceQuerySchema
);

export const FeedbackCommentModel: Model<FeedbackCommentDocument> = model<FeedbackCommentDocument>(
  'FeedbackComment',
  FeedbackCommentSchema
);

export const DiseaseDiagnosisModel: Model<DiseaseDiagnosisDocument> = model<DiseaseDiagnosisDocument>(
  'DiseaseDiagnosis',
  DiseaseDiagnosisSchema
);

export const SoilTestReportModel: Model<SoilTestReportDocument> = model<SoilTestReportDocument>(
  'SoilTestReport',
  SoilTestReportSchema
);

export const SmartAlertModel: Model<SmartAlertDocument> = model<SmartAlertDocument>(
  'SmartAlert',
  SmartAlertSchema
);

export const TraceabilityRecordModel: Model<TraceabilityRecordDocument> = model<TraceabilityRecordDocument>(
  'TraceabilityRecord',
  TraceabilityRecordSchema
);

export const AdListingModel: Model<AdListingDocument> = model<AdListingDocument>(
  'AdListing',
  AdListingSchema
);

export const FarmingTipModel: Model<FarmingTipDocument> = model<FarmingTipDocument>(
  'FarmingTip',
  FarmingTipSchema
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Create indexes for all collections
export async function createIndexes(): Promise<void> {
  console.log('Creating MongoDB indexes...');
  
  await PhotoLogModel.createIndexes();
  await QualityCertificateModel.createIndexes();
  await PricePredictionModel.createIndexes();
  await VoiceQueryModel.createIndexes();
  await FeedbackCommentModel.createIndexes();
  await DiseaseDiagnosisModel.createIndexes();
  await SoilTestReportModel.createIndexes();
  await SmartAlertModel.createIndexes();
  await TraceabilityRecordModel.createIndexes();
  await AdListingModel.createIndexes();
  await FarmingTipModel.createIndexes();
  
  console.log('✓ All MongoDB indexes created successfully');
}

// Drop all collections (for development/testing)
export async function dropAllCollections(): Promise<void> {
  if (!mongoose.connection.db) {
    throw new Error('Database connection not established');
  }
  const collections = await mongoose.connection.db.collections();
  
  for (const collection of collections) {
    await collection.drop();
  }
  
  console.log('✓ All collections dropped');
}

// Get collection statistics
export async function getCollectionStats(): Promise<any> {
  const stats: any = {};
  
  stats.photoLogs = await PhotoLogModel.countDocuments();
  stats.qualityCertificates = await QualityCertificateModel.countDocuments();
  stats.pricePredictions = await PricePredictionModel.countDocuments();
  stats.voiceQueries = await VoiceQueryModel.countDocuments();
  stats.feedbackComments = await FeedbackCommentModel.countDocuments();
  stats.diseaseDiagnoses = await DiseaseDiagnosisModel.countDocuments();
  stats.soilTestReports = await SoilTestReportModel.countDocuments();
  stats.smartAlerts = await SmartAlertModel.countDocuments();
  stats.traceabilityRecords = await TraceabilityRecordModel.countDocuments();
  stats.adListings = await AdListingModel.countDocuments();
  stats.farmingTips = await FarmingTipModel.countDocuments();
  
  return stats;
}

// Export mongoose for direct access if needed
import mongoose from 'mongoose';
export { mongoose };
