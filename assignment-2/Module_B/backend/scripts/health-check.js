// backend/scripts/health-check.js
// Run with: node scripts/health-check.js  (from backend directory)
// Verifies DB connectivity, schema presence, and data existence.
// Exit code 0 = all green. Exit code 1 = any failure.

'use strict';
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME     || 'gateguard',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';

function pass(label) { console.log(`  ${GREEN}OK${RESET}  ${label}`); }
function fail(label, detail = '') { console.log(`  ${RED}FAIL${RESET}  ${label}${detail ? `  — ${RED}${detail}${RESET}` : ''}`); }
function warn(label) { console.log(`  ${YELLOW}WARN${RESET}  ${label}`); }

const REQUIRED_TABLES = [
  'gate', 'gateoccupancy', 'member', 'membertype',
  'personvisit', 'role', 'User', 'vehicle', 'vehicletype',
  'vehiclevisit', 'auditlog',
];

const INDEXED_TABLES = ['Member', 'PersonVisit', 'VehicleVisit', 'User', 'Vehicle'];

async function main() {
  console.log(`\n${BOLD}GateGuard Health Check${RESET}`);
  console.log('──────────────────────────────\n');
  let allGreen = true;

  // ── Check 1: PostgreSQL connectivity ──────────────────────────────
  console.log(`${BOLD}[1] Database Connection${RESET}`);
  try {
    const { rows } = await pool.query('SELECT NOW() AS ts');
    pass(`Connected to PostgreSQL at ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}  (${rows[0].ts.toISOString()})`);
  } catch (err) {
    fail('Cannot connect to PostgreSQL', err.message);
    allGreen = false;
    // cannot continue without DB
    await pool.end();
    process.exit(1);
  }
  console.log();

  // ── Check 2: Required tables ───────────────────────────────────────
  console.log(`${BOLD}[2] Schema — Required Tables${RESET}`);
  const { rows: tableRows } = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  );
  const existingTables = new Set(tableRows.map((r) => r.table_name));
  for (const t of REQUIRED_TABLES) {
    if (existingTables.has(t)) {
      pass(t);
    } else {
      fail(t, 'NOT FOUND');
      allGreen = false;
    }
  }
  console.log();

  // ── Check 3: Data — at least 1 user ───────────────────────────────
  console.log(`${BOLD}[3] Data Presence${RESET}`);
  try {
    const { rows: users } = await pool.query(`SELECT COUNT(*)::int AS cnt FROM "User"`);
    const ucnt = users[0].cnt;
    if (ucnt > 0) { pass(`Users: ${ucnt} found`); }
    else { fail('No users found — run: node scripts/seed-users.js'); allGreen = false; }
  } catch (err) {
    fail('Could not query User table', err.message);
    allGreen = false;
  }

  try {
    const { rows: roles } = await pool.query(`SELECT COUNT(*)::int AS cnt FROM role`);
    const rcnt = roles[0].cnt;
    if (rcnt >= 3) { pass(`Roles: ${rcnt} found`); }
    else { warn(`Roles: only ${rcnt} found (expected 3)`); }
  } catch (err) {
    fail('Could not query role table', err.message);
    allGreen = false;
  }
  console.log();

  // ── Check 4: Indexes ──────────────────────────────────────────────
  console.log(`${BOLD}[4] Performance Indexes${RESET}`);
  try {
    const { rows: idxRows } = await pool.query(
      `SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey'`
    );
    if (idxRows.length === 0) {
      warn('No custom indexes found — run the indexes.sql migration for better performance');
    } else {
      pass(`${idxRows.length} custom index(es) found:`);
      for (const idx of idxRows) {
        console.log(`       ${idx.indexname}  on  ${idx.tablename}`);
      }
    }
  } catch (err) {
    fail('Could not query pg_indexes', err.message);
    allGreen = false;
  }
  console.log();

  // ── Summary ───────────────────────────────────────────────────────
  if (allGreen) {
    console.log(`${GREEN}${BOLD}All checks passed — system is healthy.${RESET}\n`);
  } else {
    console.log(`${RED}${BOLD}Some checks failed — review output above.${RESET}\n`);
  }

  await pool.end();
  process.exit(allGreen ? 0 : 1);
}

main().catch((err) => {
  console.error('\nUnexpected error:', err.message);
  pool.end();
  process.exit(1);
});
