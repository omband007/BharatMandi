import request from 'supertest';
import express from 'express';
import { marketplaceController } from '../marketplace.controller';
import { marketplaceService } from '../marketplace.service';
import type { Listing, TranslatedListing } from '../marketplace.types';

// Mock the marketplace service
jest.mock('../marketplace.service', () => ({
  marketplaceService: {
    getActiveListings: jest.fn(),
    getTranslatedListings: jest.fn(),
  },
}));

describe('Marketplace Controller - Batch Translation Integration', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/marketplace', marketplaceController);
    jest.clearAllMocks();
  });

  describe('GET /api/marketplace/listings', () => {
    it('should return listings in original language when no lang parameter', async () => {
      // Arrange
      const mockListings: Listing[] = [
        {
          id: '1',
          farmerId: 'farmer1',
          produceType: 'Tomatoes',
          quantity: 100,
          pricePerKg: 30,
          certificateId: 'cert1',
          createdAt: new Date(),
          isActive: true,
        },
      ];

      (marketplaceService.getActiveListings as jest.Mock).mockResolvedValue(mockListings);

      // Act
      const response = await request(app).get('/api/marketplace/listings');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: '1',
        farmerId: 'farmer1',
        produceType: 'Tomatoes',
        quantity: 100,
        pricePerKg: 30,
        certificateId: 'cert1',
        isActive: true,
      });
      expect(marketplaceService.getActiveListings).toHaveBeenCalledTimes(1);
      expect(marketplaceService.getTranslatedListings).not.toHaveBeenCalled();
    });

    it('should return batch-translated listings when lang parameter is provided', async () => {
      // Arrange
      const mockTranslatedListings: TranslatedListing[] = [
        {
          id: '1',
          farmerId: 'farmer1',
          produceType: 'टमाटर',
          originalProduceType: 'Tomatoes',
          translatedProduceType: 'टमाटर',
          isTranslated: true,
          sourceLanguage: 'en',
          targetLanguage: 'hi',
          quantity: 100,
          pricePerKg: 30,
          certificateId: 'cert1',
          createdAt: new Date(),
          isActive: true,
        },
        {
          id: '2',
          farmerId: 'farmer2',
          produceType: 'आलू',
          originalProduceType: 'Potatoes',
          translatedProduceType: 'आलू',
          isTranslated: true,
          sourceLanguage: 'en',
          targetLanguage: 'hi',
          quantity: 200,
          pricePerKg: 20,
          certificateId: 'cert2',
          createdAt: new Date(),
          isActive: true,
        },
      ];

      (marketplaceService.getTranslatedListings as jest.Mock).mockResolvedValue(mockTranslatedListings);

      // Act
      const response = await request(app).get('/api/marketplace/listings?lang=hi');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        id: '1',
        produceType: 'टमाटर',
        originalProduceType: 'Tomatoes',
        translatedProduceType: 'टमाटर',
        isTranslated: true,
        sourceLanguage: 'en',
        targetLanguage: 'hi',
      });
      expect(response.body[1]).toMatchObject({
        id: '2',
        produceType: 'आलू',
        originalProduceType: 'Potatoes',
        translatedProduceType: 'आलू',
        isTranslated: true,
        sourceLanguage: 'en',
        targetLanguage: 'hi',
      });
      expect(marketplaceService.getTranslatedListings).toHaveBeenCalledWith('hi');
      expect(marketplaceService.getActiveListings).not.toHaveBeenCalled();
    });

    it('should support different target languages', async () => {
      // Arrange
      const mockTranslatedListings: TranslatedListing[] = [
        {
          id: '1',
          farmerId: 'farmer1',
          produceType: 'टोमॅटो',
          originalProduceType: 'Tomatoes',
          translatedProduceType: 'टोमॅटो',
          isTranslated: true,
          sourceLanguage: 'en',
          targetLanguage: 'mr',
          quantity: 100,
          pricePerKg: 30,
          certificateId: 'cert1',
          createdAt: new Date(),
          isActive: true,
        },
      ];

      (marketplaceService.getTranslatedListings as jest.Mock).mockResolvedValue(mockTranslatedListings);

      // Act
      const response = await request(app).get('/api/marketplace/listings?lang=mr');

      // Assert
      expect(response.status).toBe(200);
      expect(marketplaceService.getTranslatedListings).toHaveBeenCalledWith('mr');
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      (marketplaceService.getTranslatedListings as jest.Mock).mockRejectedValue(
        new Error('Translation service unavailable')
      );

      // Act
      const response = await request(app).get('/api/marketplace/listings?lang=hi');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Failed to fetch listings' });
    });
  });
});
