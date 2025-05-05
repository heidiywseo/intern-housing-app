const { Pool } = require('pg');
const config = require('../config.json');

const pool = new Pool({
  host: config.rds_host,
  user: config.rds_user,
  password: config.rds_password,
  port: config.rds_port,
  database: config.rds_db,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Connected');
    const res = await client.query('SELECT DISTINCT region FROM airbnb LIMIT 10;');
    console.log(res);
    client.release();
  } catch (err) {
    console.error('no connection', err);
  } finally {
    await pool.end(); 
  }
}

testConnection();
