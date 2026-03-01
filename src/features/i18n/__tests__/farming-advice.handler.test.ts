import { FarmingAdviceHandler } from '../handlers/farming-advice.handler';
import { FarmingTipModel } from '../../../shared/database/mongodb-models';

// Mock the FarmingTipModel
jest.mock('../../../shared/database/mongodb-models', () => ({
  FarmingTipModel: {
    find: jest.fn(),
    distinct: jest.fn(),
  },
}));

describe('FarmingAdviceHandler', () => {
  let handler: FarmingAdviceHandler;

  // Sample farming tips for testing
  const createMockTip = (
    crop: string,
    topic: string,
    language: string = 'en'
  ) => ({
    _id: `tip-${Math.random()}`,
    crop,
    topic,
    advice: `This is advice for ${crop} ${topic}`,
    tips: [
      `Tip 1 for ${crop} ${topic}`,
      `Tip 2 for ${crop} ${topic}`,
      `Tip 3 for ${crop} ${topic}`,
    ],
    season: 'All seasons',
    region: 'All India',
    language,
    references: ['ICAR Guidelines', 'Production Manual'],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    handler = new FarmingAdviceHandler();
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should return farming advice for a valid crop and topic', async () => {
      // Arrange
      const mockTips = [createMockTip('tomato', 'planting', 'en')];
      
      (FarmingTipModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTips),
      });

      // Act
      const result = await handler.handle('tomato', 'planting', 'en');

      // Assert
      expect(result).toEqual({
        crop: 'tomato',
        topic: 'planting',
        advice: 'This is advice for tomato planting',
        tips: [
          'Tip 1 for tomato planting',
          'Tip 2 for tomato planting',
          'Tip 3 for tomato planting',
        ],
        references: ['ICAR Guidelines', 'Production Manual'],
      });
    });

    it('should handle case-insensitive crop and topic names', async () => {
      // Arrange
      const mockTips = [createMockTip('tomato', 'planting', 'en')];
      
      (FarmingTipModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTips),
      });

      // Act
      const result = await handler.handle('TOMATO', 'PLANTING', 'en');

      // Assert
      expect(result.crop).toBe('tomato');
      expect(result.topic).toBe('planting');
    });

    it('should normalize topic variations to standard topics', async () => {
      // Arrange
      const mockTips = [createMockTip('wheat', 'planting', 'en')];
      
      (FarmingTipModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTips),
      });

      // Act - test various topic variations
      const result1 = await handler.handle('wheat', 'sowing', 'en');
      const result2 = await handler.handle('wheat', 'plant', 'en');

      // Assert
      expect(result1.topic).toBe('planting');
      expect(result2.topic).toBe('planting');
    });

    it('should aggregate advice from multiple tips', async () => {
      // Arrange
      const mockTips = [
        createMockTip('rice', 'irrigation', 'en'),
        {
          ...createMockTip('rice', 'irrigation', 'en'),
          advice: 'Additional advice for rice irrigation',
          tips: ['Additional tip 1', 'Additional tip 2'],
          references: ['Additional Reference'],
        },
      ];
      
      (FarmingTipModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockTips),
      });

      // Act
      const result = await handler.handle('rice', 'irrigation', 'en');

      // Assert
      expect(result.advice).toContain('This is advice for rice irrigation');
      expect(result.advice).toContain('Additional advice for rice irrigation');
      expect(result.tips.length).toBeGreaterThan(3); // Should have combined tips
      expect(result.references).toContain('Additional Reference');
    });

    it('should throw error when crop is not found', async () => {
      // Arrange
      (FarmingTipModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      
      (FarmingTipModel.distinct as jest.Mock).mockResolvedValue([]);

      // Act & Assert
      await expect(handler.handle('unknown-crop', 'planting', 'en'))
        .rejects.toThrow('No farming advice found');
    });

    it('should provide suggestions for similar crops when not found', async () => {
      // Arrange
      (FarmingTipModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      
      (FarmingTipModel.distinct as jest.Mock).mockResolvedValue(['tomato', 'potato', 'onion']);

      // Act & Assert
      await expect(handler.handle('tomatos', 'planting', 'en'))
        .rejects.toThrow(/Similar crops available/);
    });

    it('should fallback to English when language not available', async () => {
      // Arrange
      const englishTips = [createMockTip('wheat', 'planting', 'en')];
      
      // First call returns empty (no Hindi tips), second call returns English tips
      (FarmingTipModel.find as jest.Mock)
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue([]),
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue([]),
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(englishTips),
        });

      // Act
      const result = await handler.handle('wheat', 'planting', 'hi');

      // Assert
      expect(result).toBeDefined();
      expect(result.crop).toBe('wheat');
    });

    it('should handle fuzzy matching for crop names', async () => {
      // Arrange
      const mockTips = [createMockTip('tomato', 'planting', 'en')];
      
      // First call (exact match) returns empty, second call (fuzzy match) returns tips
      (FarmingTipModel.find as jest.Mock)
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue([]),
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(mockTips),
        });

      // Act
      const result = await handler.handle('tomat', 'planting', 'en');

      // Assert
      expect(result.crop).toBe('tomato');
    });
  });

  describe('formatResponse', () => {
    it('should format advice response with tips and references', async () => {
      // Arrange
      const adviceData = {
        crop: 'wheat',
        topic: 'planting',
        advice: 'Wheat should be sown in November-December',
        tips: ['Prepare field properly', 'Use certified seeds', 'Maintain spacing'],
        references: ['ICAR Guidelines', 'Wheat Manual'],
      };

      // Act
      const result = await handler.formatResponse(adviceData, 'en');

      // Assert
      expect(result.text).toContain('Wheat should be sown in November-December');
      expect(result.text).toContain('1. Prepare field properly');
      expect(result.text).toContain('2. Use certified seeds');
      expect(result.text).toContain('3. Maintain spacing');
      expect(result.text).toContain('References: ICAR Guidelines, Wheat Manual');
      expect(result.data).toEqual(adviceData);
    });

    it('should format response without references if none provided', async () => {
      // Arrange
      const adviceData = {
        crop: 'rice',
        topic: 'irrigation',
        advice: 'Rice requires continuous water',
        tips: ['Maintain water level', 'Drain before harvest'],
        references: [],
      };

      // Act
      const result = await handler.formatResponse(adviceData, 'en');

      // Assert
      expect(result.text).not.toContain('References:');
      expect(result.text).toContain('Maintain water level');
    });
  });

  describe('error handling', () => {
    it('should handle database query errors gracefully', async () => {
      // Arrange
      (FarmingTipModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      });

      // Act & Assert
      await expect(handler.handle('wheat', 'planting', 'en'))
        .rejects.toThrow('Failed to query farming advice database');
    });

    it('should handle empty tips array in aggregation', async () => {
      // Arrange
      (FarmingTipModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      
      (FarmingTipModel.distinct as jest.Mock).mockResolvedValue([]);

      // Act & Assert
      await expect(handler.handle('unknown', 'planting', 'en'))
        .rejects.toThrow();
    });
  });

  describe('similarity calculation', () => {
    it('should calculate high similarity for contained strings', async () => {
      // This tests the private method indirectly through getSimilarCrops
      (FarmingTipModel.find as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      
      (FarmingTipModel.distinct as jest.Mock).mockResolvedValue(['tomato', 'potato', 'onion']);

      // Act
      try {
        await handler.handle('tomat', 'planting', 'en');
      } catch (error: any) {
        // Assert - should suggest tomato as similar
        expect(error.message).toContain('tomato');
      }
    });
  });
});
