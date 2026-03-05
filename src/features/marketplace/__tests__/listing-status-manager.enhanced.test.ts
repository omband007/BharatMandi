/**
 * Unit tests for ListingStatusManager - Manual Sale Confirmation
 * Tests for Task 9A: markAsSold() method
 */

import { listingStatusManager, TriggerType } from '../listing-status-manager';
import { ListingStatus, SaleChannel } from '../marketplace.types';

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

describe('ListingStatusManager - markAsSold', () => {
  const listingId = 'listing-123';
  const userId = 'farmer-123';

  const mockActiveListing = {
    id: listingId,
    farmer_id: userId,
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

  it('should mark ACTIVE listing as SOLD with PLATFORM_DIRECT channel', async () => {
    mockDbManager.get
      .mockResolvedValueOnce(mockActiveListing)
      .mockResolvedValueOnce(null);

    mockDbManager.run.mockResolvedValue(undefined);

    await listingStatusManager.markAsSold({
      listingId,
      saleChannel: SaleChannel.PLATFORM_DIRECT,
      transactionId: 'transaction-123',
      userId,
    });

    expect(mockDbManager.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE listings SET'),
      expect.arrayContaining([
        ListingStatus.SOLD,
        expect.any(String), // sold_at
        SaleChannel.PLATFORM_DIRECT,
        expect.any(String), // updated_at
        'transaction-123',
        listingId,
      ])
    );
  });

  it('should mark ACTIVE listing as SOLD with EXTERNAL channel', async () => {
    mockDbManager.get
      .mockResolvedValueOnce(mockActiveListing)
      .mockResolvedValueOnce(null);

    mockDbManager.run.mockResolvedValue(undefined);

    await listingStatusManager.markAsSold({
      listingId,
      saleChannel: SaleChannel.EXTERNAL,
      salePrice: 5000,
      saleNotes: 'Sold at local market',
      userId,
    });

    expect(mockDbManager.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE listings SET'),
      expect.arrayContaining([
        ListingStatus.SOLD,
        expect.any(String), // sold_at
        SaleChannel.EXTERNAL,
        expect.any(String), // updated_at
        5000,
        'Sold at local market',
        listingId,
      ])
    );
  });

  it('should reject marking non-ACTIVE listing as sold', async () => {
    mockDbManager.get.mockResolvedValue({
      ...mockActiveListing,
      status: ListingStatus.SOLD,
    });

    await expect(
      listingStatusManager.markAsSold({
        listingId,
        saleChannel: SaleChannel.EXTERNAL,
        userId,
      })
    ).rejects.toThrow('Cannot mark listing as sold. Current status is SOLD, must be ACTIVE');
  });

  it('should reject invalid sale channel', async () => {
    mockDbManager.get.mockResolvedValue(mockActiveListing);

    await expect(
      listingStatusManager.markAsSold({
        listingId,
        saleChannel: 'INVALID' as any,
        userId,
      })
    ).rejects.toThrow('Invalid sale channel. Must be PLATFORM_DIRECT or EXTERNAL');
  });

  it('should require transactionId for PLATFORM_DIRECT sales', async () => {
    mockDbManager.get.mockResolvedValue(mockActiveListing);

    await expect(
      listingStatusManager.markAsSold({
        listingId,
        saleChannel: SaleChannel.PLATFORM_DIRECT,
        userId,
      })
    ).rejects.toThrow('transactionId is required for PLATFORM_DIRECT sales');
  });

  it('should reject when active transaction exists (PAYMENT_LOCKED)', async () => {
    mockDbManager.get
      .mockResolvedValueOnce(mockActiveListing)
      .mockResolvedValueOnce({
        id: 'transaction-123',
        listing_id: listingId,
        status: 'PAYMENT_LOCKED',
      });

    await expect(
      listingStatusManager.markAsSold({
        listingId,
        saleChannel: SaleChannel.EXTERNAL,
        userId,
      })
    ).rejects.toThrow(
      'Cannot manually mark listing as sold. Active transaction exists with status: PAYMENT_LOCKED'
    );
  });

  it('should reject when active transaction exists (COMPLETED)', async () => {
    mockDbManager.get
      .mockResolvedValueOnce(mockActiveListing)
      .mockResolvedValueOnce({
        id: 'transaction-123',
        listing_id: listingId,
        status: 'COMPLETED',
      });

    await expect(
      listingStatusManager.markAsSold({
        listingId,
        saleChannel: SaleChannel.EXTERNAL,
        userId,
      })
    ).rejects.toThrow(
      'Cannot manually mark listing as sold. Active transaction exists with status: COMPLETED'
    );
  });

  it('should allow marking as sold when transaction is PENDING', async () => {
    mockDbManager.get
      .mockResolvedValueOnce(mockActiveListing)
      .mockResolvedValueOnce(null);

    mockDbManager.run.mockResolvedValue(undefined);

    await listingStatusManager.markAsSold({
      listingId,
      saleChannel: SaleChannel.EXTERNAL,
      salePrice: 5000,
      userId,
    });

    expect(mockDbManager.run).toHaveBeenCalled();
  });

  it('should include optional salePrice and saleNotes for EXTERNAL sales', async () => {
    mockDbManager.get
      .mockResolvedValueOnce(mockActiveListing)
      .mockResolvedValueOnce(null);

    mockDbManager.run.mockResolvedValue(undefined);

    await listingStatusManager.markAsSold({
      listingId,
      saleChannel: SaleChannel.EXTERNAL,
      salePrice: 7500,
      saleNotes: 'Bulk sale to restaurant',
      userId,
    });

    expect(mockDbManager.run).toHaveBeenCalledWith(
      expect.stringContaining('sale_price'),
      expect.arrayContaining([7500, 'Bulk sale to restaurant'])
    );
  });

  it('should not include transactionId for EXTERNAL sales', async () => {
    mockDbManager.get
      .mockResolvedValueOnce(mockActiveListing)
      .mockResolvedValueOnce(null);

    mockDbManager.run.mockResolvedValue(undefined);

    await listingStatusManager.markAsSold({
      listingId,
      saleChannel: SaleChannel.EXTERNAL,
      salePrice: 5000,
      userId,
    });

    const callArgs = mockDbManager.run.mock.calls[0];
    expect(callArgs[0]).not.toContain('transaction_id');
  });
});
