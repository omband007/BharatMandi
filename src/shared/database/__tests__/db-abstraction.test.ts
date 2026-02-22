import { DatabaseManager } from '../db-abstraction';
import { UserType } from '../../../shared/types/common.types';

describe('DatabaseManager', () => {
  let dbManager: DatabaseManager;

  beforeEach(() => {
    dbManager = new DatabaseManager();
  });

  afterEach(() => {
    dbManager.stop();
  });

  describe('Initialization', () => {
    test('should initialize PostgreSQL adapter', () => {
      const pgAdapter = dbManager.getPostgreSQLAdapter();
      expect(pgAdapter).toBeDefined();
      expect(pgAdapter).toHaveProperty('createUser');
      expect(pgAdapter).toHaveProperty('getUserByPhone');
    });

    test('should initialize SQLite adapter', () => {
      const sqliteAdapter = dbManager.getSQLiteAdapter();
      expect(sqliteAdapter).toBeDefined();
      expect(sqliteAdapter).toHaveProperty('createUser');
      expect(sqliteAdapter).toHaveProperty('getUserByPhone');
    });

    test('should initialize ConnectionMonitor', () => {
      const connectionMonitor = dbManager.getConnectionMonitor();
      expect(connectionMonitor).toBeDefined();
      expect(connectionMonitor).toHaveProperty('start');
      expect(connectionMonitor).toHaveProperty('stop');
      expect(connectionMonitor).toHaveProperty('isConnected');
    });

    test('should initialize SyncEngine', () => {
      const syncEngine = dbManager.getSyncEngine();
      expect(syncEngine).toBeDefined();
      expect(syncEngine).toHaveProperty('addToQueue');
      expect(syncEngine).toHaveProperty('processSyncQueue');
      expect(syncEngine).toHaveProperty('propagateToSQLite');
    });
  });

  describe('Component Wiring', () => {
    test('should wire ConnectionMonitor with PostgreSQL adapter', () => {
      const connectionMonitor = dbManager.getConnectionMonitor();
      const pgAdapter = dbManager.getPostgreSQLAdapter();
      
      // ConnectionMonitor should have reference to pgAdapter
      expect(connectionMonitor['pgAdapter']).toBe(pgAdapter);
    });

    test('should wire SyncEngine with both adapters and ConnectionMonitor', () => {
      const syncEngine = dbManager.getSyncEngine();
      const pgAdapter = dbManager.getPostgreSQLAdapter();
      const sqliteAdapter = dbManager.getSQLiteAdapter();
      const connectionMonitor = dbManager.getConnectionMonitor();
      
      // SyncEngine should have references to all components
      expect(syncEngine['pgAdapter']).toBe(pgAdapter);
      expect(syncEngine['sqliteAdapter']).toBe(sqliteAdapter);
      expect(syncEngine['connectionMonitor']).toBe(connectionMonitor);
    });
  });

  describe('Start and Stop', () => {
    test('should start connection monitor when start() is called', () => {
      const connectionMonitor = dbManager.getConnectionMonitor();
      const startSpy = jest.spyOn(connectionMonitor, 'start');
      
      dbManager.start();
      
      expect(startSpy).toHaveBeenCalled();
    });

    test('should stop connection monitor when stop() is called', () => {
      const connectionMonitor = dbManager.getConnectionMonitor();
      const stopSpy = jest.spyOn(connectionMonitor, 'stop');
      
      dbManager.stop();
      
      expect(stopSpy).toHaveBeenCalled();
    });
  });

  describe('Health Status', () => {
    test('should return health status with PostgreSQL connectivity', () => {
      const healthStatus = dbManager.getHealthStatus();
      
      expect(healthStatus).toHaveProperty('postgresql');
      expect(healthStatus.postgresql).toHaveProperty('connected');
      expect(healthStatus.postgresql).toHaveProperty('lastCheck');
    });

    test('should reflect PostgreSQL connection status', () => {
      const connectionMonitor = dbManager.getConnectionMonitor();
      
      // Mock connection status
      jest.spyOn(connectionMonitor, 'isConnected').mockReturnValue(true);
      
      expect(dbManager.isPostgreSQLConnected()).toBe(true);
    });
  });

  describe('Write Operations', () => {
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      phoneNumber: '9876543210',
      name: 'Test User',
      userType: UserType.FARMER,
      location: {
        latitude: 28.7041,
        longitude: 77.1025,
        address: 'New Delhi, India'
      },
      createdAt: new Date()
    };

    describe('createUser', () => {
      test('should write to PostgreSQL first when connected', async () => {
        const connectionMonitor = dbManager.getConnectionMonitor();
        const pgAdapter = dbManager.getPostgreSQLAdapter();
        const syncEngine = dbManager.getSyncEngine();
        
        // Mock connected state
        jest.spyOn(connectionMonitor, 'isConnected').mockReturnValue(true);
        
        // Mock PostgreSQL createUser
        const pgCreateSpy = jest.spyOn(pgAdapter, 'createUser').mockResolvedValue(mockUser);
        
        // Mock propagateToSQLite
        const propagateSpy = jest.spyOn(syncEngine, 'propagateToSQLite').mockResolvedValue();
        
        const result = await dbManager.createUser(mockUser, 'hashedPin123');
        
        expect(pgCreateSpy).toHaveBeenCalledWith(mockUser, 'hashedPin123');
        expect(propagateSpy).toHaveBeenCalledWith('CREATE', 'user', mockUser.id, {
          ...mockUser,
          pinHash: 'hashedPin123'
        });
        expect(result).toEqual(mockUser);
      });

      test('should queue operation when PostgreSQL is unavailable', async () => {
        const connectionMonitor = dbManager.getConnectionMonitor();
        const syncEngine = dbManager.getSyncEngine();
        
        // Mock disconnected state
        jest.spyOn(connectionMonitor, 'isConnected').mockReturnValue(false);
        
        // Mock addToQueue
        const queueSpy = jest.spyOn(syncEngine, 'addToQueue').mockResolvedValue();
        
        await expect(dbManager.createUser(mockUser, 'hashedPin123')).rejects.toThrow(
          'PostgreSQL unavailable. Operation queued for sync.'
        );
        
        expect(queueSpy).toHaveBeenCalledWith('CREATE', 'user', mockUser.id, {
          ...mockUser,
          pinHash: 'hashedPin123'
        });
      });

      test('should queue operation when PostgreSQL write fails', async () => {
        const connectionMonitor = dbManager.getConnectionMonitor();
        const pgAdapter = dbManager.getPostgreSQLAdapter();
        const syncEngine = dbManager.getSyncEngine();
        
        // Mock connected state
        jest.spyOn(connectionMonitor, 'isConnected').mockReturnValue(true);
        
        // Mock PostgreSQL createUser to fail
        const error = new Error('Connection timeout');
        jest.spyOn(pgAdapter, 'createUser').mockRejectedValue(error);
        
        // Mock addToQueue
        const queueSpy = jest.spyOn(syncEngine, 'addToQueue').mockResolvedValue();
        
        await expect(dbManager.createUser(mockUser, 'hashedPin123')).rejects.toThrow(
          'Connection timeout'
        );
        
        expect(queueSpy).toHaveBeenCalledWith('CREATE', 'user', mockUser.id, {
          ...mockUser,
          pinHash: 'hashedPin123'
        });
      });
    });

    describe('updateUser', () => {
      const updates = { name: 'Updated Name' };

      test('should write to PostgreSQL first when connected', async () => {
        const connectionMonitor = dbManager.getConnectionMonitor();
        const pgAdapter = dbManager.getPostgreSQLAdapter();
        const syncEngine = dbManager.getSyncEngine();
        
        const updatedUser = { ...mockUser, ...updates };
        
        // Mock connected state
        jest.spyOn(connectionMonitor, 'isConnected').mockReturnValue(true);
        
        // Mock PostgreSQL updateUser
        const pgUpdateSpy = jest.spyOn(pgAdapter, 'updateUser').mockResolvedValue(updatedUser);
        
        // Mock propagateToSQLite
        const propagateSpy = jest.spyOn(syncEngine, 'propagateToSQLite').mockResolvedValue();
        
        const result = await dbManager.updateUser(mockUser.id, updates);
        
        expect(pgUpdateSpy).toHaveBeenCalledWith(mockUser.id, updates);
        expect(propagateSpy).toHaveBeenCalledWith('UPDATE', 'user', mockUser.id, updatedUser);
        expect(result).toEqual(updatedUser);
      });

      test('should not propagate when user not found', async () => {
        const connectionMonitor = dbManager.getConnectionMonitor();
        const pgAdapter = dbManager.getPostgreSQLAdapter();
        const syncEngine = dbManager.getSyncEngine();
        
        // Mock connected state
        jest.spyOn(connectionMonitor, 'isConnected').mockReturnValue(true);
        
        // Mock PostgreSQL updateUser to return undefined
        jest.spyOn(pgAdapter, 'updateUser').mockResolvedValue(undefined);
        
        // Mock propagateToSQLite
        const propagateSpy = jest.spyOn(syncEngine, 'propagateToSQLite').mockResolvedValue();
        
        const result = await dbManager.updateUser(mockUser.id, updates);
        
        expect(result).toBeUndefined();
        expect(propagateSpy).not.toHaveBeenCalled();
      });

      test('should queue operation when PostgreSQL is unavailable', async () => {
        const connectionMonitor = dbManager.getConnectionMonitor();
        const syncEngine = dbManager.getSyncEngine();
        
        // Mock disconnected state
        jest.spyOn(connectionMonitor, 'isConnected').mockReturnValue(false);
        
        // Mock addToQueue
        const queueSpy = jest.spyOn(syncEngine, 'addToQueue').mockResolvedValue();
        
        await expect(dbManager.updateUser(mockUser.id, updates)).rejects.toThrow(
          'PostgreSQL unavailable. Operation queued for sync.'
        );
        
        expect(queueSpy).toHaveBeenCalledWith('UPDATE', 'user', mockUser.id, updates);
      });

      test('should queue operation when PostgreSQL write fails', async () => {
        const connectionMonitor = dbManager.getConnectionMonitor();
        const pgAdapter = dbManager.getPostgreSQLAdapter();
        const syncEngine = dbManager.getSyncEngine();
        
        // Mock connected state
        jest.spyOn(connectionMonitor, 'isConnected').mockReturnValue(true);
        
        // Mock PostgreSQL updateUser to fail
        const error = new Error('Connection timeout');
        jest.spyOn(pgAdapter, 'updateUser').mockRejectedValue(error);
        
        // Mock addToQueue
        const queueSpy = jest.spyOn(syncEngine, 'addToQueue').mockResolvedValue();
        
        await expect(dbManager.updateUser(mockUser.id, updates)).rejects.toThrow(
          'Connection timeout'
        );
        
        expect(queueSpy).toHaveBeenCalledWith('UPDATE', 'user', mockUser.id, updates);
      });
    });

    describe('updateUserPin', () => {
      const phoneNumber = '9876543210';
      const pinHash = 'hashedPin123';

      test('should write to PostgreSQL first when connected', async () => {
        const connectionMonitor = dbManager.getConnectionMonitor();
        const pgAdapter = dbManager.getPostgreSQLAdapter();
        const syncEngine = dbManager.getSyncEngine();
        
        // Mock connected state
        jest.spyOn(connectionMonitor, 'isConnected').mockReturnValue(true);
        
        // Mock PostgreSQL updateUserPin
        const pgUpdatePinSpy = jest.spyOn(pgAdapter, 'updateUserPin').mockResolvedValue();
        
        // Mock propagateToSQLite
        const propagateSpy = jest.spyOn(syncEngine, 'propagateToSQLite').mockResolvedValue();
        
        await dbManager.updateUserPin(phoneNumber, pinHash);
        
        expect(pgUpdatePinSpy).toHaveBeenCalledWith(phoneNumber, pinHash);
        expect(propagateSpy).toHaveBeenCalledWith('UPDATE', 'user_pin', phoneNumber, {
          phoneNumber,
          pinHash
        });
      });

      test('should queue operation when PostgreSQL is unavailable', async () => {
        const connectionMonitor = dbManager.getConnectionMonitor();
        const syncEngine = dbManager.getSyncEngine();
        
        // Mock disconnected state
        jest.spyOn(connectionMonitor, 'isConnected').mockReturnValue(false);
        
        // Mock addToQueue
        const queueSpy = jest.spyOn(syncEngine, 'addToQueue').mockResolvedValue();
        
        await expect(dbManager.updateUserPin(phoneNumber, pinHash)).rejects.toThrow(
          'PostgreSQL unavailable. Operation queued for sync.'
        );
        
        expect(queueSpy).toHaveBeenCalledWith('UPDATE', 'user_pin', phoneNumber, {
          phoneNumber,
          pinHash
        });
      });

      test('should queue operation when PostgreSQL write fails', async () => {
        const connectionMonitor = dbManager.getConnectionMonitor();
        const pgAdapter = dbManager.getPostgreSQLAdapter();
        const syncEngine = dbManager.getSyncEngine();
        
        // Mock connected state
        jest.spyOn(connectionMonitor, 'isConnected').mockReturnValue(true);
        
        // Mock PostgreSQL updateUserPin to fail
        const error = new Error('Connection timeout');
        jest.spyOn(pgAdapter, 'updateUserPin').mockRejectedValue(error);
        
        // Mock addToQueue
        const queueSpy = jest.spyOn(syncEngine, 'addToQueue').mockResolvedValue();
        
        await expect(dbManager.updateUserPin(phoneNumber, pinHash)).rejects.toThrow(
          'Connection timeout'
        );
        
        expect(queueSpy).toHaveBeenCalledWith('UPDATE', 'user_pin', phoneNumber, {
          phoneNumber,
          pinHash
        });
      });
    });
  });

  describe('Read Operations', () => {
    const mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      phoneNumber: '9876543210',
      name: 'Test User',
      userType: UserType.FARMER,
      location: {
        latitude: 28.7041,
        longitude: 77.1025,
        address: 'New Delhi, India'
      },
      createdAt: new Date()
    };

    describe('getUserByPhone', () => {
      test('should read from PostgreSQL when connected', async () => {
        const connectionMonitor = dbManager.getConnectionMonitor();
        const pgAdapter = dbManager.getPostgreSQLAdapter();
        
        // Mock connected state
        jest.spyOn(connectionMonitor, 'isConnected').mockReturnValue(true);
        
        // Mock PostgreSQL getUserByPhone
        const pgGetSpy = jest.spyOn(pgAdapter, 'getUserByPhone').mockResolvedValue(mockUser);
        
        const result = await dbManager.getUserByPhone('9876543210');
        
        expect(pgGetSpy).toHaveBeenCalledWith('9876543210');
        expect(result).toEqual(mockUser);
      });

      test('should fallback to SQLite when PostgreSQL read fails', async () => {
        const connectionMonitor = dbManager.getConnectionMonitor();
        const pgAdapter = dbManager.getPostgreSQLAdapter();
        const sqliteAdapter = dbManager.getSQLiteAdapter();
        
        // Mock connected state
        jest.spyOn(connectionMonitor, 'isConnected').mockReturnValue(true);
        
        // Mock PostgreSQL getUserByPhone to fail
        const error = new Error('Connection timeout');
        jest.spyOn(pgAdapter, 'getUserByPhone').mockRejectedValue(error);
        
        // Mock SQLite getUserByPhone
        const sqliteGetSpy = jest.spyOn(sqliteAdapter, 'getUserByPhone').mockResolvedValue(mockUser);
        
        // Mock console.warn to verify staleness warning
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        const result = await dbManager.getUserByPhone('9876543210');
        
        expect(sqliteGetSpy).toHaveBeenCalledWith('9876543210');
        expect(result).toEqual(mockUser);
        expect(warnSpy).toHaveBeenCalledWith(
          '[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.',
          error
        );
        
        warnSpy.mockRestore();
      });

      test('should serve from SQLite when PostgreSQL is unavailable', async () => {
        const connectionMonitor = dbManager.getConnectionMonitor();
        const sqliteAdapter = dbManager.getSQLiteAdapter();
        
        // Mock disconnected state
        jest.spyOn(connectionMonitor, 'isConnected').mockReturnValue(false);
        
        // Mock SQLite getUserByPhone
        const sqliteGetSpy = jest.spyOn(sqliteAdapter, 'getUserByPhone').mockResolvedValue(mockUser);
        
        // Mock console.warn to verify staleness warning
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        const result = await dbManager.getUserByPhone('9876543210');
        
        expect(sqliteGetSpy).toHaveBeenCalledWith('9876543210');
        expect(result).toEqual(mockUser);
        expect(warnSpy).toHaveBeenCalledWith(
          '[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.'
        );
        
        warnSpy.mockRestore();
      });
    });

    describe('getUserById', () => {
      test('should read from PostgreSQL when connected', async () => {
        const connectionMonitor = dbManager.getConnectionMonitor();
        const pgAdapter = dbManager.getPostgreSQLAdapter();
        
        // Mock connected state
        jest.spyOn(connectionMonitor, 'isConnected').mockReturnValue(true);
        
        // Mock PostgreSQL getUserById
        const pgGetSpy = jest.spyOn(pgAdapter, 'getUserById').mockResolvedValue(mockUser);
        
        const result = await dbManager.getUserById('123e4567-e89b-12d3-a456-426614174000');
        
        expect(pgGetSpy).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
        expect(result).toEqual(mockUser);
      });

      test('should fallback to SQLite when PostgreSQL read fails', async () => {
        const connectionMonitor = dbManager.getConnectionMonitor();
        const pgAdapter = dbManager.getPostgreSQLAdapter();
        const sqliteAdapter = dbManager.getSQLiteAdapter();
        
        // Mock connected state
        jest.spyOn(connectionMonitor, 'isConnected').mockReturnValue(true);
        
        // Mock PostgreSQL getUserById to fail
        const error = new Error('Connection timeout');
        jest.spyOn(pgAdapter, 'getUserById').mockRejectedValue(error);
        
        // Mock SQLite getUserById
        const sqliteGetSpy = jest.spyOn(sqliteAdapter, 'getUserById').mockResolvedValue(mockUser);
        
        // Mock console.warn to verify staleness warning
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        const result = await dbManager.getUserById('123e4567-e89b-12d3-a456-426614174000');
        
        expect(sqliteGetSpy).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
        expect(result).toEqual(mockUser);
        expect(warnSpy).toHaveBeenCalledWith(
          '[DatabaseManager] PostgreSQL read failed, falling back to SQLite. Data may be stale.',
          error
        );
        
        warnSpy.mockRestore();
      });

      test('should serve from SQLite when PostgreSQL is unavailable', async () => {
        const connectionMonitor = dbManager.getConnectionMonitor();
        const sqliteAdapter = dbManager.getSQLiteAdapter();
        
        // Mock disconnected state
        jest.spyOn(connectionMonitor, 'isConnected').mockReturnValue(false);
        
        // Mock SQLite getUserById
        const sqliteGetSpy = jest.spyOn(sqliteAdapter, 'getUserById').mockResolvedValue(mockUser);
        
        // Mock console.warn to verify staleness warning
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        const result = await dbManager.getUserById('123e4567-e89b-12d3-a456-426614174000');
        
        expect(sqliteGetSpy).toHaveBeenCalledWith('123e4567-e89b-12d3-a456-426614174000');
        expect(result).toEqual(mockUser);
        expect(warnSpy).toHaveBeenCalledWith(
          '[DatabaseManager] PostgreSQL unavailable, serving from SQLite. Data may be stale.'
        );
        
        warnSpy.mockRestore();
      });
    });
  });
});
