// src/services/personVisit.service.js
//
// Assignment-3 Module B fix (Phase 5):
//   recordEntry() now wraps the duplicate-check + INSERT in a single
//   PostgreSQL transaction with SELECT … FOR UPDATE on the Member row.
//
//   Why this closes the race:
//     Before the fix, two concurrent requests could both read "no active visit"
//     (findActiveByMember returns NULL for both), then both INSERT, creating two
//     simultaneous active visits for the same member.
//
//     With SELECT … FOR UPDATE, the first transaction acquires a row-level lock
//     on the Member row.  The second transaction BLOCKS at the same SELECT until
//     the first either commits (→ sees the new active visit, returns 400) or
//     rolls back (→ safe to proceed).  The race window is eliminated.
//
const personVisitModel = require('../models/personVisit.model');
const vehicleVisitModel = require('../models/vehicleVisit.model');
const AppError          = require('../utils/AppError');
const { parsePagination, buildPagination } = require('../utils/helpers');
const { getClient }     = require('../config/db');   // raw pg client for manual txn

async function getAll(queryParams = {}) {
  const { page, limit, offset } = parsePagination(queryParams);
  const filters = {
    memberId:  queryParams.memberId  ? Number(queryParams.memberId) : null,
    gateId:    queryParams.gateId    ? Number(queryParams.gateId)   : null,
    search:    queryParams.search || null,
    active:    queryParams.active,
    startDate: queryParams.startDate || null,
    endDate:   queryParams.endDate   || null,
    limit, offset,
  };
  const [visits, total, activeCount] = await Promise.all([
    personVisitModel.findAll(filters),
    personVisitModel.count(filters),
    personVisitModel.count({ active: true }),
  ]);
  return { visits, pagination: buildPagination(total, page, limit), activeCount };
}

async function getById(id) {
  const visit = await personVisitModel.findById(Number(id));
  if (!visit) throw new AppError(`Visit with ID ${id} not found.`, 404);
  return visit;
}

async function recordEntry(data) {
  // ── Assignment-3 Module B fix: SELECT FOR UPDATE ─────────────────────────
  //
  // Acquires a row-level lock on the Member row BEFORE checking for an active
  // visit.  Any concurrent request for the same memberId will block at this
  // SELECT until the current transaction commits or rolls back, closing the
  // check-then-act race window that existed in the original implementation.
  //
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Lock the member row — serialises all concurrent entry attempts
    const { rows: memberRows } = await client.query(
      'SELECT memberid FROM member WHERE memberid = $1 FOR UPDATE',
      [data.memberId]
    );
    if (memberRows.length === 0) {
      await client.query('ROLLBACK');
      throw new AppError(`Member with ID ${data.memberId} not found.`, 404);
    }

    // 2. Check for an active visit inside the transaction (lock is held)
    const { rows: activeRows } = await client.query(
      `SELECT visitid FROM personvisit
       WHERE personid = $1 AND exittime IS NULL
       LIMIT 1`,
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

    // 3. Insert the new PersonVisit row
    const { rows: insertedRows } = await client.query(
      `INSERT INTO personvisit (personid, entrygateid, vehicleid, entrytime)
       VALUES ($1, $2, $3, NOW())
       RETURNING visitid AS "VisitID"`,
      [data.memberId, data.entryGateId, data.vehicleId ? Number(data.vehicleId) : null]
    );
    const created = insertedRows[0];

    await client.query('COMMIT');

    // 4. Sync vehicle visit OUTSIDE the lock (no serialisation needed here)
    const vehicleId = data?.vehicleId ? Number(data.vehicleId) : null;
    if (vehicleId) {
      const existingVehicleVisit = await vehicleVisitModel.findActiveByVehicle(vehicleId);
      if (!existingVehicleVisit) {
        await vehicleVisitModel.recordEntry({
          vehicleId,
          entryGateId: Number(data.entryGateId),
        });
      }
    }

    return personVisitModel.findById(created.VisitID);

  } catch (err) {
    // Rollback on any unexpected error (network, constraint violation, etc.)
    try { await client.query('ROLLBACK'); } catch (_) { /* ignore secondary error */ }
    throw err;   // re-raise so the controller returns the correct HTTP status
  } finally {
    client.release();
  }
}

async function recordExit(visitId, exitGateId) {
  const visit = await personVisitModel.findById(Number(visitId));
  if (!visit) throw new AppError(`Visit with ID ${visitId} not found.`, 404);
  if (!visit.IsActive) throw new AppError('This visit has already been closed (exit already recorded).', 400);

  const updated = await personVisitModel.recordExit(Number(visitId), exitGateId);
  if (!updated) throw new AppError('Failed to record exit.', 500);

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
