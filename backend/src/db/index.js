const mongoose = require('mongoose');

// railway sets MONGO_URL automatically, locally we use MONGODB_URI from .env
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;

if (!mongoUri) {
  console.error('ERROR: No MongoDB connection string found.');
  console.error('Set MONGODB_URI in .env (local) or connect a MongoDB service (Railway).');
  console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('MONGO')).join(', ') || 'none');
  process.exit(1);
}

// connects to mongo - mongoose handles reconnection automatically
const initDb = async () => {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
};

module.exports = { initDb };
