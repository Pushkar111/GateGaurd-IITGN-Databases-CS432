// src/controllers/vehicle.controller.js
const vehicleService       = require('../services/vehicle.service');
const { sendSuccess }      = require('../utils/helpers');
const { writeAuditRecord } = require('../middleware/audit');
const { ACTIONS }          = require('../utils/constants');

async function getAll(req, res, next) {
  try {
    const result = await vehicleService.getAll(req.query);
    return sendSuccess(res, { vehicles: result.vehicles }, 200, result.pagination);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const vehicle = await vehicleService.getById(req.params.id);
    return sendSuccess(res, { vehicle });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const vehicle = await vehicleService.create(req.body);
    await writeAuditRecord({ user: req.user, tableName: 'Vehicle', recordId: vehicle.VehicleID, action: ACTIONS.CREATE, newValue: req.body, method: req.method, endpoint: req.originalUrl, statusCode: 201, ip: req.ip });
    return sendSuccess(res, { vehicle }, 201);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const old     = await vehicleService.getById(req.params.id);
    const vehicle = await vehicleService.update(req.params.id, req.body);
    await writeAuditRecord({ user: req.user, tableName: 'Vehicle', recordId: Number(req.params.id), action: ACTIONS.UPDATE, oldValue: old, newValue: req.body, method: req.method, endpoint: req.originalUrl, statusCode: 200, ip: req.ip });
    return sendSuccess(res, { vehicle });
  } catch (err) { next(err); }
}

async function deleteVehicle(req, res, next) {
  try {
    const old    = await vehicleService.getById(req.params.id);
    const result = await vehicleService.delete(req.params.id, req.user);
    await writeAuditRecord({ user: req.user, tableName: 'Vehicle', recordId: Number(req.params.id), action: ACTIONS.DELETE, oldValue: old, method: req.method, endpoint: req.originalUrl, statusCode: 200, ip: req.ip });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
}

async function getTypes(req, res, next) {
  try {
    const types = await vehicleService.getTypes();
    return sendSuccess(res, { types });
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, create, update, delete: deleteVehicle, getTypes };
