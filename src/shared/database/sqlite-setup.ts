import {
  openSQLiteDB,
  closeSQLiteDB,
  initializeSQLiteSchema,
  testSQLiteConnection,
  getSQLiteStats,
  getDatabaseSize,
  DB_PATH
} from './sqlite-config';

// Setup SQLite database
export async function setupSQLite(): Promise<void> {
  console.log('\n=== SQLite Setup ===\n');

  try {
    // Test connection
    console.log('Testing SQLite connection...');
    const connected = await testSQLiteConnection();
    
    if (!connected) {
      throw new Error('Cannot connect to SQLite database');
    }

    // Initialize schema
    console.log('\nInitializing schema...');
    await initializeSQLiteSchema();

    // Get statistics
    console.log('\nDatabase Statistics:');
    const stats = await getSQLiteStats();
    console.log(JSON.stringify(stats, null, 2));

    // Get database size
    const size = getDatabaseSize();
    console.log(`\nDatabase Size: ${(size / 1024).toFixed(2)} KB`);
    console.log(`Database Path: ${DB_PATH}`);

    console.log('\n=== SQLite Setup Complete ===\n');
  } catch (error) {
    console.error('SQLite setup failed:', error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'setup') {
    setupSQLite()
      .then(() => {
        console.log('SQLite setup completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('SQLite setup failed:', error);
        process.exit(1);
      })
      .finally(() => {
        closeSQLiteDB();
      });
  } else if (command === 'test') {
    testSQLiteConnection()
      .then((success) => {
        if (success) {
          console.log('SQLite connection test passed');
          process.exit(0);
        } else {
          console.log('SQLite connection test failed');
          process.exit(1);
        }
      })
      .catch((error) => {
        console.error('SQLite connection test error:', error);
        process.exit(1);
      })
      .finally(() => {
        closeSQLiteDB();
      });
  } else if (command === 'stats') {
    openSQLiteDB()
      .then(() => getSQLiteStats())
      .then((stats) => {
        console.log('\nSQLite Database Statistics:');
        console.log(JSON.stringify(stats, null, 2));
        
        const size = getDatabaseSize();
        console.log(`\nDatabase Size: ${(size / 1024).toFixed(2)} KB`);
        console.log(`Database Path: ${DB_PATH}`);
        
        process.exit(0);
      })
      .catch((error) => {
        console.error('Error getting stats:', error);
        process.exit(1);
      })
      .finally(() => {
        closeSQLiteDB();
      });
  } else {
    console.log('Usage:');
    console.log('  npm run sqlite:setup  - Setup SQLite database and schema');
    console.log('  npm run sqlite:test   - Test SQLite connection');
    console.log('  npm run sqlite:stats  - Get database statistics');
    process.exit(1);
  }
}
