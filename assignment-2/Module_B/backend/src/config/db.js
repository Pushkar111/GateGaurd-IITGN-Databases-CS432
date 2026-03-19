// src/config/db.js
// PostgreSQL connection pool using 'pg'
// exports a query() helper so every model can do: const { rows } = await query(sql, params)

const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  host:     env.DB_HOST,
  port:     env.DB_PORT,
  database: env.DB_NAME,
  user:     env.DB_USER,
  password: env.DB_PASSWORD,
  max:      env.DB_MAX,          // max 20 connections in the pool
  idleTimeoutMillis:    30000,   // close idle clients after 30s
  connectionTimeoutMillis: 5000, // fail fast if we can't connect
});

// log when a client is acquired/released (handy during dev)
pool.on('connect', () => {
  if (env.NODE_ENV === 'development') {
    // only noisy in dev, silent in prod
    // console.log('[db] new client connected');
  }
});

pool.on('error', (err) => {
  console.error('[db] unexpected error on idle client:', err.message);
  process.exit(1);
});

// Generic query function — always use parameterized queries with $1 $2 $3
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  if (env.NODE_ENV === 'development' && duration > 500) {
    // warn if query is taking suspiciously long
    console.warn(`[db] slow query detected (${duration}ms):`, text.slice(0, 80));
  }

  return result;
}

// Get a client for transactions (caller must release it!)
async function getClient() {
  return pool.connect();
}

module.exports = { query, getClient, pool };
