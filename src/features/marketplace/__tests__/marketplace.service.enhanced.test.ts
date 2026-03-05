/**
 * Unit tests for MarketplaceService - Enhanced Listing Status Management
 * Tests for Tasks 8 and 9: Listing creation and cancellation with new fields
 */

import { MarketplaceService } from '../marketplace.service';
import { ListingStatus, ListingType, PaymentMethodPreference } from '../marketplace.types';
import { categoryManager } from '../category-manager';
import { listingStatusManager, TriggerType } from '../listing-status-manager';

// Mock the dependencies
jest.mock('../category-manager');
jest.mock('../listing-status-manager');

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

describe('MarketplaceService - createListing (Enhanced)', () => {
  const validInput = {
    farmerId: 'farmer-123',
    produceType: 'Tomatoes',
    quantity: 100,
    pricePerKg: 50,
    certificateId: 'cert-123',
    expectedHarvestDate: new Date('2026-04-01'),
    produceCategoryId: 'category-fruits',
    listingType: 'POST_HARVEST' as ListingType,
    paymentMethodPreference: 'BOTH' as PaymentMethodPreference,
  };

  it('should create listing with all required fields', async () => {
    (categoryManager.getCategoryById as jest.Mock).mockResolvedValue({
      id: 'category-fruits',
      name: 'Fruits',
      expiryPeriodHours: 48,
      description: 'Fresh fruits',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const expectedExpiryDate = new Date('2026-04-03');
    (listingStatusManager.calculateExpiryDate as jest.Mock).mockResolvedValue(expectedExpiryDate);
    (listingStatusManager.recordStatusChange as jest.Mock).mockResolvedValue(undefined);

    mockDbManager.run.mockResolvedValue(undefined);
    mockDbManager.get.mockResolvedValue({
      id: 'listing-123',
      farmer_id: validInput.farmerId,
      produce_type: validInput.produceType,
      quantity: validInput.quantity,
      price_per_kg: validInput.pricePerKg,
      certificate_id: validInput.certificateId,
      expected_harvest_date: validInput.expectedHarvestDate.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: ListingStatus.ACTIVE,
      listing_type: validInput.listingType,
      produce_category_id: validInput.produceCategoryId,
      expiry_date: expectedExpiryDate.toISOString(),
      payment_method_preference: validInput.paymentMethodPreference,
    });

    const service = new MarketplaceService();
    const listing = await service.createListing(validInput);

    expect(listing).toBeDefined();
    expect(listing.status).toBe(ListingStatus.ACTIVE);
    expect(listing.listingType).toBe(validInput.listingType);
    expect(listing.paymentMethodPreference).toBe(validInput.paymentMethodPreference);
    expect(listing.produceCategoryId).toBe(validInput.produceCategoryId);
    expect(categoryManager.getCategoryById).toHaveBeenCalledWith(validInput.produceCategoryId);
    expect(listingStatusManager.calculateExpiryDate).toHaveBeenCalled();
  });

  it('should default payment_method_preference to BOTH if not specified', async () => {
    const inputWithoutPreference = { ...validInput };
    delete (inputWithoutPreference as any).paymentMethodPreference;

    (categoryManager.getCategoryById as jest.Mock).mockResolvedValue({
      id: 'category-fruits',
      name: 'Fruits',
      expiryPeriodHours: 48,
      description: 'Fresh fruits',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    (listingStatusManager.calculateExpiryDate as jest.Mock).mockResolvedValue(new Date());
    (listingStatusManager.recordStatusChange as jest.Mock).mockResolvedValue(undefined);

    mockDbManager.run.mockResolvedValue(undefined);
    mockDbManager.get.mockResolvedValue({
      id: 'listing-123',
      farmer_id: validInput.farmerId,
      produce_type: validInput.produceType,
      quantity: validInput.quantity,
      price_per_kg: validInput.pricePerKg,
      certificate_id: validInput.certificateId,
      expected_harvest_date: validInput.expectedHarvestDate.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: ListingStatus.ACTIVE,
      listing_type: validInput.listingType,
      produce_category_id: validInput.produceCategoryId,
      expiry_date: new Date().toISOString(),
      payment_method_preference: 'BOTH',
    });

    const service = new MarketplaceService();
    const listing = await service.createListing(inputWithoutPreference);

    expect(listing.paymentMethodPreference).toBe('BOTH');
  });

  it('should reject invalid produce_category_id', async () => {
    (categoryManager.getCategoryById as jest.Mock).mockResolvedValue(null);

    const service = new MarketplaceService();
    await expect(service.createListing(validInput)).rejects.toThrow(
      'Produce category with ID "category-fruits" not found'
    );
  });

  it('should reject invalid listing_type', async () => {
    const invalidInput = { ...validInput, listingType: 'INVALID' as any };

    (categoryManager.getCategoryById as jest.Mock).mockResolvedValue({
      id: 'category-fruits',
      name: 'Fruits',
      expiryPeriodHours: 48,
      description: 'Fresh fruits',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const service = new MarketplaceService();
    await expect(service.createListing(invalidInput)).rejects.toThrow(
      'listing_type must be PRE_HARVEST or POST_HARVEST'
    );
  });

  it('should reject invalid payment_method_preference', async () => {
    const invalidInput = { ...validInput, paymentMethodPreference: 'INVALID' as any };

    (categoryManager.getCategoryById as jest.Mock).mockResolvedValue({
      id: 'category-fruits',
      name: 'Fruits',
      expiryPeriodHours: 48,
      description: 'Fresh fruits',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const service = new MarketplaceService();
    await expect(service.createListing(invalidInput)).rejects.toThrow(
      'payment_method_preference must be PLATFORM_ONLY, DIRECT_ONLY, or BOTH'
    );
  });

  it('should calculate expiry date for PRE_HARVEST listings', async () => {
    const preHarvestInput = { ...validInput, listingType: 'PRE_HARVEST' as ListingType };

    (categoryManager.getCategoryById as jest.Mock).mockResolvedValue({
      id: 'category-fruits',
      name: 'Fruits',
      expiryPeriodHours: 48,
      description: 'Fresh fruits',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const expectedExpiryDate = new Date('2026-04-03');
    (listingStatusManager.calculateExpiryDate as jest.Mock).mockResolvedValue(expectedExpiryDate);
    (listingStatusManager.recordStatusChange as jest.Mock).mockResolvedValue(undefined);

    mockDbManager.run.mockResolvedValue(undefined);
    mockDbManager.get.mockResolvedValue({
      id: 'listing-123',
      farmer_id: preHarvestInput.farmerId,
      produce_type: preHarvestInput.produceType,
      quantity: preHarvestInput.quantity,
      price_per_kg: preHarvestInput.pricePerKg,
      certificate_id: preHarvestInput.certificateId,
      expected_harvest_date: preHarvestInput.expectedHarvestDate.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: ListingStatus.ACTIVE,
      listing_type: preHarvestInput.listingType,
      produce_category_id: preHarvestInput.produceCategoryId,
      expiry_date: expectedExpiryDate.toISOString(),
      payment_method_preference: preHarvestInput.paymentMethodPreference,
    });

    const service = new MarketplaceService();
    await service.createListing(preHarvestInput);

    expect(listingStatusManager.calculateExpiryDate).toHaveBeenCalledWith(
      preHarvestInput.expectedHarvestDate,
      preHarvestInput.produceCategoryId
    );
  });

  it('should record initial status change in audit trail', async () => {
    (categoryManager.getCategoryById as jest.Mock).mockResolvedValue({
      id: 'category-fruits',
      name: 'Fruits',
      expiryPeriodHours: 48,
      description: 'Fresh fruits',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const expectedExpiryDate = new Date('2026-04-03');
    (listingStatusManager.calculateExpiryDate as jest.Mock).mockResolvedValue(expectedExpiryDate);
    (listingStatusManager.recordStatusChange as jest.Mock).mockResolvedValue(undefined);

    mockDbManager.run.mockResolvedValue(undefined);
    mockDbManager.get.mockResolvedValue({
      id: 'listing-123',
      farmer_id: validInput.farmerId,
      produce_type: validInput.produceType,
      quantity: validInput.quantity,
      price_per_kg: validInput.pricePerKg,
      certificate_id: validInput.certificateId,
      expected_harvest_date: validInput.expectedHarvestDate.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: ListingStatus.ACTIVE,
      listing_type: validInput.listingType,
      produce_category_id: validInput.produceCategoryId,
      expiry_date: expectedExpiryDate.toISOString(),
      payment_method_preference: validInput.paymentMethodPreference,
    });

    const service = new MarketplaceService();
    await service.createListing(validInput);

    expect(listingStatusManager.recordStatusChange).toHaveBeenCalledWith(
      expect.any(String),
      null,
      ListingStatus.ACTIVE,
      validInput.farmerId,
      TriggerType.USER,
      expect.objectContaining({
        reason: 'listing_created',
        listing_type: validInput.listingType,
        produce_category_id: validInput.produceCategoryId,
      })
    );
  });
});

describe('MarketplaceService - cancelListing', () => {
  it('should cancel ACTIVE listing without active transactions', async () => {
    const listingId = 'listing-123';
    const userId = 'farmer-123';

    mockDbManager.get
      .mockResolvedValueOnce({
        id: listingId,
        farmer_id: userId,
        produce_type: 'Tomatoes',
        quantity: 100,
        price_per_kg: 50,
        certificate_id: 'cert-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: ListingStatus.ACTIVE,
        listing_type: 'POST_HARVEST',
        produce_category_id: 'category-fruits',
        expiry_date: new Date().toISOString(),
        payment_method_preference: 'BOTH',
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: listingId,
        farmer_id: userId,
        produce_type: 'Tomatoes',
        quantity: 100,
        price_per_kg: 50,
        certificate_id: 'cert-123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: ListingStatus.CANCELLED,
        listing_type: 'POST_HARVEST',
        produce_category_id: 'category-fruits',
        expiry_date: new Date().toISOString(),
        payment_method_preference: 'BOTH',
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
      });

    (listingStatusManager.transitionStatus as jest.Mock).mockResolvedValue(undefined);

    const service = new MarketplaceService();
    const cancelledListing = await service.cancelListing(listingId, userId);

    expect(cancelledListing.status).toBe(ListingStatus.CANCELLED);
    expect(listingStatusManager.transitionStatus).toHaveBeenCalledWith(
      listingId,
      ListingStatus.CANCELLED,
      userId,
      TriggerType.USER,
      expect.objectContaining({
        reason: 'user_cancelled',
      })
    );
  });

  it('should reject cancellation of non-ACTIVE listing', async () => {
    const listingId = 'listing-123';
    const userId = 'farmer-123';

    mockDbManager.get.mockResolvedValue({
      id: listingId,
      farmer_id: userId,
      status: ListingStatus.SOLD,
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
    });

    const service = new MarketplaceService();
    await expect(service.cancelListing(listingId, userId)).rejects.toThrow(
      'Cannot cancel listing. Current status is SOLD, must be ACTIVE'
    );
  });

  it('should reject cancellation when active transaction exists', async () => {
    const listingId = 'listing-123';
    const userId = 'farmer-123';

    mockDbManager.get
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
        id: 'transaction-123',
        listing_id: listingId,
        status: 'PAYMENT_LOCKED',
      });

    const service = new MarketplaceService();
    await expect(service.cancelListing(listingId, userId)).rejects.toThrow(
      'Cannot cancel listing. Active transaction exists with status: PAYMENT_LOCKED'
    );
  });

  it('should allow cancellation with PENDING transaction', async () => {
    const listingId = 'listing-123';
    const userId = 'farmer-123';

    mockDbManager.get
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: listingId,
        farmer_id: userId,
        status: ListingStatus.CANCELLED,
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
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
      });

    (listingStatusManager.transitionStatus as jest.Mock).mockResolvedValue(undefined);

    const service = new MarketplaceService();
    const cancelledListing = await service.cancelListing(listingId, userId);

    expect(cancelledListing.status).toBe(ListingStatus.CANCELLED);
  });
});
