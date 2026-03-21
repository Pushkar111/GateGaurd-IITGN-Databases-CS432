// backend/scripts/seed-large.js
// Runs the sql/seed_large.sql file using the pg driver

'use strict';
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME     || 'gateguard',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  application_name: 'GateGuardSeeder',
});

async function main() {
  console.log('\nLoading Large Seed Data...');
  const sqlPath = path.join(__dirname, '..', 'sql', 'seed_large.sql');
  
  if (!fs.existsSync(sqlPath)) {
    throw new Error(`File not found: ${sqlPath}`);
  }

  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  const result = await pool.query(sql);
  
  console.log('OK  Large seed successfully executed.');

  // Print row counts
  console.log('\nCurrent Database Row Counts:');
  const counts = await pool.query(`
    SELECT 'member' AS tbl, COUNT(*) FROM member
    UNION ALL SELECT 'vehicle', COUNT(*) FROM vehicle
    UNION ALL SELECT 'gate', COUNT(*) FROM gate
    UNION ALL SELECT 'personvisit', COUNT(*) FROM personvisit
    UNION ALL SELECT 'vehiclevisit', COUNT(*) FROM vehiclevisit
    UNION ALL SELECT 'user', COUNT(*) FROM "User"
  `);

  counts.rows.forEach(r => {
    console.log(`  - ${r.tbl.padEnd(12)} : ${r.count}`);
  });
  console.log('');
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error('\nFAIL  seed-large failed:', err.message);
    pool.end();
    process.exit(1);
  });
