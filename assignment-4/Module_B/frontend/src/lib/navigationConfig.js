// Centralized navigation config for AppLayout sidebar/mobile nav.

const NAV_ITEMS = {
  dashboard:      { id: 'dashboard', to: '/dashboard',      iconKey: 'LayoutDashboard', label: 'Dashboard',      shortcut: 'G D' },
  members:        { id: 'members',   to: '/members',        iconKey: 'Users',           label: 'Members',        shortcut: 'G M' },
  vehicles:       { id: 'vehicles',  to: '/vehicles',       iconKey: 'Car',             label: 'Vehicles',       shortcut: 'G V' },
  gates:          { id: 'gates',     to: '/gates',          iconKey: 'DoorOpen',        label: 'Gates',          shortcut: 'G G' },
  personVisits:   { id: 'personVisits', to: '/visits/persons',  iconKey: 'ClipboardList', label: 'Person Visits', shortcut: 'G P' },
  vehicleVisits:  { id: 'vehicleVisits', to: '/visits/vehicles', iconKey: 'Truck',        label: 'Vehicle Visits', shortcut: 'G T' },
  activeVisits:   { id: 'activeVisits', to: '/visits/active',    iconKey: 'Eye',          label: 'Active Visits',  shortcut: 'G O' },
  profile:        { id: 'profile',   to: '/profile',        iconKey: 'CircleUserRound', label: 'My Profile',     shortcut: 'G I' },
  adminUsers:     { id: 'adminUsers', to: '/admin/users',   iconKey: 'UserCog',         label: 'Users',          shortcut: 'G U' },
  adminAudit:     { id: 'adminAudit', to: '/admin/audit',   iconKey: 'Shield',          label: 'Audit Log',      shortcut: 'G A' },
  settings:       { id: 'settings',  to: '/profile',        iconKey: 'Settings',        label: 'Settings' },
};

const RAIL_MAIN_ORDER = ['dashboard', 'members', 'vehicles', 'gates', 'personVisits', 'vehicleVisits', 'activeVisits', 'profile'];
const RAIL_ADMIN_ORDER = ['adminUsers', 'adminAudit'];
const MOBILE_ORDER = ['dashboard', 'members', 'vehicles', 'personVisits', 'activeVisits', 'gates'];

function pick(order) {
  return order.map((key) => NAV_ITEMS[key]).filter(Boolean);
}

export function buildAppNavigation({ canSeeAdmin = false } = {}) {
  return {
    mainNav: pick(RAIL_MAIN_ORDER),
    adminNav: canSeeAdmin ? pick(RAIL_ADMIN_ORDER) : [],
    mobileNav: pick(MOBILE_ORDER),
    bottomNavItem: NAV_ITEMS.settings,
  };
}
