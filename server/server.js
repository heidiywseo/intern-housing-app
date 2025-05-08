const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load config.json
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// PostgreSQL client
const pool = new Pool({
  user: config.rds_user,
  host: config.rds_host,
  database: config.rds_database,
  password: config.rds_password,
  port: config.rds_port,
  ssl: { rejectUnauthorized: false },
});

const app = express();
app.use(cors());
app.use(express.json());

// Middleware to extract and verify user_id from headers
app.use(async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (userId) {
    try {
      const client = await pool.connect();
      try {
        const userQuery = 'SELECT user_id FROM users WHERE user_id = $1';
        const userResult = await client.query(userQuery, [userId]);
        if (userResult.rows.length > 0) {
          req.user = { user_id: userId };
        }
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('Error verifying user:', err);
    }
  }
  next();
});

// Mount routes
const listingsRoutes = require('./routes/listings');
app.use('/listings', listingsRoutes);

const userRoutes = require('./routes/users');
app.use('/api/users', userRoutes);

const favoritesRoutes = require('./routes/favorites');
app.use('/favorites', favoritesRoutes);

const roommateRouter = require('./routes/roommate');
app.use('/roommate', roommateRouter);

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

const PORT = config.server_port || 3000;
const HOST = config.server_host || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});