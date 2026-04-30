require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./src/db');

const app = express();
const PORT = process.env.PORT || 5000;

// log what's available so we can debug on Railway
console.log('env check:', {
  hasMongo: !!(process.env.MONGODB_URI || process.env.MONGO_URL),
  hasJwt: !!process.env.JWT_SECRET,
  nodeEnv: process.env.NODE_ENV,
});

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/projects', require('./src/routes/projects'));
app.use('/api/dashboard', require('./src/routes/dashboard'));
app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

// serve the built frontend in production
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.get('*', (req, res) => {
  const index = path.join(publicDir, 'index.html');
  res.sendFile(index, (err) => {
    if (err) res.status(200).json({ api: 'Project Tracker API' });
  });
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

initDb()
  .then(() => app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`)))
  .catch((err) => { console.error('DB init failed:', err); process.exit(1); });
