import { notificationService } from '../notification.service';
import type { NotificationTemplate, NotificationType } from '../notification.types';

// Mock the database manager
const mockDbManager = {
  getNotificationTemplate: jest.fn(),
  createNotification: jest.fn(),
  getUserById: jest.fn(),
};

(global as any).sharedDbManager = mockDbManager;

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('interpolateTemplate', () => {
    it('should interpolate variables into template', async () => {
      // Arrange
      const template: NotificationTemplate = {
        id: 'template-1',
        type: 'listing_created',
        language: 'en',
        template: 'Your listing for {{produceType}} has been created. Quantity: {{quantity}} kg.',
        createdAt: new Date(),
      };

      mockDbManager.getNotificationTemplate.mockResolvedValue(template);
      mockDbManager.getUserById.mockResolvedValue({
        id: 'user-1',
        languagePreference: 'en',
      });
      mockDbManager.createNotification.mockImplementation((notification) => 
        Promise.resolve(notification)
      );

      // Act
      const notification = await notificationService.createNotification(
        'user-1',
        'listing_created',
        { produceType: 'Tomatoes', quantity: 100 }
      );

      // Assert
      expect(notification.message).toBe('Your listing for Tomatoes has been created. Quantity: 100 kg.');
      expect(notification.type).toBe('listing_created');
      expect(notification.userId).toBe('user-1');
    });

    it('should handle multiple occurrences of same variable', async () => {
      // Arrange
      const template: NotificationTemplate = {
        id: 'template-1',
        type: 'price_updated',
        language: 'en',
        template: 'Price for {{produceType}} updated from {{oldPrice}} to {{newPrice}}. {{produceType}} is now available.',
        createdAt: new Date(),
      };

      mockDbManager.getNotificationTemplate.mockResolvedValue(template);
      mockDbManager.getUserById.mockResolvedValue({
        id: 'user-1',
        languagePreference: 'en',
      });
      mockDbManager.createNotification.mockImplementation((notification) => 
        Promise.resolve(notification)
      );

      // Act
      const notification = await notificationService.createNotification(
        'user-1',
        'price_updated',
        { produceType: 'Wheat', oldPrice: 20, newPrice: 25 }
      );

      // Assert
      expect(notification.message).toBe('Price for Wheat updated from 20 to 25. Wheat is now available.');
    });
  });

  describe('getTemplate', () => {
    it('should get template in requested language', async () => {
      // Arrange
      const template: NotificationTemplate = {
        id: 'template-1',
        type: 'order_confirmed',
        language: 'hi',
        template: 'आपका ऑर्डर पुष्टि हो गया है।',
        createdAt: new Date(),
      };

      mockDbManager.getNotificationTemplate.mockResolvedValue(template);

      // Act
      const result = await notificationService.getTemplate('order_confirmed', 'hi');

      // Assert
      expect(result).toEqual(template);
      expect(mockDbManager.getNotificationTemplate).toHaveBeenCalledWith('order_confirmed', 'hi');
    });

    it('should fallback to English when language not found', async () => {
      // Arrange
      const englishTemplate: NotificationTemplate = {
        id: 'template-1',
        type: 'order_confirmed',
        language: 'en',
        template: 'Your order has been confirmed.',
        createdAt: new Date(),
      };

      mockDbManager.getNotificationTemplate
        .mockResolvedValueOnce(undefined) // First call for requested language
        .mockResolvedValueOnce(englishTemplate); // Second call for English fallback

      // Act
      const result = await notificationService.getTemplate('order_confirmed', 'xyz');

      // Assert
      expect(result).toEqual(englishTemplate);
      expect(mockDbManager.getNotificationTemplate).toHaveBeenCalledTimes(2);
      expect(mockDbManager.getNotificationTemplate).toHaveBeenNthCalledWith(1, 'order_confirmed', 'xyz');
      expect(mockDbManager.getNotificationTemplate).toHaveBeenNthCalledWith(2, 'order_confirmed', 'en');
    });
  });

  describe('createNotification', () => {
    it('should create notification with user language preference', async () => {
      // Arrange
      const template: NotificationTemplate = {
        id: 'template-1',
        type: 'payment_received',
        language: 'hi',
        template: '₹{{amount}} का भुगतान प्राप्त हुआ है।',
        createdAt: new Date(),
      };

      mockDbManager.getUserById.mockResolvedValue({
        id: 'user-1',
        languagePreference: 'hi',
      });
      mockDbManager.getNotificationTemplate.mockResolvedValue(template);
      mockDbManager.createNotification.mockImplementation((notification) => 
        Promise.resolve(notification)
      );

      // Act
      const notification = await notificationService.createNotification(
        'user-1',
        'payment_received',
        { amount: 5000 }
      );

      // Assert
      expect(notification.message).toBe('₹5000 का भुगतान प्राप्त हुआ है।');
      expect(notification.title).toBe('भुगतान प्राप्त हुआ');
      expect(mockDbManager.getNotificationTemplate).toHaveBeenCalledWith('payment_received', 'hi');
    });

    it('should use specified target language over user preference', async () => {
      // Arrange
      const template: NotificationTemplate = {
        id: 'template-1',
        type: 'delivery_completed',
        language: 'pa',
        template: 'ਡਿਲੀਵਰੀ ਪੂਰੀ ਹੋਈ।',
        createdAt: new Date(),
      };

      mockDbManager.getUserById.mockResolvedValue({
        id: 'user-1',
        languagePreference: 'hi',
      });
      mockDbManager.getNotificationTemplate.mockResolvedValue(template);
      mockDbManager.createNotification.mockImplementation((notification) => 
        Promise.resolve(notification)
      );

      // Act
      const notification = await notificationService.createNotification(
        'user-1',
        'delivery_completed',
        { orderId: 'order-123' },
        'pa' // Explicitly specify Punjabi
      );

      // Assert
      expect(mockDbManager.getNotificationTemplate).toHaveBeenCalledWith('delivery_completed', 'pa');
      expect(mockDbManager.getUserById).not.toHaveBeenCalled(); // Should not fetch user when language specified
    });

    it('should throw error when template not found', async () => {
      // Arrange
      mockDbManager.getUserById.mockResolvedValue({
        id: 'user-1',
        languagePreference: 'en',
      });
      mockDbManager.getNotificationTemplate.mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        notificationService.createNotification(
          'user-1',
          'listing_created',
          { produceType: 'Wheat' }
        )
      ).rejects.toThrow('No template found for notification type: listing_created, language: en');
    });

    it('should store notification data for reference', async () => {
      // Arrange
      const template: NotificationTemplate = {
        id: 'template-1',
        type: 'listing_sold',
        language: 'en',
        template: 'Your {{produceType}} listing has been sold.',
        createdAt: new Date(),
      };

      mockDbManager.getUserById.mockResolvedValue({
        id: 'user-1',
        languagePreference: 'en',
      });
      mockDbManager.getNotificationTemplate.mockResolvedValue(template);
      mockDbManager.createNotification.mockImplementation((notification) => 
        Promise.resolve(notification)
      );

      // Act
      const notification = await notificationService.createNotification(
        'user-1',
        'listing_sold',
        { produceType: 'Rice', buyerName: 'John Doe', quantity: 200 }
      );

      // Assert
      expect(notification.data).toEqual({
        produceType: 'Rice',
        buyerName: 'John Doe',
        quantity: 200,
      });
    });
  });
});
