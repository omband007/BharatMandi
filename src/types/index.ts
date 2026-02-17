// Core type definitions for Bharat Mandi Platform

// ============================================================================
// ENUMS
// ============================================================================

export enum UserType {
  FARMER = 'FARMER',
  BUYER = 'BUYER',
  LOGISTICS_PROVIDER = 'LOGISTICS_PROVIDER',
  COLD_STORAGE_PROVIDER = 'COLD_STORAGE_PROVIDER',
  SUPPLIER = 'SUPPLIER'
}

export enum ProduceGrade {
  A = 'A',
  B = 'B',
  C = 'C'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  PAYMENT_LOCKED = 'PAYMENT_LOCKED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  DISPUTED = 'DISPUTED',
  REJECTED = 'REJECTED'
}

export enum DisputeStatus {
  INITIATED = 'INITIATED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED'
}

export enum ActivityCategory {
  TILLING = 'TILLING',
  SOWING = 'SOWING',
  SPRAYING = 'SPRAYING',
  FERTIGATION = 'FERTIGATION',
  HARVEST = 'HARVEST',
  OTHER = 'OTHER'
}

export enum AuctionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED'
}

export enum LogisticsStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED'
}


// ============================================================================
// CORE INTERFACES
// ============================================================================

export interface Location {
  lat: number;
  lng: number;
}

export interface BankAccount {
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  accountHolderName: string;
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export interface User {
  id: string;
  name: string;
  phone: string;
  type: UserType;
  location: string;
  bankAccount?: BankAccount;
  credibilityScore?: number;
  rating?: number;
  createdAt: Date;
  updatedAt?: Date;
}

// ============================================================================
// GRADING & CERTIFICATION
// ============================================================================

export interface GradingResult {
  grade: ProduceGrade;
  confidence: number;
  timestamp: Date;
  location: Location;
}

export interface DigitalQualityCertificate {
  id: string;
  farmerId: string;
  produceType: string;
  grade: ProduceGrade;
  timestamp: Date;
  location: Location;
  imageHash: string;
}

// ============================================================================
// MARKETPLACE
// ============================================================================

export interface Listing {
  id: string;
  farmerId: string;
  produceType: string;
  quantity: number;
  pricePerKg: number;
  certificateId: string;
  expectedHarvestDate?: Date;
  createdAt: Date;
  isActive: boolean;
}

// ============================================================================
// TRANSACTIONS & ESCROW
// ============================================================================

export interface Transaction {
  id: string;
  listingId: string;
  farmerId: string;
  buyerId: string;
  amount: number;
  status: TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
  dispatchedAt?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
}

export interface EscrowAccount {
  id: string;
  transactionId: string;
  amount: number;
  isLocked: boolean;
  createdAt: Date;
  releasedAt?: Date;
}


// ============================================================================
// PHOTO-LOG
// ============================================================================

export interface PhotoLogEntry {
  id: string;
  farmerId: string;
  imageUrl: string;
  category: ActivityCategory;
  location: Location;
  timestamp: Date;
  notes?: string;
  transactionId?: string;
}

// ============================================================================
// CREDIBILITY & RATING
// ============================================================================

export interface CredibilityScore {
  id: string;
  farmerId: string;
  score: number;
  transactionHistory: number;
  paymentReliability: number;
  farmingConsistency: number;
  produceQuality: number;
  updatedAt: Date;
  history: CredibilityScoreHistory[];
}

export interface CredibilityScoreHistory {
  score: number;
  timestamp: Date;
  reason: string;
}

export interface Rating {
  id: string;
  transactionId: string;
  fromUserId: string;
  toUserId: string;
  rating: number;
  feedback?: string;
  implicitRating: number;
  createdAt: Date;
}

// ============================================================================
// DISPUTE RESOLUTION
// ============================================================================

export interface Dispute {
  id: string;
  transactionId: string;
  initiatedBy: string;
  status: DisputeStatus;
  evidence: DisputeEvidence[];
  resolution?: string;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface DisputeEvidence {
  userId: string;
  type: 'PHOTO' | 'MESSAGE' | 'DOCUMENT';
  content: string;
  timestamp: Date;
}

// ============================================================================
// AUCTION SYSTEM
// ============================================================================

export interface AuctionListing {
  id: string;
  listingId: string;
  farmerId: string;
  minimumBidPrice: number;
  currentHighestBid?: number;
  currentHighestBidder?: string;
  startTime: Date;
  endTime: Date;
  status: AuctionStatus;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  amount: number;
  timestamp: Date;
}


// ============================================================================
// DISEASE DIAGNOSIS
// ============================================================================

export interface DiseaseDiagnosis {
  id: string;
  farmerId: string;
  imageUrl: string;
  diseaseName: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  treatments: Treatment[];
  timestamp: Date;
}

export interface Treatment {
  name: string;
  type: 'CHEMICAL' | 'ORGANIC';
  dosage: string;
  applicationMethod: string;
}

// ============================================================================
// SOIL HEALTH
// ============================================================================

export interface SoilTestReport {
  id: string;
  farmerId: string;
  testDate: Date;
  labName: string;
  parameters: SoilParameters;
  recommendations: string[];
  createdAt: Date;
}

export interface SoilParameters {
  pH: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicCarbon: number;
  electricalConductivity: number;
  micronutrients?: {
    zinc?: number;
    iron?: number;
    copper?: number;
    manganese?: number;
  };
}

// ============================================================================
// MANURE MARKETPLACE
// ============================================================================

export interface ManureListing {
  id: string;
  sellerId: string;
  manureType: 'COW' | 'BUFFALO' | 'POULTRY' | 'GOAT' | 'MIXED';
  quantity: number;
  pricePerTon: number;
  maturityStatus: 'FULLY_DECOMPOSED' | 'PARTIALLY_DECOMPOSED' | 'RAW';
  maturityTestId?: string;
  location: string;
  createdAt: Date;
  isActive: boolean;
}

export interface MaturityTestResult {
  id: string;
  manureListingId: string;
  status: 'FULLY_DECOMPOSED' | 'PARTIALLY_DECOMPOSED' | 'RAW';
  confidence: number;
  decompositionPercentage: number;
  imageUrl: string;
  timestamp: Date;
}

// ============================================================================
// TRACEABILITY
// ============================================================================

export interface TraceabilityRecord {
  id: string;
  produceId: string;
  farmerId: string;
  seedSource: string;
  plantingDate: Date;
  activities: TraceabilityActivity[];
  certificateId: string;
  transactionId?: string;
  qrCode?: string;
  createdAt: Date;
}

export interface TraceabilityActivity {
  type: 'PLANTING' | 'FERTILIZER' | 'PESTICIDE' | 'IRRIGATION' | 'HARVEST' | 'TRANSPORT';
  description: string;
  timestamp: Date;
  photoLogId?: string;
}


// ============================================================================
// ECOSYSTEM INTEGRATION
// ============================================================================

export interface ServiceProvider {
  id: string;
  name: string;
  type: UserType;
  services: string[];
  location: string;
  rating: number;
  contactPhone: string;
  createdAt: Date;
}

export interface LogisticsOrder {
  id: string;
  transactionId: string;
  providerId: string;
  pickupLocation: Location;
  deliveryLocation: Location;
  status: LogisticsStatus;
  vehicleId?: string;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  createdAt: Date;
}

export interface StorageBooking {
  id: string;
  farmerId: string;
  providerId: string;
  produceType: string;
  quantity: number;
  startDate: Date;
  endDate: Date;
  costPerDay: number;
  totalCost: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
}

export interface RouteOptimization {
  id: string;
  providerId: string;
  pickupPoints: RoutePoint[];
  deliveryPoint: Location;
  optimizedRoute: Location[];
  totalDistance: number;
  estimatedTime: number;
  costSavings: number;
  createdAt: Date;
}

export interface RoutePoint {
  farmerId: string;
  location: Location;
  pickupTime: Date;
}

export interface VehicleTracking {
  id: string;
  logisticsOrderId: string;
  vehicleId: string;
  currentLocation: Location;
  speed: number;
  estimatedArrival: Date;
  lastUpdated: Date;
}

// ============================================================================
// GOVERNMENT SCHEMES
// ============================================================================

export interface GovernmentScheme {
  id: string;
  name: string;
  description: string;
  benefits: string;
  eligibilityCriteria: EligibilityCriteria;
  applicationDeadline: Date;
  isActive: boolean;
}

export interface EligibilityCriteria {
  minLandSize?: number;
  maxLandSize?: number;
  cropTypes?: string[];
  location?: string[];
  farmerCategory?: string[];
}

export interface SchemeApplication {
  id: string;
  schemeId: string;
  farmerId: string;
  documents: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedAt: Date;
  reviewedAt?: Date;
}

// ============================================================================
// PRICE PREDICTION
// ============================================================================

export interface PricePrediction {
  id: string;
  produceType: string;
  location: string;
  predictions: DailyPrediction[];
  confidence: number;
  generatedAt: Date;
}

export interface DailyPrediction {
  date: Date;
  predictedPrice: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

// ============================================================================
// VOICE ASSISTANT
// ============================================================================

export interface VoiceQuery {
  id: string;
  userId: string;
  query: string;
  response: string;
  confidence: number;
  timestamp: Date;
}

// ============================================================================
// SMART ALERTS
// ============================================================================

export interface SmartAlert {
  id: string;
  userId: string;
  type: 'WEATHER' | 'PEST' | 'PRICE' | 'POWER_CUT' | 'HARVEST' | 'SCHEME';
  title: string;
  message: string;
  actionable: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  channels: ('PUSH' | 'SMS' | 'VOICE')[];
  sentAt: Date;
  readAt?: Date;
}

// ============================================================================
// AD GENERATION
// ============================================================================

export interface AdListing {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  price: number;
  images: string[];
  voiceTranscript?: string;
  createdAt: Date;
  isActive: boolean;
}
