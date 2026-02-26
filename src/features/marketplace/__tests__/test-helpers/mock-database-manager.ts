/**
 * Mock DatabaseManager for Marketplace Controller Tests
 * 
 * Provides a mock DatabaseManager instance for testing
 * to enable isolated controller testing without real database operations.
 */

import type { DatabaseManager } from '../../../../shared/database/db-abstraction';

/**
 * Create mock DatabaseManager with required methods
 */
export function createMockDatabaseManager(): Partial<DatabaseManager> {
  return {
    start: jest.fn(),
    stop: jest.fn(),
    getPostgreSQLAdapter: jest.fn(),
    getSQLiteAdapter: jest.fn(),
    getConnectionMonitor: jest.fn(),
    getSyncEngine: jest.fn(),
    isPostgreSQLConnected: jest.fn().mockReturnValue(true),
    getHealthStatus: jest.fn().mockReturnValue({
      postgresql: {
        connected: true,
        lastCheck: new Date()
      }
    })
  };
}
