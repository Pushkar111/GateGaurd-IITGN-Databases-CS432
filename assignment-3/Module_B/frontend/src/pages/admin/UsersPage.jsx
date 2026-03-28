// src/pages/admin/UsersPage.jsx
// User management — Admin only, SuperAdmin gets full CRUD

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tooltip from '@radix-ui/react-tooltip';
import { UserCircle2, UserPlus, Pencil, Trash2, X, Loader2, Eye, EyeOff, Check, Ban } from 'lucide-react';
import * as usersApi from '@/api/users.api';
import { useAuth }   from '@/context/AuthContext';
import PageHeader    from '@/components/shared/PageHeader';
import RoleBadge     from '@/components/shared/RoleBadge';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import EmptyState    from '@/components/shared/EmptyState';
import { cn, formatDate } from '@/lib/utils';
import { pageVariants, scaleIn, backdropVariants, fadeInUp } from '@/lib/motion';

// -- Password strength -------------------------------------------------
const getStrength = (p = '') =>
  [p.length >= 8, /[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)].filter(Boolean).length;

const STRENGTH_COLORS = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500'];
const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong'];

function PasswordStrengthMeter({ password }) {
  const strength = getStrength(password);
  if (!password) return null;
  return (
    <div className="space-y-1 mt-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={cn('h-1 flex-1 rounded-full transition-all duration-300',
            i <= strength ? STRENGTH_COLORS[strength - 1] : 'bg-white/10'
          )} />
        ))}
      </div>
      {strength > 0 && (
        <p className="text-[10px] text-white/40">{STRENGTH_LABELS[strength - 1]}</p>
      )}
    </div>
  );
}

// -- Zod schemas -------------------------------------------------------
const createSchema = z.object({
  username: z.string().min(3, 'Min 3 chars').max(50),
  password: z.string().min(8, 'Min 8 chars'),
  roleId:   z.coerce.number().int().positive('Role required'),
});

const editSchema = z.object({
  roleId:   z.coerce.number().int().positive('Role required'),
  password: z.string().min(8, 'Min 8 chars if provided').or(z.literal('')).optional(),
});

// -- Password field with eye toggle ------------------------------------
function PasswordField({ register, name, label = 'Password', watch }) {
  const [show, setShow] = useState(false);
  const val = watch ? watch(name) : '';
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-white/50">{label}</label>
      <div className="relative">
        <input {...register(name)} type={show ? 'text' : 'password'}
          placeholder="••••••••" className="input-field pr-10" />
        <button type="button" onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {watch && <PasswordStrengthMeter password={val} />}
    </div>
  );
}

// -- Create User Modal -------------------------------------------------
function CreateUserModal({ open, onOpenChange, roles, onSuccess, isSuperAdmin }) {
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(createSchema),
    defaultValues: { username: '', password: '', roleId: '' },
  });

  useEffect(() => { if (!open) reset(); }, [open, reset]);

  const onSubmit = async (data) => {
    try {
      const res = await usersApi.create({ username: data.username, password: data.password, roleId: Number(data.roleId) });
      const payload = res?.data || {};
      if (payload?.request) {
        toast.success('Request submitted for SuperAdmin approval');
      } else {
        toast.success(isSuperAdmin ? 'User created' : 'Request submitted');
      }
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Failed to submit request');
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
                  className="w-full max-w-md bg-[hsl(228_40%_7%)] border border-white/10 rounded-2xl shadow-2xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <Dialog.Title className="text-lg font-bold text-white">{isSuperAdmin ? 'Create User' : 'Request User Approval'}</Dialog.Title>
                    <Dialog.Close className="icon-rail-btn"><X size={16} /></Dialog.Close>
                  </div>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-white/50">Username *</label>
                      <input {...register('username')} placeholder="guard_01" className="input-field font-mono" />
                      {errors.username && <p className="text-xs text-red-400">{errors.username.message}</p>}
                    </div>
                    <div>
                      <PasswordField register={register} name="password" watch={watch} />
                      {errors.password && <p className="text-xs text-red-400 mt-0.5">{errors.password.message}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-white/50">Role *</label>
                      <select {...register('roleId')} className="input-field">
                        <option value="">Select role...</option>
                        {roles.map((r) => (
                          <option key={r.RoleID || r.roleid} value={r.RoleID || r.roleid}>{r.RoleName || r.rolename}</option>
                        ))}
                      </select>
                      {errors.roleId && <p className="text-xs text-red-400">{errors.roleId.message}</p>}
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                      <Dialog.Close className="btn-ghost">Cancel</Dialog.Close>
                      <button type="submit" disabled={isSubmitting} className="btn-primary">
                        {isSubmitting ? <><Loader2 size={15} className="animate-spin" /> {isSuperAdmin ? 'Creating...' : 'Submitting...'}</> : (isSuperAdmin ? 'Create User' : 'Submit Request')}
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

// -- Edit User Modal ---------------------------------------------------
function EditUserModal({ open, onOpenChange, editUser, roles, onSuccess }) {
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: { roleId: '', password: '' },
  });

  useEffect(() => {
    if (editUser) reset({ roleId: editUser.RoleID || editUser.roleid || '', password: '' });
  }, [editUser, reset, open]);

  const onSubmit = async (data) => {
    try {
      const payload = { roleId: Number(data.roleId) };
      if (data.password) payload.password = data.password;
      await usersApi.update(editUser.UserID || editUser.userid, payload);
      toast.success('User updated');
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
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
                  className="w-full max-w-md bg-[hsl(228_40%_7%)] border border-white/10 rounded-2xl shadow-2xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <Dialog.Title className="text-lg font-bold text-white">Edit User</Dialog.Title>
                    <Dialog.Close className="icon-rail-btn"><X size={16} /></Dialog.Close>
                  </div>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-white/50">Username (read-only)</label>
                      <div className="input-field opacity-50 cursor-not-allowed font-mono text-white/60">
                        {editUser?.Username || editUser?.username}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-white/50">Role *</label>
                      <select {...register('roleId')} className="input-field">
                        {roles.map((r) => (
                          <option key={r.RoleID || r.roleid} value={r.RoleID || r.roleid}>{r.RoleName || r.rolename}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <PasswordField register={register} name="password" label="New Password (leave blank to keep)" watch={watch} />
                      {errors.password && <p className="text-xs text-red-400 mt-0.5">{errors.password.message}</p>}
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
  );
}

// -- Main page ---------------------------------------------------------
export default function UsersPage() {
  const { user: currentUser, hasRole } = useAuth();
  const isSA = hasRole('SuperAdmin');
  const isAdmin = hasRole('Admin');

  const [users,       setUsers]       = useState([]);
  const [roles,       setRoles]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [editUser,    setEditUser]    = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,    setDeleting]    = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [reviewingId, setReviewingId] = useState(null);

  useEffect(() => {
    usersApi.getRoles()
      .then((r) => setRoles(r?.data?.data || r?.data?.roles || r?.data || []))
      .catch(() => {});
  }, []);

  const requestableRoles = isSA
    ? roles
    : roles.filter((r) => (r.RoleName || r.rolename) !== 'SuperAdmin');

  const fetchUsers = useCallback(() => {
    setLoading(true);
    usersApi.getAll()
      .then((r) => setUsers(r?.data?.data || r?.data?.users || r?.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const fetchPendingRequests = useCallback(() => {
    if (!isSA) return;
    usersApi.getPendingRequests()
      .then((r) => setPendingRequests(r?.data?.requests || r?.requests || []))
      .catch(() => setPendingRequests([]));
  }, [isSA]);

  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await usersApi.remove(deleteTarget.UserID || deleteTarget.userid);
      toast.success('User deleted');
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const handleApproveRequest = async (reqId) => {
    setReviewingId(reqId);
    try {
      await usersApi.approveRequest(reqId);
      toast.success('Request approved and user created');
      fetchPendingRequests();
      fetchUsers();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Approval failed');
    } finally {
      setReviewingId(null);
    }
  };

  const handleRejectRequest = async (reqId) => {
    setReviewingId(reqId);
    try {
      await usersApi.rejectRequest(reqId);
      toast.success('Request rejected');
      fetchPendingRequests();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Rejection failed');
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate"
      className="p-6 space-y-5 pb-20 md:pb-6">
      <PageHeader
        title="User Management"
        subtitle={`${users.length} registered user${users.length !== 1 ? 's' : ''}`}
        breadcrumb={[{ label: 'Admin' }, { label: 'Users' }]}
        actions={(isSA || isAdmin) && (
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
            <UserPlus size={16} /> {isSA ? 'Create User' : 'Request User'}
          </button>
        )}
      />

      {isSA && (
        <motion.div variants={fadeInUp} initial="initial" animate="animate" className="glass-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white/80">Pending User Requests</h3>
            <span className="text-xs text-white/35">{pendingRequests.length} pending</span>
          </div>
          {pendingRequests.length === 0 ? (
            <div className="px-4 py-5 text-sm text-white/45">No pending requests.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.07]">
                  {['Username', 'Role', 'Requested By', 'Requested At', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-white/30 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingRequests.map((r) => (
                  <tr key={r.requestId} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-white/80">{r.username}</td>
                    <td className="px-4 py-3"><RoleBadge role={r.roleName} /></td>
                    <td className="px-4 py-3 text-white/60">{r.requestedByUsername || '—'}</td>
                    <td className="px-4 py-3 text-white/40 text-xs">{r.createdAt ? formatDate(r.createdAt, 'dd MMM yyyy HH:mm') : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleApproveRequest(r.requestId)}
                          disabled={reviewingId === r.requestId}
                          className="p-1.5 rounded-lg hover:bg-emerald-500/15 text-white/30 hover:text-emerald-400 transition-colors disabled:opacity-50"
                        >
                          {reviewingId === r.requestId ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(r.requestId)}
                          disabled={reviewingId === r.requestId}
                          className="p-1.5 rounded-lg hover:bg-red-500/15 text-white/30 hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                          <Ban size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      )}

      {loading ? (
        <div className="glass-card rounded-xl overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-white/[0.04]">
              <div className="skeleton w-6 h-4 rounded" />
              <div className="skeleton h-4 w-28 rounded" />
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-4 w-24 rounded ml-auto" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState icon={UserCircle2} title="No users found" description="Create your first user account." />
      ) : (
        <motion.div variants={fadeInUp} initial="initial" animate="animate" className="glass-card rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {['#', 'Username', 'Role', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-white/30 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const uid    = u.UserID   || u.userid;
                const uname  = u.Username || u.username || '—';
                const role   = u.RoleName || u.rolename || '—';
                const created = u.CreatedAt || u.createdat;
                const isSelf = uid === (currentUser?.UserID || currentUser?.userid || currentUser?.id);
                return (
                  <motion.tr key={uid} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 text-white/25 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserCircle2 size={15} className="text-white/25 flex-shrink-0" />
                        <span className="font-mono font-medium text-white/80">{uname}</span>
                        {isSelf && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium">You</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={role} />
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs">{created ? formatDate(created, 'dd MMM yyyy') : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {isSA && (
                          <button onClick={() => setEditUser(u)}
                            className="p-1.5 rounded-lg hover:bg-indigo-500/15 text-white/30 hover:text-indigo-400 transition-colors">
                            <Pencil size={13} />
                          </button>
                        )}
                        {isSA && (
                          <Tooltip.Provider delayDuration={200}>
                            <Tooltip.Root>
                              <Tooltip.Trigger asChild>
                                <span>
                                  <button
                                    onClick={() => !isSelf && setDeleteTarget(u)}
                                    disabled={isSelf}
                                    className={cn(
                                      'p-1.5 rounded-lg transition-colors',
                                      isSelf
                                        ? 'opacity-30 cursor-not-allowed text-white/20'
                                        : 'hover:bg-red-500/15 text-white/30 hover:text-red-400'
                                    )}>
                                    <Trash2 size={13} />
                                  </button>
                                </span>
                              </Tooltip.Trigger>
                              {isSelf && (
                                <Tooltip.Portal>
                                  <Tooltip.Content className="bg-[hsl(228_40%_8%)] border border-white/10 text-white/70 text-xs rounded-lg px-2.5 py-1.5 shadow-xl z-[300]" sideOffset={4}>
                                    Cannot delete your own account
                                    <Tooltip.Arrow className="fill-[hsl(228_40%_8%)]" />
                                  </Tooltip.Content>
                                </Tooltip.Portal>
                              )}
                            </Tooltip.Root>
                          </Tooltip.Provider>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      )}

      <CreateUserModal
        open={showCreate}
        onOpenChange={setShowCreate}
        roles={requestableRoles}
        onSuccess={() => { fetchUsers(); fetchPendingRequests(); }}
        isSuperAdmin={isSA}
      />
      <EditUserModal   open={Boolean(editUser)} onOpenChange={(v) => !v && setEditUser(null)} editUser={editUser} roles={roles} onSuccess={fetchUsers} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete User"
        description={`Delete user "${deleteTarget?.Username || deleteTarget?.username}"? They will lose all access immediately.`}
        onConfirm={handleDelete}
        loading={deleting}
        variant="danger"
      />
    </motion.div>
  );
}

