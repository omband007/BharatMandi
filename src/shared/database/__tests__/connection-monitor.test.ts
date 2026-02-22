import { ConnectionMonitor } from '../connection-monitor';
import { PostgreSQLAdapter } from '../pg-adapter';

describe('ConnectionMonitor', () => {
  let monitor: ConnectionMonitor;
  let mockPgAdapter: jest.Mocked<PostgreSQLAdapter>;

  beforeEach(() => {
    // Create mock PostgreSQL adapter
    mockPgAdapter = {
      checkConnection: jest.fn()
    } as any;

    monitor = new ConnectionMonitor(mockPgAdapter);
  });

  afterEach(() => {
    monitor.stop();
  });

  describe('start and stop', () => {
    it('should start monitoring and perform initial check', async () => {
      mockPgAdapter.checkConnection.mockResolvedValue(true);

      monitor.start();

      // Wait for initial check
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockPgAdapter.checkConnection).toHaveBeenCalled();
      expect(monitor.isConnected()).toBe(true);
    });

    it('should stop monitoring when stop is called', () => {
      monitor.start();
      monitor.stop();

      // Verify interval is cleared (no way to directly test, but stop should not throw)
      expect(() => monitor.stop()).not.toThrow();
    });
  });

  describe('connectivity checking', () => {
    it('should emit "connected" event when connection is established', (done) => {
      mockPgAdapter.checkConnection.mockResolvedValue(true);

      monitor.on('connected', () => {
        expect(monitor.isConnected()).toBe(true);
        done();
      });

      monitor.start();
    });

    it('should emit "disconnected" event when connection is lost', (done) => {
      // First check: connected
      mockPgAdapter.checkConnection.mockResolvedValueOnce(true);
      
      monitor.on('connected', () => {
        // Second check: disconnected
        mockPgAdapter.checkConnection.mockResolvedValueOnce(false);
      });

      monitor.on('disconnected', () => {
        expect(monitor.isConnected()).toBe(false);
        done();
      });

      monitor.start();

      // Trigger second check after initial connection
      setTimeout(() => {
        (monitor as any).checkConnectivity();
      }, 100);
    });

    it('should not emit events when state does not change', async () => {
      mockPgAdapter.checkConnection.mockResolvedValue(true);

      const connectedSpy = jest.fn();
      const disconnectedSpy = jest.fn();

      monitor.on('connected', connectedSpy);
      monitor.on('disconnected', disconnectedSpy);

      monitor.start();

      // Wait for initial check
      await new Promise(resolve => setTimeout(resolve, 100));

      // Trigger another check with same state
      await (monitor as any).checkConnectivity();

      // Should only emit once for initial connection
      expect(connectedSpy).toHaveBeenCalledTimes(1);
      expect(disconnectedSpy).not.toHaveBeenCalled();
    });

    it('should update last check time on each check', async () => {
      mockPgAdapter.checkConnection.mockResolvedValue(true);

      expect(monitor.getLastCheckTime()).toBeNull();

      monitor.start();

      // Wait for initial check
      await new Promise(resolve => setTimeout(resolve, 100));

      const firstCheckTime = monitor.getLastCheckTime();
      expect(firstCheckTime).not.toBeNull();

      // Wait and trigger another check
      await new Promise(resolve => setTimeout(resolve, 50));
      await (monitor as any).checkConnectivity();

      const secondCheckTime = monitor.getLastCheckTime();
      expect(secondCheckTime).not.toBeNull();
      expect(secondCheckTime!.getTime()).toBeGreaterThanOrEqual(firstCheckTime!.getTime());
    });
  });

  describe('isConnected', () => {
    it('should return false initially', () => {
      expect(monitor.isConnected()).toBe(false);
    });

    it('should return true when connected', async () => {
      mockPgAdapter.checkConnection.mockResolvedValue(true);

      monitor.start();

      // Wait for initial check
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(monitor.isConnected()).toBe(true);
    });

    it('should return false when disconnected', async () => {
      mockPgAdapter.checkConnection.mockResolvedValue(false);

      monitor.start();

      // Wait for initial check
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(monitor.isConnected()).toBe(false);
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status with connectivity and last check time', async () => {
      mockPgAdapter.checkConnection.mockResolvedValue(true);

      monitor.start();

      // Wait for initial check
      await new Promise(resolve => setTimeout(resolve, 100));

      const healthStatus = monitor.getHealthStatus();

      expect(healthStatus).toHaveProperty('connected');
      expect(healthStatus).toHaveProperty('lastCheck');
      expect(healthStatus.connected).toBe(true);
      expect(healthStatus.lastCheck).toBeInstanceOf(Date);
    });

    it('should return null for lastCheck before any check', () => {
      const healthStatus = monitor.getHealthStatus();

      expect(healthStatus.connected).toBe(false);
      expect(healthStatus.lastCheck).toBeNull();
    });
  });

  describe('periodic checking', () => {
    it('should check connectivity every 30 seconds', async () => {
      jest.useFakeTimers();
      mockPgAdapter.checkConnection.mockResolvedValue(true);

      monitor.start();

      // Initial check
      await Promise.resolve();
      expect(mockPgAdapter.checkConnection).toHaveBeenCalledTimes(1);

      // Advance 30 seconds
      jest.advanceTimersByTime(30000);
      await Promise.resolve();
      expect(mockPgAdapter.checkConnection).toHaveBeenCalledTimes(2);

      // Advance another 30 seconds
      jest.advanceTimersByTime(30000);
      await Promise.resolve();
      expect(mockPgAdapter.checkConnection).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });
  });
});
