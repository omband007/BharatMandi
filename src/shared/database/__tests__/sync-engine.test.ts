import { SyncEngine } from '../sync-engine';
import { PostgreSQLAdapter } from '../pg-adapter';
import { SQLiteAdapter } from '../sqlite-adapter';
import { ConnectionMonitor } from '../connection-monitor';
import * as sqliteHelpers from '../sqlite-helpers';

// Mock the sqlite-helpers module
jest.mock('../sqlite-helpers');

describe('SyncEngine - Queue Management', () => {
  let syncEngine: SyncEngine;
  let mockPgAdapter: jest.Mocked<PostgreSQLAdapter>;
  let mockSqliteAdapter: jest.Mocked<SQLiteAdapter>;
  let mockConnectionMonitor: jest.Mocked<ConnectionMonitor>;

  beforeEach(() => {
    // Create mock adapters
    mockPgAdapter = {} as any;
    mockSqliteAdapter = {} as any;
    mockConnectionMonitor = {
      on: jest.fn(),
      isConnected: jest.fn()
    } as any;

    // Clear all mocks
    jest.clearAllMocks();

    syncEngine = new SyncEngine(mockPgAdapter, mockSqliteAdapter, mockConnectionMonitor);
  });

  describe('constructor', () => {
    it('should register event listeners for connectivity changes', () => {
      expect(mockConnectionMonitor.on).toHaveBeenCalledWith('connected', expect.any(Function));
      expect(mockConnectionMonitor.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
    });
  });

  describe('addToQueue', () => {
    it('should add CREATE operation to sync queue', async () => {
      const mockAddToSyncQueue = jest.mocked(sqliteHelpers.addToSyncQueue);
      mockAddToSyncQueue.mockResolvedValue(1);

      const userData = {
        id: 'user-123',
        phoneNumber: '9876543210',
        name: 'Test User',
        userType: 'FARMER',
        location: { latitude: 28.7041, longitude: 77.1025, address: 'Delhi' },
        createdAt: new Date()
      };

      await syncEngine.addToQueue('CREATE', 'user', 'user-123', userData);

      expect(mockAddToSyncQueue).toHaveBeenCalledWith({
        operation_type: 'CREATE',
        entity_type: 'user',
        entity_id: 'user-123',
        data: JSON.stringify(userData)
      });
    });

    it('should add UPDATE operation to sync queue', async () => {
      const mockAddToSyncQueue = jest.mocked(sqliteHelpers.addToSyncQueue);
      mockAddToSyncQueue.mockResolvedValue(2);

      const updateData = {
        name: 'Updated Name',
        location: { latitude: 28.7041, longitude: 77.1025, address: 'New Delhi' }
      };

      await syncEngine.addToQueue('UPDATE', 'user', 'user-456', updateData);

      expect(mockAddToSyncQueue).toHaveBeenCalledWith({
        operation_type: 'UPDATE',
        entity_type: 'user',
        entity_id: 'user-456',
        data: JSON.stringify(updateData)
      });
    });

    it('should add DELETE operation to sync queue', async () => {
      const mockAddToSyncQueue = jest.mocked(sqliteHelpers.addToSyncQueue);
      mockAddToSyncQueue.mockResolvedValue(3);

      await syncEngine.addToQueue('DELETE', 'user', 'user-789', { id: 'user-789' });

      expect(mockAddToSyncQueue).toHaveBeenCalledWith({
        operation_type: 'DELETE',
        entity_type: 'user',
        entity_id: 'user-789',
        data: JSON.stringify({ id: 'user-789' })
      });
    });

    it('should handle complex nested data structures', async () => {
      const mockAddToSyncQueue = jest.mocked(sqliteHelpers.addToSyncQueue);
      mockAddToSyncQueue.mockResolvedValue(4);

      const complexData = {
        id: 'user-999',
        phoneNumber: '9876543210',
        name: 'Complex User',
        userType: 'BUYER',
        location: { latitude: 28.7041, longitude: 77.1025, address: 'Delhi' },
        bankAccount: {
          accountNumber: '1234567890',
          ifscCode: 'SBIN0001234',
          bankName: 'State Bank of India',
          accountHolderName: 'Complex User'
        },
        createdAt: new Date('2024-01-01')
      };

      await syncEngine.addToQueue('CREATE', 'user', 'user-999', complexData);

      expect(mockAddToSyncQueue).toHaveBeenCalledWith({
        operation_type: 'CREATE',
        entity_type: 'user',
        entity_id: 'user-999',
        data: JSON.stringify(complexData)
      });
    });
  });

  describe('getPendingSyncItems', () => {
    it('should retrieve pending sync items with default limit', async () => {
      const mockGetPendingSyncItems = jest.mocked(sqliteHelpers.getPendingSyncItems);
      const mockItems = [
        {
          id: 1,
          operation_type: 'CREATE' as const,
          entity_type: 'user',
          entity_id: 'user-123',
          data: JSON.stringify({ name: 'User 1' }),
          created_at: '2024-01-01T00:00:00.000Z',
          retry_count: 0
        },
        {
          id: 2,
          operation_type: 'UPDATE' as const,
          entity_type: 'user',
          entity_id: 'user-456',
          data: JSON.stringify({ name: 'User 2' }),
          created_at: '2024-01-02T00:00:00.000Z',
          retry_count: 1,
          last_retry_at: '2024-01-02T01:00:00.000Z',
          error_message: 'Connection timeout'
        }
      ];

      mockGetPendingSyncItems.mockResolvedValue(mockItems);

      const items = await syncEngine.getPendingSyncItems();

      expect(mockGetPendingSyncItems).toHaveBeenCalledWith(50);
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({
        id: 1,
        operation_type: 'CREATE',
        entity_type: 'user',
        entity_id: 'user-123',
        data: { name: 'User 1' },
        created_at: new Date('2024-01-01T00:00:00.000Z'),
        retry_count: 0,
        last_retry_at: undefined,
        error_message: undefined
      });
      expect(items[1]).toEqual({
        id: 2,
        operation_type: 'UPDATE',
        entity_type: 'user',
        entity_id: 'user-456',
        data: { name: 'User 2' },
        created_at: new Date('2024-01-02T00:00:00.000Z'),
        retry_count: 1,
        last_retry_at: new Date('2024-01-02T01:00:00.000Z'),
        error_message: 'Connection timeout'
      });
    });

    it('should retrieve pending sync items with custom limit', async () => {
      const mockGetPendingSyncItems = jest.mocked(sqliteHelpers.getPendingSyncItems);
      mockGetPendingSyncItems.mockResolvedValue([]);

      await syncEngine.getPendingSyncItems(10);

      expect(mockGetPendingSyncItems).toHaveBeenCalledWith(10);
    });

    it('should return empty array when no items are pending', async () => {
      const mockGetPendingSyncItems = jest.mocked(sqliteHelpers.getPendingSyncItems);
      mockGetPendingSyncItems.mockResolvedValue([]);

      const items = await syncEngine.getPendingSyncItems();

      expect(items).toEqual([]);
    });

    it('should parse JSON data correctly for each item', async () => {
      const mockGetPendingSyncItems = jest.mocked(sqliteHelpers.getPendingSyncItems);
      const complexData = {
        id: 'user-999',
        phoneNumber: '9876543210',
        location: { latitude: 28.7041, longitude: 77.1025, address: 'Delhi' },
        bankAccount: {
          accountNumber: '1234567890',
          ifscCode: 'SBIN0001234'
        }
      };

      mockGetPendingSyncItems.mockResolvedValue([
        {
          id: 1,
          operation_type: 'CREATE' as const,
          entity_type: 'user',
          entity_id: 'user-999',
          data: JSON.stringify(complexData),
          created_at: '2024-01-01T00:00:00.000Z',
          retry_count: 0
        }
      ]);

      const items = await syncEngine.getPendingSyncItems();

      expect(items[0].data).toEqual(complexData);
    });
  });

  describe('removeSyncQueueItem', () => {
    it('should remove sync queue item by id', async () => {
      const mockRemoveSyncQueueItem = jest.mocked(sqliteHelpers.removeSyncQueueItem);
      mockRemoveSyncQueueItem.mockResolvedValue();

      await syncEngine.removeSyncQueueItem(1);

      expect(mockRemoveSyncQueueItem).toHaveBeenCalledWith(1);
    });

    it('should remove multiple items sequentially', async () => {
      const mockRemoveSyncQueueItem = jest.mocked(sqliteHelpers.removeSyncQueueItem);
      mockRemoveSyncQueueItem.mockResolvedValue();

      await syncEngine.removeSyncQueueItem(1);
      await syncEngine.removeSyncQueueItem(2);
      await syncEngine.removeSyncQueueItem(3);

      expect(mockRemoveSyncQueueItem).toHaveBeenCalledTimes(3);
      expect(mockRemoveSyncQueueItem).toHaveBeenNthCalledWith(1, 1);
      expect(mockRemoveSyncQueueItem).toHaveBeenNthCalledWith(2, 2);
      expect(mockRemoveSyncQueueItem).toHaveBeenNthCalledWith(3, 3);
    });
  });

  describe('connectivity event handlers', () => {
    it('should log message when connection is restored', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Get the 'connected' event handler
      const connectedHandler = mockConnectionMonitor.on.mock.calls.find(
        call => call[0] === 'connected'
      )?.[1];

      expect(connectedHandler).toBeDefined();
      await connectedHandler!();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('PostgreSQL connection restored')
      );

      consoleSpy.mockRestore();
    });

    it('should log message when connection is lost', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Get the 'disconnected' event handler
      const disconnectedHandler = mockConnectionMonitor.on.mock.calls.find(
        call => call[0] === 'disconnected'
      )?.[1];

      expect(disconnectedHandler).toBeDefined();
      await disconnectedHandler!();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('PostgreSQL connection lost')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('processSyncQueue', () => {
    beforeEach(() => {
      mockPgAdapter.createUser = jest.fn().mockResolvedValue({});
      mockPgAdapter.updateUser = jest.fn().mockResolvedValue({});
    });

    it('should process pending sync items in chronological order', async () => {
      const mockGetPendingSyncItems = jest.mocked(sqliteHelpers.getPendingSyncItems);
      const mockRemoveSyncQueueItem = jest.mocked(sqliteHelpers.removeSyncQueueItem);
      
      // Mock connection as connected
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      
      const mockItems = [
        {
          id: 1,
          operation_type: 'CREATE' as const,
          entity_type: 'user',
          entity_id: 'user-123',
          data: JSON.stringify({
            id: 'user-123',
            phoneNumber: '9876543210',
            name: 'User 1',
            userType: 'FARMER',
            location: { latitude: 28.7041, longitude: 77.1025, address: 'Delhi' },
            createdAt: new Date('2024-01-01')
          }),
          created_at: '2024-01-01T00:00:00.000Z',
          retry_count: 0
        },
        {
          id: 2,
          operation_type: 'UPDATE' as const,
          entity_type: 'user',
          entity_id: 'user-456',
          data: JSON.stringify({ name: 'Updated Name' }),
          created_at: '2024-01-02T00:00:00.000Z',
          retry_count: 0
        }
      ];

      mockGetPendingSyncItems.mockResolvedValue(mockItems);
      mockRemoveSyncQueueItem.mockResolvedValue();

      await syncEngine.processSyncQueue();

      expect(mockGetPendingSyncItems).toHaveBeenCalledWith(50);
      expect(mockPgAdapter.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-123', name: 'User 1' }),
        undefined
      );
      expect(mockPgAdapter.updateUser).toHaveBeenCalledWith('user-456', { name: 'Updated Name' });
      expect(mockRemoveSyncQueueItem).toHaveBeenCalledTimes(2);
      expect(mockRemoveSyncQueueItem).toHaveBeenNthCalledWith(1, 1);
      expect(mockRemoveSyncQueueItem).toHaveBeenNthCalledWith(2, 2);
    });

    it('should handle empty queue gracefully', async () => {
      const mockGetPendingSyncItems = jest.mocked(sqliteHelpers.getPendingSyncItems);
      mockGetPendingSyncItems.mockResolvedValue([]);
      
      // Mock connection as connected
      mockConnectionMonitor.isConnected.mockReturnValue(true);

      await syncEngine.processSyncQueue();

      expect(mockGetPendingSyncItems).toHaveBeenCalledWith(50);
      expect(mockPgAdapter.createUser).not.toHaveBeenCalled();
      expect(mockPgAdapter.updateUser).not.toHaveBeenCalled();
    });

    it('should process CREATE operations with pinHash', async () => {
      const mockGetPendingSyncItems = jest.mocked(sqliteHelpers.getPendingSyncItems);
      const mockRemoveSyncQueueItem = jest.mocked(sqliteHelpers.removeSyncQueueItem);
      
      // Mock connection as connected
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      
      const userData = {
        id: 'user-123',
        phoneNumber: '9876543210',
        name: 'User with PIN',
        userType: 'FARMER',
        location: { latitude: 28.7041, longitude: 77.1025, address: 'Delhi' },
        createdAt: new Date('2024-01-01'),
        pinHash: 'hashed_pin_value'
      };

      mockGetPendingSyncItems.mockResolvedValue([
        {
          id: 1,
          operation_type: 'CREATE' as const,
          entity_type: 'user',
          entity_id: 'user-123',
          data: JSON.stringify(userData),
          created_at: '2024-01-01T00:00:00.000Z',
          retry_count: 0
        }
      ]);
      mockRemoveSyncQueueItem.mockResolvedValue();

      await syncEngine.processSyncQueue();

      expect(mockPgAdapter.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'user-123', pinHash: 'hashed_pin_value' }),
        'hashed_pin_value'
      );
      expect(mockRemoveSyncQueueItem).toHaveBeenCalledWith(1);
    });

    it('should skip processing if already syncing', async () => {
      const mockGetPendingSyncItems = jest.mocked(sqliteHelpers.getPendingSyncItems);
      
      // Mock connection as connected
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      
      // Start first sync (will be slow)
      mockGetPendingSyncItems.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([]), 100))
      );

      const firstSync = syncEngine.processSyncQueue();
      const secondSync = syncEngine.processSyncQueue();

      await Promise.all([firstSync, secondSync]);

      // Should only call once because second call is skipped
      expect(mockGetPendingSyncItems).toHaveBeenCalledTimes(1);
    });

    it('should continue processing remaining items if one fails', async () => {
      const mockGetPendingSyncItems = jest.mocked(sqliteHelpers.getPendingSyncItems);
      const mockRemoveSyncQueueItem = jest.mocked(sqliteHelpers.removeSyncQueueItem);
      const mockUpdateSyncQueueRetry = jest.mocked(sqliteHelpers.updateSyncQueueRetry);
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Mock connection status
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      
      const mockItems = [
        {
          id: 1,
          operation_type: 'CREATE' as const,
          entity_type: 'user',
          entity_id: 'user-123',
          data: JSON.stringify({
            id: 'user-123',
            phoneNumber: '9876543210',
            name: 'User 1',
            userType: 'FARMER',
            location: { latitude: 28.7041, longitude: 77.1025, address: 'Delhi' },
            createdAt: new Date('2024-01-01')
          }),
          created_at: '2024-01-01T00:00:00.000Z',
          retry_count: 0
        },
        {
          id: 2,
          operation_type: 'UPDATE' as const,
          entity_type: 'user',
          entity_id: 'user-456',
          data: JSON.stringify({ name: 'Updated Name' }),
          created_at: '2024-01-02T00:00:00.000Z',
          retry_count: 0
        }
      ];

      mockGetPendingSyncItems.mockResolvedValue(mockItems);
      mockRemoveSyncQueueItem.mockResolvedValue();
      mockUpdateSyncQueueRetry.mockResolvedValue();
      
      // First item fails, second should still process
      mockPgAdapter.createUser = jest.fn().mockRejectedValue(new Error('Database error'));
      mockPgAdapter.updateUser = jest.fn().mockResolvedValue({});

      await syncEngine.processSyncQueue();

      expect(mockPgAdapter.createUser).toHaveBeenCalled();
      expect(mockPgAdapter.updateUser).toHaveBeenCalled();
      expect(mockUpdateSyncQueueRetry).toHaveBeenCalledWith(1, 'Retry 1: Database error');
      // Only successful item should be removed
      expect(mockRemoveSyncQueueItem).toHaveBeenCalledTimes(1);
      expect(mockRemoveSyncQueueItem).toHaveBeenCalledWith(2);

      consoleLogSpy.mockRestore();
    });

    it('should apply exponential backoff on first retry (2^1 = 2 seconds)', async () => {
      const mockGetPendingSyncItems = jest.mocked(sqliteHelpers.getPendingSyncItems);
      const mockUpdateSyncQueueRetry = jest.mocked(sqliteHelpers.updateSyncQueueRetry);
      
      // Mock connection as connected
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      
      const mockItems = [
        {
          id: 1,
          operation_type: 'CREATE' as const,
          entity_type: 'user',
          entity_id: 'user-123',
          data: JSON.stringify({
            id: 'user-123',
            phoneNumber: '9876543210',
            name: 'User 1',
            userType: 'FARMER',
            location: { latitude: 28.7041, longitude: 77.1025, address: 'Delhi' },
            createdAt: new Date('2024-01-01')
          }),
          created_at: '2024-01-01T00:00:00.000Z',
          retry_count: 0
        }
      ];

      mockGetPendingSyncItems.mockResolvedValue(mockItems);
      mockUpdateSyncQueueRetry.mockResolvedValue();
      mockPgAdapter.createUser = jest.fn().mockRejectedValue(new Error('Connection timeout'));

      const startTime = Date.now();
      await syncEngine.processSyncQueue();
      const endTime = Date.now();

      // Should have waited approximately 2 seconds (2^1)
      const elapsedSeconds = (endTime - startTime) / 1000;
      expect(elapsedSeconds).toBeGreaterThanOrEqual(1.9);
      expect(elapsedSeconds).toBeLessThan(2.5);
      
      expect(mockUpdateSyncQueueRetry).toHaveBeenCalledWith(1, 'Retry 1: Connection timeout');
    });

    it('should apply exponential backoff on second retry (2^2 = 4 seconds)', async () => {
      const mockGetPendingSyncItems = jest.mocked(sqliteHelpers.getPendingSyncItems);
      const mockUpdateSyncQueueRetry = jest.mocked(sqliteHelpers.updateSyncQueueRetry);
      
      // Mock connection as connected
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      
      const mockItems = [
        {
          id: 1,
          operation_type: 'CREATE' as const,
          entity_type: 'user',
          entity_id: 'user-123',
          data: JSON.stringify({
            id: 'user-123',
            phoneNumber: '9876543210',
            name: 'User 1',
            userType: 'FARMER',
            location: { latitude: 28.7041, longitude: 77.1025, address: 'Delhi' },
            createdAt: new Date('2024-01-01')
          }),
          created_at: '2024-01-01T00:00:00.000Z',
          retry_count: 1
        }
      ];

      mockGetPendingSyncItems.mockResolvedValue(mockItems);
      mockUpdateSyncQueueRetry.mockResolvedValue();
      mockPgAdapter.createUser = jest.fn().mockRejectedValue(new Error('Connection timeout'));

      const startTime = Date.now();
      await syncEngine.processSyncQueue();
      const endTime = Date.now();

      // Should have waited approximately 4 seconds (2^2)
      const elapsedSeconds = (endTime - startTime) / 1000;
      expect(elapsedSeconds).toBeGreaterThanOrEqual(3.9);
      expect(elapsedSeconds).toBeLessThan(4.5);
      
      expect(mockUpdateSyncQueueRetry).toHaveBeenCalledWith(1, 'Retry 2: Connection timeout');
    });

    it('should mark item as failed after 3 attempts', async () => {
      const mockGetPendingSyncItems = jest.mocked(sqliteHelpers.getPendingSyncItems);
      const mockRemoveSyncQueueItem = jest.mocked(sqliteHelpers.removeSyncQueueItem);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock connection status
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      
      const mockItems = [
        {
          id: 1,
          operation_type: 'CREATE' as const,
          entity_type: 'user',
          entity_id: 'user-123',
          data: JSON.stringify({
            id: 'user-123',
            phoneNumber: '9876543210',
            name: 'User 1',
            userType: 'FARMER',
            location: { latitude: 28.7041, longitude: 77.1025, address: 'Delhi' },
            createdAt: new Date('2024-01-01')
          }),
          created_at: '2024-01-01T00:00:00.000Z',
          retry_count: 2
        }
      ];

      mockGetPendingSyncItems.mockResolvedValue(mockItems);
      mockRemoveSyncQueueItem.mockResolvedValue();
      mockPgAdapter.createUser = jest.fn().mockRejectedValue(new Error('Permanent failure'));

      await syncEngine.processSyncQueue();

      // After 3 attempts, item should be removed (not updated with retry)
      expect(mockRemoveSyncQueueItem).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed after 3 attempts'),
        'Permanent failure'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should not apply backoff after 3 attempts', async () => {
      const mockGetPendingSyncItems = jest.mocked(sqliteHelpers.getPendingSyncItems);
      const mockRemoveSyncQueueItem = jest.mocked(sqliteHelpers.removeSyncQueueItem);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock connection as connected
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      
      const mockItems = [
        {
          id: 1,
          operation_type: 'CREATE' as const,
          entity_type: 'user',
          entity_id: 'user-123',
          data: JSON.stringify({
            id: 'user-123',
            phoneNumber: '9876543210',
            name: 'User 1',
            userType: 'FARMER',
            location: { latitude: 28.7041, longitude: 77.1025, address: 'Delhi' },
            createdAt: new Date('2024-01-01')
          }),
          created_at: '2024-01-01T00:00:00.000Z',
          retry_count: 2
        }
      ];

      mockGetPendingSyncItems.mockResolvedValue(mockItems);
      mockRemoveSyncQueueItem.mockResolvedValue();
      mockPgAdapter.createUser = jest.fn().mockRejectedValue(new Error('Permanent failure'));

      const startTime = Date.now();
      await syncEngine.processSyncQueue();
      const endTime = Date.now();

      // Should NOT wait for backoff (should complete quickly)
      const elapsedSeconds = (endTime - startTime) / 1000;
      expect(elapsedSeconds).toBeLessThan(1);
      
      // After 3 attempts, item should be removed and error logged
      expect(mockRemoveSyncQueueItem).toHaveBeenCalledWith(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Sync item 1 failed after 3 attempts'),
        'Permanent failure'
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('should track retry count correctly across multiple failures', async () => {
      const mockGetPendingSyncItems = jest.mocked(sqliteHelpers.getPendingSyncItems);
      const mockUpdateSyncQueueRetry = jest.mocked(sqliteHelpers.updateSyncQueueRetry);
      
      // Mock connection status
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      
      // Simulate item with no previous retries
      const mockItems = [
        {
          id: 1,
          operation_type: 'CREATE' as const,
          entity_type: 'user',
          entity_id: 'user-123',
          data: JSON.stringify({
            id: 'user-123',
            phoneNumber: '9876543210',
            name: 'User 1',
            userType: 'FARMER',
            location: { latitude: 28.7041, longitude: 77.1025, address: 'Delhi' },
            createdAt: new Date('2024-01-01')
          }),
          created_at: '2024-01-01T00:00:00.000Z',
          retry_count: undefined // No previous retries
        }
      ];

      mockGetPendingSyncItems.mockResolvedValue(mockItems);
      mockUpdateSyncQueueRetry.mockResolvedValue();
      mockPgAdapter.createUser = jest.fn().mockRejectedValue(new Error('First failure'));

      await syncEngine.processSyncQueue();

      expect(mockUpdateSyncQueueRetry).toHaveBeenCalledWith(1, 'Retry 1: First failure');
    });

    it('should handle unknown entity types gracefully', async () => {
      const mockGetPendingSyncItems = jest.mocked(sqliteHelpers.getPendingSyncItems);
      const mockRemoveSyncQueueItem = jest.mocked(sqliteHelpers.removeSyncQueueItem);
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock connection as connected
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      
      mockGetPendingSyncItems.mockResolvedValue([
        {
          id: 1,
          operation_type: 'CREATE' as const,
          entity_type: 'unknown_entity',
          entity_id: 'entity-123',
          data: JSON.stringify({ some: 'data' }),
          created_at: '2024-01-01T00:00:00.000Z',
          retry_count: 0
        }
      ]);
      mockRemoveSyncQueueItem.mockResolvedValue();

      await syncEngine.processSyncQueue();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown entity type: unknown_entity')
      );
      expect(mockRemoveSyncQueueItem).toHaveBeenCalledWith(1);

      consoleWarnSpy.mockRestore();
    });

    it('should handle DELETE operations', async () => {
      const mockGetPendingSyncItems = jest.mocked(sqliteHelpers.getPendingSyncItems);
      const mockRemoveSyncQueueItem = jest.mocked(sqliteHelpers.removeSyncQueueItem);
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock connection as connected
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      
      mockGetPendingSyncItems.mockResolvedValue([
        {
          id: 1,
          operation_type: 'DELETE' as const,
          entity_type: 'user',
          entity_id: 'user-123',
          data: JSON.stringify({ id: 'user-123' }),
          created_at: '2024-01-01T00:00:00.000Z',
          retry_count: 0
        }
      ]);
      mockRemoveSyncQueueItem.mockResolvedValue();

      await syncEngine.processSyncQueue();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('DELETE operation not yet supported')
      );
      expect(mockRemoveSyncQueueItem).toHaveBeenCalledWith(1);

      consoleWarnSpy.mockRestore();
    });
  });

  describe('propagateToSQLite', () => {
    beforeEach(() => {
      mockSqliteAdapter.createUser = jest.fn().mockResolvedValue({});
      mockSqliteAdapter.updateUser = jest.fn().mockResolvedValue({});
    });

    it('should propagate CREATE operation to SQLite asynchronously', async () => {
      const userData = {
        id: 'user-123',
        phoneNumber: '9876543210',
        name: 'Test User',
        userType: 'FARMER',
        location: { latitude: 28.7041, longitude: 77.1025, address: 'Delhi' },
        createdAt: new Date(),
        pinHash: 'hashed_pin'
      };

      await syncEngine.propagateToSQLite('CREATE', 'user', 'user-123', userData);

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(mockSqliteAdapter.createUser).toHaveBeenCalledWith(userData, 'hashed_pin');
    });

    it('should propagate UPDATE operation to SQLite asynchronously', async () => {
      const updateData = {
        name: 'Updated Name',
        location: { latitude: 28.7041, longitude: 77.1025, address: 'New Delhi' }
      };

      await syncEngine.propagateToSQLite('UPDATE', 'user', 'user-456', updateData);

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(mockSqliteAdapter.updateUser).toHaveBeenCalledWith('user-456', updateData);
    });

    it('should handle DELETE operation gracefully (not yet implemented)', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await syncEngine.propagateToSQLite('DELETE', 'user', 'user-789', { id: 'user-789' });

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('DELETE operation not yet supported')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle unknown entity types gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await syncEngine.propagateToSQLite('CREATE', 'unknown_entity', 'entity-123', { some: 'data' });

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown entity type for propagation: unknown_entity')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle propagation errors gracefully without throwing', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSqliteAdapter.createUser = jest.fn().mockRejectedValue(new Error('SQLite error'));

      const userData = {
        id: 'user-123',
        phoneNumber: '9876543210',
        name: 'Test User',
        userType: 'FARMER',
        location: { latitude: 28.7041, longitude: 77.1025, address: 'Delhi' },
        createdAt: new Date()
      };

      // Should not throw
      await expect(
        syncEngine.propagateToSQLite('CREATE', 'user', 'user-123', userData)
      ).resolves.not.toThrow();

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to propagate'),
        'SQLite error'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should not block the caller (returns immediately)', async () => {
      const userData = {
        id: 'user-123',
        phoneNumber: '9876543210',
        name: 'Test User',
        userType: 'FARMER',
        location: { latitude: 28.7041, longitude: 77.1025, address: 'Delhi' },
        createdAt: new Date()
      };

      // Mock createUser to take some time
      mockSqliteAdapter.createUser = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 100))
      );

      const startTime = Date.now();
      await syncEngine.propagateToSQLite('CREATE', 'user', 'user-123', userData);
      const endTime = Date.now();

      // Should return immediately (< 50ms)
      const elapsedMs = endTime - startTime;
      expect(elapsedMs).toBeLessThan(50);

      // Wait for the actual operation to complete
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(mockSqliteAdapter.createUser).toHaveBeenCalled();
    });

    it('should propagate CREATE operation without pinHash', async () => {
      const userData = {
        id: 'user-123',
        phoneNumber: '9876543210',
        name: 'Test User',
        userType: 'FARMER',
        location: { latitude: 28.7041, longitude: 77.1025, address: 'Delhi' },
        createdAt: new Date()
      };

      await syncEngine.propagateToSQLite('CREATE', 'user', 'user-123', userData);

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(mockSqliteAdapter.createUser).toHaveBeenCalledWith(userData, undefined);
    });

    it('should log propagation start and success', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      // Use a non-user/non-listing entity type to trigger logging
      const transactionData = {
        id: 'txn-123',
        amount: 1000,
        status: 'completed'
      };

      await syncEngine.propagateToSQLite('CREATE', 'transaction', 'txn-123', transactionData);

      // Wait for setImmediate to execute
      await new Promise(resolve => setImmediate(resolve));

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Propagating CREATE transaction:txn-123 to SQLite')
      );

      consoleLogSpy.mockRestore();
    });
  });
});
