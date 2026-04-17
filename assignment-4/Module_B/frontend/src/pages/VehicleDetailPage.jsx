// src/pages/VehicleDetailPage.jsx
// Vehicle detail page with hero banner, overview stats, visit history, and edit/delete actions.

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Tabs   from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import { toast } from 'sonner';
import {
  Car, Truck, Pencil, X, Loader2, Clock,
  Activity, CheckCircle2, ChevronDown,
} from 'lucide-react';
import * as vehiclesApi from '@/api/vehicles.api';
import * as visitsApi   from '@/api/visits.api';
import * as membersApi  from '@/api/members.api';
import { useAuth }      from '@/context/AuthContext';
import PageHeader       from '@/components/shared/PageHeader';
import DataTable        from '@/components/shared/DataTable';
import StatCard         from '@/components/shared/StatCard';
import EmptyState       from '@/components/shared/EmptyState';
import ConfirmDialog    from '@/components/shared/ConfirmDialog';
import { cn, getInitials, formatDate, formatDuration, formatRelativeTime } from '@/lib/utils';
import { pageVariants, fadeInUp, scaleIn, backdropVariants } from '@/lib/motion';
import { useDebounce as useDebounceHook } from '@/hooks/useDebounce';

function VehicleIcon({ typeName, size = 40 }) {
  const Icon = /truck|bus|heavy/i.test(typeName || '') ? Truck : Car;
  return <Icon size={size} className="text-white" />;
}

function OwnerCombobox({ value, label, onChange }) {
  const [open,    setOpen]    = useState(false);
  const [search,  setSearch]  = useState('');
  const [options, setOptions] = useState([]);
  const debounced = useDebounceHook(search, 300);
  useEffect(() => {
    membersApi.getAll({ search: debounced || undefined, limit: 10 })
      .then((r) => { const d = r?.data?.data || r?.data; setOptions(Array.isArray(d) ? d : (d?.members ?? [])); })
      .catch(() => {});
  }, [debounced]);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className="input-field flex items-center justify-between text-left">
          <span className={label ? 'text-white/90' : 'text-white/30'}>{label || 'Select owner...'}</span>
          <ChevronDown size={14} className="text-white/30" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="z-[200] w-[280px] bg-[hsl(228_40%_8%)] border border-white/10 rounded-xl shadow-2xl overflow-hidden" align="start" sideOffset={4}>
          <div className="p-2 border-b border-white/[0.06]">
            <input className="input-field text-sm" placeholder="Search members..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {options.length === 0 ? <p className="text-center text-white/30 text-xs py-4">No members</p>
              : options.map((m) => {
                const id = m.MemberID || m.memberid; const n = m.Name || m.name;
                return (
                  <button key={id} type="button"
                    onClick={() => { onChange(id, n); setOpen(false); }}
                    className={cn('w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-indigo-500/10 transition-colors text-left', value === id ? 'text-indigo-300' : 'text-white/70')}>
                    <div className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center text-[9px] font-bold text-white">{getInitials(n)}</div>
                    <span className="truncate">{n}</span>
                  </button>
                );
              })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// Zod schema
const editSchema = z.object({
  registrationNumber: z.string().min(4).max(20),
  typeId: z.coerce.number().int().positive(),
  ownerId: z.coerce.number().int().positive(),
});

// Visit table columns
const visitCols = [
  { header: 'Entry Gate', id: 'eg',  cell: ({ row: { original: v } }) => <span className="text-white/60 text-xs">{v.EntryGateName || v.entrygatename || '-'}</span> },
  { header: 'Exit Gate',  id: 'xg',  cell: ({ row: { original: v } }) => <span className="text-white/50 text-xs">{v.ExitGateName  || v.exitgatename  || '-'}</span> },
  { header: 'Entry Time', id: 'et',  cell: ({ row: { original: v } }) => <span className="text-white/60 text-xs">{formatDate(v.EntryTime || v.entrytime)}</span> },
  { header: 'Exit Time',  id: 'xt',  cell: ({ row: { original: v } }) => <span className="text-white/50 text-xs">{(v.ExitTime || v.exittime) ? formatDate(v.ExitTime || v.exittime) : '-'}</span> },
  { header: 'Duration',   id: 'dur', cell: ({ row: { original: v } }) => <span className="text-white/50 text-xs">{formatDuration(v.EntryTime || v.entrytime, v.ExitTime || v.exittime)}</span> },
  { header: 'Status',     id: 'st',  cell: ({ row: { original: v } }) => (v.IsActive || v.isactive) ? <span className="badge badge-success text-[10px]">Active</span> : <span className="badge badge-muted text-[10px]">Done</span> },
];

// Main component
export default function VehicleDetailPage() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { hasRole } = useAuth();
  const canEdit     = hasRole('Guard', 'Admin', 'SuperAdmin');
  const canDelete   = hasRole('Guard', 'Admin', 'SuperAdmin');

  const [vehicle,      setVehicle]      = useState(null);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [notFound,     setNotFound]     = useState(false);
  const [activeTab,    setActiveTab]    = useState('overview');
  const [visits,       setVisits]       = useState([]);
  const [visitsLoad,   setVisitsLoad]   = useState(false);
  const [showEdit,     setShowEdit]     = useState(false);
  const [showDelete,   setShowDelete]   = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [ownerLabel,   setOwnerLabel]   = useState('');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(editSchema) });
  const ownerId = watch('ownerId');

  const fetchVehicle = useCallback(async () => {
    setLoading(true);
    try {
      const [vr, tr] = await Promise.all([vehiclesApi.getById(id), vehiclesApi.getVehicleTypes()]);
      const v = vr?.data?.data || vr?.data?.vehicle || vr?.data;
      if (!v) { setNotFound(true); return; }
      setVehicle(v);
      setVehicleTypes(tr?.data?.data || tr?.data?.types || []);
      setOwnerLabel(v.OwnerName || v.ownername || '');
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchVehicleVisits = useCallback(async (vehicleObj) => {
    const targetVehicleId = vehicleObj?.VehicleID || vehicleObj?.vehicleid;
    if (!targetVehicleId) return;
    setVisitsLoad(true);
    try {
      const r = await visitsApi.getVehicleVisits({ vehicleId: targetVehicleId, limit: 50 });
      const d = r?.data?.data || r?.data;
      setVisits(Array.isArray(d) ? d : (d?.visits ?? []));
    } catch {
      setVisits([]);
    } finally {
      setVisitsLoad(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicle();
  }, [fetchVehicle]);

  useEffect(() => {
    if (!vehicle) return;
    fetchVehicleVisits(vehicle);
  }, [vehicle, fetchVehicleVisits]);

  useEffect(() => {
    if (activeTab === 'visits' && vehicle) {
      fetchVehicleVisits(vehicle);
    }
  }, [activeTab, fetchVehicleVisits, vehicle]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchVehicle();
    }
  }, [activeTab, fetchVehicle]);

  useEffect(() => {
    if (vehicle && showEdit) {
      reset({
        registrationNumber: vehicle.RegistrationNumber || vehicle.registrationnumber || '',
        typeId: vehicle.TypeID || vehicle.typeid || '',
        ownerId: vehicle.OwnerID || vehicle.ownerid || '',
      });
    }
  }, [vehicle, showEdit, reset]);

  const onEditSubmit = async (data) => {
    try {
      await vehiclesApi.update(id, {
        registrationNumber: data.registrationNumber.toUpperCase(),
        typeId: Number(data.typeId), ownerId: Number(data.ownerId),
      });
      toast.success('Vehicle updated');
      setShowEdit(false);
      await fetchVehicle();
      const refreshed = await vehiclesApi.getById(id);
      const refreshedVehicle = refreshed?.data?.data || refreshed?.data?.vehicle || refreshed?.data;
      if (refreshedVehicle) {
        setVehicle(refreshedVehicle);
        await fetchVehicleVisits(refreshedVehicle);
      }
    } catch (err) { toast.error(err?.response?.data?.message || 'Update failed'); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await vehiclesApi.remove(id);
      toast.success('Vehicle deleted');
      navigate('/vehicles', { replace: true });
    } catch (err) { toast.error(err?.response?.data?.message || 'Delete failed'); setDeleting(false); }
  };

  if (loading) return (
    <div className="p-6 space-y-5">
      <div className="glass-card p-6 flex gap-5"><div className="skeleton w-20 h-20 rounded-2xl" /><div className="flex-1 space-y-3 pt-1"><div className="skeleton h-7 w-48 rounded" /><div className="skeleton h-4 w-32 rounded" /></div></div>
      <div className="skeleton h-9 w-64 rounded-xl" />
      <div className="grid grid-cols-3 gap-4">{Array.from({length:3}).map((_,i)=><div key={i} className="skeleton h-20 rounded-xl"/>)}</div>
    </div>
  );

  if (notFound) return (
    <div className="p-6"><EmptyState icon={Car} title="Vehicle not found" description="This vehicle may have been deleted."
      action={<button onClick={() => navigate('/vehicles')} className="btn-primary text-sm">← Back to Vehicles</button>} /></div>
  );

  const reg      = vehicle.RegistrationNumber || vehicle.registrationnumber || '-';
  const typeName = vehicle.TypeName || vehicle.typename || 'Car';
  const ownerName = vehicle.OwnerName || vehicle.ownername || '-';
  const ownMid   = vehicle.OwnerID   || vehicle.ownerid;
  const totalVisits = vehicle.totalVisits || 0;
  const activeCount = vehicle.activeVisits ?? (visits.filter(v => v.IsActive || v.isactive).length);
  const lastVisit   = visits[0] || (vehicle.recentVisits && vehicle.recentVisits[0]);

  return (
    <div className="p-6 space-y-5 pb-20 md:pb-6">
      <PageHeader title={reg} breadcrumb={[{ label: 'Vehicles', path: '/vehicles' }, { label: reg }]}
        actions={
          <div className="flex items-center gap-2">
            {canEdit   && <button onClick={() => setShowEdit(true)}   className="btn-ghost text-sm"><Pencil size={14} /> Edit</button>}
            {canDelete && <button onClick={() => setShowDelete(true)} className="btn-ghost text-sm text-red-400 hover:bg-red-400/10 border-red-400/20"><X size={14} /> Delete</button>}
          </div>
        }
      />

      {/* Hero */}
      <motion.div variants={fadeInUp} initial="initial" animate="animate" className="glass-card p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-700 flex items-center justify-center flex-shrink-0 shadow-lg">
            <VehicleIcon typeName={typeName} size={40} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <span className="plate text-2xl">{reg}</span>
              <span className="badge badge-primary">{typeName}</span>
            </div>
            {ownMid && (
              <Link to={`/members/${ownMid}`}
                className="inline-flex items-center gap-2 mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                <div className="w-5 h-5 rounded-md bg-indigo-500/20 flex items-center justify-center text-[9px] font-bold text-white">{getInitials(ownerName)}</div>
                {ownerName}
              </Link>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex gap-1 bg-white/[0.04] rounded-xl p-1 w-fit border border-white/[0.07]">
          {[{ value: 'overview', label: 'Overview', icon: Activity }, { value: 'visits', label: 'Visit History', icon: Clock }].map((t) => {
            const Icon = t.icon;
            return (
              <Tabs.Trigger key={t.value} value={t.value}
                className={cn('relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all', activeTab === t.value ? 'text-white' : 'text-white/40 hover:text-white/70')}>
                {activeTab === t.value && <motion.div layoutId="vd-tab" className="absolute inset-0 bg-indigo-500/20 rounded-lg border border-indigo-500/30" />}
                <Icon size={14} className="relative z-10" /><span className="relative z-10">{t.label}</span>
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        <Tabs.Content value="overview" className="mt-4 focus:outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard title="Total Visits" value={totalVisits} icon={Clock} color="indigo" />
            <StatCard title="Active Now"   value={activeCount} icon={Activity} color="emerald"
              trendLabel={activeCount > 0 ? 'Currently on campus' : 'Not on campus'} />
            <StatCard title="Last Seen" value={lastVisit ? 1 : 0} icon={Car} color="amber"
              trendLabel={lastVisit ? formatRelativeTime(lastVisit.EntryTime || lastVisit.entrytime) : 'Never'} />
          </div>
        </Tabs.Content>

        <Tabs.Content value="visits" className="mt-4 focus:outline-none">
          <DataTable data={visits} columns={visitCols} loading={visitsLoad} emptyMessage="No visits recorded for this vehicle." />
        </Tabs.Content>
      </Tabs.Root>

      {/* Edit modal */}
      <Dialog.Root open={showEdit} onOpenChange={setShowEdit}>
        <AnimatePresence>
          {showEdit && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <motion.div variants={backdropVariants} initial="initial" animate="animate" exit="exit"
                  className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
                  <motion.div variants={scaleIn} initial="initial" animate="animate" exit="exit"
                    className="w-full max-w-lg bg-[hsl(228_40%_7%)] border border-white/10 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-5">
                      <Dialog.Title className="text-lg font-bold text-white">Edit Vehicle</Dialog.Title>
                      <Dialog.Close className="icon-rail-btn"><X size={16} /></Dialog.Close>
                    </div>
                    <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-white/50">Registration Number *</label>
                        <input {...register('registrationNumber')} className="input-field font-mono uppercase"
                          onChange={(e) => setValue('registrationNumber', e.target.value.toUpperCase(), { shouldValidate: true })} />
                        {errors.registrationNumber && <p className="text-xs text-red-400">{errors.registrationNumber.message}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-white/50">Type *</label>
                          <select {...register('typeId')} className="input-field">
                            {vehicleTypes.map((t) => <option key={t.TypeID || t.typeid} value={t.TypeID || t.typeid}>{t.TypeName || t.typename}</option>)}
                          </select>
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs font-medium text-white/50">Owner *</label>
                          <OwnerCombobox value={ownerId} label={ownerLabel} onChange={(v, l) => { setValue('ownerId', v, { shouldValidate: true }); setOwnerLabel(l); }} />
                          {errors.ownerId && <p className="text-xs text-red-400">{errors.ownerId.message}</p>}
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-2">
                        <Dialog.Close className="btn-ghost">Cancel</Dialog.Close>
                        <button type="submit" disabled={isSubmitting} className="btn-primary">
                          {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : 'Save Changes'}
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

      <ConfirmDialog open={showDelete} onOpenChange={setShowDelete} title="Delete Vehicle"
        description={`Delete "${reg}"? All visit history will be removed.`}
        onConfirm={handleDelete} loading={deleting} variant="danger" />
    </div>
  );
}

