const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const passageRoutes = require('./routes/passage');
const sessionRoutes = require('./routes/session');
const drillRoutes = require('./routes/drill');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api', passageRoutes);
app.use('/api', sessionRoutes);
app.use('/api', drillRoutes);

// Serve static frontend files
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

// Catch-all route to serve the React app for non-API requests
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Fallback 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[Flow Backend] Server running on http://localhost:${PORT}`);
});
