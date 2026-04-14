// src/models/user.model.js
// Raw SQL queries for the User table
// IMPORTANT: PasswordHash is NEVER returned in any public-facing query
//
// CASING NOTE (schema.sql uses unquoted identifiers → PostgreSQL stores as lowercase):
//   Table "User"     → quoted in schema → stored as "User"   (case-sensitive)
//   Table  Role      → unquoted         → stored as "role"   (lowercase)
//   All column names → unquoted         → stored as lowercase
//   Column access from pg result rows: userid, username, roleid, rolename, createdat

const { query } = require('../config/db');

// Base SELECT — all column names unquoted so PostgreSQL folds to lowercase in results
const PUBLIC_FIELDS = `
  u.userid,
  u.username,
  u.email,
  u.mustchangepassword,
  u.roleid,
  r.rolename AS role,
  u.createdat
`;

/**
 * Find user by username — includes passwordhash for auth check only.
 * Do NOT expose this result directly to the API response.
 */
async function findByUsername(username) {
  const { rows } = await query(
    `SELECT u.userid, u.username, u.passwordhash, u.roleid, r.rolename AS role, u.createdat
       FROM "User" u
       JOIN role r ON r.roleid = u.roleid
      WHERE u.username = $1`,
    [username]
  );
  if (!rows[0]) return null;
  // Map lowercase pg result keys to the PascalCase shape auth.service expects
  const r = rows[0];
  return {
    UserID:       r.userid,
    Username:     r.username,
    PasswordHash: r.passwordhash,
    RoleID:       r.roleid,
    Role:         r.role,
    CreatedAt:    r.createdat,
  };
}

/**
 * Find user by ID — NO password hash.
 */
async function findById(id) {
  const { rows } = await query(
    `SELECT ${PUBLIC_FIELDS}
       FROM "User" u
       JOIN role r ON r.roleid = u.roleid
      WHERE u.userid = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    UserID: r.userid,
    Username: r.username,
    Email: r.email,
    MustChangePassword: !!r.mustchangepassword,
    mustchangepassword: !!r.mustchangepassword,
    RoleID: r.roleid,
    Role: r.role,
    RoleName: r.role,
    CreatedAt: r.createdat,
  };
}

/**
 * Get all users — NO password hash.
 */
async function findAll({ limit, offset } = {}) {
  const { rows } = await query(
    `SELECT ${PUBLIC_FIELDS}
       FROM "User" u
       JOIN role r ON r.roleid = u.roleid
      ORDER BY u.userid
      LIMIT $1 OFFSET $2`,
    [limit || 20, offset || 0]
  );
  return rows.map((r) => ({ UserID: r.userid, Username: r.username, RoleID: r.roleid, RoleName: r.role, Role: r.role, CreatedAt: r.createdat }));
}

/**
 * Count total users (for pagination).
 */
async function countAll() {
  const { rows } = await query('SELECT COUNT(*)::int AS total FROM "User"', []);
  return rows[0].total;
}

/**
 * Create a new user. Expects a pre-hashed password.
 */
async function create({ username, passwordHash, roleId }) {
  const { rows } = await query(
    `INSERT INTO "User" (username, passwordhash, roleid)
     VALUES ($1, $2, $3)
     RETURNING userid, username, roleid, createdat`,
    [username, passwordHash, roleId]
  );
  const r = rows[0];
  return { UserID: r.userid, Username: r.username, RoleID: r.roleid, CreatedAt: r.createdat };
}

/**
 * Update a user. Supports passwordHash and/or roleId.
 */
async function update(id, fields) {
  const setClauses = [];
  const values = [];
  let idx = 1;

  if (fields.username)     { setClauses.push(`username = $${idx++}`);     values.push(fields.username); }
  if (fields.passwordHash) { setClauses.push(`passwordhash = $${idx++}`); values.push(fields.passwordHash); }
  if (fields.roleId)       { setClauses.push(`roleid = $${idx++}`);       values.push(fields.roleId); }

  if (setClauses.length === 0) return null;

  values.push(id);
  const { rows } = await query(
    `UPDATE "User" SET ${setClauses.join(', ')} WHERE userid = $${idx} RETURNING userid, username, roleid, createdat`,
    values
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return { UserID: r.userid, Username: r.username, RoleID: r.roleid, CreatedAt: r.createdat };
}

/**
 * Delete a user by ID.
 */
async function deleteSingle(id) {
  const { rows } = await query(
    `DELETE FROM "User" WHERE userid = $1 RETURNING userid, username`,
    [id]
  );
  if (!rows[0]) return null;
  return { UserID: rows[0].userid, Username: rows[0].username };
}

/**
 * Find user with role info — full JOIN, no password.
 */
async function findWithRole(id) {
  return findById(id);
}

module.exports = {
  findByUsername,
  findById,
  findAll,
  countAll,
  create,
  update,
  delete: deleteSingle,
  findWithRole,
};
