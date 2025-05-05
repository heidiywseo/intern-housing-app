// this file is similar to listings.js without the complexities of the query, just to test that the remainder of the script is functioning
// specify the port in your local config.js (localhost:3000), start the server, and go to http://localhost:3000/listingsTest/search
const express = require('express');
const router = express.Router();
const { Pool, types } = require('pg');
const config = require('../config.json');

const connection = new Pool({
  host: config.rds_host,
  user: config.rds_user,
  password: config.rds_password,
  port: config.rds_port,
  database: config.rds_db,
  ssl: {
    rejectUnauthorized: false,
  },
});

connection.connect()
  .then(client => {
    console.log('connected');
    client.release();
  })
  .catch(err => {
    console.error('no connection', err);
  });

const placesMap = {
    gym: { table: 'leisure', column: 'leisure', value: 'fitness_center' },
    park: { table: 'leisure', column: 'leisure', value: 'park' },
    supermarket: { table: 'shop', column: 'shop', value: 'supermarket' },
    grocery: { table: 'shop', column: 'shop', value: 'grocery' },
    library: { table: 'amenity', column: 'amenity', value: 'library' } // add more after checking
};

// GET /listings/search
router.get('/search', async (req, res) => {
    try {
        const city = req.query.city;
        const min_rating = req.query.min_rating ?? 0.0;
        const max_price = req.query.max_price ?? 999999.99;
        const places = req.query.places ? JSON.parse(req.query.places) : [];
        const places_radius = req.query.places_radius ?? 1000;
        const latitude = req.query.latitude;
        const longitude = req.query.longitude;

        const numPlaces = places.length;

        // handle queries for different places separately
        const placesQueries = [];
        const placesTypes = [];

        places.forEach((place) => {
            const check = placesMap[place.toLowerCase()];
            if (check) {
              const { table, column, value } = check;
              placesQueries.push(`
                SELECT latitude, longitude, '${place}' AS type
                FROM ${table}
                WHERE ${column} = '${value}'
              `);
              placesTypes.push(place);
            }
        });

        const placesUnion = placesQueries.length ? placesQueries.join(' UNION ALL ') : null;
        // airbnb doesn't have a column for city or address ... might need to map using lat/lon
        const query = `
        WITH filtered_listings AS (
                SELECT id, name, latitude, longitude, review_scores_rating AS rating, price
                FROM airbnb
                WHERE region = 'Boston'
                    AND review_scores_rating::numeric >= 3.10
                    AND price_float::numeric <= 5000.00
            )
            SELECT *
            FROM filtered_listings
            ORDER BY rating DESC
            LIMIT 20;
        `;

        const result = await connection.query(query);
        console.log(result.rows);

        res.status(200).json(result.rows);

    } catch (err) {
        console.error('Error in /listings-test/search:', error)
    }
})

module.exports = router;
