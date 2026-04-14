// src/models/role.model.js
// Raw SQL queries for the Role table
// NOTE: schema.sql creates Role without quotes → stored as lowercase 'role' in PostgreSQL

const { query } = require('../config/db');

async function findAll() {
  const { rows } = await query(
    'SELECT roleid AS "RoleID", rolename AS "RoleName" FROM role ORDER BY roleid',
    []
  );
  return rows;
}

async function findById(id) {
  const { rows } = await query(
    'SELECT roleid AS "RoleID", rolename AS "RoleName" FROM role WHERE roleid = $1',
    [id]
  );
  return rows[0] || null;
}

async function findByName(name) {
  const { rows } = await query(
    'SELECT roleid AS "RoleID", rolename AS "RoleName" FROM role WHERE rolename = $1',
    [name]
  );
  return rows[0] || null;
}

module.exports = { findAll, findById, findByName };
