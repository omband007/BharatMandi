import type { OTPSession } from '../../features/profile/types/profile.types';
import type { Listing } from '../../features/marketplace/marketplace.types';
import type { Transaction, EscrowAccount } from '../../features/transactions/transaction.types';
import type { Notification, NotificationTemplate, NotificationType, TranslationFeedback, TranslationFeedbackStats } from '../../features/notifications/notification.types';
import type { PostgreSQLAdapter } from './pg-adapter';
import type { ConnectionMonitor } from './connection-monitor';

// Logging control - set to false to reduce console output
const VERBOSE_LOGGING = process.env.DB_VERBOSE_LOGGING === 'true';

// Legacy User type for backward compatibility with old database operations
// NOTE: New code should use UserProfile from profile.types.ts
export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  userType: 'farmer' | 'buyer' | 'both';
  location: any;
  bankAccount?: any;
  languagePreference?: string; // Added for i18n support
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * DatabaseAdapter Interface
 * 
 * Defines the contract that database adapters must implement.
 * 
 * Requirements: 1.2, 1.4
 */
export interface DatabaseAdapter {
  // ============================================================================
  // User Operations
  // ============================================================================
  
  createUser(user: User, pinHash?: string): Promise<User>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
  updateUser(userId: string, updates: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // ============================================================================
  // PIN Operations
  // ============================================================================
  
  getUserPinHash(phoneNumber: string): Promise<string | undefined>;
  updateUserPin(phoneNumber: string, pinHash: string): Promise<void>;
  
  // ============================================================================
  // Account Security Operations
  // ============================================================================
  
  getFailedAttempts(phoneNumber: string): Promise<{ failed_attempts: number; locked_until?: string } | undefined>;
  incrementFailedAttempts(phoneNumber: string): Promise<void>;
  resetFailedAttempts(phoneNumber: string): Promise<void>;
  lockAccount(phoneNumber: string, lockUntil: Date): Promise<void>;
  
  // ============================================================================
  // OTP Operations
  // ============================================================================
  
  createOTPSession(session: OTPSession): Promise<void>;
  getOTPSession(phoneNumber: string): Promise<OTPSession | undefined>;
  updateOTPAttempts(phoneNumber: string, attempts: number): Promise<void>;
  deleteOTPSession(phoneNumber: string): Promise<void>;
  
  // ============================================================================
  // Listing Operations
  // ============================================================================
  
  createListing(listing: Listing): Promise<Listing>;
  getListing(id: string): Promise<Listing | undefined>;
  getActiveListings(): Promise<Listing[]>;
  updateListing(id: string, updates: Partial<Listing>): Promise<Listing | undefined>;
  
  // ============================================================================
  // Transaction Operations
  // ============================================================================
  
  createTransaction(transaction: Transaction): Promise<Transaction>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined>;
  
  // ============================================================================
  // Escrow Operations
  // ============================================================================
  
  createEscrow(escrow: EscrowAccount): Promise<EscrowAccount>;
  getEscrow(id: string): Promise<EscrowAccount | undefined>;
  getEscrowByTransaction(transactionId: string): Promise<EscrowAccount | undefined>;
  updateEscrow(id: string, updates: Partial<EscrowAccount>): Promise<EscrowAccount | undefined>;

  // ============================================================================
  // Notification Operations
  // ============================================================================

  createNotification(notification: Notification): Promise<Notification>;
  getNotification(id: string): Promise<Notification | undefined>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  updateNotification(id: string, updates: Partial<Notification>): Promise<Notification | undefined>;
  getNotificationTemplate(type: NotificationType, language: string): Promise<NotificationTemplate | undefined>;

  // ============================================================================
  // Translation Feedback Operations
  // ============================================================================

  createTranslationFeedback(feedback: Omit<TranslationFeedback, 'id' | 'createdAt' | 'updatedAt'>): Promise<TranslationFeedback>;
  getTranslationFeedback(id: string): Promise<TranslationFeedback | undefined>;
  getTranslationFeedbackStats(targetLanguage?: string): Promise<TranslationFeedbackStats>;
  updateTranslationFeedback(id: string, updates: Partial<TranslationFeedback>): Promise<TranslationFeedback | undefined>;
}

/**
 * DatabaseManager Class
 * 
 * Main database manager that provides PostgreSQL database operations.
 * 
 * Requirements: 1.2, 1.4, 5.1, 5.2
 */
export class DatabaseManager {
  private pgAdapter: PostgreSQLAdapter;
  private connectionMonitor: ConnectionMonitor;
  private instanceId: string;

  constructor() {
    this.instanceId = Math.random().toString(36).substring(7);
    
    if (VERBOSE_LOGGING) {
      console.log(`[DatabaseManager] New instance created: ${this.instanceId}`);
    }
    
    // Import adapters dynamically to avoid circular dependencies
    const { PostgreSQLAdapter } = require('./pg-adapter');
    const { ConnectionMonitor } = require('./connection-monitor');

    // Initialize PostgreSQL adapter
    this.pgAdapter = new PostgreSQLAdapter();
    
    // Initialize connection monitor with PostgreSQL adapter
    this.connectionMonitor = new ConnectionMonitor(this.pgAdapter);
  }

  /**
   * Start the database manager
   * Begins connection monitoring
   */
  async start(): Promise<void> {
    if (VERBOSE_LOGGING) {
      console.log(`[DatabaseManager:${this.instanceId}] Starting connection monitor`);
    }
    await this.connectionMonitor.start();
  }

  /**
   * Stop the database manager
   * Stops connection monitoring
   */
  stop(): void {
    if (VERBOSE_LOGGING) {
      console.log('[DatabaseManager] Stopping connection monitor');
    }
    this.connectionMonitor.stop();
  }

  /**
   * Get the PostgreSQL adapter instance
   * @returns PostgreSQL adapter
   */
  getPostgreSQLAdapter(): PostgreSQLAdapter {
    return this.pgAdapter;
  }

  /**
   * Get the connection monitor instance
   * @returns Connection monitor
   */
  getConnectionMonitor(): ConnectionMonitor {
    return this.connectionMonitor;
  }

  /**
   * Check if PostgreSQL is currently connected
   * @returns true if connected, false otherwise
   */
  isPostgreSQLConnected(): boolean {
    return this.connectionMonitor.isConnected();
  }

  /**
   * Get health status for monitoring
   * @returns Health status object with connectivity information
   */
  getHealthStatus(): {
    postgresql: {
      connected: boolean;
      lastCheck: Date | null;
    };
  } {
    return {
      postgresql: this.connectionMonitor.getHealthStatus()
    };
  }

  // ============================================================================
  // User Operations
  // ============================================================================

  async createUser(user: User, pinHash?: string): Promise<User> {
    return await this.pgAdapter.createUser(user, pinHash);
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | undefined> {
    return await this.pgAdapter.updateUser(userId, updates);
  }

  async updateUserPin(phoneNumber: string, pinHash: string): Promise<void> {
    await this.pgAdapter.updateUserPin(phoneNumber, pinHash);
  }

  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    return await this.pgAdapter.getUserByPhone(phoneNumber);
  }

  async getUserById(id: string): Promise<User | undefined> {
    return await this.pgAdapter.getUserById(id);
  }

  // ============================================================================
  // Listing Operations
  // ============================================================================

  async createListing(listing: Listing): Promise<Listing> {
    return await this.pgAdapter.createListing(listing);
  }

  async getListing(id: string): Promise<Listing | undefined> {
    return await this.pgAdapter.getListing(id);
  }

  async getActiveListings(): Promise<Listing[]> {
    return await this.pgAdapter.getActiveListings();
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing | undefined> {
    return await this.pgAdapter.updateListing(id, updates);
  }

  // ============================================================================
  // Transaction Operations
  // ============================================================================

  async createTransaction(transaction: Transaction): Promise<Transaction> {
    return await this.pgAdapter.createTransaction(transaction);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return await this.pgAdapter.getTransaction(id);
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    return await this.pgAdapter.updateTransaction(id, updates);
  }

  // ============================================================================
  // Escrow Operations
  // ============================================================================

  async createEscrow(escrow: EscrowAccount): Promise<EscrowAccount> {
    return await this.pgAdapter.createEscrow(escrow);
  }

  async getEscrow(id: string): Promise<EscrowAccount | undefined> {
    return await this.pgAdapter.getEscrow(id);
  }

  async getEscrowByTransaction(transactionId: string): Promise<EscrowAccount | undefined> {
    return await this.pgAdapter.getEscrowByTransaction(transactionId);
  }

  async updateEscrow(id: string, updates: Partial<EscrowAccount>): Promise<EscrowAccount | undefined> {
    return await this.pgAdapter.updateEscrow(id, updates);
  }

  // ============================================================================
  // Notification Operations
  // ============================================================================

  async createNotification(notification: Notification): Promise<Notification> {
    return await this.pgAdapter.createNotification(notification);
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    return await this.pgAdapter.getNotification(id);
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await this.pgAdapter.getUserNotifications(userId);
  }

  async updateNotification(id: string, updates: Partial<Notification>): Promise<Notification | undefined> {
    return await this.pgAdapter.updateNotification(id, updates);
  }

  async getNotificationTemplate(type: NotificationType, language: string): Promise<NotificationTemplate | undefined> {
    return await this.pgAdapter.getNotificationTemplate(type, language);
  }

  // ============================================================================
  // Translation Feedback Operations
  // ============================================================================

  async createTranslationFeedback(feedback: Omit<TranslationFeedback, 'id' | 'createdAt' | 'updatedAt'>): Promise<TranslationFeedback> {
    return await this.pgAdapter.createTranslationFeedback(feedback);
  }

  async getTranslationFeedback(id: string): Promise<TranslationFeedback | undefined> {
    return await this.pgAdapter.getTranslationFeedback(id);
  }

  async getTranslationFeedbackStats(targetLanguage?: string): Promise<TranslationFeedbackStats> {
    return await this.pgAdapter.getTranslationFeedbackStats(targetLanguage);
  }

  async updateTranslationFeedback(id: string, updates: Partial<TranslationFeedback>): Promise<TranslationFeedback | undefined> {
    return await this.pgAdapter.updateTranslationFeedback(id, updates);
  }

  // ============================================================================
  // Low-Level SQL Operations
  // ============================================================================

  async run(sql: string, params?: any[]): Promise<void> {
    const pgAdapter = this.pgAdapter as any;
    if (pgAdapter.run) {
      await pgAdapter.run(sql, params);
    } else {
      await pgAdapter.pool.query(sql, params);
    }
  }

  async get(sql: string, params?: any[]): Promise<any> {
    const pgAdapter = this.pgAdapter as any;
    if (pgAdapter.get) {
      return await pgAdapter.get(sql, params);
    } else {
      const result = await pgAdapter.pool.query(sql, params);
      return result.rows[0];
    }
  }

  async all(sql: string, params?: any[]): Promise<any[]> {
    const pgAdapter = this.pgAdapter as any;
    if (pgAdapter.all) {
      return await pgAdapter.all(sql, params);
    } else {
      const result = await pgAdapter.pool.query(sql, params);
      return result.rows;
    }
  }
}
