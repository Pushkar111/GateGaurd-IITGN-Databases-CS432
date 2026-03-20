// backend/scripts/db-setup.js
// Run with: node scripts/db-setup.js  (from backend directory)
// Applies the full schema in order:
//   1. assignment-1/database/schema.sql  (10 core tables)
//   2. backend/sql/audit_table.sql       (AuditLog table)
//   3. backend/sql/indexes.sql           (performance indexes)
// Safe to re-run: schema.sql drops and recreates, audit + indexes use IF NOT EXISTS.

'use strict';
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME     || 'gateguard',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
});

const GREEN = '\x1b[32m';
const RED   = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD  = '\x1b[1m';

// Resolve paths relative to backend root
const BACKEND_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT    = path.resolve(BACKEND_ROOT, '..', '..', '..');

const SQL_FILES = [
  {
    label: 'Core schema (10 tables)',
    file:  path.join(REPO_ROOT, 'assignment-1', 'database', 'schema.sql'),
  },
  {
    label: 'AuditLog table',
    file:  path.join(BACKEND_ROOT, 'sql', 'audit_table.sql'),
  },
  {
    label: 'Performance indexes',
    file:  path.join(BACKEND_ROOT, 'sql', 'indexes.sql'),
  },
];

async function runSqlFile(label, filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`  ${RED}FAIL${RESET}  ${label} — FILE NOT FOUND: ${filePath}`);
    return false;
  }
  const sql = fs.readFileSync(filePath, 'utf8');
  try {
    await pool.query(sql);
    console.log(`  ${GREEN}OK${RESET}  ${label}`);
    return true;
  } catch (err) {
    console.log(`  ${RED}FAIL${RESET}  ${label} — ${err.message}`);
    return false;
  }
}

async function main() {
  console.log(`\n${BOLD}GateGuard db-setup.js${RESET}`);
  console.log('────────────────────────────────\n');

  // Test connection first
  try {
    await pool.query('SELECT 1');
    console.log(`${GREEN}OK${RESET}  Connected to PostgreSQL (${process.env.DB_NAME})\n`);
  } catch (err) {
    console.error(`${RED}FAIL${RESET}  Cannot connect: ${err.message}`);
    await pool.end();
    process.exit(1);
  }

  let allOk = true;
  for (const { label, file } of SQL_FILES) {
    const ok = await runSqlFile(label, file);
    if (!ok) allOk = false;
  }

  if (allOk) {
    console.log(`\n${GREEN}${BOLD}Schema applied successfully.${RESET}`);
    console.log('   Next: node scripts/seed-users.js\n');
  } else {
    console.log(`\n${RED}${BOLD}Some steps failed — see above.${RESET}\n`);
  }

  await pool.end();
  process.exit(allOk ? 0 : 1);
}

main().catch((err) => {
  console.error('Unexpected error:', err.message);
  pool.end();
  process.exit(1);
});
