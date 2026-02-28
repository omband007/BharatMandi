export type NotificationType = 
  | 'listing_created'
  | 'listing_sold'
  | 'order_confirmed'
  | 'payment_received'
  | 'payment_released'
  | 'delivery_scheduled'
  | 'delivery_completed'
  | 'price_updated'
  | 'new_message';

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  language: string;
  template: string; // Template with {{variable}} placeholders
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>; // Additional data for the notification
  isRead: boolean;
  createdAt: Date;
}

export interface NotificationVariables {
  [key: string]: string | number;
}

// ============================================================================
// TRANSLATION FEEDBACK
// ============================================================================

export type FeedbackType = 'incorrect' | 'poor_quality' | 'suggestion' | 'offensive';
export type FeedbackStatus = 'pending' | 'reviewed' | 'resolved' | 'rejected';

export interface TranslationFeedback {
  id: string;
  userId: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  suggestedTranslation?: string;
  feedbackType: FeedbackType;
  context?: string;
  status: FeedbackStatus;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

export interface TranslationFeedbackStats {
  totalFeedback: number;
  byLanguage: Record<string, number>;
  byType: Record<FeedbackType, number>;
  byStatus: Record<FeedbackStatus, number>;
  averageResolutionTime?: number; // in hours
}
