const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const config = require('../config.json');

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

const placesMap = {
  gym: { table: 'leisure', column: 'leisure_type', values: ['fitness_centre'] },
  supermarket: { table: 'shop', column: 'shop_type', values: ['supermarket', 'grocery'] },
};

router.get('/search', async (req, res) => {
  try {
    const min_rating = Number(req.query.min_rating) || 0;
    const min_price = Number(req.query.min_price) || 0;
    const max_price = Number(req.query.max_price) || 999999;
    const distance = Number(req.query.distance) || 10000; // Default 10km in meters
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);
    const room_type = req.query.room_type || 'any';
    const page = parseInt(req.query.page, 10) || 1;
    const page_size = parseInt(req.query.page_size, 10) || 20;
    const offset = (page - 1) * page_size;

    let places = [];
    try {
      places = req.query.places ? JSON.parse(req.query.places) : [];
      if (!Array.isArray(places)) throw new Error();
    } catch {
      return res.status(400).json({ error: 'Invalid places format' });
    }

    let amenities = [];
    try {
      amenities = req.query.amenities ? JSON.parse(req.query.amenities) : [];
      if (!Array.isArray(amenities)) throw new Error();
    } catch {
      return res.status(400).json({ error: 'Invalid amenities format' });
    }

    // Validate inputs
    if (min_rating < 0 || min_rating > 5) {
      return res.status(400).json({ error: 'min_rating must be between 0 and 5' });
    }
    if (min_price < 0 || max_price < min_price) {
      return res.status(400).json({ error: 'Invalid price range' });
    }
    if (distance <= 0) {
      return res.status(400).json({ error: 'distance must be positive' });
    }
    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'latitude and longitude are required and must be valid numbers' });
    }
    if (room_type !== 'any' && !['Private room', 'Shared room', 'Entire home/apt'].includes(room_type)) {
      return res.status(400).json({ error: 'Invalid room_type' });
    }
    for (const place of places) {
      if (!placesMap[place.toLowerCase()]) {
        return res.status(400).json({ error: `Invalid place: ${place}` });
      }
    }
    const validAmenities = ['has_wifi', 'has_kitchen', 'has_air_conditioning', 'has_parking'];
    for (const amenity of amenities) {
      if (!validAmenities.includes(amenity)) {
        return res.status(400).json({ error: `Invalid amenity: ${amenity}` });
      }
    }

    // Build CTEs for places
    const placesQueries = [];
    places.forEach((place) => {
      const check = placesMap[place.toLowerCase()];
      if (check) {
        const { table, column, values } = check;
        const valuesArray = Array.isArray(values) ? values : [values];
        valuesArray.forEach((value) => {
          placesQueries.push(`
            SELECT latitude, longitude, '${place}' AS type
            FROM ${table}
            WHERE ${column} = '${value}'
          `);
        });
      }
    });

    const placesUnion = placesQueries.length
      ? placesQueries.join(' UNION ALL ')
      : 'SELECT NULL::float AS latitude, NULL::float AS longitude, NULL::text AS type LIMIT 0';

    // Build amenities conditions
    const amenityConditions = amenities.length
      ? amenities.map((amenity) => `a.${amenity} = TRUE`).join(' AND ')
      : 'TRUE';

    // Build query
    const query = `
      WITH places AS (
        ${placesUnion}
      ),
      filtered_listings AS (
        SELECT 
          l.id AS listing_id, 
          l.name, 
          l.description,
          l.picture_url,
          l.room_type,
          l.bedrooms,
          l.beds,
          l.latitude, 
          l.longitude, 
          r.review_scores_rating AS rating, 
          l.price_per_month
        FROM airbnb_listings l
        JOIN airbnb_review_summary r ON l.id = r.listing_id
        JOIN airbnb_amenities a ON l.id = a.listing_id
        WHERE ST_DWithin(
          ST_MakePoint(l.longitude, l.latitude)::geography,
          ST_MakePoint(${longitude}, ${latitude})::geography,
          ${distance}
        )
          AND r.review_scores_rating::numeric >= ${min_rating}
          AND l.price_per_month::numeric BETWEEN ${min_price} AND ${max_price}
          ${room_type !== 'any' ? `AND l.room_type = '${room_type}'` : ''}
          AND ${amenityConditions}
      ),
      nearby_places AS (
        SELECT f.listing_id, p.type
        FROM filtered_listings f
        JOIN places p ON ST_DistanceSphere(
          ST_MakePoint(f.longitude, f.latitude),
          ST_MakePoint(p.longitude, p.latitude)
        ) <= 200 -- Fixed 200m for nearby amenities
      ),
      grouped_listings AS (
        SELECT listing_id
        FROM nearby_places
        GROUP BY listing_id
        ${places.length ? `HAVING COUNT(DISTINCT type) >= 1` : ''}
      )
      SELECT DISTINCT f.*
      FROM filtered_listings f
      ${places.length ? 'JOIN grouped_listings g ON f.listing_id = g.listing_id' : ''}
      ORDER BY rating DESC
      LIMIT ${page_size} OFFSET ${offset};
    `;

    console.log('Executing query:\n', query);

    const result = await pool.query(query);
    res.status(200).json({
      listings: result.rows,
      page,
      page_size,
      total: result.rowCount,
    });
  } catch (err) {
    console.error('Error in /listings/search:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;