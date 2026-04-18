// src/pages/admin/AuditPage.jsx
// Audit logs - color-coded custom table + slide-in detail drawer + JSON diff viewer

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Popover from '@radix-ui/react-popover';
import {
  ClipboardList, X, ChevronLeft, ChevronRight, CalendarDays,
} from 'lucide-react';
import {
  addMonths, subMonths, format, parseISO,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, isToday, setMonth, setYear,
} from 'date-fns';
import * as auditApi from '@/api/audit.api';
import * as usersApi from '@/api/users.api';
import { useAuth }   from '@/context/AuthContext';
import { usePagination } from '@/hooks/usePagination';
import PageHeader    from '@/components/shared/PageHeader';
import RoleBadge     from '@/components/shared/RoleBadge';
import EmptyState    from '@/components/shared/EmptyState';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import { pageVariants, fadeInUp, slideInRight, backdropVariants } from '@/lib/motion';

function pickField(obj, keys = []) {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function DatePickerField({ value, onChange, placeholder = 'Select date' }) {
  const parsed = value ? parseISO(value) : null;
  const selectedDate = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;

  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 31 }, (_, i) => currentYear - 15 + i);

  useEffect(() => {
    if (selectedDate) setViewDate(selectedDate);
  }, [value]);

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button type="button" className="input-field w-auto min-w-[170px] text-xs flex items-center justify-between gap-2">
          <span className={selectedDate ? 'text-white/85' : 'text-white/35'}>
            {selectedDate ? format(selectedDate, 'dd MMM yyyy') : placeholder}
          </span>
          <CalendarDays size={14} className="text-white/35" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="start"
          className="z-[220] w-[290px] rounded-2xl border border-white/10 bg-[hsl(228_40%_8%)] shadow-2xl p-3"
        >
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewDate((d) => subMonths(d, 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <div className="flex items-center gap-1.5">
              <select
                value={viewDate.getMonth()}
                onChange={(e) => setViewDate((d) => setMonth(d, Number(e.target.value)))}
                className="h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] px-2 text-xs font-medium text-white/85 focus:outline-none"
              >
                {monthNames.map((month, idx) => (
                  <option key={month} value={idx} className="bg-[hsl(228_40%_8%)] text-white">{month}</option>
                ))}
              </select>
              <select
                value={viewDate.getFullYear()}
                onChange={(e) => setViewDate((d) => setYear(d, Number(e.target.value)))}
                className="h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] px-2 text-xs font-medium text-white/85 focus:outline-none"
              >
                {years.map((y) => (
                  <option key={y} value={y} className="bg-[hsl(228_40%_8%)] text-white">{y}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setViewDate((d) => addMonths(d, 1))}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="text-[10px] font-semibold uppercase tracking-wider text-white/30 text-center py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const inMonth = isSameMonth(day, monthStart);
              const selected = selectedDate ? isSameDay(day, selectedDate) : false;
              const today = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => {
                    onChange(format(day, 'yyyy-MM-dd'));
                    setOpen(false);
                  }}
                  className={cn(
                    'h-8 rounded-lg text-xs font-medium transition-all',
                    inMonth ? 'text-white/80' : 'text-white/25',
                    'hover:bg-white/[0.08] hover:text-white',
                    today && !selected && 'ring-1 ring-indigo-400/40',
                    selected && 'bg-indigo-500/25 text-indigo-200 ring-1 ring-indigo-400/70 shadow-[0_0_0_1px_rgba(99,102,241,0.25)]'
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pt-2 border-t border-white/[0.08] flex items-center justify-between">
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-[11px] font-medium text-white/50 hover:text-white/80 transition-colors"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                onChange(format(today, 'yyyy-MM-dd'));
                setViewDate(today);
                setOpen(false);
              }}
              className="text-[11px] font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
            >
              Today
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// Action config
const ACTION_COLOR = {
  CREATE: 'border-emerald-500',
  UPDATE: 'border-amber-500',
  DELETE: 'border-red-500',
  READ:   'border-sky-500/30',
};
const ACTION_BADGE = {
  CREATE: 'badge-success',
  UPDATE: 'text-amber-400 bg-amber-500/10 border border-amber-500/20',
  DELETE: 'bg-red-500/10 text-red-400 border border-red-500/20',
  READ:   'badge-primary',
};

// JSON pretty printer
function JsonBlock({ label, value, tint }) {
  const text = (() => {
    try {
      if (!value) return null;
      return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    } catch { return String(value); }
  })();
  if (!text) return null;
  return (
    <div className={cn('rounded-xl p-3 flex-1 min-w-0', tint)}>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 text-white/40">{label}</p>
      <pre className="text-[10px] font-mono text-white/70 overflow-x-auto whitespace-pre-wrap break-words">
        {text}
      </pre>
    </div>
  );
}

// Main page
export default function AuditPage() {
  const [logs,         setLogs]         = useState([]);
  const [total,        setTotal]        = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [users,        setUsers]        = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [panelOpen,    setPanelOpen]    = useState(false);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');
  const [userId,    setUserId]    = useState('');
  const [actions,   setActions]   = useState([]); // [] = all

  const { page, limit, setPage } = usePagination(1, 30);

  useEffect(() => {
    usersApi.getAll()
      .then((r) => setUsers(r?.data?.data || r?.data?.users || r?.data || []))
      .catch(() => {});
  }, []);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = {
      page, limit,
      startDate: startDate || undefined,
      endDate:   endDate   || undefined,
      userId:    userId    || undefined,
      action:    actions.length === 1 ? actions[0] : undefined,
    };
    auditApi.getAll(params)
      .then((r) => {
        const logsList = r?.data?.logs ?? r?.data ?? [];
        setLogs(Array.isArray(logsList) ? logsList : []);
        setTotal(r?.pagination?.total ?? (Array.isArray(logsList) ? logsList.length : 0));
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [page, limit, startDate, endDate, userId, actions]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const toggleAction = (a) =>
    setActions((prev) => prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]);

  const openDetail = (log) => { setSelected(log); setPanelOpen(true); };
  const clearFilters = () => { setStartDate(''); setEndDate(''); setUserId(''); setActions([]); setPage(1); };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate"
      className="p-6 space-y-5 pb-20 md:pb-6">
      <PageHeader
        title="Audit Logs"
        subtitle={`${total} log${total !== 1 ? 's' : ''} recorded`}
        breadcrumb={[{ label: 'Admin' }, { label: 'Audit' }]}
      />

      {/* Filters */}
      <motion.div variants={fadeInUp} initial="initial" animate="animate" className="glass-card p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <DatePickerField value={startDate} onChange={setStartDate} placeholder="Start date" />
          <span className="text-white/30 text-xs">to</span>
          <DatePickerField value={endDate} onChange={setEndDate} placeholder="End date" />
          <select className="input-field w-auto text-xs" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u.UserID || u.userid} value={u.UserID || u.userid}>{u.Username || u.username}</option>
            ))}
          </select>
          {(startDate || endDate || userId || actions.length > 0) && (
            <button onClick={clearFilters} className="btn-ghost text-xs px-3 py-2">Clear</button>
          )}
        </div>
        {/* Action pills */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'CREATE', cls: actions.includes('CREATE') ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'text-white/30 bg-white/[0.04] border-white/[0.08]' },
            { key: 'UPDATE', cls: actions.includes('UPDATE') ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'text-white/30 bg-white/[0.04] border-white/[0.08]' },
            { key: 'DELETE', cls: actions.includes('DELETE') ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'text-white/30 bg-white/[0.04] border-white/[0.08]' },
          ].map(({ key, cls }) => (
            <button key={key} onClick={() => toggleAction(key)}
              className={cn('px-3 py-1 rounded-full text-xs font-semibold border transition-all', cls)}>
              {key}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Custom color-coded table */}
      {loading ? (
        <div className="glass-card rounded-xl overflow-hidden">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 border-b border-white/[0.04] border-l-4 border-l-white/[0.08]">
              <div className="skeleton h-3 w-20 rounded" />
              <div className="skeleton h-3 w-16 rounded" />
              <div className="skeleton h-4 w-14 rounded-full" />
              <div className="skeleton h-3 w-24 rounded ml-auto" />
            </div>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No audit logs" description="Activity will be logged here as users make changes." />
      ) : (
        <div className="glass-card rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {['Time', 'User', 'Role', 'Action', 'Table', 'Record', 'IP'].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-white/25 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => {
                const timeValue = pickField(log, ['Timestamp', 'timestamp', 'CreatedAt', 'createdat']);
                const username = pickField(log, ['Username', 'username', 'UserName', 'userName']);
                const userIdValue = pickField(log, ['UserID', 'userid']);
                const roleValue = pickField(log, ['RoleName', 'rolename', 'Role', 'role']);
                const tableValue = pickField(log, ['TableName', 'tablename']);
                const recordValue = pickField(log, ['RecordID', 'recordid']);
                const ipValue = pickField(log, ['IPAddress', 'ipaddress']);
                const action    = (log.Action || log.action || '').toUpperCase();
                const rowBorder = ACTION_COLOR[action] || 'border-white/10';
                const badgeCls  = ACTION_BADGE[action] || 'badge-muted';
                return (
                  <tr key={log.LogID || log.logid || i}
                    onClick={() => openDetail(log)}
                    className={cn('border-b border-white/[0.04] border-l-4 cursor-pointer hover:bg-white/[0.025] transition-colors', rowBorder)}>
                    <td className="px-3 py-2.5 text-white/50 whitespace-nowrap">
                      {timeValue ? formatRelativeTime(timeValue) : '--'}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-white/70">{username || (userIdValue ? `user#${userIdValue}` : '-')}</td>
                    <td className="px-3 py-2.5"><RoleBadge role={roleValue || '-'} size="xs" /></td>
                    <td className="px-3 py-2.5">
                      <span className={cn('badge text-[10px]', badgeCls)}>{action}</span>
                    </td>
                    <td className="px-3 py-2.5 text-white/50 font-mono">{tableValue || '-'}</td>
                    <td className="px-3 py-2.5 text-white/40 tabular-nums">{recordValue || '-'}</td>
                    <td className="px-3 py-2.5 text-white/30 font-mono">{ipValue || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] text-xs text-white/30">
            <span>{total} total</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="btn-ghost px-3 py-1 text-xs disabled:opacity-30">← Prev</button>
              <span className="text-white/50">{page} / {Math.ceil(total / limit) || 1}</span>
              <button onClick={() => setPage(page + 1)} disabled={page * limit >= total} className="btn-ghost px-3 py-1 text-xs disabled:opacity-30">Next →</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <AnimatePresence>
        {panelOpen && selected && (
          <>
            <motion.div variants={backdropVariants} initial="initial" animate="animate" exit="exit"
              onClick={() => setPanelOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
            <motion.div variants={slideInRight} initial="initial" animate="animate" exit="exit"
              className="fixed inset-y-0 right-0 z-50 w-full max-w-[520px]
                         bg-[hsl(228_40%_7%)] border-l border-white/[0.08] flex flex-col overflow-hidden">
              {/* Drawer header */}
              <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('badge text-[10px]', ACTION_BADGE[(selected.Action || selected.action || '').toUpperCase()] || 'badge-muted')}>
                    {(selected.Action || selected.action || '').toUpperCase()}
                  </span>
                  <span className="text-white/60 font-mono text-sm">{selected.TableName || selected.tablename}</span>
                  <span className="text-white/25 text-xs">#{selected.RecordID || selected.recordid}</span>
                </div>
                <button onClick={() => setPanelOpen(false)} className="icon-rail-btn flex-shrink-0"><X size={18} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'User',      value: pickField(selected, ['Username', 'username', 'UserName', 'userName']) || (pickField(selected, ['UserID', 'userid']) ? `user#${pickField(selected, ['UserID', 'userid'])}` : null) },
                    { label: 'Role',      value: pickField(selected, ['RoleName', 'rolename', 'Role', 'role']) },
                    { label: 'IP',        value: pickField(selected, ['IPAddress', 'ipaddress']) },
                    { label: 'Method',    value: pickField(selected, ['Method', 'method']) },
                    { label: 'Endpoint',  value: pickField(selected, ['Endpoint', 'endpoint']) },
                    { label: 'Timestamp', value: (() => {
                        const ts = pickField(selected, ['Timestamp', 'timestamp', 'CreatedAt', 'createdat']);
                        return ts ? formatDate(ts) : null;
                      })() },
                  ].map(({ label, value }) => value ? (
                    <div key={label} className="glass-card p-2.5">
                      <p className="text-white/30 text-[10px] mb-0.5">{label}</p>
                      <p className="text-white/75 font-mono truncate">{value}</p>
                    </div>
                  ) : null)}
                </div>

                {/* JSON diff viewer */}
                {(selected.OldValue || selected.oldvalue || selected.NewValue || selected.newvalue) && (
                  <div>
                    <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-2">Changes</p>
                    <div className="flex gap-3 flex-wrap">
                      <JsonBlock
                        label="Before"
                        value={selected.OldValue || selected.oldvalue}
                        tint="bg-red-500/[0.06] border border-red-500/10"
                      />
                      <JsonBlock
                        label="After"
                        value={selected.NewValue || selected.newvalue}
                        tint="bg-emerald-500/[0.06] border border-emerald-500/10"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

