// src/utils/constants.js
// Shared constants — roles, action types, etc.

const ROLES = {
  GUARD:      'Guard',
  ADMIN:      'Admin',
  SUPERADMIN: 'SuperAdmin',
};

const ACTIONS = {
  CREATE: 'CREATE',
  READ:   'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
};

// Tables that get audited
const AUDITABLE_TABLES = [
  'Member',
  'MemberType',
  'Vehicle',
  'VehicleType',
  'Gate',
  'GateOccupancy',
  'PersonVisit',
  'VehicleVisit',
  'User',
  'Role',
];

module.exports = { ROLES, ACTIONS, AUDITABLE_TABLES };
