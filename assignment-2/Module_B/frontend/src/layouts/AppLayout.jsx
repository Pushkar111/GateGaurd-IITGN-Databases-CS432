// src/layouts/AppLayout.jsx
// The shell that wraps every protected page.
// Structure: TopBar (fixed) + IconRail (fixed left) + main content area

import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, useNavigate, NavLink, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Car, DoorOpen, ClipboardList, Truck,
  Activity, UserCog, Shield, Settings, Search, Bell, LogOut, Eye, CircleUserRound,
  ChevronRight, Menu, X, Zap,
} from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/lib/utils';
import { buildAppNavigation } from '@/lib/navigationConfig';
import { pageVariants, bellShake } from '@/lib/motion';
import CommandPalette from '@/components/layout/CommandPalette';
import ActionCenter from '@/components/action-center/ActionCenter';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import * as dashboardApi from '@/api/dashboard.api';

// ── Tooltip-wrapped icon button ───────────────────────────────────────
function RailItem({ item, isActive }) {
  const Icon = item.icon;
  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <NavLink
            to={item.to}
            className={`icon-rail-btn ${isActive ? 'active' : ''}`}
          >
            <Icon size={20} />
          </NavLink>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="right"
            className="z-[200] px-3 py-1.5 text-sm font-medium rounded-lg
                       bg-[hsl(228_35%_12%)] text-white border border-white/10
                       shadow-xl animate-fade-in-up"
          >
            {item.label}
            <Tooltip.Arrow className="fill-[hsl(228_35%_12%)]" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

const iconMap = {
  LayoutDashboard,
  Users,
  Car,
  DoorOpen,
  ClipboardList,
  Truck,
  Activity,
  UserCog,
  Shield,
  Settings,
  Eye,
  CircleUserRound,
};

// ── Main layout ───────────────────────────────────────────────────────
export default function AppLayout() {
  const { user, logout, hasRole, mustChangePassword } = useAuth();
  const location                  = useLocation();
  const navigate                  = useNavigate();
  const pathname                  = location.pathname;

  // mustChangePassword guard — redirect to /change-password if flag is set
  const mustChangePw = mustChangePassword || user?.mustChangePassword || user?.MustChangePassword || user?.mustchangepassword || false;
  if (mustChangePw && pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  const [cmdOpen,         setCmdOpen]         = useState(false);
  const [actionCenterOpen, setActionCenterOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [logoutLoading,    setLogoutLoading]    = useState(false);
  const [bellAnimating,   setBellAnimating]   = useState(false);
  const [activeCount,     setActiveCount]     = useState({ person: 0, vehicle: 0 });

  const refreshActiveCounts = useCallback(() => {
    dashboardApi.getStats()
      .then((res) => {
        const d = res.data || res;
        setActiveCount({
          person: d.activePersonVisits ?? 0,
          vehicle: d.activeVehicleVisits ?? 0,
        });
      })
      .catch(() => {});
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((o) => !o);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        setActionCenterOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // ── Poll active visit counts ──────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const syncCounts = () => {
      dashboardApi.getStats()
        .then((res) => {
          if (!mounted) return;
          const d = res.data || res;
          setActiveCount({
            person: d.activePersonVisits ?? 0,
            vehicle: d.activeVehicleVisits ?? 0,
          });
        })
        .catch(() => {});
    };
    syncCounts();
    const interval = setInterval(syncCounts, 30000); // refresh every 30s
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const totalActive = activeCount.person + activeCount.vehicle;
  const canSeeAdmin = hasRole('Admin', 'SuperAdmin');
  const { mainNav, adminNav, mobileNav, bottomNavItem } = buildAppNavigation({ canSeeAdmin });
  const normalizeNav = useCallback((items) => {
    return items.map((item) => ({
      ...item,
      icon: iconMap[item.iconKey] || Activity,
    }));
  }, []);

  const mainNavResolved = normalizeNav(mainNav);
  const adminNavResolved = normalizeNav(adminNav);
  const mobileNavResolved = normalizeNav(mobileNav);
  const bottomItemResolved = normalizeNav([bottomNavItem])[0];

  const handleBell = useCallback(() => {
    setBellAnimating(true);
    setTimeout(() => setBellAnimating(false), 600);
  }, []);

  const handleRequestLogout = useCallback(() => {
    setLogoutDialogOpen(true);
  }, []);

  const handleConfirmLogout = useCallback(async () => {
    setLogoutLoading(true);
    await logout();
  }, [logout]);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="min-h-screen bg-transparent">
      {/* ── TopBar ─────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 h-14 z-50
                         flex items-center px-4 gap-4
                         bg-[hsl(228_50%_4%/0.8)] backdrop-blur-xl
                         border-b border-white/[0.06]">
        {/* Logo */}
        <div className="flex items-center gap-2 w-16 flex-shrink-0">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 2L4 7v7c0 5.55 4.27 10.74 10 12 5.73-1.26 10-6.45 10-12V7L14 2z"
              fill="none" stroke="url(#sg)" strokeWidth="1.8" strokeLinejoin="round"/>
            <path d="M10 14l3 3 5-5" stroke="url(#sg)" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="sg" x1="4" y1="2" x2="24" y2="26" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1"/>
                <stop offset="1" stopColor="#a78bfa"/>
              </linearGradient>
            </defs>
          </svg>
          <span className="gradient-text font-bold text-sm hidden md:block">GateGuard</span>
        </div>

        {/* Search trigger */}
        <button
          onClick={() => setCmdOpen(true)}
          className="flex-1 max-w-sm mx-auto hidden sm:flex items-center gap-2
                     h-9 px-3 rounded-xl text-sm text-white/40
                     bg-white/[0.04] border border-white/[0.07]
                     hover:bg-white/[0.07] hover:text-white/60
                     transition-all duration-150"
        >
          <Search size={14} />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 font-mono">⌘K</kbd>
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setActionCenterOpen(true)}
            className="icon-rail-btn mr-1 text-indigo-300 hover:text-indigo-200 hover:bg-indigo-500/15"
            title="Open Action Center (Ctrl+J)"
          >
            <Zap size={18} />
          </button>

          {/* Active visits indicator */}
          {totalActive > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1
                            rounded-full bg-emerald-400/10 border border-emerald-400/20
                            text-xs font-semibold text-emerald-400 mr-1">
              <span className="status-dot active" />
              {totalActive} active
            </div>
          )}

          {/* Bell */}
          <motion.button
            onClick={handleBell}
            className="icon-rail-btn"
            animate={bellAnimating ? 'animate' : 'rest'}
            variants={bellShake}
          >
            <Bell size={18} />
          </motion.button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600
                          flex items-center justify-center text-xs font-bold text-white
                          border border-white/20 ml-1 select-none">
            {getInitials(user?.Username || user?.username || '??')}
          </div>

          {/* Role chip — visible md+ */}
          <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-full
                           bg-white/5 text-xs text-white/50 border border-white/10 ml-1">
            {user?.Role || user?.role || 'Guard'}
          </div>

          {/* Logout */}
          <button
            onClick={handleRequestLogout}
            className="icon-rail-btn ml-1 hover:text-red-400 hover:bg-red-400/10"
            title="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* ── Icon Rail (md+) ─────────────────────────────────────────── */}
      <nav className="hidden md:flex fixed left-0 top-14 bottom-0 w-16 z-40
                      flex-col items-center py-3 gap-1
                      bg-[hsl(228_50%_4%/0.6)] backdrop-blur-xl
                      border-r border-white/[0.06]">
        {mainNavResolved.map((item) => (
          <RailItem key={item.to} item={item} isActive={isActive(item.to)} />
        ))}

        {/* Separator */}
        <div className="w-8 h-px bg-white/10 my-2" />

        {/* Admin nav */}
        {adminNavResolved.map((item) => (
          <RailItem key={item.to} item={item} isActive={isActive(item.to)} />
        ))}

        {/* Settings — pinned bottom */}
        <div className="mt-auto">
          <RailItem item={bottomItemResolved} isActive={false} />
        </div>
      </nav>

      {/* ── Main content ────────────────────────────────────────────── */}
      <main className="md:ml-16 pt-14 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Mobile bottom tab bar ────────────────────────────────────── */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 z-50 h-16
                      items-center justify-around
                      bg-[hsl(228_50%_4%/0.95)] backdrop-blur-xl
                      border-t border-white/[0.08]">
        {mobileNavResolved.map((item) => {
          const Icon     = item.icon;
          const active   = isActive(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl
                          text-[10px] font-medium transition-colors duration-150
                          ${active ? 'text-indigo-400' : 'text-white/40'}`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* ── Command Palette ──────────────────────────────────────────── */}
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

      {/* ── Unified Action Center ────────────────────────────────────── */}
      <ActionCenter
        open={actionCenterOpen}
        onOpenChange={setActionCenterOpen}
        onActionCompleted={refreshActiveCounts}
      />

      <ConfirmDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        title="Log out from GateGuard?"
        description="You will be signed out from this device and redirected to the login page."
        onConfirm={handleConfirmLogout}
        loading={logoutLoading}
        variant="warning"
      />
    </div>
  );
}
