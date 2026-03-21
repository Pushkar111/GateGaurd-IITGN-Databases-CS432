// src/models/member.model.js
// All table/column refs lowercase (unquoted in schema → stored as lowercase by PostgreSQL)
// personvisit uses 'personid' column (not memberid)
// vehicle uses 'licenseplate' column (not registrationnumber)

const { query } = require('../config/db');

const BASE_SELECT = `
  m.memberid      AS "MemberID",
  m.name          AS "Name",
  m.email         AS "Email",
  m.contactnumber AS "ContactNumber",
  m.age           AS "Age",
  m.department    AS "Department",
  m.typeid        AS "TypeID",
  mt.typename     AS "TypeName",
  m.createdat     AS "CreatedAt"
`;

async function findAll({ limit = 20, offset = 0, search = '', typeId = null, sortBy = 'memberid', order = 'ASC' } = {}) {
  // whitelist sortBy — column names as stored (lowercase)
  const allowed = ['memberid', 'name', 'email', 'createdat'];
  const col = allowed.includes(sortBy.toLowerCase()) ? sortBy.toLowerCase() : 'memberid';
  const dir = order === 'DESC' ? 'DESC' : 'ASC';

  const params = [];
  const conditions = [];
  let idx = 1;

  if (search) {
    conditions.push(`(m.name ILIKE $${idx} OR m.email ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }
  if (typeId) { conditions.push(`m.typeid = $${idx}`); params.push(typeId); idx++; }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit, offset);

  const { rows } = await query(
    `SELECT ${BASE_SELECT}
       FROM member m
       JOIN membertype mt ON mt.typeid = m.typeid
     ${where}
     ORDER BY m.${col} ${dir}
     LIMIT $${idx} OFFSET $${idx + 1}`,
    params
  );
  return rows;
}

async function count({ search = '', typeId = null } = {}) {
  const params = [];
  const conditions = [];
  let idx = 1;
  if (search) { conditions.push(`(m.name ILIKE $${idx} OR m.email ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
  if (typeId) { conditions.push(`m.typeid = $${idx}`); params.push(typeId); idx++; }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(`SELECT COUNT(*)::int AS total FROM member m ${where}`, params);
  return rows[0].total;
}

async function findById(id) {
  const { rows } = await query(
    `SELECT ${BASE_SELECT}
       FROM member m
       JOIN membertype mt ON mt.typeid = m.typeid
      WHERE m.memberid = $1`,
    [id]
  );
  if (!rows[0]) return null;
  const member = rows[0];

  // fetch associated vehicles (licenseplate is the column name)
  const { rows: vehicles } = await query(
    `SELECT v.vehicleid AS "VehicleID", v.licenseplate AS "RegistrationNumber",
            vt.typename AS "VehicleType"
       FROM vehicle v
       JOIN vehicletype vt ON vt.typeid = v.typeid
      WHERE v.ownerid = $1
      ORDER BY v.vehicleid`,
    [id]
  );

  // fetch recent 5 visits
  const { rows: recentVisits } = await query(
    `SELECT pv.visitid AS "VisitID", pv.entrytime AS "EntryTime", pv.exittime AS "ExitTime",
            eg.name AS "EntryGate", xg.name AS "ExitGate"
       FROM personvisit pv
       JOIN gate eg ON eg.gateid = pv.entrygateid
       LEFT JOIN gate xg ON xg.gateid = pv.exitgateid
      WHERE pv.personid = $1
      ORDER BY pv.entrytime DESC
      LIMIT 5`,
    [id]
  );

  // fetch visit counts
  const { rows: status } = await query(
    `SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE exittime IS NULL)::int AS active
       FROM personvisit
      WHERE personid = $1`,
    [id]
  );

  return {
    ...member,
    vehicles,
    recentVisits,
    totalVisits:  status[0].total || 0,
    activeVisits: status[0].active || 0,
  };
}

async function create(data) {
  const { name, email, contactNumber, typeId, age = null, department = null } = data;
  const { rows } = await query(
    `INSERT INTO member (name, email, contactnumber, typeid, age, department)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING memberid AS "MemberID", name AS "Name", email AS "Email",
               contactnumber AS "ContactNumber", typeid AS "TypeID", createdat AS "CreatedAt"`,
    [name, email, contactNumber, typeId, age, department]
  );
  return rows[0];
}

async function update(id, data) {
  const allowed = {
    name:          'name',
    email:         'email',
    contactNumber: 'contactnumber',
    typeId:        'typeid',
    age:           'age',
    department:    'department',
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
    `UPDATE member SET ${setClauses.join(', ')} WHERE memberid = $${idx}
     RETURNING memberid AS "MemberID", name AS "Name", email AS "Email"`,
    values
  );
  return rows[0] || null;
}

async function deleteSingle(id) {
  const { rows } = await query(
    'DELETE FROM member WHERE memberid = $1 RETURNING memberid AS "MemberID", name AS "Name"',
    [id]
  );
  return rows[0] || null;
}

async function getTypes() {
  const { rows } = await query(`SELECT typeid AS "TypeID", typename AS "TypeName" FROM membertype ORDER BY typeid`);
  return rows;
}

async function findIdByEmail(email) {
  const { rows } = await query(
    `SELECT memberid AS "MemberID" FROM member WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email]
  );
  return rows[0]?.MemberID || null;
}

module.exports = { findAll, findById, create, update, delete: deleteSingle, count, getTypes, findIdByEmail };
