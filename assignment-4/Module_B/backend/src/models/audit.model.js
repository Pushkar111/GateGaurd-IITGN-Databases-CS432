// src/models/audit.model.js
const { query } = require('../config/db');

async function findAll({ limit = 20, offset = 0, userId = null, action = null, tableName = null, startDate = null, endDate = null } = {}) {
  const params = [];
  const conditions = [];
  let idx = 1;

  if (userId)    { conditions.push(`a.UserID = $${idx}`);    params.push(userId);    idx++; }
  if (action)    { conditions.push(`a.Action = $${idx}`);    params.push(action);    idx++; }
  if (tableName) { conditions.push(`a.TableName = $${idx}`); params.push(tableName); idx++; }
  if (startDate) { conditions.push(`a.CreatedAt >= $${idx}`); params.push(startDate); idx++; }
  if (endDate)   { conditions.push(`a.CreatedAt <= $${idx}`); params.push(endDate);   idx++; }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await query(
    `SELECT a.LogID,
            a.UserID,
            COALESCE(a.Username, u.username) AS Username,
            COALESCE(a.Role, r.rolename) AS Role,
            a.Method,
            a.Endpoint,
            a.TableName,
            a.RecordID,
            a.Action,
            a.OldValue,
            a.NewValue,
            a.IPAddress,
            a.StatusCode,
            a.CreatedAt
       FROM AuditLog a
       LEFT JOIN "User" u
         ON a.TableName = 'User'
        AND a.RecordID = u.userid
       LEFT JOIN role r
         ON u.roleid = r.roleid
     ${where}
     ORDER BY a.CreatedAt DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );
  return rows;
}

async function count({ userId = null, action = null, tableName = null, startDate = null, endDate = null } = {}) {
  const params = [];
  const conditions = [];
  let idx = 1;
  if (userId)    { conditions.push(`UserID = $${idx}`);    params.push(userId);    idx++; }
  if (action)    { conditions.push(`Action = $${idx}`);    params.push(action);    idx++; }
  if (tableName) { conditions.push(`TableName = $${idx}`); params.push(tableName); idx++; }
  if (startDate) { conditions.push(`CreatedAt >= $${idx}`); params.push(startDate); idx++; }
  if (endDate)   { conditions.push(`CreatedAt <= $${idx}`); params.push(endDate); idx++; }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(`SELECT COUNT(*)::int AS total FROM AuditLog ${where}`, params);
  return rows[0].total;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT a.LogID,
            a.UserID,
            COALESCE(a.Username, u.username) AS Username,
            COALESCE(a.Role, r.rolename) AS Role,
            a.Method,
            a.Endpoint,
            a.TableName,
            a.RecordID,
            a.Action,
            a.OldValue,
            a.NewValue,
            a.IPAddress,
            a.StatusCode,
            a.CreatedAt
       FROM AuditLog a
       LEFT JOIN "User" u
         ON a.TableName = 'User'
        AND a.RecordID = u.userid
       LEFT JOIN role r
         ON u.roleid = r.roleid
      WHERE a.LogID = $1`,
    [id]
  );
  return rows[0] || null;
}

module.exports = { findAll, findById, count };
