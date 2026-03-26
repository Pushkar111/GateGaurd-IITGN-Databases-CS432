// src/services/gate.service.js
const gateModel           = require('../models/gate.model');
const gateOccupancyModel  = require('../models/gateOccupancy.model');
const AppError            = require('../utils/AppError');

const DEFAULT_GATE_CAPACITY_LIMIT = Number(process.env.GATE_CAPACITY_LIMIT) || 20;

function normalizeCapacityLimit(limit) {
  const numeric = Number(limit);
  if (!Number.isFinite(numeric) || numeric <= 0 || !Number.isInteger(numeric)) {
    return null;
  }
  return numeric;
}

async function getAll() {
  return gateModel.findAll();
}

async function getById(id) {
  const gate = await gateModel.findById(Number(id));
  if (!gate) throw new AppError(`Gate with ID ${id} not found.`, 404);
  return gate;
}

async function create(data) {
  const created = await gateModel.create(data);
  // automatically create a GateOccupancy row starting at 0
  await gateOccupancyModel.createForGate(created.GateID);
  return gateModel.findById(created.GateID);
}

async function update(id, data) {
  const existing = await gateModel.findById(Number(id));
  if (!existing) throw new AppError(`Gate with ID ${id} not found.`, 404);
  const updated = await gateModel.update(Number(id), data);
  if (!updated) throw new AppError('Update failed.', 500);
  return gateModel.findById(updated.GateID);
}

async function deleteGate(id) {
  const existing = await gateModel.findById(Number(id));
  if (!existing) throw new AppError(`Gate with ID ${id} not found.`, 404);
  try {
    await gateModel.delete(Number(id));
  } catch (err) {
    if (err.code === '23503') throw new AppError('Cannot delete gate — it has existing visit records.', 409);
    throw err;
  }
  return { deleted: true, gateId: Number(id) };
}

async function updateOccupancy(gateId, occupancyCount, options = {}, actor = null) {
  const gate = await gateModel.findById(Number(gateId));
  if (!gate) throw new AppError(`Gate with ID ${gateId} not found.`, 404);

  const numericCount = Number(occupancyCount);
  if (!Number.isInteger(numericCount) || numericCount < 0) {
    throw new AppError('Occupancy count must be a non-negative integer.', 422, {
      occupancyCount: 'Provide a valid non-negative integer',
    });
  }

  const actorRole = String(actor?.role || actor?.RoleName || actor?.rolename || '').toLowerCase();
  const canConfigureCapacity = actorRole === 'admin' || actorRole === 'superadmin';

  const requestedCapacityLimit = options?.capacityLimit;
  const parsedRequestedCapacity = requestedCapacityLimit !== undefined
    ? normalizeCapacityLimit(requestedCapacityLimit)
    : null;

  if (requestedCapacityLimit !== undefined && !canConfigureCapacity) {
    throw new AppError('Only Admin/SuperAdmin can update gate safe capacity.', 403);
  }

  if (requestedCapacityLimit !== undefined && parsedRequestedCapacity === null) {
    throw new AppError('Capacity limit must be a positive integer.', 422, {
      capacityLimit: 'Provide a valid positive integer',
    });
  }

  const currentCapacityLimit = normalizeCapacityLimit(gate.CapacityLimit || gate.capacitylimit) || DEFAULT_GATE_CAPACITY_LIMIT;
  const effectiveCapacityLimit = parsedRequestedCapacity || currentCapacityLimit;

  const emergencyOverride = options?.emergencyOverride === true;
  const incidentNote = typeof options?.incidentNote === 'string' ? options.incidentNote.trim() : '';

  if (numericCount > effectiveCapacityLimit && !emergencyOverride) {
    throw new AppError('Occupancy exceeds safe limit. Enable emergency override with incident note to proceed.', 422, {
      occupancyCount: `Value exceeds limit ${effectiveCapacityLimit}`,
      emergencyOverride: 'Required when occupancy exceeds safe limit',
    });
  }

  if (numericCount > effectiveCapacityLimit && emergencyOverride && incidentNote.length < 8) {
    throw new AppError('Incident note is required for emergency override.', 422, {
      incidentNote: 'Provide at least 8 characters for emergency override',
    });
  }

  const updated = await gateOccupancyModel.updateCount(Number(gateId), occupancyCount, {
    capacityLimit: effectiveCapacityLimit,
  });
  if (!updated) throw new AppError('Gate occupancy record not found.', 404);

  const actorUsername = actor?.username || actor?.Username || null;
  return {
    ...updated,
    GateName: gate.Name,
    capacityLimit: effectiveCapacityLimit,
    isOverCapacity: numericCount > effectiveCapacityLimit,
    riskLevel: numericCount > effectiveCapacityLimit ? 'critical' : numericCount >= Math.ceil(effectiveCapacityLimit * 0.8) ? 'warning' : 'normal',
    emergencyOverrideApplied: emergencyOverride,
    incidentNote: incidentNote || null,
    updatedBy: actorUsername,
    updatedAt: new Date().toISOString(),
  };
}

async function getAllOccupancy() {
  return gateOccupancyModel.findAll();
}

module.exports = { getAll, getById, create, update, delete: deleteGate, updateOccupancy, getAllOccupancy };
