// src/models/vehicle.model.js
// NOTE: schema.sql column is 'LicensePlate' (not 'RegistrationNumber')
// OwnerID is nullable → LEFT JOIN Member

const { query } = require('../config/db');

const BASE_SELECT = `
  v.vehicleid    AS "VehicleID",
  v.licenseplate AS "RegistrationNumber",
  v.typeid       AS "TypeID",
  v.ownerid      AS "OwnerID",
  v.createdat    AS "CreatedAt",
  vt.typename    AS "TypeName",
  m.name         AS "OwnerName",
  m.email        AS "OwnerEmail"
`;

async function findAll({ limit = 20, offset = 0, search = '', typeId = null, ownerId = null } = {}) {
  const params = [];
  const conditions = [];
  let idx = 1;

  if (search)  { conditions.push(`v.licenseplate ILIKE $${idx}`); params.push(`%${search}%`); idx++; }
  if (typeId)  { conditions.push(`v.typeid = $${idx}`);  params.push(typeId);  idx++; }
  if (ownerId) { conditions.push(`v.ownerid = $${idx}`); params.push(ownerId); idx++; }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await query(
    `SELECT ${BASE_SELECT}
       FROM vehicle v
       JOIN vehicletype vt ON vt.typeid = v.typeid
       LEFT JOIN member m ON m.memberid = v.ownerid
     ${where}
     ORDER BY v.vehicleid
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );
  return rows;
}

async function count({ search = '', typeId = null, ownerId = null } = {}) {
  const params = [];
  const conditions = [];
  let idx = 1;
  if (search)  { conditions.push(`v.licenseplate ILIKE $${idx}`); params.push(`%${search}%`); idx++; }
  if (typeId)  { conditions.push(`v.typeid = $${idx}`);  params.push(typeId);  idx++; }
  if (ownerId) { conditions.push(`v.ownerid = $${idx}`); params.push(ownerId); idx++; }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(`SELECT COUNT(*)::int AS total FROM vehicle v ${where}`, params);
  return rows[0].total;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT ${BASE_SELECT}
       FROM vehicle v
       JOIN vehicletype vt ON vt.typeid = v.typeid
       LEFT JOIN member m ON m.memberid = v.ownerid
      WHERE v.vehicleid = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const vehicle = rows[0];

  // fetch recent 5 visits
  const { rows: recentVisits } = await query(
    `SELECT vv.visitid AS "VisitID", vv.entrytime AS "EntryTime", vv.exittime AS "ExitTime",
            eg.name AS "EntryGate", xg.name AS "ExitGate"
       FROM vehiclevisit vv
       JOIN gate eg ON eg.gateid = vv.entrygateid
       LEFT JOIN gate xg ON xg.gateid = vv.exitgateid
      WHERE vv.vehicleid = $1
      ORDER BY vv.entrytime DESC
      LIMIT 5`,
    [id]
  );

  // fetch visit counts
  const { rows: stats } = await query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE exittime IS NULL)::int AS active
       FROM vehiclevisit
      WHERE vehicleid = $1`,
    [id]
  );

  return {
    ...vehicle,
    recentVisits,
    totalVisits:  stats[0].total || 0,
    activeVisits: stats[0].active || 0,
  };
}

async function create(data) {
  const { registrationNumber, ownerId, typeId } = data;
  const { rows } = await query(
    `INSERT INTO vehicle (licenseplate, ownerid, typeid)
     VALUES ($1, $2, $3)
     RETURNING vehicleid AS "VehicleID", licenseplate AS "RegistrationNumber", ownerid AS "OwnerID", typeid AS "TypeID", createdat AS "CreatedAt"`,
    [registrationNumber, ownerId, typeId]
  );
  return rows[0];
}

async function update(id, data) {
  const allowed = {
    registrationNumber: 'licenseplate',
    ownerId:            'ownerid',
    typeId:             'typeid',
  };
  const setClauses = [];
  const values = [];
  let idx = 1;
  for (const [key, col] of Object.entries(allowed)) {
    if (data[key] !== undefined) { setClauses.push(`${col} = $${idx++}`); values.push(data[key]); }
  }
  if (!setClauses.length) return null;
  values.push(id);
  const { rows } = await query(
    `UPDATE vehicle SET ${setClauses.join(', ')} WHERE vehicleid = $${idx}
     RETURNING vehicleid AS "VehicleID", licenseplate AS "RegistrationNumber", ownerid AS "OwnerID"`,
    values
  );
  return rows[0] || null;
}

async function deleteSingle(id) {
  const { rows } = await query(
    'DELETE FROM vehicle WHERE vehicleid = $1 RETURNING vehicleid AS "VehicleID", licenseplate AS "RegistrationNumber"',
    [id]
  );
  return rows[0] || null;
}

module.exports = { findAll, findById, create, update, delete: deleteSingle, count };
