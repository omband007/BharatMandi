/**
 * Unit tests for TransactionService - Direct Payment Flow
 * Tests for Task 9B: completeDirectPayment() method
 */

import { TransactionService } from '../transaction.service';
import { TransactionStatus } from '../../../shared/types/common.types';

// Mock the global database manager
const mockDbManager = {
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
  getTransaction: jest.fn(),
  updateTransaction: jest.fn(),
};

beforeEach(() => {
  (global as any).sharedDbManager = mockDbManager;
  jest.clearAllMocks();
});

afterEach(() => {
  delete (global as any).sharedDbManager;
});

describe('TransactionService - completeDirectPayment', () => {
  const transactionId = 'transaction-123';
  const listingId = 'listing-123';

  const mockTransaction = {
    id: transactionId,
    listingId,
    farmerId: 'farmer-123',
    buyerId: 'buyer-123',
    amount: 5000,
    status: TransactionStatus.ACCEPTED,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('should complete direct payment for ACCEPTED transaction with BOTH preference', async () => {
    const mockListing = {
      id: listingId,
      farmer_id: 'farmer-123',
      payment_method_preference: 'BOTH',
      status: 'ACTIVE',
    };

    mockDbManager.getTransaction.mockResolvedValue(mockTransaction);
    mockDbManager.get.mockResolvedValue(mockListing);
    mockDbManager.updateTransaction.mockResolvedValue({
      ...mockTransaction,
      status: TransactionStatus.COMPLETED_DIRECT,
      completedAt: new Date(),
    });

    const service = new TransactionService();
    const result = await service.completeDirectPayment(transactionId);

    expect(result.status).toBe(TransactionStatus.COMPLETED_DIRECT);
    expect(mockDbManager.updateTransaction).toHaveBeenCalledWith(
      transactionId,
      expect.objectContaining({
        status: TransactionStatus.COMPLETED_DIRECT,
        completedAt: expect.any(Date),
      })
    );
  });

  it('should complete direct payment for ACCEPTED transaction with DIRECT_ONLY preference', async () => {
    const mockListing = {
      id: listingId,
      farmer_id: 'farmer-123',
      payment_method_preference: 'DIRECT_ONLY',
      status: 'ACTIVE',
    };

    mockDbManager.getTransaction.mockResolvedValue(mockTransaction);
    mockDbManager.get.mockResolvedValue(mockListing);
    mockDbManager.updateTransaction.mockResolvedValue({
      ...mockTransaction,
      status: TransactionStatus.COMPLETED_DIRECT,
      completedAt: new Date(),
    });

    const service = new TransactionService();
    const result = await service.completeDirectPayment(transactionId);

    expect(result.status).toBe(TransactionStatus.COMPLETED_DIRECT);
  });

  it('should reject if transaction not found', async () => {
    mockDbManager.getTransaction.mockResolvedValue(undefined);

    const service = new TransactionService();
    await expect(service.completeDirectPayment(transactionId)).rejects.toThrow(
      `Transaction with ID "${transactionId}" not found`
    );
  });

  it('should reject if transaction is not in ACCEPTED state', async () => {
    mockDbManager.getTransaction.mockResolvedValue({
      ...mockTransaction,
      status: TransactionStatus.PENDING,
    });

    const service = new TransactionService();
    await expect(service.completeDirectPayment(transactionId)).rejects.toThrow(
      'Cannot complete direct payment. Transaction status is PENDING, must be ACCEPTED'
    );
  });

  it('should reject if transaction is already COMPLETED', async () => {
    mockDbManager.getTransaction.mockResolvedValue({
      ...mockTransaction,
      status: TransactionStatus.COMPLETED,
    });

    const service = new TransactionService();
    await expect(service.completeDirectPayment(transactionId)).rejects.toThrow(
      'Cannot complete direct payment. Transaction status is COMPLETED, must be ACCEPTED'
    );
  });

  it('should reject if listing not found', async () => {
    mockDbManager.getTransaction.mockResolvedValue(mockTransaction);
    mockDbManager.get.mockResolvedValue(null);

    const service = new TransactionService();
    await expect(service.completeDirectPayment(transactionId)).rejects.toThrow(
      `Listing with ID "${listingId}" not found`
    );
  });

  it('should reject if listing has PLATFORM_ONLY payment preference', async () => {
    const mockListing = {
      id: listingId,
      farmer_id: 'farmer-123',
      payment_method_preference: 'PLATFORM_ONLY',
      status: 'ACTIVE',
    };

    mockDbManager.getTransaction.mockResolvedValue(mockTransaction);
    mockDbManager.get.mockResolvedValue(mockListing);

    const service = new TransactionService();
    await expect(service.completeDirectPayment(transactionId)).rejects.toThrow(
      'Cannot complete direct payment. Listing only accepts platform payments (escrow)'
    );
  });

  it('should reject if transaction is in PAYMENT_LOCKED state', async () => {
    mockDbManager.getTransaction.mockResolvedValue({
      ...mockTransaction,
      status: TransactionStatus.PAYMENT_LOCKED,
    });

    const service = new TransactionService();
    await expect(service.completeDirectPayment(transactionId)).rejects.toThrow(
      'Cannot complete direct payment. Transaction status is PAYMENT_LOCKED, must be ACCEPTED'
    );
  });

  it('should skip PAYMENT_LOCKED, DISPATCHED, IN_TRANSIT, DELIVERED states', async () => {
    const mockListing = {
      id: listingId,
      farmer_id: 'farmer-123',
      payment_method_preference: 'BOTH',
      status: 'ACTIVE',
    };

    mockDbManager.getTransaction.mockResolvedValue(mockTransaction);
    mockDbManager.get.mockResolvedValue(mockListing);
    mockDbManager.updateTransaction.mockResolvedValue({
      ...mockTransaction,
      status: TransactionStatus.COMPLETED_DIRECT,
      completedAt: new Date(),
    });

    const service = new TransactionService();
    const result = await service.completeDirectPayment(transactionId);

    // Verify it goes directly from ACCEPTED to COMPLETED_DIRECT
    expect(result.status).toBe(TransactionStatus.COMPLETED_DIRECT);
    expect(mockDbManager.updateTransaction).toHaveBeenCalledTimes(1);
    expect(mockDbManager.updateTransaction).toHaveBeenCalledWith(
      transactionId,
      expect.objectContaining({
        status: TransactionStatus.COMPLETED_DIRECT,
      })
    );
  });

  it('should set completedAt timestamp', async () => {
    const mockListing = {
      id: listingId,
      farmer_id: 'farmer-123',
      payment_method_preference: 'BOTH',
      status: 'ACTIVE',
    };

    mockDbManager.getTransaction.mockResolvedValue(mockTransaction);
    mockDbManager.get.mockResolvedValue(mockListing);
    mockDbManager.updateTransaction.mockResolvedValue({
      ...mockTransaction,
      status: TransactionStatus.COMPLETED_DIRECT,
      completedAt: new Date(),
    });

    const service = new TransactionService();
    await service.completeDirectPayment(transactionId);

    expect(mockDbManager.updateTransaction).toHaveBeenCalledWith(
      transactionId,
      expect.objectContaining({
        completedAt: expect.any(Date),
      })
    );
  });

  it('should reject if transaction is DISPATCHED', async () => {
    mockDbManager.getTransaction.mockResolvedValue({
      ...mockTransaction,
      status: TransactionStatus.DISPATCHED,
    });

    const service = new TransactionService();
    await expect(service.completeDirectPayment(transactionId)).rejects.toThrow(
      'Cannot complete direct payment. Transaction status is DISPATCHED, must be ACCEPTED'
    );
  });

  it('should reject if transaction is IN_TRANSIT', async () => {
    mockDbManager.getTransaction.mockResolvedValue({
      ...mockTransaction,
      status: TransactionStatus.IN_TRANSIT,
    });

    const service = new TransactionService();
    await expect(service.completeDirectPayment(transactionId)).rejects.toThrow(
      'Cannot complete direct payment. Transaction status is IN_TRANSIT, must be ACCEPTED'
    );
  });

  it('should reject if transaction is DELIVERED', async () => {
    mockDbManager.getTransaction.mockResolvedValue({
      ...mockTransaction,
      status: TransactionStatus.DELIVERED,
    });

    const service = new TransactionService();
    await expect(service.completeDirectPayment(transactionId)).rejects.toThrow(
      'Cannot complete direct payment. Transaction status is DELIVERED, must be ACCEPTED'
    );
  });
});
