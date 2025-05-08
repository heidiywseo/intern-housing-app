const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load config.json
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// PostgreSQL client
const pool = new Pool({
  host: config.rds_host,
  user: config.rds_user,
  password: config.rds_password,
  port: config.rds_port,
  database: config.rds_database,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Middleware to check if user is authenticated
const authenticate = (req, res, next) => {
  if (!req.user || !req.user.user_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Check if user preferences are complete
router.get('/preferences/check', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const user_id = req.user.user_id;
    const query = `
      SELECT 
        min_budget,
        max_budget,
        work_zip_code,
        roommate_status_id,
        sleep_time_id,
        wake_time_id,
        cleanliness_id,
        noise_tolerance_id,
        guest_frequency_id,
        smoking_preference_id,
        drinking_preference_id,
        pet_preference_id
      FROM users
      WHERE user_id = $1
    `;
    const result = await client.query(query, [user_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    console.log('User preferences for', user_id, ':', user);

    const requiredFields = [
      'min_budget',
      'max_budget',
      'work_zip_code',
      'roommate_status_id',
      'sleep_time_id',
      'wake_time_id',
      'cleanliness_id',
      'noise_tolerance_id',
      'guest_frequency_id',
      'smoking_preference_id',
      'drinking_preference_id',
      'pet_preference_id',
    ];

    const incompleteFields = requiredFields.filter(field => {
      if (['min_budget', 'max_budget'].includes(field)) {
        return user[field] === null || user[field] === undefined;
      }
      if (field === 'work_zip_code') {
        return !user[field] || user[field].trim() === '';
      }
      return user[field] === null || user[field] === undefined;
    });

    if (incompleteFields.length > 0) {
      console.log('Incomplete fields for', user_id, ':', incompleteFields);
      return res.status(200).json({
        isComplete: false,
        incompleteFields,
        userData: user,
      });
    }

    return res.status(200).json({ isComplete: true });
  } catch (err) {
    console.error('Error checking user preferences:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  } finally {
    client.release();
  }
});

// Opt in for roommate matching for a listing
router.post('/listings/:id/opt-in', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const user_id = req.user.user_id;
    const listing_id = req.params.id;

    const listingQuery = `SELECT id FROM airbnb_listings WHERE id = $1`;
    const listingResult = await client.query(listingQuery, [listing_id]);
    if (listingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const optInQuery = `
      SELECT user_id, listing_id FROM listing_roommate_opt_ins
      WHERE user_id = $1 AND listing_id = $2
    `;
    const optInResult = await client.query(optInQuery, [user_id, listing_id]);
    if (optInResult.rows.length > 0) {
      return res.status(400).json({ error: 'User already opted in for this listing' });
    }

    const insertQuery = `
      INSERT INTO listing_roommate_opt_ins (user_id, listing_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    const insertResult = await client.query(insertQuery, [user_id, listing_id]);

    return res.status(201).json({
      message: 'Successfully opted in for roommate matching',
      optIn: insertResult.rows[0],
    });
  } catch (err) {
    console.error('Error opting in for roommate:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  } finally {
    client.release();
  }
});

// Opt out of roommate matching for a listing
router.delete('/listings/:id/opt-in', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const user_id = req.user.user_id;
    const listing_id = req.params.id;

    const listingQuery = `SELECT id FROM airbnb_listings WHERE id = $1`;
    const listingResult = await client.query(listingQuery, [listing_id]);
    if (listingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const optInQuery = `
      SELECT user_id, listing_id FROM listing_roommate_opt_ins
      WHERE user_id = $1 AND listing_id = $2
    `;
    const optInResult = await client.query(optInQuery, [user_id, listing_id]);
    if (optInResult.rows.length === 0) {
      return res.status(400).json({ error: 'User is not opted in for this listing' });
    }

    const deleteQuery = `
      DELETE FROM listing_roommate_opt_ins
      WHERE user_id = $1 AND listing_id = $2
      RETURNING *
    `;
    const deleteResult = await client.query(deleteQuery, [user_id, listing_id]);

    return res.status(200).json({
      message: 'Successfully opted out of roommate matching',
      deleted: deleteResult.rows[0],
    });
  } catch (err) {
    console.error('Error opting out of roommate:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  } finally {
    client.release();
  }
});

// Check if user is opted in for a listing
router.get('/listings/:id/opt-in/status', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const user_id = req.user.user_id;
    const listing_id = req.params.id;

    const listingQuery = `SELECT id FROM airbnb_listings WHERE id = $1`;
    const listingResult = await client.query(listingQuery, [listing_id]);
    if (listingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const optInQuery = `
      SELECT user_id, listing_id FROM listing_roommate_opt_ins
      WHERE user_id = $1 AND listing_id = $2
    `;
    const optInResult = await client.query(optInQuery, [user_id, listing_id]);

    return res.status(200).json({
      isOptedIn: optInResult.rows.length > 0,
    });
  } catch (err) {
    console.error('Error checking opt-in status:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  } finally {
    client.release();
  }
});

// Fetch users who opted in for a listing (include all opted-in users)
router.get('/listings/:id/roommates', async (req, res) => {
  const client = await pool.connect();
  try {
    const listing_id = req.params.id;
    const user_id = req.user?.user_id || null;

    // Check if listing exists
    const listingQuery = `SELECT id FROM airbnb_listings WHERE id = $1`;
    const listingResult = await client.query(listingQuery, [listing_id]);
    if (listingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Fetch raw opt-in records
    const optInQuery = `
      SELECT user_id, listing_id, opted_in_at
      FROM listing_roommate_opt_ins
      WHERE listing_id = $1
    `;
    const optInResult = await client.query(optInQuery, [listing_id]);
    console.log(`Raw opt-in records for listing ${listing_id}:`, optInResult.rows);

    // Fetch opted-in users with LEFT JOIN
    const query = `
      SELECT u.user_id, u.first_name, u.last_name, u.email
      FROM listing_roommate_opt_ins ro
      LEFT JOIN users u ON ro.user_id = u.user_id
      WHERE ro.listing_id = $1
    `;
    const result = await client.query(query, [listing_id]);
    console.log(`Roommates for listing ${listing_id} (current user: ${user_id || 'none'}):`, result.rows);

    return res.status(200).json({
      roommates: result.rows
        .filter(row => row.user_id !== null)
        .map(row => ({
          id: row.user_id,
          name: `${row.first_name || 'Unknown'} ${row.last_name || ''}`.trim(),
          email: row.email || 'No email provided',
        })),
    });
  } catch (err) {
    console.error('Error fetching roommates:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  } finally {
    client.release();
  }
});

// Debug endpoint to fetch raw opt-in records for a listing
router.get('/listings/:id/opt-ins', async (req, res) => {
  const client = await pool.connect();
  try {
    const listing_id = req.params.id;

    const listingQuery = `SELECT id FROM airbnb_listings WHERE id = $1`;
    const listingResult = await client.query(listingQuery, [listing_id]);
    if (listingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const query = `
      SELECT user_id, listing_id, opted_in_at
      FROM listing_roommate_opt_ins
      WHERE listing_id = $1
    `;
    const result = await client.query(query, [listing_id]);
    console.log(`Opt-in records for listing ${listing_id}:`, result.rows);

    return res.status(200).json({
      optIns: result.rows,
    });
  } catch (err) {
    console.error('Error fetching opt-in records:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;