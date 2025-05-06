const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const config = require('../config.json');

const pool = new Pool({
  host: config.rds_host,
  port: config.rds_port,
  user: config.rds_user,
  password: config.rds_password,
  database: config.rds_database,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Create or update user
router.post('/', async (req, res) => {
    const { user_id, first_name, last_name, email } = req.body;
  
    if (!user_id || !first_name || !last_name || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
  
    try {
      await pool.query(
        `INSERT INTO users (user_id, first_name, last_name, email, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (user_id) DO UPDATE
         SET first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name,
             email = EXCLUDED.email`,
        [user_id, first_name, last_name, email]
      );
      res.status(201).json({ message: 'User created/updated successfully' });
    } catch (err) {
      console.error('Error creating/updating user:', err.stack); // Log full stack
      res.status(500).json({ error: 'Internal server error', details: err.message });
    }
  });

// Update user preferences
router.put('/:userId/preferences', async (req, res) => {
  const { userId } = req.params;
  const {
    min_budget,
    max_budget,
    work_zip_code,
    roommate_status,
    sleep_time,
    wake_time,
    cleanliness,
    noise_tolerance,
    guest_frequency,
    smoking_preference,
    drinking_preference,
    pet_preference,
  } = req.body;

  console.log('Received preferences:', req.body);

  try {
    // Get IDs for preference descriptions
    const queries = [
      roommate_status ? pool.query('SELECT roommate_status_id FROM roommate_status WHERE description = $1', [roommate_status]) : null,
      sleep_time ? pool.query('SELECT sleep_time_id FROM sleep_time WHERE description = $1', [sleep_time]) : null,
      wake_time ? pool.query('SELECT wake_time_id FROM wake_time WHERE description = $1', [wake_time]) : null,
      cleanliness ? pool.query('SELECT cleanliness_id FROM cleanliness WHERE description = $1', [cleanliness]) : null,
      noise_tolerance ? pool.query('SELECT noise_tolerance_id FROM noise_tolerance WHERE description = $1', [noise_tolerance]) : null,
      guest_frequency ? pool.query('SELECT guest_frequency_id FROM guest_frequency WHERE description = $1', [guest_frequency]) : null,
      smoking_preference ? pool.query('SELECT smoking_preference_id FROM smoking_preference WHERE description = $1', [smoking_preference]) : null,
      drinking_preference ? pool.query('SELECT drinking_preference_id FROM drinking_preference WHERE description = $1', [drinking_preference]) : null,
      pet_preference ? pool.query('SELECT pet_preference_id FROM pet_preference WHERE description = $1', [pet_preference]) : null,
    ];

    const results = await Promise.all(queries);
    console.log('Query results:', results.map(r => r?.rows));
    
    const [
      roommate_status_res,
      sleep_time_res,
      wake_time_res,
      cleanliness_res,
      noise_tolerance_res,
      guest_frequency_res,
      smoking_preference_res,
      drinking_preference_res,
      pet_preference_res,
    ] = results;

    await pool.query(
      `INSERT INTO user_preferences (
        user_id, min_budget, max_budget, work_zip_code,
        roommate_status_id, sleep_time_id, wake_time_id,
        cleanliness_id, noise_tolerance_id, guest_frequency_id,
        smoking_preference_id, drinking_preference_id, pet_preference_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (user_id) DO UPDATE
      SET min_budget = EXCLUDED.min_budget,
          max_budget = EXCLUDED.max_budget,
          work_zip_code = EXCLUDED.work_zip_code,
          roommate_status_id = EXCLUDED.roommate_status_id,
          sleep_time_id = EXCLUDED.sleep_time_id,
          wake_time_id = EXCLUDED.wake_time_id,
          cleanliness_id = EXCLUDED.cleanliness_id,
          noise_tolerance_id = EXCLUDED.noise_tolerance_id,
          guest_frequency_id = EXCLUDED.guest_frequency_id,
          smoking_preference_id = EXCLUDED.smoking_preference_id,
          drinking_preference_id = EXCLUDED.drinking_preference_id,
          pet_preference_id = EXCLUDED.pet_preference_id`,
      [
        userId,
        min_budget,
        max_budget,
        work_zip_code,
        roommate_status_res?.rows[0]?.roommate_status_id || null,
        sleep_time_res?.rows[0]?.sleep_time_id || null,
        wake_time_res?.rows[0]?.wake_time_id || null,
        cleanliness_res?.rows[0]?.cleanliness_id || null,
        noise_tolerance_res?.rows[0]?.noise_tolerance_id || null,
        guest_frequency_res?.rows[0]?.guest_frequency_id || null,
        smoking_preference_res?.rows[0]?.smoking_preference_id || null,
        drinking_preference_res?.rows[0]?.drinking_preference_id || null,
        pet_preference_res?.rows[0]?.pet_preference_id || null,
      ]
    );

    res.json({ message: 'Preferences updated successfully' });
  } catch (err) {
    console.error('Error updating preferences:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;