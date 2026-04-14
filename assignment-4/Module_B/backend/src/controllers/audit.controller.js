// src/controllers/audit.controller.js
const auditService    = require('../services/audit.service');
const { sendSuccess } = require('../utils/helpers');

async function getAll(req, res, next) {
  try {
    const result = await auditService.getAll(req.query);
    return sendSuccess(res, { logs: result.logs }, 200, result.pagination);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const log = await auditService.getById(req.params.id);
    return sendSuccess(res, { log });
  } catch (err) { next(err); }
}

module.exports = { getAll, getById };
