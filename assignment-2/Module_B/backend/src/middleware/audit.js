// src/middleware/audit.js
// Audit logging middleware for mutations (POST, PUT, DELETE)
// Logs to both Winston (audit.log file) AND the AuditLog database table
//
// Usage: router.post('/', authenticate, auditLog('Member', 'CREATE'), controller)
// OR just attach it after the controller has run by using a response interceptor pattern

const logger = require('../utils/logger');
const { query } = require('../config/db');

/**
 * Factory: creates an express middleware that logs a mutation to audit.log + DB.
 *
 * @param {string} tableName - e.g. 'Member', 'Vehicle'
 * @param {string} action    - 'CREATE' | 'UPDATE' | 'DELETE'
 *
 * The middleware expects req.user to be set (run after authenticate).
 * oldValue and newValue are attached to req by the controller/service
 * before calling next(), so this middleware must be placed AFTER the
 * business logic but we achieve this by having controllers call
 * auditRecord() directly. See audit.service.js for the actual insert.
 */
function auditLog(tableName, action) {
  return async (req, res, next) => {
    // just pass through — the actual audit insert happens in services
    // this middleware sets context so services can read it
    req.auditContext = {
      tableName,
      action,
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    };
    next();
  };
}

/**
 * Direct function used by services to write an audit record.
 * Called AFTER the mutation succeeds.
 */
async function writeAuditRecord({
  user,          // { userId, username, role }
  tableName,
  recordId,
  action,
  oldValue,
  newValue,
  method,
  endpoint,
  statusCode,
  ip,
}) {
  try {
    const auditUserId = user?.userId ?? user?.UserID ?? user?.userid ?? null;
    const auditUsername = user?.username ?? user?.Username ?? user?.userName ?? user?.UserName ?? null;
    const auditRole = user?.role ?? user?.Role ?? user?.roleName ?? user?.RoleName ?? null;

    // 1. write to the log file
    logger.audit({
      action,
      user: auditUsername || 'system',
      role: auditRole || '-',
      table: tableName,
      recordId,
      status: statusCode,
    });

    // 2. insert into AuditLog table
    await query(
      `INSERT INTO AuditLog
         (UserID, Username, Role, Method, Endpoint, TableName, RecordID,
          Action, OldValue, NewValue, IPAddress, StatusCode)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        auditUserId,
        auditUsername,
        auditRole,
        method         || '-',
        endpoint       || '-',
        tableName      || null,
        recordId       || null,
        action,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        ip             || null,
        statusCode     || null,
      ]
    );
  } catch (err) {
    // audit failures should never crash the app — just log the error
    logger.error(`Failed to write audit record: ${err.message}`);
  }
}

module.exports = { auditLog, writeAuditRecord };
