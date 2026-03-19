// src/models/vehicleVisit.model.js
// NOTE: v.RegistrationNumber → v.licenseplate (actual schema column)
// OwnerID is nullable → LEFT JOIN member

const { query } = require('../config/db');

const BASE_SELECT = `
  vv.visitid        AS "VisitID",
  vv.vehicleid      AS "VehicleID",
  v.licenseplate    AS "RegistrationNumber",
  vt.typename       AS "VehicleType",
  m.name            AS "OwnerName",
  vv.entrygateid    AS "EntryGateID",
  eg.name           AS "EntryGateName",
  vv.exitgateid     AS "ExitGateID",
  xg.name           AS "ExitGateName",
  vv.entrytime      AS "EntryTime",
  vv.exittime       AS "ExitTime",
  CASE WHEN vv.exittime IS NULL THEN true ELSE false END AS "IsActive"
`;

async function findAll({ limit = 20, offset = 0, vehicleId = null, gateId = null, search = null, active = null, startDate = null, endDate = null } = {}) {
  const params = [];
  const conditions = [];
  let idx = 1;

  if (vehicleId) { conditions.push(`vv.vehicleid = $${idx}`); params.push(vehicleId); idx++; }
  if (gateId)    { conditions.push(`(vv.entrygateid = $${idx} OR vv.exitgateid = $${idx})`); params.push(gateId); idx++; }
  if (search) {
    conditions.push(`(
      v.licenseplate ILIKE $${idx}
      OR m.name ILIKE $${idx}
      OR m.email ILIKE $${idx}
    )`);
    params.push(`%${search}%`);
    idx++;
  }
  if (active === 'true' || active === true) {
    conditions.push('vv.exittime IS NULL');
  } else if (active === 'false' || active === false) {
    conditions.push('vv.exittime IS NOT NULL');
  }
  if (startDate) { conditions.push(`vv.entrytime >= $${idx}`); params.push(startDate); idx++; }
  if (endDate)   { conditions.push(`vv.entrytime <= $${idx}`); params.push(endDate); idx++; }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await query(
    `SELECT ${BASE_SELECT}
       FROM vehiclevisit vv
       JOIN vehicle v ON v.vehicleid = vv.vehicleid
       JOIN vehicletype vt ON vt.typeid = v.typeid
       LEFT JOIN member m ON m.memberid = v.ownerid
       JOIN gate eg ON eg.gateid = vv.entrygateid
       LEFT JOIN gate xg ON xg.gateid = vv.exitgateid
     ${where}
     ORDER BY vv.entrytime DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );
  return rows;
}

async function count({ vehicleId = null, gateId = null, search = null, active = null, startDate = null, endDate = null } = {}) {
  const params = [];
  const conditions = [];
  let idx = 1;
  if (vehicleId) { conditions.push(`vv.vehicleid = $${idx}`); params.push(vehicleId); idx++; }
  if (gateId)    { conditions.push(`(vv.entrygateid = $${idx} OR vv.exitgateid = $${idx})`); params.push(gateId); idx++; }
  if (search) {
    conditions.push(`(
      EXISTS (
        SELECT 1
        FROM vehicle v
        LEFT JOIN member m ON m.memberid = v.ownerid
        WHERE v.vehicleid = vv.vehicleid
          AND (
            v.licenseplate ILIKE $${idx}
            OR m.name ILIKE $${idx}
            OR m.email ILIKE $${idx}
          )
      )
    )`);
    params.push(`%${search}%`);
    idx++;
  }
  if (active === 'true' || active === true) {
    conditions.push('vv.exittime IS NULL');
  } else if (active === 'false' || active === false) {
    conditions.push('vv.exittime IS NOT NULL');
  }
  if (startDate) { conditions.push(`vv.entrytime >= $${idx}`); params.push(startDate); idx++; }
  if (endDate)   { conditions.push(`vv.entrytime <= $${idx}`); params.push(endDate); idx++; }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(`SELECT COUNT(*)::int AS total FROM vehiclevisit vv ${where}`, params);
  return rows[0].total;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT ${BASE_SELECT}
       FROM vehiclevisit vv
       JOIN vehicle v ON v.vehicleid = vv.vehicleid
       JOIN vehicletype vt ON vt.typeid = v.typeid
       LEFT JOIN member m ON m.memberid = v.ownerid
       JOIN gate eg ON eg.gateid = vv.entrygateid
       LEFT JOIN gate xg ON xg.gateid = vv.exitgateid
      WHERE vv.visitid = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findActiveByVehicle(vehicleId) {
  const { rows } = await query(
    'SELECT visitid FROM vehiclevisit WHERE vehicleid = $1 AND exittime IS NULL LIMIT 1',
    [vehicleId]
  );
  return rows[0] || null;
}

async function recordEntry({ vehicleId, entryGateId }) {
  const { rows } = await query(
    `INSERT INTO vehiclevisit (vehicleid, entrygateid, entrytime)
     VALUES ($1, $2, NOW()) RETURNING visitid AS "VisitID"`,
    [vehicleId, entryGateId]
  );
  return rows[0];
}

async function recordExit(visitId, exitGateId) {
  const { rows } = await query(
    `UPDATE vehiclevisit SET exittime = NOW(), exitgateid = $1
      WHERE visitid = $2 AND exittime IS NULL RETURNING *`,
    [exitGateId, visitId]
  );
  return rows[0] || null;
}

async function deleteSingle(id) {
  const { rows } = await query('DELETE FROM vehiclevisit WHERE visitid = $1 RETURNING visitid AS "VisitID"', [id]);
  return rows[0] || null;
}

module.exports = { findAll, findById, findActiveByVehicle, recordEntry, recordExit, delete: deleteSingle, count };
