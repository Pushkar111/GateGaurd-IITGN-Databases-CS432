// src/pages/LoginPage.jsx
// "The Command Center Entry Gate" — full production login page
// ULTRA PRO MAX AUTH SYSTEM

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, UserCircle, Eye, EyeOff, Loader2, Lock, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '@/context/AuthContext';
import { scaleIn } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ── Zod schema ─────────────────────────────────────────────────────────
const schema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// ── Typewriter hook ────────────────────────────────────────────────────
function useTypewriter(text, speed = 60) {
  const [displayed, setDisplayed] = useState('');
  const [done,      setDone]      = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(interval); setDone(true); }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return { displayed, done };
}

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
        <label className="absolute left-11 top-1/2 -translate-y-1/2 text-[15px] text-white/30 pointer-events-none transition-all duration-200 peer-focus:text-xs peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-indigo-400 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:-translate-y-0">
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

// ── Shared Background (Grid + Orbs) ───────────────────────────────────
export function AuthBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[-2] overflow-hidden bg-[#0d0d1a]">
      {/* Mesh body animation is in globals.css under body */}
      
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-40 mix-blend-overlay" style={{
        backgroundImage: 'linear-gradient(rgba(99,102,241,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px'
      }} />

      {/* 3 Floating Orbs */}
      <motion.div animate={{ y: [0, -30, 0], x: [0, 20, 0] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-[-100px] left-[-100px] w-[700px] h-[700px] rounded-full bg-indigo-500 opacity-[0.06] blur-[100px]" />
      <motion.div animate={{ y: [0, 40, 0], x: [0, -20, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-purple-500 opacity-[0.05] blur-[120px]" />
      <motion.div animate={{ y: [0, -20, 0], x: [0, -40, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        className="absolute top-[30%] right-[10%] w-[300px] h-[300px] rounded-full bg-pink-500 opacity-[0.04] blur-[80px]" />
        
      {/* Noise filter */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
    </div>
  );
}

// ── Main Content ───────────────────────────────────────────────────────
export default function LoginPage() {
  const { login }          = useAuth();
  const navigate           = useNavigate();
  const { displayed, done } = useTypewriter('Welcome to GateGuard', 50);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError,  setServerError]  = useState('');
  
  // Spec: Lockout State
  const [lockedUntil, setLockedUntil] = useState(null);
  const [lockTimeLeft, setLockTimeLeft] = useState('');
  
  // Spec: Failed attempts
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Focus tracking for animation
  const [isFocused, setIsFocused] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  // Remember me prepopulate
  useEffect(() => {
    const saved = localStorage.getItem('gateguard_remember');
    if (saved) setValue('username', saved);
  }, [setValue]);

  // Lockout countdown
  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(lockedUntil).getTime();
      const diff = end - now;
      if (diff <= 0) {
        setLockedUntil(null);
        setServerError('');
        setFailedAttempts(0);
        clearInterval(interval);
      } else {
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setLockTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const onSubmit = useCallback(async (data) => {
    if (lockedUntil) return; // Block sub while locked
    setServerError('');
    
    // Remember me check manually since we don't put it in zod
    const rememberMe = document.getElementById('rememberMe')?.checked;
    if (rememberMe) localStorage.setItem('gateguard_remember', data.username);
    else localStorage.removeItem('gateguard_remember');

    try {
      const userData = await login(data.username, data.password);

      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#6366f1', '#a78bfa', '#f59e0b', '#10b981'], scalar: 1.2 });

      setTimeout(() => {
        if (userData?.mustChangePassword || userData?.mustchangepassword) {
          toast.warning("Set your permanent password to continue", { icon: <Lock size={16}/> });
          navigate('/change-password', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }, 700);

    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data || {};
      const fields = data?.error?.fields || {};
      
      if (status === 423 && fields.lockedUntil) {
        setLockedUntil(fields.lockedUntil);
      } else if (fields.failedAttempts !== undefined) {
        setFailedAttempts(fields.failedAttempts);
      }
      
      setServerError(data?.error?.message || data?.message || err.message || 'Invalid username or password.');
    }
  }, [login, navigate, lockedUntil]);

  const isLocked = !!lockedUntil;

  return (
    <>
      <AuthBackground />
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 z-10 relative">
        <motion.div
          animate={isLocked ? { x: [0, -8, 8, -8, 8, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="relative w-full max-w-[440px]"
        >
          {/* Card */}
          <div className={cn('auth-card transition-all duration-500', isLocked && 'border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.1)]')}>
            
            {/* ── Logo ───────────────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-3 text-center mb-8">
              {isLocked ? (
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Lock size={32} className="text-red-500" />
                </motion.div>
              ) : (
                <div className="relative w-16 h-16 flex items-center justify-center">
                  <svg width="48" height="48" viewBox="0 0 48 48" className="text-indigo-500 relative z-10">
                    <motion.path
                      d="M24 4L4 12V22C4 32.7 12.6 42.1 24 44C35.4 42.1 44 32.7 44 22V12L24 4Z"
                      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-xl animate-pulse-glow" />
                </div>
              )}

              <div>
                <h1 className={cn('text-3xl font-bold tracking-tight', isLocked ? 'bg-gradient-to-r from-red-500 to-red-400 bg-clip-text text-transparent' : 'gradient-text')}>
                  {isLocked ? 'Account Locked' : 'GateGuard'}
                </h1>
                <p className="text-white/30 text-xs font-medium mt-1 tracking-widest uppercase">
                  IIT Gandhinagar Security System
                </p>
              </div>
            </div>

            {/* ── Lockout State Content ─────────────────────────────── */}
            {isLocked ? (
              <div className="text-center space-y-6 py-4">
                <div className="text-red-400 text-sm">Too many failed login attempts.</div>
                <div>
                  <div className="text-white/40 text-xs uppercase tracking-wider mb-1">Unlocks In</div>
                  <div className="font-mono text-4xl font-bold text-amber-500 tracking-wider">
                    {lockTimeLeft}
                  </div>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <a href="/forgot-password" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                    Reset Password
                  </a>
                </div>
              </div>
            ) : (
              <>
                {/* ── Typewriter ─────────────────────────────────────────── */}
                <div className="text-center mb-6 h-5">
                  <span className="text-white/60 text-sm font-medium">
                    {displayed}
                    {!done && <span className="ml-0.5 inline-block w-0.5 h-4 bg-indigo-400 align-middle animate-[pulse_0.8s_step-end_infinite]" />}
                  </span>
                </div>

                {/* ── Form ───────────────────────────────────────────────── */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                  
                  <FloatingInput
                    register={register} name="username" label="Username" icon={UserCircle}
                    error={errors.username?.message}
                  />

                  <FloatingInput
                    register={register} name="password" label="Password" icon={Lock} type={showPassword ? 'text' : 'password'}
                    error={errors.password?.message} showToggle={true} onToggleShow={() => setShowPassword(!showPassword)}
                  />

                  {/* Failed attempts warning */}
                  <AnimatePresence>
                    {failedAttempts > 0 && failedAttempts < 5 && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="flex flex-col gap-2 overflow-hidden py-1">
                        <div className="flex items-center gap-2 text-xs text-amber-500/90 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
                          <AlertTriangle size={14} />
                          <span>{failedAttempts >= 4 ? "1 attempt remaining before lockout" : `${failedAttempts}/5 login attempts used`}</span>
                        </div>
                        <div className="flex items-center justify-center gap-1.5 mt-1">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className={cn("w-2 h-2 rounded-full ring-1", i <= failedAttempts ? (failedAttempts >= 4 ? 'bg-red-500 ring-red-400' : 'bg-amber-500 ring-amber-400') : 'bg-transparent ring-white/10')} />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between text-sm py-1">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className="relative w-4 h-4 rounded border border-white/20 bg-white/5 flex items-center justify-center group-hover:border-indigo-400 transition-colors">
                        <input type="checkbox" id="rememberMe" className="peer opacity-0 absolute inset-0 cursor-pointer" />
                        <svg className="w-3 h-3 text-indigo-400 opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <span className="text-white/50 group-hover:text-white/80 transition-colors">Remember me</span>
                    </label>
                    
                  </div>

                  <AnimatePresence>
                    {serverError && !failedAttempts && (
                      <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                        className="text-red-400 text-sm text-center">
                        {serverError}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <button type="submit" disabled={isSubmitting} className="auth-btn mt-2">
                    {isSubmitting ? <><Loader2 size={18} className="animate-spin inline mr-2" />Signing in...</> : 'Sign In'}
                  </button>

                  <div className="text-center mt-4">
                    <a href="/forgot-password" className="text-sm text-indigo-400/80 hover:text-indigo-400 transition-colors relative group inline-block">
                      Forgot password?
                      <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-indigo-400 transition-all duration-300 group-hover:w-full"></span>
                    </a>
                  </div>
                </form>

                <p className="text-center text-xs text-white/20 pt-6 mt-6 border-t border-white/[0.06]">
                  Demo: <span className="font-mono text-white/35">superadmin</span> / <span className="font-mono text-white/35">Admin@123</span>
                </p>
              </>
            )}

            <p className="text-center text-[10px] text-white/20 mt-4 leading-relaxed absolute bottom-4 left-0 right-0">
              Powered by IIT Gandhinagar · CS432 Databases
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
}
