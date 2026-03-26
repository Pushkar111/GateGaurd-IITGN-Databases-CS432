// src/controllers/vehicleVisit.controller.js
const vehicleVisitService  = require('../services/vehicleVisit.service');
const { sendSuccess }      = require('../utils/helpers');
const { writeAuditRecord } = require('../middleware/audit');
const { ACTIONS }          = require('../utils/constants');

async function getAll(req, res, next) {
  try {
    const result = await vehicleVisitService.getAll(req.query);
    return sendSuccess(res, { visits: result.visits, activeCount: result.activeCount }, 200, result.pagination);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const visit = await vehicleVisitService.getById(req.params.id);
    return sendSuccess(res, { visit });
  } catch (err) { next(err); }
}

async function recordEntry(req, res, next) {
  try {
    const visit = await vehicleVisitService.recordEntry(req.body);
    await writeAuditRecord({ user: req.user, tableName: 'VehicleVisit', recordId: visit.VisitID, action: ACTIONS.CREATE, newValue: req.body, method: req.method, endpoint: req.originalUrl, statusCode: 201, ip: req.ip });
    return sendSuccess(res, { visit }, 201);
  } catch (err) { next(err); }
}

async function recordExit(req, res, next) {
  try {
    const old   = await vehicleVisitService.getById(req.params.id);
    const visit = await vehicleVisitService.recordExit(req.params.id, req.body.exitGateId);
    await writeAuditRecord({ user: req.user, tableName: 'VehicleVisit', recordId: Number(req.params.id), action: ACTIONS.UPDATE, oldValue: old, newValue: { exitGateId: req.body.exitGateId }, method: req.method, endpoint: req.originalUrl, statusCode: 200, ip: req.ip });
    return sendSuccess(res, { visit });
  } catch (err) { next(err); }
}

async function deleteVisit(req, res, next) {
  try {
    const old    = await vehicleVisitService.getById(req.params.id);
    const result = await vehicleVisitService.delete(req.params.id);
    await writeAuditRecord({ user: req.user, tableName: 'VehicleVisit', recordId: Number(req.params.id), action: ACTIONS.DELETE, oldValue: old, method: req.method, endpoint: req.originalUrl, statusCode: 200, ip: req.ip });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, recordEntry, recordExit, delete: deleteVisit };
