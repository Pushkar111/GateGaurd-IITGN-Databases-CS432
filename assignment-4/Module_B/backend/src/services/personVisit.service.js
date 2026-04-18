// src/services/personVisit.service.js
//
// Assignment-4 update: shard-aware routing added on top of Assignment-3 logic.
//
// Architecture - write-through replication:
//   Every write goes to TWO places in one transaction:
//     1. Base personvisit table  (source of truth for visitid + backward-compat reads)
//     2. Shard table             (proves routing - shard_N_personvisit holds only that shard's rows)
//
//   Reads use the base table for getById / dashboard / recordExit / delete (unchanged).
//   Shard-aware reads (getAll with memberId) use shard tables directly - O(1) path.
//
// The SELECT FOR UPDATE race-condition fix from Assignment-3 is fully preserved.
//
const personVisitModel  = require('../models/personVisit.model');
const vehicleVisitModel = require('../models/vehicleVisit.model');
const AppError          = require('../utils/AppError');
const { parsePagination, buildPagination } = require('../utils/helpers');
const { getClient }     = require('../config/db');
const { visitTable, allVisitTables } = require('../utils/shardRouter');

const SHARD_VISIT_SELECT = `
  pv.visitid        AS "VisitID",
  pv.personid       AS "MemberID",
  COALESCE(m.name, CONCAT('Member #', pv.personid::text)) AS "MemberName",
  m.email           AS "MemberEmail",
  pv.entrygateid    AS "EntryGateID",
  COALESCE(eg.name, CONCAT('Gate #', pv.entrygateid::text)) AS "EntryGateName",
  pv.exitgateid     AS "ExitGateID",
  COALESCE(xg.name, CONCAT('Gate #', pv.exitgateid::text)) AS "ExitGateName",
  pv.vehicleid      AS "VehicleID",
  v.licenseplate    AS "VehicleReg",
  pv.entrytime      AS "EntryTime",
  pv.exittime       AS "ExitTime",
  CASE WHEN pv.exittime IS NULL THEN true ELSE false END AS "IsActive"
`;

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

function parseOptionalBoolean(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;

  throw new AppError(`Invalid ${fieldName}. Use true or false.`, 400, {
    [fieldName]: 'Must be true or false',
  });
}

function shardVisitFromClause(table) {
  return `
    FROM ${table} pv
    LEFT JOIN member m ON m.memberid = pv.personid
    LEFT JOIN gate eg ON eg.gateid = pv.entrygateid
    LEFT JOIN gate xg ON xg.gateid = pv.exitgateid
    LEFT JOIN vehicle v ON v.vehicleid = pv.vehicleid
  `;
}

function buildVisitWhere(filters) {
  const params = [];
  const conditions = [];
  let idx = 1;

  if (filters.memberId !== null) {
    conditions.push(`pv.personid = $${idx}`);
    params.push(filters.memberId);
    idx++;
  }

  if (filters.gateId !== null) {
    conditions.push(`(pv.entrygateid = $${idx} OR pv.exitgateid = $${idx})`);
    params.push(filters.gateId);
    idx++;
  }

  if (filters.search) {
    conditions.push(`(
      COALESCE(m.name, '') ILIKE $${idx}
      OR COALESCE(m.email, '') ILIKE $${idx}
      OR COALESCE(v.licenseplate, '') ILIKE $${idx}
    )`);
    params.push(`%${filters.search}%`);
    idx++;
  }

  if (filters.active === true) {
    conditions.push('pv.exittime IS NULL');
  } else if (filters.active === false) {
    conditions.push('pv.exittime IS NOT NULL');
  }

  if (filters.startDate) {
    conditions.push(`pv.entrytime >= $${idx}`);
    params.push(filters.startDate);
    idx++;
  }

  if (filters.endDate) {
    conditions.push(`pv.entrytime <= $${idx}`);
    params.push(filters.endDate);
    idx++;
  }

  return {
    whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

async function getAll(queryParams = {}) {
  const { page, limit, offset } = parsePagination(queryParams);
  const memberId = parseOptionalPositiveInt(queryParams.memberId, 'memberId');
  const gateId = parseOptionalPositiveInt(queryParams.gateId, 'gateId');
  const active = parseOptionalBoolean(queryParams.active, 'active');
  const search = typeof queryParams.search === 'string' ? queryParams.search.trim() : null;
  const startDate = queryParams.startDate || null;
  const endDate = queryParams.endDate || null;

  const filters = {
    memberId,
    gateId,
    search: search || null,
    active,
    startDate,
    endDate,
  };

  const activeFilters = {
    ...filters,
    active: true,
  };

  // memberId provided -> route to single shard (O(1)).
  if (memberId !== null) {
    const table = visitTable(memberId);
    const db = require('../config/db');
    const fromClause = shardVisitFromClause(table);
    const { whereClause, params } = buildVisitWhere(filters);
    const listLimitIndex = params.length + 1;

    const { rows: visits } = await db.query(
      `SELECT ${SHARD_VISIT_SELECT}
       ${fromClause}
       ${whereClause}
       ORDER BY pv.entrytime DESC
       LIMIT $${listLimitIndex} OFFSET $${listLimitIndex + 1}`,
      [...params, limit, offset]
    );

    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) AS total
       ${fromClause}
       ${whereClause}`,
      params
    );

    const { whereClause: activeWhereClause, params: activeParams } = buildVisitWhere(activeFilters);
    const total = parseInt(countRows[0].total, 10);

    const { rows: activeRows } = await db.query(
      `SELECT COUNT(*) AS cnt
       ${fromClause}
       ${activeWhereClause}`,
      activeParams
    );

    return {
      visits,
      pagination: buildPagination(total, page, limit),
      activeCount: parseInt(activeRows[0].cnt, 10),
    };
  }

  // no memberId - scatter-gather across all shards (fan-out then merge)
  const db     = require('../config/db');
  const tables = allVisitTables();
  let allVisits = [];
  let grandTotal = 0;
  let totalActive = 0;

  const { whereClause, params } = buildVisitWhere(filters);
  const { whereClause: activeWhereClause, params: activeParams } = buildVisitWhere(activeFilters);

  for (const table of tables) {
    const fromClause = shardVisitFromClause(table);
    const listLimitIndex = params.length + 1;

    const { rows } = await db.query(
      `SELECT ${SHARD_VISIT_SELECT}
       ${fromClause}
       ${whereClause}
       ORDER BY pv.entrytime DESC
       LIMIT $${listLimitIndex}`,
      [...params, limit + offset]
    );
    allVisits = allVisits.concat(rows);

    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) AS total
       ${fromClause}
       ${whereClause}`,
      params
    );
    grandTotal += parseInt(countRows[0].total, 10);

    const { rows: activeRows } = await db.query(
      `SELECT COUNT(*) AS cnt
       ${fromClause}
       ${activeWhereClause}`,
      activeParams
    );
    totalActive += parseInt(activeRows[0].cnt, 10);
  }

  allVisits.sort(
    (a, b) =>
      new Date(b.EntryTime || b.entrytime || 0).getTime() -
      new Date(a.EntryTime || a.entrytime || 0).getTime()
  );
  const pageVisits = allVisits.slice(offset, offset + limit);

  return {
    visits: pageVisits,
    pagination: buildPagination(grandTotal, page, limit),
    activeCount: totalActive,
  };
}

async function getById(id) {
  const visitId = parsePositiveInt(id, 'visitId');
  const visit = await personVisitModel.findById(visitId);
  if (!visit) throw new AppError(`Visit with ID ${visitId} not found.`, 404);
  return visit;
}

async function recordEntry(data) {
  // Assignment-3 SELECT FOR UPDATE race-condition fix is fully preserved.
  //
  // Assignment-4 routing: write-through strategy.
  //   Step A: INSERT into base personvisit → source of truth, generates canonical visitid.
  //   Step B: Mirror row into shard_N_personvisit → proves O(1) routing in notebook.
  //
  const memberId = parsePositiveInt(data.memberId, 'memberId');
  const entryGateId = parsePositiveInt(data.entryGateId, 'entryGateId');
  const vehicleId = data.vehicleId === undefined || data.vehicleId === null
    ? null
    : parsePositiveInt(data.vehicleId, 'vehicleId');

  const shardTable = visitTable(memberId);
  const client     = await getClient();

  try {
    await client.query('BEGIN');

    // lock the member row to block concurrent entry requests for the same member
    const { rows: memberRows } = await client.query(
      'SELECT memberid FROM member WHERE memberid = $1 FOR UPDATE',
      [memberId]
    );
    if (memberRows.length === 0) {
      await client.query('ROLLBACK');
      throw new AppError(`Member with ID ${memberId} not found.`, 404);
    }

    // check for open visit in SHARD table (routing-aware, lock still held)
    const { rows: activeRows } = await client.query(
      `SELECT visitid FROM ${shardTable} WHERE personid = $1 AND exittime IS NULL LIMIT 1`,
      [memberId]
    );
    if (activeRows.length > 0) {
      await client.query('ROLLBACK');
      throw new AppError(
        'Member already has an active visit. Please record an exit before recording a new entry.',
        400,
        { memberId: 'Active visit already exists' }
      );
    }

    // Step A - insert into base personvisit (generates the canonical visitid via SERIAL)
    const { rows: baseRows } = await client.query(
      `INSERT INTO personvisit (personid, entrygateid, vehicleid, entrytime)
       VALUES ($1, $2, $3, NOW())
       RETURNING visitid AS "VisitID"`,
      [memberId, entryGateId, vehicleId]
    );
    const newVisitId = baseRows[0]['VisitID'];

    // Step B - write-through to the correct shard table using the same visitid
    await client.query(
      `INSERT INTO ${shardTable} (visitid, personid, entrygateid, vehicleid, entrytime)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (visitid) DO NOTHING`,
      [newVisitId, memberId, entryGateId, vehicleId]
    );

    await client.query('COMMIT');

    // sync vehicle visit outside the lock
    if (vehicleId) {
      const existingVehicleVisit = await vehicleVisitModel.findActiveByVehicle(vehicleId);
      if (!existingVehicleVisit) {
        await vehicleVisitModel.recordEntry({ vehicleId, entryGateId: Number(data.entryGateId) });
      }
    }

    // read back from base table (source of truth) - returns fully formatted visit object
    return personVisitModel.findById(newVisitId);

  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore secondary error */ }
    throw err;
  } finally {
    client.release();
  }
}

async function recordExit(visitId, exitGateId) {
  const parsedVisitId = parsePositiveInt(visitId, 'visitId');
  const parsedExitGateId = parsePositiveInt(exitGateId, 'exitGateId');

  // Read visit from base table (source of truth)
  const visit = await personVisitModel.findById(parsedVisitId);
  if (!visit) throw new AppError(`Visit with ID ${parsedVisitId} not found.`, 404);
  if (!visit.IsActive) throw new AppError('This visit has already been closed (exit already recorded).', 400);

  const memberId   = Number(visit.MemberID ?? visit.memberid ?? visit.PersonID ?? visit.personid);
  if (!Number.isInteger(memberId)) {
    throw new AppError(`Cannot resolve shard route for visit ${parsedVisitId}.`, 500);
  }
  const shardTable = visitTable(memberId);
  const db         = require('../config/db');

  // update base table (keeps all read paths correct)
  await db.query(
    `UPDATE personvisit SET exittime = NOW(), exitgateid = $1 WHERE visitid = $2`,
    [parsedExitGateId, parsedVisitId]
  );

  // write-through: mirror exit to shard table
  await db.query(
    `UPDATE ${shardTable} SET exittime = NOW(), exitgateid = $1 WHERE visitid = $2`,
    [parsedExitGateId, parsedVisitId]
  );

  const vehicleId = visit?.VehicleID ?? visit?.vehicleid ?? null;
  if (vehicleId) {
    const activeVehicleVisit = await vehicleVisitModel.findActiveByVehicle(Number(vehicleId));
    if (activeVehicleVisit) {
      const vehicleVisitId = activeVehicleVisit?.VisitID || activeVehicleVisit?.visitid;
      await vehicleVisitModel.recordExit(Number(vehicleVisitId), parsedExitGateId);
    }
  }

  return personVisitModel.findById(parsedVisitId);
}

async function deleteVisit(id) {
  const visitId = parsePositiveInt(id, 'visitId');

  // read from base table to get memberId for shard routing
  const visit = await personVisitModel.findById(visitId);
  if (!visit) throw new AppError(`Visit with ID ${visitId} not found.`, 404);

  const memberId   = Number(visit.MemberID ?? visit.memberid ?? visit.PersonID ?? visit.personid);
  if (!Number.isInteger(memberId)) {
    throw new AppError(`Cannot resolve shard route for visit ${visitId}.`, 500);
  }
  const shardTable = visitTable(memberId);
  const db         = require('../config/db');

  // delete from shard table first, then base table
  await db.query(`DELETE FROM ${shardTable} WHERE visitid = $1`, [visitId]);
  await personVisitModel.delete(visitId);

  return { deleted: true, visitId };
}

module.exports = { getAll, getById, recordEntry, recordExit, delete: deleteVisit };
