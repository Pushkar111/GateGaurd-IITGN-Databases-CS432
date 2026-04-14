// src/pages/GateDetailPage.jsx
// Gate detail — hero with occupancy progress bar, person + vehicle visit tabs

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Tabs from '@radix-ui/react-tabs';
import { toast } from 'sonner';
import { DoorOpen, Pencil, Loader2, X, Activity, Users, Car } from 'lucide-react';
import * as gatesApi  from '@/api/gates.api';
import * as visitsApi from '@/api/visits.api';
import { useAuth }    from '@/context/AuthContext';
import PageHeader     from '@/components/shared/PageHeader';
import DataTable      from '@/components/shared/DataTable';
import StatCard       from '@/components/shared/StatCard';
import EmptyState     from '@/components/shared/EmptyState';
import ConfirmDialog  from '@/components/shared/ConfirmDialog';
import { cn, formatDate, formatDuration, formatRelativeTime } from '@/lib/utils';
import { pageVariants, fadeInUp, scaleIn } from '@/lib/motion';

const MAX_CAP = 20;

function occupancyColor(count) {
  const p = count / MAX_CAP;
  if (p >= 0.8) return { bar: 'bg-red-500',    text: 'text-red-400' };
  if (p >= 0.5) return { bar: 'bg-amber-500',  text: 'text-amber-400' };
  return              { bar: 'bg-emerald-500', text: 'text-emerald-400' };
}

const editSchema = z.object({
  name:     z.string().min(2).max(80),
  location: z.string().min(2).max(100),
  status:   z.enum(['Active', 'Inactive']),
});

// -- Visit column builders ---------------------------------------------
function buildPersonCols(gateId) {
  return [
  { header: 'Member',     id: 'mem',  cell: ({ row: { original: v } }) => <span className="text-white/70 text-xs font-medium">{v.MemberName || v.membername || '—'}</span> },
  {
    header: 'Direction', id: 'dir', cell: ({ row: { original: v } }) => {
      const entryGateId = v.EntryGateID || v.entrygateid;
      const exitGateId = v.ExitGateID || v.exitgateid;
      const isEntry = String(entryGateId) === String(gateId);
      const isExit = String(exitGateId) === String(gateId);
      const label = isEntry ? 'Entry' : (isExit ? 'Exit' : 'Transit');
      return <span className={cn('badge text-[10px]', isEntry ? 'badge-success' : 'badge-muted')}>{label}</span>;
    },
  },
  { header: 'Time',       id: 'time', cell: ({ row: { original: v } }) => <span className="text-white/50 text-xs">{formatDate(v.EntryTime || v.entrytime)}</span> },
  { header: 'Duration',   id: 'dur',  cell: ({ row: { original: v } }) => <span className="text-white/50 text-xs">{formatDuration(v.EntryTime || v.entrytime, v.ExitTime || v.exittime)}</span> },
  { header: 'Status',     id: 'st',   cell: ({ row: { original: v } }) => (v.IsActive || v.isactive) ? <span className="badge badge-success text-[10px]">Active</span> : <span className="badge badge-muted text-[10px]">Done</span> },
  ];
}

const vehicleCols = [
  { header: 'Plate',    id: 'pl',   cell: ({ row: { original: v } }) => <span className="plate text-xs">{v.RegistrationNumber || v.registrationnumber || '—'}</span> },
  { header: 'Model',    id: 'mod',  cell: ({ row: { original: v } }) => <span className="text-white/60 text-xs">{v.Model || v.model || '—'}</span> },
  { header: 'Time',     id: 'time', cell: ({ row: { original: v } }) => <span className="text-white/50 text-xs">{formatDate(v.EntryTime || v.entrytime)}</span> },
  { header: 'Duration', id: 'dur',  cell: ({ row: { original: v } }) => <span className="text-white/50 text-xs">{formatDuration(v.EntryTime || v.entrytime, v.ExitTime || v.exittime)}</span> },
  { header: 'Status',   id: 'st',   cell: ({ row: { original: v } }) => (v.IsActive || v.isactive) ? <span className="badge badge-success text-[10px]">Active</span> : <span className="badge badge-muted text-[10px]">Done</span> },
];

export default function GateDetailPage() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { hasRole } = useAuth();
  const isSA        = hasRole('SuperAdmin');
  const isAdmin     = hasRole('Admin', 'SuperAdmin');

  const [gate,         setGate]         = useState(null);
  const [occupancy,    setOccupancy]    = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [notFound,     setNotFound]     = useState(false);
  const [activeTab,    setActiveTab]    = useState('persons');
  const [personVisits, setPersonVisits] = useState([]);
  const [vehicleVisits,setVehicleVisits]= useState([]);
  const [pvLoad,       setPvLoad]       = useState(false);
  const [vvLoad,       setVvLoad]       = useState(false);
  const [showEdit,     setShowEdit]     = useState(false);
  const [showDelete,   setShowDelete]   = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [newCount,     setNewCount]     = useState('');
  const [updating,     setUpdating]     = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(editSchema) });

  const fetchGate = useCallback(() => {
    setLoading(true);
    Promise.all([gatesApi.getById(id), gatesApi.getAllOccupancy()])
      .then(([gr, or]) => {
        const g = gr?.data?.data || gr?.data?.gate || gr?.data;
        if (!g) { setNotFound(true); return; }
        setGate(g);
        // Find occupancy for this gate
        const occs = or?.data?.data || or?.data?.occupancy || or?.data || [];
        const occ  = occs.find((o) => (o.GateID || o.gateid) == id);
        const cnt  = occ?.OccupancyCount ?? occ?.occupancycount ?? g.OccupancyCount ?? g.occupancycount ?? 0;
        setOccupancy(cnt);
        setNewCount(cnt);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { fetchGate(); }, [fetchGate]);

  // Prefill edit form
  useEffect(() => {
    if (gate && showEdit) {
      reset({ name: gate.Name || gate.name || '', location: gate.Location || gate.location || '', status: gate.Status || gate.status || 'Active' });
    }
  }, [gate, showEdit, reset]);

  // Fetch person visits when tab active
  useEffect(() => {
    if (activeTab !== 'persons') return;
    setPvLoad(true);
    visitsApi.getPersonVisits({ gateId: id, limit: 50 })
      .then((r) => { const d = r?.data?.data || r?.data; setPersonVisits(Array.isArray(d) ? d : (d?.visits ?? [])); })
      .catch(() => setPersonVisits([]))
      .finally(() => setPvLoad(false));
  }, [activeTab, id]);

  // Fetch vehicle visits when tab active
  useEffect(() => {
    if (activeTab !== 'vehicles') return;
    setVvLoad(true);
    visitsApi.getVehicleVisits({ gateId: id, limit: 50 })
      .then((r) => { const d = r?.data?.data || r?.data; setVehicleVisits(Array.isArray(d) ? d : (d?.visits ?? [])); })
      .catch(() => setVehicleVisits([]))
      .finally(() => setVvLoad(false));
  }, [activeTab, id]);

  const handleUpdateOccupancy = async () => {
    setUpdating(true);
    try {
      await gatesApi.updateOccupancy(id, Number(newCount));
      setOccupancy(Number(newCount));
      toast.success('Occupancy updated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const onEditSubmit = async (data) => {
    try {
      await gatesApi.update(id, data);
      toast.success('Gate updated');
      setShowEdit(false);
      fetchGate();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await gatesApi.remove(id);
      toast.success('Gate deleted');
      navigate('/gates', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed');
      setDeleting(false);
    }
  };

  if (loading) return (
    <div className="p-6 space-y-5">
      <div className="skeleton h-32 rounded-2xl" />
      <div className="grid grid-cols-3 gap-4">{Array.from({length:3}).map((_,i)=><div key={i} className="skeleton h-20 rounded-xl"/>)}</div>
    </div>
  );

  if (notFound) return (
    <div className="p-6"><EmptyState icon={DoorOpen} title="Gate not found"
      action={<button onClick={() => navigate('/gates')} className="btn-primary text-sm">← Back to Gates</button>} /></div>
  );

  const name     = gate.Name     || gate.name     || '—';
  const location = gate.Location || gate.location || '—';
  const status   = gate.Status   || gate.status   || 'Inactive';
  const isActive = status === 'Active';
  const pct      = Math.min(occupancy / MAX_CAP, 1);
  const { bar: barColor, text: textColor } = occupancyColor(occupancy);
  const activePersons  = personVisits.filter((v) => v.IsActive || v.isactive).length;
  const activeVehicles = vehicleVisits.filter((v) => v.IsActive || v.isactive).length;

  const tabs = [
    { value: 'persons',  label: 'Person Visits',  icon: Users },
    { value: 'vehicles', label: 'Vehicle Visits',  icon: Car },
  ];

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" className="p-6 space-y-5 pb-20 md:pb-6">
      <PageHeader title={name} breadcrumb={[{ label: 'Gates', path: '/gates' }, { label: name }]}
        actions={
          <div className="flex items-center gap-2">
            {isAdmin && <button onClick={() => setShowEdit(true)}   className="btn-ghost text-sm"><Pencil size={14} /> Edit</button>}
            {isSA    && <button onClick={() => setShowDelete(true)} className="btn-ghost text-sm text-red-400 hover:bg-red-400/10 border-red-400/20"><X size={14} /> Delete</button>}
          </div>
        }
      />

      {/* Hero */}
      <motion.div variants={fadeInUp} initial="initial" animate="animate" className="glass-card p-6 space-y-4">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center flex-shrink-0">
            <DoorOpen size={32} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {isActive && <span className="status-dot active" />}
              <h1 className="text-2xl font-bold gradient-text">{name}</h1>
              <span className={cn('badge', isActive ? 'badge-success' : 'text-white/30 bg-white/5 border border-white/10')}>{status}</span>
            </div>
            <p className="text-sm text-white/40">{location}</p>
          </div>
        </div>

        {/* Occupancy progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">Current Occupancy</span>
            <span className={cn('font-bold tabular-nums', textColor)}>{occupancy} / {MAX_CAP} ({Math.round(pct * 100)}%)</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/[0.07] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct * 100}%` }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={cn('h-full rounded-full', barColor)}
            />
          </div>
        </div>

        {/* Update occupancy (admin) */}
        {isAdmin && (
          <div className="flex gap-2 items-center">
            <input type="number" min="0" max={MAX_CAP} value={newCount}
              onChange={(e) => setNewCount(e.target.value)} className="input-field w-28" />
            <button onClick={handleUpdateOccupancy} disabled={updating} className="btn-primary text-sm px-3">
              {updating ? <Loader2 size={14} className="animate-spin" /> : 'Update'}
            </button>
          </div>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Active Persons"  value={activePersons}  icon={Users}    color="indigo" />
        <StatCard title="Active Vehicles" value={activeVehicles} icon={Car}      color="amber" />
        <StatCard title="Total Persons"   value={personVisits.length} icon={Activity} color="emerald" />
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex gap-1 bg-white/[0.04] rounded-xl p-1 w-fit border border-white/[0.07]">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <Tabs.Trigger key={t.value} value={t.value}
                className={cn('relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all', activeTab === t.value ? 'text-white' : 'text-white/40 hover:text-white/70')}>
                {activeTab === t.value && <motion.div layoutId="gd-tab" className="absolute inset-0 bg-indigo-500/20 rounded-lg border border-indigo-500/30" />}
                <Icon size={14} className="relative z-10" /><span className="relative z-10">{t.label}</span>
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        <Tabs.Content value="persons" className="mt-4 focus:outline-none">
          <DataTable data={personVisits} columns={buildPersonCols(id)} loading={pvLoad} emptyMessage="No person visits for this gate." />
        </Tabs.Content>
        <Tabs.Content value="vehicles" className="mt-4 focus:outline-none">
          <DataTable data={vehicleVisits} columns={vehicleCols} loading={vvLoad} emptyMessage="No vehicle visits for this gate." />
        </Tabs.Content>
      </Tabs.Root>

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowEdit(false)}>
          <motion.div variants={scaleIn} initial="initial" animate="animate"
            className="w-full max-w-md bg-[hsl(228_40%_7%)] border border-white/10 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Edit Gate</h2>
              <button onClick={() => setShowEdit(false)} className="icon-rail-btn"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
              {[['Gate Name', 'name', 'Main Gate'], ['Location', 'location', 'North Entrance']].map(([label, name, ph]) => (
                <div key={name} className="space-y-1">
                  <label className="text-xs font-medium text-white/50">{label}</label>
                  <input {...register(name)} placeholder={ph} className="input-field" />
                  {errors[name] && <p className="text-xs text-red-400">{errors[name].message}</p>}
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-xs font-medium text-white/50">Status</label>
                <select {...register('status')} className="input-field">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEdit(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <ConfirmDialog open={showDelete} onOpenChange={setShowDelete} title="Delete Gate"
        description={`Delete "${name}"? All visit records through this gate will lose their gate association.`}
        onConfirm={handleDelete} loading={deleting} variant="danger" />
    </motion.div>
  );
}

