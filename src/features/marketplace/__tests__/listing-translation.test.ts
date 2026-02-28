import { marketplaceService } from '../marketplace.service';
import { translationService } from '../../i18n/translation.service';
import type { Listing } from '../marketplace.types';

// Mock the translation service
jest.mock('../../i18n/translation.service', () => ({
  translationService: {
    translateText: jest.fn(),
  },
}));

// Mock the database manager
const mockDbManager = {
  getListing: jest.fn(),
};

(global as any).sharedDbManager = mockDbManager;

describe('Listing Translation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTranslatedListing', () => {
    it('should translate listing produceType to target language', async () => {
      // Arrange
      const mockListing: Listing = {
        id: 'listing-1',
        farmerId: 'farmer-1',
        produceType: 'Tomatoes',
        quantity: 100,
        pricePerKg: 30,
        certificateId: 'cert-1',
        createdAt: new Date('2024-01-01'),
        isActive: true,
      };

      mockDbManager.getListing.mockResolvedValue(mockListing);
      
      (translationService.translateText as jest.Mock).mockResolvedValue({
        translatedText: 'टमाटर',
        sourceLanguage: 'en',
        targetLanguage: 'hi',
        confidence: 0.95,
        cached: false,
      });

      // Act
      const result = await marketplaceService.getTranslatedListing('listing-1', 'hi');

      // Assert
      expect(result).toBeDefined();
      expect(result?.translatedProduceType).toBe('टमाटर');
      expect(result?.originalProduceType).toBe('Tomatoes');
      expect(result?.isTranslated).toBe(true);
      expect(result?.sourceLanguage).toBe('en');
      expect(result?.targetLanguage).toBe('hi');
      expect(result?.produceType).toBe('टमाटर'); // Should show translated version
    });

    it('should not mark as translated when source and target languages are the same', async () => {
      // Arrange
      const mockListing: Listing = {
        id: 'listing-1',
        farmerId: 'farmer-1',
        produceType: 'Tomatoes',
        quantity: 100,
        pricePerKg: 30,
        certificateId: 'cert-1',
        createdAt: new Date('2024-01-01'),
        isActive: true,
      };

      mockDbManager.getListing.mockResolvedValue(mockListing);
      
      (translationService.translateText as jest.Mock).mockResolvedValue({
        translatedText: 'Tomatoes',
        sourceLanguage: 'en',
        targetLanguage: 'en',
        confidence: 1.0,
        cached: false,
      });

      // Act
      const result = await marketplaceService.getTranslatedListing('listing-1', 'en');

      // Assert
      expect(result).toBeDefined();
      expect(result?.isTranslated).toBe(false);
      expect(result?.translatedProduceType).toBe('Tomatoes');
      expect(result?.originalProduceType).toBe('Tomatoes');
    });

    it('should return undefined when listing not found', async () => {
      // Arrange
      mockDbManager.getListing.mockResolvedValue(undefined);

      // Act
      const result = await marketplaceService.getTranslatedListing('nonexistent', 'hi');

      // Assert
      expect(result).toBeUndefined();
      expect(translationService.translateText).not.toHaveBeenCalled();
    });

    it('should include all original listing fields in translated listing', async () => {
      // Arrange
      const mockListing: Listing = {
        id: 'listing-1',
        farmerId: 'farmer-1',
        produceType: 'Wheat',
        quantity: 500,
        pricePerKg: 25,
        certificateId: 'cert-1',
        expectedHarvestDate: new Date('2024-06-01'),
        createdAt: new Date('2024-01-01'),
        isActive: true,
      };

      mockDbManager.getListing.mockResolvedValue(mockListing);
      
      (translationService.translateText as jest.Mock).mockResolvedValue({
        translatedText: 'गेहूं',
        sourceLanguage: 'en',
        targetLanguage: 'hi',
        confidence: 0.95,
        cached: false,
      });

      // Act
      const result = await marketplaceService.getTranslatedListing('listing-1', 'hi');

      // Assert
      expect(result).toBeDefined();
      expect(result?.id).toBe('listing-1');
      expect(result?.farmerId).toBe('farmer-1');
      expect(result?.quantity).toBe(500);
      expect(result?.pricePerKg).toBe(25);
      expect(result?.certificateId).toBe('cert-1');
      expect(result?.expectedHarvestDate).toEqual(new Date('2024-06-01'));
      expect(result?.isActive).toBe(true);
    });
  });
});
