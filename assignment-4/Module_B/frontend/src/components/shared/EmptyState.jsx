// src/components/shared/EmptyState.jsx
// Centered empty state used when a list has no results
// Props: icon (lucide component), title, description, action (ReactNode)

import { motion } from 'framer-motion';
import { Inbox } from 'lucide-react';
import { scaleIn } from '@/lib/motion';

export default function EmptyState({
  icon: Icon   = Inbox,
  title        = 'Nothing here yet',
  description  = '',
  action,
}) {
  return (
    <motion.div
      variants={scaleIn}
      initial="initial"
      animate="animate"
      className="flex flex-col items-center justify-center py-20 px-8 text-center"
    >
      {/* Icon circle */}
      <div className="w-20 h-20 rounded-full bg-white/[0.04] border border-white/[0.07]
                      flex items-center justify-center mb-5">
        <Icon size={36} strokeWidth={1.2} className="text-white/25" />
      </div>

      <h3 className="text-base font-semibold text-white/60 mb-1">{title}</h3>

      {description && (
        <p className="text-sm text-white/35 max-w-sm mb-5">{description}</p>
      )}

      {action && <div>{action}</div>}
    </motion.div>
  );
}
