// src/services/member.service.js
//
// Assignment-4 update: shard-aware routing for member lookups.
//
// getById and create target the correct shard_N_member table.
// getAll (admin list) uses scatter-gather across all three shards.
// All other logic (cascade delete, type validation) is unchanged from Assignment-3.
//
const memberModel     = require('../models/member.model');
const memberTypeModel = require('../models/memberType.model');
const { getClient }   = require('../config/db');
const AppError        = require('../utils/AppError');
const { parsePagination, buildPagination } = require('../utils/helpers');
const { ROLES }       = require('../utils/constants');
const { memberTable, allMemberTables, visitTable } = require('../utils/shardRouter');

const MEMBER_SORT_COLUMNS = new Set(['memberid', 'name', 'email', 'createdat']);

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`Invalid ${fieldName}. Must be a positive integer.`, 400, {
      [fieldName]: 'Must be a positive integer',
    });
  }
  return parsed;
}

function parseOptionalPositiveInt(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  return parsePositiveInt(value, fieldName);
}

function resolveSortOptions(queryParams = {}) {
  const requestedSortBy = String(queryParams.sortBy || 'memberid').toLowerCase();
  const sortBy = MEMBER_SORT_COLUMNS.has(requestedSortBy) ? requestedSortBy : 'memberid';
  const sortDir = String(queryParams.order || 'ASC').toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
  return { sortBy, sortDir };
}

function buildMemberWhere(search, typeId) {
  const params = [];
  const conditions = [];
  let idx = 1;

  if (search) {
    conditions.push(`(m.name ILIKE $${idx} OR m.email ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }

  if (typeId !== null) {
    conditions.push(`m.typeid = $${idx}`);
    params.push(typeId);
    idx++;
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

function sortValue(row, sortBy) {
  switch (sortBy) {
    case 'name':
      return String(row.Name || row.name || '').toLowerCase();
    case 'email':
      return String(row.Email || row.email || '').toLowerCase();
    case 'createdat':
      return new Date(row.CreatedAt || row.createdat || 0).getTime();
    case 'memberid':
    default:
      return Number(row.MemberID || row.memberid || 0);
  }
}

async function getAll(actor, queryParams = {}) { // eslint-disable-line no-unused-vars
  const { page, limit, offset } = parsePagination(queryParams);
  const db = require('../config/db');
  const tables = allMemberTables();
  const search = typeof queryParams.search === 'string' ? queryParams.search.trim() : '';
  const typeId = parseOptionalPositiveInt(queryParams.typeId, 'typeId');
  const { sortBy, sortDir } = resolveSortOptions(queryParams);

  let allMembers = [];
  let grandTotal = 0;

  for (const table of tables) {
    const { where, params } = buildMemberWhere(search, typeId);
    const listLimitIndex = params.length + 1;

    const { rows } = await db.query(
      `SELECT
         m.memberid      AS "MemberID",
         m.name          AS "Name",
         m.email         AS "Email",
         m.contactnumber AS "ContactNumber",
         m.age           AS "Age",
         m.department    AS "Department",
         m.typeid        AS "TypeID",
         mt.typename     AS "TypeName",
         m.createdat     AS "CreatedAt"
       FROM ${table} m
       JOIN membertype mt ON mt.typeid = m.typeid
       ${where}
       ORDER BY m.${sortBy} ${sortDir}
       LIMIT $${listLimitIndex}`,
      [...params, limit + offset]
    );
    allMembers = allMembers.concat(rows);

    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) AS total FROM ${table} m ${where}`,
      params
    );
    grandTotal += parseInt(countRows[0].total, 10);
  }

  allMembers.sort((a, b) => {
    const left = sortValue(a, sortBy);
    const right = sortValue(b, sortBy);

    let cmp = 0;
    if (typeof left === 'string' || typeof right === 'string') {
      cmp = String(left).localeCompare(String(right), undefined, { sensitivity: 'base' });
    } else {
      cmp = Number(left) - Number(right);
    }

    if (Number.isNaN(cmp)) cmp = 0;
    return sortDir === 'DESC' ? -cmp : cmp;
  });

  const pageMembers = allMembers.slice(offset, offset + limit);
  return { members: pageMembers, pagination: buildPagination(grandTotal, page, limit) };
}

async function getById(id, actor) { // eslint-disable-line no-unused-vars
  const memberId = parsePositiveInt(id, 'memberId');
  const table = memberTable(memberId);
  const db = require('../config/db');

  const { rows } = await db.query(
    `SELECT
       m.memberid      AS "MemberID",
       m.name          AS "Name",
       m.email         AS "Email",
       m.contactnumber AS "ContactNumber",
       m.age           AS "Age",
       m.department    AS "Department",
       m.typeid        AS "TypeID",
       mt.typename     AS "TypeName",
       m.createdat     AS "CreatedAt",
       m.updatedat     AS "UpdatedAt"
     FROM ${table} m
     JOIN membertype mt ON mt.typeid = m.typeid
     WHERE m.memberid = $1`,
    [memberId]
  );
  if (!rows[0]) throw new AppError(`Member with ID ${memberId} not found.`, 404);
  return rows[0];
}

async function create(data) {
  const type = await memberTypeModel.findById(data.typeId);
  if (!type) throw new AppError('Invalid member type ID.', 400, { typeId: 'Member type not found' });

  // insert into original table first to get the SERIAL memberid
  const created = await memberModel.create(data);
  const newMember = await memberModel.findById(created.MemberID);

  // replicate into the correct shard table
  const table = memberTable(created.MemberID);
  const db = require('../config/db');
  await db.query(
    `INSERT INTO ${table}
       (memberid, name, email, contactnumber, image, age, department, typeid, createdat, updatedat)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (memberid) DO NOTHING`,
    [
      newMember.MemberID ?? newMember.memberid,
      newMember.Name ?? newMember.name,
      newMember.Email ?? newMember.email,
      newMember.ContactNumber ?? newMember.contactnumber,
      newMember.Image ?? newMember.image ?? null,
      newMember.Age ?? newMember.age ?? null,
      newMember.Department ?? newMember.department ?? null,
      newMember.TypeID ?? newMember.typeid,
      newMember.CreatedAt ?? newMember.createdat,
      newMember.UpdatedAt ?? newMember.updatedat ?? null,
    ]
  );

  return newMember;
}

async function update(id, data) {
  const memberId = parsePositiveInt(id, 'memberId');
  const existing = await memberModel.findById(memberId);
  if (!existing) throw new AppError(`Member with ID ${memberId} not found.`, 404);

  if (data.typeId) {
    const type = await memberTypeModel.findById(data.typeId);
    if (!type) throw new AppError('Invalid member type ID.', 400, { typeId: 'Member type not found' });
  }

  const updated = await memberModel.update(memberId, data);
  if (!updated) throw new AppError('Update failed.', 500);

  // keep shard table in sync with the update
  const table = memberTable(memberId);
  const db = require('../config/db');
  const setClauses = [];
  const values = [];
  let idx = 1;

  if (data.name !== undefined)          { setClauses.push(`name = $${idx++}`);          values.push(data.name); }
  if (data.email !== undefined)         { setClauses.push(`email = $${idx++}`);         values.push(data.email); }
  if (data.contactNumber !== undefined) { setClauses.push(`contactnumber = $${idx++}`); values.push(data.contactNumber); }
  if (data.age !== undefined)           { setClauses.push(`age = $${idx++}`);           values.push(data.age); }
  if (data.department !== undefined)    { setClauses.push(`department = $${idx++}`);    values.push(data.department); }
  if (data.typeId !== undefined)        { setClauses.push(`typeid = $${idx++}`);        values.push(data.typeId); }

  if (setClauses.length > 0) {
    values.push(memberId);
    await db.query(
      `UPDATE ${table} SET ${setClauses.join(', ')}, updatedat = NOW() WHERE memberid = $${idx}`,
      values
    );
  }

  return memberModel.findById(updated.MemberID);
}

function canCascadeDelete(actor) {
  return actor?.role === ROLES.GUARD || actor?.role === ROLES.SUPERADMIN;
}

async function deleteMember(id, actor) {
  const memberId = parsePositiveInt(id, 'memberId');
  const existing = await memberModel.findById(memberId);
  if (!existing) throw new AppError(`Member with ID ${memberId} not found.`, 404);

  if (!canCascadeDelete(actor)) {
    try {
      await memberModel.delete(memberId);
    } catch (err) {
      if (err.code === '23503') throw new AppError('Cannot delete member - they have existing visit records. Remove visits first.', 409);
      throw err;
    }
    return { deleted: true, memberId };
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { rowCount: deletedPersonVisits } = await client.query(
      'DELETE FROM personvisit WHERE personid = $1', [memberId]
    );

    // also remove from the shard table
    const shardVisitTable = visitTable(memberId);
    await client.query(`DELETE FROM ${shardVisitTable} WHERE personid = $1`, [memberId]);

    const { rows: ownedVehicles } = await client.query(
      'SELECT vehicleid FROM vehicle WHERE ownerid = $1', [memberId]
    );
    const ownedVehicleIds = ownedVehicles.map((row) => row.vehicleid);

    let deletedPersonVisitsForOwnedVehicles = 0;
    let deletedVehicleVisitsForOwnedVehicles = 0;

    if (ownedVehicleIds.length) {
      const pvResult = await client.query(
        'DELETE FROM personvisit WHERE vehicleid = ANY($1::int[])', [ownedVehicleIds]
      );
      deletedPersonVisitsForOwnedVehicles = pvResult.rowCount || 0;

      const vvResult = await client.query(
        'DELETE FROM vehiclevisit WHERE vehicleid = ANY($1::int[])', [ownedVehicleIds]
      );
      deletedVehicleVisitsForOwnedVehicles = vvResult.rowCount || 0;

      await client.query('UPDATE vehicle SET ownerid = NULL WHERE ownerid = $1', [memberId]);
    }

    const { rows: deletedRows } = await client.query(
      'DELETE FROM member WHERE memberid = $1 RETURNING memberid', [memberId]
    );
    if (!deletedRows[0]) throw new AppError(`Member with ID ${memberId} not found.`, 404);

    // remove from shard table
    const shardMemberTable = memberTable(memberId);
    await client.query(`DELETE FROM ${shardMemberTable} WHERE memberid = $1`, [memberId]);

    await client.query('COMMIT');

    return {
      deleted: true,
      memberId,
      cascade: {
        enabledForRole: actor?.role || null,
        deletedPersonVisits,
        deletedPersonVisitsForOwnedVehicles,
        deletedVehicleVisitsForOwnedVehicles,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23503') throw new AppError('Cannot delete member - they have existing visit records. Remove visits first.', 409);
    throw err;
  } finally {
    client.release();
  }
}

async function getTypes() {
  return memberModel.getTypes();
}

module.exports = { getAll, getById, getTypes, create, update, delete: deleteMember };
