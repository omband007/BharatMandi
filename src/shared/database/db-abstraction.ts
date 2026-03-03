import type { OTPSession } from '../../features/profile/types/profile.types';
import type { Listing } from '../../features/marketplace/marketplace.types';
import type { Transaction, EscrowAccount } from '../../features/transactions/transaction.types';
import type { Notification, NotificationTemplate, NotificationType, TranslationFeedback, TranslationFeedbackStats } from '../../features/notifications/notification.types';
import type { PostgreSQLAdapter } from './pg-adapter';
import type { SQLiteAdapter } from './sqlite-adapter';
import type { ConnectionMonitor } from './connection-monitor';
import type { SyncEngine } from './sync-engine';

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
 * Defines the contract that both PostgreSQLAdapter and SQLiteAdapter must implement.
 * This ensures consistent method signatures across both database implementations,
 * enabling seamless switching between PostgreSQL (primary) and SQLite (offline cache).
 * 
 * Requirements: 1.2, 1.4
 */
export interface DatabaseAdapter {
  // ============================================================================
  // User Operations
  // ============================================================================
  
  /**
   * Create a new user in the database
   * @param user - User object to create
   * @param pinHash - Optional hashed PIN for the user
   * @returns Created user object
   */
  createUser(user: User, pinHash?: string): Promise<User>;
  
  /**
   * Get user by ID
   * @param id - User ID
   * @returns User object or undefined if not found
   */
  getUserById(id: string): Promise<User | undefined>;
  
  /**
   * Get user by phone number
   * @param phoneNumber - User's phone number
   * @returns User object or undefined if not found
   */
  getUserByPhone(phoneNumber: string): Promise<User | undefined>;
  
  /**
   * Update user information
   * @param userId - User ID to update
   * @param updates - Partial user object with fields to update
   * @returns Updated user object or undefined if not found
   */
  updateUser(userId: string, updates: Partial<User>): Promise<User | undefined>;
  
  /**
   * Get all users
   * @returns Array of all users
   */
  getAllUsers(): Promise<User[]>;
  
  // ============================================================================
  // PIN Operations
  // ============================================================================
  
  /**
   * Get user's PIN hash
   * @param phoneNumber - User's phone number
   * @returns PIN hash or undefined if not found
   */
  getUserPinHash(phoneNumber: string): Promise<string | undefined>;
  
  /**
   * Update user's PIN
   * @param phoneNumber - User's phone number
   * @param pinHash - New hashed PIN
   */
  updateUserPin(phoneNumber: string, pinHash: string): Promise<void>;
  
  // ============================================================================
  // Account Security Operations
  // ============================================================================
  
  /**
   * Get failed login attempts for a user
   * @param phoneNumber - User's phone number
   * @returns Object with failed_attempts and locked_until or undefined
   */
  getFailedAttempts(phoneNumber: string): Promise<{ failed_attempts: number; locked_until?: string } | undefined>;
  
  /**
   * Increment failed login attempts
   * @param phoneNumber - User's phone number
   */
  incrementFailedAttempts(phoneNumber: string): Promise<void>;
  
  /**
   * Reset failed login attempts
   * @param phoneNumber - User's phone number
   */
  resetFailedAttempts(phoneNumber: string): Promise<void>;
  
  /**
   * Lock user account until specified time
   * @param phoneNumber - User's phone number
   * @param lockUntil - Date until which account should be locked
   */
  lockAccount(phoneNumber: string, lockUntil: Date): Promise<void>;
  
  // ============================================================================
  // OTP Operations
  // ============================================================================
  
  /**
   * Create OTP session
   * @param session - OTP session object
   */
  createOTPSession(session: OTPSession): Promise<void>;
  
  /**
   * Get OTP session for a phone number
   * @param phoneNumber - User's phone number
   * @returns OTP session or undefined if not found
   */
  getOTPSession(phoneNumber: string): Promise<OTPSession | undefined>;
  
  /**
   * Update OTP attempts
   * @param phoneNumber - User's phone number
   * @param attempts - New attempts count
   */
  updateOTPAttempts(phoneNumber: string, attempts: number): Promise<void>;
  
  /**
   * Delete OTP session
   * @param phoneNumber - User's phone number
   */
  deleteOTPSession(phoneNumber: string): Promise<void>;
  
  // ============================================================================
  // Listing Operations
  // ============================================================================
  
  /**
   * Create a new listing
   * @param listing - Listing object to create
   * @returns Created listing object
   */
  createListing(listing: Listing): Promise<Listing>;
  
  /**
   * Get listing by ID
   * @param id - Listing ID
   * @returns Listing object or undefined if not found
   */
  getListing(id: string): Promise<Listing | undefined>;
  
  /**
   * Get all active listings
   * @returns Array of active listings
   */
  getActiveListings(): Promise<Listing[]>;
  
  /**
   * Update listing information
   * @param id - Listing ID to update
   * @param updates - Partial listing object with fields to update
   * @returns Updated listing object or undefined if not found
   */
  updateListing(id: string, updates: Partial<Listing>): Promise<Listing | undefined>;
  
  // ============================================================================
  // Transaction Operations
  // ============================================================================
  
  /**
   * Create a new transaction
   * @param transaction - Transaction object to create
   * @returns Created transaction object
   */
  createTransaction(transaction: Transaction): Promise<Transaction>;
  
  /**
   * Get transaction by ID
   * @param id - Transaction ID
   * @returns Transaction object or undefined if not found
   */
  getTransaction(id: string): Promise<Transaction | undefined>;
  
  /**
   * Update transaction information
   * @param id - Transaction ID to update
   * @param updates - Partial transaction object with fields to update
   * @returns Updated transaction object or undefined if not found
   */
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined>;
  
  // ============================================================================
  // Escrow Operations
  // ============================================================================
  
  /**
   * Create a new escrow account
   * @param escrow - Escrow account object to create
   * @returns Created escrow account object
   */
  createEscrow(escrow: EscrowAccount): Promise<EscrowAccount>;
  
  /**
   * Get escrow account by ID
   * @param id - Escrow account ID
   * @returns Escrow account object or undefined if not found
   */
  getEscrow(id: string): Promise<EscrowAccount | undefined>;
  
  /**
   * Get escrow account by transaction ID
   * @param transactionId - Transaction ID
   * @returns Escrow account object or undefined if not found
   */
  getEscrowByTransaction(transactionId: string): Promise<EscrowAccount | undefined>;
  
  /**
   * Update escrow account information
   * @param id - Escrow account ID to update
   * @param updates - Partial escrow account object with fields to update
   * @returns Updated escrow account object or undefined if not found
   */
  updateEscrow(id: string, updates: Partial<EscrowAccount>): Promise<EscrowAccount | undefined>;

  // ============================================================================
  // Notification Operations
  // ============================================================================

  /**
   * Create a new notification
   * @param notification - Notification object to create
   * @returns Created notification object
   */
  createNotification(notification: Notification): Promise<Notification>;

  /**
   * Get notification by ID
   * @param id - Notification ID
   * @returns Notification object or undefined if not found
   */
  getNotification(id: string): Promise<Notification | undefined>;

  /**
   * Get all notifications for a user
   * @param userId - User ID
   * @returns Array of notifications
   */
  getUserNotifications(userId: string): Promise<Notification[]>;

  /**
   * Update notification information
   * @param id - Notification ID to update
   * @param updates - Partial notification object with fields to update
   * @returns Updated notification object or undefined if not found
   */
  updateNotification(id: string, updates: Partial<Notification>): Promise<Notification | undefined>;

  /**
   * Get notification template by type and language
   * @param type - Notification type
   * @param language - Language code
   * @returns Notification template or undefined if not found
   */
  getNotificationTemplate(type: NotificationType, language: string): Promise<NotificationTemplate | undefined>;

  // ============================================================================
  // Translation Feedback Operations
  // ============================================================================

  /**
   * Create translation feedback
   * @param feedback - Translation feedback object to create
   * @returns Created translation feedback object
   */
  createTranslationFeedback(feedback: Omit<TranslationFeedback, 'id' | 'createdAt' | 'updatedAt'>): Promise<TranslationFeedback>;

  /**
   * Get translation feedback by ID
   * @param id - Feedback ID
   * @returns Translation feedback object or undefined if not found
   */
  getTranslationFeedback(id: string): Promise<TranslationFeedback | undefined>;

  /**
   * Get translation feedback statistics
   * @param targetLanguage - Optional language filter
   * @returns Translation feedback statistics
   */
  getTranslationFeedbackStats(targetLanguage?: string): Promise<TranslationFeedbackStats>;

  /**
   * Update translation feedback
   * @param id - Feedback ID to update
   * @param updates - Partial feedback object with fields to update
   * @returns Updated feedback object or undefined if not found
   */
  updateTranslationFeedback(id: string, updates: Partial<TranslationFeedback>): Promise<TranslationFeedback | undefined>;
}

/**
 * DatabaseManager Class
 * 
 * Main database manager that coordinates PostgreSQL and SQLite adapters,
 * connection monitoring, and synchronization between databases.
 * 
 * This class provides the unified interface for all database operations,
 * handling routing, fallback logic, and sync queue management transparently.
 * 
 * Requirements: 1.2, 1.4, 5.1, 5.2
 */
export class DatabaseManager {
  private pgAdapter: PostgreSQLAdapter;
  private sqliteAdapter: SQLiteAdapter;
  private syncEngine: SyncEngine;
  private connectionMonitor: ConnectionMonitor;
  private instanceId: string;

  constructor() {
    this.instanceId = Math.random().toString(36).substring(7);
    if (VERBOSE_LOGGING) {
      console.log(`[DatabaseManager] New instance created: ${this.instanceId}`);
    }
    
    // Import adapters dynamically to avoid circular dependencies
    const { PostgreSQLAdapter } = require('./pg-adapter');
    const { SQLiteAdapter } = require('./sqlite-adapter');
    const { ConnectionMonitor } = require('./connection-monitor');
    const { SyncEngine } = require('./sync-engine');

    // Initialize adapters
    this.pgAdapter = new PostgreSQLAdapter();
    this.sqliteAdapter = new SQLiteAdapter();
    
    // Initialize connection monitor with PostgreSQL adapter
    this.connectionMonitor = new ConnectionMonitor(this.pgAdapter);
    
    // Initialize sync engine with both adapters and connection monitor
    this.syncEngine = new SyncEngine(
      this.pgAdapter,
      this.sqliteAdapter,
      this.connectionMonitor
    );
  }

  /**
   * Start the database manager
   * Begins connection monitoring and sync engine operations
   */
  async start(): Promise<void> {
    if (VERBOSE_LOGGING) {
      console.log(`[DatabaseManager:${this.instanceId}] Starting connection monitor and sync engine`);
    }
    await this.connectionMonitor.start();
    this.syncEngine.start();
  }

  /**
   * Stop the database manager
   * Stops connection monitoring and sync engine operations
   */
  stop(): void {
    if (VERBOSE_LOGGING) {
      console.log('[DatabaseManager] Stopping connection monitor and sync engine');
    }
    this.connectionMonitor.stop();
    this.syncEngine.stop();
  }

  /**
   * Get the PostgreSQL adapter instance
   * @returns PostgreSQL adapter
   */
  getPostgreSQLAdapter(): PostgreSQLAdapter {
    return this.pgAdapter;
  }

  /**
   * Get the SQLite adapter instance
   * @returns SQLite adapter
   */
  getSQLiteAdapter(): SQLiteAdapter {
    return this.sqliteAdapter;
  }

  /**
   * Get the connection monitor instance
   * @returns Connection monitor
   */
  getConnectionMonitor(): ConnectionMonitor {
    return this.connectionMonitor;
  }

  /**
   * Get the sync engine instance
   * @returns Sync engine
   */
  getSyncEngine(): SyncEngine {
    return this.syncEngine;
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
   * @returns Health status object with connectivity and sync information
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
  // Write Operations - Always target PostgreSQL first
  // ============================================================================

  /**
   * Create a new user
   * Writes to PostgreSQL first, then propagates to SQLite asynchronously
   * If PostgreSQL is unavailable, queues the operation for later sync
   *
   * Requirements: 4.1, 4.2, 4.5
   *
   * @param user - User object to create
   * @param pinHash - Optional hashed PIN for the user
   * @returns Created user object
   * @throws Error if PostgreSQL is unavailable (operation is queued)
   */
  async createUser(user: User, pinHash?: string): Promise<User> {
    if (this.connectionMonitor.isConnected()) {
      try {
        // Write to PostgreSQL first
        const createdUser = await this.pgAdapter.createUser(user, pinHash);

        // Async propagation to SQLite (within 5 seconds)
        await this.syncEngine.propagateToSQLite('CREATE', 'user', createdUser.id, {
          ...createdUser,
          pinHash
        });

        return createdUser;
      } catch (error) {
        // Queue for later sync if PostgreSQL write fails
        await this.syncEngine.addToQueue('CREATE', 'user', user.id, {
          ...user,
          pinHash
        });
        throw error;
      }
    } else {
      // Offline mode - queue operation
      await this.syncEngine.addToQueue('CREATE', 'user', user.id, {
        ...user,
        pinHash
      });
      throw new Error('PostgreSQL unavailable. Operation queued for sync.');
    }
  }

  /**
   * Update user information
   * Writes to PostgreSQL first, then propagates to SQLite asynchronously
   * If PostgreSQL is unavailable, queues the operation for later sync
   *
   * Requirements: 4.2, 4.5
   *
   * @param userId - User ID to update
   * @param updates - Partial user object with fields to update
   * @returns Updated user object or undefined if not found
   * @throws Error if PostgreSQL is unavailable (operation is queued)
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        // Write to PostgreSQL first
        const updatedUser = await this.pgAdapter.updateUser(userId, updates);

        if (updatedUser) {
          // Async propagation to SQLite (within 5 seconds)
          await this.syncEngine.propagateToSQLite('UPDATE', 'user', userId, updatedUser);
        }

        return updatedUser;
      } catch (error) {
        // Queue for later sync if PostgreSQL write fails
        await this.syncEngine.addToQueue('UPDATE', 'user', userId, updates);
        throw error;
      }
    } else {
      // Offline mode - queue operation
      await this.syncEngine.addToQueue('UPDATE', 'user', userId, updates);
      throw new Error('PostgreSQL unavailable. Operation queued for sync.');
    }
  }

  /**
   * Update user PIN
   * Writes to PostgreSQL first, then propagates to SQLite asynchronously
   * If PostgreSQL is unavailable, queues the operation for later sync
   *
   * Requirements: 4.3, 4.5
   *
   * @param phoneNumber - User's phone number
   * @param pinHash - New hashed PIN
   * @throws Error if PostgreSQL is unavailable (operation is queued)
   */
  async updateUserPin(phoneNumber: string, pinHash: string): Promise<void> {
    if (this.connectionMonitor.isConnected()) {
      try {
        // Write to PostgreSQL first
        await this.pgAdapter.updateUserPin(phoneNumber, pinHash);

        // Async propagation to SQLite (within 5 seconds)
        await this.syncEngine.propagateToSQLite('UPDATE', 'user_pin', phoneNumber, {
          phoneNumber,
          pinHash
        });
      } catch (error) {
        // Queue for later sync if PostgreSQL write fails
        await this.syncEngine.addToQueue('UPDATE', 'user_pin', phoneNumber, {
          phoneNumber,
          pinHash
        });
        throw error;
      }
    } else {
      // Offline mode - queue operation
      await this.syncEngine.addToQueue('UPDATE', 'user_pin', phoneNumber, {
        phoneNumber,
        pinHash
      });
      throw new Error('PostgreSQL unavailable. Operation queued for sync.');
    }
  }

  // ============================================================================
  // Read Operations - PostgreSQL first, fallback to SQLite
  // ============================================================================

  /**
   * Get user by phone number
   * Reads from PostgreSQL first, falls back to SQLite if unavailable
   * Logs a warning when serving from SQLite (staleness indicator)
   *
   * Requirements: 5.1, 5.2, 5.3, 5.5
   *
   * @param phoneNumber - User's phone number
   * @returns User object or undefined if not found
   */
  async getUserByPhone(phoneNumber: string): Promise<User | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        // Try to read from PostgreSQL first
        return await this.pgAdapter.getUserByPhone(phoneNumber);
      } catch (error) {
        // PostgreSQL read failed, fall back to SQLite
        console.warn('[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.', error);
        return await this.sqliteAdapter.getUserByPhone(phoneNumber);
      }
    } else {
      // PostgreSQL unavailable, serve from SQLite
      console.warn('[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.');
      return await this.sqliteAdapter.getUserByPhone(phoneNumber);
    }
  }

  /**
   * Get user by ID
   * Reads from PostgreSQL first, falls back to SQLite if unavailable
   * Logs a warning when serving from SQLite (staleness indicator)
   *
   * Requirements: 5.1, 5.2, 5.3, 5.5
   *
   * @param id - User ID
   * @returns User object or undefined if not found
   */
  async getUserById(id: string): Promise<User | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        // Try to read from PostgreSQL first
        return await this.pgAdapter.getUserById(id);
      } catch (error) {
        // PostgreSQL read failed, fall back to SQLite
        console.warn('[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.', error);
        return await this.sqliteAdapter.getUserById(id);
      }
    } else {
      // PostgreSQL unavailable, serve from SQLite
      console.warn('[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.');
      return await this.sqliteAdapter.getUserById(id);
    }
  }

  // ============================================================================
  // Listing Operations
  // ============================================================================

  async createListing(listing: Listing): Promise<Listing> {
    const isConnected = this.connectionMonitor.isConnected();
    
    if (isConnected) {
      try {
        const created = await this.pgAdapter.createListing(listing);
        
        // Propagate to SQLite asynchronously (don't wait)
        this.syncEngine.propagateToSQLite('CREATE', 'listing', created.id, created).catch(err => {
          if (VERBOSE_LOGGING) {
            console.error(`[DatabaseManager:${this.instanceId}] Failed to propagate to SQLite:`, err);
          }
        });
        
        return created;
      } catch (error) {
        console.error(`[DatabaseManager:${this.instanceId}] PostgreSQL createListing failed:`, error);
        
        // PostgreSQL failed, create in SQLite and queue for sync
        const created = await this.sqliteAdapter.createListing(listing);
        await this.syncEngine.addToQueue('CREATE', 'listing', listing.id, listing);
        return created;
      }
    } else {
      // PostgreSQL unavailable, create in SQLite and queue for sync
      const created = await this.sqliteAdapter.createListing(listing);
      await this.syncEngine.addToQueue('CREATE', 'listing', listing.id, listing);
      return created;
    }
  }

  async getListing(id: string): Promise<Listing | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        return await this.pgAdapter.getListing(id);
      } catch (error) {
        console.warn('[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.', error);
        return await this.sqliteAdapter.getListing(id);
      }
    } else {
      console.warn('[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.');
      return await this.sqliteAdapter.getListing(id);
    }
  }

  async getActiveListings(): Promise<Listing[]> {
    if (this.connectionMonitor.isConnected()) {
      try {
        return await this.pgAdapter.getActiveListings();
      } catch (error) {
        console.warn('[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.', error);
        return await this.sqliteAdapter.getActiveListings();
      }
    } else {
      console.warn('[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.');
      return await this.sqliteAdapter.getActiveListings();
    }
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        const updated = await this.pgAdapter.updateListing(id, updates);
        if (updated) {
          await this.syncEngine.propagateToSQLite('UPDATE', 'listing', id, updated);
        }
        return updated;
      } catch (error) {
        // PostgreSQL failed, update in SQLite and queue for sync
        const updated = await this.sqliteAdapter.updateListing(id, updates);
        if (updated) {
          await this.syncEngine.addToQueue('UPDATE', 'listing', id, updated);
        }
        return updated;
      }
    } else {
      // PostgreSQL unavailable, update in SQLite and queue for sync
      const updated = await this.sqliteAdapter.updateListing(id, updates);
      if (updated) {
        await this.syncEngine.addToQueue('UPDATE', 'listing', id, updated);
      }
      return updated;
    }
  }

  // ============================================================================
  // Transaction Operations
  // ============================================================================

  async createTransaction(transaction: Transaction): Promise<Transaction> {
    if (this.connectionMonitor.isConnected()) {
      try {
        const created = await this.pgAdapter.createTransaction(transaction);
        await this.syncEngine.propagateToSQLite('CREATE', 'transaction', created.id, created);
        return created;
      } catch (error) {
        // PostgreSQL failed, create in SQLite and queue for sync
        const created = await this.sqliteAdapter.createTransaction(transaction);
        await this.syncEngine.addToQueue('CREATE', 'transaction', transaction.id, transaction);
        return created;
      }
    } else {
      // PostgreSQL unavailable, create in SQLite and queue for sync
      const created = await this.sqliteAdapter.createTransaction(transaction);
      await this.syncEngine.addToQueue('CREATE', 'transaction', transaction.id, transaction);
      return created;
    }
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        return await this.pgAdapter.getTransaction(id);
      } catch (error) {
        console.warn('[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.', error);
        return await this.sqliteAdapter.getTransaction(id);
      }
    } else {
      console.warn('[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.');
      return await this.sqliteAdapter.getTransaction(id);
    }
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        const updated = await this.pgAdapter.updateTransaction(id, updates);
        if (updated) {
          await this.syncEngine.propagateToSQLite('UPDATE', 'transaction', id, updated);
        }
        return updated;
      } catch (error) {
        // PostgreSQL failed, update in SQLite and queue for sync
        const updated = await this.sqliteAdapter.updateTransaction(id, updates);
        if (updated) {
          await this.syncEngine.addToQueue('UPDATE', 'transaction', id, updated);
        }
        return updated;
      }
    } else {
      // PostgreSQL unavailable, update in SQLite and queue for sync
      const updated = await this.sqliteAdapter.updateTransaction(id, updates);
      if (updated) {
        await this.syncEngine.addToQueue('UPDATE', 'transaction', id, updated);
      }
      return updated;
    }
  }

  // ============================================================================
  // Escrow Operations
  // ============================================================================

  async createEscrow(escrow: EscrowAccount): Promise<EscrowAccount> {
    if (this.connectionMonitor.isConnected()) {
      try {
        const created = await this.pgAdapter.createEscrow(escrow);
        await this.syncEngine.propagateToSQLite('CREATE', 'escrow', created.id, created);
        return created;
      } catch (error) {
        // PostgreSQL failed, create in SQLite and queue for sync
        const created = await this.sqliteAdapter.createEscrow(escrow);
        await this.syncEngine.addToQueue('CREATE', 'escrow', escrow.id, escrow);
        return created;
      }
    } else {
      // PostgreSQL unavailable, create in SQLite and queue for sync
      const created = await this.sqliteAdapter.createEscrow(escrow);
      await this.syncEngine.addToQueue('CREATE', 'escrow', escrow.id, escrow);
      return created;
    }
  }

  async getEscrow(id: string): Promise<EscrowAccount | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        return await this.pgAdapter.getEscrow(id);
      } catch (error) {
        console.warn('[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.', error);
        return await this.sqliteAdapter.getEscrow(id);
      }
    } else {
      console.warn('[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.');
      return await this.sqliteAdapter.getEscrow(id);
    }
  }

  async getEscrowByTransaction(transactionId: string): Promise<EscrowAccount | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        return await this.pgAdapter.getEscrowByTransaction(transactionId);
      } catch (error) {
        console.warn('[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.', error);
        return await this.sqliteAdapter.getEscrowByTransaction(transactionId);
      }
    } else {
      console.warn('[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.');
      return await this.sqliteAdapter.getEscrowByTransaction(transactionId);
    }
  }

  async updateEscrow(id: string, updates: Partial<EscrowAccount>): Promise<EscrowAccount | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        const updated = await this.pgAdapter.updateEscrow(id, updates);
        if (updated) {
          await this.syncEngine.propagateToSQLite('UPDATE', 'escrow', id, updated);
        }
        return updated;
      } catch (error) {
        // PostgreSQL failed, update in SQLite and queue for sync
        const updated = await this.sqliteAdapter.updateEscrow(id, updates);
        if (updated) {
          await this.syncEngine.addToQueue('UPDATE', 'escrow', id, updated);
        }
        return updated;
      }
    } else {
      // PostgreSQL unavailable, update in SQLite and queue for sync
      const updated = await this.sqliteAdapter.updateEscrow(id, updates);
      if (updated) {
        await this.syncEngine.addToQueue('UPDATE', 'escrow', id, updated);
      }
      return updated;
    }
  }

  // ============================================================================
  // Notification Operations
  // ============================================================================

  async createNotification(notification: Notification): Promise<Notification> {
    if (this.connectionMonitor.isConnected()) {
      try {
        const created = await this.pgAdapter.createNotification(notification);
        await this.syncEngine.propagateToSQLite('CREATE', 'notification', created.id, created);
        return created;
      } catch (error) {
        // PostgreSQL failed, create in SQLite and queue for sync
        const created = await this.sqliteAdapter.createNotification(notification);
        await this.syncEngine.addToQueue('CREATE', 'notification', notification.id, notification);
        return created;
      }
    } else {
      // PostgreSQL unavailable, create in SQLite and queue for sync
      const created = await this.sqliteAdapter.createNotification(notification);
      await this.syncEngine.addToQueue('CREATE', 'notification', notification.id, notification);
      return created;
    }
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        return await this.pgAdapter.getNotification(id);
      } catch (error) {
        console.warn('[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.', error);
        return await this.sqliteAdapter.getNotification(id);
      }
    } else {
      console.warn('[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.');
      return await this.sqliteAdapter.getNotification(id);
    }
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    if (this.connectionMonitor.isConnected()) {
      try {
        return await this.pgAdapter.getUserNotifications(userId);
      } catch (error) {
        console.warn('[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.', error);
        return await this.sqliteAdapter.getUserNotifications(userId);
      }
    } else {
      console.warn('[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.');
      return await this.sqliteAdapter.getUserNotifications(userId);
    }
  }

  async updateNotification(id: string, updates: Partial<Notification>): Promise<Notification | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        const updated = await this.pgAdapter.updateNotification(id, updates);
        if (updated) {
          await this.syncEngine.propagateToSQLite('UPDATE', 'notification', id, updated);
        }
        return updated;
      } catch (error) {
        // PostgreSQL failed, update in SQLite and queue for sync
        const updated = await this.sqliteAdapter.updateNotification(id, updates);
        if (updated) {
          await this.syncEngine.addToQueue('UPDATE', 'notification', id, updated);
        }
        return updated;
      }
    } else {
      // PostgreSQL unavailable, update in SQLite and queue for sync
      const updated = await this.sqliteAdapter.updateNotification(id, updates);
      if (updated) {
        await this.syncEngine.addToQueue('UPDATE', 'notification', id, updated);
      }
      return updated;
    }
  }

  async getNotificationTemplate(type: NotificationType, language: string): Promise<NotificationTemplate | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        return await this.pgAdapter.getNotificationTemplate(type, language);
      } catch (error) {
        console.warn('[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.', error);
        return await this.sqliteAdapter.getNotificationTemplate(type, language);
      }
    } else {
      console.warn('[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.');
      return await this.sqliteAdapter.getNotificationTemplate(type, language);
    }
  }

  // ============================================================================
  // Translation Feedback Operations
  // ============================================================================

  async createTranslationFeedback(feedback: Omit<TranslationFeedback, 'id' | 'createdAt' | 'updatedAt'>): Promise<TranslationFeedback> {
    if (this.connectionMonitor.isConnected()) {
      try {
        const created = await this.pgAdapter.createTranslationFeedback(feedback);
        await this.syncEngine.propagateToSQLite('CREATE', 'translation_feedback', created.id, created);
        return created;
      } catch (error) {
        // PostgreSQL failed, create in SQLite and queue for sync
        const created = await this.sqliteAdapter.createTranslationFeedback(feedback);
        await this.syncEngine.addToQueue('CREATE', 'translation_feedback', created.id, created);
        return created;
      }
    } else {
      // PostgreSQL unavailable, create in SQLite and queue for sync
      const created = await this.sqliteAdapter.createTranslationFeedback(feedback);
      await this.syncEngine.addToQueue('CREATE', 'translation_feedback', created.id, created);
      return created;
    }
  }

  async getTranslationFeedback(id: string): Promise<TranslationFeedback | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        return await this.pgAdapter.getTranslationFeedback(id);
      } catch (error) {
        console.warn('[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.', error);
        return await this.sqliteAdapter.getTranslationFeedback(id);
      }
    } else {
      console.warn('[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.');
      return await this.sqliteAdapter.getTranslationFeedback(id);
    }
  }

  async getTranslationFeedbackStats(targetLanguage?: string): Promise<TranslationFeedbackStats> {
    if (this.connectionMonitor.isConnected()) {
      try {
        return await this.pgAdapter.getTranslationFeedbackStats(targetLanguage);
      } catch (error) {
        console.warn('[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.', error);
        return await this.sqliteAdapter.getTranslationFeedbackStats(targetLanguage);
      }
    } else {
      console.warn('[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.');
      return await this.sqliteAdapter.getTranslationFeedbackStats(targetLanguage);
    }
  }

  async updateTranslationFeedback(id: string, updates: Partial<TranslationFeedback>): Promise<TranslationFeedback | undefined> {
    if (this.connectionMonitor.isConnected()) {
      try {
        const updated = await this.pgAdapter.updateTranslationFeedback(id, updates);
        if (updated) {
          await this.syncEngine.propagateToSQLite('UPDATE', 'translation_feedback', id, updated);
        }
        return updated;
      } catch (error) {
        // PostgreSQL failed, update in SQLite and queue for sync
        const updated = await this.sqliteAdapter.updateTranslationFeedback(id, updates);
        if (updated) {
          await this.syncEngine.addToQueue('UPDATE', 'translation_feedback', id, updated);
        }
        return updated;
      }
    } else {
      // PostgreSQL unavailable, update in SQLite and queue for sync
      const updated = await this.sqliteAdapter.updateTranslationFeedback(id, updates);
      if (updated) {
        await this.syncEngine.addToQueue('UPDATE', 'translation_feedback', id, updated);
      }
      return updated;
    }
  }

}
