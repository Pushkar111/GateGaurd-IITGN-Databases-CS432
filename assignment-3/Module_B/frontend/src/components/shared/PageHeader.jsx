// src/components/shared/PageHeader.jsx
// Page header used at the top of every page
// Props: title, subtitle, actions, breadcrumb [{label, path}]

import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Home, ChevronRight } from 'lucide-react';
import { fadeInUp } from '@/lib/motion';

export default function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb = [],
}) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-1 mb-6"
    >
      {/* Breadcrumb */}
      {breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-white/30 mb-2 flex-wrap">
          <Link reloadDocument to="/dashboard" className="flex items-center gap-1 hover:text-white/60 transition-colors">
            <Home size={11} /> Home
          </Link>
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              <ChevronRight size={11} />
              {crumb.path ? (
                <Link
                  reloadDocument
                  to={crumb.path}
                  className={i === breadcrumb.length - 1
                    ? 'text-white/60 font-medium'
                    : 'hover:text-white/60 transition-colors'}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className={i === breadcrumb.length - 1 ? 'text-white/60 font-medium' : ''}>
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="gradient-text text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-white/40 text-sm mt-0.5">{subtitle}</p>
          )}
        </div>

        {/* Actions slot */}
        {actions && (
          <div className="flex items-center gap-2 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </motion.div>
  );
}
