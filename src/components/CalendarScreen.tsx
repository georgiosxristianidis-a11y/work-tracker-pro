import React, { useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar, ArrowDownUp, X, ChevronRight as ChevronIcon, Zap, Check } from 'lucide-react';
import { AnimatedTrash } from './AnimatedTrash';
import { AnimatedWand } from './AnimatedWand';
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
  isSaturday: boolean;
  isSunday: boolean;
  normalHours: number;
  onSingleTap: (ds: string, currentHours: number) => void;
  onLongPress: (ds: string, currentHours: number) => void;
}

const DayCell = React.memo(({ 
  day, ds, hours, isToday, isSaturday, isSunday,
  normalHours, onSingleTap, onLongPress
}: DayCellProps) => {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only use hold-timer on touch devices; on desktop/mouse use native right-click to prevent mouseup bleed-through
    if (e.pointerType !== 'touch') return;
    isLongPressTriggeredRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };

    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      onLongPress(ds, hours);
    }, 420);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!startPosRef.current || !longPressTimerRef.current) return;
    const dist = Math.hypot(e.clientX - startPosRef.current.x, e.clientY - startPosRef.current.y);
    if (dist > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const clearTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isLongPressTriggeredRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressTriggeredRef.current = false;
      return;
    }
    onSingleTap(ds, hours);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    clearTimer();
    onLongPress(ds, hours);
  };

  return (
    <motion.button 
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearTimer}
      onPointerCancel={clearTimer}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      style={{ WebkitTouchCallout: 'none' }}
      aria-label={`${day}, ${hours > 0 ? `${hours} hours` : isToday ? 'today' : 'empty'}`}
      className={`
        relative aspect-square rounded-2xl border flex flex-col items-center justify-center gap-0.5 transition-all select-none touch-manipulation active:scale-90
        ${hours > 0 
          ? 'bg-[var(--a-bg)] border-[var(--a-b)] text-[var(--t1)]' 
          : isToday 
            ? isSunday
              ? 'bg-[var(--bg-1)] border-[var(--danger)] text-[var(--danger)] shadow-sm'
              : 'bg-[var(--bg-1)] border-[var(--t1)] text-[var(--t1)] shadow-sm' 
            : isSunday
              ? 'bg-transparent border-transparent text-[var(--danger)] hover:bg-[var(--danger-bg)] font-bold'
              : isSaturday
                ? 'bg-transparent border-transparent text-[var(--t3)] font-medium hover:bg-[var(--b)]'
                : 'bg-transparent border-transparent text-[var(--t2)] hover:bg-[var(--b)]'}
      `}
    >
      <span className={`text-[15px] font-bold ${hours > 0 ? '-translate-y-[2px]' : ''} ${isSunday && hours === 0 ? 'text-[var(--danger)]' : ''}`}>
        {day}
      </span>

      {hours > 0 && (
        <div className="absolute bottom-[6px] flex flex-col items-center">
          <div className={`w-3 h-[2px] rounded-full transition-all ${
            hours === normalHours
              ? 'bg-[var(--t1)]' 
              : hours > normalHours 
                ? 'bg-[var(--amber)] shadow-[0_0_6px_var(--amber)]' 
                : 'bg-[var(--t3)] opacity-80'
          }`} />
        </div>
      )}
    </motion.button>
  );
});

DayCell.displayName = 'DayCell';

export const CalendarScreen = ({
  viewDate, setViewDate, entries, settings, setSettings, t,
  defaultEditorHours,
  deleteEntry, saveEntry, smartFillUpToDay, calcEarnings, curSym, haptic, openQuickFill
}: CalendarScreenProps) => {
  const { setEditorDate, setEditorHours } = useAppStore();
  const [isWandHovered, setIsWandHovered] = useState(false);
  const [isWandTapped, setIsWandTapped] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDow = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const currentMonthPrefix = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;

  const monthEntries = useMemo(() => {
    return entries.filter(e => e.date.startsWith(currentMonthPrefix) && e.hours > 0);
  }, [entries, currentMonthPrefix]);

  const selectedDaysCount = monthEntries.length;

  const monthHours = useMemo(() => {
    return monthEntries.reduce((acc, e) => acc + e.hours, 0);
  }, [monthEntries]);

  const monthEarnings = useMemo(() => calcEarnings(monthHours), [calcEarnings, monthHours]);

  const entryMap = useMemo(() => entries.reduce((acc, e) => {
    acc[e.date] = e.hours;
    return acc;
  }, {} as Record<string, number>), [entries]);

  const isCurrentMonth = now.getFullYear() === viewDate.getFullYear() && now.getMonth() === viewDate.getMonth();
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

  const handleSingleTap = useCallback(async (ds: string, currentHours: number) => {
    if (currentHours > 0) {
      haptic([20, 30]);
      await deleteEntry(ds);
    } else {
      haptic(15);
      const standardHours = settings.normal || defaultEditorHours || 8;
      if (saveEntry) {
        await saveEntry(ds, standardHours);
      }
    }
  }, [haptic, deleteEntry, saveEntry, settings.normal, defaultEditorHours]);

  const handleLongPress = useCallback((ds: string, currentHours: number) => {
    haptic([15, 25]);
    setEditorDate(ds);
    setEditorHours(currentHours || settings.normal || defaultEditorHours || 8);
  }, [haptic, setEditorDate, setEditorHours, settings.normal, defaultEditorHours]);

  return (
    <div className="space-y-7">
      {/* Top Header: Month Title, Days KPI Badge (Core Metric #2), Month Navigation */}
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
          {/* Days KPI Badge (Core metric: count of worked days in month) */}
          <motion.button
            type="button"
            onClick={() => { haptic(10); setIsHistoryOpen(true); }}
            className="py-1 px-3 rounded-panel border border-[var(--b)] bg-[var(--bg-1)] flex flex-col items-center justify-center gap-0.5 shadow-sm min-w-[3.25rem] min-h-[2.75rem] hover:border-[var(--a)]/40 hover:bg-[var(--b)] active:scale-95 transition-all group"
            aria-label={t('Days')}
          >
            <span className="text-micro font-black uppercase tracking-widest text-[var(--t3)] leading-none mb-0.5 group-hover:text-[var(--t2)] transition-colors">
              {t('Days')}
            </span>
            <span className="text-base font-black text-[var(--t1)] leading-none tabular-nums">
              {selectedDaysCount}
            </span>
          </motion.button>

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

      {/* Calendar Card: High Breathing Room, Radar Pulse Hint, Saturday Dimmed, Sunday Accent */}
      <div className="p-5 sm:p-6 bg-[var(--bg-1)] border border-[var(--b)] rounded-[1.75rem] shadow-sm relative">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center pb-2 flex justify-center opacity-40 mb-3"
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
              {settings.language === 'RUS' ? 'Тап — смена • Зажатие / ПКМ — детали' : settings.language === 'GR' ? 'Πατήστε για καταγραφή • Κρατήστε / δεξί κλικ για επεξεργασία' : 'Tap to log • Hold / Right-click to edit'}
            </span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-7 gap-y-3.5 gap-x-2 touch-pan-y"
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
          {DOW_NAMES.map((d, idx) => {
            const isSaturday = idx === 5;
            const isSunday = idx === 6;
            return (
              <div 
                key={d} 
                className={`text-center text-micro font-black uppercase tracking-widest py-1.5 select-none ${
                  isSunday 
                    ? 'text-[var(--danger)] opacity-85 font-bold' 
                    : isSaturday 
                      ? 'text-[var(--t3)] opacity-75' 
                      : 'text-[var(--t3)]'
                }`}
              >
                {d}
              </div>
            );
          })}

          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const ds = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hours = entryMap[ds] || 0;
            const isToday = ds === today;
            const dow = new Date(viewDate.getFullYear(), viewDate.getMonth(), day).getDay();
            const isSaturday = dow === 6;
            const isSunday = dow === 0;
            
            return (
              <DayCell
                key={day}
                day={day} 
                ds={ds} 
                hours={hours} 
                isToday={isToday}
                isSaturday={isSaturday}
                isSunday={isSunday}
                normalHours={settings.normal || defaultEditorHours || 8}
                onSingleTap={handleSingleTap}
                onLongPress={handleLongPress}
              />
            );
          })}
        </motion.div>
      </div>

      {/* Action Toolbar: Smart Fill & Quick Fill */}
      <div className="flex items-center gap-2.5 pt-1">
        {canSmartFill && smartFillUpToDay && (
          emptyDaysCount === 0 ? (
            <div className="flex-1 h-14 px-4 rounded-2xl border border-[var(--b)] bg-[var(--bg-1)] text-[var(--t3)] text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 select-none opacity-80 shadow-sm">
              <Check size={16} className="text-[var(--green)] shrink-0" strokeWidth={2.5} />
              <Zap size={15} className="shrink-0 text-[var(--a)]" strokeWidth={2.2} />
              <span className="truncate">1–{smartFillTargetDay} {t('complete')}</span>
            </div>
          ) : (
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                haptic([15, 20]);
                smartFillUpToDay(smartFillTargetDay, defaultEditorHours);
              }}
              className="flex-1 h-14 px-4 rounded-2xl border border-[var(--a-b)] bg-[var(--a-bg)] text-[var(--a)] text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2.5 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
            >
              <Zap size={16} className="shrink-0" strokeWidth={2.2} />
              <span className="truncate">
                Smart Fill ({emptyDaysCount} {emptyDaysCount === 1 ? t('day') : t('days')})
              </span>
            </motion.button>
          )
        )}

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
          className={`h-14 rounded-2xl border border-[var(--b)] bg-[var(--bg-1)] font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 text-[var(--t2)] transition-colors hover:bg-[var(--b)] hover:text-[var(--t1)] active:scale-[0.98] shadow-sm ${
            canSmartFill && smartFillUpToDay ? 'px-5 shrink-0' : 'w-full'
          }`}
        >
          <AnimatedWand size={18} className="text-[var(--a)]" strokeWidth={2} isHovered={isWandHovered} isTapped={isWandTapped} />
          <span>{t('Quick Fill')}</span>
        </motion.button>
      </div>

      {/* Secondary Shift Ledger Access (Calm, Off-Canvas, Keeps Calendar 100% Focused) */}
      {selectedDaysCount > 0 && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={() => { haptic(10); setIsHistoryOpen(true); }}
            className="text-xs font-bold uppercase tracking-widest text-[var(--t3)] hover:text-[var(--t1)] transition-colors flex items-center gap-2 py-2 px-4 rounded-xl border border-transparent hover:border-[var(--b)] hover:bg-[var(--bg-1)] active:scale-95"
          >
            <span>{t('Recent Entries')}</span>
            <span className="text-[11px] font-black tabular-nums bg-[var(--b)] px-1.5 py-0.5 rounded-md text-[var(--t2)]">
              {selectedDaysCount}
            </span>
            <ChevronIcon size={14} className="opacity-60" />
          </button>
        </div>
      )}

      {/* Off-Canvas Shift History Drawer */}
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
                    {monthHours}h • {curSym}{formatMoney(monthEarnings)} ({selectedDaysCount} {t('Days')})
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
                              setEditorDate(e.date);
                              setEditorHours(e.hours);
                              setIsHistoryOpen(false);
                            }}
                            className="relative z-10 bg-[var(--bg-1)] flex items-center gap-4 p-3 rounded-[1rem] border border-[var(--b)] hover:border-[var(--a)] transition-colors cursor-pointer"
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
                                  <span className="text-micro bg-[var(--amber-bg)] text-[var(--amber)] px-1.5 py-0.5 rounded uppercase shrink-0 font-bold">
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
