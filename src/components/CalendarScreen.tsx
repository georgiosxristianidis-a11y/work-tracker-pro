import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar, ArrowDownUp, X } from 'lucide-react';
import { AnimatedTrash } from './AnimatedTrash';
import { DayInspector } from './DayInspector';
import { AppSettings, DOW_NAMES, MONTH_NAMES, MONTH_NAMES_RUS, MONTH_NAMES_GR } from '../constants';
import { formatMoney } from '../lib/utils';
import { Entry } from '../lib/db';
import { useAppStore } from '../store/useAppStore';

interface CalendarScreenProps {
  viewDate: Date;
  setViewDate: (date: Date) => void;
  entries: Entry[];
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  t: (key: string) => string;
  defaultEditorHours: number;
  deleteEntry: (date: string) => void;
  saveEntry?: (date: string, hours: number) => Promise<void> | void;
  smartFillUpToDay?: (targetDay?: number, customHours?: number) => Promise<void>;
  calcEarnings: (hours: number) => number;
  curSym: string;
  clearTap: { trigger: () => void; isConfirming: boolean };
  clearMonthTap: { trigger: () => void; isConfirming: boolean };
  haptic: (pattern?: number | number[]) => void;
  openQuickFill: () => void;
}

interface DayCellProps {
  day: number;
  ds: string;
  hours: number;
  isToday: boolean;
  isSelected: boolean;
  isWeekend: boolean;
  normalHours: number;
  onSelect: (ds: string) => void;
  onDoubleTap: (ds: string) => void;
  haptic: (pattern?: number | number[]) => void;
}

const DayCell = React.memo(({ 
  day, ds, hours, isToday, isSelected, isWeekend, normalHours,
  onSelect, onDoubleTap, haptic
}: DayCellProps) => {
  const lastTapRef = useRef<number>(0);
  const isOvertime = hours > normalHours;

  const handleClick = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap detected
      haptic([20, 20]);
      onDoubleTap(ds);
    } else {
      haptic(10);
      onSelect(ds);
    }
    lastTapRef.current = now;
  };

  return (
    <motion.button 
      type="button"
      onClick={handleClick}
      aria-label={`${day}, ${hours > 0 ? `${hours} hours` : isToday ? 'today' : 'empty'}`}
      className={`
        relative aspect-square rounded-full flex flex-col items-center justify-center p-1 transition-all select-none active:scale-95
        ${isSelected 
          ? 'border-2 border-[var(--t1)] text-[var(--t1)] bg-[var(--bg-1)] shadow-sm' 
          : hours > 0 
            ? 'bg-[var(--a-bg)] border border-[var(--a-b)] text-[var(--t1)]' 
            : isToday 
              ? 'border border-[var(--t2)] text-[var(--t1)] bg-transparent' 
              : isWeekend
                ? 'border border-transparent text-[var(--t3)] opacity-60'
                : 'border border-transparent text-[var(--t2)] hover:bg-[var(--b)]'}
      `}
    >
      <span className={`text-[15px] font-bold leading-none ${hours > 0 ? 'text-[var(--t1)]' : ''}`}>
        {day}
      </span>

      {hours > 0 ? (
        <span className={`text-[10px] font-black leading-none tabular-nums mt-0.5 ${isOvertime ? 'text-[var(--a)]' : 'text-[var(--t1)]'}`}>
          {hours}h
        </span>
      ) : isToday ? (
        <div className="w-1 h-1 rounded-full bg-[var(--t1)] mt-0.5" />
      ) : null}
    </motion.button>
  );
});

export const CalendarScreen = ({
  viewDate, setViewDate, entries, settings, setSettings, t,
  defaultEditorHours,
  deleteEntry, saveEntry, smartFillUpToDay, calcEarnings, curSym, haptic, openQuickFill
}: CalendarScreenProps) => {
  const { setEditorDate, setEditorHours, saveEntry: storeSaveEntry } = useAppStore();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDow = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentMonthPrefix = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
  
  // Active selected day defaults to today if on current month, otherwise the 1st
  const isCurrentMonth = now.getFullYear() === viewDate.getFullYear() && now.getMonth() === viewDate.getMonth();
  const defaultSelectedDay = isCurrentMonth ? today : `${currentMonthPrefix}-01`;
  const [selectedDate, setSelectedDate] = useState<string>(defaultSelectedDay);

  // Sync selected date when switching months
  useEffect(() => {
    if (!selectedDate.startsWith(currentMonthPrefix)) {
      setSelectedDate(isCurrentMonth ? today : `${currentMonthPrefix}-01`);
    }
  }, [currentMonthPrefix, isCurrentMonth, today, selectedDate]);

  const monthEntries = useMemo(() => {
    return entries.filter(e => e.date.startsWith(currentMonthPrefix) && e.hours > 0);
  }, [entries, currentMonthPrefix]);

  const monthHours = useMemo(() => {
    return monthEntries.reduce((acc, e) => acc + e.hours, 0);
  }, [monthEntries]);

  const monthEarnings = useMemo(() => calcEarnings(monthHours), [calcEarnings, monthHours]);

  const entryMap = useMemo(() => entries.reduce((acc, e) => {
    acc[e.date] = e.hours;
    return acc;
  }, {} as Record<string, number>), [entries]);

  const handleSaveHours = useCallback(async (date: string, hours: number) => {
    if (saveEntry) {
      await saveEntry(date, hours);
    } else {
      await storeSaveEntry(date, hours);
    }
  }, [saveEntry, storeSaveEntry]);

  const handleDoubleTapDay = useCallback(async (date: string) => {
    const existing = entryMap[date];
    if (existing && existing > 0) {
      // Open detailed editor instead of destructive delete
      setEditorDate(date);
      setEditorHours(existing);
    } else {
      // Instantly log standard hours for empty day
      await handleSaveHours(date, defaultEditorHours || 8);
    }
  }, [entryMap, defaultEditorHours, handleSaveHours, setEditorDate, setEditorHours]);

  const canSmartFill = isCurrentMonth && now.getDate() >= 1;
  const smartFillTargetDay = now.getDate();

  const emptyDaysCount = useMemo(() => {
    if (!canSmartFill) return 0;
    let count = 0;
    for (let i = 1; i <= smartFillTargetDay; i++) {
      const ds = `${currentMonthPrefix}-${String(i).padStart(2, '0')}`;
      const dow = new Date(viewDate.getFullYear(), viewDate.getMonth(), i).getDay();
      if (dow === 0) continue; // sunday
      if (settings.normal === 8 && dow === 6) continue; // saturday for 5/2
      if (!entryMap[ds] || entryMap[ds] === 0) {
        count++;
      }
    }
    return count;
  }, [canSmartFill, smartFillTargetDay, currentMonthPrefix, viewDate, entryMap, settings.normal]);

  const monthName = useMemo(() => {
    const mNames = settings.language === 'RUS' ? MONTH_NAMES_RUS : settings.language === 'GR' ? MONTH_NAMES_GR : MONTH_NAMES;
    return mNames[viewDate.getMonth()];
  }, [settings.language, viewDate]);

  return (
    <div className="space-y-4">
      {/* Top Header: Month Title, Interactive KPI Pill, Month Navigation */}
      <div className="relative flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <span className="text-micro font-bold text-[var(--t3)] uppercase tracking-widest leading-none mb-1 ml-1 block h-[12px]">
            {viewDate.getFullYear()}
          </span>
          <h1 className="text-2xl font-black tracking-tight text-[var(--t1)] truncate pr-2">
            {monthName}
          </h1>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {/* Interactive Metric Strip (Opens Shift History Drawer) */}
          <button
            type="button"
            onClick={() => { haptic(10); setIsHistoryOpen(true); }}
            className="py-1 px-3 rounded-panel border border-[var(--b)] bg-[var(--bg-1)] flex items-center justify-center gap-1.5 shadow-sm text-xs font-bold text-[var(--t1)] tabular-nums hover:border-[var(--a)]/40 hover:bg-[var(--b)] active:scale-95 transition-all group"
            aria-label={t('View month shift history')}
          >
            <span>{monthHours}h</span>
            <span className="text-[var(--t3)] opacity-60">•</span>
            <span className={settings.privacyMode ? 'blur-sm' : ''}>
              {curSym}{formatMoney(monthEarnings)}
            </span>
            <ChevronRight size={13} className="text-[var(--t3)] group-hover:text-[var(--t1)] transition-colors -mr-0.5" />
          </button>

          <div className="flex gap-1.5">
            <motion.button 
              onClick={() => { const d = new Date(viewDate); d.setMonth(d.getMonth() - 1); setViewDate(d); }} 
              className="p-1.5 rounded-xl border border-[var(--b)] bg-[var(--bg-1)] text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--b)] active:scale-95 transition-all" 
              aria-label={t('Previous Month')}
            >
              <ChevronLeft size={18} strokeWidth={1.5} />
            </motion.button>
            <motion.button 
              onClick={() => { const d = new Date(viewDate); d.setMonth(d.getMonth() + 1); setViewDate(d); }} 
              className="p-1.5 rounded-xl border border-[var(--b)] bg-[var(--bg-1)] text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--b)] active:scale-95 transition-all" 
              aria-label={t('Next Month')}
            >
              <ChevronRight size={18} strokeWidth={1.5} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Hero: Elevated Spacious Calendar Card (Harmonic Air & Breathing Space) */}
      <div className="p-4 sm:p-5 bg-[var(--bg-1)] border border-[var(--b)] rounded-card shadow-sm relative">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-7 gap-y-3.5 gap-x-1.5 touch-pan-y"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.05}
          onDragEnd={(e, { offset, velocity }) => {
            if (offset.x > 50 || velocity.x > 300) {
              haptic(10);
              const d = new Date(viewDate);
              d.setMonth(d.getMonth() - 1);
              setViewDate(d);
            } else if (offset.x < -50 || velocity.x < -300) {
              haptic(10);
              const d = new Date(viewDate);
              d.setMonth(d.getMonth() + 1);
              setViewDate(d);
            }
          }}
        >
          {DOW_NAMES.map((d, idx) => (
            <div 
              key={d} 
              className={`text-center text-micro font-black uppercase tracking-widest py-1.5 select-none ${
                idx >= 5 ? 'text-[var(--t3)] opacity-60' : 'text-[var(--t3)]'
              }`}
            >
              {d}
            </div>
          ))}

          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const ds = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hours = entryMap[ds] || 0;
            const isToday = ds === today;
            const isSelected = ds === selectedDate;
            const dow = new Date(viewDate.getFullYear(), viewDate.getMonth(), day).getDay();
            const isWeekend = dow === 0 || dow === 6;
            
            return (
              <DayCell
                key={day}
                day={day} 
                ds={ds} 
                hours={hours} 
                isToday={isToday}
                isSelected={isSelected}
                isWeekend={isWeekend}
                normalHours={settings.normal}
                onSelect={setSelectedDate}
                onDoubleTap={handleDoubleTapDay}
                haptic={haptic}
              />
            );
          })}
        </motion.div>
      </div>

      {/* Bottom Focused Day Cockpit (DayInspector & Smart Actions) */}
      <DayInspector
        selectedDate={selectedDate}
        entry={entryMap[selectedDate] ? { hours: entryMap[selectedDate] } : null}
        settings={settings}
        curSym={curSym}
        calcEarnings={calcEarnings}
        onSaveHours={handleSaveHours}
        onDelete={deleteEntry}
        onOpenEditor={(d, h) => {
          setEditorDate(d);
          setEditorHours(h);
        }}
        onOpenQuickFill={openQuickFill}
        onSmartFill={canSmartFill && smartFillUpToDay ? () => smartFillUpToDay(smartFillTargetDay, defaultEditorHours) : undefined}
        canSmartFill={canSmartFill}
        smartFillDay={smartFillTargetDay}
        emptyDaysCount={emptyDaysCount}
        defaultHours={defaultEditorHours}
        haptic={haptic}
        t={t}
      />

      {/* Secondary Shift History Drawer (Completely Off-Canvas until Requested) */}
      <AnimatePresence>
        {isHistoryOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/60 flex items-end sm:items-center sm:justify-center"
            onClick={() => setIsHistoryOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[393px] max-h-[80vh] bg-[var(--bg)] rounded-t-[2rem] sm:rounded-2xl border border-[var(--b)] p-6 space-y-4 flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Drawer Drag Pill */}
              <div className="w-12 h-1 bg-[var(--b)] rounded-full mx-auto shrink-0" />

              {/* Drawer Header */}
              <div className="flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-lg font-black text-[var(--t1)] tracking-tight">
                    {monthName} {viewDate.getFullYear()}
                  </h3>
                  <div className="text-xs font-semibold text-[var(--t3)] tabular-nums mt-0.5">
                    {monthHours}h • {curSym}{formatMoney(monthEarnings)} ({monthEntries.length} {t('days')})
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSettings(s => ({ ...s, sortOldestFirst: !s.sortOldestFirst }))}
                    className={`p-2 rounded-xl border border-[var(--b)] bg-[var(--bg-1)] text-[var(--t3)] hover:text-[var(--t1)] transition-colors active:scale-95 ${settings.sortOldestFirst ? 'text-[var(--a)]' : ''}`}
                    aria-label={settings.sortOldestFirst ? t('Sort Oldest First') : t('Sort Newest First')}
                  >
                    <ArrowDownUp size={15} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => setIsHistoryOpen(false)}
                    className="p-2 rounded-xl border border-[var(--b)] bg-[var(--bg-1)] text-[var(--t2)] hover:text-[var(--t1)] active:scale-95 transition-all"
                    aria-label={t('Close')}
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                </div>
              </div>

              {/* Scrollable Shift Ledger */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                {monthEntries.length > 0 ? (
                  monthEntries
                    .sort((a,b) => settings.sortOldestFirst ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date))
                    .map(e => {
                      const [yStr, mStr, dStr] = e.date.split('-');
                      const dateObj = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
                      const dowIdx = dateObj.getDay();
                      const mappedDow = dowIdx === 0 ? 6 : dowIdx - 1;
                      const isSelected = e.date === selectedDate;
                      
                      return (
                        <div key={e.date} className="relative w-full overflow-hidden rounded-[1rem] bg-[var(--a-bg)]">
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
                            onClick={() => { 
                              haptic(10); 
                              setSelectedDate(e.date); 
                              setIsHistoryOpen(false);
                            }}
                            className={`relative z-10 bg-[var(--bg-1)] flex items-center gap-4 p-3 rounded-[1rem] border transition-colors cursor-pointer ${
                              isSelected ? 'border-[var(--a)]' : 'border-[var(--b)]'
                            }`}
                            style={{ willChange: "transform" }}
                          >
                            <div className="w-10 h-10 rounded-[12px] bg-[var(--a)] flex flex-col items-center justify-center gap-0.5 text-[var(--bg)] transition-transform shrink-0 font-black">
                              <span className="text-sm leading-none">{dStr}</span>
                              <span className="text-micro uppercase opacity-80 tracking-widest">{DOW_NAMES[mappedDow]}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-[var(--t1)] flex items-center gap-2 truncate">
                                {e.hours}h 
                                {e.hours > settings.normal && (
                                  <span className="text-micro bg-[var(--green-bg)] text-[var(--green)] px-1.5 py-0.5 rounded uppercase shrink-0 font-bold">
                                    +{e.hours - settings.normal}h OT
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[var(--t3)] font-medium truncate">{e.date}</div>
                            </div>
                            <div className={`text-sm font-black text-[var(--t1)] shrink-0 tabular-nums ${settings.privacyMode ? 'blur-md' : ''}`}>
                              {curSym}{formatMoney(calcEarnings(e.hours))}
                            </div>
                          </motion.div>
                        </div>
                      );
                    })
                ) : (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--bg-1)] border border-[var(--b)] flex items-center justify-center mx-auto text-[var(--t3)]">
                      <Calendar size={22} strokeWidth={1.5} />
                    </div>
                    <div className="text-sm font-bold text-[var(--t1)]">{t('No Entries')}</div>
                    <p className="text-xs text-[var(--t3)] max-w-[200px] mx-auto">
                      {t('Tap a day on the calendar to log hours')}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
