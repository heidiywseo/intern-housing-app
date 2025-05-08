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
          l.price_per_month,
          COUNT(*) OVER () AS total_count
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
        ) <= 200 
      ),
      grouped_listings AS (
        SELECT listing_id
        FROM nearby_places
        GROUP BY listing_id
        ${places.length ? `HAVING COUNT(DISTINCT type) >= ${places.length}` : ''}
      ),
      final_listings AS (
        SELECT DISTINCT f.listing_id, f.name, f.description, f.picture_url, f.room_type,
                       f.bedrooms, f.beds, f.latitude, f.longitude, f.rating, f.price_per_month, f.total_count
        FROM filtered_listings f
        ${places.length ? 'JOIN grouped_listings g ON f.listing_id = g.listing_id' : ''}
      )
      SELECT listing_id, name, description, picture_url, room_type, bedrooms, beds,
             latitude, longitude, rating, price_per_month, total_count
      FROM final_listings
      ORDER BY rating DESC
      LIMIT ${page_size} OFFSET ${offset};
    `;

    console.log('Executing query:\n', query);

    const result = await pool.query(query);
    const totalCount = result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;

    const listings = result.rows.map(({ total_count, ...rest }) => rest);

    res.status(200).json({
      listings,
      page,
      page_size,
      total: totalCount,
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

  try {
    const insightsQuery = `
    WITH selected_listing AS (
      SELECT *
      FROM airbnb_listings
      WHERE id = $1
    ), filtered_crimes AS (
      SELECT c.*
      FROM crime c
      JOIN selected_listing s ON TRUE
      WHERE c.date >= '2024-12-01' AND c.date < '2026-01-01'
      AND ST_DWithin(
        ST_MakePoint(c.longitude, c.latitude)::geography,
        ST_MakePoint(s.longitude, s.latitude)::geography,
        2000
      )
    ), crime_stats AS (
      SELECT total.total_crimes, ARRAY (
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
    SELECT l.*, a.*, 
      rc.cleanliness,
      rc.location,
      rc.value,
      rs.number_of_reviews,
      rs.review_scores_rating,
      cs.total_crimes,
      cs.common_crimes
    FROM selected_listing l
    LEFT JOIN airbnb_amenities a ON l.id = a.listing_id
    LEFT JOIN airbnb_review_components rc ON l.id = rc.listing_id
    LEFT JOIN airbnb_review_summary rs ON l.id = rs.listing_id
    LEFT JOIN crime_stats cs ON TRUE;
    `;

    const placesQuery = `
    WITH listing_point AS (
      SELECT ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography AS geom
      FROM airbnb_listings
      WHERE id = $1
    )
    SELECT 'amenity' AS source, id, amenity_type AS type, name, latitude, longitude
    FROM amenity, listing_point
    WHERE ST_DWithin(
      ST_SetSRID(ST_MakePoint(amenity.longitude, amenity.latitude), 4326)::geography,
      listing_point.geom,
      200
    )
    UNION ALL
    SELECT 'leisure' AS source, id, leisure_type AS type, name, latitude, longitude
    FROM leisure, listing_point
    WHERE ST_DWithin(
      ST_SetSRID(ST_MakePoint(leisure.longitude, leisure.latitude), 4326)::geography,
      listing_point.geom,
      200
    )
    UNION ALL
    SELECT 'shop' AS source, id, shop_type AS type, name, latitude, longitude
    FROM shop, listing_point
    WHERE ST_DWithin(
      ST_SetSRID(ST_MakePoint(shop.longitude, shop.latitude), 4326)::geography,
      listing_point.geom,
      200
    )
    UNION ALL
    SELECT 'historic' AS source, id, historic_type AS type, name, latitude, longitude
    FROM historic, listing_point
    WHERE ST_DWithin(
      ST_SetSRID(ST_MakePoint(historic.longitude, historic.latitude), 4326)::geography,
      listing_point.geom,
      200
    )
    UNION ALL
    SELECT 'tourism' AS source, id, tourism_type AS type, name, latitude, longitude
    FROM tourism, listing_point
    WHERE ST_DWithin(
      ST_SetSRID(ST_MakePoint(tourism.longitude, tourism.latitude), 4326)::geography,
      listing_point.geom,
      200
    )
    `;
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
    const distance = Number(req.query.distance) || 10000; // Default 10km in meters
    const page = parseInt(req.query.page, 10) || 1;
    const page_size = parseInt(req.query.page_size, 10) || 3; // Limit to 5
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
        FROM airbnb_listings l
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
              ST_MakePoint(l.longitude, l.latitude)::geography,
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
              ST_MakePoint(l.longitude, l.latitude)::geography,
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
      user_id,    // $1: user_id (string)
      distance,   // $2: distance (number)
      page_size,  // $3: page_size (number)
      offset      // $4: offset (number)
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