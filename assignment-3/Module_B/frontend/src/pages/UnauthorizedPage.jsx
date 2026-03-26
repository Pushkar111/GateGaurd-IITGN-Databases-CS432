// src/pages/UnauthorizedPage.jsx
// Full-screen 403 Access Denied page

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Lock, LogOut } from 'lucide-react';
import { useAuth }  from '@/context/AuthContext';
import RoleBadge    from '@/components/shared/RoleBadge';
import { scaleIn }  from '@/lib/motion';

export default function UnauthorizedPage() {
  const navigate      = useNavigate();
  const { user, logout } = useAuth();

  const roleName = user?.RoleName || user?.rolename || user?.role || 'Guard';
  const username = user?.Username || user?.username || 'User';

  return (
    <div className="mesh-bg min-h-screen flex items-center justify-center p-6">
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <motion.div
        variants={scaleIn}
        initial="initial"
        animate="animate"
        className="flex flex-col items-center text-center gap-5 relative z-10"
      >
        {/* 403 */}
        <div
          className="gradient-text font-black leading-none select-none"
          style={{ fontSize: 'clamp(70px, 16vw, 120px)' }}
        >
          403
        </div>

        {/* Lock icon */}
        <Lock size={80} className="text-red-400 animate-pulse -mt-3" />

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="text-white/40 text-sm max-w-xs">
            You don't have permission to access this page.
          </p>
        </div>

        {/* Current role info */}
        {user && (
          <div className="glass-card px-4 py-3 flex items-center gap-3">
            <p className="text-xs text-white/40">Logged in as <span className="font-mono text-white/70">{username}</span></p>
            <RoleBadge role={roleName} />
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-3 mt-2">
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Go to Dashboard
          </button>
          <button
            onClick={() => { logout(); navigate('/login', { replace: true }); }}
            className="btn-ghost flex items-center gap-1.5"
          >
            <LogOut size={15} /> Logout
          </button>
        </div>
      </motion.div>
    </div>
  );
}

