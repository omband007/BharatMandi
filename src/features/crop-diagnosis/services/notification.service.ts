/**
 * Notification Service
 * 
 * Multi-channel notification system for expert escalation and farmer updates.
 * Supports SMS, email, and push notifications.
 * 
 * Requirements:
 * - 10.2: Notify available experts when review request created
 * - 10.4: Notify farmer when expert completes review
 */

import mongoose from 'mongoose';

// ============================================================================
// TYPES
// ============================================================================

export type NotificationChannel = 'sms' | 'email' | 'push';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'delivered';
export type NotificationType = 'expert_review_request' | 'expert_review_completed' | 'expert_escalation';

export interface NotificationRecipient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  pushToken?: string;
  preferredChannels?: NotificationChannel[];
}

export interface NotificationPayload {
  type: NotificationType;
  recipientId: string;
  channels: NotificationChannel[];
  data: {
    reviewRequestId?: string;
    diagnosisId?: string;
    cropType?: string;
    confidence?: number;
    expertName?: string;
    farmerName?: string;
    imageUrl?: string;
  };
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface NotificationResult {
  notificationId: string;
  recipientId: string;
  channels: NotificationChannel[];
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
}

export interface ExpertAvailability {
  expertId: string;
  name: string;
  email?: string;
  phone?: string;
  pushToken?: string;
  isAvailable: boolean;
  currentLoad: number; // Number of pending reviews
  maxLoad: number;
  specializations?: string[]; // e.g., ['fungal', 'pest', 'rice', 'wheat']
}

// ============================================================================
// NOTIFICATION SCHEMA
// ============================================================================

const NotificationLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['expert_review_request', 'expert_review_completed', 'expert_escalation'],
    required: true
  },
  recipientId: { type: String, required: true, index: true },
  channels: [{
    type: String,
    enum: ['sms', 'email', 'push']
  }],
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'delivered'],
    default: 'pending',
    index: true
  },
  data: {
    reviewRequestId: String,
    diagnosisId: String,
    cropType: String,
    confidence: Number,
    expertName: String,
    farmerName: String,
    imageUrl: String
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  sentAt: Date,
  deliveredAt: Date,
  failureReason: String,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true,
  collection: 'notification_logs'
});

// Indexes for efficient queries
NotificationLogSchema.index({ recipientId: 1, createdAt: -1 });
NotificationLogSchema.index({ status: 1, createdAt: 1 });
NotificationLogSchema.index({ type: 1, status: 1 });

// ============================================================================
// NOTIFICATION SERVICE
// ============================================================================

export class NotificationService {
  private notificationLogModel: mongoose.Model<any>;
  private expertPool: Map<string, ExpertAvailability>;

  constructor() {
    // Create or retrieve the model
    this.notificationLogModel = mongoose.models.NotificationLog || 
      mongoose.model('NotificationLog', NotificationLogSchema);

    // Initialize expert pool (in production, this would be loaded from database)
    this.expertPool = new Map();
    this.initializeExpertPool();
  }

  /**
   * Initialize expert pool with mock data
   * In production, this would load from a database or external service
   */
  private initializeExpertPool(): void {
    // Mock expert data for MVP
    const mockExperts: ExpertAvailability[] = [
      {
        expertId: 'expert-001',
        name: 'Dr. Rajesh Kumar',
        email: 'rajesh.kumar@example.com',
        phone: '+919876543210',
        isAvailable: true,
        currentLoad: 0,
        maxLoad: 10,
        specializations: ['fungal', 'bacterial', 'rice', 'wheat']
      },
      {
        expertId: 'expert-002',
        name: 'Dr. Priya Sharma',
        email: 'priya.sharma@example.com',
        phone: '+919876543211',
        isAvailable: true,
        currentLoad: 0,
        maxLoad: 10,
        specializations: ['pest', 'viral', 'cotton', 'tomato']
      },
      {
        expertId: 'expert-003',
        name: 'Dr. Amit Patel',
        email: 'amit.patel@example.com',
        phone: '+919876543212',
        isAvailable: true,
        currentLoad: 0,
        maxLoad: 10,
        specializations: ['nutrient_deficiency', 'soil_health', 'vegetables']
      }
    ];

    mockExperts.forEach(expert => {
      this.expertPool.set(expert.expertId, expert);
    });
  }

  /**
   * Send notification to expert when review request is created
   * 
   * Requirements:
   * - 10.2: Notify available experts when review request created
   * 
   * @param reviewRequestId - Review request ID
   * @param diagnosisData - Diagnosis information for context
   * @returns Array of notification results
   */
  async notifyExpertReviewRequest(
    reviewRequestId: string,
    diagnosisData: {
      diagnosisId: string;
      cropType: string;
      confidence: number;
      imageUrl: string;
      diseaseType?: string;
    }
  ): Promise<NotificationResult[]> {
    try {
      // Select available experts using round-robin or availability-based logic
      const selectedExperts = this.selectAvailableExperts(diagnosisData.diseaseType);

      if (selectedExperts.length === 0) {
        throw new Error('No available experts found');
      }

      // Send notifications to all selected experts
      const results: NotificationResult[] = [];

      for (const expert of selectedExperts) {
        const payload: NotificationPayload = {
          type: 'expert_review_request',
          recipientId: expert.expertId,
          channels: this.determineChannels(expert),
          data: {
            reviewRequestId,
            diagnosisId: diagnosisData.diagnosisId,
            cropType: diagnosisData.cropType,
            confidence: diagnosisData.confidence,
            imageUrl: diagnosisData.imageUrl
          },
          priority: diagnosisData.confidence < 60 ? 'urgent' : 'high'
        };

        const result = await this.sendNotification(payload);
        results.push(result);

        // Update expert load
        expert.currentLoad++;
      }

      return results;
    } catch (error) {
      throw new Error(
        `Failed to notify experts: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Send notification to farmer when expert completes review
   * 
   * Requirements:
   * - 10.4: Notify farmer when expert completes review
   * 
   * @param farmerId - Farmer user ID
   * @param reviewData - Review completion information
   * @returns Notification result
   */
  async notifyFarmerReviewCompleted(
    farmerId: string,
    reviewData: {
      diagnosisId: string;
      expertName: string;
      cropType: string;
    }
  ): Promise<NotificationResult> {
    try {
      const payload: NotificationPayload = {
        type: 'expert_review_completed',
        recipientId: farmerId,
        channels: ['sms', 'push'], // Farmer gets SMS + push notification
        data: {
          diagnosisId: reviewData.diagnosisId,
          expertName: reviewData.expertName,
          cropType: reviewData.cropType
        },
        priority: 'high'
      };

      return await this.sendNotification(payload);
    } catch (error) {
      throw new Error(
        `Failed to notify farmer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Send notification through specified channels
   * 
   * @param payload - Notification payload
   * @returns Notification result
   */
  private async sendNotification(payload: NotificationPayload): Promise<NotificationResult> {
    try {
      // Create notification log entry
      const notificationLog = new this.notificationLogModel({
        type: payload.type,
        recipientId: payload.recipientId,
        channels: payload.channels,
        status: 'pending',
        data: payload.data,
        priority: payload.priority || 'medium'
      });

      const saved = await notificationLog.save();

      // Send through each channel (MVP: placeholder implementations)
      const channelResults = await Promise.allSettled(
        payload.channels.map(channel => this.sendThroughChannel(channel, payload))
      );

      // Check if at least one channel succeeded
      const hasSuccess = channelResults.some(result => result.status === 'fulfilled');

      // Update notification log
      const status: NotificationStatus = hasSuccess ? 'sent' : 'failed';
      const failureReason = hasSuccess 
        ? undefined 
        : channelResults
            .filter(r => r.status === 'rejected')
            .map(r => (r as PromiseRejectedResult).reason)
            .join('; ');

      await this.notificationLogModel.findByIdAndUpdate(saved._id, {
        $set: {
          status,
          sentAt: hasSuccess ? new Date() : undefined,
          failureReason
        }
      });

      return {
        notificationId: saved._id.toString(),
        recipientId: payload.recipientId,
        channels: payload.channels,
        status,
        sentAt: hasSuccess ? new Date() : undefined,
        failureReason
      };
    } catch (error) {
      throw new Error(
        `Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Send notification through a specific channel
   * 
   * MVP Implementation: Placeholder for actual SMS/Email/Push providers
   * In production, integrate with:
   * - SMS: AWS SNS, Twilio, or AWS Pinpoint
   * - Email: AWS SES, SendGrid
   * - Push: Firebase Cloud Messaging, AWS SNS Mobile Push
   * 
   * @param channel - Notification channel
   * @param payload - Notification payload
   */
  private async sendThroughChannel(
    channel: NotificationChannel,
    payload: NotificationPayload
  ): Promise<void> {
    // MVP: Log notification instead of sending
    console.log(`[${channel.toUpperCase()}] Notification:`, {
      type: payload.type,
      recipient: payload.recipientId,
      data: payload.data,
      priority: payload.priority
    });

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));

    // In production, implement actual sending:
    switch (channel) {
      case 'sms':
        // await this.sendSMS(payload);
        break;
      case 'email':
        // await this.sendEmail(payload);
        break;
      case 'push':
        // await this.sendPushNotification(payload);
        break;
    }
  }

  /**
   * Select available experts using round-robin or availability-based logic
   * 
   * @param diseaseType - Optional disease type for specialization matching
   * @returns Array of selected experts
   */
  private selectAvailableExperts(diseaseType?: string): ExpertAvailability[] {
    const availableExperts = Array.from(this.expertPool.values())
      .filter(expert => expert.isAvailable && expert.currentLoad < expert.maxLoad);

    if (availableExperts.length === 0) {
      return [];
    }

    // If disease type specified, prefer experts with matching specialization
    if (diseaseType) {
      const specialized = availableExperts.filter(expert =>
        expert.specializations?.includes(diseaseType)
      );

      if (specialized.length > 0) {
        // Return expert with lowest current load
        return [specialized.sort((a, b) => a.currentLoad - b.currentLoad)[0]];
      }
    }

    // Round-robin: select expert with lowest current load
    const sorted = availableExperts.sort((a, b) => a.currentLoad - b.currentLoad);
    return [sorted[0]];
  }

  /**
   * Determine notification channels based on expert preferences
   * 
   * @param expert - Expert availability data
   * @returns Array of notification channels
   */
  private determineChannels(expert: ExpertAvailability): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    // Always use email for experts
    if (expert.email) {
      channels.push('email');
    }

    // Add push notification if token available
    if (expert.pushToken) {
      channels.push('push');
    }

    // Add SMS for urgent cases or if no other channels available
    if (expert.phone && channels.length === 0) {
      channels.push('sms');
    }

    // Default to email if no channels determined
    return channels.length > 0 ? channels : ['email'];
  }

  /**
   * Get notification delivery status
   * 
   * @param notificationId - Notification ID
   * @returns Notification result or null if not found
   */
  async getNotificationStatus(notificationId: string): Promise<NotificationResult | null> {
    try {
      const notification: any = await this.notificationLogModel
        .findById(notificationId)
        .lean()
        .exec();

      if (!notification) {
        return null;
      }

      return {
        notificationId: notification._id.toString(),
        recipientId: notification.recipientId,
        channels: notification.channels,
        status: notification.status,
        sentAt: notification.sentAt,
        deliveredAt: notification.deliveredAt,
        failureReason: notification.failureReason
      };
    } catch (error) {
      throw new Error(
        `Failed to get notification status: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get notification history for a recipient
   * 
   * @param recipientId - Recipient user ID
   * @param limit - Maximum number of notifications to return
   * @returns Array of notification results
   */
  async getNotificationHistory(
    recipientId: string,
    limit: number = 50
  ): Promise<NotificationResult[]> {
    try {
      const notifications = await this.notificationLogModel
        .find({ recipientId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();

      return notifications.map((n: any) => ({
        notificationId: n._id.toString(),
        recipientId: n.recipientId,
        channels: n.channels,
        status: n.status,
        sentAt: n.sentAt,
        deliveredAt: n.deliveredAt,
        failureReason: n.failureReason
      }));
    } catch (error) {
      throw new Error(
        `Failed to get notification history: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Update expert availability
   * 
   * @param expertId - Expert user ID
   * @param isAvailable - Availability status
   */
  updateExpertAvailability(expertId: string, isAvailable: boolean): void {
    const expert = this.expertPool.get(expertId);
    if (expert) {
      expert.isAvailable = isAvailable;
    }
  }

  /**
   * Get available experts
   * 
   * @returns Array of available experts
   */
  getAvailableExperts(): ExpertAvailability[] {
    return Array.from(this.expertPool.values())
      .filter(expert => expert.isAvailable && expert.currentLoad < expert.maxLoad);
  }

  /**
   * Reset expert load (for testing or periodic reset)
   * 
   * @param expertId - Expert user ID
   */
  resetExpertLoad(expertId: string): void {
    const expert = this.expertPool.get(expertId);
    if (expert) {
      expert.currentLoad = 0;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
