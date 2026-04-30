// src/services/member.service.js
const memberModel     = require('../models/member.model');
const memberTypeModel = require('../models/memberType.model');
const { getClient }   = require('../config/db');
const AppError        = require('../utils/AppError');
const { parsePagination, buildPagination } = require('../utils/helpers');
const { ROLES }       = require('../utils/constants');

async function getAll(actor, queryParams = {}) {
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

function canCascadeDelete(actor) {
  return actor?.role === ROLES.GUARD || actor?.role === ROLES.SUPERADMIN;
}

async function deleteMember(id, actor) {
  const memberId = Number(id);
  const existing = await memberModel.findById(memberId);
  if (!existing) throw new AppError(`Member with ID ${id} not found.`, 404);

  if (!canCascadeDelete(actor)) {
    try {
      await memberModel.delete(memberId);
    } catch (err) {
      if (err.code === '23503') throw new AppError('Cannot delete member — they have existing visit records. Remove visits first.', 409);
      throw err;
    }
    return { deleted: true, memberId };
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const { rowCount: deletedPersonVisits } = await client.query(
      'DELETE FROM personvisit WHERE personid = $1',
      [memberId]
    );

    const { rows: ownedVehicles } = await client.query(
      'SELECT vehicleid FROM vehicle WHERE ownerid = $1',
      [memberId]
    );
    const ownedVehicleIds = ownedVehicles.map((row) => row.vehicleid);

    let deletedPersonVisitsForOwnedVehicles = 0;
    let deletedVehicleVisitsForOwnedVehicles = 0;

    if (ownedVehicleIds.length) {
      const pvResult = await client.query(
        'DELETE FROM personvisit WHERE vehicleid = ANY($1::int[])',
        [ownedVehicleIds]
      );
      deletedPersonVisitsForOwnedVehicles = pvResult.rowCount || 0;

      const vvResult = await client.query(
        'DELETE FROM vehiclevisit WHERE vehicleid = ANY($1::int[])',
        [ownedVehicleIds]
      );
      deletedVehicleVisitsForOwnedVehicles = vvResult.rowCount || 0;

      // Keep vehicles but detach them from the soon-to-be deleted member.
      await client.query(
        'UPDATE vehicle SET ownerid = NULL WHERE ownerid = $1',
        [memberId]
      );
    }

    const { rows: deletedRows } = await client.query(
      'DELETE FROM member WHERE memberid = $1 RETURNING memberid',
      [memberId]
    );

    if (!deletedRows[0]) {
      throw new AppError(`Member with ID ${id} not found.`, 404);
    }

    await client.query('COMMIT');

    return {
      deleted: true,
      memberId,
      cascade: {
        enabledForRole: actor?.role || null,
        deletedPersonVisits,
        deletedPersonVisitsForOwnedVehicles,
        deletedVehicleVisitsForOwnedVehicles,
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23503') throw new AppError('Cannot delete member — they have existing visit records. Remove visits first.', 409);
    throw err;
  } finally {
    client.release();
  }
}

async function getTypes() {
  return memberModel.getTypes();
}

module.exports = { getAll, getById, getTypes, create, update, delete: deleteMember };
