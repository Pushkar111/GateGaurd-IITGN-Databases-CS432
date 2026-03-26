// src/pages/MemberDetailPage.jsx
// Full member detail page — hero banner + Radix tabs (Overview, Visits, Vehicles, Activity)

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Tabs   from '@radix-ui/react-tabs';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import {
  ArrowLeft, Mail, Phone, Building2, Calendar,
  Pencil, Activity, Car, ClipboardList, X, Loader2,
  Users, CheckCircle2, Clock, Hash,
} from 'lucide-react';
import * as membersApi from '@/api/members.api';
import * as visitsApi  from '@/api/visits.api';
import PageHeader    from '@/components/shared/PageHeader';
import DataTable     from '@/components/shared/DataTable';
import EmptyState    from '@/components/shared/EmptyState';
import StatCard      from '@/components/shared/StatCard';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { cn, getInitials, formatDate, formatDuration, formatRelativeTime } from '@/lib/utils';
import { pageVariants, fadeInUp, scaleIn, backdropVariants } from '@/lib/motion';

const AVATAR_GRADIENTS = [
  'from-indigo-500 to-purple-600', 'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',  'from-rose-500 to-pink-600',
  'from-sky-500 to-blue-600',      'from-violet-500 to-fuchsia-600',
];
function avatarGradient(name = '') {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

// ── Edit schema ───────────────────────────────────────────────────────
const editSchema = z.object({
  name:          z.string().min(2).max(100),
  email:         z.string().email(),
  contactNumber: z.string().min(7),
  typeId:        z.coerce.number().int().positive(),
  age:           z.coerce.number().int().min(1).max(120).optional().or(z.literal('')),
  department:    z.string().max(100).optional().or(z.literal('')),
});

// ── Visit history columns ─────────────────────────────────────────────
const visitColumns = [
  { header: 'Entry Time',  id: 'entry',    cell: ({ row: { original: v } }) => <span className="text-white/70 text-xs">{formatDate(v.EntryTime || v.entrytime)}</span> },
  { header: 'Exit Time',   id: 'exit',     cell: ({ row: { original: v } }) => <span className="text-white/50 text-xs">{(v.ExitTime || v.exittime) ? formatDate(v.ExitTime || v.exittime) : <span className="badge badge-success text-[10px]">Active</span>}</span> },
  { header: 'Duration',    id: 'duration', cell: ({ row: { original: v } }) => <span className="text-white/50 text-xs">{formatDuration(v.EntryTime || v.entrytime, v.ExitTime || v.exittime)}</span> },
  { header: 'Entry Gate',  id: 'gate',     cell: ({ row: { original: v } }) => <span className="text-white/70 text-xs">{v.EntryGateName || v.entrygatename || '—'}</span> },
  { header: 'Status',      id: 'status',   cell: ({ row: { original: v } }) => (v.IsActive || v.isactive) ? <span className="badge badge-success text-[10px]">Active</span> : <span className="badge badge-muted text-[10px]">Completed</span> },
];

// ── Hero skeleton ─────────────────────────────────────────────────────
function HeroSkeleton() {
  return (
    <div className="glass-card p-6 flex items-start gap-5">
      <div className="skeleton w-20 h-20 rounded-2xl flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="skeleton h-7 w-48 rounded" />
        <div className="skeleton h-4 w-32 rounded-full" />
        <div className="flex gap-4 mt-3">
          {[80, 120, 100].map((w, i) => <div key={i} className="skeleton h-3 rounded" style={{ width: w }} />)}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function MemberDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();

  const [member,      setMember]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [notFound,    setNotFound]    = useState(false);
  const [activeTab,   setActiveTab]   = useState('overview');
  const [visits,      setVisits]      = useState([]);
  const [visitsLoad,  setVisitsLoad]  = useState(false);
  const [showEdit,    setShowEdit]    = useState(false);
  const [showDelete,  setShowDelete]  = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [memberTypes, setMemberTypes] = useState([]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(editSchema) });

  // Fetch member + types
  useEffect(() => {
    setLoading(true);
    Promise.all([
      membersApi.getById(id),
      membersApi.getMemberTypes(),
    ])
      .then(([mr, tr]) => {
        const m = mr?.data?.data || mr?.data?.member || mr?.data;
        if (!m) { setNotFound(true); return; }
        setMember(m);
        setMemberTypes(tr?.data?.data || tr?.data?.types || []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch visits on mount AND when tab switches
  useEffect(() => {
    if (!member) return;
    setVisitsLoad(true);
    visitsApi.getPersonVisits({ memberId: member.MemberID || member.memberid, limit: 50 })
      .then((r) => setVisits(r?.data?.data?.visits || r?.data?.visits || []))
      .catch(() => setVisits([]))
      .finally(() => setVisitsLoad(false));
  }, [member]); // Fetch whenever member changes (which happens once on ID load)

  // Prefill edit form
  useEffect(() => {
    if (member && showEdit) {
      reset({
        name:          member.Name          || member.name          || '',
        email:         member.Email         || member.email         || '',
        contactNumber: member.ContactNumber || member.contactnumber || '',
        typeId:        member.TypeID        || member.typeid        || '',
        age:           member.Age           || member.age           || '',
        department:    member.Department    || member.department    || '',
      });
    }
  }, [member, showEdit, reset]);

  const onEditSubmit = async (data) => {
    try {
      await membersApi.update(id, {
        name: data.name, email: data.email,
        contactNumber: data.contactNumber,
        typeId: Number(data.typeId),
        age: data.age ? Number(data.age) : undefined,
        department: data.department || undefined,
      });
      toast.success('Member updated');
      setShowEdit(false);
      // Re-fetch
      const r = await membersApi.getById(id);
      setMember(r?.data?.data || r?.data?.member || r?.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await membersApi.remove(id);
      toast.success('Member deleted');
      navigate('/members', { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-5">
        <HeroSkeleton />
        <div className="skeleton h-9 w-72 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Users}
          title="Member not found"
          description="This member may have been deleted or does not exist."
          action={<button onClick={() => navigate('/members')} className="btn-primary text-sm">← Back to Members</button>}
        />
      </div>
    );
  }

  const name     = member.Name          || member.name          || '-';
  const email    = member.Email         || member.email         || '-';
  const phone    = member.ContactNumber || member.contactnumber || '-';
  const dept     = member.Department    || member.department    || '-';
  const typeName = member.TypeName      || member.typename      || 'Member';
  const vehicles = member.vehicles      || [];
  const totalVisits  = member.totalVisits  || 0;
  // Use backend provided activeVisits, falling back to client-side filter if visits already loaded
  const activeVisits = member.activeVisits ?? visits.filter((v) => v.IsActive || v.isactive).length;
  const lastVisit    = visits[0] || (member.recentVisits && member.recentVisits[0]);

  const tabs = [
    { value: 'overview', label: 'Overview',     icon: Activity },
    { value: 'visits',   label: 'Visit History', icon: ClipboardList },
    { value: 'vehicles', label: 'Vehicles',      icon: Car },
  ];

  return (
    <div className="p-6 space-y-5 pb-20 md:pb-6">
      <PageHeader
        title={name}
        breadcrumb={[{ label: 'Members', path: '/members' }, { label: name }]}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEdit(true)} className="btn-ghost text-sm">
              <Pencil size={14} /> Edit
            </button>
            <button onClick={() => setShowDelete(true)} className="btn-ghost text-sm text-red-400 hover:bg-red-400/10 border-red-400/20">
              <X size={14} /> Delete
            </button>
          </div>
        }
      />

      {/* Hero banner */}
      <motion.div variants={fadeInUp} initial="initial" animate="animate" className="glass-card p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className={cn('w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl font-bold text-white bg-gradient-to-br shadow-lg', avatarGradient(name))}>
            {getInitials(name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl font-bold text-white">{name}</h1>
              <span className="badge badge-primary">{typeName}</span>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/50 mt-1">
              <span className="flex items-center gap-1.5"><Mail size={13} /> {email}</span>
              <span className="flex items-center gap-1.5"><Phone size={13} /> {phone}</span>
              {dept && <span className="flex items-center gap-1.5"><Building2 size={13} /> {dept}</span>}
              <span className="flex items-center gap-1.5"><Hash size={13} /> ID: {member.MemberID || member.memberid}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex gap-1 bg-white/[0.04] rounded-xl p-1 w-fit border border-white/[0.07]">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <Tabs.Trigger
                key={t.value}
                value={t.value}
                className={cn(
                  'relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  activeTab === t.value ? 'text-white' : 'text-white/40 hover:text-white/70'
                )}
              >
                {activeTab === t.value && (
                  <motion.div layoutId="tab-indicator" className="absolute inset-0 bg-indigo-500/20 rounded-lg border border-indigo-500/30" />
                )}
                <Icon size={14} className="relative z-10" />
                <span className="relative z-10">{t.label}</span>
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>

        {/* Overview */}
        <Tabs.Content value="overview" className="mt-4 focus:outline-none">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Total Visits"  value={totalVisits}   icon={ClipboardList} color="indigo" />
            <StatCard title="Active Visits" value={activeVisits}  icon={Activity}      color="emerald" />
            <StatCard title="Vehicles"      value={vehicles.length} icon={Car}         color="amber" />
            <StatCard title="Last Visit"    value={lastVisit ? 1 : 0} icon={Calendar} color="red"
              trendLabel={lastVisit ? formatRelativeTime(lastVisit.EntryTime || lastVisit.entrytime) : 'No visits'} />
          </div>
        </Tabs.Content>

        {/* Visit History */}
        <Tabs.Content value="visits" className="mt-4 focus:outline-none">
          <DataTable
            data={visits}
            columns={visitColumns}
            loading={visitsLoad}
            emptyMessage="No visits recorded for this member."
          />
        </Tabs.Content>

        {/* Vehicles */}
        <Tabs.Content value="vehicles" className="mt-4 focus:outline-none">
          {vehicles.length === 0 ? (
            <EmptyState icon={Car} title="No vehicles" description="This member has no registered vehicles." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map((v) => (
                <Link key={v.VehicleID || v.vehicleid} to={`/vehicles/${v.VehicleID || v.vehicleid}`}
                      className="glass-card p-4 hover:bg-white/[0.05] transition-colors">
                  <span className="plate">{v.RegistrationNumber || v.registrationnumber}</span>
                  <p className="text-sm text-white/60 mt-2">{v.Model || v.model} · {v.Color || v.color}</p>
                  <span className="badge badge-muted text-[10px] mt-1">{v.TypeName || v.typename}</span>
                </Link>
              ))}
            </div>
          )}
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
                      <Dialog.Title className="text-lg font-bold text-white">Edit Member</Dialog.Title>
                      <Dialog.Close className="icon-rail-btn"><X size={16} /></Dialog.Close>
                    </div>
                    <form onSubmit={handleSubmit(onEditSubmit)} className="space-y-4">
                      {[
                        { label: 'Full Name',       name: 'name',          placeholder: 'Rajesh Kumar' },
                        { label: 'Email',           name: 'email',         type: 'email', placeholder: 'rajesh@iitgn.ac.in' },
                        { label: 'Contact Number',  name: 'contactNumber', placeholder: '9876543210' },
                      ].map((f) => (
                        <div key={f.name} className="space-y-1">
                          <label className="text-xs font-medium text-white/50">{f.label}</label>
                          <input {...register(f.name)} type={f.type || 'text'} placeholder={f.placeholder} className="input-field" />
                          {errors[f.name] && <p className="text-xs text-red-400">{errors[f.name].message}</p>}
                        </div>
                      ))}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-white/50">Member Type</label>
                          <select {...register('typeId')} className="input-field">
                            {memberTypes.map((t) => (
                              <option key={t.TypeID || t.typeid} value={t.TypeID || t.typeid}>{t.TypeName || t.typename}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-white/50">Age</label>
                          <input {...register('age')} type="number" placeholder="22" className="input-field" />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <label className="text-xs font-medium text-white/50">Department</label>
                          <input {...register('department')} placeholder="Computer Science" className="input-field" />
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

      {/* Delete confirm */}
      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Member"
        description={`Delete "${name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}

