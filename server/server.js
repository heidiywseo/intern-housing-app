const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const config = require('./config.json');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const pool = new Pool({
  host: config.rds_host,
  port: config.rds_port,
  user: config.rds_user,
  password: config.rds_password,
  database: config.rds_database,
  ssl: { rejectUnauthorized: false }
});
pool.on('error', (err) => {
  console.error('Unexpected idle client error', err);
  process.exit(-1);
});

app.get('/ping', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW()');
    return res.json({ now: rows[0].now });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Mount routes
const listingsRoutes = require('./routes/listings');
const usersRoutes = require('./routes/users');
app.use('/listings', listingsRoutes);
app.use('/users', usersRoutes);

app.listen(
  config.server_port,
  () => console.log(
    `Server running at http://${config.server_host}:${config.server_port}/`
  )
);

module.exports = app;