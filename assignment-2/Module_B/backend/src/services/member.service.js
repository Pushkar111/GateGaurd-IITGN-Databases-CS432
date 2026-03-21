// src/services/member.service.js
const memberModel     = require('../models/member.model');
const memberTypeModel = require('../models/memberType.model');
const AppError        = require('../utils/AppError');
const { parsePagination, buildPagination } = require('../utils/helpers');

function isPrivileged(actor) {
  const role = String(actor?.role || '').toLowerCase();
  return role === 'admin' || role === 'superadmin';
}

async function resolveLinkedMemberId(actor) {
  if (!actor) return null;
  if (actor.memberId !== null && actor.memberId !== undefined) {
    const numeric = Number(actor.memberId);
    return Number.isNaN(numeric) ? null : numeric;
  }

  // fallback: attempt a deterministic email mapping from username
  if (actor.username) {
    const mapped = await memberModel.findIdByEmail(`${actor.username}@iitgn.ac.in`);
    if (mapped) return Number(mapped);
  }

  return null;
}

async function assertCanReadMember(actor, targetMemberId) {
  if (!actor) throw new AppError('Authentication required.', 401);
  if (isPrivileged(actor)) return;

  const linkedMemberId = await resolveLinkedMemberId(actor);
  if (!linkedMemberId) {
    throw new AppError('No linked member profile found for this account.', 403);
  }

  if (Number(targetMemberId) !== Number(linkedMemberId)) {
    throw new AppError('You can only access your own member profile.', 403);
  }
}

async function getAll(actor, queryParams = {}) {
  // Guards are restricted to their linked member profile only.
  if (!isPrivileged(actor)) {
    const linkedMemberId = await resolveLinkedMemberId(actor);
    if (!linkedMemberId) {
      throw new AppError('No linked member profile found for this account.', 403);
    }
    const member = await memberModel.findById(linkedMemberId);
    const members = member ? [member] : [];
    return { members, pagination: buildPagination(members.length, 1, 1) };
  }

  const { page, limit, offset } = parsePagination(queryParams);
  const filters = {
    search:  queryParams.search  || '',
    typeId:  queryParams.typeId  ? Number(queryParams.typeId) : null,
    sortBy:  queryParams.sortBy  || 'MemberID',
    order:   queryParams.order   || 'ASC',
    limit, offset,
  };
  const [members, total] = await Promise.all([
    memberModel.findAll(filters),
    memberModel.count(filters),
  ]);
  return { members, pagination: buildPagination(total, page, limit) };
}

async function getById(id, actor) {
  await assertCanReadMember(actor, id);
  const member = await memberModel.findById(Number(id));
  if (!member) throw new AppError(`Member with ID ${id} not found.`, 404);
  return member;
}

async function create(data) {
  // verify type exists
  const type = await memberTypeModel.findById(data.typeId);
  if (!type) throw new AppError('Invalid member type ID.', 400, { typeId: 'Member type not found' });
  const created = await memberModel.create(data);
  return memberModel.findById(created.MemberID);
}

async function update(id, data) {
  const existing = await memberModel.findById(Number(id));
  if (!existing) throw new AppError(`Member with ID ${id} not found.`, 404);
  if (data.typeId) {
    const type = await memberTypeModel.findById(data.typeId);
    if (!type) throw new AppError('Invalid member type ID.', 400, { typeId: 'Member type not found' });
  }
  const updated = await memberModel.update(Number(id), data);
  if (!updated) throw new AppError('Update failed.', 500);
  return memberModel.findById(updated.MemberID);
}

async function deleteMember(id) {
  const existing = await memberModel.findById(Number(id));
  if (!existing) throw new AppError(`Member with ID ${id} not found.`, 404);
  try {
    await memberModel.delete(Number(id));
  } catch (err) {
    if (err.code === '23503') throw new AppError('Cannot delete member — they have existing visit records. Remove visits first.', 409);
    throw err;
  }
  return { deleted: true, memberId: Number(id) };
}

async function getTypes() {
  return memberModel.getTypes();
}

module.exports = { getAll, getById, getTypes, create, update, delete: deleteMember };
