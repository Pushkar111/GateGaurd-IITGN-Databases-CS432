// src/services/user.service.js
// Business logic for user management
// All password operations happen here — never in controllers

const bcrypt    = require('bcryptjs');
const userModel = require('../models/user.model');
const userApprovalModel = require('../models/userApproval.model');
const roleModel = require('../models/role.model');
const AppError  = require('../utils/AppError');
const { sanitizeUser, parsePagination, buildPagination } = require('../utils/helpers');
const { ROLES } = require('../utils/constants');

/**
 * Get all users with pagination.
 * @param {object} queryParams — req.query from controller
 */
async function getAllUsers(queryParams = {}) {
  const { page, limit, offset } = parsePagination(queryParams);
  const [users, total] = await Promise.all([
    userModel.findAll({ limit, offset }),
    userModel.countAll(),
  ]);
  return {
    users: users.map(sanitizeUser),
    pagination: buildPagination(total, page, limit),
  };
}

/**
 * Get a single user by ID.
 */
async function getUserById(id) {
  const user = await userModel.findById(Number(id));
  if (!user) {
    throw new AppError(`User with ID ${id} not found.`, 404);
  }
  return sanitizeUser(user);
}

/**
 * Create a new user. Handles password hashing + role validation.
 * @param {{ username, password, roleId }} data
 */
async function createUser(data) {
  return createUserByActor(data, { role: ROLES.SUPERADMIN, userId: null });
}

/**
 * Create user by actor role:
 * - SuperAdmin: creates user immediately.
 * - Admin: creates pending approval request for SuperAdmin.
 */
async function createUserByActor(data, actor = {}) {
  const { username, password, roleId } = data;
  const actorRole = actor?.role ?? actor?.Role;
  const actorId = Number(actor?.userId ?? actor?.UserID ?? actor?.userid ?? NaN);

  // check for duplicate username
  const existing = await userModel.findByUsername(username);
  if (existing) {
    throw new AppError('Username already taken.', 409, {
      username: 'This username is already in use',
    });
  }

  // validate role exists
  const role = await roleModel.findById(roleId);
  if (!role) {
    throw new AppError('Invalid role ID.', 400, { roleId: 'Role not found' });
  }

  const pendingExists = await userApprovalModel.hasPendingUsername(username);
  if (pendingExists) {
    throw new AppError('A pending approval already exists for this username.', 409, {
      username: 'Pending approval already exists',
    });
  }

  const targetRoleName = role?.RoleName || role?.rolename;

  // Admin cannot request SuperAdmin accounts
  if (actorRole === ROLES.ADMIN && targetRoleName === ROLES.SUPERADMIN) {
    throw new AppError('Admin cannot request SuperAdmin accounts.', 403);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  if (actorRole !== ROLES.SUPERADMIN) {
    if (!Number.isFinite(actorId)) {
      throw new AppError('Invalid requester identity.', 401);
    }

    const request = await userApprovalModel.createRequest({
      username,
      passwordHash,
      roleId,
      requestedBy: actorId,
    });

    return {
      approvalRequired: true,
      request,
      message: 'User creation request submitted for SuperAdmin approval.',
    };
  }

  const created = await userModel.create({ username, passwordHash, roleId });

  // get the full user record with role name attached
  const fullUser = await userModel.findWithRole(created.UserID);
  return {
    approvalRequired: false,
    user: sanitizeUser(fullUser),
  };
}

async function getPendingUserRequests() {
  const requests = await userApprovalModel.getPendingRequests();
  return { requests };
}

async function approveUserRequest(requestId, reviewer) {
  const reviewerId = Number(reviewer?.userId ?? reviewer?.UserID ?? reviewer?.userid ?? NaN);
  if (!Number.isFinite(reviewerId)) throw new AppError('Invalid reviewer identity.', 401);

  const request = await userApprovalModel.getRequestById(Number(requestId));
  if (!request) throw new AppError('Approval request not found.', 404);
  if (request.status !== 'pending') throw new AppError('Only pending requests can be approved.', 400);

  const existing = await userModel.findByUsername(request.username);
  if (existing) {
    await userApprovalModel.markRejected(request.requestId, reviewerId, 'Rejected: username already exists at approval time.');
    throw new AppError('Username already exists. Request auto-rejected.', 409);
  }

  const created = await userModel.create({
    username: request.username,
    passwordHash: request.passwordHash,
    roleId: request.roleId,
  });

  await userApprovalModel.markApproved(request.requestId, reviewerId, 'Approved');
  const fullUser = await userModel.findWithRole(created.UserID);

  return {
    requestId: request.requestId,
    user: sanitizeUser(fullUser),
    approved: true,
  };
}

async function rejectUserRequest(requestId, reviewer, note) {
  const reviewerId = Number(reviewer?.userId ?? reviewer?.UserID ?? reviewer?.userid ?? NaN);
  if (!Number.isFinite(reviewerId)) throw new AppError('Invalid reviewer identity.', 401);

  const request = await userApprovalModel.getRequestById(Number(requestId));
  if (!request) throw new AppError('Approval request not found.', 404);
  if (request.status !== 'pending') throw new AppError('Only pending requests can be rejected.', 400);

  const rejected = await userApprovalModel.markRejected(request.requestId, reviewerId, note || 'Rejected');
  if (!rejected) throw new AppError('Request is no longer pending.', 409);

  return {
    requestId: request.requestId,
    rejected: true,
  };
}

/**
 * Update an existing user. Password is optional — only re-hash if provided.
 * @param {number} id
 * @param {{ username?, password?, roleId? }} data
 * @param {{ userId?: number, role?: string }} actor
 */
async function updateUser(id, data, actor = null) {
  const targetUserId = Number(id);
  const existing = await userModel.findById(targetUserId);
  if (!existing) {
    throw new AppError(`User with ID ${id} not found.`, 404);
  }

  const actorId = Number(actor?.userId ?? actor?.UserID ?? actor?.userid ?? NaN);
  const actorRole = actor?.role ?? actor?.Role;
  const isSuperAdmin = actorRole === ROLES.SUPERADMIN;

  if (!isSuperAdmin) {
    if (!Number.isFinite(actorId) || actorId !== targetUserId) {
      throw new AppError('You can only change your own password.', 403);
    }
    if (data.username !== undefined || data.roleId !== undefined) {
      throw new AppError('Only SuperAdmin can change username or role. You can update only your own password.', 403);
    }
    if (!data.password) {
      throw new AppError('Password is required for self-update.', 400, { password: 'Provide a new password' });
    }
  }

  // if changing username, make sure the new name isn't already taken
  if (data.username && data.username !== existing.Username) {
    const taken = await userModel.findByUsername(data.username);
    if (taken) {
      throw new AppError('Username already taken.', 409, {
        username: 'This username is already in use',
      });
    }
  }

  // if changing role, make sure the new role exists
  if (data.roleId) {
    const role = await roleModel.findById(data.roleId);
    if (!role) {
      throw new AppError('Invalid role ID.', 400, { roleId: 'Role not found' });
    }
  }

  // only hash if a new password was actually provided
  const updateFields = {};
  if (data.username)  updateFields.username     = data.username;
  if (data.roleId)    updateFields.roleId       = data.roleId;
  if (data.password)  updateFields.passwordHash = await bcrypt.hash(data.password, 12);

  const updated = await userModel.update(targetUserId, updateFields);
  if (!updated) {
    throw new AppError('Update failed. User may no longer exist.', 404);
  }

  const fullUser = await userModel.findWithRole(updated.UserID);
  return sanitizeUser(fullUser);
}

/**
 * Delete a user by ID.
 */
async function deleteUser(id) {
  const existing = await userModel.findById(Number(id));
  if (!existing) {
    throw new AppError(`User with ID ${id} not found.`, 404);
  }
  await userModel.delete(Number(id));
  return { deleted: true, userId: Number(id) };
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  createUserByActor,
  getPendingUserRequests,
  approveUserRequest,
  rejectUserRequest,
  updateUser,
  deleteUser,
};
