// src/pages/MemberPortfolioPage.jsx
// The showpiece member portfolio — LinkedIn-meets-security-badge design

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate }     from 'react-router-dom';
import { motion, AnimatePresence }    from 'framer-motion';
import { format, subDays, parseISO, startOfDay } from 'date-fns';
import CountUp from 'react-countup';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTip, ResponsiveContainer,
} from 'recharts';
import {
  Mail, Phone, Calendar, Lock, Car, GraduationCap,
  Users2, Briefcase, UserCircle2, ShieldCheck, ChevronRight,
} from 'lucide-react';
import * as membersApi from '@/api/members.api';
import * as visitsApi  from '@/api/visits.api';
import { useAuth }     from '@/context/AuthContext';
import EmptyState      from '@/components/shared/EmptyState';
import { cn, getInitials, formatDate, formatRelativeTime, formatDuration } from '@/lib/utils';
import { pageVariants, staggerContainer, staggerItem, fadeInUp } from '@/lib/motion';

// ── Constants ─────────────────────────────────────────────────────────
const CIRCUMFERENCE = 2 * Math.PI * 28; // small rings r=28

const RING_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#a855f7'];
const GRAD_CLASSES = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
];

function charHash(s = '') {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
  return h;
}
function memberGrad(name) { return GRAD_CLASSES[charHash(name) % GRAD_CLASSES.length]; }

// ── Small SVG stat ring ───────────────────────────────────────────────
function StatRing({ label, value, max = 100, color = '#6366f1' }) {
  const pct    = Math.min((value || 0) / (max || 1), 1);
  const offset = CIRCUMFERENCE * (1 - pct);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
          <circle cx="40" cy="40" r="28" fill="none" stroke="hsl(228 35% 15%)" strokeWidth="7" />
          <motion.circle cx="40" cy="40" r="28" fill="none" stroke={color} strokeWidth="7"
            strokeLinecap="round" strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold text-white tabular-nums leading-none">
            <CountUp end={value || 0} duration={1.4} />
          </span>
        </div>
      </div>
      <span className="text-[10px] text-white/40 text-center leading-tight">{label}</span>
    </div>
  );
}

// ── Member type icon ──────────────────────────────────────────────────
function TypeIcon({ type }) {
  const t = (type || '').toLowerCase();
  if (t.includes('faculty') || t.includes('staff')) return <Briefcase size={16} className="text-indigo-400" />;
  if (t.includes('student'))                          return <GraduationCap size={16} className="text-amber-400" />;
  return <Users2 size={16} className="text-emerald-400" />;
}

export default function MemberPortfolioPage() {
  const { id }           = useParams();
  const navigate         = useNavigate();
  const { user, hasRole } = useAuth();

  const [member,  setMember]  = useState(null);
  const [visits,  setVisits]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      membersApi.getById(id),
      visitsApi.getPersonVisits({ memberId: id, limit: 200 }),
    ])
      .then(([mr, vr]) => {
        const m = mr?.data?.data || mr?.data?.member || mr?.data;
        if (!m) { setNotFound(true); return; }
        setMember(m);
        const d = vr?.data?.data || vr?.data;
        setVisits(Array.isArray(d) ? d : (d?.visits ?? []));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  // Access control — admin/SA can see all, member can only see own
  const hasAccess = useMemo(() => {
    if (hasRole('Admin', 'SuperAdmin')) return true;
    const uid = user?.MemberID || user?.memberid || user?.memberId || user?.id;
    return uid !== undefined && uid == id;
  }, [user, id, hasRole]);

  // Visit stats
  const stats = useMemo(() => {
    const now   = new Date();
    const todayS  = startOfDay(now).getTime();
    const weekS   = startOfDay(subDays(now, 7)).getTime();
    const monthS  = startOfDay(subDays(now, 30)).getTime();
    const toTS = (v) => new Date(v.EntryTime || v.entrytime || 0).getTime();
    return {
      total:    visits.length,
      today:    visits.filter((v) => toTS(v) >= todayS).length,
      thisWeek: visits.filter((v) => toTS(v) >= weekS).length,
      thisMonth:visits.filter((v) => toTS(v) >= monthS).length,
      active:   visits.filter((v) => v.IsActive || v.isactive).length,
    };
  }, [visits]);

  // Visit timeline — counts per day for last 30 days
  const chartData = useMemo(() => {
    const dayMap = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(now, i), 'dd MMM');
      dayMap[d] = 0;
    }
    visits.forEach((v) => {
      try {
        const d = format(parseISO(v.EntryTime || v.entrytime || new Date().toISOString()), 'dd MMM');
        if (dayMap[d] !== undefined) dayMap[d]++;
      } catch { /* skip */ }
    });
    return Object.entries(dayMap).map(([date, count]) => ({ date, count }));
  }, [visits]);

  // Days as member
  const daysAsMember = useMemo(() => {
    if (!member) return 0;
    const joined = member.CreatedAt || member.createdat;
    if (!joined) return 0;
    return Math.floor((Date.now() - new Date(joined).getTime()) / 86400000);
  }, [member]);

  // Last 10 visits for timeline
  const recentVisits = visits.slice(0, 10);

  if (loading) return (
    <div className="p-6 space-y-5">
      <div className="glass-card p-8 flex flex-col items-center gap-4">
        <div className="skeleton w-32 h-32 rounded-full" />
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-4 w-32 rounded" />
      </div>
      <div className="grid grid-cols-3 gap-4">{Array.from({length:6}).map((_,i)=><div key={i} className="skeleton h-28 rounded-xl"/>)}</div>
    </div>
  );

  if (notFound) return (
    <div className="p-6"><EmptyState icon={UserCircle2} title="Member not found"
      action={<button onClick={() => navigate('/members')} className="btn-primary text-sm">← Back to Members</button>} /></div>
  );

  const name       = member.Name        || member.name        || '—';
  const email      = member.Email       || member.email       || '';
  const phone      = member.ContactNumber || member.contactnumber || '';
  const dept       = member.Department  || member.department  || '';
  const typeName   = member.TypeName    || member.typename    || 'Member';
  const createdAt  = member.CreatedAt   || member.createdat;
  const vehicles   = member.vehicles   || [];

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate"
      className="p-6 space-y-6 pb-20 md:pb-6">

      {/* ── Hero Section ──────────────────────────────────────── */}
      <motion.div variants={fadeInUp} initial="initial" animate="animate" className="glass-card p-8">
        <div className="flex flex-col items-center text-center gap-5">
          {/* Spinning gradient ring + avatar */}
          <div className="relative">
            {/* Outer spinning ring */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, #6366f1, #a78bfa, #f472b6, #6366f1)',
                animation: 'spin 8s linear infinite',
                padding: '4px',
              }}
            />
            {/* Inner fill to create ring effect */}
            <div className="relative w-36 h-36 rounded-full p-1"
              style={{ background: 'conic-gradient(from 0deg, #6366f1, #a78bfa, #f472b6, #6366f1)', animation: 'spin 8s linear infinite' }}>
              <div className="w-full h-full rounded-full bg-[hsl(228_40%_7%)] flex items-center justify-center">
                <div className={cn('w-28 h-28 rounded-full bg-gradient-to-br flex items-center justify-center text-3xl font-black text-white', memberGrad(name))}>
                  {getInitials(name)}
                </div>
              </div>
            </div>
          </div>

          {/* Name + type */}
          <div>
            <h1 className="gradient-text text-4xl font-black leading-tight">{name}</h1>
            <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
              <TypeIcon type={typeName} />
              <span className="text-white/50 text-sm">{typeName}</span>
              {dept && <><span className="text-white/20">·</span><span className="text-white/50 text-sm">{dept}</span></>}
            </div>
          </div>

          {/* Contact */}
          <div className="flex items-center gap-6 flex-wrap justify-center text-sm text-white/40">
            {email && <a href={`mailto:${email}`} className="flex items-center gap-1.5 hover:text-indigo-300 transition-colors"><Mail size={13} />{email}</a>}
            {phone && <span className="flex items-center gap-1.5"><Phone size={13} />{phone}</span>}
            {createdAt && <span className="flex items-center gap-1.5"><Calendar size={13} />Member since {formatDate(createdAt, 'dd MMM yyyy')}</span>}
          </div>

          {/* 4 stat rings */}
          <div className="grid grid-cols-4 gap-4 mt-2">
            <StatRing label="Total Visits"    value={stats.total}      max={Math.max(stats.total, 50)} color={RING_COLORS[0]} />
            <StatRing label="Active Visits"   value={stats.active}     max={stats.total || 1}          color={RING_COLORS[1]} />
            <StatRing label="Vehicles"         value={vehicles.length}  max={10}                        color={RING_COLORS[2]} />
            <StatRing label="Days as Member"   value={daysAsMember}    max={Math.max(daysAsMember, 365)} color={RING_COLORS[3]} />
          </div>
        </div>
      </motion.div>

      {/* ── Bento Grid + access overlay ─────────────────────── */}
      <div className="relative">
        <div className={cn('grid gap-4 transition-all', { 'blur-sm pointer-events-none select-none': !hasAccess })}
          style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>

          {/* Visit Stats — col 1 */}
          <div className="glass-card p-5 space-y-3">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Visit Stats</p>
            <div className="space-y-2">
              {[
                { label: 'Total',      val: stats.total },
                { label: 'This Month', val: stats.thisMonth },
                { label: 'This Week',  val: stats.thisWeek },
                { label: 'Today',      val: stats.today },
              ].map(({ label, val }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs text-white/40">{label}</span>
                  <span className="font-bold text-white/80 tabular-nums"><CountUp end={val} duration={1} /></span>
                </div>
              ))}
            </div>
          </div>

          {/* Visit Timeline — col 2-3 */}
          <div className="glass-card p-5 col-span-2">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Visit Activity (30 days)</p>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)' }} tickLine={false} axisLine={false}
                  interval={4} />
                <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)' }} tickLine={false} axisLine={false} />
                <ReTip contentStyle={{ background: 'hsl(228 40% 8%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
                <Bar dataKey="count" fill="rgba(99,102,241,0.7)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Vehicles — col 1 */}
          <div className="glass-card p-5">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Vehicles</p>
            {vehicles.length === 0
              ? <p className="text-xs text-white/25">No vehicles registered</p>
              : <div className="flex flex-wrap gap-2">
                  {vehicles.map((v, i) => (
                    <span key={i} className="plate text-xs">{v.RegistrationNumber || v.registrationnumber}</span>
                  ))}
                </div>
            }
          </div>

          {/* Access Level — col 2 */}
          <div className="glass-card p-5">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Access Level</p>
            <div className="flex items-center gap-2 mb-2">
              <TypeIcon type={typeName} />
              <span className="font-semibold text-white/80">{typeName}</span>
            </div>
            {dept && <p className="text-xs text-white/40 flex items-center gap-1.5 mb-2"><Briefcase size={11} />{dept}</p>}
            <div className="flex items-center gap-1.5 mt-3 text-xs">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span className="text-white/50">Full campus access</span>
            </div>
          </div>

          {/* Member ID card — col 3 */}
          <div className="glass-card p-5">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Member Info</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-white/40">Member ID</span>
                <span className="font-mono text-white/70">#{member.MemberID || member.memberid}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">Age</span>
                <span className="text-white/70">{member.Age || member.age || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">Joined</span>
                <span className="text-white/70">{createdAt ? formatDate(createdAt, 'dd MMM yyyy') : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/40">Days Active</span>
                <span className="font-bold text-indigo-300"><CountUp end={daysAsMember} duration={1.2} /></span>
              </div>
            </div>
          </div>
        </div>

        {/* Access restriction overlay */}
        {!hasAccess && (
          <div className="absolute inset-0 backdrop-blur-xl bg-black/50 z-10 flex flex-col items-center justify-center rounded-xl">
            <Lock size={48} className="text-red-400 mb-4" />
            <p className="text-xl font-bold text-white">Restricted Access</p>
            <p className="text-white/40 text-sm mt-1">You can only view your own portfolio</p>
          </div>
        )}
      </div>

      {/* ── Recent Visits Timeline ───────────────────────────── */}
      <div className="relative">
        <div className={cn('space-y-4', { 'blur-sm pointer-events-none select-none': !hasAccess })}>
          <p className="text-sm font-semibold text-white/50 uppercase tracking-widest">Recent Visits</p>
          {recentVisits.length === 0 ? (
            <p className="text-white/25 text-xs">No visit history</p>
          ) : (
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="relative pl-6 space-y-0">
              {/* Vertical timeline line */}
              <div className="absolute left-2.5 top-2 bottom-2 w-px bg-gradient-to-b from-indigo-500/50 to-transparent" />

              {recentVisits.map((v, i) => {
                const isActive = v.IsActive || v.isactive;
                const gate     = v.EntryGateName || v.entrygatename || '—';
                const exitGate = v.ExitGateName  || v.exitgatename;
                const entryT   = v.EntryTime     || v.entrytime;
                const exitT    = v.ExitTime      || v.exittime;

                return (
                  <motion.div key={i} variants={staggerItem} className="flex gap-3 pb-5 relative">
                    {/* Timeline dot */}
                    <div className={cn('absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-[hsl(228_40%_7%)] flex-shrink-0 z-10',
                      isActive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-indigo-500/60')}>
                    </div>

                    <div className="glass-card p-3 flex-1 space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-indigo-300">{gate}</span>
                          {exitGate && <><ChevronRight size={11} className="text-white/20" /><span className="text-xs text-white/40">{exitGate}</span></>}
                          {isActive && <span className="badge badge-success text-[9px] flex items-center gap-1"><span className="status-dot active" />Active</span>}
                        </div>
                        <span className="text-[10px] text-white/30">{formatRelativeTime(entryT)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-white/30">
                        <span>Entry {formatDate(entryT)}</span>
                        {exitT && <><span>·</span><span>Exit {formatDate(exitT)}</span><span>·</span><span>{formatDuration(entryT, exitT)}</span></>}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>

        {!hasAccess && (
          <div className="absolute inset-0 backdrop-blur-xl bg-black/50 z-10 flex flex-col items-center justify-center rounded-xl">
            <Lock size={32} className="text-red-400/70" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

