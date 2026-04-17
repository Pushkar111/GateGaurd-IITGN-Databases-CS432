// src/components/layout/CommandPalette.jsx
// Ctrl+K command palette - navigation + quick actions + data actions

import { useEffect, useMemo, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  LayoutDashboard, Users, Car, DoorOpen, ClipboardList, Truck,
  Activity, UserCog, Shield, Settings, Search, X, LogOut, UserPlus, Eye, CircleUserRound,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';
import { buildAppNavigation } from '@/lib/navigationConfig';
import { buildDashboardQuickActions } from '@/lib/dashboardQuickActions';
import { backdropVariants, scaleIn } from '@/lib/motion';
import * as membersApi from '@/api/members.api';
import * as vehiclesApi from '@/api/vehicles.api';
import * as gatesApi from '@/api/gates.api';
import * as visitsApi from '@/api/visits.api';

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
  LogOut,
  UserPlus,
  Eye,
  CircleUserRound,
};

export default function CommandPalette({ open, onOpenChange }) {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [query, setQuery] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [dataResults, setDataResults] = useState({
    members: [],
    vehicles: [],
    gates: [],
    activePersonVisits: [],
    activeVehicleVisits: [],
    overCapacityGates: [],
  });

  const debouncedQuery = useDebounce(query, 250);
  const canSeeAdmin = hasRole('Admin', 'SuperAdmin');
  const canManageMasterData = hasRole('Guard', 'Admin', 'SuperAdmin');
  const isGuard = hasRole('Guard');
  const { mainNav, adminNav } = buildAppNavigation({ canSeeAdmin });
  const navItems = [...mainNav, ...adminNav].map((item) => ({
    ...item,
    icon: iconMap[item.iconKey] || Search,
  }));

  const actionItems = buildDashboardQuickActions({
    isGuard,
    canManageMasterData,
  }).map((action) => ({
    ...action,
    icon: iconMap[action.iconKey] || Activity,
  }));

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setDataResults({
        members: [],
        vehicles: [],
        gates: [],
        activePersonVisits: [],
        activeVehicleVisits: [],
        overCapacityGates: [],
      });
    }
  }, [open]);

  const run = (to) => {
    onOpenChange(false);
    navigate(to);
  };

  useEffect(() => {
    if (!open) return;
    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setDataResults((prev) => ({
        ...prev,
        members: [],
        vehicles: [],
        gates: [],
      }));
      return;
    }

    const needsExitContext = /^exit\s+(vehicle|person)\s+/i.test(q);
    const needsCapacityContext = /over[-\s]?capacity|capacity\s+alert|capacity\s+gates/i.test(q);

    setLoadingData(true);
    Promise.all([
      membersApi.getAll({ search: q, limit: 6 }).catch(() => null),
      vehiclesApi.getAll({ search: q, limit: 6 }).catch(() => null),
      gatesApi.getAll().catch(() => null),
      needsExitContext ? visitsApi.getPersonVisits({ active: true, limit: 100 }).catch(() => null) : Promise.resolve(null),
      needsExitContext ? visitsApi.getVehicleVisits({ active: true, limit: 100 }).catch(() => null) : Promise.resolve(null),
      needsCapacityContext ? gatesApi.getAllOccupancy().catch(() => null) : Promise.resolve(null),
    ])
      .then(([memberRes, vehicleRes, gateRes, personRes, vehicleVisitRes, occupancyRes]) => {
        const members = memberRes?.data?.members ?? memberRes?.members ?? memberRes?.data ?? [];
        const vehicles = vehicleRes?.data?.vehicles ?? vehicleRes?.vehicles ?? vehicleRes?.data ?? [];
        const gates = gateRes?.data?.data || gateRes?.data?.gates || gateRes?.data || [];
        const qLower = q.toLowerCase();

        const normalizedGates = (Array.isArray(gates) ? gates : []).filter((g) => {
          const name = String(g?.Name || g?.name || '').toLowerCase();
          return name.includes(qLower);
        }).slice(0, 6);

        const personRows = personRes?.data?.data || personRes?.data?.visits || personRes?.data || [];
        const vehicleRows = vehicleVisitRes?.data?.data || vehicleVisitRes?.data?.visits || vehicleVisitRes?.data || [];

        const occupancyRows = occupancyRes?.data?.data || occupancyRes?.data?.occupancy || occupancyRes?.data || [];
        const overCapacityGates = (Array.isArray(occupancyRows) ? occupancyRows : []).filter((row) => {
          const count = Number(row?.OccupancyCount ?? row?.occupancycount ?? 0);
          const limit = Number(row?.CapacityLimit ?? row?.capacitylimit ?? 20);
          return Number.isFinite(count) && Number.isFinite(limit) && count > limit;
        });

        setDataResults({
          members: Array.isArray(members) ? members.slice(0, 6) : [],
          vehicles: Array.isArray(vehicles) ? vehicles.slice(0, 6) : [],
          gates: normalizedGates,
          activePersonVisits: Array.isArray(personRows) ? personRows : [],
          activeVehicleVisits: Array.isArray(vehicleRows) ? vehicleRows : [],
          overCapacityGates,
        });
      })
      .finally(() => setLoadingData(false));
  }, [open, debouncedQuery]);

  const resolveGateId = (token) => {
    const gates = dataResults.gates;
    const cleaned = String(token || '').trim().toLowerCase();
    if (!cleaned) return null;

    const numeric = cleaned.match(/\d+/)?.[0];
    if (numeric) {
      const byId = gates.find((g) => String(g?.GateID || g?.gateid) === numeric);
      if (byId) return byId?.GateID || byId?.gateid;
      const byNameNumber = gates.find((g) => String(g?.Name || g?.name || '').toLowerCase().includes(numeric));
      if (byNameNumber) return byNameNumber?.GateID || byNameNumber?.gateid;
    }

    const byName = gates.find((g) => String(g?.Name || g?.name || '').toLowerCase().includes(cleaned));
    return byName ? (byName?.GateID || byName?.gateid) : null;
  };

  const runExitIntent = async ({ kind, subjectToken, gateToken }) => {
    const gateId = resolveGateId(gateToken);
    if (!gateId) {
      toast.error('Could not resolve exit gate from command');
      return;
    }

    if (kind === 'vehicle') {
      const token = String(subjectToken || '').trim().toLowerCase();
      const match = dataResults.activeVehicleVisits.find((row) => {
        const plate = String(row?.RegistrationNumber || row?.registrationnumber || '').toLowerCase();
        return token && plate.includes(token);
      });

      if (!match) {
        toast.error('No active vehicle visit matches this command');
        return;
      }

      const visitId = match?.VehicleVisitID || match?.vehiclevisitid || match?.VisitID || match?.visitid;
      await visitsApi.recordVehicleExit(visitId, { exitGateId: Number(gateId) });
      toast.success('Vehicle exit recorded from command palette');
      run('/visits/active');
      return;
    }

    if (kind === 'person') {
      const token = String(subjectToken || '').trim().toLowerCase();
      const match = dataResults.activePersonVisits.find((row) => {
        const name = String(row?.MemberName || row?.membername || '').toLowerCase();
        return token && name.includes(token);
      });

      if (!match) {
        toast.error('No active person visit matches this command');
        return;
      }

      const visitId = match?.PersonVisitID || match?.personvisitid || match?.VisitID || match?.visitid;
      await visitsApi.recordPersonExit(visitId, { exitGateId: Number(gateId) });
      toast.success('Person exit recorded from command palette');
      run('/visits/active');
    }
  };

  const intentCommands = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q) return [];

    const intents = [];

    if (/^(show|list)\s+over[-\s]?capacity\s+gates$/i.test(q)) {
      intents.push({
        id: 'show-over-capacity-gates',
        label: 'Show over-capacity gates',
        run: () => {
          run('/gates');
          if (dataResults.overCapacityGates.length > 0) {
            toast.info(`${dataResults.overCapacityGates.length} gate(s) currently over capacity`);
          } else {
            toast.success('No over-capacity gates right now');
          }
        },
      });
    }

    const exitVehicleMatch = q.match(/^exit\s+vehicle\s+(.+?)\s+at\s+gate\s+(.+)$/i);
    if (exitVehicleMatch) {
      intents.push({
        id: 'intent-exit-vehicle',
        label: `Exit vehicle ${exitVehicleMatch[1]} at gate ${exitVehicleMatch[2]}`,
        run: () => runExitIntent({ kind: 'vehicle', subjectToken: exitVehicleMatch[1], gateToken: exitVehicleMatch[2] }),
      });
    }

    const exitPersonMatch = q.match(/^exit\s+person\s+(.+?)\s+at\s+gate\s+(.+)$/i);
    if (exitPersonMatch) {
      intents.push({
        id: 'intent-exit-person',
        label: `Exit person ${exitPersonMatch[1]} at gate ${exitPersonMatch[2]}`,
        run: () => runExitIntent({ kind: 'person', subjectToken: exitPersonMatch[1], gateToken: exitPersonMatch[2] }),
      });
    }

    return intents;
  }, [debouncedQuery, dataResults.overCapacityGates.length]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            variants={backdropVariants}
            initial="initial" animate="animate" exit="exit"
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
          />

          <div className="fixed inset-0 z-[91] flex items-start justify-center pt-[20vh] px-4 pointer-events-none">
            <motion.div
              variants={scaleIn}
              initial="initial" animate="animate" exit="exit"
              className="w-full max-w-xl pointer-events-auto
                         bg-[hsl(228_40%_7%)] border border-white/10
                         rounded-2xl shadow-2xl overflow-hidden"
            >
              <Command
                className="[&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-white/10"
                value={query}
                onValueChange={setQuery}
              >
                <div className="flex items-center gap-3 px-4 h-14">
                  <Search size={16} className="text-white/40 flex-shrink-0" />
                  <Command.Input
                    placeholder="Search pages, records, or commands..."
                    className="flex-1 bg-transparent text-white/90 text-sm outline-none placeholder-white/30 font-medium"
                    autoFocus
                  />
                  <button
                    onClick={() => onOpenChange(false)}
                    className="p-1 rounded-md text-white/30 hover:text-white/60 hover:bg-white/5"
                  >
                    <X size={14} />
                  </button>
                </div>

                <Command.List className="max-h-[400px] overflow-y-auto p-2">
                  <Command.Empty className="py-8 text-center text-sm text-white/40">
                    No results found.
                  </Command.Empty>

                  <Command.Group
                    heading="Navigation"
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-white/30"
                  >
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Command.Item
                          key={item.id || item.to}
                          value={item.label}
                          onSelect={() => run(item.to)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 cursor-pointer data-[selected=true]:bg-indigo-500/15 data-[selected=true]:text-white transition-colors duration-100"
                        >
                          <Icon size={16} className="text-white/50 flex-shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          {item.shortcut ? (
                            <kbd className="text-[10px] text-white/30 font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                              {item.shortcut}
                            </kbd>
                          ) : null}
                        </Command.Item>
                      );
                    })}
                  </Command.Group>

                  <div className="h-px bg-white/[0.06] my-2" />

                  <Command.Group
                    heading="Quick Actions"
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-white/30"
                  >
                    {actionItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Command.Item
                          key={item.id || item.label}
                          value={item.label}
                          onSelect={() => run(item.to)}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 cursor-pointer data-[selected=true]:bg-emerald-500/15 data-[selected=true]:text-white transition-colors duration-100"
                        >
                          <Icon size={16} className="text-emerald-400/70 flex-shrink-0" />
                          <span className="flex-1">{item.label}</span>
                        </Command.Item>
                      );
                    })}
                  </Command.Group>

                  {(dataResults.members.length > 0 || dataResults.vehicles.length > 0 || dataResults.gates.length > 0) ? (
                    <>
                      <div className="h-px bg-white/[0.06] my-2" />
                      <Command.Group
                        heading="Data Results"
                        className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-white/30"
                      >
                        {dataResults.members.map((m) => {
                          const memberId = m?.MemberID || m?.memberid;
                          const name = m?.Name || m?.name || 'Unknown Member';
                          return (
                            <Command.Item
                              key={`member-${memberId}`}
                              value={`member ${name}`}
                              onSelect={() => run(`/members/${memberId}`)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 cursor-pointer data-[selected=true]:bg-sky-500/15 data-[selected=true]:text-white transition-colors duration-100"
                            >
                              <Users size={16} className="text-sky-300/80 flex-shrink-0" />
                              <span className="flex-1">Member: {name}</span>
                            </Command.Item>
                          );
                        })}

                        {dataResults.vehicles.map((v) => {
                          const vehicleId = v?.VehicleID || v?.vehicleid;
                          const plate = v?.RegistrationNumber || v?.registrationnumber || 'Unknown';
                          return (
                            <Command.Item
                              key={`vehicle-${vehicleId}`}
                              value={`vehicle ${plate}`}
                              onSelect={() => run(`/vehicles/${vehicleId}`)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 cursor-pointer data-[selected=true]:bg-sky-500/15 data-[selected=true]:text-white transition-colors duration-100"
                            >
                              <Car size={16} className="text-sky-300/80 flex-shrink-0" />
                              <span className="flex-1">Vehicle: {plate}</span>
                            </Command.Item>
                          );
                        })}

                        {dataResults.gates.map((g) => {
                          const gateId = g?.GateID || g?.gateid;
                          const gateName = g?.Name || g?.name || `Gate ${gateId}`;
                          return (
                            <Command.Item
                              key={`gate-${gateId}`}
                              value={`gate ${gateName}`}
                              onSelect={() => run(`/gates/${gateId}`)}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 cursor-pointer data-[selected=true]:bg-sky-500/15 data-[selected=true]:text-white transition-colors duration-100"
                            >
                              <DoorOpen size={16} className="text-sky-300/80 flex-shrink-0" />
                              <span className="flex-1">Gate: {gateName}</span>
                            </Command.Item>
                          );
                        })}
                      </Command.Group>
                    </>
                  ) : null}

                  {intentCommands.length > 0 ? (
                    <>
                      <div className="h-px bg-white/[0.06] my-2" />
                      <Command.Group
                        heading="Intent Commands"
                        className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-white/30"
                      >
                        {intentCommands.map((intent) => (
                          <Command.Item
                            key={intent.id}
                            value={intent.label}
                            onSelect={intent.run}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 cursor-pointer data-[selected=true]:bg-amber-500/15 data-[selected=true]:text-white transition-colors duration-100"
                          >
                            <Activity size={16} className="text-amber-300/80 flex-shrink-0" />
                            <span className="flex-1">{intent.label}</span>
                          </Command.Item>
                        ))}
                      </Command.Group>
                    </>
                  ) : null}
                </Command.List>

                <div className="flex items-center gap-3 px-4 py-2.5 border-t border-white/[0.06] text-[10px] text-white/25 font-mono">
                  <span><kbd>↑↓</kbd> navigate</span>
                  <span><kbd>↵</kbd> select</span>
                  <span><kbd>Esc</kbd> close</span>
                  {loadingData ? <span className="ml-auto">Loading data...</span> : null}
                </div>
              </Command>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
