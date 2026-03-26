// src/models/personVisit.model.js
// NOTE: schema.sql column for member FK in PersonVisit is 'PersonID' (not MemberID)
// All table/column names are lowercase (unquoted in schema)

const { query } = require('../config/db');

const BASE_SELECT = `
  pv.visitid        AS "VisitID",
  pv.personid       AS "MemberID",
  m.name            AS "MemberName",
  m.email           AS "MemberEmail",
  pv.entrygateid    AS "EntryGateID",
  eg.name           AS "EntryGateName",
  pv.exitgateid     AS "ExitGateID",
  xg.name           AS "ExitGateName",
  pv.vehicleid      AS "VehicleID",
  v.licenseplate    AS "VehicleReg",
  pv.entrytime      AS "EntryTime",
  pv.exittime       AS "ExitTime",
  CASE WHEN pv.exittime IS NULL THEN true ELSE false END AS "IsActive"
`;

async function findAll({ limit = 20, offset = 0, memberId = null, gateId = null, search = null, active = null, startDate = null, endDate = null } = {}) {
  const params = [];
  const conditions = [];
  let idx = 1;

  if (memberId) { conditions.push(`pv.personid = $${idx}`); params.push(memberId); idx++; }
  if (gateId)   { conditions.push(`(pv.entrygateid = $${idx} OR pv.exitgateid = $${idx})`); params.push(gateId); idx++; }
  if (search) {
    conditions.push(`(
      m.name ILIKE $${idx}
      OR m.email ILIKE $${idx}
      OR v.licenseplate ILIKE $${idx}
    )`);
    params.push(`%${search}%`);
    idx++;
  }
  if (active === 'true' || active === true) {
    conditions.push('pv.exittime IS NULL');
  } else if (active === 'false' || active === false) {
    conditions.push('pv.exittime IS NOT NULL');
  }
  if (startDate) { conditions.push(`pv.entrytime >= $${idx}`); params.push(startDate); idx++; }
  if (endDate)   { conditions.push(`pv.entrytime <= $${idx}`); params.push(endDate);   idx++; }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await query(
    `SELECT ${BASE_SELECT}
       FROM personvisit pv
       JOIN member m ON m.memberid = pv.personid
       JOIN gate eg ON eg.gateid = pv.entrygateid
       LEFT JOIN gate xg ON xg.gateid = pv.exitgateid
       LEFT JOIN vehicle v ON v.vehicleid = pv.vehicleid
     ${where}
     ORDER BY pv.entrytime DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );
  return rows;
}

async function count({ memberId = null, gateId = null, search = null, active = null, startDate = null, endDate = null } = {}) {
  const params = [];
  const conditions = [];
  let idx = 1;
  if (memberId) { conditions.push(`pv.personid = $${idx}`); params.push(memberId); idx++; }
  if (gateId)   { conditions.push(`(pv.entrygateid = $${idx} OR pv.exitgateid = $${idx})`); params.push(gateId); idx++; }
  if (search) {
    conditions.push(`(
      EXISTS (
        SELECT 1
        FROM member m
        WHERE m.memberid = pv.personid
          AND (m.name ILIKE $${idx} OR m.email ILIKE $${idx})
      )
      OR EXISTS (
        SELECT 1
        FROM vehicle v
        WHERE v.vehicleid = pv.vehicleid
          AND v.licenseplate ILIKE $${idx}
      )
    )`);
    params.push(`%${search}%`);
    idx++;
  }
  if (active === 'true' || active === true) {
    conditions.push('pv.exittime IS NULL');
  } else if (active === 'false' || active === false) {
    conditions.push('pv.exittime IS NOT NULL');
  }
  if (startDate) { conditions.push(`pv.entrytime >= $${idx}`); params.push(startDate); idx++; }
  if (endDate)   { conditions.push(`pv.entrytime <= $${idx}`); params.push(endDate); idx++; }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(`SELECT COUNT(*)::int AS total FROM personvisit pv ${where}`, params);
  return rows[0].total;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT ${BASE_SELECT}
       FROM personvisit pv
       JOIN member m ON m.memberid = pv.personid
       JOIN gate eg ON eg.gateid = pv.entrygateid
       LEFT JOIN gate xg ON xg.gateid = pv.exitgateid
       LEFT JOIN vehicle v ON v.vehicleid = pv.vehicleid
      WHERE pv.visitid = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findActiveByMember(memberId) {
  const { rows } = await query(
    `SELECT visitid FROM personvisit WHERE personid = $1 AND exittime IS NULL LIMIT 1`,
    [memberId]
  );
  return rows[0] || null;
}

async function recordEntry({ memberId, entryGateId, vehicleId = null }) {
  const { rows } = await query(
    `INSERT INTO personvisit (personid, entrygateid, vehicleid, entrytime)
     VALUES ($1, $2, $3, NOW()) RETURNING visitid AS "VisitID"`,
    [memberId, entryGateId, vehicleId]
  );
  return rows[0];
}

async function recordExit(visitId, exitGateId) {
  const { rows } = await query(
    `UPDATE personvisit SET exittime = NOW(), exitgateid = $1
      WHERE visitid = $2 AND exittime IS NULL RETURNING *`,
    [exitGateId, visitId]
  );
  return rows[0] || null;
}

async function deleteSingle(id) {
  const { rows } = await query('DELETE FROM personvisit WHERE visitid = $1 RETURNING visitid AS "VisitID"', [id]);
  return rows[0] || null;
}

module.exports = { findAll, findById, findActiveByMember, recordEntry, recordExit, delete: deleteSingle, count };
