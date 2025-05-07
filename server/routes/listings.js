// routes/listings.js
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
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const placesMap = { // add more if needed
  gym: { table: 'leisure', column: 'leisure_type', values: ['fitness_centre'] },
  cafe: { table: 'amenity', column: 'amenity_type', values: ['cafe'] },
  supermarket: { table: 'shop', column: 'shop_type', values: ['supermarket', 'grocery'] }
};

// test: http://localhost:3000/listings/search?min_rating=4.5&max_price=3000&places_radius=2000&latitude=37.788307&longitude=-122.425598&places=%5B%22gym%22%2C%22cafe%22%2C%22supermarket%22%5D
router.get('/search', async (req, res) => {
  try { 
    const min_rating = Number(req.query.min_rating) || 0;
    const max_price = Number(req.query.max_price) || 999999;
    const places_radius = Number(req.query.places_radius) || 1000;
    const latitude = Number(req.query.latitude); // external API used to fetch given address
    const longitude = Number(req.query.longitude);
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.page_size, 10) || 20;
    const offset = (page - 1) * pageSize;

    let places = [];
    let numPlaces = 0;
    try {
      places = req.query.places ? JSON.parse(req.query.places) : [];
      if (!Array.isArray(places)) throw new Error();
      numPlaces = places.length;
    } catch {
      return res.status(400).json({ error: 'Invalid places format' });
    }

    if (min_rating < 0 || min_rating > 5) {
      return res.status(400).json({ error: 'min_rating must be between 0 and 5' });
    }
    if (max_price <= 0) {
      return res.status(400).json({ error: 'max_price must be positive' });
    }
    if (places_radius <= 0) {
      return res.status(400).json({ error: 'places_radius must be positive' });
    }
    for (const place of places) {
      if (!placesMap[place.toLowerCase()]) {
        return res.status(400).json({ error: `Invalid place: ${place}` });
      }
    }
    if (
      latitude === undefined ||
      longitude === undefined ||
      isNaN(latitude) ||
      isNaN(longitude)
    ) {
      return res.status(400).json({ error: 'latitude and longitude are required and must be valid numbers' });
    }

    // build CTEs for each place type
    // handle queries for different places separately
    const placesQueries = [];
    const placesTypes = [];

    places.forEach((place) => {
        const check = placesMap[place.toLowerCase()];
        if (check) {
          const { table, column, values } = check;

          const valuesArray = Array.isArray(values) ? values : [values];

          valuesArray.forEach(value => {
            placesQueries.push(`
                SELECT latitude, longitude, '${place}' AS type
                FROM ${table}
                WHERE ${column} = '${value}'
            `);
          });

          placesTypes.push(place);
        }
    });

    const placesUnion = placesQueries.length ? placesQueries.join(' UNION ALL '): "SELECT NULL::float AS latitude, NULL::float AS longitude, NULL::text AS type LIMIT 0";

    const query = `
        WITH places AS (
            ${placesUnion}
        ),
        filtered_listings AS (
            SELECT l.id AS listing_id, l.name, l.latitude, l.longitude, r.review_scores_rating AS rating, l.price_per_month
            FROM airbnb_listings l
            JOIN airbnb_review_summary r ON l.id = r.listing_id
            WHERE ST_DWithin(
                ST_MakePoint(l.longitude, l.latitude)::geography,
                ST_MakePoint(${longitude}, ${latitude})::geography,
                2000
            ) 
                AND r.review_scores_rating::numeric >= ${min_rating}
                AND l.price_per_month::numeric <= ${max_price}
        ), nearby_places AS (
            SELECT f.listing_id, p.type
            FROM filtered_listings f
            JOIN places p ON ST_DistanceSphere(
                    ST_MakePoint(f.longitude, f.latitude),
                    ST_MakePoint(p.longitude, p.latitude)
                ) <= ${places_radius}
        ), grouped_listings AS (
                SELECT listing_id
                FROM nearby_places
                GROUP BY listing_id
                HAVING COUNT(DISTINCT type) = ${numPlaces}
        )
            SELECT f.*
            FROM filtered_listings f
            JOIN grouped_listings g ON f.listing_id = g.listing_id
            ORDER BY rating DESC
            LIMIT ${pageSize} OFFSET ${offset};
        `;

    console.log('Executing query:\n', query);

    const result = await pool.query(query);
    res.status(200).json(result.rows);

  } catch (err) {
    console.error('Error in /listings/search:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;
