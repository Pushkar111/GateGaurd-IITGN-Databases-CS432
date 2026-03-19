// src/controllers/gate.controller.js
const gateService          = require('../services/gate.service');
const { sendSuccess }      = require('../utils/helpers');
const { writeAuditRecord } = require('../middleware/audit');
const { ACTIONS }          = require('../utils/constants');

async function getAll(req, res, next) {
  try { return sendSuccess(res, { gates: await gateService.getAll() }); }
  catch (err) { next(err); }
}
async function getById(req, res, next) {
  try { return sendSuccess(res, { gate: await gateService.getById(req.params.id) }); }
  catch (err) { next(err); }
}
async function create(req, res, next) {
  try {
    const gate = await gateService.create(req.body);
    await writeAuditRecord({ user: req.user, tableName: 'Gate', recordId: gate.GateID, action: ACTIONS.CREATE, newValue: req.body, method: req.method, endpoint: req.originalUrl, statusCode: 201, ip: req.ip });
    return sendSuccess(res, { gate }, 201);
  } catch (err) { next(err); }
}
async function update(req, res, next) {
  try {
    const old  = await gateService.getById(req.params.id);
    const gate = await gateService.update(req.params.id, req.body);
    await writeAuditRecord({ user: req.user, tableName: 'Gate', recordId: Number(req.params.id), action: ACTIONS.UPDATE, oldValue: old, newValue: req.body, method: req.method, endpoint: req.originalUrl, statusCode: 200, ip: req.ip });
    return sendSuccess(res, { gate });
  } catch (err) { next(err); }
}
async function deleteGate(req, res, next) {
  try {
    const old    = await gateService.getById(req.params.id);
    const result = await gateService.delete(req.params.id);
    await writeAuditRecord({ user: req.user, tableName: 'Gate', recordId: Number(req.params.id), action: ACTIONS.DELETE, oldValue: old, method: req.method, endpoint: req.originalUrl, statusCode: 200, ip: req.ip });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, create, update, delete: deleteGate };
