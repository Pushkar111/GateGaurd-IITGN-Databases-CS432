// src/services/audit.service.js
const auditModel = require('../models/audit.model');
const AppError   = require('../utils/AppError');
const { parsePagination, buildPagination } = require('../utils/helpers');

async function getAll(queryParams = {}) {
  const { page, limit, offset } = parsePagination(queryParams);
  const filters = {
    userId:    queryParams.userId    ? Number(queryParams.userId) : null,
    action:    queryParams.action    || null,
    tableName: queryParams.tableName || null,
    startDate: queryParams.startDate || null,
    endDate:   queryParams.endDate   || null,
    limit, offset,
  };
  const [logs, total] = await Promise.all([
    auditModel.findAll(filters),
    auditModel.count(filters),
  ]);
  return { logs, pagination: buildPagination(total, page, limit) };
}

async function getById(id) {
  const log = await auditModel.findById(Number(id));
  if (!log) throw new AppError(`Audit log with ID ${id} not found.`, 404);
  return log;
}

module.exports = { getAll, getById };
