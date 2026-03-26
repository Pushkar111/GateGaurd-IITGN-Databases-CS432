// src/pages/ChangePasswordPage.jsx
// For mustChangePassword forced flow — standalone, cannot navigate away.
// No AppLayout — full-screen auth UI with amber color scheme.

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Loader2, Eye, EyeOff, X, Check, ShieldCheck } from 'lucide-react';
import * as authApi from '@/api/auth.api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { HeroHighlight, Highlight } from '@/components/ui/hero-highlight';

// ── Floating label auth-input wrapper ─────────────────────────────────
function FloatingInput({ label, icon: Icon, type = 'text', value, onChange, error, autoFocus, name, register, showToggle, onToggleShow }) {
  return (
    <div className="space-y-1">
      <div className="auth-input-wrapper">
        {Icon && <span className="auth-input-icon"><Icon size={18}/></span>}
        <input
          {...(register ? register(name) : {})}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          autoFocus={autoFocus}
          className="auth-input peer"
          placeholder=" "
          style={showToggle ? { paddingRight: 44 } : {}}
        />
        <label className="absolute left-11 top-1/2 -translate-y-1/2 text-[15px] text-white/30 pointer-events-none transition-all duration-200 peer-focus:text-xs peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-amber-400 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:-translate-y-0">
          {label}
        </label>
        {showToggle !== undefined && (
          <button type="button" onClick={onToggleShow} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 p-1">
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

// ── Password strength helper ──────────────────────────────────────────
function getStrength(pw) {
  let score = 0;
  if (pw.length >= 8)           score++;
  if (/[A-Z]/.test(pw))         score++;
  if (/[0-9]/.test(pw))         score++;
  if (/[^A-Za-z0-9]/.test(pw))  score++;
  return score;
}

const STRENGTH_COLORS = ['#ef4444','#f97316','#f59e0b','#10b981'];
const STRENGTH_LABELS = ['Weak','Fair','Good','Strong'];
const STRENGTH_TIPS   = [
  'Add uppercase letters',
  'Add numbers',
  'Add special characters',
  'Excellent password!',
];

// ── Liquid-fill Strength Meter ────────────────────────────────────────
function StrengthMeter({ score }) {
  if (score === 0) return null;
  const color = STRENGTH_COLORS[score - 1];
  const label = STRENGTH_LABELS[score - 1];
  const tip   = STRENGTH_TIPS[score - 1];
  return (
    <div className="mt-2 mb-1 text-left">
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

// ── Animated Success Checkmark ────────────────────────────────────────
function SuccessCheckmark() {
  return (
    <div className="mx-auto mb-6" style={{ width:80, height:80 }}>
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <circle cx="40" cy="40" r="35" stroke="#10b981" strokeWidth="3" fill="none"
          strokeDasharray="220" strokeDashoffset="220" className="svg-draw"/>
        <polyline points="24,40 36,52 56,28" stroke="#10b981" strokeWidth="4" fill="none"
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="44" strokeDashoffset="44"
          style={{ animation:'strokeDraw 0.4s ease-out 0.6s forwards' }}/>
      </svg>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────
export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { markPasswordUpdated } = useAuth();

  const [tempPw,     setTempPw]     = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [showTemp,   setShowTemp]   = useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [isSuccess,  setIsSuccess]  = useState(false);

  const strength   = getStrength(newPw);
  const pwsMatch   = newPw.length > 0 && newPw === confirmPw;
  const pwsNoMatch = confirmPw.length > 0 && newPw !== confirmPw;
  const canSubmit  = tempPw.length > 0 && strength >= 2 && pwsMatch;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      await authApi.changePassword({ currentPassword: tempPw, newPassword: newPw, confirmPassword: confirmPw });
      markPasswordUpdated();
      setIsSuccess(true);
      toast.success('Password updated! Welcome to GateGuard');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to update password. Check your temporary password.');
    } finally {
      setLoading(false);
    }
  }

  // Auth card — amber variant: override the ::before pseudo-element color via inline style trick
  // We use a wrapper div with amber conic gradient to simulate the amber rotating border
  return (
    <HeroHighlight containerClassName="bg-[#0d0d1a] dark:bg-[#0d0d1a]">
      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center p-4">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 text-center text-sm text-neutral-300 md:text-base"
        >
          Enforce first-login security with{" "}
          <Highlight className="text-black dark:text-white">mandatory password reset</Highlight>
        </motion.p>

        <motion.div
          initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
          transition={{ duration:0.4 }}
          style={{
            position:'relative', width:'100%', maxWidth:400,
            background:'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
            WebkitBackdropFilter:'blur(40px) saturate(180%)',
            backdropFilter:'blur(40px) saturate(180%)',
            borderRadius:24,
            boxShadow:'0 0 0 1px rgba(245,158,11,0.15), 0 20px 60px rgba(0,0,0,0.4), 0 0 120px rgba(245,158,11,0.06), inset 0 1px 0 rgba(255,255,255,0.08)',
            padding:32,
          }}
        >
          {/* Amber rotating border */}
          <div style={{
            position:'absolute', inset:-1, borderRadius:25, zIndex:-1,
            background:'conic-gradient(from var(--angle, 0deg), transparent 0deg, #f59e0b 60deg, #fbbf24 120deg, #fde68a 180deg, transparent 240deg)',
            animation:'rotateBorder 6s linear infinite',
          }}/>

          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div key="ok" initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} className="text-center">
                <SuccessCheckmark/>
                <h2 className="text-xl font-bold mb-2" style={{ background:'linear-gradient(135deg,#10b981,#34d399)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                  Password Updated!
                </h2>
                <p style={{ color:'rgba(255,255,255,0.5)', fontSize:14 }}>Redirecting to dashboard...</p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity:0 }} animate={{ opacity:1 }}>
                {/* Key icon in amber circle */}
                <div className="flex justify-center mb-4">
                  <div style={{ width:72, height:72, borderRadius:'50%', background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Key size={32} style={{ color:'#f59e0b', animation:'slowSpin 4s linear infinite' }}/>
                  </div>
                </div>

                <h1 className="text-xl font-bold text-center mb-2" style={{ color:'#f1f5f9' }}>
                  Security Update Required
                </h1>
                <p className="text-center text-sm mb-6" style={{ color:'rgba(255,255,255,0.45)', maxWidth:300, margin:'0 auto 24px' }}>
                  Your account requires a new password before you can access GateGuard
                </p>

                <form onSubmit={handleSubmit} className="text-left">
                  {/* Temporary password */}
                  <div className="mb-4">
                    <FloatingInput
                      label="Temporary Password"
                      icon={Key}
                      type={showTemp ? 'text' : 'password'}
                      value={tempPw}
                      onChange={(e) => setTempPw(e.target.value)}
                      showToggle={true}
                      onToggleShow={() => setShowTemp(!showTemp)}
                      autoFocus
                    />
                  </div>

                  {/* New password */}
                  <div className="mb-1">
                    <FloatingInput
                      label="New Password"
                      icon={ShieldCheck}
                      type={showNew ? 'text' : 'password'}
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      showToggle={true}
                      onToggleShow={() => setShowNew(!showNew)}
                    />
                  </div>
                  <StrengthMeter score={strength}/>

                  {/* Confirm password */}
                  <div className="mt-3 mb-1">
                    <FloatingInput
                      label="Confirm New Password"
                      icon={ShieldCheck}
                      type={showConf ? 'text' : 'password'}
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      showToggle={true}
                      onToggleShow={() => setShowConf(!showConf)}
                    />
                  </div>
                  {pwsMatch   && <div style={{ fontSize:12, color:'#10b981', display:'flex', alignItems:'center', gap:4, marginBottom:12 }}><Check size={12}/>Passwords match</div>}
                  {pwsNoMatch && <div style={{ fontSize:12, color:'#ef4444', display:'flex', alignItems:'center', gap:4, marginBottom:12 }}><X size={12}/>Passwords don't match</div>}
                  {!pwsMatch && !pwsNoMatch && <div style={{ height:20 }}/>}

                  {error && <p className="text-sm mb-3" style={{ color:'#ef4444' }}>{error}</p>}

                  <button
                    type="submit"
                    className="auth-btn auth-btn-amber"
                    disabled={!canSubmit || loading}
                  >
                    {loading
                      ? <><Loader2 size={16} className="animate-spin"/>Updating...</>
                      : 'Update Password →'
                    }
                  </button>
                </form>

                {/* Info box */}
                <div style={{ marginTop:16, padding:'10px 14px', borderRadius:10, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', fontSize:12, color:'rgba(255,255,255,0.4)', textAlign:'center' }}>
                  ℹ This is a one-time requirement for new accounts
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </HeroHighlight>
  );
}
