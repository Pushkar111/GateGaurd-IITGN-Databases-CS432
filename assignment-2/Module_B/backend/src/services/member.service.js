// src/services/member.service.js
const memberModel     = require('../models/member.model');
const memberTypeModel = require('../models/memberType.model');
const AppError        = require('../utils/AppError');
const { parsePagination, buildPagination } = require('../utils/helpers');

async function getAll(queryParams = {}) {
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

async function getById(id) {
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

module.exports = { getAll, getById, create, update, delete: deleteMember };
