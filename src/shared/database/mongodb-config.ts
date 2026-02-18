import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bharat_mandi';

// Connection options
const options: mongoose.ConnectOptions = {
  maxPoolSize: 10,
  minPoolSize: 5,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
};

// Connect to MongoDB
export async function connectMongoDB(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI, options);
    console.log('✓ MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

  } catch (error) {
    console.error('✗ MongoDB connection failed:', error);
    throw error;
  }
}

// Disconnect from MongoDB
export async function disconnectMongoDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected successfully');
  } catch (error) {
    console.error('MongoDB disconnect error:', error);
    throw error;
  }
}

// Test MongoDB connection
export async function testMongoConnection(): Promise<boolean> {
  try {
    await connectMongoDB();
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }
    const adminDb = mongoose.connection.db.admin();
    const result = await adminDb.ping();
    console.log('✓ MongoDB ping successful:', result);
    return true;
  } catch (error) {
    console.error('✗ MongoDB connection test failed:', error);
    return false;
  }
}

// Get MongoDB connection status
export function getConnectionStatus(): string {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
}

// Export mongoose instance
export { mongoose };
