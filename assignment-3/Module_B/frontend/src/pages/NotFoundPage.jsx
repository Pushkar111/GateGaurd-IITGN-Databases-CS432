// src/pages/NotFoundPage.jsx
// Full-screen 404 page with glitch animation and navigation buttons

import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { scaleIn } from '@/lib/motion';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="mesh-bg min-h-screen flex items-center justify-center p-6">
      {/* Ambient orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <motion.div
        variants={scaleIn}
        initial="initial"
        animate="animate"
        className="flex flex-col items-center text-center gap-5 relative z-10"
      >
        {/* 404 */}
        <div
          className="gradient-text font-black leading-none select-none"
          style={{
            fontSize: 'clamp(80px, 20vw, 180px)',
            animation: 'glitch 3s ease-in-out infinite',
          }}
        >
          404
        </div>

        {/* Shield icon */}
        <Shield size={56} className="text-indigo-500 animate-pulse -mt-4" />

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Page not found</h1>
          <p className="text-white/40 text-sm max-w-xs">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 mt-2">
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Go to Dashboard
          </button>
          <button onClick={() => navigate(-1)} className="btn-ghost">
            Go Back
          </button>
        </div>
      </motion.div>
    </div>
  );
}

