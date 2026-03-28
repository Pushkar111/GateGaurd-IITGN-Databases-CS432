// src/pages/GatesPage.jsx
// Gates & Occupancy — SVG radial rings, slide-in detail panel, CRUD

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import * as Dialog from '@radix-ui/react-dialog';
import CountUp from 'react-countup';
import {
  DoorOpen, X, Plus, ChevronRight, Loader2, RefreshCw, Edit,
} from 'lucide-react';
import * as gatesApi from '@/api/gates.api';
import { useAuth }    from '@/context/AuthContext';
import PageHeader     from '@/components/shared/PageHeader';
import DataTable      from '@/components/shared/DataTable';
import EmptyState     from '@/components/shared/EmptyState';
import ConfirmDialog  from '@/components/shared/ConfirmDialog';
import { cn, formatDate } from '@/lib/utils';
import {
  pageVariants, staggerContainer, staggerItem, scaleIn,
  backdropVariants, slideInRight, cardHover,
} from '@/lib/motion';

// -- Constants ---------------------------------------------------------
const DEFAULT_CAPACITY_LIMIT = 20;
const CIRCUMFERENCE = 2 * Math.PI * 36; // r=36

function getRiskMeta(count, capacityLimit = DEFAULT_CAPACITY_LIMIT) {
  const numeric = Number(count) || 0;
  if (numeric > capacityLimit) {
    return { label: 'Critical: Over Capacity', cls: 'badge-danger', level: 'critical' };
  }
  if (numeric >= Math.ceil(capacityLimit * 0.8)) {
    return { label: 'Warning: Near Capacity', cls: 'badge-warning', level: 'warning' };
  }
  return { label: 'Normal Capacity', cls: 'badge-success', level: 'normal' };
}

// -- Occupancy color ---------------------------------------------------
function ringColor(count, capacityLimit = DEFAULT_CAPACITY_LIMIT) {
  const pct = count / capacityLimit;
  if (pct >= 0.8) return '#ef4444';
  if (pct >= 0.5) return '#f59e0b';
  return '#10b981';
}

// -- SVG Radial Ring ---------------------------------------------------
function RadialRing({ count = 0, capacityLimit = DEFAULT_CAPACITY_LIMIT }) {
  const pct    = Math.min(count / capacityLimit, 1);
  const offset = CIRCUMFERENCE * (1 - pct);
  const color  = ringColor(count, capacityLimit);

  return (
    <div className="relative flex items-center justify-center w-24 h-24 mx-auto">
      <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
        {/* Background track */}
        <circle
          cx="50" cy="50" r="36"
          fill="none"
          stroke="hsl(228 35% 15%)"
          strokeWidth="8"
        />
        {/* Animated foreground */}
        <motion.circle
          cx="50" cy="50" r="36"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          initial={{ strokeDashoffset: CIRCUMFERENCE }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white tabular-nums">
          <CountUp end={count} duration={1.2} />
        </span>
        <span className="text-[9px] text-white/30 font-medium">/{capacityLimit}</span>
      </div>
    </div>
  );
}

// -- Gate card ---------------------------------------------------------
function GateCard({ gate, onClick }) {
  const name     = gate.Name     || gate.name     || '—';
  const location = gate.Location || gate.location || '—';
  const count    = gate.OccupancyCount ?? gate.occupancycount ?? 0;
  const capacityLimit = Number(gate.CapacityLimit ?? gate.capacitylimit ?? DEFAULT_CAPACITY_LIMIT);
  const risk     = getRiskMeta(count, capacityLimit);

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ scale: 1.02, y: -2, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
      onClick={onClick}
      className="glass-card p-6 cursor-pointer flex flex-col gap-4 relative"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={cn(
                'inline-block h-2.5 w-2.5 rounded-full',
                risk.level === 'critical' ? 'bg-red-400' : risk.level === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'
              )}
            />
            <h3 className="text-lg font-bold text-white">{name}</h3>
          </div>
          <p className="text-xs text-white/40">{location}</p>
        </div>
        <span className={cn('badge text-[10px]', risk.cls)}>
          {risk.label}
        </span>
      </div>

      {/* Radial ring */}
      <RadialRing count={count} capacityLimit={capacityLimit} />

      {/* Occupancy label */}
      <p className="text-center text-xs text-white/30">
        Current occupancy
      </p>

      {/* View details */}
      <button className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors mx-auto">
        View Details <ChevronRight size={13} />
      </button>
    </motion.div>
  );
}

// -- Zod schemas -------------------------------------------------------
const gateSchema = z.object({
  name:     z.string().min(2, 'Name required').max(80),
  location: z.string().min(2, 'Location required').max(100),
});

// -- Visit history table columns ---------------------------------------
const historyColumns = [
  { header: 'Type',       id: 'type',  cell: ({ row: { original: v } }) => <span className="badge badge-primary text-[10px]">{v.Type || v.type || 'Person'}</span> },
  { header: 'Subject',    id: 'subj',  cell: ({ row: { original: v } }) => <span className="text-white/70 text-xs">{v.subject || v.Subject || '—'}</span> },
  { header: 'Entry Time', id: 'entry', cell: ({ row: { original: v } }) => <span className="text-white/50 text-xs">{formatDate(v.EntryTime || v.entrytime)}</span> },
  { header: 'Status',     id: 'stat',  cell: ({ row: { original: v } }) => (v.IsActive || v.isactive) ? <span className="badge badge-success text-[10px]">Active</span> : <span className="badge badge-muted text-[10px]">Done</span> },
];

// -- Main page ---------------------------------------------------------
export default function GatesPage() {
  const { hasRole } = useAuth();
  const isSA        = hasRole('SuperAdmin');
  const isAdmin     = hasRole('Admin', 'SuperAdmin');

  const [gates,       setGates]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState(null); // gate in detail panel
  const [showAdd,     setShowAdd]     = useState(false);
  const [panelOpen,   setPanelOpen]   = useState(false);
  const [editCount,   setEditCount]   = useState('');
  const [updating,    setUpdating]    = useState(false);
  const [history,     setHistory]     = useState([]);
  const [histLoad,    setHistLoad]    = useState(false);
  const [showDelete,  setShowDelete]  = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [selectedCapacityLimit, setSelectedCapacityLimit] = useState(DEFAULT_CAPACITY_LIMIT);
  const [overrideMode, setOverrideMode] = useState(false);
  const [incidentNote, setIncidentNote] = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(gateSchema),
    defaultValues: { name: '', location: '' },
  });

  const fetchGates = useCallback(() => {
    setLoading(true);
    // Fetch gates and occupancy in parallel
    Promise.all([gatesApi.getAll(), gatesApi.getAllOccupancy()])
      .then(([gr, or]) => {
        const gs   = gr?.data?.data  || gr?.data?.gates  || gr?.data  || [];
        const occs = or?.data?.data  || or?.data?.occupancy || or?.data || [];
        // Merge occupancy into gates
        const occMap = {};
        occs.forEach((o) => {
          occMap[o.GateID || o.gateid] = {
            occupancyCount: o.OccupancyCount ?? o.occupancycount ?? 0,
            capacityLimit: o.CapacityLimit ?? o.capacitylimit ?? DEFAULT_CAPACITY_LIMIT,
          };
        });
        const merged = gs.map((g) => ({
          ...g,
          OccupancyCount: occMap[g.GateID || g.gateid]?.occupancyCount ?? g.OccupancyCount ?? g.occupancycount ?? 0,
          CapacityLimit: occMap[g.GateID || g.gateid]?.capacityLimit ?? g.CapacityLimit ?? g.capacitylimit ?? DEFAULT_CAPACITY_LIMIT,
        }));
        setGates(merged);
        setLastSyncedAt(new Date());
      })
      .catch(() => setGates([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchGates(); }, [fetchGates]);

  const openPanel = (gate) => {
    setSelected(gate);
    setEditCount(gate.OccupancyCount ?? 0);
    setSelectedCapacityLimit(Number(gate.CapacityLimit ?? gate.capacitylimit ?? DEFAULT_CAPACITY_LIMIT));
    setOverrideMode(false);
    setIncidentNote('');
    setPanelOpen(true);
    setHistLoad(true);
    // Fetch recent visits for this gate (best effort)
    gatesApi.getById(gate.GateID || gate.gateid)
      .then((r) => {
        const detail   = r?.data?.data || r?.data?.gate || r?.data || {};
        const visits   = detail.recentVisits || detail.visits || [];
        setHistory(visits);
      })
      .catch(() => setHistory([]))
      .finally(() => setHistLoad(false));
  };

  const handleUpdateOccupancy = async () => {
    if (!selected) return;
    const numericCount = Number(editCount);
    const numericCapacityLimit = Number(selectedCapacityLimit);

    if (Number.isNaN(numericCount) || numericCount < 0) {
      toast.error('Enter a valid non-negative occupancy count');
      return;
    }
    if (!Number.isInteger(numericCapacityLimit) || numericCapacityLimit <= 0 || numericCapacityLimit > 500) {
      toast.error('Capacity limit must be between 1 and 500');
      return;
    }
    if (numericCount > numericCapacityLimit && !overrideMode) {
      toast.error('Over-capacity update requires emergency override and incident note');
      return;
    }
    if (numericCount > numericCapacityLimit && incidentNote.trim().length < 8) {
      toast.error('Add an incident note (min 8 chars) for emergency override');
      return;
    }

    setUpdating(true);
    try {
      await gatesApi.updateOccupancy(selected.GateID || selected.gateid, {
        occupancyCount: numericCount,
        capacityLimit: numericCapacityLimit,
        emergencyOverride: overrideMode,
        incidentNote: incidentNote.trim(),
      });
      toast.success('Occupancy updated');
      fetchGates();
      // update in local state too
      setSelected((prev) => ({ ...prev, OccupancyCount: numericCount, CapacityLimit: numericCapacityLimit }));
      setOverrideMode(false);
      setIncidentNote('');
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const onAddSubmit = async (data) => {
    try {
      await gatesApi.create(data);
      toast.success('Gate added');
      setShowAdd(false);
      reset();
      fetchGates();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add gate');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await gatesApi.remove(selected.GateID || selected.gateid);
      toast.success('Gate deleted');
      setPanelOpen(false);
      setShowDelete(false);
      fetchGates();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      variants={pageVariants} initial="initial" animate="animate"
      className="p-6 space-y-5 pb-20 md:pb-6"
    >
      <PageHeader
        title="Gates & Occupancy"
        subtitle={`${gates.length} gate${gates.length !== 1 ? 's' : ''} monitored`}
        breadcrumb={[{ label: 'Gates' }]}
        actions={
          isSA && (
            <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
              <Plus size={16} /> Add Gate
            </button>
          )
        }
      />

      <div className="text-xs text-white/40">
        Last synced: {lastSyncedAt ? formatDate(lastSyncedAt, 'dd MMM yyyy, HH:mm:ss') : '—'}
      </div>

      {/* Gate cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card p-6 space-y-4">
              <div className="skeleton h-6 w-32 rounded" />
              <div className="skeleton w-24 h-24 rounded-full mx-auto" />
              <div className="skeleton h-3 w-20 rounded mx-auto" />
            </div>
          ))}
        </div>
      ) : gates.length === 0 ? (
        <EmptyState icon={DoorOpen} title="No gates configured" description="Add your first gate to start monitoring campus access." />
      ) : (
        <motion.div
          variants={staggerContainer} initial="initial" animate="animate"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {gates.map((g) => (
            <GateCard key={g.GateID || g.gateid} gate={g} onClick={() => openPanel(g)} />
          ))}
        </motion.div>
      )}

      {/* -- Detail Panel (slide from right) ----------------------- */}
      <AnimatePresence>
        {panelOpen && selected && (
          <>
            {/* Backdrop */}
            <motion.div
              variants={backdropVariants} initial="initial" animate="animate" exit="exit"
              onClick={() => setPanelOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            {/* Panel */}
            <motion.div
              variants={slideInRight} initial="initial" animate="animate" exit="exit"
              className="fixed inset-y-0 right-0 z-50 w-full max-w-sm
                         bg-[hsl(228_40%_7%)] border-l border-white/[0.08]
                         flex flex-col overflow-hidden"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
                <div>
                  <h2 className="text-lg font-bold text-white">{selected.Name || selected.name}</h2>
                  <p className="text-xs text-white/40">{selected.Location || selected.location}</p>
                </div>
                <button onClick={() => setPanelOpen(false)} className="icon-rail-btn"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Occupancy ring */}
                <RadialRing count={selected.OccupancyCount ?? 0} capacityLimit={selectedCapacityLimit} />

                <div className="text-xs">
                  <span className={cn('badge text-[10px]', getRiskMeta(selected.OccupancyCount ?? 0, selectedCapacityLimit).cls)}>
                    {getRiskMeta(selected.OccupancyCount ?? 0, selectedCapacityLimit).label}
                  </span>
                </div>

                {/* Update occupancy */}
                {isAdmin && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-white/50 uppercase tracking-widest">Update Occupancy</p>
                    <div className="space-y-1">
                      <label className="text-[11px] text-white/55">Safe Capacity Limit</label>
                      <input
                        type="number"
                        min="1"
                        max="500"
                        className="input-field"
                        value={selectedCapacityLimit}
                        onChange={(e) => setSelectedCapacityLimit(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        className="input-field flex-1"
                        value={editCount}
                        onChange={(e) => setEditCount(e.target.value)}
                      />
                      <button onClick={handleUpdateOccupancy} disabled={updating} className="btn-primary px-3">
                        {updating ? <Loader2 size={14} className="animate-spin" /> : 'Update'}
                      </button>
                    </div>
                    {Number(editCount) > Number(selectedCapacityLimit) && (
                      <div className="space-y-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                        <p className="text-xs text-red-300 font-semibold">Critical update: exceeds safe capacity ({selectedCapacityLimit}).</p>
                        <label className="flex items-center gap-2 text-xs text-white/70">
                          <input
                            type="checkbox"
                            checked={overrideMode}
                            onChange={(e) => setOverrideMode(e.target.checked)}
                          />
                          Emergency override
                        </label>
                        <textarea
                          className="input-field min-h-[76px]"
                          placeholder="Incident note (required for override)"
                          value={incidentNote}
                          onChange={(e) => setIncidentNote(e.target.value)}
                          disabled={!overrideMode}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/45">Capacity limit: {selectedCapacityLimit}</span>
                  {isSA && (
                    <button onClick={() => setShowDelete(true)} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                      Delete Gate
                    </button>
                  )}
                </div>

                {/* Recent visits */}
                <div>
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Recent Visits</p>
                  {histLoad ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-8 rounded-lg" />)}
                    </div>
                  ) : history.length === 0 ? (
                    <p className="text-white/25 text-xs text-center py-6">No recent visits</p>
                  ) : (
                    <DataTable data={history} columns={historyColumns} emptyMessage="No visits recorded." />
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Gate Modal */}
      <Dialog.Root open={showAdd} onOpenChange={setShowAdd}>
        <AnimatePresence>
          {showAdd && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div variants={backdropVariants} initial="initial" animate="animate" exit="exit"
                  className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
                  <motion.div variants={scaleIn} initial="initial" animate="animate" exit="exit"
                    className="w-full max-w-md bg-[hsl(228_40%_7%)] border border-white/10 rounded-2xl shadow-2xl p-6">
                    <div className="flex items-center justify-between mb-5">
                      <Dialog.Title className="text-lg font-bold text-white">Add New Gate</Dialog.Title>
                      <Dialog.Close className="icon-rail-btn"><X size={16} /></Dialog.Close>
                    </div>
                    <form onSubmit={handleSubmit(onAddSubmit)} className="space-y-4">
                      {[
                        { label: 'Gate Name', name: 'name', placeholder: 'Main Gate' },
                        { label: 'Location',  name: 'location', placeholder: 'North Entrance' },
                      ].map((f) => (
                        <div key={f.name} className="space-y-1">
                          <label className="text-xs font-medium text-white/50">{f.label}</label>
                          <input {...register(f.name)} placeholder={f.placeholder} className="input-field" />
                          {errors[f.name] && <p className="text-xs text-red-400">{errors[f.name].message}</p>}
                        </div>
                      ))}
                      <div className="flex justify-end gap-3 pt-2">
                        <Dialog.Close className="btn-ghost">Cancel</Dialog.Close>
                        <button type="submit" disabled={isSubmitting} className="btn-primary">
                          {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Adding...</> : 'Add Gate'}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>

      {/* Delete confirm */}
      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Gate"
        description={`Delete "${selected?.Name || selected?.name}"? All visits through this gate will lose gate association.`}
        onConfirm={handleDelete}
        loading={deleting}
        variant="danger"
      />
    </motion.div>
  );
}

