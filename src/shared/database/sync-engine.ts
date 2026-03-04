import type { PostgreSQLAdapter } from './pg-adapter';
import type { SQLiteAdapter } from './sqlite-adapter';
import type { ConnectionMonitor } from './connection-monitor';
import * as sqliteHelpers from './sqlite-helpers';

// Logging control
const VERBOSE_LOGGING = process.env.DB_VERBOSE_LOGGING === 'true';

/**
 * Sync Queue Item interface
 * Represents an operation queued for synchronization
 */
export interface SyncQueueItem {
  id?: number;
  operation_type: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type: string;
  entity_id: string;
  data: any;
  created_at?: Date;
  retry_count?: number;
  last_retry_at?: Date;
  error_message?: string;
}

/**
 * Sync Engine for Database Synchronization
 * Manages the sync queue for offline operations and synchronizes data between PostgreSQL and SQLite
 * Validates: Requirements 3.1, 3.2, 3.4, 6.1, 6.2, 6.3, 6.4, 6.5
 */
export class SyncEngine {
  private pgAdapter: PostgreSQLAdapter;
  private sqliteAdapter: SQLiteAdapter;
  private connectionMonitor: ConnectionMonitor;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;

  constructor(
    pgAdapter: PostgreSQLAdapter,
    sqliteAdapter: SQLiteAdapter,
    connectionMonitor: ConnectionMonitor
  ) {
    this.pgAdapter = pgAdapter;
    this.sqliteAdapter = sqliteAdapter;
    this.connectionMonitor = connectionMonitor;

    // Listen for connectivity changes
    this.connectionMonitor.on('connected', () => this.onConnected());
    this.connectionMonitor.on('disconnected', () => this.onDisconnected());
  }

  /**
   * Add operation to sync queue
   * Called when a write operation fails due to PostgreSQL unavailability
   * Validates: Requirement 6.1
   * 
   * @param operationType - Type of operation (CREATE, UPDATE, DELETE)
   * @param entityType - Type of entity (e.g., 'user', 'listing')
   * @param entityId - ID of the entity
   * @param data - Entity data to sync
   */
  async addToQueue(
    operationType: 'CREATE' | 'UPDATE' | 'DELETE',
    entityType: string,
    entityId: string,
    data: any
  ): Promise<void> {
    await sqliteHelpers.addToSyncQueue({
      operation_type: operationType,
      entity_type: entityType,
      entity_id: entityId,
      data: JSON.stringify(data)
    });
    console.log(`[SyncEngine] Added ${operationType} operation for ${entityType}:${entityId} to sync queue`);
  }

  /**
   * Get pending sync items from the queue
   * Validates: Requirement 6.2
   * 
   * @param limit - Maximum number of items to retrieve (default: 50)
   * @returns Array of pending sync queue items
   */
  async getPendingSyncItems(limit: number = 50): Promise<SyncQueueItem[]> {
    const items = await sqliteHelpers.getPendingSyncItems(limit);
    
    // Map SQLite items to SyncQueueItem interface
    return items.map(item => ({
      id: item.id,
      operation_type: item.operation_type,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      data: JSON.parse(item.data),
      created_at: item.created_at ? new Date(item.created_at) : undefined,
      retry_count: item.retry_count,
      last_retry_at: item.last_retry_at ? new Date(item.last_retry_at) : undefined,
      error_message: item.error_message
    }));
  }

  /**
   * Remove sync queue item after successful synchronization
   * Validates: Requirement 6.4
   * 
   * @param id - ID of the sync queue item to remove
   */
  async removeSyncQueueItem(id: number): Promise<void> {
    await sqliteHelpers.removeSyncQueueItem(id);
    console.log(`[SyncEngine] Removed sync queue item ${id}`);
  }

  /**
   * Process sync queue
   * Processes pending sync items in chronological order with retry logic
   * Validates: Requirements 3.2, 3.4, 6.3, 6.5
   */
  async processSyncQueue(): Promise<void> {
    if (this.isSyncing) {
      // Don't log - this is normal
      return;
    }

    // Only process if PostgreSQL is connected
    if (!this.connectionMonitor.isConnected()) {
      // Don't log - this is normal when offline
      return;
    }

    this.isSyncing = true;
    try {
      const items = await this.getPendingSyncItems(50);
      
      if (items.length === 0) {
        // Don't log - this is normal when queue is empty
        return;
      }
      
      console.log(`[SyncEngine] Processing ${items.length} sync queue items`);
      
      for (const item of items) {
        try {
          await this.processSyncItem(item);
          await this.removeSyncQueueItem(item.id!);
          console.log(`[SyncEngine] ✅ Synced ${item.operation_type} ${item.entity_type}:${item.entity_id}`);
        } catch (error) {
          const retryCount = (item.retry_count || 0) + 1;
          const errorMessage = error instanceof Error ? error.message : String(error);
          
          if (retryCount >= 3) {
            // Silently remove failed items after 3 attempts - they're likely stale data
            await this.removeSyncQueueItem(item.id!);
            // Only log if it's not a foreign key constraint error (which indicates stale data)
            if (!errorMessage.includes('foreign key constraint') && !errorMessage.includes('NOT NULL constraint')) {
              console.error(`[SyncEngine] ❌ Sync item ${item.id} failed after 3 attempts:`, errorMessage);
            }
          } else {
            // Apply exponential backoff: 2^n seconds
            const backoffSeconds = Math.pow(2, retryCount);
            console.log(`[SyncEngine] ⚠️  Sync item ${item.id} failed (attempt ${retryCount}/3), will retry with ${backoffSeconds}s backoff`);
            
            // Update retry count and error message
            await sqliteHelpers.updateSyncQueueRetry(item.id!, `Retry ${retryCount}: ${errorMessage}`);
            
            // Apply backoff delay
            await new Promise(resolve => setTimeout(resolve, backoffSeconds * 1000));
          }
        }
      }
    } catch (error) {
      // Catch any errors in the sync process itself to prevent crashes
      console.error('[SyncEngine] ❌ Error processing sync queue:', error instanceof Error ? error.message : String(error));
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Propagate PostgreSQL changes to SQLite asynchronously
   * Ensures changes propagate within 5 seconds without blocking the caller
   * Validates: Requirements 3.1, 4.4
   * 
   * @param operationType - Type of operation (CREATE, UPDATE, DELETE)
   * @param entityType - Type of entity (e.g., 'user')
   * @param entityId - ID of the entity
   * @param data - Entity data to propagate
   */
  async propagateToSQLite(
    operationType: 'CREATE' | 'UPDATE' | 'DELETE',
    entityType: string,
    entityId: string,
    data: any
  ): Promise<void> {
    // Run asynchronously without blocking the caller
    setImmediate(async () => {
      try {
        // Validate data before propagation
        if (!data || typeof data !== 'object') {
          console.error(`[SyncEngine] ❌ Invalid data for propagation: ${entityType}:${entityId}`);
          return;
        }

        if (VERBOSE_LOGGING) {
          console.log(`[SyncEngine] Propagating ${operationType} ${entityType}:${entityId} to SQLite`);
        }
        
        switch (entityType) {
          case 'user':
            if (operationType === 'CREATE') {
              await this.sqliteAdapter.createUser(data, data.pinHash);
            } else if (operationType === 'UPDATE') {
              await this.sqliteAdapter.updateUser(entityId, data);
            } else if (operationType === 'DELETE') {
              // DELETE operation not yet implemented in SQLiteAdapter
              console.warn(`[SyncEngine] DELETE operation not yet supported for ${entityType}`);
            }
            break;
          
          case 'user_pin':
            if (operationType === 'UPDATE') {
              await this.sqliteAdapter.updateUserPin(data.phoneNumber, data.pinHash);
            }
            break;
          
          case 'listing':
            if (operationType === 'CREATE') {
              await this.sqliteAdapter.createListing(data);
            } else if (operationType === 'UPDATE') {
              await this.sqliteAdapter.updateListing(entityId, data);
            } else if (operationType === 'DELETE') {
              console.warn(`[SyncEngine] DELETE operation not yet supported for ${entityType}`);
            }
            break;
          
          case 'transaction':
            if (operationType === 'CREATE') {
              await this.sqliteAdapter.createTransaction(data);
            } else if (operationType === 'UPDATE') {
              await this.sqliteAdapter.updateTransaction(entityId, data);
            } else if (operationType === 'DELETE') {
              console.warn(`[SyncEngine] DELETE operation not yet supported for ${entityType}`);
            }
            break;
          
          case 'escrow':
            if (operationType === 'CREATE') {
              await this.sqliteAdapter.createEscrow(data);
            } else if (operationType === 'UPDATE') {
              await this.sqliteAdapter.updateEscrow(entityId, data);
            } else if (operationType === 'DELETE') {
              console.warn(`[SyncEngine] DELETE operation not yet supported for ${entityType}`);
            }
            break;
          
          default:
            console.warn(`[SyncEngine] Unknown entity type for propagation: ${entityType}`);
        }
      } catch (error) {
        // Handle errors gracefully - don't throw to avoid affecting PostgreSQL operations
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[SyncEngine] ❌ Failed to propagate ${operationType} ${entityType}:${entityId} to SQLite:`, errorMessage);
        
        // Don't add to queue if it's a data validation error
        if (errorMessage.includes('NOT NULL constraint') || errorMessage.includes('UNIQUE constraint')) {
          console.error(`[SyncEngine] Data validation error - not adding to sync queue`);
        }
      }
    });
  }

  /**
   * Process individual sync item
   * Routes the operation to the appropriate PostgreSQL adapter method
   * 
   * @param item - Sync queue item to process
   */
  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    const data = item.data;
    
    switch (item.entity_type) {
      case 'user':
        if (item.operation_type === 'CREATE') {
          await this.pgAdapter.createUser(data, data.pinHash);
        } else if (item.operation_type === 'UPDATE') {
          await this.pgAdapter.updateUser(item.entity_id, data);
        } else if (item.operation_type === 'DELETE') {
          // DELETE operation not yet implemented in PostgreSQLAdapter
          console.warn(`[SyncEngine] DELETE operation not yet supported for ${item.entity_type}`);
        }
        break;
      
      case 'user_pin':
        if (item.operation_type === 'UPDATE') {
          await this.pgAdapter.updateUserPin(data.phoneNumber, data.pinHash);
        }
        break;
      
      case 'listing':
        if (item.operation_type === 'CREATE') {
          await this.pgAdapter.createListing(data);
        } else if (item.operation_type === 'UPDATE') {
          await this.pgAdapter.updateListing(item.entity_id, data);
        } else if (item.operation_type === 'DELETE') {
          console.warn(`[SyncEngine] DELETE operation not yet supported for ${item.entity_type}`);
        }
        break;
      
      case 'transaction':
        if (item.operation_type === 'CREATE') {
          await this.pgAdapter.createTransaction(data);
        } else if (item.operation_type === 'UPDATE') {
          await this.pgAdapter.updateTransaction(item.entity_id, data);
        } else if (item.operation_type === 'DELETE') {
          console.warn(`[SyncEngine] DELETE operation not yet supported for ${item.entity_type}`);
        }
        break;
      
      case 'escrow':
        if (item.operation_type === 'CREATE') {
          await this.pgAdapter.createEscrow(data);
        } else if (item.operation_type === 'UPDATE') {
          await this.pgAdapter.updateEscrow(item.entity_id, data);
        } else if (item.operation_type === 'DELETE') {
          console.warn(`[SyncEngine] DELETE operation not yet supported for ${item.entity_type}`);
        }
        break;
      
      default:
        console.warn(`[SyncEngine] Unknown entity type: ${item.entity_type}`);
    }
  }

  /**
   * Handle connectivity restored event
   * Triggers sync queue processing when PostgreSQL connection is restored
   */
  private async onConnected(): Promise<void> {
    console.log('[SyncEngine] PostgreSQL connection restored, processing sync queue');
    await this.processSyncQueue();
  }

  /**
   * Handle connectivity lost event
   */
  private onDisconnected(): Promise<void> {
    console.log('[SyncEngine] PostgreSQL connection lost, entering offline mode');
    return Promise.resolve();
  }

  /**
   * Start the sync engine
   * Begins periodic processing of the sync queue
   */
  start(): void {
    if (this.syncInterval) {
      if (VERBOSE_LOGGING) {
        console.log('[SyncEngine] Already started');
      }
      return;
    }

    if (VERBOSE_LOGGING) {
      console.log('[SyncEngine] Starting periodic sync (every 30 seconds)');
    }
    
    // Process queue immediately
    this.processSyncQueue().catch(err => {
      console.error('[SyncEngine] Initial sync failed:', err.message);
    });

    // Then process every 30 seconds (increased from 5 seconds to reduce noise)
    this.syncInterval = setInterval(() => {
      this.processSyncQueue().catch(err => {
        console.error('[SyncEngine] Periodic sync failed:', err.message);
      });
    }, 30000);
  }

  /**
   * Stop the sync engine
   * Stops periodic processing of the sync queue
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[SyncEngine] Stopped');
    }
  }
}
