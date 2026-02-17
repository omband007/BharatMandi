import express from 'express';
import path from 'path';
import cors from 'cors';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api', routes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Bharat Mandi POC server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Web UI: http://localhost:${PORT}`);
});

export default app;
