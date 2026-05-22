const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/farm-portal';

/**
 * Initialize MongoDB connection using Mongoose
 */
async function initDatabase() {
  try {
    console.log(`🔌 Connecting to MongoDB at ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected successfully.');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
}

/**
 * Seed database with clean starting points
 * (No fake/mock data added, as requested)
 */
async function seedDatabase() {
  console.log('🌱 Production mode active: database starts clean. Use sign-up to create accounts.');
}

module.exports = {
  initDatabase,
  seedDatabase,
  connection: mongoose.connection
};
