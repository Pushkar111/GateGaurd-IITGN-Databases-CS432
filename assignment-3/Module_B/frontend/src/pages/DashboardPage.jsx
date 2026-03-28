// src/pages/DashboardPage.jsx
// "Security Operations Center" — full production dashboard

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, RadialBarChart, RadialBar,
} from 'recharts';
import {
  Users, Activity, Car, DoorOpen, TrendingUp,
  ClipboardList, LogOut, UserPlus, ArrowRight, ShieldAlert, Timer, Siren, Eye,
} from 'lucide-react';
import { useAuth }       from '@/context/AuthContext';
import * as dashboardApi from '@/api/dashboard.api';
import * as usersApi from '@/api/users.api';
import * as gatesApi from '@/api/gates.api';
import * as auditApi from '@/api/audit.api';
import StatCard          from '@/components/shared/StatCard';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { buildDashboardQuickActions } from '@/lib/dashboardQuickActions';
import {
  pageVariants, staggerContainer, staggerItem, fadeInUp, cardHover,
} from '@/lib/motion';

// -- Time-based greeting -----------------------------------------------
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Good Night';
}

// -- Custom recharts tooltip -------------------------------------------
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[hsl(228_35%_10%)] border border-white/10 rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="text-white/50 mb-1.5 font-medium">{label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-0.5">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-white/70">{p.name}:</span>
          <span className="text-white font-semibold">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// -- Gate occupancy color ----------------------------------------------
function gateColor(count, capacity = 100) {
  const pct = count / capacity;
  if (pct < 0.5) return '#10b981'; // emerald
  if (pct < 0.8) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

// -- QuickAction card --------------------------------------------------
function QuickActionCard({ icon: Icon, label, sublabel, color, onClick }) {
  return (
    <motion.button
      variants={cardHover}
      initial="rest"
      whileHover="hover"
      onClick={onClick}
      className="glass-card p-4 text-left w-full flex items-center gap-3 group"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white/80">{label}</p>
        <p className="text-xs text-white/35 truncate">{sublabel}</p>
      </div>
      <ArrowRight size={14} className="text-white/20 group-hover:text-white/50 flex-shrink-0 transition-colors" />
    </motion.button>
  );
}

// -- Main component -----------------------------------------------------
export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const navigate        = useNavigate();

  const [stats,    setStats]    = useState(null);
  const [trend,    setTrend]    = useState([]);
  const [activity, setActivity] = useState([]);
  const [roleInsights, setRoleInsights] = useState({
    pendingRequests: 0,
    overCapacityGates: [],
    deleteBursts24h: 0,
    overrideUpdates24h: 0,
  });
  const [loading,  setLoading]  = useState(true);

  const fetchCoreDashboard = () => {
    return Promise.all([
      dashboardApi.getStats(),
      dashboardApi.getVisitTrend(),
      dashboardApi.getRecentActivity(),
    ])
      .then(([s, t, a]) => {
        setStats(   s?.data?.data   ?? s?.data   ?? s   ?? null);
        setTrend(   t?.data?.data?.trend    ?? t?.data?.trend    ?? t?.trend    ?? []);
        setActivity(a?.data?.data?.activity ?? a?.data?.activity ?? a?.activity ?? []);
      })
      .catch(() => {});
  };

  // Fetch core dashboard data + keep it warm in background for role home screens.
  useEffect(() => {
    let mounted = true;

    fetchCoreDashboard().finally(() => {
      if (mounted) setLoading(false);
    });

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') fetchCoreDashboard();
    }, 20000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchCoreDashboard();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mounted = false;
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    const isAdmin = hasRole('Admin', 'SuperAdmin');
    const isSuperAdmin = hasRole('SuperAdmin');

    if (!isAdmin) {
      setRoleInsights({
        pendingRequests: 0,
        overCapacityGates: [],
        deleteBursts24h: 0,
        overrideUpdates24h: 0,
      });
      return;
    }

    const fetchRoleInsights = () => {
      const requestsPromise = usersApi.getPendingRequests();
      const occupancyPromise = gatesApi.getAllOccupancy();
      const auditPromise = isSuperAdmin ? auditApi.getAll({ page: 1, limit: 200 }) : Promise.resolve(null);

      Promise.all([requestsPromise, occupancyPromise, auditPromise])
        .then(([pendingRes, occupancyRes, auditRes]) => {
          const pendingList = pendingRes?.data?.data?.requests || pendingRes?.data?.requests || pendingRes?.data || [];
          const occupancyList = occupancyRes?.data?.data || occupancyRes?.data?.occupancy || occupancyRes?.data || [];

          const normalizedOccupancy = Array.isArray(occupancyList) ? occupancyList : [];
          const overCapacity = normalizedOccupancy.filter((row) => {
            const count = Number(row?.OccupancyCount ?? row?.occupancycount ?? 0);
            const limit = Number(row?.CapacityLimit ?? row?.capacitylimit ?? 20);
            return Number.isFinite(count) && Number.isFinite(limit) && count > limit;
          });

          let deleteBursts24h = 0;
          let overrideUpdates24h = 0;

          if (auditRes) {
            const logs = auditRes?.data?.logs ?? auditRes?.data ?? [];
            const now = Date.now();
            const dayMs = 24 * 60 * 60 * 1000;
            for (const log of Array.isArray(logs) ? logs : []) {
              const action = String(log?.Action || log?.action || '').toUpperCase();
              const tableName = String(log?.TableName || log?.tablename || '').toLowerCase();
              const at = new Date(log?.Timestamp || log?.timestamp || log?.CreatedAt || log?.createdat || 0).getTime();
              if (!at || now - at > dayMs) continue;
              if (action === 'DELETE') deleteBursts24h += 1;
              if (action === 'UPDATE' && tableName.includes('gateoccupancy')) overrideUpdates24h += 1;
            }
          }

          setRoleInsights({
            pendingRequests: Array.isArray(pendingList) ? pendingList.length : 0,
            overCapacityGates: overCapacity,
            deleteBursts24h,
            overrideUpdates24h,
          });
        })
        .catch(() => {
          setRoleInsights((prev) => ({
            ...prev,
            pendingRequests: 0,
            overCapacityGates: [],
            deleteBursts24h: 0,
            overrideUpdates24h: 0,
          }));
        });
    };

    fetchRoleInsights();
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') fetchRoleInsights();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [hasRole]);

  const today          = formatDate(new Date(), 'EEEE, dd MMMM yyyy');
  const username       = user?.Username || user?.username || 'Guard';
  const activePersons  = stats?.activePersonVisits  ?? 0;
  const activeVehicles = stats?.activeVehicleVisits ?? 0;
  const totalMembers   = stats?.totalMembers        ?? 0;
  const canManageMasterData = hasRole('Admin', 'SuperAdmin');
  const isGuard = hasRole('Guard');
  const isSuperAdmin = hasRole('SuperAdmin');
  const isAdmin = hasRole('Admin');
  const quickActionIconMap = {
    ClipboardList,
    LogOut,
    Car,
    Activity,
    UserPlus,
  };
  const quickActions = buildDashboardQuickActions({ isGuard, canManageMasterData }).map((action) => ({
    ...action,
    icon: quickActionIconMap[action.iconKey] || ClipboardList,
    onClick: () => navigate(action.to),
  }));

  // Build gate occupancy radial data
  const gateData = (stats?.gateOccupancy ?? []).map((g) => ({
    name:  g.Name || g.name,
    value: g.OccupancyCount || g.occupancycount || 0,
    fill:  gateColor(g.OccupancyCount || g.occupancycount || 0),
  }));

  // Format trend dates to short day names
  const trendData = trend.map((t) => ({
    ...t,
    date:         t.date ? formatDate(t.date + 'T00:00:00', 'EEE') : t.date,
    personVisits: t.personVisits  ?? t.personvisits  ?? 0,
    vehicleVisits:t.vehicleVisits ?? t.vehiclevisits ?? 0,
  }));

  const roleHeadline = isGuard
    ? 'Guard Live Desk'
    : isSuperAdmin
      ? 'Governance and Risk Desk'
      : isAdmin
        ? 'Operations Exception Desk'
        : 'Operations Desk';

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      className="p-6 space-y-6 pb-20 md:pb-6"
    >
      {/* -- Welcome Hero ------------------------------------------- */}
      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        className="glass-card p-5 border-l-[3px] border-l-indigo-500"
      >
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">
              {getGreeting()}, {username} 👋
            </h2>
            <p className="text-white/40 text-sm mt-0.5">{today}</p>
            {!loading && (
              <p className="text-white/50 text-xs mt-2">
                <span className="text-emerald-400 font-semibold">{activePersons}</span> active person visits
                &nbsp;·&nbsp;
                <span className="text-amber-400 font-semibold">{activeVehicles}</span> vehicles on campus
              </p>
            )}
          </div>
          <div className="text-right text-xs text-white/25">
            <p className="font-semibold text-white/40">IIT Gandhinagar</p>
            <p>Security Operations Center</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        transition={{ delay: 0.1 }}
        className="glass-card p-5"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-white/35 font-semibold">Role Workspace</p>
            <h3 className="text-sm font-semibold text-white/80 mt-1">{roleHeadline}</h3>
          </div>
          <button className="btn-ghost text-xs px-3 py-1.5" onClick={() => navigate('/visits/active')}>
            <Eye size={13} /> Open Live Visits
          </button>
        </div>

        {isGuard ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
              <p className="text-[10px] uppercase tracking-widest text-emerald-300/80 font-semibold">Live Queue</p>
              <p className="text-xl font-bold text-emerald-200 mt-1">{activePersons + activeVehicles}</p>
              <p className="text-xs text-white/55 mt-1">Active people and vehicles in campus queue</p>
            </div>
            <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-3">
              <p className="text-[10px] uppercase tracking-widest text-indigo-300/80 font-semibold">Shift Throughput</p>
              <p className="text-xl font-bold text-indigo-200 mt-1">{trendData.reduce((sum, d) => sum + d.personVisits + d.vehicleVisits, 0)}</p>
              <p className="text-xs text-white/55 mt-1">Entries captured over last 7 days</p>
            </div>
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
              <p className="text-[10px] uppercase tracking-widest text-amber-300/80 font-semibold">Recommended Action</p>
              <p className="text-sm font-semibold text-amber-200 mt-1">Exit Backlog First</p>
              <button
                className="btn-ghost text-xs px-0 py-0 h-auto text-amber-200/90 mt-1"
                onClick={() => navigate('/visits/active?tab=exits')}
              >
                Open active exits queue
              </button>
            </div>
          </div>
        ) : null}

        {!isGuard ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-3">
              <p className="text-[10px] uppercase tracking-widest text-indigo-300/80 font-semibold">Pending Approvals</p>
              <p className="text-xl font-bold text-indigo-200 mt-1">{roleInsights.pendingRequests}</p>
              <button
                className="btn-ghost text-xs px-0 py-0 h-auto text-indigo-200/90 mt-1"
                onClick={() => navigate('/admin/users?view=pending')}
              >
                Open approval queue
              </button>
            </div>

            <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-3">
              <p className="text-[10px] uppercase tracking-widest text-red-300/80 font-semibold">Over-Capacity Gates</p>
              <p className="text-xl font-bold text-red-200 mt-1">{roleInsights.overCapacityGates.length}</p>
              <p className="text-xs text-white/55 mt-1 truncate">
                {roleInsights.overCapacityGates.length > 0
                  ? roleInsights.overCapacityGates
                    .slice(0, 2)
                    .map((row) => row?.Name || row?.name || `Gate ${row?.GateID || row?.gateid}`)
                    .join(', ')
                  : 'All gates currently within configured limit'}
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
              <p className="text-[10px] uppercase tracking-widest text-amber-300/80 font-semibold">Escalation Needed</p>
              <p className="text-sm font-semibold text-amber-200 mt-1">
                {roleInsights.overCapacityGates.length > 0 || roleInsights.pendingRequests > 0
                  ? 'Action recommended now'
                  : 'No escalations in queue'}
              </p>
              <button className="btn-ghost text-xs px-0 py-0 h-auto text-amber-200/90 mt-1" onClick={() => navigate('/gates')}>
                Review gate status
              </button>
            </div>
          </div>
        ) : null}

        {isSuperAdmin ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 flex items-start gap-2">
              <Siren size={15} className="text-rose-300 mt-0.5" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-rose-300/80 font-semibold">Delete Activity (24h)</p>
                <p className="text-lg font-bold text-rose-200 mt-1">{roleInsights.deleteBursts24h}</p>
                <p className="text-xs text-white/55">Potential anomaly signal for governance review</p>
              </div>
            </div>

            <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-3 flex items-start gap-2">
              <ShieldAlert size={15} className="text-cyan-300 mt-0.5" />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-cyan-300/80 font-semibold">Occupancy Overrides (24h)</p>
                <p className="text-lg font-bold text-cyan-200 mt-1">{roleInsights.overrideUpdates24h}</p>
                <button className="btn-ghost text-xs px-0 py-0 h-auto text-cyan-200/90 mt-1" onClick={() => navigate('/admin/audit')}>
                  Open governance audit
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </motion.div>

      {/* -- Stat Cards --------------------------------------------- */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <motion.div variants={staggerItem}>
          <StatCard title="Total Members"    value={totalMembers}   icon={Users}     color="indigo"  loading={loading} />
        </motion.div>
        <motion.div variants={staggerItem}>
          <StatCard title="Active Visits"    value={activePersons}  icon={Activity}  color="emerald" loading={loading} trend={activePersons > 0 ? 5 : 0} trendLabel="vs yesterday" />
        </motion.div>
        <motion.div variants={staggerItem}>
          <StatCard title="Vehicles on Campus" value={activeVehicles} icon={Car}    color="amber"   loading={loading} />
        </motion.div>
        <motion.div variants={staggerItem}>
          <StatCard title="Gates Active"     value={stats?.gateOccupancy?.length ?? 0} icon={DoorOpen} color="red" loading={loading} />
        </motion.div>
      </motion.div>

      {/* -- Charts row --------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Visit trend — AreaChart */}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.15 }}
          className="lg:col-span-2 glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-indigo-400" />
            <h3 className="text-sm font-semibold text-white/70">Visit Trend - Last 7 Days</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="colorPersonVisits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorVehicleVisits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.2)"
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="rgba(255,255,255,0.2)"
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <ReTooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="personVisits"
                name="Person Visits"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#colorPersonVisits)"
                isAnimationActive
              />
              <Area
                type="monotone"
                dataKey="vehicleVisits"
                name="Vehicle Visits"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorVehicleVisits)"
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Gate occupancy — RadialBarChart */}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.2 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <DoorOpen size={16} className="text-white/50" />
            <h3 className="text-sm font-semibold text-white/70">Gate Occupancy</h3>
          </div>
          {gateData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <RadialBarChart
                  innerRadius="25%"
                  outerRadius="90%"
                  barSize={14}
                  data={gateData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={6}
                    background={{ fill: 'rgba(255,255,255,0.04)' }}
                    isAnimationActive
                  />
                  <ReTooltip content={<ChartTooltip />} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {gateData.map((g) => (
                  <div key={g.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: g.fill }} />
                      <span className="text-white/50 truncate max-w-[120px]">{g.name}</span>
                    </div>
                    <span className="text-white/70 font-semibold tabular-nums">{g.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-white/25 text-sm">
              {loading ? 'Loading...' : 'No gate data'}
            </div>
          )}
        </motion.div>
      </div>

      {/* -- Bottom row --------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent Activity */}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.25 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity size={16} className="text-emerald-400" />
            <h3 className="text-sm font-semibold text-white/70">Recent Activity</h3>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton w-2 h-2 rounded-full flex-shrink-0" />
                  <div className="skeleton h-3 rounded flex-1" />
                  <div className="skeleton h-3 rounded w-16 flex-shrink-0" />
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-white/25 text-sm text-center py-10">No recent activity</p>
          ) : (
            <div className="max-h-64 overflow-y-auto no-scrollbar space-y-1">
              <motion.ul variants={staggerContainer} initial="initial" animate="animate">
                {activity.map((item, i) => {
                  const isPerson = item.type === 'person';
                  const dotColor = item.status === 'active' ? 'bg-emerald-400' : 'bg-white/20';
                  const subject  = item.subject || '—';
                  const action   = item.status === 'active' ? 'entered via' : 'exited';
                  const gate     = item.gate || '—';
                  return (
                    <motion.li
                      key={i}
                      variants={staggerItem}
                      className="flex items-center gap-2.5 py-2 border-b border-white/[0.04] last:border-0"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/70 truncate">
                          <span className="font-medium text-white/85">{subject}</span>
                          {' '}{action}&nbsp;
                          <span className="text-indigo-300">{gate}</span>
                        </p>
                      </div>
                      <span className="text-[10px] text-white/25 flex-shrink-0 tabular-nums">
                        {formatRelativeTime(item.time)}
                      </span>
                    </motion.li>
                  );
                })}
              </motion.ul>
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.3 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList size={16} className="text-indigo-400" />
            <h3 className="text-sm font-semibold text-white/70">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {quickActions.map((action) => (
              <QuickActionCard
                key={action.label}
                icon={action.icon}
                label={action.label}
                sublabel={action.sublabel}
                color={action.color}
                onClick={action.onClick}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

