// Transaction and escrow service
import { v4 as uuidv4 } from 'uuid';
import { Transaction, EscrowAccount, TransactionStatus } from '../types';
import { db } from '../database/memory-db';

export class TransactionService {
  // Initiate purchase request
  initiatePurchase(
    listingId: string,
    farmerId: string,
    buyerId: string,
    amount: number
  ): Transaction {
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

    return db.createTransaction(transaction);
  }

  // Farmer accepts order
  acceptOrder(transactionId: string): Transaction | undefined {
    return db.updateTransaction(transactionId, {
      status: TransactionStatus.ACCEPTED
    });
  }

  // Farmer rejects order
  rejectOrder(transactionId: string): Transaction | undefined {
    return db.updateTransaction(transactionId, {
      status: TransactionStatus.REJECTED
    });
  }

  // Create escrow account
  createEscrow(transactionId: string, amount: number): EscrowAccount {
    const escrow: EscrowAccount = {
      id: uuidv4(),
      transactionId,
      amount,
      isLocked: false,
      createdAt: new Date()
    };

    return db.createEscrow(escrow);
  }

  // Lock payment in escrow
  lockPayment(transactionId: string): { transaction?: Transaction; escrow?: EscrowAccount } {
    const escrow = db.getEscrowByTransaction(transactionId);
    if (!escrow) return {};

    const updatedEscrow = db.updateEscrow(escrow.id, { isLocked: true });
    const updatedTransaction = db.updateTransaction(transactionId, {
      status: TransactionStatus.PAYMENT_LOCKED
    });

    return { transaction: updatedTransaction, escrow: updatedEscrow };
  }

  // Mark as dispatched
  markDispatched(transactionId: string): Transaction | undefined {
    return db.updateTransaction(transactionId, {
      status: TransactionStatus.IN_TRANSIT
    });
  }

  // Mark as delivered
  markDelivered(transactionId: string): Transaction | undefined {
    return db.updateTransaction(transactionId, {
      status: TransactionStatus.DELIVERED
    });
  }

  // Release funds (after validation)
  releaseFunds(transactionId: string): { transaction?: Transaction; escrow?: EscrowAccount } {
    const escrow = db.getEscrowByTransaction(transactionId);
    if (!escrow || !escrow.isLocked) return {};

    const updatedEscrow = db.updateEscrow(escrow.id, { isLocked: false });
    const updatedTransaction = db.updateTransaction(transactionId, {
      status: TransactionStatus.COMPLETED
    });

    return { transaction: updatedTransaction, escrow: updatedEscrow };
  }

  getTransaction(id: string): Transaction | undefined {
    return db.getTransaction(id);
  }
}

export const transactionService = new TransactionService();
