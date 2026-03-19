// backend/scripts/seed-data.js
// Seeds lookup/reference data: MemberType, Gate, GateOccupancy
// Run with: node scripts/seed-data.js

'use strict';
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME     || 'gateguard',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
});

async function main() {
  console.log('\n🌱  Seeding reference data…\n');

  // MemberType — constraint: ('Resident', 'Student', 'Visitor')
  const memberTypes = ['Resident', 'Student', 'Visitor'];
  for (const t of memberTypes) {
    await pool.query(
      `INSERT INTO membertype (typename) VALUES ($1) ON CONFLICT (typename) DO NOTHING`,
      [t]
    );
    console.log(`  ✓ MemberType: ${t}`);
  }

  // VehicleType — constraint: ('PrivateCar', 'Taxi', 'Bike', 'Truck', 'Bus')
  const vehicleTypes = ['PrivateCar', 'Taxi', 'Bike', 'Truck', 'Bus'];
  for (const t of vehicleTypes) {
    await pool.query(
      `INSERT INTO vehicletype (typename) VALUES ($1) ON CONFLICT (typename) DO NOTHING`,
      [t]
    );
    console.log(`  ✓ VehicleType: ${t}`);
  }

  // Gates
  const gates = [
    { name: 'Main Gate',  location: 'North Entrance' },
    { name: 'East Gate',  location: 'East Entrance'  },
    { name: 'West Gate',  location: 'West Entrance'  },
    { name: 'South Gate', location: 'South Entrance' },
  ];
  for (const g of gates) {
    const { rows } = await pool.query(
      `INSERT INTO gate (name, location)
       SELECT CAST($1 AS VARCHAR), CAST($2 AS VARCHAR)
       WHERE NOT EXISTS (SELECT 1 FROM gate WHERE name = $1)
       RETURNING gateid`,
      [g.name, g.location]
    );
    const gateId = rows[0]?.gateid;
    if (gateId) {
      await pool.query(
        `INSERT INTO gateoccupancy (gateid, occupancycount) VALUES ($1, 0)
         ON CONFLICT (gateid) DO NOTHING`,
        [gateId]
      );
      console.log(`  ✓ Gate: ${g.name} (ID ${gateId}) + occupancy row`);
    } else {
      console.log(`  – Gate: ${g.name} (already exists)`);
    }
  }

  console.log('\n✅  Reference data seeded.\n');
}

main()
  .then(() => pool.end())
  .catch((err) => {
    console.error('\n❌  seed-data failed:', err.message);
    pool.end();
    process.exit(1);
  });
