import { v4 as uuidv4 } from 'uuid';
import type { 
  Notification, 
  NotificationTemplate, 
  NotificationType, 
  NotificationVariables 
} from './notification.types';
import type { DatabaseManager } from '../../shared/database/db-abstraction';

// Get the shared DatabaseManager instance
function getDbManager(): DatabaseManager {
  const dbManager = (global as any).sharedDbManager;
  if (!dbManager) {
    throw new Error('DatabaseManager not initialized');
  }
  return dbManager;
}

export class NotificationService {
  /**
   * Interpolate variables into a template string
   * Replaces {{variableName}} with actual values
   */
  private interpolateTemplate(template: string, variables: NotificationVariables): string {
    let result = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), String(value));
    }
    
    return result;
  }

  /**
   * Get notification template for a specific type and language
   * Falls back to English if language not found
   */
  async getTemplate(type: NotificationType, language: string): Promise<NotificationTemplate | undefined> {
    const dbManager = getDbManager();
    
    // Try to get template in requested language
    let template = await dbManager.getNotificationTemplate(type, language);
    
    // Fallback to English if not found
    if (!template && language !== 'en') {
      template = await dbManager.getNotificationTemplate(type, 'en');
    }
    
    return template;
  }

  /**
   * Create a notification with translated content
   * Uses notification templates and variable interpolation
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    variables: NotificationVariables,
    targetLanguage?: string
  ): Promise<Notification> {
    const dbManager = getDbManager();
    
    // Get user's language preference if not specified
    let language = targetLanguage;
    if (!language) {
      const user = await dbManager.getUserById(userId);
      language = user?.languagePreference || 'en';
    }

    // Get the template for this notification type and language
    const template = await this.getTemplate(type, language);
    
    if (!template) {
      throw new Error(`No template found for notification type: ${type}, language: ${language}`);
    }

    // Interpolate variables into the template
    const message = this.interpolateTemplate(template.template, variables);

    // Create the notification
    const notification: Notification = {
      id: uuidv4(),
      userId,
      type,
      title: this.getNotificationTitle(type, language),
      message,
      data: variables,
      isRead: false,
      createdAt: new Date(),
    };

    // Save to database
    await dbManager.createNotification(notification);

    return notification;
  }

  /**
   * Get notification title based on type and language
   * This could also use templates, but keeping it simple for now
   */
  private getNotificationTitle(type: NotificationType, language: string): string {
    const titles: Record<NotificationType, Record<string, string>> = {
      listing_created: {
        en: 'Listing Created',
        hi: 'लिस्टिंग बनाई गई',
        pa: 'ਲਿਸਟਿੰਗ ਬਣਾਈ ਗਈ',
        mr: 'लिस्टिंग तयार केली',
        ta: 'பட்டியல் உருவாக்கப்பட்டது',
        te: 'జాబితా సృష్టించబడింది',
        bn: 'তালিকা তৈরি হয়েছে',
        gu: 'લિસ્ટિંગ બનાવવામાં આવી',
        kn: 'ಪಟ್ಟಿ ರಚಿಸಲಾಗಿದೆ',
        ml: 'ലിസ്റ്റിംഗ് സൃഷ്ടിച്ചു',
        or: 'ତାଲିକା ସୃଷ୍ଟି ହୋଇଛି',
      },
      listing_sold: {
        en: 'Listing Sold',
        hi: 'लिस्टिंग बिक गई',
        pa: 'ਲਿਸਟਿੰਗ ਵੇਚੀ ਗਈ',
        mr: 'लिस्टिंग विकली गेली',
        ta: 'பட்டியல் விற்கப்பட்டது',
        te: 'జాబితా అమ్ముడైంది',
        bn: 'তালিকা বিক্রি হয়েছে',
        gu: 'લિસ્ટિંગ વેચાઈ',
        kn: 'ಪಟ್ಟಿ ಮಾರಾಟವಾಗಿದೆ',
        ml: 'ലിസ്റ്റിംഗ് വിറ്റു',
        or: 'ତାଲିକା ବିକ୍ରି ହୋଇଛି',
      },
      order_confirmed: {
        en: 'Order Confirmed',
        hi: 'ऑर्डर की पुष्टि हुई',
        pa: 'ਆਰਡਰ ਪੁਸ਼ਟੀ ਹੋਈ',
        mr: 'ऑर्डर पुष्टी झाली',
        ta: 'ஆர்டர் உறுதிப்படுத்தப்பட்டது',
        te: 'ఆర్డర్ నిర్ధారించబడింది',
        bn: 'অর্ডার নিশ্চিত হয়েছে',
        gu: 'ઓર્ડર પુષ્ટિ થઈ',
        kn: 'ಆರ್ಡರ್ ದೃಢೀಕರಿಸಲಾಗಿದೆ',
        ml: 'ഓർഡർ സ്ഥിരീകരിച്ചു',
        or: 'ଅର୍ଡର ନିଶ୍ଚିତ ହୋଇଛି',
      },
      payment_received: {
        en: 'Payment Received',
        hi: 'भुगतान प्राप्त हुआ',
        pa: 'ਭੁਗਤਾਨ ਪ੍ਰਾਪਤ ਹੋਇਆ',
        mr: 'पेमेंट मिळाले',
        ta: 'பணம் பெறப்பட்டது',
        te: 'చెల్లింపు అందింది',
        bn: 'পেমেন্ট পাওয়া গেছে',
        gu: 'ચુકવણી પ્રાપ્ત થઈ',
        kn: 'ಪಾವತಿ ಸ್ವೀಕರಿಸಲಾಗಿದೆ',
        ml: 'പേയ്മെന്റ് ലഭിച്ചു',
        or: 'ପେମେଣ୍ଟ ପାଇଛି',
      },
      payment_released: {
        en: 'Payment Released',
        hi: 'भुगतान जारी किया गया',
        pa: 'ਭੁਗਤਾਨ ਜਾਰੀ ਕੀਤਾ ਗਿਆ',
        mr: 'पेमेंट सोडले',
        ta: 'பணம் வெளியிடப்பட்டது',
        te: 'చెల్లింపు విడుదల చేయబడింది',
        bn: 'পেমেন্ট মুক্তি দেওয়া হয়েছে',
        gu: 'ચુકવણી મુક્ત કરવામાં આવી',
        kn: 'ಪಾವತಿ ಬಿಡುಗಡೆ ಮಾಡಲಾಗಿದೆ',
        ml: 'പേയ്മെന്റ് റിലീസ് ചെയ്തു',
        or: 'ପେମେଣ୍ଟ ମୁକ୍ତ କରାଯାଇଛି',
      },
      delivery_scheduled: {
        en: 'Delivery Scheduled',
        hi: 'डिलीवरी निर्धारित',
        pa: 'ਡਿਲੀਵਰੀ ਨਿਰਧਾਰਤ',
        mr: 'डिलिव्हरी शेड्यूल केली',
        ta: 'டெலிவரி திட்டமிடப்பட்டது',
        te: 'డెలివరీ షెడ్యూల్ చేయబడింది',
        bn: 'ডেলিভারি নির্ধারিত',
        gu: 'ડિલિવરી શેડ્યૂલ કરવામાં આવી',
        kn: 'ವಿತರಣೆ ನಿಗದಿಪಡಿಸಲಾಗಿದೆ',
        ml: 'ഡെലിവറി ഷെഡ്യൂൾ ചെയ്തു',
        or: 'ଡେଲିଭରୀ ନିର୍ଧାରିତ',
      },
      delivery_completed: {
        en: 'Delivery Completed',
        hi: 'डिलीवरी पूर्ण हुई',
        pa: 'ਡਿਲੀਵਰੀ ਪੂਰੀ ਹੋਈ',
        mr: 'डिलिव्हरी पूर्ण झाली',
        ta: 'டெலிவரி முடிந்தது',
        te: 'డెలివరీ పూర్తయింది',
        bn: 'ডেলিভারি সম্পন্ন হয়েছে',
        gu: 'ડિલિવરી પૂર્ણ થઈ',
        kn: 'ವಿತರಣೆ ಪೂರ್ಣಗೊಂಡಿದೆ',
        ml: 'ഡെലിവറി പൂർത്തിയായി',
        or: 'ଡେଲିଭରୀ ସମ୍ପୂର୍ଣ୍ଣ ହୋଇଛି',
      },
      price_updated: {
        en: 'Price Updated',
        hi: 'मूल्य अपडेट किया गया',
        pa: 'ਕੀਮਤ ਅੱਪਡੇਟ ਕੀਤੀ ਗਈ',
        mr: 'किंमत अपडेट केली',
        ta: 'விலை புதுப்பிக்கப்பட்டது',
        te: 'ధర నవీకరించబడింది',
        bn: 'মূল্য আপডেট করা হয়েছে',
        gu: 'કિંમત અપડેટ કરવામાં આવી',
        kn: 'ಬೆಲೆ ನವೀಕರಿಸಲಾಗಿದೆ',
        ml: 'വില അപ്ഡേറ്റ് ചെയ്തു',
        or: 'ମୂଲ୍ୟ ଅପଡେଟ୍ ହୋଇଛି',
      },
      new_message: {
        en: 'New Message',
        hi: 'नया संदेश',
        pa: 'ਨਵਾਂ ਸੁਨੇਹਾ',
        mr: 'नवीन संदेश',
        ta: 'புதிய செய்தி',
        te: 'కొత్త సందేశం',
        bn: 'নতুন বার্তা',
        gu: 'નવો સંદેશ',
        kn: 'ಹೊಸ ಸಂದೇಶ',
        ml: 'പുതിയ സന്ദേശം',
        or: 'ନୂତନ ସନ୍ଦେଶ',
      },
    };

    return titles[type]?.[language] || titles[type]?.['en'] || 'Notification';
  }

  /**
   * Get all notifications for a user
   */
  async getUserNotifications(userId: string): Promise<Notification[]> {
    const dbManager = getDbManager();
    return await dbManager.getUserNotifications(userId);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const dbManager = getDbManager();
    await dbManager.updateNotification(notificationId, { isRead: true });
  }
}

export const notificationService = new NotificationService();
