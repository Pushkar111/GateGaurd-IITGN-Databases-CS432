// src/models/userApproval.model.js
// Persistence for user creation approval requests.

const { query } = require('../config/db');

let ensured = false;

async function ensureTable() {
  if (ensured) return;

  await query(
    `CREATE TABLE IF NOT EXISTS usercreationrequest (
      requestid SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL,
      passwordhash TEXT NOT NULL,
      roleid INT NOT NULL REFERENCES role(roleid),
      requestedby INT NOT NULL REFERENCES "User"(userid),
      status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      reviewedby INT REFERENCES "User"(userid),
      reviewnote TEXT,
      reviewedat TIMESTAMP,
      createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    []
  );

  await query(
    `CREATE UNIQUE INDEX IF NOT EXISTS uq_usercreationrequest_pending_username
     ON usercreationrequest (LOWER(username))
     WHERE status = 'pending'`,
    []
  );

  ensured = true;
}

function mapRow(r) {
  if (!r) return null;
  return {
    requestId: r.requestid,
    username: r.username,
    roleId: r.roleid,
    roleName: r.rolename,
    status: r.status,
    requestedBy: r.requestedby,
    requestedByUsername: r.requestedbyusername,
    reviewedBy: r.reviewedby,
    reviewedByUsername: r.reviewedbyusername,
    reviewNote: r.reviewnote,
    reviewedAt: r.reviewedat,
    createdAt: r.createdat,
  };
}

async function hasPendingUsername(username) {
  await ensureTable();
  const { rows } = await query(
    `SELECT 1
       FROM usercreationrequest
      WHERE status = 'pending' AND LOWER(username) = LOWER($1)
      LIMIT 1`,
    [username]
  );
  return rows.length > 0;
}

async function createRequest({ username, passwordHash, roleId, requestedBy }) {
  await ensureTable();
  const { rows } = await query(
    `INSERT INTO usercreationrequest (username, passwordhash, roleid, requestedby)
     VALUES ($1, $2, $3, $4)
     RETURNING requestid, username, roleid, status, requestedby, reviewedby, reviewnote, reviewedat, createdat`,
    [username, passwordHash, roleId, requestedBy]
  );
  return mapRow(rows[0]);
}

async function getPendingRequests() {
  await ensureTable();
  const { rows } = await query(
    `SELECT r.requestid, r.username, r.roleid, rl.rolename, r.status,
            r.requestedby, u1.username AS requestedbyusername,
            r.reviewedby, u2.username AS reviewedbyusername,
            r.reviewnote, r.reviewedat, r.createdat
       FROM usercreationrequest r
       JOIN role rl ON rl.roleid = r.roleid
       JOIN "User" u1 ON u1.userid = r.requestedby
       LEFT JOIN "User" u2 ON u2.userid = r.reviewedby
      WHERE r.status = 'pending'
      ORDER BY r.createdat ASC`,
    []
  );
  return rows.map(mapRow);
}

async function getRequestById(requestId) {
  await ensureTable();
  const { rows } = await query(
    `SELECT r.requestid, r.username, r.passwordhash, r.roleid, rl.rolename, r.status,
            r.requestedby, u1.username AS requestedbyusername,
            r.reviewedby, u2.username AS reviewedbyusername,
            r.reviewnote, r.reviewedat, r.createdat
       FROM usercreationrequest r
       JOIN role rl ON rl.roleid = r.roleid
       JOIN "User" u1 ON u1.userid = r.requestedby
       LEFT JOIN "User" u2 ON u2.userid = r.reviewedby
      WHERE r.requestid = $1`,
    [requestId]
  );
  if (!rows[0]) return null;
  return {
    ...mapRow(rows[0]),
    passwordHash: rows[0].passwordhash,
  };
}

async function markApproved(requestId, reviewedBy, note = null) {
  await ensureTable();
  const { rows } = await query(
    `UPDATE usercreationrequest
        SET status = 'approved', reviewedby = $2, reviewedat = NOW(), reviewnote = $3
      WHERE requestid = $1 AND status = 'pending'
      RETURNING requestid`,
    [requestId, reviewedBy, note]
  );
  return rows.length > 0;
}

async function markRejected(requestId, reviewedBy, note = null) {
  await ensureTable();
  const { rows } = await query(
    `UPDATE usercreationrequest
        SET status = 'rejected', reviewedby = $2, reviewedat = NOW(), reviewnote = $3
      WHERE requestid = $1 AND status = 'pending'
      RETURNING requestid`,
    [requestId, reviewedBy, note]
  );
  return rows.length > 0;
}

module.exports = {
  hasPendingUsername,
  createRequest,
  getPendingRequests,
  getRequestById,
  markApproved,
  markRejected,
};
