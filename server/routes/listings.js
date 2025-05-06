// routes/listings.js
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

async function checkSchemaAndTables() {
  // (unchanged: verifies that public schema and tables exist)
  const schemaCheck = await pool.query(
    `SELECT EXISTS (SELECT FROM information_schema.schemata WHERE schema_name = 'public') AS exists`
  );
  if (!schemaCheck.rows[0].exists) {
    throw new Error('Schema "public" does not exist');
  }
  const tables = ['airbnb', 'leisure', 'shop', 'amenity'];
  for (const table of tables) {
    const tableCheck = await pool.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1
       ) AS exists`,
      [table]
    );
    if (!tableCheck.rows[0].exists) {
      throw new Error(`Table "public.${table}" does not exist`);
    }
  }
}

router.get('/search', async (req, res) => {
  try {
    await checkSchemaAndTables();

    // --- parse & validate ---
    const region = req.query.region?.trim();
    const min_rating = Number(req.query.min_rating) || 0;
    const max_price = Number(req.query.max_price) || 999999;
    const places_radius = Number(req.query.places_radius) || 20000;
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.page_size, 10) || 20;
    const offset = (page - 1) * pageSize;

    let places = [];
    try {
      places = req.query.places ? JSON.parse(req.query.places) : [];
      if (!Array.isArray(places)) throw new Error();
    } catch {
      return res.status(400).json({ error: 'Invalid places format' });
    }

    if (!region) {
      return res.status(400).json({ error: 'Region is required' });
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

    // --- base filters ---
    const sqlConditions = [
      'region ILIKE $1',
      'review_scores_rating >= $2',
      'price_per_month <= $3',
    ];
    const baseParams = [region, min_rating, max_price];

    // --- simple (no places) ---
    if (places.length === 0) {
      const simpleSql = `
        SELECT
          id,
          name,
          latitude,
          longitude,
          review_scores_rating AS rating,
          price_per_month       AS price
        FROM public.airbnb
        WHERE ${sqlConditions.join(' AND ')}
        ORDER BY review_scores_rating DESC
        LIMIT $4
        OFFSET $5
      `;
      const { rows } = await pool.query(simpleSql, [...baseParams, pageSize, offset]);
      return res.json(rows);
    }

    // --- complex (with places) ---
    // build CTEs for each place type
    const placeCTEs = places
      .map((p, idx) => {
        const m = placesMap[p.toLowerCase()];
        return `
          place_${idx} AS (
            SELECT latitude, longitude, '${p}' AS type
            FROM ${m.table}
            WHERE ${m.column} = '${m.value}'
          )
        `;
      })
      .join(',');

    const placeUnions = places
      .map((_, idx) => `SELECT latitude, longitude, type FROM place_${idx}`)
      .join(' UNION ALL ');

    const complexSql = `
      WITH
      ${placeCTEs},
      filtered_listings AS (
        SELECT
          id, name, latitude, longitude,
          review_scores_rating AS rating,
          price_per_month       AS price
        FROM public.airbnb
        WHERE ${sqlConditions.join(' AND ')}
      ),
      nearby_places AS (
        SELECT l.id AS listing_id, a.type
        FROM filtered_listings l
        JOIN (
          ${placeUnions}
        ) a
          ON ST_DWithin(
               ST_SetSRID(ST_MakePoint(l.longitude, l.latitude), 4326),
               ST_SetSRID(ST_MakePoint(a.longitude, a.latitude), 4326),
               $${baseParams.length + 1}
             )
      ),
      grouped_listings AS (
        SELECT listing_id
        FROM nearby_places
        GROUP BY listing_id
        HAVING COUNT(DISTINCT type) >= ${places.length}
      )
      SELECT f.*
      FROM filtered_listings f
      JOIN grouped_listings g
        ON f.id = g.listing_id
      ORDER BY rating DESC
      LIMIT $${baseParams.length + 2}
      OFFSET $${baseParams.length + 3}
    `;

    const complexParams = [
      ...baseParams,
      places_radius,
      pageSize,
      offset,
    ];

    let { rows } = await pool.query(complexSql, complexParams);

    // fallback only if no results at all
    if (rows.length === 0) {
      const fallbackSql = `
        SELECT
          id,
          name,
          latitude,
          longitude,
          review_scores_rating AS rating,
          price_per_month       AS price
        FROM public.airbnb
        WHERE region ILIKE $1
        ORDER BY review_scores_rating DESC
        LIMIT $2
        OFFSET $3
      `;
      const { rows: fallbackRows } = await pool.query(fallbackSql, [
        region,
        pageSize,
        offset,
      ]);
      rows = fallbackRows;
    }

    return res.json(rows);

  } catch (err) {
    console.error('Error in /listings/search:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;
