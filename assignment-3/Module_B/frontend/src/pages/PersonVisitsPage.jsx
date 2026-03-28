// src/pages/PersonVisitsPage.jsx
// Person visit management — record entry/exit sheets, full DataTable

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import CountUp from 'react-countup';
import {
  Activity, LogIn, LogOut, X, Loader2, ChevronDown, CheckCircle2, Trash2,
} from 'lucide-react';
import * as visitsApi  from '@/api/visits.api';
import * as gatesApi   from '@/api/gates.api';
import * as membersApi from '@/api/members.api';
import { useAuth }     from '@/context/AuthContext';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce }   from '@/hooks/useDebounce';
import PageHeader      from '@/components/shared/PageHeader';
import DataTable       from '@/components/shared/DataTable';
import SavedViewsBar   from '@/components/shared/SavedViewsBar';
import ConfirmDialog   from '@/components/shared/ConfirmDialog';
import { useSavedViews } from '@/hooks/useSavedViews';
import { cn, getInitials, formatDate, formatDuration, formatRelativeTime } from '@/lib/utils';
import { pageVariants, scaleIn, backdropVariants, slideInRight } from '@/lib/motion';

// -- Member combobox ---------------------------------------------------
function MemberCombobox({ value, label, onChange, excludedIds = new Set() }) {
  const [open,    setOpen]    = useState(false);
  const [search,  setSearch]  = useState('');
  const [options, setOptions] = useState([]);
  const debounced = useDebounce(search, 300);

  useEffect(() => {
    membersApi.getAll({ search: debounced || undefined, limit: 10 })
      .then((r) => {
        const membersList = r?.data?.members ?? r?.data ?? [];
        const normalized = Array.isArray(membersList) ? membersList : [];
        setOptions(
          normalized.filter((m) => {
            const id = m.MemberID || m.memberid;
            return !excludedIds.has(String(id));
          })
        );
      })
      .catch(() => {});
  }, [debounced, excludedIds]);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className="input-field flex items-center justify-between text-left">
          <span className={label ? 'text-white/90' : 'text-white/30'}>{label || 'Search member...'}</span>
          <ChevronDown size={14} className="text-white/30" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="z-[200] w-[280px] bg-[hsl(228_40%_8%)] border border-white/10 rounded-xl shadow-2xl overflow-hidden" align="start" sideOffset={4}>
          <div className="p-2 border-b border-white/[0.06]">
            <input className="input-field text-sm" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          </div>
          <div className="max-h-52 overflow-y-auto py-1">
            {options.length === 0 ? <p className="text-center text-white/30 text-xs py-4">No members</p> : options.map((m) => {
              const id = m.MemberID || m.memberid;
              const n  = m.Name || m.name;
              return (
                <button key={id} type="button" onClick={() => { onChange(id, n); setOpen(false); }}
                  className={cn('w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-indigo-500/10 transition-colors', value === id ? 'text-indigo-300' : 'text-white/70')}>
                  <div className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center text-[9px] font-bold text-white">{getInitials(n)}</div>
                  <div className="flex-1 min-w-0"><p className="font-medium truncate">{n}</p><p className="text-[10px] text-white/30">{m.Email || m.email}</p></div>
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// -- Sheet (side drawer) -----------------------------------------------
function Sheet({ open, onOpenChange, title, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div variants={backdropVariants} initial="initial" animate="animate" exit="exit"
                className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div variants={slideInRight} initial="initial" animate="animate" exit="exit"
                className="fixed inset-y-0 right-0 z-[101] w-full max-w-md
                           bg-[hsl(228_40%_7%)] border-l border-white/[0.08]
                           flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
                  <Dialog.Title className="text-lg font-bold text-white">{title}</Dialog.Title>
                  <Dialog.Close className="icon-rail-btn"><X size={18} /></Dialog.Close>
                </div>
                <div className="flex-1 overflow-y-auto p-5">{children}</div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

// -- Table columns -----------------------------------------------------
function buildColumns(navigate, onDelete, canDelete) {
  return [
    {
      header: 'Member', id: 'member',
      cell: ({ row: { original: v } }) => {
        const name = v.MemberName || v.membername || '-';
        const id   = v.MemberID   || v.memberid;
        return (
          <button onClick={() => id && navigate(`/members/${id}`)}
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-white">{getInitials(name)}</div>
            <span className="font-medium text-sm">{name}</span>
          </button>
        );
      },
    },
    { header: 'Entry Gate', id: 'eg', cell: ({ row: { original: v } }) => <span className="text-white/60 text-xs">{v.EntryGateName || v.entrygatename || '-'}</span> },
    { header: 'Exit Gate',  id: 'xg', cell: ({ row: { original: v } }) => <span className="text-white/50 text-xs">{v.ExitGateName  || v.exitgatename  || '-'}</span> },
    { header: 'Entry Time', id: 'et', cell: ({ row: { original: v } }) => <span className="text-white/60 text-xs">{formatDate(v.EntryTime || v.entrytime)}</span> },
    { header: 'Exit Time',  id: 'xt', cell: ({ row: { original: v } }) => <span className="text-white/50 text-xs">{(v.ExitTime || v.exittime) ? formatDate(v.ExitTime || v.exittime) : '-'}</span> },
    { header: 'Duration',   id: 'dur',cell: ({ row: { original: v } }) => <span className="text-white/50 text-xs">{formatDuration(v.EntryTime || v.entrytime, v.ExitTime || v.exittime)}</span> },
    { header: 'Vehicle',    id: 'veh',cell: ({ row: { original: v } }) => (v.VehiclePlate || v.vehicleplate || v.VehicleReg || v.vehiclereg) ? <span className="plate text-[10px]">{v.VehiclePlate || v.vehicleplate || v.VehicleReg || v.vehiclereg}</span> : <span className="text-white/25">-</span> },
    {
      header: 'Status', id: 'status',
      cell: ({ row: { original: v } }) => (v.IsActive || v.isactive)
        ? <span className="badge badge-success text-[10px] flex items-center gap-1"><span className="status-dot active" />Active</span>
        : <span className="badge badge-muted text-[10px]">Completed</span>,
    },
    canDelete && {
      header: 'Actions', id: 'actions', enableSorting: false,
      cell: ({ row: { original: v } }) => (
        <button onClick={() => onDelete(v)} className="p-1.5 rounded-lg hover:bg-red-500/15 text-white/30 hover:text-red-400 transition-colors">
          <Trash2 size={13} />
        </button>
      ),
    },
  ].filter(Boolean);
}

// -- Main page ---------------------------------------------------------
export default function PersonVisitsPage() {
  const navigate            = useNavigate();
  const [searchParams]      = useSearchParams();
  const { hasRole }         = useAuth();
  const canDelete           = hasRole('SuperAdmin');

  const [visits,       setVisits]       = useState([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [activeCount,  setActiveCount]  = useState(0);
  const [gates,        setGates]        = useState([]);
  const [activeVisits, setActiveVisits] = useState([]);
  const [showEntry,    setShowEntry]    = useState(false);
  const [showExit,     setShowExit]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);
  const [refreshSeed,  setRefreshSeed]  = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tableSorting, setTableSorting] = useState([]);
  const [selectedViewId, setSelectedViewId] = useState('');

  const { views, byId, saveView, deleteView } = useSavedViews('gateguard.savedViews.personVisits');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Entry form state
  const [entryMemberId,  setEntryMemberId]  = useState('');
  const [entryMemberLabel, setEntryMemberLabel] = useState('');
  const [entryGateId,    setEntryGateId]    = useState('');
  const [entrySubmitting, setEntrySubmitting] = useState(false);
  const [entryBlockedMemberIds, setEntryBlockedMemberIds] = useState(new Set());

  // Exit form state
  const [exitVisitId,   setExitVisitId]  = useState('');
  const [exitGateId,    setExitGateId]   = useState('');
  const [exitSubmitting, setExitSubmitting] = useState(false);

  const { page, limit, setPage } = usePagination();
  const pagination = { page, limit, total, hasNextPage: page * limit < total };

  // Read URL action param
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'entry') setShowEntry(true);
    if (action === 'exit')  setShowExit(true);
  }, [searchParams]);

  // Fetch gates once
  useEffect(() => {
    gatesApi.getAll()
      .then((r) => setGates(r?.data?.data || r?.data?.gates || r?.data || []))
      .catch(() => {});
  }, []);

  // Fetch visits
  const fetchVisits = useCallback(() => {
    setLoading(true);
    visitsApi.getPersonVisits({
      page,
      limit,
      search: debouncedSearch || undefined,
      active:
        statusFilter === 'active'
          ? true
          : statusFilter === 'completed'
            ? false
            : undefined,
    })
      .then((r) => {
        const visitsList = r?.data?.visits ?? r?.data ?? [];
        setVisits(Array.isArray(visitsList) ? visitsList : []);
        setTotal(r?.pagination?.total ?? (Array.isArray(visitsList) ? visitsList.length : 0));
        setActiveCount(r?.activeCount ?? r?.data?.activeCount ?? 0);
      })
      .catch(() => setVisits([]))
      .finally(() => setLoading(false));
  }, [page, limit, debouncedSearch, statusFilter]);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, setPage]);

  // On open exit sheet — load active visits
  useEffect(() => {
    if (!showExit) return;
    setExitVisitId('');
    setExitGateId('');
    visitsApi.getPersonVisits({ active: true, limit: 50 })
      .then((r) => {
        const d = r?.data?.data || r?.data;
        const rows = Array.isArray(d) ? d : (d?.visits ?? []);
        const deduped = [];
        const seen = new Set();
        for (const row of rows) {
          const visitId = row?.PersonVisitID || row?.personvisitid || row?.VisitID || row?.visitid;
          if (!visitId || seen.has(String(visitId))) continue;
          seen.add(String(visitId));
          deduped.push(row);
        }
        setActiveVisits(deduped);
      })
      .catch(() => {});
  }, [showExit, refreshSeed]);

  useEffect(() => {
    if (!showEntry) return;
    visitsApi.getPersonVisits({ active: true, limit: 5000, page: 1 })
      .then((r) => {
        const rows = r?.data?.visits ?? r?.data ?? [];
        const list = Array.isArray(rows) ? rows : [];
        const blocked = new Set(
          list
            .map((visit) => visit?.MemberID || visit?.memberid || visit?.PersonID || visit?.personid)
            .filter((id) => id !== undefined && id !== null)
            .map((id) => String(id))
        );
        setEntryBlockedMemberIds(blocked);
        if (entryMemberId && blocked.has(String(entryMemberId))) {
          setEntryMemberId('');
          setEntryMemberLabel('');
        }
      })
      .catch(() => {
        setEntryBlockedMemberIds(new Set());
      });
  }, [showEntry, refreshSeed, entryMemberId]);

  const handleEntry = async () => {
    if (!entryMemberId || !entryGateId) { toast.error('Please select member and gate'); return; }
    setEntrySubmitting(true);
    try {
      await visitsApi.recordPersonEntry({ memberId: Number(entryMemberId), entryGateId: Number(entryGateId) });
      toast.success('Entry recorded');
      setShowEntry(false);
      setEntryMemberId(''); setEntryMemberLabel(''); setEntryGateId('');
      setRefreshSeed(s => s + 1);
      fetchVisits();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record entry');
    } finally {
      setEntrySubmitting(false);
    }
  };

  const handleExit = async () => {
    if (!exitVisitId || !exitGateId) { toast.error('Select visit and exit gate'); return; }
    setExitSubmitting(true);
    try {
      await visitsApi.recordPersonExit(Number(exitVisitId), { exitGateId: Number(exitGateId) });
      toast.success('Exit recorded');
      setShowExit(false);
      setExitVisitId(''); setExitGateId('');
      setRefreshSeed(s => s + 1);
      fetchVisits();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record exit');
    } finally {
      setExitSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await visitsApi.deletePersonVisit(
        deleteTarget?.PersonVisitID
        || deleteTarget?.personvisitid
        || deleteTarget?.VisitID
        || deleteTarget?.visitid
      );
      toast.success('Visit deleted');
      setDeleteTarget(null);
      fetchVisits();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const columns = buildColumns(navigate, setDeleteTarget, canDelete);

  const handleSaveCurrentView = (name) => {
    if (!name.trim()) {
      toast.error('Provide a name for the saved view');
      return false;
    }
    const created = saveView(name, {
      searchQuery,
      statusFilter,
      sorting: tableSorting,
    });
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
    setSearchQuery(payload.searchQuery || '');
    setStatusFilter(payload.statusFilter || 'all');
    setTableSorting(Array.isArray(payload.sorting) ? payload.sorting : []);
    setPage(1);
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
    <div className="p-6 space-y-5 pb-20 md:pb-6">
      <PageHeader title="Person Visits" subtitle="Track member entries and exits" breadcrumb={[{ label: 'Person Visits' }]} />

      <SavedViewsBar
        title="Saved Views"
        views={views}
        selectedViewId={selectedViewId}
        onSelectView={handleApplyView}
        onSaveCurrent={handleSaveCurrentView}
        onDeleteSelected={handleDeleteCurrentView}
      />

      {/* Active visits banner */}
      <div className="glass-card p-4 border-l-[3px] border-l-emerald-500 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <span className="status-dot active" />
          <span className="text-sm font-semibold text-white/80">
            <CountUp end={activeCount} duration={1} /> Active Visit{activeCount !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input-field w-auto text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="completed">Completed Only</option>
          </select>
          <button onClick={() => setShowEntry(true)} className="btn-primary text-sm">
            <LogIn size={15} /> Record Entry
          </button>
          <button onClick={() => setShowExit(true)} className="btn-ghost text-sm">
            <LogOut size={15} /> Record Exit
          </button>
        </div>
      </div>

      {/* Main table */}
      <DataTable
        data={visits}
        columns={columns}
        loading={loading}
        pagination={pagination}
        onPageChange={setPage}
        onSearch={() => {}}
        searchValue={searchQuery}
        onSearchValueChange={setSearchQuery}
        sorting={tableSorting}
        onSortingChange={setTableSorting}
        searchPlaceholder="Search by member name..."
        emptyMessage="No person visits recorded."
      />

      {/* -- Entry Sheet ------------------------------------------ */}
      <Sheet open={showEntry} onOpenChange={setShowEntry} title="Record Person Entry">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-white/50">Member *</label>
            <MemberCombobox
              value={entryMemberId}
              label={entryMemberLabel}
              excludedIds={entryBlockedMemberIds}
              onChange={(id, label) => {
                setEntryMemberId(id);
                setEntryMemberLabel(label);
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-white/50">Entry Gate *</label>
            <select className="input-field" value={entryGateId} onChange={(e) => setEntryGateId(e.target.value)}>
              <option value="">Select gate...</option>
              {gates.map((g) => (
                <option key={g.GateID || g.gateid} value={g.GateID || g.gateid}>{g.Name || g.name}</option>
              ))}
            </select>
          </div>
          <button onClick={handleEntry} disabled={entrySubmitting} className="btn-primary w-full mt-4">
            {entrySubmitting ? <><Loader2 size={15} className="animate-spin" /> Recording...</> : <><LogIn size={15} /> Record Entry</>}
          </button>
        </div>
      </Sheet>

      {/* -- Exit Sheet ------------------------------------------- */}
      <Sheet open={showExit} onOpenChange={setShowExit} title="Record Person Exit">
        <div className="space-y-4">
          <p className="text-xs text-white/40">Select the active visit to close:</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {activeVisits.length === 0 ? (
              <p className="text-white/25 text-sm text-center py-6">No active visits</p>
            ) : activeVisits.map((v) => {
              const name = v.MemberName || v.membername || '-';
              const vid  = String(v.PersonVisitID || v.personvisitid || v.VisitID || v.visitid);
              return (
                <button key={vid} type="button" onClick={() => setExitVisitId(vid)}
                  className={cn('w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                    exitVisitId === vid
                      ? 'border-indigo-500/50 bg-indigo-500/10'
                      : 'border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.05]'
                  )}>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-white">{getInitials(name)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">{name}</p>
                    <p className="text-[10px] text-white/30">Entered {formatRelativeTime(v.EntryTime || v.entrytime)} · {v.EntryGateName || v.entrygatename}</p>
                  </div>
                  {exitVisitId === vid && <CheckCircle2 size={16} className="text-indigo-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-white/50">Exit Gate *</label>
            <select className="input-field" value={exitGateId} onChange={(e) => setExitGateId(e.target.value)}>
              <option value="">Select gate...</option>
              {gates.map((g) => (
                <option key={g.GateID || g.gateid} value={g.GateID || g.gateid}>{g.Name || g.name}</option>
              ))}
            </select>
          </div>
          <button onClick={handleExit} disabled={exitSubmitting || !exitVisitId} className="btn-primary w-full mt-4 disabled:opacity-50">
            {exitSubmitting ? <><Loader2 size={15} className="animate-spin" /> Recording...</> : <><LogOut size={15} /> Record Exit</>}
          </button>
        </div>
      </Sheet>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete Visit Record"
        description="This will permanently remove this visit record."
        onConfirm={handleDelete}
        loading={deleting}
        variant="danger"
      />
    </div>
  );
}

