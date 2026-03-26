// src/models/gate.model.js
// NOTE: schema.sql Gate table has: GateID, Name, Location, CreatedAt, UpdatedAt
// No 'Status' column exists in Assignment 1 schema.
// personvisit uses 'personid' (not memberid)

const { query } = require('../config/db');

let capacityColumnEnsured = false;

async function ensureCapacityColumn() {
  if (capacityColumnEnsured) return;
  await query(
    `ALTER TABLE gateoccupancy
     ADD COLUMN IF NOT EXISTS capacitylimit INTEGER NOT NULL DEFAULT 20`,
    []
  );
  capacityColumnEnsured = true;
}

async function findAll() {
  await ensureCapacityColumn();
  const { rows } = await query(
    `SELECT g.gateid AS "GateID", g.name AS "Name", g.location AS "Location",
            g.createdat AS "CreatedAt",
            COALESCE(go.occupancycount, 0) AS "OccupancyCount",
            COALESCE(go.capacitylimit, 20) AS "CapacityLimit"
       FROM gate g
       LEFT JOIN gateoccupancy go ON go.gateid = g.gateid
      ORDER BY g.gateid`,
    []
  );
  return rows;
}

async function findById(id) {
  await ensureCapacityColumn();
  const { rows } = await query(
    `SELECT g.gateid AS "GateID", g.name AS "Name", g.location AS "Location",
            g.createdat AS "CreatedAt",
            COALESCE(go.occupancycount, 0) AS "OccupancyCount",
            COALESCE(go.capacitylimit, 20) AS "CapacityLimit"
       FROM gate g
       LEFT JOIN gateoccupancy go ON go.gateid = g.gateid
      WHERE g.gateid = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const gate = rows[0];

  // fetch recent person visits for detail view (personid, not memberid)
  const { rows: recentVisits } = await query(
    `SELECT pv.visitid AS "VisitID", 'person' AS "Type",
            m.name AS "Subject", pv.entrytime AS "EntryTime", pv.exittime AS "ExitTime"
       FROM personvisit pv
       JOIN member m ON m.memberid = pv.personid
      WHERE pv.entrygateid = $1 OR pv.exitgateid = $1
      ORDER BY pv.entrytime DESC
      LIMIT 10`,
    [id]
  );
  return { ...gate, recentVisits };
}

async function create(data) {
  const { name, location } = data;
  const { rows } = await query(
    `INSERT INTO gate (name, location) VALUES ($1, $2)
     RETURNING gateid AS "GateID", name AS "Name", location AS "Location", createdat AS "CreatedAt"`,
    [name, location]
  );
  // also create a gateoccupancy row for the new gate
  if (rows[0]) {
    await query(
      `INSERT INTO gateoccupancy (gateid, occupancycount) VALUES ($1, 0) ON CONFLICT (gateid) DO NOTHING`,
      [rows[0].GateID]
    );
  }
  return rows[0];
}

async function update(id, data) {
  const allowed = { name: 'name', location: 'location' };
  const setClauses = [];
  const values = [];
  let idx = 1;
  for (const [key, col] of Object.entries(allowed)) {
    if (data[key] !== undefined) { setClauses.push(`${col} = $${idx++}`); values.push(data[key]); }
  }
  if (!setClauses.length) return null;
  values.push(id);
  const { rows } = await query(
    `UPDATE gate SET ${setClauses.join(', ')} WHERE gateid = $${idx}
     RETURNING gateid AS "GateID", name AS "Name", location AS "Location"`,
    values
  );
  return rows[0] || null;
}

async function deleteSingle(id) {
  const { rows } = await query(
    'DELETE FROM gate WHERE gateid = $1 RETURNING gateid AS "GateID", name AS "Name"',
    [id]
  );
  return rows[0] || null;
}

module.exports = { findAll, findById, create, update, delete: deleteSingle };
