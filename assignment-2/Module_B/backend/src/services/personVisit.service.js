// src/services/personVisit.service.js
const personVisitModel = require('../models/personVisit.model');
const vehicleVisitModel = require('../models/vehicleVisit.model');
const AppError         = require('../utils/AppError');
const { parsePagination, buildPagination } = require('../utils/helpers');

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
  // guard: no duplicate active visits for the same member
  const existing = await personVisitModel.findActiveByMember(data.memberId);
  if (existing) {
    throw new AppError(
      'Member already has an active visit. Please record an exit before recording a new entry.',
      400,
      { memberId: 'Active visit already exists' }
    );
  }
  const created = await personVisitModel.recordEntry(data);

  // Keep vehicle visits in sync with person visits when vehicle context is present.
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
