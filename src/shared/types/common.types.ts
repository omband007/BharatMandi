// Common types shared across features

// ============================================================================
// ENUMS
// ============================================================================

export enum UserType {
  FARMER = 'FARMER',
  BUYER = 'BUYER',
  LOGISTICS_PROVIDER = 'LOGISTICS_PROVIDER',
  SERVICE_PROVIDER = 'SERVICE_PROVIDER',
  COLD_STORAGE_PROVIDER = 'COLD_STORAGE_PROVIDER',
  SUPPLIER = 'SUPPLIER'
}

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  PAYMENT_LOCKED = 'PAYMENT_LOCKED',
  DISPATCHED = 'DISPATCHED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  COMPLETED_DIRECT = 'COMPLETED_DIRECT',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED',
  REJECTED = 'REJECTED'
}

export enum EscrowStatus {
  CREATED = 'CREATED',
  FUNDED = 'FUNDED',
  LOCKED = 'LOCKED',
  RELEASED = 'RELEASED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED'
}

export enum ListingStatus {
  ACTIVE = 'ACTIVE',
  SOLD = 'SOLD',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export enum Grade {
  A = 'A',
  B = 'B',
  C = 'C'
}

export enum ProduceGrade {
  A = 'A',
  B = 'B',
  C = 'C'
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

export interface BankAccount {
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  accountHolderName: string;
}
