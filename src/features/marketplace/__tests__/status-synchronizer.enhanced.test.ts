/**
 * Unit tests for StatusSynchronizer - Direct Payment Handling
 * Tests for Task 9B.2: onTransactionCompletedDirect() method
 */

import { statusSynchronizer } from '../status-synchronizer';
import { ListingStatus, SaleChannel } from '../marketplace.types';
import { listingStatusManager, TriggerType } from '../listing-status-manager';

// Mock only the recordStatusChange method, not the entire module
jest.mock('../listing-status-manager', () => {
  const actual = jest.requireActual('../listing-status-manager');
  return {
    ...actual,
    listingStatusManager: {
      ...actual.listingStatusManager,
      recordStatusChange: jest.fn(),
    },
  };
});

// Mock the global database manager
const mockDbManager = {
  run: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
};

beforeEach(() => {
  (global as any).sharedDbManager = mockDbManager;
  jest.clearAllMocks();
});

afterEach(() => {
  delete (global as any).sharedDbManager;
});

describe('StatusSynchronizer - onTransactionCompletedDirect', () => {
  const transactionId = 'transaction-123';
  const listingId = 'listing-123';

  const mockTransaction = {
    id: transactionId,
    listing_id: listingId,
    farmer_id: 'farmer-123',
    buyer_id: 'buyer-123',
    amount: 5000,
    status: 'COMPLETED_DIRECT',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockActiveListing = {
    id: listingId,
    farmer_id: 'farmer-123',
    status: ListingStatus.ACTIVE,
    produce_type: 'Tomatoes',
    quantity: 100,
    price_per_kg: 50,
    certificate_id: 'cert-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    listing_type: 'POST_HARVEST',
    produce_category_id: 'category-fruits',
    expiry_date: new Date().toISOString(),
    payment_method_preference: 'BOTH',
  };

  it('should mark ACTIVE listing as SOLD with PLATFORM channel (direct payment)', async () => {
    mockDbManager.get
      .mockResolvedValueOnce(mockTransaction)
      .mockResolvedValueOnce(mockActiveListing);

    mockDbManager.run.mockResolvedValue(undefined);
    (listingStatusManager.recordStatusChange as jest.Mock).mockResolvedValue(undefined);

    await statusSynchronizer.onTransactionCompletedDirect(transactionId);

    expect(mockDbManager.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE listings'),
      expect.arrayContaining([
        ListingStatus.SOLD,
        expect.any(String), // sold_at
        transactionId,
        SaleChannel.PLATFORM,
        expect.any(String), // updated_at
        listingId,
      ])
    );

    expect(listingStatusManager.recordStatusChange).toHaveBeenCalledWith(
      listingId,
      ListingStatus.ACTIVE,
      ListingStatus.SOLD,
      'SYSTEM',
      TriggerType.TRANSACTION,
      expect.objectContaining({
        transaction_id: transactionId,
        sale_channel: SaleChannel.PLATFORM,
        reason: 'direct_payment_completed',
      })
    );
  });

  it('should skip if listing is not ACTIVE', async () => {
    mockDbManager.get
      .mockResolvedValueOnce(mockTransaction)
      .mockResolvedValueOnce({
        ...mockActiveListing,
        status: ListingStatus.SOLD,
      });

    await statusSynchronizer.onTransactionCompletedDirect(transactionId);

    // Should not update listing
    expect(mockDbManager.run).not.toHaveBeenCalled();
  });

  it('should throw error if transaction not found', async () => {
    mockDbManager.get.mockResolvedValue(null);

    await expect(statusSynchronizer.onTransactionCompletedDirect(transactionId)).rejects.toThrow(
      `Transaction ${transactionId} not found`
    );
  });

  it('should throw error if listing not found', async () => {
    mockDbManager.get
      .mockResolvedValueOnce(mockTransaction)
      .mockResolvedValueOnce(null);

    await expect(statusSynchronizer.onTransactionCompletedDirect(transactionId)).rejects.toThrow(
      `Listing ${listingId} not found`
    );
  });

  it('should record audit trail with correct metadata', async () => {
    mockDbManager.get
      .mockResolvedValueOnce(mockTransaction)
      .mockResolvedValueOnce(mockActiveListing);

    mockDbManager.run.mockResolvedValue(undefined);
    (listingStatusManager.recordStatusChange as jest.Mock).mockResolvedValue(undefined);

    await statusSynchronizer.onTransactionCompletedDirect(transactionId);

    expect(listingStatusManager.recordStatusChange).toHaveBeenCalledWith(
      listingId,
      ListingStatus.ACTIVE,
      ListingStatus.SOLD,
      'SYSTEM',
      TriggerType.TRANSACTION,
      {
        transaction_id: transactionId,
        sale_channel: SaleChannel.PLATFORM,
        reason: 'direct_payment_completed',
      }
    );
  });

  it('should set sold_at timestamp', async () => {
    mockDbManager.get
      .mockResolvedValueOnce(mockTransaction)
      .mockResolvedValueOnce(mockActiveListing);

    mockDbManager.run.mockResolvedValue(undefined);
    (listingStatusManager.recordStatusChange as jest.Mock).mockResolvedValue(undefined);

    await statusSynchronizer.onTransactionCompletedDirect(transactionId);

    const callArgs = mockDbManager.run.mock.calls[0];
    // Check that sold_at timestamp is included (second parameter in the array)
    expect(callArgs[1][1]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/); // ISO timestamp format
  });

  it('should skip EXPIRED listings', async () => {
    mockDbManager.get
      .mockResolvedValueOnce(mockTransaction)
      .mockResolvedValueOnce({
        ...mockActiveListing,
        status: ListingStatus.EXPIRED,
      });

    await statusSynchronizer.onTransactionCompletedDirect(transactionId);

    expect(mockDbManager.run).not.toHaveBeenCalled();
  });

  it('should skip CANCELLED listings', async () => {
    mockDbManager.get
      .mockResolvedValueOnce(mockTransaction)
      .mockResolvedValueOnce({
        ...mockActiveListing,
        status: ListingStatus.CANCELLED,
      });

    await statusSynchronizer.onTransactionCompletedDirect(transactionId);

    expect(mockDbManager.run).not.toHaveBeenCalled();
  });
});

describe('StatusSynchronizer - onTransactionCompleted (escrow)', () => {
  const transactionId = 'transaction-123';
  const listingId = 'listing-123';

  const mockTransaction = {
    id: transactionId,
    listing_id: listingId,
    farmer_id: 'farmer-123',
    buyer_id: 'buyer-123',
    amount: 5000,
    status: 'COMPLETED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockActiveListing = {
    id: listingId,
    farmer_id: 'farmer-123',
    status: ListingStatus.ACTIVE,
    produce_type: 'Tomatoes',
    quantity: 100,
    price_per_kg: 50,
    certificate_id: 'cert-123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    listing_type: 'POST_HARVEST',
    produce_category_id: 'category-fruits',
    expiry_date: new Date().toISOString(),
    payment_method_preference: 'PLATFORM_ONLY',
  };

  it('should mark ACTIVE listing as SOLD with PLATFORM channel (escrow)', async () => {
    mockDbManager.get
      .mockResolvedValueOnce(mockTransaction)
      .mockResolvedValueOnce(mockActiveListing);

    mockDbManager.run.mockResolvedValue(undefined);
    (listingStatusManager.recordStatusChange as jest.Mock).mockResolvedValue(undefined);

    await statusSynchronizer.onTransactionCompleted(transactionId);

    expect(mockDbManager.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE listings'),
      expect.arrayContaining([
        ListingStatus.SOLD,
        expect.any(String), // sold_at
        transactionId,
        SaleChannel.PLATFORM,
        expect.any(String), // updated_at
        listingId,
      ])
    );
  });
});
