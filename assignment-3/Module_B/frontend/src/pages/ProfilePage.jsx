// src/pages/ProfilePage.jsx
// User profile — hero, upgraded change password, login history, about card

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Eye, EyeOff, Shield, Moon, Loader2, Key, User, History,
  Check, X, Monitor, Smartphone,
} from 'lucide-react';
import * as authApi  from '@/api/auth.api';
import { useAuth }   from '@/context/AuthContext';
import PageHeader    from '@/components/shared/PageHeader';
import RoleBadge     from '@/components/shared/RoleBadge';
import { cn, getInitials, formatDate } from '@/lib/utils';
import { pageVariants, fadeInUp, staggerContainer, staggerItem } from '@/lib/motion';
import { AnimatePresence } from 'framer-motion';

// ── Themed input wrapper ──────────────────────────────────────────────
function FloatingInput({ label, icon: Icon, type = 'text', value, onChange, error, autoFocus, name, register, showToggle, onToggleShow }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-white/50">{label}</label>
      <div className="relative">
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none">
            <Icon size={15} />
          </span>
        )}
        <input
          {...(register ? register(name) : {})}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          autoFocus={autoFocus}
          className={cn(
            'input-field',
            Icon && 'pl-10',
            showToggle !== undefined && 'pr-10'
          )}
          placeholder={label}
        />
        {showToggle !== undefined && (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70 p-1"
          >
            {type === 'password' ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-red-400 pl-1 mt-1">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Avatar gradients ──────────────────────────────────────────────────
const GRADS = [
  'from-indigo-500 to-purple-600', 'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',  'from-rose-500 to-pink-600',
];
function avatarGrad(name = '') {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xfffff;
  return GRADS[h % GRADS.length];
}

// ── Password strength ─────────────────────────────────────────────────
function getStrength(pw = '') {
  let score = 0;
  if (pw.length >= 8)           score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw))  score++;
  return score;
}
const STRENGTH_COLORS  = ['#ef4444','#f97316','#f59e0b','#10b981'];
const STRENGTH_LABELS  = ['Weak','Fair','Good','Strong'];
const STRENGTH_TIPS    = ['Add uppercase letters','Add numbers','Add special characters','Excellent password!'];

function LiquidStrengthMeter({ score }) {
  if (score === 0) return null;
  const color = STRENGTH_COLORS[score - 1];
  const label = STRENGTH_LABELS[score - 1];
  const tip   = STRENGTH_TIPS[score  - 1];
  return (
    <div className="mt-2 mb-1">
      <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ height: '100%', width: `${score * 25}%`, background: color, borderRadius: 2, transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s ease' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:11, fontWeight:600, color }}>{label}</span>
        <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>{tip}</span>
      </div>
    </div>
  );
}

// ── Relative time helper ──────────────────────────────────────────────
function formatRelativeTime(dateStr) {
  const d = new Date(dateStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Browser/Device guesser from UA ───────────────────────────────────
function guessDevice(ua = '') {
  if (/mobile|android|iphone/i.test(ua)) return <Smartphone size={13}/>;
  return <Monitor size={13}/>;
}

// ── Login History section ─────────────────────────────────────────────
function LoginHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.getLoginHistory()
      .then((res) => setHistory(res.data?.history || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div variants={staggerItem} className="glass-card p-5" style={{ gridColumn:'1 / -1' }}>
      <div className="flex items-center gap-2 mb-4">
        <History size={15} className="text-indigo-400"/>
        <h3 className="text-sm font-semibold text-white/70">Login History</h3>
        <span style={{ marginLeft:'auto', fontSize:11, color:'rgba(255,255,255,0.3)' }}>Last 5 sessions</span>
      </div>

      {loading ? (
        /* Skeleton loading */
        <div className="space-y-3">
          {[1,2,3].map((n) => (
            <div key={n} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:'rgba(255,255,255,0.1)', flexShrink:0 }}/>
              <div style={{ flex:1, height:12, background:'rgba(255,255,255,0.06)', borderRadius:6 }}/>
              <div style={{ width:60, height:12, background:'rgba(255,255,255,0.06)', borderRadius:6 }}/>
            </div>
          ))}
        </div>
      ) : history.length === 0 ? (
        <div style={{ padding:'24px', textAlign:'center', color:'rgba(255,255,255,0.3)', fontSize:14 }}>
          No login history available
        </div>
      ) : (
        <div className="space-y-1">
          {history.slice(0, 5).map((entry, idx) => {
            const isSuccess = !!entry.success;
            const isMostRecent = idx === 0 && isSuccess;
            return (
              <motion.div
                key={entry.historyid}
                initial={{ opacity:0, x:-10 }}
                animate={{ opacity:1, x:0 }}
                transition={{ delay: idx * 0.07 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 10,
                  background: isSuccess ? 'transparent' : 'rgba(239,68,68,0.04)',
                  border: '1px solid',
                  borderColor: isSuccess ? 'rgba(255,255,255,0.04)' : 'rgba(239,68,68,0.1)',
                  marginBottom: 4,
                }}
              >
                {/* Status dot */}
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: isSuccess ? '#10b981' : '#ef4444',
                  boxShadow: isSuccess ? '0 0 8px rgba(16,185,129,0.5)' : '0 0 8px rgba(239,68,68,0.5)',
                }}/>

                {/* Center info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
                    {entry.ipaddress || '—'}
                  </span>
                  {!isSuccess && entry.failreason && (
                    <span style={{ fontSize: 11, color: '#ef4444', marginLeft: 8 }}>
                      Failed — {entry.failreason}
                    </span>
                  )}
                </div>

                {/* Right: device + time + badge */}
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <span style={{ color:'rgba(255,255,255,0.25)', display:'flex', alignItems:'center' }}>
                    {guessDevice(entry.useragent)}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                    {formatRelativeTime(entry.createdat)}
                  </span>
                  {isMostRecent && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: '#f59e0b',
                      padding: '2px 8px', borderRadius: 999,
                      background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)',
                    }}>
                      Current session
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, markPasswordUpdated } = useAuth();

  const username  = user?.Username  || user?.username  || 'User';
  const roleName  = user?.RoleName  || user?.rolename  || user?.role  || 'Guard';
  const createdAt = user?.CreatedAt || user?.createdat;
  const userId    = user?.UserID    || user?.userid    || user?.id;

  // Change Password state
  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,   setShowNew]   = useState(false);
  const [showConf,  setShowConf]  = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const strength   = getStrength(newPw);
  const pwsMatch   = newPw.length > 0 && newPw === confirmPw;
  const pwsNoMatch = confirmPw.length > 0 && newPw !== confirmPw;
  const canSave    = currentPw.length > 0 && strength >= 2 && pwsMatch;

  async function handleChangePassword(e) {
    e.preventDefault();
    if (!canSave) return;
    setPwLoading(true);
    try {
      await authApi.changePassword({
        currentPassword: currentPw,
        newPassword: newPw,
        confirmPassword: confirmPw,
      });
      markPasswordUpdated();
      toast.success('Password changed successfully');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate"
      className="p-6 space-y-6 pb-20 md:pb-6">
      <PageHeader title="Profile" subtitle="Manage your account settings" breadcrumb={[{ label: 'Profile' }]} />

      {/* Hero card */}
      <motion.div variants={fadeInUp} initial="initial" animate="animate" className="glass-card p-6">
        <div className="flex items-center gap-5 flex-wrap">
          <div className={cn('w-24 h-24 rounded-2xl flex items-center justify-center text-2xl font-black text-white bg-gradient-to-br shadow-xl flex-shrink-0', avatarGrad(username))}>
            {getInitials(username)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{username}</h2>
            <div className="mt-1"><RoleBadge role={roleName} /></div>
            {createdAt && (
              <p className="text-xs text-white/35 mt-2">
                Member since {formatDate(createdAt, 'dd MMMM yyyy')}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Settings grid */}
      <motion.div variants={staggerContainer} initial="initial" animate="animate"
        className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Account info */}
        <motion.div variants={staggerItem} className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <User size={15} className="text-indigo-400" />
            <h3 className="text-sm font-semibold text-white/70">Account Info</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Username',  value: username,  mono: true },
              { label: 'Role',      value: <RoleBadge role={roleName} /> },
              { label: 'User ID',   value: `#${userId || '-'}`, mono: true },
              { label: 'Member Since', value: createdAt ? formatDate(createdAt, 'dd MMM yyyy') : '-' },
            ].map(({ label, value, mono }) => (
              <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/[0.05] last:border-0">
                <span className="text-xs text-white/40">{label}</span>
                {typeof value === 'string'
                  ? <span className={cn('text-xs text-white/70', mono && 'font-mono')}>{value}</span>
                  : value}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Change password */}
        <motion.div variants={staggerItem} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key size={15} className="text-indigo-400" />
            <h3 className="text-sm font-semibold text-white/70">Change Password</h3>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current password */}
            <div>
              <FloatingInput
                label="Current password"
                icon={Key}
                type={showCurrent ? 'text' : 'password'}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                showToggle={true}
                onToggleShow={() => setShowCurrent(!showCurrent)}
              />
            </div>

            {/* New password */}
            <div>
              <FloatingInput
                label="New password"
                icon={Key}
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                showToggle={true}
                onToggleShow={() => setShowNew(!showNew)}
              />
              <LiquidStrengthMeter score={strength}/>
            </div>

            {/* Confirm password */}
            <div>
              <FloatingInput
                label="Confirm password"
                icon={Key}
                type={showConf ? 'text' : 'password'}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                showToggle={true}
                onToggleShow={() => setShowConf(!showConf)}
              />
              {pwsMatch && (
                <div className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                  <Check size={12} />Passwords match
                </div>
              )}
              {pwsNoMatch && (
                <div className="text-xs text-red-400 flex items-center gap-1 mt-1">
                  <X size={12} />Passwords do not match
                </div>
              )}
            </div>

            <button type="submit" disabled={!canSave || pwLoading} className="btn-primary w-full">
              {pwLoading ? <><Loader2 size={15} className="animate-spin"/>Changing...</> : 'Change Password'}
            </button>
          </form>
        </motion.div>

        {/* Theme card */}
        <motion.div variants={staggerItem} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Moon size={15} className="text-indigo-400" />
            <h3 className="text-sm font-semibold text-white/70">Appearance</h3>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-white/80">Dark Mode</p>
              <p className="text-xs text-white/30 mt-0.5">Light mode coming soon</p>
            </div>
            <div className="w-10 h-5 rounded-full bg-indigo-500 relative flex-shrink-0">
              <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
            </div>
          </div>
        </motion.div>

        {/* About card */}
        <motion.div variants={staggerItem} className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={15} className="text-indigo-400" />
            <h3 className="text-sm font-semibold text-white/70">About GateGuard</h3>
          </div>
          <div className="space-y-2 text-xs text-white/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Shield size={18} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-white/80 text-sm">GateGuard v1.0</p>
                <p>Security Management System</p>
              </div>
            </div>
            <div className="pt-2 space-y-1 border-t border-white/[0.06]">
              <p>IIT Gandhinagar</p>
              <p>CS432 - Database Systems</p>
              <p>Assignment 2 - Module B</p>
            </div>
          </div>
        </motion.div>

        {/* ── Login History ─────────────────────────────────────── */}
        <LoginHistory/>
      </motion.div>
    </motion.div>
  );
}
