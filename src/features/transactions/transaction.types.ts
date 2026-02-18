import { TransactionStatus, EscrowStatus } from '../../shared/types/common.types';

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
  status: EscrowStatus;
  isLocked: boolean;
  createdAt: Date;
  releasedAt?: Date;
}
