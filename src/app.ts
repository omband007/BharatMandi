import express from 'express';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import { openSQLiteDB, initializeSQLiteSchema } from './shared/database/sqlite-config';
import { DatabaseManager } from './shared/database/db-abstraction';
import { testSequelizeConnection, syncDatabase } from './shared/database/sequelize-config';
import { i18nextMiddleware } from './features/i18n/i18n-backend.config';

// Feature controllers
import { gradingController } from './features/grading';
import { marketplaceController, mediaController } from './features/marketplace';
import { transactionController } from './features/transactions';
import { usersController } from './features/users';
import { devController } from './features/dev';
import i18nRoutes from './features/i18n/i18n.routes';
import { voiceController } from './features/i18n/voice.controller';
import kisanMitraRoutes from './features/i18n/kisan-mitra.routes';
import profileRoutes from './features/profile/routes/profile.routes';
import authRoutes from './features/profile/routes/auth.routes';

const app = express();

// Initialize DatabaseManager for dual database system
const dbManager = new DatabaseManager();

// Make dbManager globally accessible for media controller
(global as any).sharedDbManager = dbManager;

// Initialize databases on startup
(async () => {
  try {
    // Initialize PostgreSQL with Sequelize (for profile management)
    try {
      const connected = await testSequelizeConnection();
      if (connected) {
        // Sync database schema (create tables if they don't exist)
        await syncDatabase(false); // Use alter mode, not force
        console.log('✓ PostgreSQL (Sequelize) initialized');
      }
    } catch (pgError: any) {
      console.warn('⚠ PostgreSQL connection failed - profile features may not work:', pgError.message);
      console.warn('  To fix: Check PostgreSQL connection settings in .env');
    }
    
    // Initialize SQLite (required for offline cache)
    await openSQLiteDB();
    await initializeSQLiteSchema();
    console.log('✓ SQLite database initialized');
    
    // Start DatabaseManager (connection monitoring and sync engine)
    await dbManager.start();
    console.log('✓ DatabaseManager started - PostgreSQL connectivity confirmed');
  } catch (error) {
    console.error('✗ Failed to initialize databases:', error);
  }
})();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[App] Shutting down gracefully...');
  dbManager.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[App] Shutting down gracefully...');
  dbManager.stop();
  process.exit(0);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(i18nextMiddleware); // Add i18n middleware for language detection

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve media files from data/media directory
app.use('/data/media', express.static(path.join(__dirname, '../data/media')));

// Serve markdown files
app.get('/docs/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '..', filename);
  
  if (fs.existsSync(filePath) && filename.endsWith('.md')) {
    const content = fs.readFileSync(filePath, 'utf-8');
    res.type('text/plain').send(content);
  } else {
    res.status(404).send('File not found');
  }
});

// Health check with database status
app.get('/api/health', (req, res) => {
  const healthStatus = dbManager.getHealthStatus();
  const isConnected = dbManager.isPostgreSQLConnected();
  
  console.log('[Health Check] PostgreSQL connected:', isConnected);
  console.log('[Health Check] Health status:', healthStatus);
  
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    databases: {
      postgresql: {
        ...healthStatus.postgresql,
        isConnected: isConnected
      },
      sqlite: { connected: true } // SQLite is always available locally
    }
  });
});

// Feature routes
app.use('/api/v1/profiles', profileRoutes); // Profile management routes
app.use('/api/v1/profiles/auth', authRoutes); // Authentication routes
app.use('/api/grading', gradingController);
app.use('/api/marketplace', marketplaceController);
app.use('/api/marketplace', mediaController); // Media routes under /api/marketplace
app.use('/api/transactions', transactionController);
app.use('/api/users', usersController);
app.use('/api/i18n', i18nRoutes); // i18n routes
app.use('/api/voice', voiceController); // Voice routes
app.use('/api/kisan-mitra', kisanMitraRoutes); // Kisan Mitra AI assistant routes

// Development routes (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', devController);
  console.log('✓ Development endpoints enabled at /api/dev');
}

export default app;
