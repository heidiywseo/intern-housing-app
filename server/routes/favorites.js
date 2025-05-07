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

// Middleware to check if user is authenticated
const authenticate = (req, res, next) => {
  if (!req.user || !req.user.user_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// POST /favorites - Add a listing to favorites
router.post('/', authenticate, async (req, res) => {
  const { listing_id } = req.body;
  const user_id = req.user.user_id;

  if (!listing_id) {
    return res.status(400).json({ error: 'Listing ID is required' });
  }

  try {
    // Check if listing exists
    const listingCheck = await pool.query('SELECT id FROM airbnb_listings WHERE id = $1', [listing_id]);
    if (listingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Insert into user_favorites
    await pool.query(
      'INSERT INTO user_favorites (user_id, listing_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [user_id, listing_id]
    );
    res.status(201).json({ message: 'Listing added to favorites' });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /favorites/:listing_id - Remove a listing from favorites
router.delete('/:listing_id', authenticate, async (req, res) => {
  const { listing_id } = req.params;
  const user_id = req.user.user_id;

  try {
    const result = await pool.query(
      'DELETE FROM user_favorites WHERE user_id = $1 AND listing_id = $2',
      [user_id, listing_id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }
    res.status(200).json({ message: 'Listing removed from favorites' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /favorites - Retrieve user's favorite listings
router.get('/', authenticate, async (req, res) => {
  const user_id = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT al.id AS listing_id, al.name, al.price_per_month, al.description, al.picture_url,
              al.bedrooms, al.beds, al.room_type, ars.review_scores_rating AS rating
       FROM user_favorites uf
       JOIN airbnb_listings al ON uf.listing_id = al.id
       LEFT JOIN airbnb_review_summary ars ON al.id = ars.listing_id
       WHERE uf.user_id = $1
       ORDER BY uf.saved_at DESC`,
      [user_id]
    );

    const favorites = result.rows.map((listing) => ({
      id: listing.listing_id,
      title: listing.name,
      price: listing.price_per_month,
      description: listing.description || 'No description available',
      images: [listing.picture_url || 'https://via.placeholder.com/400x200?text=No+Image'],
      bedrooms: listing.bedrooms || '--',
      bathrooms: listing.beds || '--',
      area: '--',
      roomType: listing.room_type,
      rating: listing.rating,
    }));

    res.status(200).json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;