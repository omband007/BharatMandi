import { MarketplaceService } from '../marketplace.service';
import { translationService } from '../../i18n/translation.service';
import type { Listing } from '../marketplace.types';
import { ListingStatus, ListingType, PaymentMethodPreference } from '../marketplace.types';
import type { DatabaseManager } from '../../../shared/database/db-abstraction';

// Mock the translation service
jest.mock('../../i18n/translation.service', () => ({
  translationService: {
    translateText: jest.fn(),
    translateBatch: jest.fn(),
    detectLanguage: jest.fn(),
  },
}));

// Mock the global database manager
const mockDbManager = {
  getActiveListings: jest.fn(),
  getListing: jest.fn(),
  createListing: jest.fn(),
  updateListing: jest.fn(),
  get: jest.fn(),
  all: jest.fn(),
  run: jest.fn(),
} as unknown as DatabaseManager;

(global as any).sharedDbManager = mockDbManager;

describe('MarketplaceService - Batch Translation', () => {
  let service: MarketplaceService;

  beforeEach(() => {
    service = new MarketplaceService();
    jest.clearAllMocks();
  });

  describe('getTranslatedListings', () => {
    it('should batch translate all listings in one call', async () => {
      // Arrange - Mock database rows (not Listing objects)
      const mockRows = [
        {
          id: '1',
          farmer_id: 'farmer1',
          produce_type: 'Tomatoes',
          quantity: 100,
          price_per_kg: 30,
          certificate_id: 'cert1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: ListingStatus.ACTIVE,
          listing_type: ListingType.POST_HARVEST,
          produce_category_id: 'cat-1',
          expiry_date: new Date(Date.now() + 86400000).toISOString(),
          payment_method_preference: PaymentMethodPreference.BOTH,
        },
        {
          id: '2',
          farmer_id: 'farmer2',
          produce_type: 'Potatoes',
          quantity: 200,
          price_per_kg: 20,
          certificate_id: 'cert2',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: ListingStatus.ACTIVE,
          listing_type: ListingType.POST_HARVEST,
          produce_category_id: 'cat-1',
          expiry_date: new Date(Date.now() + 86400000).toISOString(),
          payment_method_preference: PaymentMethodPreference.BOTH,
        },
        {
          id: '3',
          farmer_id: 'farmer3',
          produce_type: 'Onions',
          quantity: 150,
          price_per_kg: 25,
          certificate_id: 'cert3',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: ListingStatus.ACTIVE,
          listing_type: ListingType.POST_HARVEST,
          produce_category_id: 'cat-1',
          expiry_date: new Date(Date.now() + 86400000).toISOString(),
          payment_method_preference: PaymentMethodPreference.BOTH,
        },
      ];

      // Mock dbManager.all() to return rows (used by getListingsByStatus)
      (mockDbManager.all as jest.Mock).mockResolvedValue(mockRows);
      (translationService.detectLanguage as jest.Mock).mockResolvedValue('en');
      (translationService.translateBatch as jest.Mock).mockResolvedValue([
        'टमाटर',
        'आलू',
        'प्याज',
      ]);

      // Act
      const result = await service.getTranslatedListings('hi');

      // Assert
      expect(mockDbManager.all).toHaveBeenCalledTimes(1);
      expect(translationService.detectLanguage).toHaveBeenCalledWith('Tomatoes');
      expect(translationService.translateBatch).toHaveBeenCalledTimes(1);
      expect(translationService.translateBatch).toHaveBeenCalledWith(
        ['Tomatoes', 'Potatoes', 'Onions'],
        'en',
        'hi'
      );

      expect(result).toHaveLength(3);
      expect(result[0].produceType).toBe('टमाटर');
      expect(result[0].originalProduceType).toBe('Tomatoes');
      expect(result[0].isTranslated).toBe(true);
      expect(result[1].produceType).toBe('आलू');
      expect(result[2].produceType).toBe('प्याज');
    });

    it('should skip translation when source and target languages are the same', async () => {
      // Arrange - Mock database rows
      const mockRows = [
        {
          id: '1',
          farmer_id: 'farmer1',
          produce_type: 'Tomatoes',
          quantity: 100,
          price_per_kg: 30,
          certificate_id: 'cert1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: ListingStatus.ACTIVE,
          listing_type: ListingType.POST_HARVEST,
          produce_category_id: 'cat-1',
          expiry_date: new Date(Date.now() + 86400000).toISOString(),
          payment_method_preference: PaymentMethodPreference.BOTH,
        },
      ];

      (mockDbManager.all as jest.Mock).mockResolvedValue(mockRows);
      (translationService.detectLanguage as jest.Mock).mockResolvedValue('en');

      // Act
      const result = await service.getTranslatedListings('en');

      // Assert
      expect(translationService.translateBatch).not.toHaveBeenCalled();
      expect(result[0].produceType).toBe('Tomatoes');
      expect(result[0].isTranslated).toBe(false);
    });

    it('should return empty array when no listings exist', async () => {
      // Arrange
      (mockDbManager.all as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await service.getTranslatedListings('hi');

      // Assert
      expect(result).toEqual([]);
      expect(translationService.translateBatch).not.toHaveBeenCalled();
    });

    it('should reduce API calls by batching (performance test)', async () => {
      // Arrange - Create 30 database rows to test batching
      const mockRows = Array.from({ length: 30 }, (_, i) => ({
        id: `listing-${i}`,
        farmer_id: `farmer-${i}`,
        produce_type: `Produce ${i}`,
        quantity: 100,
        price_per_kg: 30,
        certificate_id: `cert-${i}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: ListingStatus.ACTIVE,
        listing_type: ListingType.POST_HARVEST,
        produce_category_id: 'cat-1',
        expiry_date: new Date(Date.now() + 86400000).toISOString(),
        payment_method_preference: PaymentMethodPreference.BOTH,
      }));

      const translatedTexts = Array.from({ length: 30 }, (_, i) => `उत्पाद ${i}`);

      (mockDbManager.all as jest.Mock).mockResolvedValue(mockRows);
      (translationService.detectLanguage as jest.Mock).mockResolvedValue('en');
      (translationService.translateBatch as jest.Mock).mockResolvedValue(translatedTexts);

      // Act
      const result = await service.getTranslatedListings('hi');

      // Assert
      // Without batching, this would require 30 API calls (one per listing)
      // With batching, it requires only 2 calls: 1 for language detection + 1 for batch translation
      expect(translationService.detectLanguage).toHaveBeenCalledTimes(1);
      expect(translationService.translateBatch).toHaveBeenCalledTimes(1);
      
      // Verify all listings were translated
      expect(result).toHaveLength(30);
      result.forEach((listing, i) => {
        expect(listing.produceType).toBe(`उत्पाद ${i}`);
        expect(listing.isTranslated).toBe(true);
      });
    });

    it('should handle translation errors gracefully', async () => {
      // Arrange - Mock database rows
      const mockRows = [
        {
          id: '1',
          farmer_id: 'farmer1',
          produce_type: 'Tomatoes',
          quantity: 100,
          price_per_kg: 30,
          certificate_id: 'cert1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: ListingStatus.ACTIVE,
          listing_type: ListingType.POST_HARVEST,
          produce_category_id: 'cat-1',
          expiry_date: new Date(Date.now() + 86400000).toISOString(),
          payment_method_preference: PaymentMethodPreference.BOTH,
        },
      ];

      (mockDbManager.all as jest.Mock).mockResolvedValue(mockRows);
      (translationService.detectLanguage as jest.Mock).mockResolvedValue('en');
      (translationService.translateBatch as jest.Mock).mockRejectedValue(
        new Error('Translation service unavailable')
      );

      // Act & Assert
      await expect(service.getTranslatedListings('hi')).rejects.toThrow(
        'Translation service unavailable'
      );
    });
  });
});

