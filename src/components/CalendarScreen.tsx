import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Save, Calendar, ArrowDownUp } from 'lucide-react';
import { AnimatedTrash } from './AnimatedTrash';
import { AnimatedWand } from './AnimatedWand';
import { DOW_NAMES, MONTH_NAMES, MONTH_NAMES_RUS, MONTH_NAMES_GR } from '../constants';
import { formatMoney } from '../lib/utils';
import { Entry } from '../lib/db';
import { useAppStore } from '../store/useAppStore';

interface CalendarScreenProps {
  viewDate: Date;
  setViewDate: (date: Date) => void;
  entries: Entry[];
  settings: any;
  setSettings: any;
  t: (key: string) => string;
  defaultEditorHours: number;
  saveEntry: () => void;
  deleteEntry: (date: string) => void;
  calcEarnings: (hours: number) => number;
  curSym: string;
  clearTap: { trigger: () => void; isConfirming: boolean };
  clearMonthTap: { trigger: () => void; isConfirming: boolean };
  haptic: (pattern?: number | number[]) => void;
  openQuickFill: () => void;
}

const DayCell = React.memo(({ 
  day, ds, hours, isToday, setEditorDate, setEditorHours, defaultEditorHours, haptic 
}: { 
  day: number, ds: string, hours: number, isToday: boolean, 
  setEditorDate: (date: string) => void, setEditorHours: (hours: number) => void, 
  defaultEditorHours: number, haptic: (pattern: number | number[]) => void 
}) => {
  return (
    <motion.button 
      onClick={() => { haptic(10); setEditorDate(ds); setEditorHours(hours || defaultEditorHours); }}
      className={`
        relative aspect-square rounded-2xl border flex flex-col items-center justify-center gap-0.5 transition-all select-none active:scale-90
        ${hours && hours > 0 
          ? 'bg-[var(--a-bg)] border-[var(--a-b)] text-[var(--t1)]' 
          : isToday 
            ? 'bg-[var(--bg-1)] border-[var(--t1)] text-[var(--t1)]' 
            : 'bg-transparent border-transparent text-[var(--t2)] hover:bg-[var(--b)]'}
      `}
    >
      <span className={`text-[15px] font-bold ${hours && hours > 0 ? '-translate-y-[2px]' : ''}`}>
        {day}
      </span>

      {hours && hours > 0 && (
        <div className="absolute bottom-[6px] flex flex-col items-center">
          <div className={`w-3 h-[1.5px] rounded-full ${
            hours === 8 ? 'bg-[var(--t1)]' : 
            hours > 8 ? 'bg-[var(--a)]' : 
            'bg-[var(--t3)]'
          }`} />
        </div>
      )}
    </motion.button>
  );
});

export const CalendarScreen = ({
  viewDate, setViewDate, entries, settings, setSettings, t,
  defaultEditorHours,
  saveEntry, deleteEntry, calcEarnings, curSym, clearTap, clearMonthTap, haptic, openQuickFill
}: CalendarScreenProps) => {
  const { setEditorDate, setEditorHours } = useAppStore();
  const [isWandHovered, setIsWandHovered] = useState(false);
  const [isWandTapped, setIsWandTapped] = useState(false);
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDow = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;
  const today = new Date().toISOString().split('T')[0];
  
  const currentMonthPrefix = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
  const selectedDaysCount = useMemo(() => entries.filter(e => e.date.startsWith(currentMonthPrefix) && e.hours > 0).length, [entries, currentMonthPrefix]);

  const entryMap = useMemo(() => entries.reduce((acc, e) => {
    acc[e.date] = e.hours;
    return acc;
  }, {} as Record<string, number>), [entries]);

  return (
    <div className="space-y-6">
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <span className="text-micro font-bold text-[var(--t3)] uppercase tracking-widest leading-none mb-1 ml-1 block h-[12px]">
            {viewDate.getFullYear()}
          </span>
          <h1 className="text-2xl font-black tracking-tight text-[var(--t1)] truncate pr-2">
            {(() => {
              const mNames = settings.language === 'RUS' ? MONTH_NAMES_RUS : settings.language === 'GR' ? MONTH_NAMES_GR : MONTH_NAMES;
              return mNames[viewDate.getMonth()];
            })()}
          </h1>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <AnimatePresence>
            {selectedDaysCount > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, x: 10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8, x: 10 }}
                className="py-1 px-2.5 rounded-panel border border-[var(--b)] bg-[var(--bg-1)] flex flex-col items-center justify-center gap-0.5 shadow-sm min-w-[3rem] min-h-[2.75rem]"
              >
                <span className="text-micro font-bold uppercase tracking-widest text-[var(--t3)] opacity-50 leading-none mb-0.5">{t('Days')}</span>
                <span className="text-base font-black text-[var(--t1)] leading-none">{selectedDaysCount}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex gap-1.5">
            <motion.button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="group p-1.5 rounded-xl border border-[var(--b)] bg-[var(--bg-1)] text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--b)] hover:border-[var(--b)] hover:shadow-sm active:scale-95 transition-all duration-300" aria-label={t('Previous Month')}>
              <ChevronLeft size={18} strokeWidth={1.25} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
            </motion.button>
            <motion.button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="group p-1.5 rounded-xl border border-[var(--b)] bg-[var(--bg-1)] text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--b)] hover:border-[var(--b)] hover:shadow-sm active:scale-95 transition-all duration-300" aria-label={t('Next Month')}>
              <ChevronRight size={18} strokeWidth={1.25} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </motion.button>
          </div>
        </div>
      </div>

      <div className="p-3 bg-[var(--bg-1)] border border-[var(--b)] rounded-card shadow-sm relative">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center pb-2 flex justify-center opacity-40"
        >
          <div className="flex items-center gap-2 px-2 py-1">
            <div className="relative flex items-center justify-center w-4 h-4">
              <motion.div 
                animate={{ scale: [1, 4.5], opacity: [0.8, 0], borderWidth: ["1px", "0px"] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeOut" }}
                className="absolute w-1.5 h-1.5 rounded-full border border-[var(--t3)]"
              />
              <motion.div 
                animate={{ scale: [1, 4.5], opacity: [0.8, 0], borderWidth: ["1px", "0px"] }}
                transition={{ duration: 4.5, repeat: Infinity, delay: 2.25, ease: "easeOut" }}
                className="absolute w-1.5 h-1.5 rounded-full border border-[var(--t3)]"
              />
              <div className="relative z-10 w-1.5 h-1.5 rounded-full bg-[var(--t3)] opacity-50" />
            </div>
            <span className="text-micro font-medium text-[var(--t3)] opacity-50 uppercase tracking-widest translate-y-[1px]">
              {t('Tap a day to edit')}
            </span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-7 gap-1 touch-pan-y"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.05}
          onDragEnd={(e, { offset, velocity }) => {
            if (offset.x > 50 || velocity.x > 300) {
              haptic(10);
              setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)));
            } else if (offset.x < -50 || velocity.x < -300) {
              haptic(10);
              setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)));
            }
          }}
        >
          {DOW_NAMES.map(d => <div key={d} className="text-center text-micro font-black uppercase tracking-widest text-[var(--t3)] py-2 select-none">{d}</div>)}
          {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const ds = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hours = entryMap[ds];
            const isToday = ds === today;
            
            return (
              <DayCell
                key={day}
                day={day} ds={ds} hours={hours} isToday={isToday}
                setEditorDate={setEditorDate}
                setEditorHours={setEditorHours}
                defaultEditorHours={defaultEditorHours}
                haptic={haptic}
              />
            );
          })}
        </motion.div>
      </div>

      <div className="mt-4">
        <motion.button 
          onHoverStart={() => setIsWandHovered(true)}
          onHoverEnd={() => setIsWandHovered(false)}
          onPointerDown={() => setIsWandTapped(true)}
          onPointerUp={() => setIsWandTapped(false)}
          onPointerLeave={() => {
            setIsWandHovered(false);
            setIsWandTapped(false);
          }}
          onClick={() => { haptic([10, 20]); openQuickFill(); }} 
          className="group w-full h-14 rounded-2xl border border-[var(--b)] bg-[var(--bg-1)] font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-5 text-[var(--t2)] transition-colors hover:bg-[var(--b)] hover:text-[var(--t1)] hover:border-[var(--b)] active:scale-[0.98]"
        >
          <AnimatedWand size={18} className="text-[var(--a)]" strokeWidth={2} isHovered={isWandHovered} isTapped={isWandTapped} />
          {t('Quick Fill')}
        </motion.button>
      </div>

      {entries.some(e => e.date.startsWith(currentMonthPrefix) && e.hours > 0) ? (
        <div className="mt-8 space-y-2 pb-8">
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--t3)]">{t('Recent Entries')}</span>
            <button 
              onClick={() => setSettings(s => ({ ...s, sortOldestFirst: !s.sortOldestFirst }))}
              className={`p-2 -m-2 text-[var(--t3)] hover:text-[var(--t1)] transition-colors active:scale-95 ${settings.sortOldestFirst ? 'text-[var(--a)]' : ''}`}
              aria-label={settings.sortOldestFirst ? t('Sort Oldest First') : t('Sort Newest First')}
            >
              <ArrowDownUp size={14} strokeWidth={2} />
            </button>
          </div>
          {entries
            .filter(e => e.date.startsWith(currentMonthPrefix) && e.hours > 0)
            .sort((a,b) => settings.sortOldestFirst ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date))
            .slice(0, 3)
            .map(e => {
              const [yStr, mStr, dStr] = e.date.split('-');
              const dateObj = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
              const dowIdx = dateObj.getDay();
              const mappedDow = dowIdx === 0 ? 6 : dowIdx - 1;
              
              return (
                <div key={e.date} className="relative w-full overflow-hidden rounded-[1rem] bg-[var(--a-bg)] mb-2 last:mb-0">
                  <div className="absolute top-0 right-0 h-full w-[80px] flex items-center justify-end pr-5">
                    <motion.button 
                      whileHover="hover"
                      onClick={() => { haptic(10); deleteEntry(e.date); }} 
                      className="text-[var(--danger)] active:scale-90 transition-transform group"
                      aria-label={t('Delete entry')}
                    >
                      <AnimatedTrash size={20} className="group-hover:scale-110 transition-transform group-active:text-[var(--danger)]" />
                    </motion.button>
                  </div>
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: -80, right: 0 }}
                    dragElastic={0.4}
                    whileDrag={{ scale: 0.98 }}
                    className="relative z-10 bg-[var(--bg-1)] flex items-center gap-4 p-3 rounded-[1rem] border border-[var(--b)] cursor-grab active:cursor-grabbing"
                    style={{ willChange: "transform" }}
                  >
                    <div className="w-10 h-10 rounded-[12px] bg-[var(--a)] flex flex-col items-center justify-center gap-0.5 text-[var(--bg)] transition-transform shrink-0">
                      <span className="text-sm font-black leading-none">{dStr}</span>
                      <span className="text-micro font-bold uppercase opacity-80 tracking-widest">{DOW_NAMES[mappedDow]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[var(--t1)] flex items-center gap-2 truncate">
                        {e.hours}h 
                        {e.hours > settings.normal && (
                          <span className="text-micro bg-[var(--green-bg)] text-[var(--green)] px-1.5 py-0.5 rounded uppercase shrink-0">
                            +{e.hours - settings.normal}h OT
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--t3)] font-medium truncate">{e.date}</div>
                    </div>
                    <div className={`text-sm font-black text-[var(--t1)] shrink-0 ${settings.privacyMode ? 'blur-md' : ''}`}>
                      {curSym}{formatMoney(calcEarnings(e.hours))}
                    </div>
                  </motion.div>
                </div>
              );
            })}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 mb-8 relative py-8 text-center"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-1)] to-transparent opacity-50 rounded-card" />
          <div className="relative z-10 space-y-4 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-[var(--bg-1)] border border-[var(--b)] flex flex-col items-center justify-center gap-0.5 text-[var(--t3)] opacity-80">
              <Calendar size={24} strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-[var(--t1)] tracking-tight">{t('No Entries')}</h3>
              <p className="text-xs font-bold text-[var(--t3)] uppercase tracking-widest leading-relaxed max-w-[200px] mx-auto opacity-70">
                {t('Tap a day on the calendar to log hours')}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
