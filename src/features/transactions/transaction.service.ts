// Transaction and escrow service
import { v4 as uuidv4 } from 'uuid';
import type { Transaction, EscrowAccount } from './transaction.types';
import { TransactionStatus, EscrowStatus } from '../../shared/types/common.types';
import type { DatabaseManager } from '../../shared/database/db-abstraction';

// Get the shared DatabaseManager instance from app.ts
function getDbManager(): DatabaseManager {
  const dbManager = (global as any).sharedDbManager;
  if (!dbManager) {
    throw new Error('DatabaseManager not initialized. This should be set by app.ts');
  }
  return dbManager;
}

export class TransactionService {
  // Initiate purchase request
  async initiatePurchase(
    listingId: string,
    farmerId: string,
    buyerId: string,
    amount: number
  ): Promise<Transaction> {
    const transaction: Transaction = {
      id: uuidv4(),
      listingId,
      farmerId,
      buyerId,
      amount,
      status: TransactionStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await getDbManager().createTransaction(transaction);
  }

  // Farmer accepts order
  async acceptOrder(transactionId: string): Promise<Transaction | undefined> {
    return await getDbManager().updateTransaction(transactionId, {
      status: TransactionStatus.ACCEPTED
    });
  }

  // Farmer rejects order
  async rejectOrder(transactionId: string): Promise<Transaction | undefined> {
    return await getDbManager().updateTransaction(transactionId, {
      status: TransactionStatus.REJECTED
    });
  }

  // Create escrow account
  async createEscrow(transactionId: string, amount: number): Promise<EscrowAccount> {
    const escrow: EscrowAccount = {
      id: uuidv4(),
      transactionId,
      amount,
      status: EscrowStatus.CREATED,
      isLocked: false,
      createdAt: new Date()
    };

    return await getDbManager().createEscrow(escrow);
  }

  // Lock payment in escrow
  async lockPayment(transactionId: string): Promise<{ transaction?: Transaction; escrow?: EscrowAccount }> {
    const escrow = await getDbManager().getEscrowByTransaction(transactionId);
    if (!escrow) return {};

    const updatedEscrow = await getDbManager().updateEscrow(escrow.id, { isLocked: true });
    const updatedTransaction = await getDbManager().updateTransaction(transactionId, {
      status: TransactionStatus.PAYMENT_LOCKED
    });

    return { transaction: updatedTransaction, escrow: updatedEscrow };
  }

  // Mark as dispatched
  async markDispatched(transactionId: string): Promise<Transaction | undefined> {
    return await getDbManager().updateTransaction(transactionId, {
      status: TransactionStatus.IN_TRANSIT
    });
  }

  // Mark as delivered
  async markDelivered(transactionId: string): Promise<Transaction | undefined> {
    return await getDbManager().updateTransaction(transactionId, {
      status: TransactionStatus.DELIVERED
    });
  }

  // Release funds (after validation)
  async releaseFunds(transactionId: string): Promise<{ transaction?: Transaction; escrow?: EscrowAccount }> {
    const escrow = await getDbManager().getEscrowByTransaction(transactionId);
    if (!escrow || !escrow.isLocked) return {};

    const updatedEscrow = await getDbManager().updateEscrow(escrow.id, { isLocked: false });
    const updatedTransaction = await getDbManager().updateTransaction(transactionId, {
      status: TransactionStatus.COMPLETED
    });

    return { transaction: updatedTransaction, escrow: updatedEscrow };
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return await getDbManager().getTransaction(id);
  }
}

export const transactionService = new TransactionService();
