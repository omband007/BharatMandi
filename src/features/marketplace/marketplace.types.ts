import { ProduceGrade } from '../../shared/types/common.types';

export enum ListingStatus {
  ACTIVE = 'ACTIVE',
  SOLD = 'SOLD',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export enum ListingType {
  PRE_HARVEST = 'PRE_HARVEST',
  POST_HARVEST = 'POST_HARVEST'
}

export enum PaymentMethodPreference {
  PLATFORM_ONLY = 'PLATFORM_ONLY',
  DIRECT_ONLY = 'DIRECT_ONLY',
  BOTH = 'BOTH'
}

export enum SaleChannel {
  PLATFORM = 'PLATFORM',
  EXTERNAL = 'EXTERNAL'
}

export interface Listing {
  id: string;
  farmerId: string;
  produceType: string;
  quantity: number;
  pricePerKg: number;
  certificateId: string;
  expectedHarvestDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Status tracking fields
  status: ListingStatus;
  soldAt?: Date;
  transactionId?: string;
  expiredAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: string;
  
  // Perishability-based expiration fields
  listingType: ListingType;
  produceCategoryId: string;
  produceCategoryName?: string; // Populated in API responses
  expiryDate: Date;
  
  // Manual sale confirmation fields
  paymentMethodPreference: PaymentMethodPreference;
  saleChannel?: SaleChannel;
  salePrice?: number;
  saleNotes?: string;
}

export interface TranslatedListing extends Listing {
  originalProduceType: string;
  translatedProduceType: string;
  isTranslated: boolean;
  sourceLanguage: string;
  targetLanguage: string;
}

