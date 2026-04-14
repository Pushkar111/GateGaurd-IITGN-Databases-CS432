// src/models/memberType.model.js
const { query } = require('../config/db');

async function findAll() {
  const { rows } = await query(
    'SELECT TypeID, TypeName FROM MemberType ORDER BY TypeID',
    []
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    'SELECT TypeID, TypeName FROM MemberType WHERE TypeID = $1',
    [id]
  );
  return rows[0] || null;
}

module.exports = { findAll, findById };
