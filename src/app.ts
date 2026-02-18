import express from 'express';
import path from 'path';
import cors from 'cors';
import fs from 'fs';

// Feature controllers
import { authController } from './features/auth';
import { gradingController } from './features/grading';
import { marketplaceController } from './features/marketplace';
import { transactionController } from './features/transactions';
import { usersController } from './features/users';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Feature routes
app.use('/api/auth', authController);
app.use('/api/grading', gradingController);
app.use('/api/marketplace', marketplaceController);
app.use('/api/transactions', transactionController);
app.use('/api/users', usersController);

export default app;
