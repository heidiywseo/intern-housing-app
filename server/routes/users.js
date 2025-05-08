const express = require('express');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Load config.json
const configPath = path.join(__dirname, '../config.json');
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

// Map preference descriptions to IDs
async function getPreferenceId(client, table, description) {
  if (!description) return null;
  const query = `SELECT ${table}_id FROM ${table} WHERE description = $1`;
  const result = await client.query(query, [description]);
  return result.rows[0] ? result.rows[0][`${table}_id`] : null;
}

// Check if user exists
router.get('/check', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const client = await pool.connect();
    try {
      const userQuery = 'SELECT user_id FROM users WHERE user_id = $1';
      const userResult = await client.query(userQuery, [userId]);
      res.status(200).json({ exists: userResult.rows.length > 0 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error checking user:', error);
    res.status(500).json({ error: 'Failed to check user' });
  }
});

// Create user endpoint
router.post('/create', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      userId,
      firstName,
      lastName,
      email,
      minBudget,
      maxBudget,
      workLocation,
      roommateStatus,
      sleepTime,
      wakeTime,
      cleanliness,
      noiseTolerance,
      guests,
      smoking,
      drinking,
      pets,
    } = req.body;

    // Map preference descriptions to IDs
    const roommateStatusId = await getPreferenceId(client, 'roommate_status', roommateStatus);
    const sleepTimeId = await getPreferenceId(client, 'sleep_time', sleepTime);
    const wakeTimeId = await getPreferenceId(client, 'wake_time', wakeTime);
    const cleanlinessId = await getPreferenceId(client, 'cleanliness', cleanliness);
    const noiseToleranceId = await getPreferenceId(client, 'noise_tolerance', noiseTolerance);
    const guestFrequencyId = await getPreferenceId(client, 'guest_frequency', guests);
    const smokingPreferenceId = await getPreferenceId(client, 'smoking_preference', smoking);
    const drinkingPreferenceId = await getPreferenceId(client, 'drinking_preference', drinking);
    const petPreferenceId = await getPreferenceId(client, 'pet_preference', pets);

    // Insert into users table
    const query = `
      INSERT INTO users (
        user_id, first_name, last_name, email, min_budget, max_budget, work_zip_code,
        roommate_status_id, sleep_time_id, wake_time_id, cleanliness_id,
        noise_tolerance_id, guest_frequency_id, smoking_preference_id,
        drinking_preference_id, pet_preference_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (user_id) DO NOTHING
      RETURNING user_id
    `;
    const values = [
      userId,
      firstName || '',
      lastName || '',
      email || '',
      minBudget ? parseFloat(minBudget) : null,
      maxBudget ? parseFloat(maxBudget) : null,
      workLocation || null,
      roommateStatusId,
      sleepTimeId,
      wakeTimeId,
      cleanlinessId,
      noiseToleranceId,
      guestFrequencyId,
      smokingPreferenceId,
      drinkingPreferenceId,
      petPreferenceId,
    ];

    const result = await client.query(query, values);
    res.status(201).json({ message: 'User created', userId: result.rows[0]?.user_id });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  } finally {
    client.release();
  }
});

// Update user endpoint
router.post('/update', async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      userId,
      firstName,
      lastName,
      email,
      minBudget,
      maxBudget,
      workLocation,
      roommateStatus,
      sleepTime,
      wakeTime,
      cleanliness,
      noiseTolerance,
      guests,
      smoking,
      drinking,
      pets,
    } = req.body;

    // Map preference descriptions to IDs
    const roommateStatusId = await getPreferenceId(client, 'roommate_status', roommateStatus);
    const sleepTimeId = await getPreferenceId(client, 'sleep_time', sleepTime);
    const wakeTimeId = await getPreferenceId(client, 'wake_time', wakeTime);
    const cleanlinessId = await getPreferenceId(client, 'cleanliness', cleanliness);
    const noiseToleranceId = await getPreferenceId(client, 'noise_tolerance', noiseTolerance);
    const guestFrequencyId = await getPreferenceId(client, 'guest_frequency', guests);
    const smokingPreferenceId = await getPreferenceId(client, 'smoking_preference', smoking);
    const drinkingPreferenceId = await getPreferenceId(client, 'drinking_preference', drinking);
    const petPreferenceId = await getPreferenceId(client, 'pet_preference', pets);

    // Update users table
    const query = `
      INSERT INTO users (
        user_id, first_name, last_name, email, min_budget, max_budget, work_zip_code,
        roommate_status_id, sleep_time_id, wake_time_id, cleanliness_id,
        noise_tolerance_id, guest_frequency_id, smoking_preference_id,
        drinking_preference_id, pet_preference_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (user_id) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        email = EXCLUDED.email,
        min_budget = EXCLUDED.min_budget,
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
        pet_preference_id = EXCLUDED.pet_preference_id
      RETURNING user_id
    `;
    const values = [
      userId,
      firstName || '',
      lastName || '',
      email || '',
      minBudget ? parseFloat(minBudget) : null,
      maxBudget ? parseFloat(maxBudget) : null,
      workLocation || null,
      roommateStatusId,
      sleepTimeId,
      wakeTimeId,
      cleanlinessId,
      noiseToleranceId,
      guestFrequencyId,
      smokingPreferenceId,
      drinkingPreferenceId,
      petPreferenceId,
    ];

    const result = await client.query(query, values);
    res.status(200).json({ message: 'User updated', userId: result.rows[0]?.user_id });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  } finally {
    client.release();
  }
});

module.exports = router;