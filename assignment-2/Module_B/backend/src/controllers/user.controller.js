// src/controllers/user.controller.js
// Thin controller — delegates to user.service, writes audit records

const userService      = require('../services/user.service');
const { sendSuccess }  = require('../utils/helpers');
const { writeAuditRecord } = require('../middleware/audit');
const { ACTIONS } = require('../utils/constants');

async function getAll(req, res, next) {
  try {
    const result = await userService.getAllUsers(req.query);
    return sendSuccess(res, { users: result.users }, 200, result.pagination);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const user = await userService.getUserById(req.params.id);
    return sendSuccess(res, { user });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const result = await userService.createUserByActor(req.body, req.user);

    if (result.approvalRequired) {
      await writeAuditRecord({
        user:       req.user,
        tableName:  'User',
        recordId:   null,
        action:     ACTIONS.CREATE,
        newValue:   { username: req.body.username, roleId: req.body.roleId, pendingApproval: true },
        method:     req.method,
        endpoint:   req.originalUrl,
        statusCode: 202,
        ip:         req.ip,
      });

      return sendSuccess(res, {
        request: result.request,
        message: result.message,
      }, 202);
    }

    await writeAuditRecord({
      user:       req.user,
      tableName:  'User',
      recordId:   result.user.UserID,
      action:     ACTIONS.CREATE,
      newValue:   { username: result.user.Username, roleId: result.user.RoleID },
      method:     req.method,
      endpoint:   req.originalUrl,
      statusCode: 201,
      ip:         req.ip,
    });

    return sendSuccess(res, { user: result.user }, 201);
  } catch (err) {
    next(err);
  }
}

async function getPendingRequests(req, res, next) {
  try {
    const result = await userService.getPendingUserRequests();
    return sendSuccess(res, result, 200);
  } catch (err) {
    next(err);
  }
}

async function approveRequest(req, res, next) {
  try {
    const result = await userService.approveUserRequest(req.params.id, req.user);

    await writeAuditRecord({
      user:       req.user,
      tableName:  'User',
      recordId:   result.user.UserID,
      action:     ACTIONS.CREATE,
      newValue:   { username: result.user.Username, roleId: result.user.RoleID, approvedFromRequest: result.requestId },
      method:     req.method,
      endpoint:   req.originalUrl,
      statusCode: 200,
      ip:         req.ip,
    });

    return sendSuccess(res, result, 200);
  } catch (err) {
    next(err);
  }
}

async function rejectRequest(req, res, next) {
  try {
    const result = await userService.rejectUserRequest(req.params.id, req.user, req.body?.note);
    return sendSuccess(res, result, 200);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    // capture old value before updating
    const oldUser = await userService.getUserById(req.params.id);
    const updated = await userService.updateUser(req.params.id, req.body, req.user);

    await writeAuditRecord({
      user:       req.user,
      tableName:  'User',
      recordId:   Number(req.params.id),
      action:     ACTIONS.UPDATE,
      oldValue:   oldUser,
      newValue:   updated,
      method:     req.method,
      endpoint:   req.originalUrl,
      statusCode: 200,
      ip:         req.ip,
    });

    return sendSuccess(res, { user: updated });
  } catch (err) {
    next(err);
  }
}

async function deleteUser(req, res, next) {
  try {
    const oldUser = await userService.getUserById(req.params.id);
    const result  = await userService.deleteUser(req.params.id);

    await writeAuditRecord({
      user:       req.user,
      tableName:  'User',
      recordId:   Number(req.params.id),
      action:     ACTIONS.DELETE,
      oldValue:   oldUser,
      method:     req.method,
      endpoint:   req.originalUrl,
      statusCode: 200,
      ip:         req.ip,
    });

    return sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAll,
  getById,
  create,
  getPendingRequests,
  approveRequest,
  rejectRequest,
  update,
  delete: deleteUser,
};
