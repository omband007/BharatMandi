/**
 * DatabaseManager Unit Tests
 * 
 * These are proper unit tests with mocked dependencies.
 * For integration tests with real databases, see db-abstraction.integration.test.ts
 */

import { DatabaseManager } from '../db-abstraction';
import type { User } from '../db-abstraction';

// Mock all dependencies
jest.mock('../pg-adapter');
jest.mock('../sqlite-adapter');
jest.mock('../connection-monitor');
jest.mock('../sync-engine');

describe('DatabaseManager (Unit Tests)', () => {
  let dbManager: DatabaseManager;
  let mockPgAdapter: any;
  let mockSqliteAdapter: any;
  let mockConnectionMonitor: any;
  let mockSyncEngine: any;

  const mockUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    phoneNumber: '9876543210',
    name: 'Test User',
    userType: 'farmer' as const,
    location: {
      latitude: 28.7041,
      longitude: 77.1025,
      address: 'New Delhi, India'
    },
    createdAt: new Date()
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockPgAdapter = {
      createUser: jest.fn(),
      updateUser: jest.fn(),
      updateUserPin: jest.fn(),
      getUserByPhone: jest.fn(),
      getUserById: jest.fn(),
      createListing: jest.fn(),
      getListing: jest.fn(),
      getActiveListings: jest.fn(),
      updateListing: jest.fn(),
    };

    mockSqliteAdapter = {
      createUser: jest.fn(),
      updateUser: jest.fn(),
      updateUserPin: jest.fn(),
      getUserByPhone: jest.fn(),
      getUserById: jest.fn(),
      createListing: jest.fn(),
      getListing: jest.fn(),
      getActiveListings: jest.fn(),
      updateListing: jest.fn(),
    };

    mockConnectionMonitor = {
      start: jest.fn(),
      stop: jest.fn(),
      isConnected: jest.fn(),
      getHealthStatus: jest.fn().mockReturnValue({
        connected: true,
        lastCheck: new Date()
      })
    };

    mockSyncEngine = {
      start: jest.fn(),
      stop: jest.fn(),
      addToQueue: jest.fn().mockResolvedValue(undefined),
      propagateToSQLite: jest.fn().mockResolvedValue(undefined),
      processSyncQueue: jest.fn()
    };

    // Mock the require calls in DatabaseManager constructor
    jest.doMock('../pg-adapter', () => ({
      PostgreSQLAdapter: jest.fn(() => mockPgAdapter)
    }));
    jest.doMock('../sqlite-adapter', () => ({
      SQLiteAdapter: jest.fn(() => mockSqliteAdapter)
    }));
    jest.doMock('../connection-monitor', () => ({
      ConnectionMonitor: jest.fn(() => mockConnectionMonitor)
    }));
    jest.doMock('../sync-engine', () => ({
      SyncEngine: jest.fn(() => mockSyncEngine)
    }));

    // Create DatabaseManager instance
    dbManager = new DatabaseManager();
    
    // Manually inject mocks (since constructor creates real instances)
    (dbManager as any).pgAdapter = mockPgAdapter;
    (dbManager as any).sqliteAdapter = mockSqliteAdapter;
    (dbManager as any).connectionMonitor = mockConnectionMonitor;
    (dbManager as any).syncEngine = mockSyncEngine;
  });

  afterEach(() => {
    if (dbManager && typeof dbManager.stop === 'function') {
      dbManager.stop();
    }
  });

  describe('Initialization', () => {
    test('should have PostgreSQL adapter', () => {
      const pgAdapter = dbManager.getPostgreSQLAdapter();
      expect(pgAdapter).toBeDefined();
      expect(pgAdapter).toBe(mockPgAdapter);
    });

    test('should have SQLite adapter', () => {
      const sqliteAdapter = dbManager.getSQLiteAdapter();
      expect(sqliteAdapter).toBeDefined();
      expect(sqliteAdapter).toBe(mockSqliteAdapter);
    });

    test('should have ConnectionMonitor', () => {
      const connectionMonitor = dbManager.getConnectionMonitor();
      expect(connectionMonitor).toBeDefined();
      expect(connectionMonitor).toBe(mockConnectionMonitor);
    });

    test('should have SyncEngine', () => {
      const syncEngine = dbManager.getSyncEngine();
      expect(syncEngine).toBeDefined();
      expect(syncEngine).toBe(mockSyncEngine);
    });
  });

  describe('Start and Stop', () => {
    test('should start connection monitor when start() is called', async () => {
      await dbManager.start();
      expect(mockConnectionMonitor.start).toHaveBeenCalled();
      expect(mockSyncEngine.start).toHaveBeenCalled();
    });

    test('should stop connection monitor when stop() is called', () => {
      dbManager.stop();
      expect(mockConnectionMonitor.stop).toHaveBeenCalled();
      expect(mockSyncEngine.stop).toHaveBeenCalled();
    });
  });

  describe('Health Status', () => {
    test('should return health status', () => {
      const healthStatus = dbManager.getHealthStatus();
      expect(healthStatus).toHaveProperty('postgresql');
      expect(healthStatus.postgresql).toHaveProperty('connected');
      expect(healthStatus.postgresql).toHaveProperty('lastCheck');
    });

    test('should reflect PostgreSQL connection status', () => {
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      expect(dbManager.isPostgreSQLConnected()).toBe(true);

      mockConnectionMonitor.isConnected.mockReturnValue(false);
      expect(dbManager.isPostgreSQLConnected()).toBe(false);
    });
  });

  describe('Write Operations - createUser', () => {
    test('should write to PostgreSQL and propagate to SQLite when connected', async () => {
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      mockPgAdapter.createUser.mockResolvedValue(mockUser);

      const result = await dbManager.createUser(mockUser, 'hashedPin123');

      expect(mockPgAdapter.createUser).toHaveBeenCalledWith(mockUser, 'hashedPin123');
      expect(mockSyncEngine.propagateToSQLite).toHaveBeenCalledWith(
        'CREATE',
        'user',
        mockUser.id,
        { ...mockUser, pinHash: 'hashedPin123' }
      );
      expect(result).toEqual(mockUser);
    });

    test('should queue operation when PostgreSQL is unavailable', async () => {
      mockConnectionMonitor.isConnected.mockReturnValue(false);

      await expect(dbManager.createUser(mockUser, 'hashedPin123')).rejects.toThrow(
        'PostgreSQL unavailable. Operation queued for sync.'
      );

      expect(mockSyncEngine.addToQueue).toHaveBeenCalledWith(
        'CREATE',
        'user',
        mockUser.id,
        { ...mockUser, pinHash: 'hashedPin123' }
      );
      expect(mockPgAdapter.createUser).not.toHaveBeenCalled();
    });

    test('should queue operation when PostgreSQL write fails', async () => {
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      const error = new Error('Connection timeout');
      mockPgAdapter.createUser.mockRejectedValue(error);

      await expect(dbManager.createUser(mockUser, 'hashedPin123')).rejects.toThrow(error);

      expect(mockSyncEngine.addToQueue).toHaveBeenCalledWith(
        'CREATE',
        'user',
        mockUser.id,
        { ...mockUser, pinHash: 'hashedPin123' }
      );
    });
  });

  describe('Write Operations - updateUser', () => {
    const updates = { name: 'Updated Name' };
    const updatedUser = { ...mockUser, ...updates };

    test('should write to PostgreSQL and propagate to SQLite when connected', async () => {
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      mockPgAdapter.updateUser.mockResolvedValue(updatedUser);

      const result = await dbManager.updateUser(mockUser.id, updates);

      expect(mockPgAdapter.updateUser).toHaveBeenCalledWith(mockUser.id, updates);
      expect(mockSyncEngine.propagateToSQLite).toHaveBeenCalledWith(
        'UPDATE',
        'user',
        mockUser.id,
        updatedUser
      );
      expect(result).toEqual(updatedUser);
    });

    test('should not propagate when user not found', async () => {
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      mockPgAdapter.updateUser.mockResolvedValue(undefined);

      const result = await dbManager.updateUser(mockUser.id, updates);

      expect(result).toBeUndefined();
      expect(mockSyncEngine.propagateToSQLite).not.toHaveBeenCalled();
    });

    test('should queue operation when PostgreSQL is unavailable', async () => {
      mockConnectionMonitor.isConnected.mockReturnValue(false);

      await expect(dbManager.updateUser(mockUser.id, updates)).rejects.toThrow(
        'PostgreSQL unavailable. Operation queued for sync.'
      );

      expect(mockSyncEngine.addToQueue).toHaveBeenCalledWith(
        'UPDATE',
        'user',
        mockUser.id,
        updates
      );
    });

    test('should queue operation when PostgreSQL write fails', async () => {
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      const error = new Error('Connection timeout');
      mockPgAdapter.updateUser.mockRejectedValue(error);

      await expect(dbManager.updateUser(mockUser.id, updates)).rejects.toThrow(error);

      expect(mockSyncEngine.addToQueue).toHaveBeenCalledWith(
        'UPDATE',
        'user',
        mockUser.id,
        updates
      );
    });
  });

  describe('Write Operations - updateUserPin', () => {
    const phoneNumber = '9876543210';
    const pinHash = 'hashedPin123';

    test('should write to PostgreSQL and propagate to SQLite when connected', async () => {
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      mockPgAdapter.updateUserPin.mockResolvedValue(undefined);

      await dbManager.updateUserPin(phoneNumber, pinHash);

      expect(mockPgAdapter.updateUserPin).toHaveBeenCalledWith(phoneNumber, pinHash);
      expect(mockSyncEngine.propagateToSQLite).toHaveBeenCalledWith(
        'UPDATE',
        'user_pin',
        phoneNumber,
        { phoneNumber, pinHash }
      );
    });

    test('should queue operation when PostgreSQL is unavailable', async () => {
      mockConnectionMonitor.isConnected.mockReturnValue(false);

      await expect(dbManager.updateUserPin(phoneNumber, pinHash)).rejects.toThrow(
        'PostgreSQL unavailable. Operation queued for sync.'
      );

      expect(mockSyncEngine.addToQueue).toHaveBeenCalledWith(
        'UPDATE',
        'user_pin',
        phoneNumber,
        { phoneNumber, pinHash }
      );
    });

    test('should queue operation when PostgreSQL write fails', async () => {
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      const error = new Error('Connection timeout');
      mockPgAdapter.updateUserPin.mockRejectedValue(error);

      await expect(dbManager.updateUserPin(phoneNumber, pinHash)).rejects.toThrow(error);

      expect(mockSyncEngine.addToQueue).toHaveBeenCalledWith(
        'UPDATE',
        'user_pin',
        phoneNumber,
        { phoneNumber, pinHash }
      );
    });
  });

  describe('Read Operations - getUserByPhone', () => {
    test('should read from PostgreSQL when connected', async () => {
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      mockPgAdapter.getUserByPhone.mockResolvedValue(mockUser);

      const result = await dbManager.getUserByPhone('9876543210');

      expect(mockPgAdapter.getUserByPhone).toHaveBeenCalledWith('9876543210');
      expect(result).toEqual(mockUser);
      expect(mockSqliteAdapter.getUserByPhone).not.toHaveBeenCalled();
    });

    test('should fallback to SQLite when PostgreSQL read fails', async () => {
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      const error = new Error('Connection timeout');
      mockPgAdapter.getUserByPhone.mockRejectedValue(error);
      mockSqliteAdapter.getUserByPhone.mockResolvedValue(mockUser);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await dbManager.getUserByPhone('9876543210');

      expect(mockSqliteAdapter.getUserByPhone).toHaveBeenCalledWith('9876543210');
      expect(result).toEqual(mockUser);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.',
        error
      );

      consoleWarnSpy.mockRestore();
    });

    test('should serve from SQLite when PostgreSQL is unavailable', async () => {
      mockConnectionMonitor.isConnected.mockReturnValue(false);
      mockSqliteAdapter.getUserByPhone.mockResolvedValue(mockUser);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await dbManager.getUserByPhone('9876543210');

      expect(mockSqliteAdapter.getUserByPhone).toHaveBeenCalledWith('9876543210');
      expect(result).toEqual(mockUser);
      expect(mockPgAdapter.getUserByPhone).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.'
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('Read Operations - getUserById', () => {
    test('should read from PostgreSQL when connected', async () => {
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      mockPgAdapter.getUserById.mockResolvedValue(mockUser);

      const result = await dbManager.getUserById(mockUser.id);

      expect(mockPgAdapter.getUserById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
      expect(mockSqliteAdapter.getUserById).not.toHaveBeenCalled();
    });

    test('should fallback to SQLite when PostgreSQL read fails', async () => {
      mockConnectionMonitor.isConnected.mockReturnValue(true);
      const error = new Error('Connection timeout');
      mockPgAdapter.getUserById.mockRejectedValue(error);
      mockSqliteAdapter.getUserById.mockResolvedValue(mockUser);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await dbManager.getUserById(mockUser.id);

      expect(mockSqliteAdapter.getUserById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.',
        error
      );

      consoleWarnSpy.mockRestore();
    });

    test('should serve from SQLite when PostgreSQL is unavailable', async () => {
      mockConnectionMonitor.isConnected.mockReturnValue(false);
      mockSqliteAdapter.getUserById.mockResolvedValue(mockUser);

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await dbManager.getUserById(mockUser.id);

      expect(mockSqliteAdapter.getUserById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
      expect(mockPgAdapter.getUserById).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.'
      );

      consoleWarnSpy.mockRestore();
    });
  });
});
