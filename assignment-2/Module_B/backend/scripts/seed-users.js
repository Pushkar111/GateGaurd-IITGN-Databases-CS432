// backend/scripts/seed-users.js
// Run with: node scripts/seed-users.js   (from backend directory)
// Creates the 3 demo accounts needed for development/demo
//
// KEY: schema.sql creates ALL identifiers WITHOUT quotes.
// PostgreSQL folds unquoted identifiers to lowercase.
// So: table 'role', columns 'roleid','rolename'
//     table 'User' (quoted → mixed case), columns 'userid','username','passwordhash','roleid'

'use strict';
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt   = require('bcryptjs');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME     || 'gateguard',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
});

const DEMO_PASSWORD = 'admin123';
const DEMO_USERS = [
  { username: 'superadmin', roleName: 'SuperAdmin', email: 'superadmin@iitgn.ac.in' },
  { username: 'admin',      roleName: 'Admin',      email: 'admin@iitgn.ac.in' },
  { username: 'guard',      roleName: 'Guard',      email: 'guard@iitgn.ac.in' },
];

async function main() {
  console.log('\n🌱  GateGuard seed-users.js');
  console.log('──────────────────────────────\n');

  // 1 — Ensure roles exist
  // Table: role (lowercase). Columns: roleid, rolename, createdat, updatedat
  // Constraint: rolename IN ('Guard','Admin','SuperAdmin')
  console.log('Step 1: Ensuring roles exist…');
  for (const u of DEMO_USERS) {
    await pool.query(
      `INSERT INTO role (rolename) VALUES ($1) ON CONFLICT (rolename) DO NOTHING`,
      [u.roleName]
    );
    process.stdout.write(`  ✓ Role "${u.roleName}" ready\n`);
  }

  // 2 — Hash password
  console.log('\nStep 2: Hashing demo password (12 rounds)…');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  console.log('  ✓ Hash generated');

  // 3 — Insert users
  // Table: "User" (quoted → mixed-case). Columns: userid, username, passwordhash, roleid
  console.log('\nStep 3: Creating demo users…');
  let created = 0;
  let skipped = 0;
  for (const u of DEMO_USERS) {
    // Look up roleid (lowercase column name)
    const { rows: roleRows } = await pool.query(
      `SELECT roleid FROM role WHERE rolename = $1`,
      [u.roleName]
    );
    if (roleRows.length === 0) {
      console.warn(`  ⚠  Role "${u.roleName}" not found — skipping "${u.username}"`);
      continue;
    }
    const roleId = roleRows[0].roleid;

    const { rows } = await pool.query(
      `INSERT INTO "User" (username, passwordhash, roleid, email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO NOTHING
       RETURNING userid`,
      [u.username, passwordHash, roleId, u.email]
    );

    if (rows.length > 0) {
      console.log(`  ✓  Created  ${u.username.padEnd(14)} [${u.roleName}]`);
      created++;
    } else {
      console.log(`  –  Skipped  ${u.username.padEnd(14)} [${u.roleName}]  (already exists)`);
      skipped++;
    }
  }

  console.log(`\n✅  Done — ${created} created, ${skipped} skipped.`);
  console.log('\nDemo credentials:');
  console.log('  Username: superadmin | admin | guard');
  console.log(`  Password: ${DEMO_PASSWORD}\n`);
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error('\n❌  Seed failed:', err.message);
    pool.end();
    process.exit(1);
  });
