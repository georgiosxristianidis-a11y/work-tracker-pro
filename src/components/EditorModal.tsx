import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Save, Minus, Plus, CircleCheck, Trash, Database } from 'lucide-react';
import { AnimatedTrash } from './AnimatedTrash';
import { AnimatedCheck } from './AnimatedCheck';
import { formatMoney } from '../lib/utils';
import { AppSettings } from '../constants';
import { useAppStore } from '../store/useAppStore';

interface EditorModalProps {
  settings: AppSettings;
  curSym: string;
  calcEarnings: (hours: number) => number;
  saveEntry: (date: string, hours: number) => Promise<void>;
  deleteEntryTap: { isConfirming: boolean; trigger: () => void };
  t: (key: string) => string;
  haptic: (pattern?: number | number[]) => void;
}

export const EditorModal = ({
  settings,
  curSym,
  calcEarnings,
  saveEntry,
  deleteEntryTap,
  t,
  haptic
}: EditorModalProps) => {
  const { editorDate, setEditorDate, editorHours, setEditorHours } = useAppStore();
  const [showSaveAnim, setShowSaveAnim] = useState(false);
  const [showDeleteAnim, setShowDeleteAnim] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [showAutoSaved, setShowAutoSaved] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!editorDate) {
      isFirstRender.current = true;
      return;
    }
    
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    setIsAutoSaving(true);
    setShowAutoSaved(false);
    
    const timeout = setTimeout(async () => {
      await saveEntry(editorDate, editorHours);
      setIsAutoSaving(false);
      setShowAutoSaved(true);
      
      setTimeout(() => {
        setShowAutoSaved(false);
      }, 2000);
    }, 600);
    
    return () => clearTimeout(timeout);
  }, [editorHours, editorDate, saveEntry]);

  return (
    <>
      <AnimatePresence>
        {editorDate && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 z-[100] flex items-end"
            onClick={() => setEditorDate(null)}
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 250, mass: 0.8 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.8 }}
              onDragEnd={(e: any, { offset, velocity }: any) => {
                if (offset.y > 50 || velocity.y > 200) {
                  setEditorDate(null);
                }
              }}
              className="w-full bg-[var(--bg)] rounded-t-[2.5rem] p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-8 shadow-[0_-20px_40px_rgba(0,0,0,0.1)]"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-[var(--b)] rounded-full mx-auto" />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-xl font-black text-[var(--t1)] tracking-tight">
                    {(() => {
                      const [y, m, d] = editorDate.split('-');
                      return `${d} - ${m} - ${y}`;
                    })()}
                  </h2>
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--t3)]">Log Work Hours</p>
                </div>
                
                <div className="h-8 flex items-center justify-center">
                  <AnimatePresence mode="wait">
                    {isAutoSaving ? (
                      <motion.div
                        key="saving"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="text-[var(--t3)]"
                      >
                        <Database size={16} className="animate-pulse" />
                      </motion.div>
                    ) : showAutoSaved ? (
                      <motion.div
                        key="saved"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="text-[var(--a)] flex items-center justify-center relative"
                      >
                        <motion.div 
                          animate={{ scale: [1, 1.5], opacity: [0.5, 0] }} 
                          transition={{ duration: 1, repeat: Infinity }}
                          className="absolute inset-0 bg-[var(--a)] rounded-full"
                        />
                        <CircleCheck size={16} className="relative z-10 bg-[var(--bg)] rounded-full" />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
              
              <div className="p-6 mt-6 rounded-3xl bg-[var(--bg-1)] border border-[var(--b)] flex flex-col items-center gap-3 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[var(--a)] opacity-0 group-hover:opacity-5 transition-opacity" />
                <div className="flex items-center justify-between w-full relative z-10">
                  <button onClick={() => { haptic(10); setEditorHours(Math.max(0, editorHours - 0.5)); }} className="w-14 h-14 rounded-2xl bg-[var(--t1)] text-[var(--bg)] flex items-center justify-center active:scale-90 transition-all shadow-md" aria-label={t('Decrease hours')}><Minus size={24} /></button>
                  <div className="text-4xl font-black text-[var(--t1)] flex items-baseline gap-2.5 translate-y-1">
                    <motion.span 
                      key={editorHours}
                      initial={{ opacity: 0.5, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20, mass: 0.5 }}
                    >
                      {editorHours}
                    </motion.span>
                    <span className="text-base text-[var(--t3)]">h</span>
                  </div>
                  <button onClick={() => { haptic(15); setEditorHours(Math.min(24, editorHours + 0.5)); }} className="w-14 h-14 rounded-2xl bg-[var(--t1)] text-[var(--bg)] flex items-center justify-center active:scale-90 transition-all shadow-md" aria-label={t('Increase hours')}><Plus size={24} /></button>
                </div>
                <div className="flex items-center gap-2 relative z-10">
                  <div className="text-xs font-bold text-[var(--a)]">{curSym}{formatMoney(calcEarnings(editorHours))}</div>
                  {editorHours > settings.normal && (
                    <div className="text-xs font-bold bg-[var(--green-bg)] text-[var(--green)] px-2 py-0.5 rounded uppercase shadow-sm">
                      +{editorHours - settings.normal}h OT
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <motion.button 
                  whileHover="hover"
                  onClick={async () => { 
                    await saveEntry(editorDate, editorHours); 
                    setEditorDate(null);
                    setShowSaveAnim(true);
                    setTimeout(() => setShowSaveAnim(false), 1500);
                  }} 
                  className="group h-16 rounded-2xl bg-[var(--t1)] text-[var(--bg)] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg hover:shadow-xl"
                >
                  <AnimatedCheck size={18} className="group-hover:scale-110 transition-transform" /> {t('Save')}
                </motion.button>
                <motion.button 
                  whileHover="hover"
                  onClick={() => {
                    if (deleteEntryTap.isConfirming) {
                      setShowDeleteAnim(true);
                      setTimeout(() => setShowDeleteAnim(false), 1500);
                    }
                    deleteEntryTap.trigger();
                  }} 
                  className="h-16 rounded-2xl border border-[var(--danger)]/20 text-[var(--danger)] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm hover:bg-[var(--b)] group"
                >
                  <AnimatedTrash size={18} isConfirming={deleteEntryTap.isConfirming} className="group-hover:scale-110 transition-transform" />
                  {deleteEntryTap.isConfirming ? 'Confirm' : 'Delete'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSaveAnim && (
          <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none">
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.2, opacity: 0, filter: 'blur(10px)' }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="bg-[var(--t1)] text-[var(--bg)] px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4"
            >
              <motion.div
                initial={{ rotate: -90, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.1 }}
                className="w-16 h-16 bg-[var(--bg)] rounded-full flex items-center justify-center"
              >
                <CircleCheck size={32} className="text-[var(--t1)]" />
              </motion.div>
              <h2 className="text-xl font-black tracking-widest uppercase">SAVED</h2>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDeleteAnim && (
          <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none">
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.2, opacity: 0, filter: 'blur(10px)' }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="bg-[var(--danger)] text-white px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4"
            >
              <motion.div
                initial={{ rotate: 90, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.1 }}
                className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center"
              >
                <Trash size={32} className="text-white" />
              </motion.div>
              <h2 className="text-xl font-black tracking-widest uppercase">DELETED</h2>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
