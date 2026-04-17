// src/pages/VehiclesPage.jsx
// Full production Vehicles list page - grid/table views, owner combobox, CRUD modals

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import * as Dialog  from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import {
  Car, Truck, Plus, LayoutGrid, List, X,
  Pencil, Trash2, ChevronRight, Loader2, ChevronDown,
} from 'lucide-react';

import { useAuth }       from '@/context/AuthContext';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce }   from '@/hooks/useDebounce';
import * as vehiclesApi  from '@/api/vehicles.api';
import * as membersApi   from '@/api/members.api';
import PageHeader        from '@/components/shared/PageHeader';
import DataTable         from '@/components/shared/DataTable';
import EmptyState        from '@/components/shared/EmptyState';
import ConfirmDialog     from '@/components/shared/ConfirmDialog';
import { cn, getInitials, formatDate } from '@/lib/utils';
import {
  pageVariants, staggerContainer, staggerItem, scaleIn, backdropVariants,
} from '@/lib/motion';

// Zod schema
const vehicleSchema = z.object({
  registrationNumber: z.string().min(4, 'Registration number required').max(20).toUpperCase(),
  typeId: z.coerce.number().int().positive('Vehicle type required'),
  ownerId: z.coerce.number().int().positive('Owner required'),
});

// Vehicle type icon
const TYPE_ICONS = { Car, Truck };
const TYPE_COLORS = {
  Car:      'from-indigo-500 to-indigo-700',
  Bike:     'from-amber-500 to-orange-600',
  Truck:    'from-red-500 to-rose-700',
  Electric: 'from-emerald-500 to-teal-700',
  Bus:      'from-purple-500 to-violet-700',
};

function VehicleTypeIcon({ typeName, size = 20 }) {
  const Icon = TYPE_ICONS[typeName] || Car;
  return <Icon size={size} />;
}

// Vehicle card
function VehicleCard({ vehicle, onEdit, onDelete, canEdit, canDelete }) {
  const navigate  = useNavigate();
  const typeName  = vehicle.TypeName    || vehicle.typename    || 'Car';
  const reg       = vehicle.RegistrationNumber || vehicle.registrationnumber || '-';
  const owner     = vehicle.OwnerName   || vehicle.ownername   || '-';
  const ownerId   = vehicle.OwnerID     || vehicle.ownerid;
  const vehicleId = vehicle.VehicleID   || vehicle.vehicleid;
  const gradient  = TYPE_COLORS[typeName] || 'from-indigo-500 to-indigo-700';

  return (
    <motion.div variants={staggerItem} className="glass-card p-5 flex flex-col gap-3 relative group">
      {(canEdit || canDelete) && (
        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {canEdit   && <button onClick={(e) => { e.stopPropagation(); onEdit(vehicle); }} className="p-1.5 rounded-lg bg-white/5 hover:bg-indigo-500/20 text-white/40 hover:text-indigo-400 transition-colors"><Pencil size={13} /></button>}
          {canDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(vehicle); }} className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>}
        </div>
      )}

      {/* Type icon + badge */}
      <div className="flex items-center gap-3">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-white bg-gradient-to-br', gradient)}>
          <VehicleTypeIcon typeName={typeName} />
        </div>
        <span className="badge badge-primary text-[10px]">{typeName}</span>
      </div>

      {/* Plate number */}
      <div>
        <span className="plate text-sm">{reg}</span>
      </div>

      {/* Owner */}
      <button
        onClick={() => ownerId && navigate(`/members/${ownerId}`)}
        className="flex items-center gap-2 text-xs text-white/40 hover:text-indigo-300 transition-colors w-fit"
      >
        <div className="w-5 h-5 rounded-md bg-indigo-500/30 flex items-center justify-center text-[9px] font-bold text-white">
          {getInitials(owner)}
        </div>
        {owner}
      </button>

      <button
        onClick={() => navigate(`/vehicles/${vehicleId}`)}
        className="mt-auto flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        View Details <ChevronRight size={13} />
      </button>
    </motion.div>
  );
}

// Card skeleton
function CardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center gap-3"><div className="skeleton w-12 h-12 rounded-xl" /><div className="skeleton h-4 w-14 rounded-full" /></div>
      <div className="skeleton h-5 w-28 rounded" />
      <div className="skeleton h-3 w-36 rounded" />
      <div className="skeleton h-3 w-20 rounded" />
    </div>
  );
}

// Owner combobox
function OwnerCombobox({ value, onChange }) {
  const [open,          setOpen]          = useState(false);
  const [comboSearch,   setComboSearch]   = useState('');
  const [ownerOptions,  setOwnerOptions]  = useState([]);
  const [selectedLabel, setSelectedLabel] = useState('');
  const debouncedCombo = useDebounce(comboSearch, 300);

  useEffect(() => {
    membersApi.getAll({ search: debouncedCombo || undefined, limit: 10 })
      .then((r) => {
        const membersList = r?.data?.members ?? r?.data ?? [];
        setOwnerOptions(Array.isArray(membersList) ? membersList : []);
      })
      .catch(() => {});
  }, [debouncedCombo]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className="input-field flex items-center justify-between text-left">
          <span className={selectedLabel ? 'text-white/90' : 'text-white/30'}>
            {selectedLabel || 'Select owner...'}
          </span>
          <ChevronDown size={14} className="text-white/30" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-[200] w-[300px] bg-[hsl(228_40%_8%)] border border-white/10
                     rounded-xl shadow-2xl overflow-hidden"
          align="start" sideOffset={4}
        >
          <div className="p-2 border-b border-white/[0.06]">
            <input
              className="input-field text-sm"
              placeholder="Search members..."
              value={comboSearch}
              onChange={(e) => setComboSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {ownerOptions.length === 0 ? (
              <p className="text-center text-white/30 text-xs py-4">No members found</p>
            ) : ownerOptions.map((m) => {
              const memberId = m.MemberID || m.memberid;
              const name     = m.Name || m.name || '-';
              return (
                <button
                  key={memberId}
                  type="button"
                  onClick={() => { onChange(memberId); setSelectedLabel(name); setOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left',
                    'hover:bg-indigo-500/10 transition-colors',
                    value === memberId ? 'text-indigo-300' : 'text-white/70'
                  )}
                >
                  <div className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center text-[9px] font-bold text-white">
                    {getInitials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{name}</p>
                    <p className="text-[10px] text-white/30 truncate">{m.Email || m.email}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// Add/Edit modal
function VehicleModal({ open, onOpenChange, editVehicle, vehicleTypes, onSuccess }) {
  const isEdit = Boolean(editVehicle);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(vehicleSchema),
    defaultValues: { registrationNumber: '', typeId: '', ownerId: '' },
  });
  const ownerId = watch('ownerId');

  useEffect(() => {
    if (editVehicle) {
      reset({
        registrationNumber: editVehicle.RegistrationNumber || editVehicle.registrationnumber || '',
        typeId: editVehicle.TypeID || editVehicle.typeid || '',
        ownerId: editVehicle.OwnerID || editVehicle.ownerid || '',
      });
    } else {
      reset({ registrationNumber: '', typeId: '', ownerId: '' });
    }
  }, [editVehicle, reset, open]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        registrationNumber: data.registrationNumber.toUpperCase(),
        typeId: Number(data.typeId), ownerId: Number(data.ownerId),
      };
      if (isEdit) {
        await vehiclesApi.update(editVehicle.VehicleID || editVehicle.vehicleid, payload);
        toast.success('Vehicle updated');
      } else {
        await vehiclesApi.create(payload);
        toast.success('Vehicle added');
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
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
                    <Dialog.Title className="text-lg font-bold text-white">{isEdit ? 'Edit Vehicle' : 'Add Vehicle'}</Dialog.Title>
                    <Dialog.Close className="icon-rail-btn"><X size={16} /></Dialog.Close>
                  </div>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-white/50">Registration Number *</label>
                      <input
                        {...register('registrationNumber')}
                        placeholder="GJ01AB1234"
                        className="input-field font-mono uppercase"
                        onChange={(e) => setValue('registrationNumber', e.target.value.toUpperCase(), { shouldValidate: true })}
                      />
                      {errors.registrationNumber && <p className="text-xs text-red-400">{errors.registrationNumber.message}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-white/50">Vehicle Type *</label>
                        <select {...register('typeId')} className="input-field">
                          <option value="">Select type...</option>
                          {vehicleTypes.map((t) => (
                            <option key={t.TypeID || t.typeid} value={t.TypeID || t.typeid}>{t.TypeName || t.typename}</option>
                          ))}
                        </select>
                        {errors.typeId && <p className="text-xs text-red-400">{errors.typeId.message}</p>}
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs font-medium text-white/50">Owner (Member) *</label>
                        <OwnerCombobox value={ownerId} onChange={(v) => setValue('ownerId', v, { shouldValidate: true })} />
                        {errors.ownerId && <p className="text-xs text-red-400">{errors.ownerId.message}</p>}
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <Dialog.Close className="btn-ghost">Cancel</Dialog.Close>
                      <button type="submit" disabled={isSubmitting} className="btn-primary">
                        {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : (isEdit ? 'Save Changes' : 'Add Vehicle')}
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
  );
}

// Table columns
function buildColumns(navigate, onEdit, onDelete, canEdit, canDelete) {
  return [
    { header: '#', accessorKey: 'VehicleID', size: 50, cell: (c) => <span className="text-white/30 tabular-nums">{c.getValue() || c.row.original.vehicleid}</span> },
    { header: 'Plate', id: 'plate', cell: ({ row: { original: v } }) => <span className="plate text-xs">{v.RegistrationNumber || v.registrationnumber}</span> },
    { header: 'Type',  accessorKey: 'TypeName', cell: (c) => <span className="badge badge-primary text-[10px]">{c.getValue() || c.row.original.typename}</span> },
    { header: 'Owner', id: 'owner', cell: ({ row: { original: v } }) => {
        const name = v.OwnerName || v.ownername || '-';
        const id   = v.OwnerID  || v.ownerid;
        return <button onClick={() => id && navigate(`/members/${id}`)} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">{name}</button>;
      }
    },
    { header: 'Actions', id: 'actions', enableSorting: false, cell: ({ row: { original: v } }) => (
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(`/vehicles/${v.VehicleID || v.vehicleid}`)} className="btn-ghost text-xs px-2 py-1">View</button>
          {canEdit   && <button onClick={() => onEdit(v)}   className="p-1.5 rounded-lg hover:bg-indigo-500/15 text-white/30 hover:text-indigo-400 transition-colors"><Pencil size={13} /></button>}
          {canDelete && <button onClick={() => onDelete(v)} className="p-1.5 rounded-lg hover:bg-red-500/15   text-white/30 hover:text-red-400    transition-colors"><Trash2  size={13} /></button>}
        </div>
      )
    },
  ];
}

// Main page
export default function VehiclesPage() {
  const navigate    = useNavigate();
  const { hasRole } = useAuth();
  const canEdit     = hasRole('Guard', 'Admin', 'SuperAdmin');
  const canDelete   = hasRole('Guard', 'Admin', 'SuperAdmin');

  const [vehicles,     setVehicles]     = useState([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [view,         setView]         = useState('grid');
  const [search,       setSearch]       = useState('');
  const [typeId,       setTypeId]       = useState('');
  const [showAdd,      setShowAdd]      = useState(false);
  const [editVehicle,  setEditVehicle]  = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const { page, limit, setPage } = usePagination(1, 12);
  const debouncedSearch           = useDebounce(search, 300);

  useEffect(() => {
    vehiclesApi.getVehicleTypes()
      .then((r) => setVehicleTypes(r?.data?.data || r?.data?.types || []))
      .catch(() => {});
  }, []);

  const fetchVehicles = useCallback(() => {
    setLoading(true);
    vehiclesApi.getAll({ page, limit, search: debouncedSearch || undefined, typeId: typeId || undefined })
      .then((r) => {
        // Robust mapping
        const vehiclesList = r?.data?.vehicles ?? r?.vehicles ?? (Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []));
        const totalCount  = r?.pagination?.total ?? r?.total ?? (Array.isArray(vehiclesList) ? vehiclesList.length : 0);
        
        setVehicles(Array.isArray(vehiclesList) ? vehiclesList : []);
        setTotal(totalCount);
      })
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, [page, limit, debouncedSearch, typeId]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await vehiclesApi.remove(deleteTarget.VehicleID || deleteTarget.vehicleid);
      toast.success('Vehicle deleted');
      setDeleteTarget(null);
      fetchVehicles();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const columns     = useMemo(
    () => buildColumns(navigate, (v) => { setEditVehicle(v); setShowAdd(true); }, setDeleteTarget, canEdit, canDelete),
    [navigate, canEdit, canDelete]
  );
  const pagination  = { page, limit, total, hasNextPage: page * limit < total };

  return (
    <div className="p-6 space-y-5 pb-20 md:pb-6">
      <PageHeader
        title="Vehicles"
        subtitle={`${total} registered vehicle${total !== 1 ? 's' : ''}`}
        breadcrumb={[{ label: 'Vehicles' }]}
        actions={
          <button onClick={() => { setEditVehicle(null); setShowAdd(true); }} className="btn-primary text-sm">
            <Plus size={16} /> Add Vehicle
          </button>
        }
      />

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <input className="input-field max-w-xs" placeholder="Search plate..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input-field w-auto" value={typeId} onChange={(e) => { setTypeId(e.target.value); setPage(1); }}>
          <option value="">All Types</option>
          {vehicleTypes.map((t) => <option key={t.TypeID || t.typeid} value={t.TypeID || t.typeid}>{t.TypeName || t.typename}</option>)}
        </select>
        {(search || typeId) && <button onClick={() => { setSearch(''); setTypeId(''); setPage(1); }} className="btn-ghost text-xs px-3 py-2">Clear</button>}

        <div className="ml-auto flex items-center gap-1 bg-white/[0.04] rounded-xl p-1 border border-white/[0.07]">
          <button onClick={() => setView('grid')}  className={cn('p-1.5 rounded-lg transition-all', view === 'grid'  ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/30 hover:text-white/60')}><LayoutGrid size={16} /></button>
          <button onClick={() => setView('table')} className={cn('p-1.5 rounded-lg transition-all', view === 'table' ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/30 hover:text-white/60')}><List size={16} /></button>
        </div>
      </div>

      {/* Content */}
      <div className="relative min-h-[400px]">
        {view === 'grid' ? (
          <div key="grid">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : vehicles.length === 0 ? (
              <EmptyState icon={Car} title="No vehicles found" description="Try changing your filters or add a new vehicle."
                action={<button onClick={() => { setSearch(''); setTypeId(''); }} className="btn-ghost text-sm">Clear filters</button>} />
            ) : (
              <motion.div variants={staggerContainer} initial="initial" animate="animate"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {vehicles.map((v) => (
                  <VehicleCard key={v.VehicleID || v.vehicleid} vehicle={v}
                    canEdit={canEdit} canDelete={canDelete}
                    onEdit={(veh) => { setEditVehicle(veh); setShowAdd(true); }}
                    onDelete={setDeleteTarget} />
                ))}
              </motion.div>
            )}
          </div>
        ) : (
          <div key="table">
            <DataTable data={vehicles} columns={columns} loading={loading} pagination={pagination}
              onPageChange={setPage} emptyMessage="No vehicles found."
              onRowClick={(v) => navigate(`/vehicles/${v.VehicleID || v.vehicleid}`)} />
          </div>
        )}
      </div>

      {/* Grid pagination */}
      {view === 'grid' && !loading && vehicles.length > 0 && (
        <div className="flex items-center justify-between text-xs text-white/40 pt-2">
          <span>{total} total</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-30">← Prev</button>
            <span className="text-white/60 font-medium">{page} / {Math.ceil(total / limit) || 1}</span>
            <button onClick={() => setPage(page + 1)} disabled={page * limit >= total} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-30">Next →</button>
          </div>
        </div>
      )}

      <VehicleModal
        open={showAdd}
        onOpenChange={(v) => { setShowAdd(v); if (!v) setEditVehicle(null); }}
        editVehicle={editVehicle}
        vehicleTypes={vehicleTypes}
        onSuccess={fetchVehicles}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete Vehicle"
        description={`Delete "${deleteTarget?.RegistrationNumber || deleteTarget?.registrationnumber}"? This will also remove all vehicle visit records.`}
        onConfirm={handleDelete}
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}

