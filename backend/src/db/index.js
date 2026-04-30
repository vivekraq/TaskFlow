const mongoose = require('mongoose');

// railway sets MONGO_URL automatically, locally we use MONGODB_URI from .env
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;

if (!mongoUri) {
  console.error('MONGODB_URI is not set');
  process.exit(1);
}

const initDb = async () => {
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
};

module.exports = { initDb };
