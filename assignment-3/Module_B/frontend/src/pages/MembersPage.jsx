// src/pages/MembersPage.jsx
// Full production Members list page — grid/table views, filter bar, CRUD modals

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Users, UserPlus, LayoutGrid, List, X,
  Phone, Mail, Pencil, Trash2, ChevronRight, Loader2,
} from 'lucide-react';

import { useAuth }        from '@/context/AuthContext';
import { usePagination }  from '@/hooks/usePagination';
import { useDebounce }    from '@/hooks/useDebounce';
import * as membersApi    from '@/api/members.api';
import PageHeader         from '@/components/shared/PageHeader';
import DataTable          from '@/components/shared/DataTable';
import EmptyState         from '@/components/shared/EmptyState';
import ConfirmDialog      from '@/components/shared/ConfirmDialog';
import { cn, getInitials, formatDate } from '@/lib/utils';
import {
  pageVariants, staggerContainer, staggerItem, cardHover, scaleIn, backdropVariants,
} from '@/lib/motion';

// -- Zod schema ---------------------------------------------------------
const memberSchema = z.object({
  name:          z.string().min(2, 'Name must be at least 2 chars').max(100),
  email:         z.string().email('Invalid email address'),
  contactNumber: z.string().min(7, 'Contact number required'),
  typeId:        z.coerce.number().int().positive('Member type required'),
  age:           z.coerce.number().int().min(1).max(120).optional().or(z.literal('')),
  department:    z.string().max(100).optional().or(z.literal('')),
});

// -- Avatar color from name hash ---------------------------------------
const AVATAR_GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-sky-500 to-blue-600',
  'from-violet-500 to-fuchsia-600',
];
function avatarGradient(name = '') {
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xfffff;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

// - Member card (grid view) -------------------------------------------
function MemberCard({ member, onEdit, onDelete, canEdit, canDelete }) {
  const navigate = useNavigate();
  const grad     = avatarGradient(member.Name || member.name);
  const name     = member.Name      || member.name      || '-';
  const email    = member.Email     || member.email     || '-';
  const phone    = member.ContactNumber || member.contactnumber || '-';
  const dept     = member.Department   || member.department   || '';
  const typeName = member.TypeName  || member.typename  || 'Member';
  const id       = member.MemberID  || member.memberid;

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ scale: 1.02, y: -2, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
      className="glass-card p-5 flex flex-col gap-3 relative group"
    >
      {/* Admin actions (top-right, revealed on hover) */}
      {(canEdit || canDelete) && (
        <div className="absolute top-3 right-3 flex items-center gap-1
                        opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(member); }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-indigo-500/20
                         text-white/40 hover:text-indigo-400 transition-colors"
            >
              <Pencil size={13} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(member); }}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20
                         text-white/40 hover:text-red-400 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}

      {/* Avatar + type */}
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
          'text-white font-bold text-base bg-gradient-to-br',
          grad
        )}>
          {getInitials(name)}
        </div>
        <span className="badge badge-primary text-[10px]">{typeName}</span>
      </div>

      {/* Info */}
      <div className="min-w-0">
        <h3 className="font-semibold text-white/90 text-base leading-tight mb-0.5">{name}</h3>
        <p className="text-xs text-white/40 truncate flex items-center gap-1">
          <Mail size={10} /> {email}
        </p>
        <p className="text-xs text-white/40 mt-0.5 flex items-center gap-1">
          <Phone size={10} /> {phone}
        </p>
        {dept && (
          <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full
                           bg-white/[0.07] text-white/50 border border-white/10">
            {dept}
          </span>
        )}
      </div>

      {/* Footer */}
      <button
        onClick={() => navigate(`/members/${id}`)}
        className="mt-auto flex items-center gap-1 text-xs font-semibold text-indigo-400
                   hover:text-indigo-300 transition-colors"
      >
        View Profile <ChevronRight size={13} />
      </button>
    </motion.div>
  );
}

// -- Card skeleton -----------------------------------------------------
function CardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="skeleton w-12 h-12 rounded-xl" />
        <div className="skeleton h-4 w-16 rounded-full" />
      </div>
      <div className="space-y-1.5">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="skeleton h-3 w-40 rounded" />
        <div className="skeleton h-3 w-24 rounded" />
      </div>
      <div className="skeleton h-3 w-20 rounded" />
    </div>
  );
}

// -- Add/Edit modal ----------------------------------------------------
function MemberModal({ open, onOpenChange, editMember, memberTypes, onSuccess }) {
  const isEdit = Boolean(editMember);
  const {
    register, handleSubmit, reset, setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(memberSchema),
    defaultValues: { name: '', email: '', contactNumber: '', typeId: '', age: '', department: '' },
  });

  useEffect(() => {
    if (editMember) {
      reset({
        name:          editMember.Name      || editMember.name      || '',
        email:         editMember.Email     || editMember.email     || '',
        contactNumber: editMember.ContactNumber || editMember.contactnumber || '',
        typeId:        editMember.TypeID    || editMember.typeid    || '',
        age:           editMember.Age       || editMember.age       || '',
        department:    editMember.Department || editMember.department || '',
      });
    } else {
      reset({ name: '', email: '', contactNumber: '', typeId: '', age: '', department: '' });
    }
  }, [editMember, reset, open]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        name:          data.name,
        email:         data.email,
        contactNumber: data.contactNumber,
        typeId:        Number(data.typeId),
        age:           data.age ? Number(data.age) : undefined,
        department:    data.department || undefined,
      };
      if (isEdit) {
        await membersApi.update(editMember.MemberID || editMember.memberid, payload);
        toast.success('Member updated successfully');
      } else {
        await membersApi.create(payload);
        toast.success('Member created successfully');
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Something went wrong');
    }
  };

  const Field = ({ label, name: fname, type = 'text', placeholder, required }) => (
    <div className="space-y-1">
      <label className="text-xs font-medium text-white/50">{label}{required && ' *'}</label>
      <input
        {...register(fname)}
        type={type}
        placeholder={placeholder}
        className="input-field"
      />
      {errors[fname] && (
        <p className="text-xs text-red-400">{errors[fname].message}</p>
      )}
    </div>
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                variants={backdropVariants} initial="initial" animate="animate" exit="exit"
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
                <motion.div
                  variants={scaleIn} initial="initial" animate="animate" exit="exit"
                  className="w-full max-w-lg bg-[hsl(228_40%_7%)] border border-white/10
                             rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between mb-5">
                    <Dialog.Title className="text-lg font-bold text-white">
                      {isEdit ? 'Edit Member' : 'Add New Member'}
                    </Dialog.Title>
                    <Dialog.Close className="icon-rail-btn">
                      <X size={16} />
                    </Dialog.Close>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <Field label="Full Name" name="name" placeholder="Rajesh Kumar" required />
                      </div>
                      <div className="col-span-2">
                        <Field label="Email Address" name="email" type="email" placeholder="rajesh@iitgn.ac.in" required />
                      </div>
                      <div>
                        <Field label="Contact Number" name="contactNumber" placeholder="9876543210" required />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-white/50">Member Type *</label>
                        <select {...register('typeId')} className="input-field">
                          <option value="">Select type...</option>
                          {memberTypes.map((t) => (
                            <option key={t.TypeID || t.typeid} value={t.TypeID || t.typeid}>
                              {t.TypeName || t.typename}
                            </option>
                          ))}
                        </select>
                        {errors.typeId && <p className="text-xs text-red-400">{errors.typeId.message}</p>}
                      </div>
                      <div>
                        <Field label="Age" name="age" type="number" placeholder="22" />
                      </div>
                      <div>
                        <Field label="Department" name="department" placeholder="Computer Science" />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <Dialog.Close className="btn-ghost">Cancel</Dialog.Close>
                      <button type="submit" disabled={isSubmitting} className="btn-primary">
                        {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : (isEdit ? 'Save Changes' : 'Add Member')}
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

// -- Table columns definition ------------------------------------------
function buildColumns(navigate, onEdit, onDelete, canEdit, canDelete) {
  return [
    { header: '#',          accessorKey: 'MemberID',      size: 50,  cell: (c) => <span className="text-white/30 tabular-nums">{c.getValue() || c.row.original.memberid}</span> },
    {
      header: 'Member', id: 'member',
      cell: ({ row: { original: m } }) => {
        const name = m.Name || m.name || '-';
        return (
          <div className="flex items-center gap-2.5">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold text-white bg-gradient-to-br', avatarGradient(name))}>
              {getInitials(name)}
            </div>
            <span className="font-medium text-white/85">{name}</span>
          </div>
        );
      },
    },
    { header: 'Email',  accessorKey: 'Email',      cell: (c) => <span className="text-white/50 text-xs">{c.getValue() || c.row.original.email}</span> },
    { header: 'Type',   accessorKey: 'TypeName',   cell: (c) => <span className="badge badge-primary text-[10px]">{c.getValue() || c.row.original.typename || '—'}</span> },
    { header: 'Department', accessorKey: 'Department', cell: (c) => <span className="text-white/50 text-xs">{c.getValue() || c.row.original.department || '—'}</span> },
    {
      header: 'Actions', id: 'actions', enableSorting: false,
      cell: ({ row: { original: m } }) => (
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(`/members/${m.MemberID || m.memberid}`)} className="btn-ghost text-xs px-2 py-1">View</button>
          {canEdit  && <button onClick={() => onEdit(m)}   className="p-1.5 rounded-lg hover:bg-indigo-500/15 text-white/30 hover:text-indigo-400 transition-colors"><Pencil size={13} /></button>}
          {canDelete && <button onClick={() => onDelete(m)} className="p-1.5 rounded-lg hover:bg-red-500/15   text-white/30 hover:text-red-400    transition-colors"><Trash2  size={13} /></button>}
        </div>
      ),
    },
  ];
}

// -- Main page component -----------------------------------------------
export default function MembersPage() {
  const navigate              = useNavigate();
  const { hasRole }           = useAuth();
  const canEdit               = hasRole('Admin', 'SuperAdmin');
  const canDelete             = hasRole('SuperAdmin');

  const [members,      setMembers]      = useState([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [memberTypes,  setMemberTypes]  = useState([]);
  const [view,         setView]         = useState('grid');
  const [search,       setSearch]       = useState('');
  const [typeId,       setTypeId]       = useState('');
  const [showAdd,      setShowAdd]      = useState(false);
  const [editMember,   setEditMember]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  const { page, limit, setPage } = usePagination(1, 12);
  const debouncedSearch           = useDebounce(search, 300);

  // Fetch member types once
  useEffect(() => {
    membersApi.getMemberTypes()
      .then((r) => setMemberTypes(r?.data?.data || r?.data?.types || []))
      .catch(() => {});
  }, []);

  const fetchMembers = useCallback(() => {
    setLoading(true);
    membersApi.getAll({ page, limit, search: debouncedSearch || undefined, typeId: typeId || undefined })
      .then((r) => {
        // Robust mapping: try r.data.members, then r.members, then r.data if it's an array
        const membersList = r?.data?.members ?? r?.members ?? (Array.isArray(r?.data) ? r.data : (Array.isArray(r) ? r : []));
        const totalCount  = r?.pagination?.total ?? r?.total ?? (Array.isArray(membersList) ? membersList.length : 0);
        
        setMembers(Array.isArray(membersList) ? membersList : []);
        setTotal(totalCount);
      })
      .catch(() => {
        setMembers([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, limit, debouncedSearch, typeId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await membersApi.remove(deleteTarget.MemberID || deleteTarget.memberid);
      toast.success('Member deleted');
      setDeleteTarget(null);
      fetchMembers();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(
    () => buildColumns(navigate, (m) => { setEditMember(m); setShowAdd(true); }, setDeleteTarget, canEdit, canDelete),
    [navigate, canEdit, canDelete]
  );

  const pagination = { page, limit, total, hasNextPage: page * limit < total };

  return (
    <div className="p-6 space-y-5 pb-20 md:pb-6">
      {/* Header */}
      <PageHeader
        title="Members"
        subtitle={`${total} registered member${total !== 1 ? 's' : ''}`}
        breadcrumb={[{ label: 'Members' }]}
        actions={
          <button onClick={() => { setEditMember(null); setShowAdd(true); }} className="btn-primary text-sm">
            <UserPlus size={16} /> Add Member
          </button>
        }
      />

      {/* Filters + view toggle */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input-field max-w-xs"
          placeholder="Search name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input-field w-auto"
          value={typeId}
          onChange={(e) => { setTypeId(e.target.value); setPage(1); }}
        >
          <option value="">All Types</option>
          {memberTypes.map((t) => (
            <option key={t.TypeID || t.typeid} value={t.TypeID || t.typeid}>{t.TypeName || t.typename}</option>
          ))}
        </select>
        {(search || typeId) && (
          <button onClick={() => { setSearch(''); setTypeId(''); setPage(1); }} className="btn-ghost text-xs px-3 py-2">
            Clear
          </button>
        )}

        {/* View toggle */}
        <div className="ml-auto flex items-center gap-1 bg-white/[0.04] rounded-xl p-1 border border-white/[0.07]">
          <button
            onClick={() => setView('grid')}
            className={cn('p-1.5 rounded-lg transition-all', view === 'grid' ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/30 hover:text-white/60')}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setView('table')}
            className={cn('p-1.5 rounded-lg transition-all', view === 'table' ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/30 hover:text-white/60')}
          >
            <List size={16} />
          </button>
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
            ) : members.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No members found"
                description="Try adjusting your filters or add a new member."
                action={<button onClick={() => { setSearch(''); setTypeId(''); }} className="btn-ghost text-sm">Clear filters</button>}
              />
            ) : (
              <motion.div
                variants={staggerContainer} initial="initial" animate="animate"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {members.map((m) => (
                  <MemberCard
                    key={m.MemberID || m.memberid}
                    member={m}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onEdit={(mem) => { setEditMember(mem); setShowAdd(true); }}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </motion.div>
            )}
          </div>
        ) : (
          <div key="table">
            <DataTable
              data={members}
              columns={columns}
              loading={loading}
              pagination={pagination}
              onPageChange={setPage}
              emptyMessage="No members found."
              onRowClick={(m) => navigate(`/members/${m.MemberID || m.memberid}`)}
            />
          </div>
        )}
      </div>

      {/* Grid pagination */}
      {view === 'grid' && !loading && members.length > 0 && (
        <div className="flex items-center justify-between text-xs text-white/40 pt-2">
          <span>{total} total</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-30">← Prev</button>
            <span className="text-white/60 font-medium">{page} / {Math.ceil(total / limit) || 1}</span>
            <button onClick={() => setPage(page + 1)} disabled={page * limit >= total} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-30">Next →</button>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <MemberModal
        open={showAdd}
        onOpenChange={(v) => { setShowAdd(v); if (!v) setEditMember(null); }}
        editMember={editMember}
        memberTypes={memberTypes}
        onSuccess={fetchMembers}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete Member"
        description={`Are you sure you want to delete "${deleteTarget?.Name || deleteTarget?.name}"? This will also remove all their visit records.`}
        onConfirm={handleDelete}
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}

