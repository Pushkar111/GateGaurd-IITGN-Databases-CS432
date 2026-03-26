// Centralized Quick Actions config for Dashboard

const ACTION_DEFS = {
  'person-entry': {
    id: 'person-entry',
    iconKey: 'ClipboardList',
    label: 'Record Person Entry',
    sublabel: 'Log a member entering campus',
    color: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
    to: '/visits/persons?action=entry',
  },
  'person-exit': {
    id: 'person-exit',
    iconKey: 'LogOut',
    label: 'Record Person Exit',
    sublabel: 'Close an active person visit',
    color: 'bg-gradient-to-br from-amber-500 to-amber-600',
    to: '/visits/persons?action=exit',
  },
  'vehicle-entry': {
    id: 'vehicle-entry',
    iconKey: 'Car',
    label: 'Record Vehicle Entry',
    sublabel: 'Log a vehicle entering campus',
    color: 'bg-gradient-to-br from-indigo-500 to-indigo-700',
    to: '/visits/vehicles?action=entry',
  },
  'vehicle-exit': {
    id: 'vehicle-exit',
    iconKey: 'LogOut',
    label: 'Record Vehicle Exit',
    sublabel: 'Close an active vehicle visit',
    color: 'bg-gradient-to-br from-rose-500 to-red-600',
    to: '/visits/vehicles?action=exit',
  },
  'active-visits': {
    id: 'active-visits',
    iconKey: 'Activity',
    label: 'View Active Visits',
    sublabel: 'Monitor all ongoing person/vehicle visits',
    color: 'bg-gradient-to-br from-cyan-500 to-sky-700',
    to: '/visits/active',
  },
  'add-member': {
    id: 'add-member',
    iconKey: 'UserPlus',
    label: 'Add New Member',
    sublabel: 'Register a student, faculty or staff',
    color: 'bg-gradient-to-br from-purple-500 to-violet-700',
    to: '/members?action=add',
  },
  'add-vehicle': {
    id: 'add-vehicle',
    iconKey: 'Car',
    label: 'Add New Vehicle',
    sublabel: 'Register a member vehicle',
    color: 'bg-gradient-to-br from-fuchsia-500 to-pink-700',
    to: '/vehicles?action=add',
  },
};

const OPERATION_ORDER_DEFAULT = [
  'person-entry',
  'person-exit',
  'vehicle-entry',
  'vehicle-exit',
  'active-visits',
];

const OPERATION_ORDER_GUARD = [
  'person-exit',
  'vehicle-exit',
  'active-visits',
  'person-entry',
  'vehicle-entry',
];

const MANAGEMENT_ORDER = ['add-member', 'add-vehicle'];

function pickByOrder(order) {
  return order.map((id) => ACTION_DEFS[id]).filter(Boolean);
}

export function buildDashboardQuickActions({ isGuard, canManageMasterData }) {
  const operations = pickByOrder(isGuard ? OPERATION_ORDER_GUARD : OPERATION_ORDER_DEFAULT);
  const management = canManageMasterData ? pickByOrder(MANAGEMENT_ORDER) : [];
  return [...operations, ...management];
}
