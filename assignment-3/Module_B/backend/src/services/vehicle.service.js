// src/services/vehicle.service.js
const vehicleModel     = require('../models/vehicle.model');
const vehicleTypeModel = require('../models/vehicleType.model');
const memberModel      = require('../models/member.model');
const AppError         = require('../utils/AppError');
const { parsePagination, buildPagination } = require('../utils/helpers');

async function getAll(queryParams = {}) {
  const { page, limit, offset } = parsePagination(queryParams);
  const filters = {
    search:  queryParams.search  || '',
    typeId:  queryParams.typeId  ? Number(queryParams.typeId)  : null,
    ownerId: queryParams.ownerId ? Number(queryParams.ownerId) : null,
    limit, offset,
  };
  const [vehicles, total] = await Promise.all([
    vehicleModel.findAll(filters),
    vehicleModel.count(filters),
  ]);
  return { vehicles, pagination: buildPagination(total, page, limit) };
}

async function getById(id) {
  const vehicle = await vehicleModel.findById(Number(id));
  if (!vehicle) throw new AppError(`Vehicle with ID ${id} not found.`, 404);
  return vehicle;
}

async function create(data) {
  const type   = await vehicleTypeModel.findById(data.typeId);
  if (!type) throw new AppError('Invalid vehicle type ID.', 400, { typeId: 'Vehicle type not found' });
  const owner  = await memberModel.findById(data.ownerId);
  if (!owner) throw new AppError('Invalid owner ID — member not found.', 400, { ownerId: 'Member not found' });

  // check for duplicate registration number
  const existing = await vehicleModel.findAll({ search: data.registrationNumber });
  const dupe = existing.find(v => v.RegistrationNumber === data.registrationNumber.toUpperCase());
  if (dupe) throw new AppError('A vehicle with this registration number already exists.', 409, { registrationNumber: 'Already registered' });

  const created = await vehicleModel.create(data);
  return vehicleModel.findById(created.VehicleID);
}

async function update(id, data) {
  const existing = await vehicleModel.findById(Number(id));
  if (!existing) throw new AppError(`Vehicle with ID ${id} not found.`, 404);
  if (data.typeId) {
    const type = await vehicleTypeModel.findById(data.typeId);
    if (!type) throw new AppError('Invalid vehicle type ID.', 400, { typeId: 'Vehicle type not found' });
  }
  if (data.ownerId) {
    const owner = await memberModel.findById(data.ownerId);
    if (!owner) throw new AppError('Invalid owner ID — member not found.', 400, { ownerId: 'Member not found' });
  }
  const updated = await vehicleModel.update(Number(id), data);
  if (!updated) throw new AppError('Update failed.', 500);
  return vehicleModel.findById(updated.VehicleID);
}

async function deleteVehicle(id) {
  const existing = await vehicleModel.findById(Number(id));
  if (!existing) throw new AppError(`Vehicle with ID ${id} not found.`, 404);
  try {
    await vehicleModel.delete(Number(id));
  } catch (err) {
    if (err.code === '23503') throw new AppError('Cannot delete vehicle — it has existing visit records.', 409);
    throw err;
  }
  return { deleted: true, vehicleId: Number(id) };
}

async function getTypes() {
  return vehicleModel.getTypes();
}

module.exports = { getAll, getById, create, update, delete: deleteVehicle, getTypes };
