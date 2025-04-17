const express = require('express');
const router = express.Router();
const { Pool, types } = require('pg');
const config = require('./config.json')

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
connection.connect((err) => err && console.log(err));

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
        const min_rating = req.query.min_rating ?? 0;
        const max_price = req.query.max_price ?? 999999;
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
                WHERE city = ${city}
                    AND rating >= ${min_rating}
                    AND price <= ${max_price}
            ), nearby_places AS (
                SELECT l.id AS listing_id, a.type
                FROM filtered_listings l
                JOIN (
                    ${placesUnion || 'SELECT NULL AS latitude, NULL AS longitude, NULL AS type LIMIT 0'}  
                ) a ON ST_DistanceSphere (
                    ST_MakePoint(l.longitude, l.latitude),
                    ST_MakePoint(a.longitude, a.latitude)
                ) <= ${places_radius}
                GROUP BY l.id, a.type
            ), grouped_listings AS (
                SELECT listing_id
                FROM nearby_places
                GROUP BY listing_id
                HAVING COUNT(DISTINCT type) = ${numPlaces}
            )
            SELECT f.*
            FROM filtered_listings f
            JOIN grouped_listings g ON f.id = g.listing_id
            ORDER BY rating DESC
            LIMIT 20;
        `;

        const result = await connection.query(query);
        res.status(200).json(result.rows);

    } catch (err) {
        console.error('Error in /listings/search:', error)
    }
})

module.exports = router;
