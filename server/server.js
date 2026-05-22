require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDatabase, seedDatabase } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure data and uploads directories exist
fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/farms', require('./routes/farms'));
app.use('/api/visitors', require('./routes/visitors'));
app.use('/api/biosecurity', require('./routes/biosecurity'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/warnings', require('./routes/warnings'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    await seedDatabase();
    app.listen(PORT, () => {
      console.log(`\n🚀 Farm Portal Server running on http://localhost:${PORT}`);
      console.log(`📊 API available at http://localhost:${PORT}/api`);
      console.log(`🔑 Demo: demo@farm.com / demo123\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

