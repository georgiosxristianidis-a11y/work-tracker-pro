import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings2 } from 'lucide-react';
import { AnimatedTrash } from './AnimatedTrash';

interface QuickFillModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  t: (key: string) => string;
  haptic: (pattern: number | number[]) => void;
  selectedTemplate: string;
  setSelectedTemplate: (t: string) => void;
  showCustomFill: boolean;
  setShowCustomFill: (show: boolean) => void;
  customFill: { work: number; off: number; hours: number };
  setCustomFill: React.Dispatch<React.SetStateAction<{ work: number; off: number; hours: number }>>;
  excludeSundays: boolean;
  setExcludeSundays: (exclude: boolean) => void;
  applyTap: { isConfirming: boolean; trigger: () => void };
  clearTap: { isConfirming: boolean; trigger: () => void };
}

export const QuickFillModal = ({
  isOpen,
  setIsOpen,
  t,
  haptic,
  selectedTemplate,
  setSelectedTemplate,
  showCustomFill,
  setShowCustomFill,
  customFill,
  setCustomFill,
  excludeSundays,
  setExcludeSundays,
  applyTap,
  clearTap
}: QuickFillModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute inset-0 z-[100] bg-[var(--bg)] flex flex-col"
        >
          <div className="flex items-center justify-between p-6 pb-2">
            <h2 className="text-2xl font-black">{t('Quick Fill')}</h2>
            <button 
              onClick={() => setIsOpen(false)}
              className="w-10 h-10 rounded-full bg-[var(--bg-1)] border border-[var(--b)] flex items-center justify-center text-[var(--t2)]"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pt-4 pb-[calc(64px+env(safe-area-inset-bottom))] space-y-6">
            {/* Templates */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {['2/2-11', '5/2-8', '6/1-10', '4/4-12'].map((tmpl) => (
                  <button
                    key={tmpl}
                    onClick={() => {
                      haptic(10);
                      setSelectedTemplate(tmpl);
                      setShowCustomFill(false);
                    }}
                    className={`p-4 rounded-3xl border transition-all ${
                      selectedTemplate === tmpl && !showCustomFill
                        ? 'bg-[var(--a-bg)] border-[var(--a-b)] text-[var(--a)]'
                        : 'bg-[var(--bg-1)] border-[var(--b)] text-[var(--t2)]'
                    }`}
                  >
                    <div className="font-bold">{tmpl.split('-')[0]}</div>
                    <div className="text-xs opacity-70">{tmpl.split('-')[1]}h {t('Days')}</div>
                  </button>
                ))}
                <button
                  onClick={() => {
                    haptic(10);
                    setSelectedTemplate('custom');
                    setShowCustomFill(true);
                  }}
                  className={`p-4 rounded-3xl border transition-all ${
                    showCustomFill
                      ? 'bg-[var(--a-bg)] border-[var(--a-b)] text-[var(--a)]'
                      : 'bg-[var(--bg-1)] border-[var(--b)] text-[var(--t2)]'
                  }`}
                >
                  <div className="font-bold">{t('Custom')}</div>
                  <div className="text-xs opacity-70"><Settings2 size={12} className="inline-block" /></div>
                </button>
              </div>
            </div>

            <AnimatePresence>
              {showCustomFill && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 p-5 rounded-3xl bg-[var(--bg-1)] border border-[var(--b)]">
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-[var(--t3)]">Work Days</label>
                      <div className="flex gap-2">
                        {[2,3,4,5,6].map(n => (
                          <button
                            key={`w${n}`}
                            onClick={() => setCustomFill(c => ({...c, work: n}))}
                            className={`flex-1 aspect-square rounded-xl border flex items-center justify-center font-bold text-sm ${customFill.work === n ? 'border-[var(--t1)] text-[var(--t1)]' : 'border-[var(--b)] text-[var(--t3)]'}`}
                          >{n}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-[var(--t3)]">Off Days</label>
                      <div className="flex gap-2">
                        {[1,2,3,4].map(n => (
                          <button
                            key={`o${n}`}
                            onClick={() => setCustomFill(c => ({...c, off: n}))}
                            className={`flex-1 aspect-square rounded-xl border flex items-center justify-center font-bold text-sm ${customFill.off === n ? 'border-[var(--t1)] text-[var(--t1)]' : 'border-[var(--b)] text-[var(--t3)]'}`}
                          >{n}</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-xs font-bold text-[var(--t3)]">Hours</label>
                      <div className="flex gap-2">
                        {[8,10,11,12].map(n => (
                          <button
                            key={`h${n}`}
                            onClick={() => setCustomFill(c => ({...c, hours: n}))}
                            className={`flex-1 aspect-square rounded-xl border flex items-center justify-center font-bold text-sm ${customFill.hours === n ? 'border-[var(--t1)] text-[var(--t1)]' : 'border-[var(--b)] text-[var(--t3)]'}`}
                          >{n}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={() => {
                haptic(10);
                setExcludeSundays(!excludeSundays);
              }}
              className={`w-full flex items-center justify-between px-2 py-1 mb-2 rounded-xl transition-all duration-300 active:scale-[0.98] ${
                excludeSundays 
                  ? 'bg-[var(--a-bg)]' 
                  : 'bg-transparent'
              }`}
            >
              <span className={`text-xs font-bold transition-colors flex items-center gap-2 ${
                excludeSundays ? 'text-[var(--a)]' : 'text-[var(--t3)]'
              }`}>
                {t('Skip Sundays')}
              </span>
              
              <div className={`relative flex items-center w-[36px] h-[20px] p-[2px] rounded-full transition-colors duration-300 border-2 ${
                excludeSundays ? 'bg-[var(--a)] border-[var(--a)]' : 'bg-transparent border-[var(--t3)]'
              }`}>
                <motion.div 
                  layout
                  className={`w-[12px] h-[12px] rounded-full shadow-sm ${excludeSundays ? 'bg-[var(--bg)]' : 'bg-[var(--t3)]'}`}
                  initial={false}
                  animate={{ 
                    x: excludeSundays ? 16 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </div>
            </button>

            <div className="pt-4 grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  if (applyTap.isConfirming) {
                    applyTap.trigger();
                    setIsOpen(false);
                  } else {
                    applyTap.trigger();
                  }
                }}
                className="h-14 rounded-2xl bg-[var(--t1)] text-[var(--bg)] font-black text-sm active:scale-95 transition-transform group flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-50 group-active:opacity-100 transition-opacity" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                {applyTap.isConfirming ? t('Tap to Apply') : t('Apply')}
              </button>
              <motion.button 
                whileHover="hover"
                onClick={() => {
                  if (clearTap.isConfirming) {
                    clearTap.trigger();
                    setIsOpen(false);
                  } else {
                    clearTap.trigger();
                  }
                }}
                className="h-14 rounded-2xl bg-[var(--bg-1)] border border-[var(--danger-bg)] text-[var(--danger)] font-black text-sm active:scale-95 transition-transform flex items-center justify-center gap-2 group"
              >
                <AnimatedTrash size={16} isConfirming={clearTap.isConfirming} className="group-hover:scale-110 transition-transform" />
                {clearTap.isConfirming ? t('Tap to Clear') : t('Clear')}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
