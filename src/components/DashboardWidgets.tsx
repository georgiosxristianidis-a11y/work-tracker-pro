import React, { memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ArrowDownUp, Clock } from 'lucide-react';
import { AppSettings, DOW_NAMES } from '../constants';
import { formatMoney } from '../lib/utils';
import { Entry } from '../lib/db';
import { AnimatedTrash } from './AnimatedTrash';
import { AppScreen } from '../store/useAppStore';

interface EntryItemProps {
  e: Entry;
  calcEarnings: (hours: number) => number;
  settings: AppSettings;
  curSym: string;
  deleteEntry?: (date: string) => void;
  haptic?: (pattern: number | number[]) => void;
  t: (key: string) => string;
}

const EntryItem = memo(({ e, calcEarnings, settings, curSym, deleteEntry, haptic, t }: EntryItemProps) => (
  <motion.div 
    layout
    variants={{
      hidden: { opacity: 0, x: 10, scale: 0.95 },
      visible: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 350, damping: 25 } }
    }}
    initial="hidden"
    animate="visible"
    exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0, paddingBottom: 0, paddingTop: 0, overflow: 'hidden', transition: { opacity: { duration: 0.2 }, height: { duration: 0.25 } } }}
    className="relative w-full overflow-hidden rounded-panel bg-[var(--a-bg)] shrink-0"
    style={{ willChange: "transform, opacity, height" }}
  >
    <div className="absolute top-0 right-0 h-full w-[80px] flex items-center justify-end pr-5">
      <motion.button 
        type="button"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => { if (haptic) haptic(10); if (deleteEntry) deleteEntry(e.date); }} 
        className="text-[var(--danger)] transition-transform group"
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
      className="relative z-10 bg-[var(--bg-1)] flex items-center gap-4 p-3 rounded-panel border border-[var(--b)] cursor-grab active:cursor-grabbing shadow-xs"
      style={{ willChange: "transform" }}
    >
      <div className="w-10 h-10 rounded-control bg-[var(--a)] flex flex-col items-center justify-center text-[var(--bg)] transition-transform shrink-0 gap-0.5 shadow-xs">
        <span className="text-sm font-black leading-none tabular-nums">{e.date.split('-')[2]}</span>
        <span className="text-micro font-bold uppercase opacity-85 tracking-widest">{DOW_NAMES[new Date(e.date).getDay() === 0 ? 6 : new Date(e.date).getDay() - 1]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-[var(--t1)] flex items-center gap-2 truncate tabular-nums">
          {e.hours}h 
          {e.hours > settings.normal && (
            <span className="text-micro bg-[var(--green-bg)] text-[var(--green)] px-1.5 py-0.5 rounded font-bold uppercase shrink-0 tabular-nums">
              +{e.hours - settings.normal}h OT
            </span>
          )}
        </div>
        <div className="text-xs text-[var(--t3)] font-medium truncate">{e.date}</div>
      </div>
      <div className="text-sm font-black text-[var(--t1)] shrink-0 tabular-nums">
        {settings.privacyMode ? `${curSym}••••` : `${curSym}${formatMoney(calcEarnings(e.hours))}`}
      </div>
    </motion.div>
  </motion.div>
));
EntryItem.displayName = 'EntryItem';

interface EmptyStateBtnProps {
  setScreen: (screen: any) => void;
  t: (key: string) => string;
  haptic?: (pattern: number | number[]) => void;
}

const EmptyStateBtn = memo(({ setScreen, t, haptic }: EmptyStateBtnProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative py-6 text-center"
    >
      <div className="relative z-10 space-y-3 flex flex-col items-center">
        <motion.button 
          type="button"
          onClick={() => {
            if (haptic) haptic(12);
            setScreen('calendar');
          }}
          aria-label={t('Open Calendar')}
          className="w-12 h-12 rounded-control bg-[var(--a-bg)] border border-[var(--a-b)] flex items-center justify-center text-[var(--a)] cursor-pointer outline-none shadow-xs"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <Clock size={22} strokeWidth={2} />
        </motion.button>
        <div className="space-y-0.5">
          <p className="text-xs font-black uppercase tracking-widest text-[var(--t1)]">{t('No Shifts Logged Yet')}</p>
          <p className="text-[11px] font-medium text-[var(--t3)]">
            {t('Tap to log hours in Calendar')}
          </p>
        </div>
      </div>
    </motion.div>
  );
});
EmptyStateBtn.displayName = 'EmptyStateBtn';

export interface DashboardWidgetsProps {
  entries: Entry[];
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  setScreen: (screen: 'home' | 'calendar' | 'chart' | 'total' | 'settings') => void;
  calcEarnings: (hours: number) => number;
  curSym: string;
  t: (key: string) => string;
  deleteEntry?: (date: string) => void;
  haptic?: (pattern: number | number[]) => void;
}

export function DashboardWidgets({
  entries,
  settings,
  setSettings,
  setScreen,
  calcEarnings,
  curSym,
  t,
  deleteEntry,
  haptic
}: DashboardWidgetsProps) {
  return (
    <div className="px-1">
      <div className="relative w-full rounded-card apple-glass-panel p-5 flex flex-col border border-[var(--b)] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--t3)]">
              {t('Recent Entries')}
            </span>
            <button 
              type="button"
              onClick={() => {
                if (haptic) haptic(8);
                setSettings(s => ({ ...s, sortOldestFirst: !s.sortOldestFirst }));
              }}
              className={`p-1.5 rounded-full text-[var(--t3)] hover:text-[var(--t1)] transition-colors active:scale-95 ${settings.sortOldestFirst ? 'text-[var(--a)]' : ''}`}
              aria-label={settings.sortOldestFirst ? t('Sort Oldest First') : t('Sort Newest First')}
              title={settings.sortOldestFirst ? t('Sort Oldest First') : t('Sort Newest First')}
            >
              <ArrowDownUp size={14} strokeWidth={2} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => {
                if (haptic) haptic(8);
                setScreen('total');
              }}
              className="text-micro font-bold uppercase tracking-wider text-[var(--t3)] hover:text-[var(--t1)] flex items-center gap-1 transition-colors"
            >
              <span>{t('Total')}</span>
              <ChevronRight size={12} strokeWidth={2.5} />
            </button>
            <span className="text-[var(--b)]">•</span>
            <button 
              type="button"
              onClick={() => {
                if (haptic) haptic(8);
                setScreen('calendar');
              }} 
              className="text-xs font-bold text-[var(--a)] hover:opacity-85 active:scale-95 transition-all"
            >
              {t('View All')}
            </button>
          </div>
        </div>

        <motion.div 
          className="space-y-2 flex-1 flex flex-col justify-center overflow-x-hidden"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
          }}
        >
          <AnimatePresence>
            {[...entries]
              .sort((a, b) => settings.sortOldestFirst ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date))
              .slice(0, 3)
              .map((e) => (
              <EntryItem 
                key={e.date} 
                e={e} 
                calcEarnings={calcEarnings} 
                settings={settings} 
                curSym={curSym} 
                deleteEntry={deleteEntry}
                haptic={haptic}
                t={t}
              />
            ))}
          </AnimatePresence>
          {entries.length === 0 && (
            <EmptyStateBtn setScreen={setScreen} t={t} haptic={haptic} />
          )}
        </motion.div>
      </div>
    </div>
  );
}
