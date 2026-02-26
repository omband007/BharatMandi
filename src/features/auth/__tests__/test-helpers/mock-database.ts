/**
 * Mock Database Helper for Auth Service Tests
 * 
 * Provides mock DatabaseManager configuration for testing auth service functions
 * without requiring actual database connections.
 */

/**
 * Create mock DatabaseManager for testing
 * 
 * Returns a mock object that mimics the DatabaseManager interface with
 * Jest mock functions for all database operations.
 */
export function createMockDatabaseManager() {
  const mockDb = {
    prepare: jest.fn().mockReturnValue({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn()
    })
  };

  return {
    db: mockDb
  };
}

/**
 * Configure mock database with default behavior
 * 
 * Sets up default successful responses for common database operations.
 * Individual tests can override these defaults as needed.
 * 
 * @param mockDb - The mock database manager created by createMockDatabaseManager()
 */
export function configureMockDatabase(mockDb: ReturnType<typeof createMockDatabaseManager>) {
  // Configure default successful responses
  mockDb.db.prepare().run.mockReturnValue({ changes: 1 });
  mockDb.db.prepare().get.mockReturnValue(null);
  mockDb.db.prepare().all.mockReturnValue([]);
}
