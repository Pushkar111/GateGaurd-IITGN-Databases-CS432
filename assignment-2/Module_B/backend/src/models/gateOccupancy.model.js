// src/models/gateOccupancy.model.js
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
    `SELECT go.gateid AS "GateID", g.name AS "GateName", go.occupancycount AS "OccupancyCount",
            go.capacitylimit AS "CapacityLimit"
       FROM gateoccupancy go
       JOIN gate g ON g.gateid = go.gateid
      ORDER BY go.gateid`,
    []
  );
  return rows;
}

async function findByGateId(gateId) {
  await ensureCapacityColumn();
  const { rows } = await query(
    `SELECT go.gateid AS "GateID", g.name AS "GateName", go.occupancycount AS "OccupancyCount",
            go.capacitylimit AS "CapacityLimit"
       FROM gateoccupancy go
       JOIN gate g ON g.gateid = go.gateid
      WHERE go.gateid = $1`,
    [gateId]
  );
  return rows[0] || null;
}

async function updateCount(gateId, occupancyCount, options = {}) {
  await ensureCapacityColumn();
  const updates = ['occupancycount = $1'];
  const values = [occupancyCount];

  if (options.capacityLimit !== undefined) {
    updates.push(`capacitylimit = $${values.length + 1}`);
    values.push(options.capacityLimit);
  }

  values.push(gateId);
  const { rows } = await query(
    `UPDATE gateoccupancy SET ${updates.join(', ')} WHERE gateid = $${values.length}
     RETURNING gateid AS "GateID", occupancycount AS "OccupancyCount", capacitylimit AS "CapacityLimit"`,
    values
  );
  return rows[0] || null;
}

// Creates a default occupancy row when a gate is created
async function createForGate(gateId) {
  await ensureCapacityColumn();
  const { rows } = await query(
    `INSERT INTO gateoccupancy (gateid, occupancycount, capacitylimit)
     VALUES ($1, 0, 20)
     RETURNING gateid AS "GateID", occupancycount AS "OccupancyCount", capacitylimit AS "CapacityLimit"`,
    [gateId]
  );
  return rows[0];
}

module.exports = { findAll, findByGateId, updateCount, createForGate };
