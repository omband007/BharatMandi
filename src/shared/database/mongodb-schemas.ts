import { Schema } from 'mongoose';

// ============================================================================
// PHOTO LOG SCHEMA
// ============================================================================
export const PhotoLogSchema = new Schema({
  farmerId: { type: String, required: true, index: true },
  imageUrl: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['TILLING', 'SOWING', 'SPRAYING', 'FERTIGATION', 'HARVEST', 'OTHER'],
    index: true
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  timestamp: { type: Date, required: true, default: Date.now, index: true },
  notes: { type: String },
  transactionId: { type: String, index: true }
}, {
  timestamps: true,
  collection: 'photo_logs'
});

// Indexes
PhotoLogSchema.index({ farmerId: 1, timestamp: -1 });
PhotoLogSchema.index({ category: 1, timestamp: -1 });

// ============================================================================
// QUALITY CERTIFICATE SCHEMA
// ============================================================================
export const QualityCertificateSchema = new Schema({
  certificateId: { type: String, required: true, unique: true, index: true },
  farmerId: { type: String, required: true, index: true },
  produceType: { type: String, required: true, index: true },
  grade: { 
    type: String, 
    required: true,
    enum: ['A', 'B', 'C']
  },
  timestamp: { type: Date, required: true, default: Date.now },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  imageHash: { type: String, required: true },
  analysisDetails: {
    size: { type: Number },
    shape: { type: Number },
    color: { type: Number },
    defects: { type: Number },
    confidence: { type: Number, required: true }
  }
}, {
  timestamps: true,
  collection: 'quality_certificates'
});

// Indexes
QualityCertificateSchema.index({ farmerId: 1, timestamp: -1 });
QualityCertificateSchema.index({ produceType: 1, grade: 1 });

// ============================================================================
// PRICE PREDICTION SCHEMA
// ============================================================================
export const PricePredictionSchema = new Schema({
  produceType: { type: String, required: true, index: true },
  location: { type: String, required: true, index: true },
  predictions: [{
    date: { type: Date, required: true },
    predictedPrice: { type: Number, required: true },
    confidenceInterval: {
      lower: { type: Number, required: true },
      upper: { type: Number, required: true }
    }
  }],
  confidence: { type: Number, required: true },
  generatedAt: { type: Date, required: true, default: Date.now, index: true }
}, {
  timestamps: true,
  collection: 'price_predictions'
});

// Indexes
PricePredictionSchema.index({ produceType: 1, location: 1, generatedAt: -1 });

// ============================================================================
// VOICE QUERY SCHEMA
// ============================================================================
export const VoiceQuerySchema = new Schema({
  userId: { type: String, required: true, index: true },
  query: { type: String, required: true },
  response: { type: String, required: true },
  confidence: { type: Number, required: true },
  timestamp: { type: Date, required: true, default: Date.now, index: true },
  language: { type: String, default: 'en' },
  queryType: { 
    type: String,
    enum: ['PRICE', 'WEATHER', 'BEST_PRACTICE', 'PLATFORM_HELP', 'OTHER']
  }
}, {
  timestamps: true,
  collection: 'voice_queries'
});

// Indexes
VoiceQuerySchema.index({ userId: 1, timestamp: -1 });

// ============================================================================
// FEEDBACK COMMENTS SCHEMA
// ============================================================================
export const FeedbackCommentSchema = new Schema({
  transactionId: { type: String, required: true, index: true },
  fromUserId: { type: String, required: true, index: true },
  toUserId: { type: String, required: true, index: true },
  rating: { type: Number, required: true, min: 0, max: 5 },
  comment: { type: String },
  response: { type: String },
  timestamp: { type: Date, required: true, default: Date.now, index: true }
}, {
  timestamps: true,
  collection: 'feedback_comments'
});

// Indexes
FeedbackCommentSchema.index({ toUserId: 1, timestamp: -1 });

// ============================================================================
// DISEASE DIAGNOSIS SCHEMA
// ============================================================================
export const DiseaseDiagnosisSchema = new Schema({
  farmerId: { type: String, required: true, index: true },
  imageUrl: { type: String, required: true },
  diseaseName: { type: String, required: true },
  severity: { 
    type: String, 
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH']
  },
  confidence: { type: Number, required: true },
  treatments: [{
    name: { type: String, required: true },
    type: { type: String, enum: ['CHEMICAL', 'ORGANIC'], required: true },
    dosage: { type: String, required: true },
    applicationMethod: { type: String, required: true }
  }],
  timestamp: { type: Date, required: true, default: Date.now, index: true },
  photoLogId: { type: String }
}, {
  timestamps: true,
  collection: 'disease_diagnoses'
});

// Indexes
DiseaseDiagnosisSchema.index({ farmerId: 1, timestamp: -1 });
DiseaseDiagnosisSchema.index({ diseaseName: 1 });

// ============================================================================
// SOIL TEST REPORT SCHEMA
// ============================================================================
export const SoilTestReportSchema = new Schema({
  farmerId: { type: String, required: true, index: true },
  testDate: { type: Date, required: true },
  labName: { type: String, required: true },
  parameters: {
    pH: { type: Number, required: true },
    nitrogen: { type: Number, required: true },
    phosphorus: { type: Number, required: true },
    potassium: { type: Number, required: true },
    organicCarbon: { type: Number, required: true },
    electricalConductivity: { type: Number, required: true },
    micronutrients: {
      zinc: { type: Number },
      iron: { type: Number },
      copper: { type: Number },
      manganese: { type: Number }
    }
  },
  recommendations: [{ type: String }],
  createdAt: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true,
  collection: 'soil_test_reports'
});

// Indexes
SoilTestReportSchema.index({ farmerId: 1, testDate: -1 });

// ============================================================================
// SMART ALERT SCHEMA
// ============================================================================
export const SmartAlertSchema = new Schema({
  userId: { type: String, required: true, index: true },
  type: { 
    type: String, 
    required: true,
    enum: ['WEATHER', 'PEST', 'PRICE', 'POWER_CUT', 'HARVEST', 'SCHEME'],
    index: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  actionable: { type: String, required: true },
  priority: { 
    type: String, 
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
    index: true
  },
  channels: [{ 
    type: String, 
    enum: ['PUSH', 'SMS', 'VOICE']
  }],
  sentAt: { type: Date, required: true, default: Date.now, index: true },
  readAt: { type: Date }
}, {
  timestamps: true,
  collection: 'smart_alerts'
});

// Indexes
SmartAlertSchema.index({ userId: 1, sentAt: -1 });
SmartAlertSchema.index({ type: 1, priority: 1 });

// ============================================================================
// TRACEABILITY RECORD SCHEMA
// ============================================================================
export const TraceabilityRecordSchema = new Schema({
  produceId: { type: String, required: true, unique: true, index: true },
  farmerId: { type: String, required: true, index: true },
  seedSource: { type: String, required: true },
  plantingDate: { type: Date, required: true },
  activities: [{
    type: { 
      type: String, 
      enum: ['PLANTING', 'FERTILIZER', 'PESTICIDE', 'IRRIGATION', 'HARVEST', 'TRANSPORT'],
      required: true
    },
    description: { type: String, required: true },
    timestamp: { type: Date, required: true },
    photoLogId: { type: String }
  }],
  certificateId: { type: String, required: true },
  transactionId: { type: String },
  qrCode: { type: String },
  createdAt: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true,
  collection: 'traceability_records'
});

// Indexes
TraceabilityRecordSchema.index({ farmerId: 1, createdAt: -1 });
TraceabilityRecordSchema.index({ certificateId: 1 });

// ============================================================================
// AD LISTING SCHEMA
// ============================================================================
export const AdListingSchema = new Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true, index: true },
  price: { type: Number, required: true },
  images: [{ type: String }],
  voiceTranscript: { type: String },
  isActive: { type: Boolean, default: true, index: true },
  createdAt: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true,
  collection: 'ad_listings'
});

// Indexes
AdListingSchema.index({ userId: 1, createdAt: -1 });
AdListingSchema.index({ category: 1, isActive: 1 });
