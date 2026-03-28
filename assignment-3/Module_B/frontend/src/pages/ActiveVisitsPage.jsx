// src/pages/ActiveVisitsPage.jsx
// Live active visits monitor — person + vehicle combined, live duration timer

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate }  from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import * as Popover from '@radix-ui/react-popover';
import { CheckCircle2, RefreshCw, AlertTriangle, Car, Users, Clock, LogOut, X } from 'lucide-react';
import * as visitsApi from '@/api/visits.api';
import * as gatesApi  from '@/api/gates.api';
import { useAuth }    from '@/context/AuthContext';
import PageHeader     from '@/components/shared/PageHeader';
import EmptyState     from '@/components/shared/EmptyState';
import SavedViewsBar  from '@/components/shared/SavedViewsBar';
import { useSavedViews } from '@/hooks/useSavedViews';
import { cn, getInitials, formatDuration } from '@/lib/utils';
import { pageVariants, staggerContainer, staggerItem } from '@/lib/motion';

// -- 8 hour threshold for overstay -------------------------------------
const OVERSTAY_MS = 8 * 60 * 60 * 1000;

// -- Quick-exit popover ------------------------------------------------
function QuickExitPopover({ visit, gates, onExit }) {
  const [open,         setOpen]         = useState(false);
  const [gateId,       setGateId]       = useState('');
  const [submitting,   setSubmitting]   = useState(false);

  const confirm = async () => {
    if (!gateId) { toast.error('Select an exit gate'); return; }
    setSubmitting(true);
    try {
      await onExit(visit, Number(gateId));
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors mt-auto">
          <LogOut size={12} /> Quick Exit
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="z-[200] w-[220px] bg-[hsl(228_40%_8%)] border border-white/10 rounded-xl shadow-2xl p-3 space-y-2" sideOffset={6}>
          <p className="text-xs font-semibold text-white/60">Select exit gate</p>
          <select className="input-field text-xs" value={gateId} onChange={(e) => setGateId(e.target.value)}>
            <option value="">Choose gate...</option>
            {gates.map((g) => (
              <option key={g.GateID || g.gateid} value={g.GateID || g.gateid}>{g.Name || g.name}</option>
            ))}
          </select>
          <button onClick={confirm} disabled={submitting || !gateId} className="btn-primary w-full text-xs py-1.5 disabled:opacity-50">
            {submitting ? 'Confirming...' : 'Confirm Exit'}
          </button>
          <Popover.Arrow className="fill-[hsl(228_40%_8%)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// -- Single visit card -------------------------------------------------
function VisitCard({ visit, now, gates, onExit, onRemove }) {
  const isPerson   = visit._type === 'person';
  const entryTime  = visit.EntryTime || visit.entrytime;
  const duration   = formatDuration(entryTime, now.toISOString());
  const isOverstay = entryTime && (now - new Date(entryTime)) > OVERSTAY_MS;

  const label     = isPerson
    ? (visit.MemberName  || visit.membername  || '—')
    : (visit.RegistrationNumber || visit.registrationnumber || '—');
  const sublabel  = isPerson
    ? (visit.Department  || visit.department  || (visit.TypeName || visit.typename || ''))
    : (visit.Model       || visit.model       || '');
  const gateName  = visit.EntryGateName || visit.entrygatename || '—';

  return (
    <motion.div
      variants={staggerItem}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      layout
      className={cn(
        'glass-card p-4 flex flex-col gap-3 relative',
        isOverstay && 'border border-amber-500/30'
      )}
    >
      {isOverstay && (
        <div className="absolute top-3 right-3">
          <AlertTriangle size={14} className="text-amber-400" />
        </div>
      )}

      {/* Avatar / icon */}
      <div className="flex items-center gap-3">
        {isPerson ? (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600
                          flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
            {getInitials(label)}
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600
                          flex items-center justify-center flex-shrink-0">
            <Car size={18} className="text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {isPerson
            ? <p className="font-semibold text-white/85 truncate text-sm">{label}</p>
            : <span className="plate text-xs">{label}</span>
          }
          {sublabel && <p className="text-[10px] text-white/35 truncate">{sublabel}</p>}
        </div>
      </div>

      {/* Gate */}
      <p className="text-xs text-white/45 flex items-center gap-1">
        Entry via <span className="text-indigo-300 font-medium">{gateName}</span>
      </p>

      {/* Live duration */}
      <div className={cn('flex items-center gap-1.5 text-sm font-bold', isOverstay ? 'text-amber-400' : 'text-white/80')}>
        <Clock size={13} />
        {duration || '0m'}
        {isOverstay && <span className="text-[10px] font-medium text-amber-400/70 ml-1">Overstay</span>}
      </div>

      {/* Quick exit */}
      <QuickExitPopover visit={visit} gates={gates} onExit={onExit} />
    </motion.div>
  );
}

// -- Main page ---------------------------------------------------------
export default function ActiveVisitsPage() {
  const [visits,     setVisits]     = useState([]);
  const [gates,      setGates]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now,        setNow]        = useState(new Date());
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortMode, setSortMode] = useState('longest');
  const [overstayOnly, setOverstayOnly] = useState(false);
  const [selectedViewId, setSelectedViewId] = useState('');

  const { views, byId, saveView, deleteView } = useSavedViews('gateguard.savedViews.activeVisits');

  // Live clock — updates every second
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch gates once
  useEffect(() => {
    gatesApi.getAll()
      .then((r) => setGates(r?.data?.data || r?.data?.gates || r?.data || []))
      .catch(() => {});
  }, []);

  const fetchActive = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [pr, vr] = await Promise.all([
        visitsApi.getPersonVisits({ active: true, limit: 100 }),
        visitsApi.getVehicleVisits({ active: true, limit: 100 }),
      ]);
      const persons  = (pr?.data?.data ?? pr?.data?.visits ?? []).map((v) => ({ ...v, _type: 'person' }));
      const vehicles = (vr?.data?.data ?? vr?.data?.visits ?? []).map((v) => ({ ...v, _type: 'vehicle' }));
      // merge + sort by entryTime ascending (longest stay first)
      const merged = [...persons, ...vehicles].sort((a, b) => {
        const ta = new Date(a.EntryTime || a.entrytime).getTime();
        const tb = new Date(b.EntryTime || b.entrytime).getTime();
        return ta - tb;
      });
      setVisits(merged);
    } catch {
      setVisits([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchActive(); }, [fetchActive]);

  const handleExit = async (visit, exitGateId) => {
    try {
      if (visit._type === 'person') {
        await visitsApi.recordPersonExit(visit.PersonVisitID || visit.personvisitid || visit.VisitID || visit.visitid, { exitGateId });
      } else {
        await visitsApi.recordVehicleExit(visit.VehicleVisitID || visit.vehiclevisitid || visit.VisitID || visit.visitid, { exitGateId });
      }
      toast.success('Exit recorded');
      // Remove card immediately, re-fetch in background
      setVisits((prev) => prev.filter((v) => {
        if (visit._type === 'person') {
          return (v.PersonVisitID || v.personvisitid || v.VisitID || v.visitid)
            !== (visit.PersonVisitID || visit.personvisitid || visit.VisitID || visit.visitid);
        }
        return (v.VehicleVisitID || v.vehiclevisitid || v.VisitID || v.visitid)
          !== (visit.VehicleVisitID || visit.vehiclevisitid || visit.VisitID || visit.visitid);
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record exit');
    }
  };

  const personCount  = visits.filter((v) => v._type === 'person').length;
  const vehicleCount = visits.filter((v) => v._type === 'vehicle').length;

  const filteredVisits = visits
    .filter((v) => (typeFilter === 'all' ? true : v._type === typeFilter))
    .filter((v) => {
      if (!overstayOnly) return true;
      const t = new Date(v.EntryTime || v.entrytime).getTime();
      return Date.now() - t > OVERSTAY_MS;
    })
    .sort((a, b) => {
      const ta = new Date(a.EntryTime || a.entrytime || 0).getTime();
      const tb = new Date(b.EntryTime || b.entrytime || 0).getTime();
      if (sortMode === 'newest') return tb - ta;
      if (sortMode === 'overstay') {
        const aOver = Date.now() - ta > OVERSTAY_MS ? 1 : 0;
        const bOver = Date.now() - tb > OVERSTAY_MS ? 1 : 0;
        if (aOver !== bOver) return bOver - aOver;
      }
      return ta - tb;
    });

  const handleSaveCurrentView = (name) => {
    if (!name.trim()) {
      toast.error('Provide a name for the saved view');
      return false;
    }
    const created = saveView(name, { typeFilter, sortMode, overstayOnly });
    if (created) {
      setSelectedViewId(created.id);
      toast.success('Saved current view');
      return true;
    }
    return false;
  };

  const handleApplyView = (id) => {
    setSelectedViewId(id);
    const view = byId.get(id);
    if (!view) return;
    const payload = view.payload || {};
    setTypeFilter(payload.typeFilter || 'all');
    setSortMode(payload.sortMode || 'longest');
    setOverstayOnly(Boolean(payload.overstayOnly));
    toast.success(`Applied view: ${view.name}`);
  };

  const handleDeleteCurrentView = () => {
    if (!selectedViewId) return;
    const view = byId.get(selectedViewId);
    deleteView(selectedViewId);
    setSelectedViewId('');
    toast.success(view ? `Deleted view: ${view.name}` : 'Deleted saved view');
  };

  return (
    <motion.div
      variants={pageVariants} initial="initial" animate="animate"
      className="p-6 space-y-5 pb-20 md:pb-6"
    >
      <PageHeader
        title="Active Visits Monitor"
        subtitle={`${filteredVisits.length} visible — ${personCount} persons · ${vehicleCount} vehicles`}
        breadcrumb={[{ label: 'Visits' }, { label: 'Active Monitor' }]}
        actions={
          <button
            onClick={() => fetchActive(true)}
            disabled={refreshing}
            className="btn-ghost text-sm"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        }
      />

      <SavedViewsBar
        title="Saved Views"
        views={views}
        selectedViewId={selectedViewId}
        onSelectView={handleApplyView}
        onSaveCurrent={handleSaveCurrentView}
        onDeleteSelected={handleDeleteCurrentView}
      />

      <div className="glass-card p-3 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/35">Queue Filters</span>
        <select className="input-field w-auto text-xs" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="person">People Only</option>
          <option value="vehicle">Vehicles Only</option>
        </select>
        <select className="input-field w-auto text-xs" value={sortMode} onChange={(e) => setSortMode(e.target.value)}>
          <option value="longest">Longest Stay First</option>
          <option value="newest">Newest Entry First</option>
          <option value="overstay">Overstay Priority</option>
        </select>
        <label className="text-xs text-white/70 inline-flex items-center gap-2 ml-1">
          <input type="checkbox" checked={overstayOnly} onChange={(e) => setOverstayOnly(e.target.checked)} />
          Overstay only
        </label>
      </div>

      {/* Summary chips */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300">
          <Users size={12} /> {personCount} Person{personCount !== 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300">
          <Car size={12} /> {vehicleCount} Vehicle{vehicleCount !== 1 ? 's' : ''}
        </div>
        {visits.filter((v) => {
          const t = new Date(v.EntryTime || v.entrytime).getTime();
          return (Date.now() - t) > OVERSTAY_MS;
        }).length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-400">
            <AlertTriangle size={12} /> Overstay alerts
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card p-4 space-y-3">
              <div className="flex gap-3"><div className="skeleton w-10 h-10 rounded-xl" /><div className="skeleton flex-1 h-10 rounded" /></div>
              <div className="skeleton h-3 w-24 rounded" />
              <div className="skeleton h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      ) : filteredVisits.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No matching visits"
          description="No active visits match the current saved view or filters."
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <motion.div
            variants={staggerContainer} initial="initial" animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredVisits.map((v) => {
              const key = v._type === 'person'
                ? `p-${v.PersonVisitID || v.personvisitid || v.VisitID || v.visitid}`
                : `v-${v.VehicleVisitID || v.vehiclevisitid || v.VisitID || v.visitid}`;
              return (
                <VisitCard
                  key={key}
                  visit={v}
                  now={now}
                  gates={gates}
                  onExit={handleExit}
                />
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
}

