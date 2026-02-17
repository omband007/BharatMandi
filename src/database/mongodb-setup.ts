import { connectMongoDB, disconnectMongoDB, testMongoConnection } from './mongodb-config';
import { createIndexes, getCollectionStats } from './mongodb-models';

// Setup MongoDB collections and indexes
export async function setupMongoDB(): Promise<void> {
  console.log('\n=== MongoDB Setup ===\n');

  try {
    // Test connection
    console.log('Testing MongoDB connection...');
    const connected = await testMongoConnection();
    
    if (!connected) {
      throw new Error('Cannot connect to MongoDB');
    }

    // Create indexes
    console.log('\nCreating indexes...');
    await createIndexes();

    // Get collection stats
    console.log('\nCollection Statistics:');
    const stats = await getCollectionStats();
    console.log(JSON.stringify(stats, null, 2));

    console.log('\n=== MongoDB Setup Complete ===\n');
  } catch (error) {
    console.error('MongoDB setup failed:', error);
    throw error;
  }
}

// CLI execution
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'setup') {
    setupMongoDB()
      .then(() => {
        console.log('MongoDB setup completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('MongoDB setup failed:', error);
        process.exit(1);
      })
      .finally(() => {
        disconnectMongoDB();
      });
  } else if (command === 'test') {
    testMongoConnection()
      .then((success) => {
        if (success) {
          console.log('MongoDB connection test passed');
          process.exit(0);
        } else {
          console.log('MongoDB connection test failed');
          process.exit(1);
        }
      })
      .catch((error) => {
        console.error('MongoDB connection test error:', error);
        process.exit(1);
      })
      .finally(() => {
        disconnectMongoDB();
      });
  } else if (command === 'stats') {
    connectMongoDB()
      .then(() => getCollectionStats())
      .then((stats) => {
        console.log('\nMongoDB Collection Statistics:');
        console.log(JSON.stringify(stats, null, 2));
        process.exit(0);
      })
      .catch((error) => {
        console.error('Error getting stats:', error);
        process.exit(1);
      })
      .finally(() => {
        disconnectMongoDB();
      });
  } else {
    console.log('Usage:');
    console.log('  npm run mongodb:setup  - Setup MongoDB collections and indexes');
    console.log('  npm run mongodb:test   - Test MongoDB connection');
    console.log('  npm run mongodb:stats  - Get collection statistics');
    process.exit(1);
  }
}
