// src/components/shared/StatCard.jsx
// Animated glass stat card — used on Dashboard
// Props: title, value, icon, trend, trendLabel, color, loading

import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cardHover, counterPop } from '@/lib/motion';
import { cn } from '@/lib/utils';

const colorMap = {
  indigo: {
    ring:  'from-indigo-500 to-indigo-700',
    glow:  'shadow-[0_0_30px_rgba(99,102,241,0.2)]',
    text:  'text-indigo-400',
  },
  emerald: {
    ring:  'from-emerald-500 to-emerald-700',
    glow:  'shadow-[0_0_30px_rgba(16,185,129,0.2)]',
    text:  'text-emerald-400',
  },
  amber: {
    ring:  'from-amber-500 to-amber-600',
    glow:  'shadow-[0_0_30px_rgba(245,158,11,0.2)]',
    text:  'text-amber-400',
  },
  red: {
    ring:  'from-red-500 to-red-700',
    glow:  'shadow-[0_0_30px_rgba(239,68,68,0.2)]',
    text:  'text-red-400',
  },
};

function SkeletonCard() {
  return (
    <div className="glass-card p-5 flex gap-4">
      <div className="skeleton w-12 h-12 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-7 w-16 rounded" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>
    </div>
  );
}

export default function StatCard({
  title       = 'Stat',
  value       = 0,
  icon: Icon,
  trend       = null,
  trendLabel  = 'vs last week',
  color       = 'indigo',
  loading     = false,
}) {
  if (loading) return <SkeletonCard />;

  const c = colorMap[color] || colorMap.indigo;

  const TrendIcon  = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-white/40';

  return (
    <motion.div
      className={cn('glass-card p-5 flex gap-4 cursor-default', c.glow)}
      variants={cardHover}
      initial="rest"
      whileHover="hover"
    >
      {/* Icon circle */}
      {Icon && (
        <div className={cn(
          'w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center',
          'bg-gradient-to-br opacity-90 text-white',
          c.ring
        )}>
          <Icon size={22} strokeWidth={2} />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-1">
          {title}
        </p>

        {/* Animated counter */}
        <motion.div
          className="text-3xl font-bold text-white"
          variants={counterPop}
          initial="initial"
          animate="animate"
        >
          <CountUp
            start={0}
            end={typeof value === 'number' ? value : 0}
            duration={1.5}
            separator=","
            useEasing
          />
        </motion.div>

        {/* Trend row */}
        {trend !== null && (
          <div className={cn('flex items-center gap-1 mt-1.5 text-xs font-medium', trendColor)}>
            <TrendIcon size={13} />
            <span>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
            <span className="text-white/30 font-normal">{trendLabel}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
