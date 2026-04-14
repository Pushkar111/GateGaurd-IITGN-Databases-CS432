// src/services/vehicleVisit.service.js
const vehicleVisitModel = require('../models/vehicleVisit.model');
const AppError          = require('../utils/AppError');
const { parsePagination, buildPagination } = require('../utils/helpers');

async function getAll(queryParams = {}) {
  const { page, limit, offset } = parsePagination(queryParams);
  const filters = {
    vehicleId: queryParams.vehicleId ? Number(queryParams.vehicleId) : null,
    gateId:    queryParams.gateId    ? Number(queryParams.gateId)    : null,
    search:    queryParams.search || null,
    active:    queryParams.active,
    startDate: queryParams.startDate || null,
    endDate:   queryParams.endDate   || null,
    limit, offset,
  };
  const [visits, total, activeCount] = await Promise.all([
    vehicleVisitModel.findAll(filters),
    vehicleVisitModel.count(filters),
    vehicleVisitModel.count({ active: true }),
  ]);
  return { visits, pagination: buildPagination(total, page, limit), activeCount };
}

async function getById(id) {
  const visit = await vehicleVisitModel.findById(Number(id));
  if (!visit) throw new AppError(`Vehicle visit with ID ${id} not found.`, 404);
  return visit;
}

async function recordEntry(data) {
  const existing = await vehicleVisitModel.findActiveByVehicle(data.vehicleId);
  if (existing) {
    throw new AppError(
      'Vehicle already has an active visit. Please record an exit before recording a new entry.',
      400,
      { vehicleId: 'Active visit already exists' }
    );
  }
  const created = await vehicleVisitModel.recordEntry(data);
  return vehicleVisitModel.findById(created.VisitID);
}

async function recordExit(visitId, exitGateId) {
  const visit = await vehicleVisitModel.findById(Number(visitId));
  if (!visit) throw new AppError(`Vehicle visit with ID ${visitId} not found.`, 404);
  if (!visit.IsActive) throw new AppError('This visit has already been closed.', 400);

  const updated = await vehicleVisitModel.recordExit(Number(visitId), exitGateId);
  if (!updated) throw new AppError('Failed to record exit.', 500);
  return vehicleVisitModel.findById(Number(visitId));
}

async function deleteVisit(id) {
  const visit = await vehicleVisitModel.findById(Number(id));
  if (!visit) throw new AppError(`Vehicle visit with ID ${id} not found.`, 404);
  await vehicleVisitModel.delete(Number(id));
  return { deleted: true, visitId: Number(id) };
}

module.exports = { getAll, getById, recordEntry, recordExit, delete: deleteVisit };
