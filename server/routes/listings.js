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

const placesMap = {
  gym: { table: 'public.leisure', column: 'leisure_type', value: 'fitness_centre' },
  park: { table: 'public.leisure', column: 'leisure_type', value: 'park' },
  supermarket: { table: 'public.shop', column: 'shop_type', value: 'supermarket' },
  library: { table: 'public.amenity', column: 'amenity_type', value: 'library' },
};

// Check if schema and tables exist
async function checkSchemaAndTables() {
  try {
    const schemaCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.schemata WHERE schema_name = 'public'
      ) AS schema_exists
    `);
    if (!schemaCheck.rows[0].schema_exists) {
      throw new Error('Schema "public" does not exist');
    }

    const tables = ['airbnb', 'leisure', 'shop', 'amenity'];
    for (const table of tables) {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        ) AS table_exists
      `, [table]);
      if (!tableCheck.rows[0].table_exists) {
        throw new Error(`Table "public.${table}" does not exist`);
      }
    }
    console.log('Schema and tables verified');
  } catch (err) {
    console.error('Schema/Table check failed:', err.message);
    throw err;
  }
}

router.get('/search', async (req, res) => {
  try {
    // Verify schema and tables
    await checkSchemaAndTables();

    const region = req.query.region?.trim();
    const min_rating = Number(req.query.min_rating) || 0;
    const max_price = Number(req.query.max_price) || 999999;
    const places_radius = Number(req.query.places_radius) || 20000;
    const latitude = Number(req.query.latitude) || null;
    const longitude = Number(req.query.longitude) || null;

    let places = [];
    try {
      places = req.query.places ? JSON.parse(req.query.places) : [];
      if (!Array.isArray(places)) throw new Error('Places must be an array');
    } catch (e) {
      console.error(`Invalid places format: ${req.query.places}`, e);
      return res.status(400).json({ error: 'Invalid places format' });
    }

    if (!region) {
      console.error('Region is required');
      return res.status(400).json({ error: 'Region is required' });
    }
    if (min_rating < 0 || min_rating > 5) {
      console.error(`Invalid min_rating: ${min_rating}`);
      return res.status(400).json({ error: 'min_rating must be between 0 and 5' });
    }
    if (max_price <= 0) {
      console.error(`Invalid max_price: ${max_price}`);
      return res.status(400).json({ error: 'max_price must be positive' });
    }
    if (places_radius <= 0) {
      console.error(`Invalid places_radius: ${places_radius}`);
      return res.status(400).json({ error: 'places_radius must be positive' });
    }
    for (const place of places) {
      if (!placesMap[place.toLowerCase()]) {
        console.error(`Invalid place: ${place}`);
        return res.status(400).json({ error: `Invalid place: ${place}` });
      }
    }

    console.log(`Query params: region=${region}, min_rating=${min_rating}, max_price=${max_price}, places=${JSON.stringify(places)}, places_radius=${places_radius}, lat=${latitude}, lng=${longitude}`);

    let baseParams = [region, min_rating, max_price];
    let sqlConditions = [
      'region ILIKE $1',
      'review_scores_rating >= $2',
      'price_per_month <= $3'
    ];

    // Add proximity filter if latitude/longitude provided
    if (latitude && longitude) {
      sqlConditions.push(
        `ST_DWithin(
          ST_SetSRID(ST_MakePoint(longitude, latitude), 4326),
          ST_SetSRID(ST_MakePoint($4, $5), 4326),
          $6
        )`
      );
      baseParams.push(longitude, latitude, places_radius);
    }

    if (places.length === 0) {
      const simpleSql = `
        SELECT
          id,
          name,
          latitude,
          longitude,
          review_scores_rating AS rating,
          price_per_month AS price
        FROM public.airbnb
        WHERE ${sqlConditions.join(' AND ')}
        ORDER BY review_scores_rating DESC
        LIMIT 20
      `;
      console.log('Executing simple query:', simpleSql, baseParams);
      const { rows } = await pool.query(simpleSql, baseParams);
      console.log(`Simple query result: rows=${rows.length}`);
      return res.json(rows);
    }

    const placeCTEs = places.map((p, index) => {
      const m = placesMap[p.toLowerCase()];
      return `
        place_${index} AS (
          SELECT latitude, longitude, '${p}' AS type
          FROM ${m.table}
          WHERE ${m.column} = '${m.value}'
        )
      `;
    }).join(', ');

    const placeUnions = places.map((_, index) => `SELECT latitude, longitude, type FROM place_${index}`).join(' UNION ALL ');

    const sql = `
      WITH ${placeCTEs},
      filtered_listings AS (
        SELECT
          id,
          name,
          latitude,
          longitude,
          review_scores_rating AS rating,
          price_per_month AS price
        FROM public.airbnb
        WHERE ${sqlConditions.join(' AND ')}
      ),
      nearby_places AS (
        SELECT
          l.id AS listing_id,
          a.type
        FROM filtered_listings l
        JOIN (
          ${placeUnions}
        ) a ON
          ST_DWithin(
            ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326),
            ST_SetSRID(ST_MakePoint(a.longitude, a.latitude), 4326),
            $${baseParams.length + 1}
          )
        GROUP BY l.id, a.type
      ),
      grouped_listings AS (
        SELECT listing_id
        FROM nearby_places
        GROUP BY listing_id
        HAVING COUNT(DISTINCT type) >= 1
      )
      SELECT f.*
      FROM filtered_listings f
      JOIN grouped_listings g ON f.id = g.listing_id
      ORDER BY rating DESC
      LIMIT 20
    `;
    const finalParams = [...baseParams, places_radius];
    console.log('Executing complex query:', sql, finalParams);
    let { rows } = await pool.query(sql, finalParams);
    console.log(`Complex query result: rows=${rows.length}`);

    // Fallback query if no results
    if (rows.length === 0) {
      const fallbackSql = `
        SELECT
          id,
          name,
          latitude,
          longitude,
          review_scores_rating AS rating,
          price_per_month AS price
        FROM public.airbnb
        WHERE region ILIKE $1
        ORDER BY review_scores_rating DESC
        LIMIT 20
      `;
      console.log('Executing fallback query:', fallbackSql, [region]);
      const { rows: fallbackRows } = await pool.query(fallbackSql, [region]);
      console.log(`Fallback query result: rows=${fallbackRows.length}`);
      rows = fallbackRows;
    }

    return res.json(rows);

  } catch (err) {
    console.error('Error in /listings/search:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;