// src/services/personVisit.service.js
//
// Assignment-4 update: shard-aware routing added on top of Assignment-3 logic.
//
// How routing works here:
//   - Any query that has a memberId uses visitTable(memberId) to target exactly
//     one shard. This is the O(1) single-shard path.
//   - Queries without a memberId (dashboard active count, date-range report)
//     fan out to all three shards and merge in the application layer.
//     This is the documented scatter-gather trade-off.
//
// The SELECT FOR UPDATE race-condition fix from Assignment-3 is fully preserved
// inside recordEntry(). The lock is now taken on the shard table, not the
// original personvisit table.
//
const personVisitModel = require('../models/personVisit.model');
const vehicleVisitModel = require('../models/vehicleVisit.model');
const AppError          = require('../utils/AppError');
const { parsePagination, buildPagination } = require('../utils/helpers');
const { getClient }     = require('../config/db');
const { visitTable, allVisitTables } = require('../utils/shardRouter');

async function getAll(queryParams = {}) {
  const { page, limit, offset } = parsePagination(queryParams);
  const memberId = queryParams.memberId ? parseInt(queryParams.memberId, 10) : null;

  // if memberId is provided, route to a single shard — O(1)
  if (memberId) {
    const table = visitTable(memberId);
    const db = require('../config/db');
    const { rows: visits } = await db.query(
      `SELECT * FROM ${table} WHERE personid = $1 ORDER BY entrytime DESC LIMIT $2 OFFSET $3`,
      [memberId, limit, offset]
    );
    const { rows: countRows } = await db.query(
      `SELECT COUNT(*) AS total FROM ${table} WHERE personid = $1`,
      [memberId]
    );
    const total = parseInt(countRows[0].total, 10);
    const { rows: activeRows } = await db.query(
      `SELECT COUNT(*) AS cnt FROM ${table} WHERE personid = $1 AND exittime IS NULL`,
      [memberId]
    );
    return {
      visits,
      pagination: buildPagination(total, page, limit),
      activeCount: parseInt(activeRows[0].cnt, 10),
    };
  }

  // no memberId — scatter-gather across all shards
  const db = require('../config/db');
  const tables = allVisitTables();
  let allVisits = [];
  let grandTotal = 0;
  let totalActive = 0;

  for (const table of tables) {
    const { rows } = await db.query(
      `SELECT * FROM ${table} ORDER BY entrytime DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    allVisits = allVisits.concat(rows);

    const { rows: countRows } = await db.query(`SELECT COUNT(*) AS total FROM ${table}`);
    grandTotal += parseInt(countRows[0].total, 10);

    const { rows: activeRows } = await db.query(
      `SELECT COUNT(*) AS cnt FROM ${table} WHERE exittime IS NULL`
    );
    totalActive += parseInt(activeRows[0].cnt, 10);
  }

  // sort merged results by entrytime descending and slice to one page
  allVisits.sort((a, b) => new Date(b.entrytime) - new Date(a.entrytime));
  const pageVisits = allVisits.slice(0, limit);

  return {
    visits: pageVisits,
    pagination: buildPagination(grandTotal, page, limit),
    activeCount: totalActive,
  };
}

async function getById(id) {
  const visit = await personVisitModel.findById(Number(id));
  if (!visit) throw new AppError(`Visit with ID ${id} not found.`, 404);
  return visit;
}

async function recordEntry(data) {
  // Assignment-3 SELECT FOR UPDATE fix is preserved here.
  // The only change for Assignment-4: the queries now target the shard table
  // (e.g. shard_1_personvisit) instead of the original personvisit table.
  //
  const table  = visitTable(data.memberId);
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // lock the member row to block concurrent entry requests for the same member
    const { rows: memberRows } = await client.query(
      'SELECT memberid FROM member WHERE memberid = $1 FOR UPDATE',
      [data.memberId]
    );
    if (memberRows.length === 0) {
      await client.query('ROLLBACK');
      throw new AppError(`Member with ID ${data.memberId} not found.`, 404);
    }

    // check for an open visit inside the transaction (lock is still held)
    const { rows: activeRows } = await client.query(
      `SELECT visitid FROM ${table} WHERE personid = $1 AND exittime IS NULL LIMIT 1`,
      [data.memberId]
    );
    if (activeRows.length > 0) {
      await client.query('ROLLBACK');
      throw new AppError(
        'Member already has an active visit. Please record an exit before recording a new entry.',
        400,
        { memberId: 'Active visit already exists' }
      );
    }

    // insert into the correct shard table
    const { rows: insertedRows } = await client.query(
      `INSERT INTO ${table} (personid, entrygateid, vehicleid, entrytime)
       VALUES ($1, $2, $3, NOW())
       RETURNING visitid AS "VisitID"`,
      [data.memberId, data.entryGateId, data.vehicleId ? Number(data.vehicleId) : null]
    );
    const created = insertedRows[0];
    await client.query('COMMIT');

    // sync vehicle visit outside the lock (no serialisation needed)
    const vehicleId = data?.vehicleId ? Number(data.vehicleId) : null;
    if (vehicleId) {
      const existingVehicleVisit = await vehicleVisitModel.findActiveByVehicle(vehicleId);
      if (!existingVehicleVisit) {
        await vehicleVisitModel.recordEntry({ vehicleId, entryGateId: Number(data.entryGateId) });
      }
    }

    return personVisitModel.findById(created.VisitID);

  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore secondary error */ }
    throw err;
  } finally {
    client.release();
  }
}

async function recordExit(visitId, exitGateId) {
  const visit = await personVisitModel.findById(Number(visitId));
  if (!visit) throw new AppError(`Visit with ID ${visitId} not found.`, 404);
  if (!visit.IsActive) throw new AppError('This visit has already been closed (exit already recorded).', 400);

  // route exit update to the correct shard
  const memberId = visit.PersonID || visit.personid;
  const table    = visitTable(memberId);
  const db       = require('../config/db');

  const { rows } = await db.query(
    `UPDATE ${table} SET exittime = NOW(), exitgateid = $1 WHERE visitid = $2 RETURNING *`,
    [exitGateId, Number(visitId)]
  );
  if (!rows[0]) throw new AppError('Failed to record exit.', 500);

  const vehicleId = visit?.VehicleID ?? visit?.vehicleid ?? null;
  if (vehicleId) {
    const activeVehicleVisit = await vehicleVisitModel.findActiveByVehicle(Number(vehicleId));
    if (activeVehicleVisit) {
      const vehicleVisitId = activeVehicleVisit?.VisitID || activeVehicleVisit?.visitid;
      await vehicleVisitModel.recordExit(Number(vehicleVisitId), Number(exitGateId));
    }
  }

  return personVisitModel.findById(Number(visitId));
}

async function deleteVisit(id) {
  const visit = await personVisitModel.findById(Number(id));
  if (!visit) throw new AppError(`Visit with ID ${id} not found.`, 404);
  await personVisitModel.delete(Number(id));
  return { deleted: true, visitId: Number(id) };
}

module.exports = { getAll, getById, recordEntry, recordExit, delete: deleteVisit };
