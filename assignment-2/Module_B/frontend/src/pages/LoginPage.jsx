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
import { HeroHighlight } from '@/components/ui/hero-highlight';

function launchUltraConfetti() {
  const duration = 1400;
  const animationEnd = Date.now() + duration;
  const defaults = {
    startVelocity: 34,
    spread: 68,
    ticks: 92,
    zIndex: 3000,
    colors: ['#00AEEF', '#22D3EE', '#F59E0B', '#10B981', '#FF0033', '#E5E7EB'],
    scalar: 1.05,
  };

  // Opening side cannons.
  confetti({ ...defaults, particleCount: 70, origin: { x: 0.08, y: 0.62 }, angle: 58 });
  confetti({ ...defaults, particleCount: 70, origin: { x: 0.92, y: 0.62 }, angle: 122 });

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      clearInterval(interval);
      return;
    }

    const particleCount = Math.max(12, Math.floor((timeLeft / duration) * 42));

    confetti({
      ...defaults,
      particleCount,
      spread: 96,
      startVelocity: 26,
      drift: (Math.random() - 0.5) * 0.8,
      origin: { x: 0.5, y: 0.2 },
      gravity: 0.95,
    });

    confetti({
      ...defaults,
      particleCount: Math.max(8, Math.floor(particleCount / 2)),
      spread: 42,
      startVelocity: 44,
      origin: { x: Math.random() * 0.3 + 0.35, y: Math.random() * 0.25 + 0.05 },
      gravity: 1.08,
    });
  }, 180);
}

function warmPostLoginChunks() {
  // Reduce lazy-route fallback flashes during navigation from login.
  Promise.allSettled([
    import('@/layouts/AppLayout'),
    import('@/pages/DashboardPage'),
    import('@/pages/ChangePasswordPage'),
  ]);
}

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
          className="auth-input auth-input-floating peer"
          placeholder=" "
          style={showToggle ? { paddingRight: 44 } : {}}
        />
        <label className="absolute left-11 top-1/2 -translate-y-1/2 text-[15px] text-zinc-400 pointer-events-none transition-all duration-200 peer-focus:top-1.5 peer-focus:-translate-y-0 peer-focus:text-[11px] peer-focus:text-zinc-200 peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px]">
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

      warmPostLoginChunks();
      launchUltraConfetti();

      setTimeout(() => {
        if (userData?.mustChangePassword || userData?.mustchangepassword) {
          toast.warning("Set your permanent password to continue", { icon: <Lock size={16}/> });
          navigate('/change-password', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }, 140);

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
    <HeroHighlight containerClassName="dark bg-[#0d0d1a]">
      <div className="simple-auth-page">
        <div className="w-full simple-auth-grid">
        <motion.div
          animate={isLocked ? { x: [0, -8, 8, -8, 8, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="relative"
        >
          {/* Card */}
          <div className={cn('auth-card p-8 md:p-10 transition-all duration-500', isLocked && 'border-red-500/40 shadow-[0_0_40px_rgba(239,68,68,0.1)]')}>
            
            {/* ── Logo ───────────────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-3 text-center mb-8">
              {isLocked ? (
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Lock size={32} className="text-red-500" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="relative"
                >
                  <img
                    src="/Final_IITGN_Logo_symmetric.png"
                    alt="IITGN GateGuard logo"
                    className="h-[92px] w-[92px] object-contain drop-shadow-[0_10px_24px_rgba(0,174,239,0.24)]"
                    draggable="false"
                  />
                </motion.div>
              )}

              <div>
                <h1 className={cn('text-3xl font-bold tracking-tight text-zinc-100', isLocked ? 'text-red-400' : '')}>
                  {isLocked ? 'Account Locked' : 'GateGuard'}
                </h1>
                <p className="text-zinc-500 text-xs font-medium mt-1 tracking-widest uppercase">
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
                    <a href="/forgot-password" className="text-sm text-zinc-300 hover:text-zinc-100 transition-colors relative group inline-block">
                      Forgot password?
                      <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-zinc-300 transition-all duration-300 group-hover:w-full"></span>
                    </a>
                  </div>
                </form>

                <p className="text-center text-xs text-zinc-500 pt-6 mt-6 border-t border-zinc-800/80">
                  Demo: <span className="font-mono text-zinc-300">superadmin</span> / <span className="font-mono text-zinc-300">admin123</span>
                </p>
              </>
            )}

            <p className="text-center text-[10px] text-zinc-500 mt-5 leading-relaxed">
              Powered by IIT Gandhinagar · CS432 Databases
            </p>
          </div>
        </motion.div>
        </div>
      </div>
    </HeroHighlight>
  );
}
