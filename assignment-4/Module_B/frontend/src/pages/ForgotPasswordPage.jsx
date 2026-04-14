// src/pages/ForgotPasswordPage.jsx
// Multi-step forgot password: Step 1 Email → Step 2 OTP → Step 3 New Password → Success
// Standalone page — NO AppLayout, no navbar, no sidebar.

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { OTPInput, REGEXP_ONLY_DIGITS } from 'input-otp';
import {
  Mail, CheckCircle2, Loader2, X, Check, Eye, EyeOff,
  ArrowLeft, Clock, RotateCcw, ShieldCheck,
} from 'lucide-react';
import * as authApi from '@/api/auth.api';
import { toast } from 'sonner';
import { HeroHighlight } from '@/components/ui/hero-highlight';

// -- Floating label auth-input wrapper ---------------------------------
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

// -- Step transition variants ------------------------------------------
const stepVariants = {
  enter:  { x: 60,  opacity: 0, filter: 'blur(4px)' },
  center: { x: 0,   opacity: 1, filter: 'blur(0px)', transition: { duration: 0.3, ease: 'easeOut' } },
  exit:   { x: -60, opacity: 0, filter: 'blur(4px)', transition: { duration: 0.3, ease: 'easeIn'  } },
};

// -- Password strength helper ------------------------------------------
function getStrength(pw) {
  let score = 0;
  if (pw.length >= 8)      score++;
  if (/[A-Z]/.test(pw))    score++;
  if (/[0-9]/.test(pw))    score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score; // 0–4
}

const STRENGTH_COLORS  = ['#ef4444','#f97316','#f59e0b','#10b981'];
const STRENGTH_LABELS  = ['Weak','Fair','Good','Strong'];
const STRENGTH_TIPS    = [
  'Add uppercase letters',
  'Add numbers',
  'Add special characters',
  'Excellent password!',
];

// -- debounce hook -----------------------------------------------------
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// -- Mask email: s*****n@iitgn.ac.in ----------------------------------
function maskEmail(email) {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 1) return `${local}@${domain}`;
  return `${local[0]}${'*'.repeat(Math.min(5, local.length - 1))}@${domain}`;
}

// -- OTP Countdown (15 minutes = 900s) --------------------------------
function useCountdown(initial = 900) {
  const [seconds, setSeconds] = useState(initial);
  const timerRef = useRef(null);

  const reset = useCallback(() => {
    clearInterval(timerRef.current);
    setSeconds(initial);
    timerRef.current = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
  }, [initial]);

  useEffect(() => {
    timerRef.current = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const fmt = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  return { seconds, fmt, reset };
}

// -- Animated Mail SVG (Step 1) ----------------------------------------
function AnimatedMailIcon() {
  return (
    <div className="mx-auto mb-6" style={{ width: 72, height: 72 }}>
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect
          x="6" y="18" width="60" height="42" rx="6" ry="6"
          stroke="#6366f1" strokeWidth="2.5" fill="none"
          strokeDasharray="170" strokeDashoffset="170"
          className="svg-draw"
        />
        <polyline
          points="6,18 36,42 66,18"
          stroke="#6366f1" strokeWidth="2.5" fill="none" strokeLinecap="round"
          strokeDasharray="80" strokeDashoffset="80"
          style={{ animation: 'strokeDraw 1.2s ease-out 0.4s forwards' }}
        />
      </svg>
    </div>
  );
}

// -- Animated Envelope-Open SVG (Step 2) ------------------------------
function AnimatedEnvelopeOpen() {
  return (
    <div className="mx-auto mb-6 relative" style={{ width: 80, height: 80 }}>
      <style>{`
        @keyframes flapOpen {
          0%   { transform-origin: top; transform: rotateX(0deg); }
          100% { transform-origin: top; transform: rotateX(-30deg); }
        }
        @keyframes letterRise {
          0%   { transform: translateY(20px); opacity: 0; }
          40%  { opacity: 1; }
          100% { transform: translateY(-8px); opacity: 1; }
        }
        .env-flap   { animation: flapOpen   0.8s ease-out forwards; }
        .env-letter { animation: letterRise 0.8s ease-out 0.2s both; }
      `}</style>
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* envelope body */}
        <rect x="8" y="28" width="64" height="46" rx="6" stroke="#6366f1" strokeWidth="2.5" fill="none"/>
        {/* flap */}
        <polygon points="8,28 40,52 72,28" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" className="env-flap"/>
        {/* letter rising */}
        <g className="env-letter">
          <rect x="26" y="8" width="28" height="36" rx="3" fill="rgba(99,102,241,0.15)" stroke="#818cf8" strokeWidth="2"/>
          <line x1="32" y1="18" x2="48" y2="18" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="32" y1="24" x2="48" y2="24" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="32" y1="30" x2="42" y2="30" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round"/>
        </g>
      </svg>
    </div>
  );
}

// -- Animated Shield SVG (Step 3) --------------------------------------
function AnimatedShieldIcon({ isSuccess }) {
  const color = isSuccess ? '#10b981' : '#6366f1';
  return (
    <div className="mx-auto mb-6" style={{ width: 72, height: 72 }}>
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M36 5 L10 17 v18 c0 14 10.8 27 26 31 15.2-4 26-17 26-31 V17 Z"
          stroke={color} strokeWidth="2.5" fill="none"
          strokeDasharray="140" strokeDashoffset="140"
          className="svg-draw"
          style={{ transition: 'stroke 0.5s ease' }}
        />
        <polyline
          points="24,36 32,44 48,28"
          stroke={color} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="36" strokeDashoffset="36"
          style={{ animation: 'strokeDraw 0.6s ease-out 0.8s forwards', transition: 'stroke 0.5s ease' }}
        />
      </svg>
    </div>
  );
}

// -- Animated Success Checkmark ----------------------------------------
function SuccessCheckmark() {
  return (
    <div className="mx-auto mb-6" style={{ width: 80, height: 80 }}>
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <circle
          cx="40" cy="40" r="35"
          stroke="#10b981" strokeWidth="3" fill="none"
          strokeDasharray="220" strokeDashoffset="220"
          className="svg-draw"
        />
        <polyline
          points="24,40 36,52 56,28"
          stroke="#10b981" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray="44" strokeDashoffset="44"
          style={{ animation: 'strokeDraw 0.4s ease-out 0.6s forwards' }}
        />
      </svg>
    </div>
  );
}

// -- Step Indicator ----------------------------------------------------
function StepIndicator({ step }) {
  const steps = ['Email', 'OTP', 'Password'];
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((label, i) => {
        const idx        = i + 1;
        const isActive   = step === idx;
        const isComplete = step > idx;
        return (
          <div key={idx} className="flex items-center">
            {/* circle */}
            <div className="flex flex-col items-center gap-1">
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700,
                border: isComplete ? 'none' : isActive ? '2px solid #6366f1' : '2px solid rgba(255,255,255,0.15)',
                background: isComplete ? '#10b981' : isActive ? '#6366f1' : 'transparent',
                color: isComplete || isActive ? 'white' : 'rgba(255,255,255,0.3)',
                transition: 'all 0.3s ease',
              }}>
                {isComplete ? <Check size={14}/> : idx}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
                color: isActive ? '#818cf8' : isComplete ? '#10b981' : 'rgba(255,255,255,0.3)',
                transition: 'color 0.3s ease',
              }}>
                {label}
              </span>
            </div>
            {/* connecting line */}
            {i < steps.length - 1 && (
              <div style={{ position: 'relative', width: 56, height: 2, background: 'rgba(255,255,255,0.08)', margin: '0 4px', marginBottom: 18 }}>
                <div
                  className={step > idx + 1 || (step === idx + 1 && step > 1) ? 'step-line-fill' : ''}
                  style={{
                    position: 'absolute', top: 0, left: 0, height: '100%',
                    width: step > idx ? '100%' : '0%',
                    background: 'linear-gradient(90deg, #6366f1, #818cf8)',
                    transition: 'width 0.5s ease',
                    borderRadius: 2,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// -- Liquid-fill Strength Meter ----------------------------------------
function StrengthMeter({ score }) {
  if (score === 0) return null;
  const color = STRENGTH_COLORS[score - 1];
  const label = STRENGTH_LABELS[score - 1];
  const tip   = STRENGTH_TIPS[score - 1];
  return (
    <div className="mt-2 text-left">
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

// -- MAIN COMPONENT ----------------------------------------------------
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step,       setStep]       = useState(1);
  const [isSuccess,  setIsSuccess]  = useState(false);
  const [resetData,  setResetData]  = useState({ email: '', resetToken: '' });
  const [redirectIn, setRedirectIn] = useState(3);

  // Step 1
  const [email,         setEmail]         = useState('');
  const [emailLoading,  setEmailLoading]  = useState(false);
  const debouncedEmail = useDebounce(email, 500);
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(debouncedEmail);
  const showEmailHint = debouncedEmail.length > 0;

  // Step 2
  const [otp,          setOtp]          = useState('');
  const [otpLoading,   setOtpLoading]   = useState(false);
  const [otpError,     setOtpError]     = useState('');
  const [otpState,     setOtpState]     = useState('idle'); // 'idle'|'error'|'success'
  const [resendLoad,   setResendLoad]   = useState(false);
  const { seconds: cdSec, fmt: cdFmt, reset: resetCd } = useCountdown(900);

  // Step 3
  const [pw,         setPw]         = useState('');
  const [cpw,        setCpw]        = useState('');
  const [showPw,     setShowPw]     = useState(false);
  const [showCpw,    setShowCpw]    = useState(false);
  const [pwLoading,  setPwLoading]  = useState(false);
  const [pwError,    setPwError]    = useState('');
  const strength     = getStrength(pw);
  const pwsMatch     = pw.length > 0 && pw === cpw;
  const pwsNoMatch   = cpw.length > 0 && pw !== cpw;
  const canReset     = strength >= 2 && pwsMatch;

  // Success redirect countdown
  useEffect(() => {
    if (!isSuccess) return;
    if (redirectIn <= 0) { navigate('/login', { state: { fromReset: true } }); return; }
    const t = setTimeout(() => setRedirectIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [isSuccess, redirectIn, navigate]);

  // Step 1 submit
  async function handleSendOtp(e) {
    e.preventDefault();
    if (!isValidEmail) return;
    setEmailLoading(true);
    try {
      const res = await authApi.forgotPassword({ email });
      const resetToken = res?.data?.resetToken;
      if (!resetToken) {
        throw new Error('Reset token missing in response');
      }
      setResetData({ email, resetToken });
      setStep(2);
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Email not found or failed to send OTP.');
    } finally {
      setEmailLoading(false);
    }
  }

  // Step 2 verify OTP
  async function handleVerifyOtp(e) {
    e.preventDefault();
    if (otp.length < 6) return;
    setOtpLoading(true);
    setOtpError('');
    try {
      await authApi.verifyOtp({ resetToken: resetData.resetToken, otp });
      setOtpState('success');
      setTimeout(() => setStep(3), 600);
    } catch (err) {
      setOtpState('error');
      setOtpError(err?.response?.data?.error?.message || 'Invalid OTP. Try again.');
      setTimeout(() => setOtpState('idle'), 600);
    } finally {
      setOtpLoading(false);
    }
  }

  // Step 2 resend OTP
  async function handleResend() {
    setResendLoad(true);
    try {
      const res = await authApi.forgotPassword({ email: resetData.email });
      const resetToken = res?.data?.resetToken;
      if (!resetToken) {
        throw new Error('Reset token missing in response');
      }
      setResetData((d) => ({ ...d, resetToken }));
      setOtp('');
      setOtpError('');
      setOtpState('idle');
      resetCd();
      toast.success('New OTP sent to your email!');
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || 'Failed to resend OTP. Try again later.');
    } finally {
      setResendLoad(false);
    }
  }

  // Step 3 reset password
  async function handleReset(e) {
    e.preventDefault();
    if (!canReset) return;
    setPwLoading(true);
    setPwError('');
    try {
      await authApi.resetPassword({ resetToken: resetData.resetToken, otp, newPassword: pw, confirmPassword: cpw });
      setIsSuccess(true);
    } catch (err) {
      setPwError(err?.response?.data?.error?.message || 'Failed to reset password. Try again.');
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <HeroHighlight containerClassName="dark bg-[#0d0d1a]">
      <div className="simple-auth-page">
        <div className="w-full simple-auth-grid">
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
              transition={{ duration:0.35 }}
              className="auth-card mx-auto w-full max-w-sm p-8 text-center"
            >
              <SuccessCheckmark/>
              <h2 className="gradient-text text-2xl font-bold mb-2" style={{ background:'linear-gradient(135deg,#10b981,#34d399)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
                Password reset successfully!
              </h2>
              <p className="text-sm mb-6" style={{ color:'rgba(255,255,255,0.5)' }}>
                You can now login with your new password
              </p>
              <div style={{ padding:'12px 20px', borderRadius:12, background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', fontSize:14, color:'rgba(255,255,255,0.7)' }}>
                Redirecting to login in{' '}
                <strong style={{ color:'#10b981', fontSize:18 }}>{redirectIn}</strong>...
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="card"
              initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
              className="auth-card mx-auto w-full max-w-sm p-8"
            >
              <StepIndicator step={step} />

              <AnimatePresence mode="wait">
                {/* -- STEP 1 --- */}
                {step === 1 && (
                  <motion.div key="s1" variants={stepVariants} initial="enter" animate="center" exit="exit">
                    <AnimatedMailIcon/>
                    <h1 className="text-zinc-100 text-2xl font-bold text-center mb-1">Forgot password?</h1>
                    <p className="text-center text-sm mb-6" style={{ color:'rgba(228,228,231,0.7)' }}>
                      Enter your registered email address
                    </p>
                    <form onSubmit={handleSendOtp}>
                      <div className="mb-4 relative">
                        <FloatingInput
                          label="Email address"
                          icon={Mail}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          autoFocus
                        />
                        {showEmailHint && (
                          <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)' }}>
                            {isValidEmail
                              ? <Check size={16} style={{ color:'#10b981' }}/>
                              : <X    size={16} style={{ color:'#ef4444' }}/>
                            }
                          </span>
                        )}
                      </div>
                      <button
                        type="submit"
                        className="auth-btn"
                        disabled={!isValidEmail || emailLoading}
                      >
                        {emailLoading
                          ? <><Loader2 size={16} className="animate-spin"/>Sending...</>
                          : 'Send OTP →'
                        }
                      </button>
                    </form>
                    <div className="text-center mt-4">
                      <Link to="/login" className="text-sm" style={{ color:'rgba(228,228,231,0.65)', textDecoration:'none' }}>
                        ← Back to login
                      </Link>
                    </div>
                  </motion.div>
                )}

                {/* -- STEP 2 --- */}
                {step === 2 && (
                  <motion.div key="s2" variants={stepVariants} initial="enter" animate="center" exit="exit">
                    <AnimatedEnvelopeOpen/>
                    <h1 className="text-xl font-bold text-center mb-1" style={{ color:'#f4f4f5' }}>Check your email</h1>
                    <p className="text-center text-sm mb-2" style={{ color:'rgba(228,228,231,0.7)' }}>
                      We sent a code to
                    </p>
                    <div className="text-center mb-6">
                      <span style={{ fontFamily:'monospace', fontSize:13, padding:'4px 12px', borderRadius:8, background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)', color:'#818cf8' }}>
                        {maskEmail(resetData.email)}
                      </span>
                    </div>

                    <form onSubmit={handleVerifyOtp}>
                      <motion.div
                        className="flex justify-center mb-6"
                        animate={otpState === 'error' ? { x:[0,-6,6,-6,6,0] } : {}}
                        transition={{ duration:0.3 }}
                      >
                        <OTPInput
                          value={otp}
                          onChange={setOtp}
                          maxLength={6}
                          pattern={REGEXP_ONLY_DIGITS}
                          render={({ slots }) => (
                            <div style={{ display:'flex', gap:8 }}>
                              {slots.map((slot, i) => (
                                <div
                                  key={i}
                                  className={`otp-slot ${otpState === 'error' ? 'otp-slot-error' : otpState === 'success' ? 'otp-slot-success' : ''}`}
                                  data-active={slot.isActive ? 'true' : 'false'}
                                  data-filled={slot.char ? 'true' : 'false'}
                                  style={otpState === 'success' ? { transform:'scale(1.02)', transition:'transform 0.2s' } : {}}
                                >
                                  {slot.char || (slot.isActive ? <span style={{ width:2, height:'1em', background:'#6366f1', display:'inline-block', animation:'pulse 1s infinite' }}/> : null)}
                                </div>
                              ))}
                            </div>
                          )}
                        />
                      </motion.div>

                      {otpError && (
                        <p className="text-center text-sm mb-3" style={{ color:'#ef4444' }}>{otpError}</p>
                      )}

                      {/* Countdown */}
                      <div className="text-center mb-4">
                        {cdSec > 0 ? (
                          <span style={{ fontFamily:'monospace', fontSize:13, color:'#f59e0b', display:'inline-flex', alignItems:'center', gap:6 }}>
                            <Clock size={13}/> Resend OTP in {cdFmt}
                          </span>
                        ) : (
                          <div>
                            <span style={{ fontSize:13, color:'rgba(255,255,255,0.4)' }}>OTP expired. </span>
                            <button
                              type="button"
                              onClick={handleResend}
                              disabled={resendLoad}
                              style={{ fontSize:13, color:'#818cf8', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', padding:0 }}
                            >
                              {resendLoad ? 'Resending...' : 'Resend OTP'}
                            </button>
                          </div>
                        )}
                      </div>

                      <motion.button
                        type="submit"
                        className="auth-btn"
                        disabled={otp.length < 6 || otpLoading}
                        animate={otpState === 'error' ? { x:[0,-4,4,-4,4,0] } : {}}
                        transition={{ duration:0.3 }}
                      >
                        {otpLoading
                          ? <><Loader2 size={16} className="animate-spin"/>Verifying...</>
                          : 'Verify OTP →'
                        }
                      </motion.button>
                    </form>
                    <div className="text-center mt-4">
                      <button onClick={() => setStep(1)} className="text-sm" style={{ color:'rgba(255,255,255,0.35)', background:'none', border:'none', cursor:'pointer' }}>
                        ← Back
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* -- STEP 3 --- */}
                {step === 3 && (
                  <motion.div key="s3" variants={stepVariants} initial="enter" animate="center" exit="exit">
                    <AnimatedShieldIcon isSuccess={canReset}/>
                    <h1 className="text-xl font-bold text-center mb-1" style={{ color:'#f4f4f5' }}>Set new password</h1>
                    <p className="text-center text-sm mb-6" style={{ color:'rgba(228,228,231,0.7)' }}>
                      Choose a strong password for your account
                    </p>
                    <form onSubmit={handleReset} className="text-left">
                      {/* New password */}
                      <div className="mb-2">
                        <FloatingInput
                          label="New password"
                          icon={ShieldCheck}
                          type={showPw ? 'text' : 'password'}
                          value={pw}
                          onChange={(e) => setPw(e.target.value)}
                          showToggle={true}
                          onToggleShow={() => setShowPw(!showPw)}
                        />
                      </div>
                      <StrengthMeter score={strength}/>

                      {/* Confirm password */}
                      <div className="mt-3 mb-1">
                        <FloatingInput
                          label="Confirm password"
                          icon={ShieldCheck}
                          type={showCpw ? 'text' : 'password'}
                          value={cpw}
                          onChange={(e) => setCpw(e.target.value)}
                          showToggle={true}
                          onToggleShow={() => setShowCpw(!showCpw)}
                        />
                      </div>
                      {pwsMatch   && <div style={{ fontSize:12, color:'#10b981', display:'flex', alignItems:'center', gap:4, marginBottom:8 }}><Check size={12}/>Passwords match</div>}
                      {pwsNoMatch && <div style={{ fontSize:12, color:'#ef4444', display:'flex', alignItems:'center', gap:4, marginBottom:8 }}><X size={12}/>Passwords don't match</div>}
                      {!pwsMatch && !pwsNoMatch && <div style={{ height:20 }}/>}

                      {pwError && (
                        <p className="text-sm mb-2" style={{ color:'#ef4444' }}>{pwError}</p>
                      )}

                      <button
                        type="submit"
                        className="auth-btn"
                        disabled={!canReset || pwLoading}
                        style={{ marginTop:4 }}
                      >
                        {pwLoading
                          ? <><Loader2 size={16} className="animate-spin"/>Resetting...</>
                          : 'Reset Password'
                        }
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>
    </HeroHighlight>
  );
}
