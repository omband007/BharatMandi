import app from './app';

const PORT = parseInt(process.env.PORT || '3000');

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Bharat Mandi POC server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Web UI: http://localhost:${PORT}`);
});

export default app;
