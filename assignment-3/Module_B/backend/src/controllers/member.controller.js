// src/controllers/member.controller.js
const memberService        = require('../services/member.service');
const { sendSuccess }      = require('../utils/helpers');
const { writeAuditRecord } = require('../middleware/audit');
const { ACTIONS }          = require('../utils/constants');

async function getAll(req, res, next) {
  try {
    const result = await memberService.getAll(req.user, req.query);
    return sendSuccess(res, { members: result.members }, 200, result.pagination);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const member = await memberService.getById(req.params.id, req.user);
    return sendSuccess(res, { member });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const member = await memberService.create(req.body);
    await writeAuditRecord({ user: req.user, tableName: 'Member', recordId: member.MemberID, action: ACTIONS.CREATE, newValue: req.body, method: req.method, endpoint: req.originalUrl, statusCode: 201, ip: req.ip });
    return sendSuccess(res, { member }, 201);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const old    = await memberService.getById(req.params.id, req.user);
    const member = await memberService.update(req.params.id, req.body);
    await writeAuditRecord({ user: req.user, tableName: 'Member', recordId: Number(req.params.id), action: ACTIONS.UPDATE, oldValue: old, newValue: req.body, method: req.method, endpoint: req.originalUrl, statusCode: 200, ip: req.ip });
    return sendSuccess(res, { member });
  } catch (err) { next(err); }
}

async function deleteMember(req, res, next) {
  try {
    const old    = await memberService.getById(req.params.id, req.user);
    const result = await memberService.delete(req.params.id);
    await writeAuditRecord({ user: req.user, tableName: 'Member', recordId: Number(req.params.id), action: ACTIONS.DELETE, oldValue: old, method: req.method, endpoint: req.originalUrl, statusCode: 200, ip: req.ip });
    return sendSuccess(res, result);
  } catch (err) { next(err); }
}

async function getTypes(req, res, next) {
  try {
    const types = await memberService.getTypes();
    return sendSuccess(res, { types });
  } catch (err) { next(err); }
}

module.exports = { getAll, getById, getTypes, create, update, delete: deleteMember };
