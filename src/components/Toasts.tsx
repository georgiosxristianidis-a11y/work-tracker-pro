import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, AlertTriangle, Sparkles, Undo2 } from 'lucide-react';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: number;
  msg: string;
  type: string;
  action?: ToastAction;
}

interface ToastsProps {
  toasts: ToastMessage[];
  removeToast?: (id: number) => void;
}

interface ToastItemProps {
  t: ToastMessage;
  removeToast?: (id: number) => void;
}

export const Toasts = ({ toasts, removeToast }: ToastsProps) => {
  return (
    <div className="absolute top-[calc(64px+env(safe-area-inset-top))] left-6 right-6 z-[300] space-y-2 pointer-events-none flex flex-col items-center">
      <AnimatePresence>
        {toasts.map(t => (
          <ToastItem key={t.id} t={t} removeToast={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastItem: React.FC<ToastItemProps> = ({ t, removeToast }) => {
  const [actionDone, setActionDone] = React.useState(false);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: -16, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.94, filter: 'blur(4px)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="px-4 py-3 rounded-panel apple-glass-toast flex items-center gap-3 text-xs font-semibold pointer-events-auto text-[var(--t1)]"
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${t.type === 'success' ? 'bg-[var(--green-bg)] text-[var(--green)]' : t.type === 'error' ? 'bg-[var(--danger-bg)] text-[var(--danger)]' : 'bg-[var(--b)] text-[var(--t2)]'}`}>
        {t.type === 'success' ? <Check size={12} strokeWidth={2.5} /> : t.type === 'error' ? <AlertTriangle size={12} strokeWidth={2.5} /> : <Sparkles size={12} strokeWidth={2.5} />}
      </div>
      <span className="flex-1 leading-snug">{t.msg}</span>
      {t.action && (
        <AnimatePresence mode="popLayout">
          {!actionDone && (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.4, filter: 'blur(4px)', y: -6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={(e) => {
                e.stopPropagation();
                setActionDone(true);
                t.action?.onClick();
                if (removeToast) {
                  setTimeout(() => removeToast(t.id), 400); // give it time to animate then remove toast entirely
                }
              }}
              className="px-2.5 py-1 flex items-center gap-1.5 bg-[var(--b)]/70 text-[var(--t1)] rounded-full hover:bg-[var(--b)] active:scale-95 transition-all text-xs font-bold shrink-0"
            >
              <Undo2 size={12} strokeWidth={2.5} />
              {t.action.label}
            </motion.button>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
};
