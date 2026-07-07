import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Save, X, Plus, Minus, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { AnimatedCheck } from './AnimatedCheck';
import { useAppStore } from '../store/useAppStore';

const DOW_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function BulkAddModal({
  isOpen,
  setIsOpen,
  t,
  haptic,
  saveMultipleEntries,
  defaultHours = 8
}: any) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [hours, setHours] = useState(defaultHours);
  const [showSaveAnim, setShowSaveAnim] = useState(false);

  const viewMonth = currentDate.getMonth();
  const viewYear = currentDate.getFullYear();

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDay = new Date(viewYear, viewMonth, 1).getDay();
  const startOffset = startDay === 0 ? 6 : startDay - 1;

  const handleDateToggle = (ds: string) => {
    haptic(10);
    setSelectedDates(prev => {
      const next = new Set(prev);
      if (next.has(ds)) next.delete(ds);
      else next.add(ds);
      return next;
    });
  };

  const handleSave = async () => {
    if (selectedDates.size === 0) return;
    haptic([10, 20]);
    await saveMultipleEntries(Array.from(selectedDates), hours);
    setShowSaveAnim(true);
    setTimeout(() => {
      setShowSaveAnim(false);
      setIsOpen(false);
      setSelectedDates(new Set());
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 z-[100] flex items-end"
          onClick={() => setIsOpen(false)}
        >
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.8 }}
            onDragEnd={(e: any, { offset, velocity }: any) => {
              if (offset.y > 100 || velocity.y > 300) {
                setIsOpen(false);
              }
            }}
            className="w-full bg-[var(--bg)] rounded-t-[2.5rem] p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-6 shadow-[0_-20px_40px_rgba(0,0,0,0.1)] flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-[var(--b)] rounded-full mx-auto shrink-0" />
            
            <div className="flex items-center justify-between shrink-0">
              <div className="space-y-1">
                <h2 className="text-xl font-black text-[var(--t1)] tracking-tight">{t('Bulk Add Hours')}</h2>
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--t3)]">Select multiple dates</p>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-full bg-[var(--bg-1)] border border-[var(--b)] flex items-center justify-center text-[var(--t2)] active:scale-95 transition-transform"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 min-h-0">
              {/* Hours Selector */}
              <div className="p-5 rounded-3xl bg-[var(--bg-1)] border border-[var(--b)] flex flex-col items-center gap-3 relative overflow-hidden group shrink-0">
                <div className="flex items-center justify-between w-full relative z-10">
                  <button onClick={() => { haptic(10); setHours(Math.max(0, hours - 0.5)); }} className="w-12 h-12 rounded-2xl bg-[var(--t1)] text-[var(--bg)] flex items-center justify-center active:scale-90 transition-all shadow-md"><Minus size={20} /></button>
                  <div className="text-4xl font-black text-[var(--t1)] flex items-baseline gap-1.5">
                    <motion.span 
                      key={hours}
                      initial={{ opacity: 0.5, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {hours}
                    </motion.span>
                    <span className="text-base text-[var(--t3)]">h</span>
                  </div>
                  <button onClick={() => { haptic(15); setHours(Math.min(24, hours + 0.5)); }} className="w-12 h-12 rounded-2xl bg-[var(--t1)] text-[var(--bg)] flex items-center justify-center active:scale-90 transition-all shadow-md"><Plus size={20} /></button>
                </div>
              </div>

              {/* Mini Calendar */}
              <div className="p-4 rounded-3xl border border-[var(--b)] bg-[var(--bg-1)] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-[var(--t1)]">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                  <div className="flex gap-2">
                    <button onClick={() => setCurrentDate(new Date(viewYear, viewMonth - 1, 1))} className="p-1.5 rounded-lg border border-[var(--b)] bg-[var(--bg)] text-[var(--t2)] active:scale-95"><ChevronLeft size={16} /></button>
                    <button onClick={() => setCurrentDate(new Date(viewYear, viewMonth + 1, 1))} className="p-1.5 rounded-lg border border-[var(--b)] bg-[var(--bg)] text-[var(--t2)] active:scale-95"><ChevronRight size={16} /></button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {DOW_NAMES.map(d => <div key={d} className="text-center text-[10px] font-black uppercase tracking-widest text-[var(--t3)] py-1 select-none">{d}</div>)}
                  {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isSelected = selectedDates.has(ds);
                    
                    return (
                      <button
                        key={day}
                        onClick={() => handleDateToggle(ds)}
                        className={`aspect-square rounded-xl border flex flex-col items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-[var(--a)] border-[var(--a)] text-[var(--bg)] shadow-md' 
                            : 'bg-[var(--bg)] border-[var(--b)] text-[var(--t1)] hover:border-[var(--a-bg)]'
                        }`}
                      >
                        <span className="text-sm font-bold">{day}</span>
                        {isSelected && <Check size={12} strokeWidth={4} className="mt-0.5 opacity-80" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="shrink-0 pt-2">
              <motion.button 
                whileHover={selectedDates.size > 0 ? "hover" : undefined}
                onClick={handleSave}
                disabled={selectedDates.size === 0}
                className="group w-full h-16 rounded-2xl bg-[var(--t1)] text-[var(--bg)] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:active:scale-100"
              >
                <AnimatedCheck size={18} className="group-hover:scale-110 transition-transform" /> {t('Save to')} {selectedDates.size} {selectedDates.size === 1 ? t('Day') : t('Days')}
              </motion.button>
            </div>
            
            <AnimatePresence>
              {showSaveAnim && (
                <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center pointer-events-none rounded-t-[2.5rem] overflow-hidden bg-black/40">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 1.2, opacity: 0, filter: 'blur(10px)' }}
                    className="bg-[var(--t1)] text-[var(--bg)] px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4"
                  >
                    <div className="w-16 h-16 bg-[var(--bg)] rounded-full flex items-center justify-center">
                      <Check size={32} className="text-[var(--t1)]" strokeWidth={3} />
                    </div>
                    <h2 className="text-xl font-black tracking-widest uppercase">SAVED</h2>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
