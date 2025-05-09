const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load config.json
const configPath = path.join(__dirname, '../config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// redis for caching, ignore if cannot be configured
let redisClient = null;

try {
  const redis = require('redis');
  redisClient = redis.createClient();
  redisClient.connect().catch((err) => {
    console.warn('Redis connection failed, continuing without cache:', err.message);
    redisClient = null;
  });
} catch (err) {
  console.warn('Redis not available, continuing without cache:', err.message);
}

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

// Map preference descriptions to IDs
async function getPreferenceId(client, table, description) {
  if (!description) return null;
  const query = `SELECT ${table}_id FROM ${table} WHERE description = $1`;
  const result = await client.query(query, [description]);
  return result.rows[0] ? result.rows[0][`${table}_id`] : null;
}

// Middleware to check if user is authenticated
const authenticate = (req, res, next) => {
  if (!req.user || !req.user.user_id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

const placesMap = {
  gym: { table: 'leisure', column: 'leisure_type', values: ['fitness_centre'] },
  supermarket: { table: 'shop', column: 'shop_type', values: ['supermarket', 'grocery'] },
};


router.get('/search', async (req, res) => {
  try {
    const min_rating = Number(req.query.min_rating) || 0;
    const min_price = Number(req.query.min_price) || 0;
    const max_price = Number(req.query.max_price) || 999999;
    const distance = Number(req.query.distance) || 10000;
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);
    const room_type = req.query.room_type || 'any';
    const page = parseInt(req.query.page, 10) || 1;
    const page_size = parseInt(req.query.page_size, 10) || 21;
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

    const amenityConditions = amenities.length
      ? amenities.map((amenity) => `a.${amenity} = TRUE`).join(' AND ')
      : 'TRUE';
    
    const queryParams = [
      longitude, latitude, distance, min_rating,
      min_price, max_price, page_size, offset,
    ];

    const mainQuery = `
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
        l.price_per_month,
        COUNT(*) OVER () AS total_count
        FROM mv_airbnb_listings_geog l
        JOIN airbnb_review_summary r ON l.id = r.listing_id
        JOIN airbnb_amenities a ON l.id = a.listing_id
        WHERE ST_DWithin(
          l.geog,
          ST_MakePoint($1, $2)::geography,
          $3
        )
          AND r.review_scores_rating::numeric >= $4
          AND l.price_per_month::numeric BETWEEN $5 AND $6
          ${room_type !== 'any' ? `AND l.room_type = '${room_type}'` : ''}
          AND ${amenityConditions}
      ),
      nearby_places AS (
        SELECT f.listing_id, p.type
        FROM filtered_listings f
        JOIN places p ON ST_DistanceSphere(
          ST_MakePoint(f.longitude, f.latitude),
          ST_MakePoint(p.longitude, p.latitude)
        ) <= 200 
      ),
      grouped_listings AS (
        SELECT listing_id
        FROM nearby_places
        GROUP BY listing_id
        ${places.length ? `HAVING COUNT(DISTINCT type) >= ${places.length}` : ''}
      )
      SELECT DISTINCT f.*
      FROM filtered_listings f
      ${places.length ? 'JOIN grouped_listings g ON f.listing_id = g.listing_id' : ''}
      ORDER BY rating DESC
      LIMIT $7 
      OFFSET $8
    `;

    const fitParams = [
      req.user?.user_id || null,
      longitude,
      latitude,
    ];

    const fitQuery = `
      WITH user_profile AS (
        SELECT 
        COALESCE(u.min_budget, 500) AS min_budget,
        COALESCE(u.max_budget, 3000) AS max_budget,
        ST_MakePoint($2, $3)::geography AS geo
        FROM (
          SELECT $1::text AS user_id
        ) input
        LEFT JOIN users u ON u.user_id = input.user_id
      ),
      nearby_listings AS (
        SELECT 
          al.id, 
          al.price_per_month, 
          ars.review_scores_rating,
          up.min_budget,
          up.max_budget
        FROM mv_airbnb_listings_geog al
        JOIN airbnb_review_summary ars ON al.id = ars.listing_id
        JOIN user_profile up ON ST_DWithin(al.geog, up.geo, 1000)
      ),
      price_score AS (
        SELECT 
          AVG(
            CASE
              WHEN nl.price_per_month BETWEEN nl.min_budget AND nl.max_budget THEN 1.0
              WHEN nl.price_per_month < nl.min_budget THEN 0.8
              WHEN nl.price_per_month > nl.max_budget THEN 0.4
              ELSE 0.0
            END
          ) AS price_score,
          AVG(nl.review_scores_rating) / 5.0 AS review_score
          FROM nearby_listings nl
      ),
      crime_counts AS (
        SELECT COUNT(*) AS num_crimes
        FROM mv_crime_geog c
        CROSS JOIN user_profile up
        WHERE c.date >= '2024-12-01' AND c.date < '2026-01-01'
        AND ST_DWithin(c.geog, up.geo, 2000)
      ),
      crime_score AS (
        SELECT
          CASE
            WHEN num_crimes >= 500 THEN 0.0
            ELSE ROUND(1.0 - num_crimes / 500.0, 2)
          END AS score
        FROM crime_counts
      ),
      total_score AS (
        SELECT 
          (0.45 * ags.price_score +
          0.35 * cs.score +
          0.2 * ags.review_score) AS weighted_score
        FROM price_score ags, crime_score cs
      )
      SELECT 
      ROUND(weighted_score, 2) AS score,
      CASE
        WHEN weighted_score >= 0.8 THEN 'Great'
        WHEN weighted_score >= 0.6 THEN 'Good'
        WHEN weighted_score >= 0.4 THEN 'Average'
        ELSE 'Not ideal'
      END AS intern_fit_description
      FROM total_score;
    `;

    console.log('Executing query:\n', mainQuery);
    console.log('Executing query:\n', fitQuery);

    const [listingResult, fitResult] = await Promise.all([
      pool.query(mainQuery, queryParams),
      pool.query(fitQuery, fitParams),
    ]);

    const totalCount = listingResult.rows.length > 0 ? parseInt(listingResult.rows[0].total_count, 10) : 0;

    const listings = listingResult.rows.map(({ total_count, ...rest }) => rest);
    const internFitScore = fitResult.rows.length > 0 ? fitResult.rows[0] : null;

    res.status(200).json({
      listings,
      page,
      page_size,
      total: totalCount,
      intern_fit_score: internFitScore,
    });
  } catch (err) {
    console.error('Error in /listings/search:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});


router.get('/:id/insights', async (req, res) => {
  const listingId = req.params.id;

  if (!listingId || isNaN(listingId)) {
    return res.status(400).json({ error: 'listingId is invalid' });
  }

  const cacheKey = `listing_insights:${listingId}`;

  try {
    let cachedData = null;
    if (redisClient) {
      try {
        cachedData = await redisClient.get(cacheKey);
      } catch (err) {
        console.warn(`Redis error (get):`, err);
      }
    }

    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    const insightsQuery = `
      WITH listing_point AS (
        SELECT geog
        FROM mv_airbnb_listings_geog
        WHERE id = $1
      ), 
      filtered_crimes AS (
        SELECT c.*
        FROM mv_crime_geog c
        CROSS JOIN listing_point lp
        WHERE c.date >= '2024-12-01' AND c.date < '2026-01-01'
          AND ST_DWithin(c.geog, lp.geog, 2000)
      ), 
      crime_stats AS (
        SELECT total.total_crimes, 
        ARRAY (
          SELECT category
          FROM (
            SELECT category, COUNT(*) AS crime_count
            FROM filtered_crimes
            GROUP BY category
            ORDER BY crime_count DESC
            LIMIT 1
          ) AS top
        ) AS common_crimes
        FROM (
          SELECT COUNT(*) AS total_crimes
          FROM filtered_crimes
        ) AS total
      )
      SELECT l.*, 
        a.*,
        rc.cleanliness,
        rc.location,
        rc.value,
        rs.number_of_reviews,
        rs.review_scores_rating,
        cs.total_crimes,
        cs.common_crimes
      FROM airbnb_listings l
      LEFT JOIN airbnb_amenities a ON l.id = a.listing_id
      LEFT JOIN airbnb_review_components rc ON l.id = rc.listing_id
      LEFT JOIN airbnb_review_summary rs ON l.id = rs.listing_id
      LEFT JOIN crime_stats cs ON TRUE
      WHERE l.id = $1
    `;

    const placesQuery = `
      WITH listing_point AS (
        SELECT geog
        FROM mv_airbnb_listings_geog
        WHERE id = $1
      ), 
      all_places AS (
        SELECT source, id, type, name, latitude, longitude
        FROM (
          SELECT 'amenity' AS source, id, amenity_type AS type, name, latitude, longitude,
            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography AS geog
          FROM amenity
          
          UNION ALL
          
          SELECT 'leisure', id, leisure_type, name, latitude, longitude,
            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
          FROM leisure
          
          UNION ALL
          
          SELECT 'shop', id, shop_type, name, latitude, longitude,
            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
          FROM shop
          
          UNION ALL
          
          SELECT 'historic', id, historic_type, name, latitude, longitude,
            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
          FROM historic
          
          UNION ALL
          
          SELECT 'tourism', id, tourism_type, name, latitude, longitude,
            ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
          FROM tourism
        ) AS combined_places, listing_point lp
        WHERE ST_DWithin(combined_places.geog, lp.geog, 200)
      )
      SELECT *
      FROM all_places
      LIMIT 3
    `;


    console.log('Executing query:\n', insightsQuery);
    console.log('Executing query:\n', placesQuery);

    const [insightsResult, placesResult] = await Promise.all([
      pool.query(insightsQuery, [listingId]),
      pool.query(placesQuery, [listingId])
    ]);

    if (insightsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    const listing = insightsResult.rows[0];

    const response = {
      listing: {
        id: listing.id,
        url: listing.listing_url,
        name: listing.name,
        description: listing.description,
        room_type: listing.room_type,
        accommodates: listing.accommodates,
        bedrooms: listing.bedrooms,
        beds: listing.beds,
        price_per_month: listing.price_per_month,
        location: {
          latitude: listing.latitude,
          longitude: listing.longitude,
        },
        picture_url: listing.picture_url,
        host: {
          name: listing.host_name,
          picture_url: listing.host_picture_url,
          about: listing.host_about
        }
      },
      amenities: {
        has_wifi: listing.has_wifi,
        has_kitchen: listing.has_kitchen,
        has_washer: listing.has_washer,
        has_dryer: listing.has_dryer,
        has_air_conditioning: listing.has_air_conditioning,
        has_heating: listing.has_heating,
        has_tv: listing.has_tv,
        has_parking: listing.has_parking
      },
      reviews: {
        number_of_reviews: listing.number_of_reviews,
        review_scores_rating: listing.review_scores_rating,
        components: {
          cleanliness: listing.cleanliness,
          location: listing.location,
          value: listing.value,
        },
      },
      crime_stats: {
        total_crimes: listing.total_crimes,
        common_crimes: listing.common_crimes,
      },
      nearby_places: placesResult.rows.map(place => ({
        id: place.id,
        type: place.type,
        name: place.name,
        source: place.source,
        location: {
          latitude: place.latitude,
          longitude: place.longitude,
        },
      })),
    };
    
    if (redisClient) {
      try {
        // can use TTL, won't for the sake of project
        // // await redisClient.set(cacheKey, JSON.stringify(response), { EX: 3600 });
        await redisClient.set(cacheKey, JSON.stringify(response));
      } catch (err) {
        console.warn('Redis error (set):', err);
      }
    }

    res.status(200).json(response);
  } catch (err) {
    console.error('Error in /listings/:id/insights:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});


router.get('/recommendations', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    const user_id = req.user.user_id;
    const distance = Number(req.query.distance) || 10000; 
    const page = parseInt(req.query.page, 10) || 1;
    const page_size = parseInt(req.query.page_size, 10) || 3; 
    const offset = (page - 1) * page_size;

    // Validate inputs
    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({ error: 'Invalid user_id' });
    }
    if (distance <= 0) {
      return res.status(400).json({ error: 'distance must be positive' });
    }

    // Map roommate_status_id to room_type
    let roomTypeCondition = '';
    const statusQuery = `
      SELECT rs.description
      FROM roommate_status rs
      JOIN users u ON u.roommate_status_id = rs.roommate_status_id
      WHERE u.user_id = $1::text
    `;
    const statusResult = await client.query(statusQuery, [user_id]);
    if (statusResult.rows.length > 0) {
      const description = statusResult.rows[0].description;
      if (description === 'Open to roommates') {
        roomTypeCondition = `AND l.room_type IN ('Private room', 'Shared room')`;
      } else if (description === 'Prefer to live alone') {
        roomTypeCondition = `AND l.room_type = 'Entire home/apt'`;
      }
    }

    const query = `
      WITH user_prefs AS (
        SELECT 
          u.min_budget AS min_budget,
          u.max_budget AS max_budget,
          z.lat AS work_latitude,
          z.lng AS work_longitude,
          u.roommate_status_id
        FROM users u
        LEFT JOIN zips z ON z.zip = u.work_zip_code
        WHERE u.user_id = $1::text
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
          rs.review_scores_rating AS rating,
          l.price_per_month,
          COUNT(*) OVER () AS total_count
        FROM mv_airbnb_listings_geog l
        JOIN airbnb_review_summary rs ON l.id = rs.listing_id
        JOIN airbnb_amenities a ON l.id = a.listing_id
        JOIN user_prefs up ON TRUE
        WHERE 
          -- User exists
          up.min_budget IS NOT NULL
          -- Budget filter
          AND l.price_per_month BETWEEN COALESCE(up.min_budget, 0) AND COALESCE(up.max_budget, 999999)
          -- Commute distance from work ZIP
          AND (
            up.work_latitude IS NULL OR
            ST_DWithin(
              l.geog,
              ST_MakePoint(up.work_longitude, up.work_latitude)::geography,
              $2
            )
          )
          -- Required amenities
          AND a.has_wifi = TRUE
          AND a.has_kitchen = TRUE
          AND a.has_washer = TRUE
          AND a.has_air_conditioning = TRUE
          AND a.has_parking = TRUE
          -- Supermarket within 1 km
          AND EXISTS (
            SELECT 1
            FROM shop s
            WHERE s.shop_type IN ('supermarket', 'grocery')
            AND ST_DWithin(
              ST_MakePoint(s.longitude, s.latitude)::geography,
              l.geog,
              1000
            )
          )
          -- Room type based on roommate status
          ${roomTypeCondition}
          -- Ensure listing has reviews
          AND rs.number_of_reviews > 0
      )
      SELECT 
        listing_id,
        name,
        description,
        picture_url,
        room_type,
        bedrooms,
        beds,
        latitude,
        longitude,
        rating,
        price_per_month,
        total_count
      FROM filtered_listings
      ORDER BY rating DESC
      LIMIT $3 OFFSET $4;
    `;

    const values = [
      user_id,    
      distance,   
      page_size,  
      offset      
    ];

    console.log('Executing query:\n', query, '\nValues:', values);

    const result = await client.query(query, values);
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;

    // Format response for HouseCard.jsx
    const listings = result.rows.map((row) => ({
      id: row.listing_id,
      title: row.name || 'No Title Available',
      price: row.price_per_month ? `$${row.price_per_month}/mo` : 'Price Unavailable',
      description: row.description || 'No description available.',
      images: [row.picture_url || 'https://via.placeholder.com/400x200?text=No+Image'],
      bedrooms: row.bedrooms || '--',
      bathrooms: row.beds || '--',
      area: '--',
      roomType: row.room_type || 'Unknown',
      rating: row.rating || 0,
    }));

    res.status(200).json({
      listings,
      page,
      page_size,
      total: totalCount,
    });
  } catch (err) {
    console.error('Error in /listings/recommendations:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;