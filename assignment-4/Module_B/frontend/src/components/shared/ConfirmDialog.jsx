// src/components/shared/ConfirmDialog.jsx
// Radix Dialog-based confirmation modal with animated glass card
// Props: open, onOpenChange, title, description, onConfirm, loading, variant

import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { scaleIn, backdropVariants } from '@/lib/motion';

export default function ConfirmDialog({
  open,
  onOpenChange,
  title        = 'Are you sure?',
  description  = 'This action cannot be undone.',
  onConfirm,
  loading      = false,
  variant      = 'danger', // 'danger' | 'warning'
}) {
  const isDanger  = variant === 'danger';
  const Icon      = isDanger ? Trash2 : AlertTriangle;
  const iconColor = isDanger
    ? 'text-red-400 bg-red-400/10 border-red-400/20'
    : 'text-amber-400 bg-amber-400/10 border-amber-400/20';
  const confirmClass = isDanger
    ? 'bg-red-500 hover:bg-red-600 shadow-[0_4px_15px_rgba(239,68,68,0.3)]'
    : 'bg-amber-500 hover:bg-amber-600 shadow-[0_4px_15px_rgba(245,158,11,0.3)]';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* Backdrop */}
            <Dialog.Overlay asChild>
              <motion.div
                variants={backdropVariants}
                initial="initial" animate="animate" exit="exit"
                className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
              />
            </Dialog.Overlay>

            {/* Panel */}
            <Dialog.Content asChild>
              <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
                <motion.div
                  variants={scaleIn}
                  initial="initial" animate="animate" exit="exit"
                  className="w-full max-w-sm pointer-events-auto
                             bg-[hsl(228_40%_7%)] border border-white/10
                             rounded-2xl shadow-2xl p-6"
                >
                  {/* Close button */}
                  <Dialog.Close className="absolute top-4 right-4 icon-rail-btn opacity-60 hover:opacity-100">
                    <X size={16} />
                  </Dialog.Close>

                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                                   border mb-4 ${iconColor}`}>
                    <Icon size={22} />
                  </div>

                  {/* Text */}
                  <Dialog.Title className="text-base font-bold text-white mb-1">
                    {title}
                  </Dialog.Title>
                  <Dialog.Description className="text-sm text-white/50 mb-6">
                    {description}
                  </Dialog.Description>

                  {/* Actions */}
                  <div className="flex gap-3 justify-end">
                    <Dialog.Close asChild>
                      <button className="btn-ghost text-sm px-4 py-2">
                        Cancel
                      </button>
                    </Dialog.Close>
                    <button
                      onClick={onConfirm}
                      disabled={loading}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg
                                  text-sm font-semibold text-white transition-all duration-150
                                  disabled:opacity-50 disabled:cursor-not-allowed
                                  ${confirmClass}`}
                    >
                      {loading ? (
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Icon size={14} />
                      )}
                      {isDanger ? 'Delete' : 'Confirm'}
                    </button>
                  </div>
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
