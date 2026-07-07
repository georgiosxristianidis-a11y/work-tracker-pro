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
}

export const Toasts = ({ toasts, removeToast }: ToastsProps & { removeToast?: (id: number) => void }) => {
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

const ToastItem: React.FC<{ t: ToastMessage, removeToast?: (id: number) => void }> = ({ t, removeToast }) => {
  const [actionDone, setActionDone] = React.useState(false);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, filter: 'blur(5px)' }}
      className="p-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold pointer-events-auto bg-[var(--bg)]/90 backdrop-blur-md border border-[var(--b)] text-[var(--t1)]"
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${t.type === 'success' ? 'bg-[var(--a-bg)] text-[var(--a)]' : t.type === 'error' ? 'bg-[var(--danger-bg)] text-[var(--danger)]' : 'bg-[var(--b)] text-[var(--t1)]'}`}>
        {t.type === 'success' ? <Check size={12} strokeWidth={3} /> : t.type === 'error' ? <AlertTriangle size={12} strokeWidth={3} /> : <Sparkles size={12} strokeWidth={3} />}
      </div>
      <span className="flex-1">{t.msg}</span>
      {t.action && (
        <AnimatePresence mode="popLayout">
          {!actionDone && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 2, filter: 'blur(4px)', y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              onClick={(e) => {
                e.stopPropagation();
                setActionDone(true);
                t.action?.onClick();
                if (removeToast) {
                  setTimeout(() => removeToast(t.id), 400); // give it time to animate then remove toast entirely
                }
              }}
              className="px-3 py-1 flex items-center gap-1.5 bg-transparent text-[var(--a)] rounded-full hover:bg-[var(--b)] active:scale-95 transition-all text-[11px] uppercase tracking-wider font-black"
            >
              <Undo2 size={12} strokeWidth={3} />
              {t.action.label}
            </motion.button>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );
};
