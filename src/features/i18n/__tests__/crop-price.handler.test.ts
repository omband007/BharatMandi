import { CropPriceHandler } from '../handlers/crop-price.handler';
import type { DatabaseManager } from '../../../shared/database/db-abstraction';
import type { Listing } from '../../marketplace/marketplace.types';
import { translationService } from '../translation.service';

// Mock translation service
jest.mock('../translation.service', () => ({
  translationService: {
    translateText: jest.fn(),
  },
}));

describe('CropPriceHandler', () => {
  let handler: CropPriceHandler;
  let mockDbManager: jest.Mocked<DatabaseManager>;

  // Sample listings for testing
  const createMockListing = (
    produceType: string,
    pricePerKg: number,
    daysAgo: number = 0
  ): Listing => {
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    
    return {
      id: `listing-${Math.random()}`,
      farmerId: 'farmer-1',
      produceType,
      quantity: 100,
      pricePerKg,
      certificateId: 'cert-1',
      createdAt,
      isActive: true,
    };
  };

  beforeEach(() => {
    // Create mock database manager
    mockDbManager = {
      getActiveListings: jest.fn(),
    } as any;

    handler = new CropPriceHandler(mockDbManager);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should return price statistics for a valid crop', async () => {
      // Arrange
      const mockListings: Listing[] = [
        createMockListing('Tomato', 30),
        createMockListing('Tomato', 35),
        createMockListing('Tomato', 40),
      ];

      mockDbManager.getActiveListings.mockResolvedValue(mockListings);

      // Act
      const result = await handler.handle('tomato');

      // Assert
      expect(result).toEqual({
        crop: 'tomato',
        averagePrice: 35,
        minPrice: 30,
        maxPrice: 40,
        trend: 'stable',
        unit: 'kg',
        lastUpdated: expect.any(Date),
        sampleSize: 3,
      });
    });

    it('should handle case-insensitive crop names', async () => {
      // Arrange
      const mockListings: Listing[] = [
        createMockListing('TOMATO', 35),
        createMockListing('Tomato', 40),
      ];

      mockDbManager.getActiveListings.mockResolvedValue(mockListings);

      // Act
      const result = await handler.handle('ToMaTo');

      // Assert
      expect(result.crop).toBe('tomato');
      expect(result.sampleSize).toBe(2);
    });

    it('should calculate correct average, min, and max prices', async () => {
      // Arrange
      const mockListings: Listing[] = [
        createMockListing('Potato', 20),
        createMockListing('Potato', 25),
        createMockListing('Potato', 30),
        createMockListing('Potato', 35),
      ];

      mockDbManager.getActiveListings.mockResolvedValue(mockListings);

      // Act
      const result = await handler.handle('potato');

      // Assert
      expect(result.averagePrice).toBe(27.5);
      expect(result.minPrice).toBe(20);
      expect(result.maxPrice).toBe(35);
    });

    it('should throw error when crop is not found', async () => {
      // Arrange
      mockDbManager.getActiveListings.mockResolvedValue([]);

      // Act & Assert
      await expect(handler.handle('nonexistent')).rejects.toThrow(
        'No listings found for crop: nonexistent'
      );
    });

    it('should suggest similar crops when crop is not found', async () => {
      // Arrange
      const mockListings: Listing[] = [
        createMockListing('Tomato', 35),
        createMockListing('Potato', 25),
      ];

      mockDbManager.getActiveListings.mockResolvedValue(mockListings);

      // Act & Assert - use "potao" which is similar to "potato"
      await expect(handler.handle('potao')).rejects.toThrow(/Did you mean/);
    });

    it('should handle partial crop name matches', async () => {
      // Arrange
      const mockListings: Listing[] = [
        createMockListing('Cherry Tomato', 50),
        createMockListing('Tomato', 35),
      ];

      mockDbManager.getActiveListings.mockResolvedValue(mockListings);

      // Act
      const result = await handler.handle('tomato');

      // Assert
      expect(result.sampleSize).toBe(2);
      expect(result.averagePrice).toBe(42.5);
    });
  });

  describe('trend calculation', () => {
    it('should detect upward price trend', async () => {
      // Arrange - historical prices lower than current
      const mockListings: Listing[] = [
        createMockListing('Wheat', 40, 0), // Current
        createMockListing('Wheat', 42, 0), // Current
        createMockListing('Wheat', 30, 8), // Historical (8 days ago)
        createMockListing('Wheat', 32, 8), // Historical
      ];

      mockDbManager.getActiveListings.mockResolvedValue(mockListings);

      // Act
      const result = await handler.handle('wheat');

      // Assert
      expect(result.trend).toBe('up');
    });

    it('should detect downward price trend', async () => {
      // Arrange - historical prices higher than current
      const mockListings: Listing[] = [
        createMockListing('Rice', 30, 0), // Current
        createMockListing('Rice', 32, 0), // Current
        createMockListing('Rice', 45, 8), // Historical (8 days ago)
        createMockListing('Rice', 47, 8), // Historical
      ];

      mockDbManager.getActiveListings.mockResolvedValue(mockListings);

      // Act
      const result = await handler.handle('rice');

      // Assert
      expect(result.trend).toBe('down');
    });

    it('should detect stable price trend', async () => {
      // Arrange - prices similar (within 5% threshold)
      const mockListings: Listing[] = [
        createMockListing('Onion', 35, 0), // Current
        createMockListing('Onion', 36, 0), // Current
        createMockListing('Onion', 34, 8), // Historical
        createMockListing('Onion', 36, 8), // Historical
      ];

      mockDbManager.getActiveListings.mockResolvedValue(mockListings);

      // Act
      const result = await handler.handle('onion');

      // Assert
      expect(result.trend).toBe('stable');
    });

    it('should return stable trend when no historical data exists', async () => {
      // Arrange - only current listings
      const mockListings: Listing[] = [
        createMockListing('NewCrop', 50, 0),
        createMockListing('NewCrop', 55, 0),
      ];

      mockDbManager.getActiveListings.mockResolvedValue(mockListings);

      // Act
      const result = await handler.handle('newcrop');

      // Assert
      expect(result.trend).toBe('stable');
    });
  });

  describe('formatResponse', () => {
    it('should format response in English', async () => {
      // Arrange
      const priceData = {
        crop: 'tomato',
        averagePrice: 35,
        minPrice: 30,
        maxPrice: 40,
        trend: 'stable' as const,
        unit: 'kg',
        lastUpdated: new Date(),
        sampleSize: 3,
      };

      // Act
      const result = await handler.formatResponse(priceData, 'en');

      // Assert
      expect(result.text).toContain('tomato');
      expect(result.text).toContain('₹35');
      expect(result.text).toContain('₹30');
      expect(result.text).toContain('₹40');
      expect(result.text).toContain('stable');
      expect(result.text).toContain('3 active listings');
      expect(result.data).toEqual(priceData);
    });

    it('should translate response to Hindi', async () => {
      // Arrange
      const priceData = {
        crop: 'tomato',
        averagePrice: 35,
        minPrice: 30,
        maxPrice: 40,
        trend: 'up' as const,
        unit: 'kg',
        lastUpdated: new Date(),
        sampleSize: 3,
      };

      (translationService.translateText as jest.Mock).mockResolvedValue({
        translatedText: 'टमाटर वर्तमान में ₹35 प्रति किलो में बिक रहा है।',
        sourceLanguage: 'en',
        targetLanguage: 'hi',
      });

      // Act
      const result = await handler.formatResponse(priceData, 'hi');

      // Assert
      expect(translationService.translateText).toHaveBeenCalledWith({
        text: expect.stringContaining('tomato'),
        sourceLanguage: 'en',
        targetLanguage: 'hi',
      });
      expect(result.text).toContain('टमाटर');
    });

    it('should handle translation failure gracefully', async () => {
      // Arrange
      const priceData = {
        crop: 'tomato',
        averagePrice: 35,
        minPrice: 30,
        maxPrice: 40,
        trend: 'down' as const,
        unit: 'kg',
        lastUpdated: new Date(),
        sampleSize: 3,
      };

      (translationService.translateText as jest.Mock).mockRejectedValue(
        new Error('Translation failed')
      );

      // Act
      const result = await handler.formatResponse(priceData, 'hi');

      // Assert - should fall back to English
      expect(result.text).toContain('tomato');
      expect(result.text).toContain('₹35');
    });

    it('should format increasing trend correctly', async () => {
      // Arrange
      const priceData = {
        crop: 'wheat',
        averagePrice: 45,
        minPrice: 40,
        maxPrice: 50,
        trend: 'up' as const,
        unit: 'kg',
        lastUpdated: new Date(),
        sampleSize: 5,
      };

      // Act
      const result = await handler.formatResponse(priceData, 'en');

      // Assert
      expect(result.text).toContain('increasing');
    });

    it('should format decreasing trend correctly', async () => {
      // Arrange
      const priceData = {
        crop: 'rice',
        averagePrice: 40,
        minPrice: 35,
        maxPrice: 45,
        trend: 'down' as const,
        unit: 'kg',
        lastUpdated: new Date(),
        sampleSize: 4,
      };

      // Act
      const result = await handler.formatResponse(priceData, 'en');

      // Assert
      expect(result.text).toContain('decreasing');
    });
  });

  describe('edge cases', () => {
    it('should round prices to 2 decimal places', async () => {
      // Arrange
      const mockListings: Listing[] = [
        createMockListing('Carrot', 33.333),
        createMockListing('Carrot', 33.336),
        createMockListing('Carrot', 33.339),
      ];

      mockDbManager.getActiveListings.mockResolvedValue(mockListings);

      // Act
      const result = await handler.handle('carrot');

      // Assert
      expect(result.averagePrice).toBe(33.34);
      expect(result.minPrice).toBe(33.33);
      expect(result.maxPrice).toBe(33.34);
    });

    it('should handle single listing', async () => {
      // Arrange
      const mockListings: Listing[] = [
        createMockListing('RareCrop', 100),
      ];

      mockDbManager.getActiveListings.mockResolvedValue(mockListings);

      // Act
      const result = await handler.handle('rarecrop');

      // Assert
      expect(result.averagePrice).toBe(100);
      expect(result.minPrice).toBe(100);
      expect(result.maxPrice).toBe(100);
      expect(result.sampleSize).toBe(1);
    });

    it('should handle whitespace in crop names', async () => {
      // Arrange
      const mockListings: Listing[] = [
        createMockListing('Tomato', 35),
      ];

      mockDbManager.getActiveListings.mockResolvedValue(mockListings);

      // Act
      const result = await handler.handle('  tomato  ');

      // Assert
      expect(result.crop).toBe('tomato');
    });
  });
});
