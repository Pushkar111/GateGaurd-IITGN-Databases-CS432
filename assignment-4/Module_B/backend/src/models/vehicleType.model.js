// src/models/vehicleType.model.js
const { query } = require('../config/db');

async function findAll() {
  const { rows } = await query('SELECT TypeID, TypeName FROM VehicleType ORDER BY TypeID', []);
  return rows;
}

async function findById(id) {
  const { rows } = await query('SELECT TypeID, TypeName FROM VehicleType WHERE TypeID = $1', [id]);
  return rows[0] || null;
}

module.exports = { findAll, findById };
