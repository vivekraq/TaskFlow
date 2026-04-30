const mongoose = require('mongoose');

if (!process.env.MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not set. Create backend/.env from backend/.env.example');
  process.exit(1);
}

// connects to mongo - mongoose handles reconnection automatically
const initDb = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
};

module.exports = { initDb };
