import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Clock, TrendingUp, Calendar, CalendarPlus } from 'lucide-react';
import { AppSettings } from '../constants';
import { Entry } from '../lib/db';
import { formatMoney } from '../lib/utils';
import { DashboardWidgets } from './DashboardWidgets';
import { AnimatedZero } from './AnimatedZero';
import { AnimatedClock } from './AnimatedClock';
import { SuccessSparkles } from './SuccessSparkles';
import { useCelebration } from '../hooks/useCelebration';
import { RollingNumber } from './RollingNumber';
import { ShowcaseHeroCard } from './ShowcaseHeroCard';
import type { ChartDataItem } from './AnalyticsChart';

interface HomeScreenProps {
  viewDate: Date;
  setViewDate: (date: Date) => void;
  getMonthName: (date: Date) => string;
  totalEarned: number;
  goalPct: number;
  totalHours: number;
  entries: Entry[];
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  setScreen: (screen: 'home' | 'calendar' | 'chart' | 'total' | 'settings') => void;
  calcEarnings: (hours: number) => number;
  t: (key: string) => string;
  curSym: string;
  deleteEntry?: (date: string) => Promise<void>;
  haptic?: (pattern: number | number[]) => void;
  chartData?: ChartDataItem[];
  openBulkAdd: () => void;
}

export const HomeScreen = ({
  viewDate,
  setViewDate,
  getMonthName,
  totalEarned,
  goalPct,
  totalHours,
  entries,
  settings,
  setSettings,
  setScreen,
  calcEarnings,
  t,
  curSym,
  deleteEntry,
  haptic,
  chartData,
  openBulkAdd
}: HomeScreenProps) => {

  const overtime = React.useMemo(() => entries.reduce((s, e) => s + Math.max(0, e.hours - settings.normal), 0), [entries, settings.normal]);

  const currentMonthData = chartData && chartData.length > 0 ? chartData[chartData.length - 1] : { earnings: totalEarned, hours: totalHours };
  const prevMonthData = chartData && chartData.length > 1 ? chartData[chartData.length - 2] : { earnings: 0, hours: 0 };

  const calculateTrend = (current: number, prev: number) => {
    if (!current) current = 0;
    if (!prev) prev = 0;
    if (prev === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - prev) / prev) * 100);
  };

  const earningsTrend = calculateTrend(currentMonthData.earnings, prevMonthData.earnings);
  const hoursTrend = calculateTrend(currentMonthData.hours, prevMonthData.hours);

  const celebration = useCelebration({
    viewDate,
    totalEarned,
    goal: settings.goal,
    curSym,
    calcEarnings,
  });

  const currentMonthPrefix = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const selectedDaysCount = React.useMemo(
    () => entries.filter(e => e.date.startsWith(currentMonthPrefix) && e.hours > 0).length,
    [entries, currentMonthPrefix]
  );

  return (
    <div className="space-y-6 pt-1 relative">
      <SuccessSparkles
        active={celebration.active}
        glyph={celebration.glyph}
        count={celebration.count}
        duration={celebration.duration}
      />
      
      <div className="flex justify-between items-center">
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold text-[var(--t3)] uppercase tracking-widest leading-none mb-1 ml-1">
            {viewDate.getFullYear()}
          </span>
          <h1 className="text-4xl font-black tracking-tighter text-[var(--t1)] truncate pr-2">
            {getMonthName(viewDate)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Days KPI Badge (Core metric: count of worked days in month) */}
          <motion.button 
            type="button"
            onClick={() => { if (haptic) haptic(10); setScreen('calendar'); }}
            className="py-1 px-3 rounded-panel border border-[var(--b)] bg-[var(--bg-1)] flex flex-col items-center justify-center gap-0.5 shadow-sm min-w-[3.25rem] min-h-[2.75rem] hover:border-[var(--a)]/40 hover:bg-[var(--b)] active:scale-95 transition-all group"
            aria-label={t('Days')}
          >
            <span className="text-micro font-bold uppercase tracking-widest text-[var(--t3)] leading-none mb-0.5 group-hover:text-[var(--t2)] transition-colors">
              {t('Days')}
            </span>
            <span className="text-base font-black text-[var(--t1)] leading-none tabular-nums">
              {selectedDaysCount}
            </span>
          </motion.button>

          <div className="flex gap-1.5">
            <motion.button onClick={() => { const d = new Date(viewDate); d.setMonth(d.getMonth() - 1); setViewDate(d); }} className="group p-1.5 rounded-xl border border-[var(--b)] bg-[var(--bg-1)] text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--b)] hover:border-[var(--b)] hover:shadow-sm active:scale-95 transition-all duration-300" aria-label={t('Previous Month')}>
              <ChevronLeft size={18} strokeWidth={1.25} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
            </motion.button>
            <motion.button onClick={() => { const d = new Date(viewDate); d.setMonth(d.getMonth() + 1); setViewDate(d); }} className="group p-1.5 rounded-xl border border-[var(--b)] bg-[var(--bg-1)] text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--b)] hover:border-[var(--b)] hover:shadow-sm active:scale-95 transition-all duration-300" aria-label={t('Next Month')}>
              <ChevronRight size={18} strokeWidth={1.25} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </motion.button>
          </div>
        </div>
      </div>

      <div className="px-1">
        <ShowcaseHeroCard
          onStartShift={() => { if (haptic) haptic(10); setScreen('calendar'); }}
          onOpenAnalytics={() => { if (haptic) haptic(10); setScreen('chart'); }}
          onOpenBulkAdd={openBulkAdd}
          onOpenTimesheet={() => { if (haptic) haptic(10); setScreen('total'); }}
          t={t}
          haptic={haptic}
        />
      </div>

      <div className="px-1">
        <div className="p-6 rounded-card border border-[var(--b)] bg-[var(--bg-1)] shadow-[0_8px_32px_rgba(0,0,0,0.03)] flex flex-col gap-4 relative overflow-hidden">
          {/* Subtle accent gradient for premium feel without breaking the solid style */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--a)]/5 rounded-full blur-3xl pointer-events-none" />
          
          <span className="text-xs font-black uppercase tracking-widest text-[var(--t3)] relative z-10">{t('Monthly Summary')}</span>
          <div className="relative min-h-[100px] flex justify-center">
            <div data-testid="monthly-stats" className={`grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-[360px] justify-between transition-all duration-500 ${totalHours === 0 ? 'opacity-0 invisible' : 'opacity-100 visible'}`}>
              <div className="flex flex-col items-start text-left flex-1 min-w-0">
                <span className="text-micro font-bold uppercase tracking-wider text-[var(--t3)] mb-1">{t('Earnings')}</span>
                <div className={`flex items-baseline gap-1.5 h-[36px] justify-start whitespace-nowrap overflow-visible transition-all duration-500 ${settings.privacyMode ? 'blur-xl opacity-20' : ''}`}>
                  <span className="text-base text-[var(--t3)] font-light">{curSym}</span>
                  <RollingNumber
                    value={formatMoney(totalEarned)}
                    className="text-xl sm:text-2xl font-black text-[var(--t1)] tabular-nums"
                  />
                </div>
                <div className="flex flex-col mt-2 gap-1 items-start whitespace-nowrap">
                  <div className={`text-[12px] font-bold tabular-nums flex items-center gap-1 ${earningsTrend > 0 ? 'text-[var(--green)]' : earningsTrend < 0 ? 'text-[var(--danger)]' : 'text-[var(--t1)]'}`}>
                    {earningsTrend > 0 ? <TrendingUp size={12} strokeWidth={3} /> : (earningsTrend < 0 ? <TrendingUp size={12} strokeWidth={3} className="rotate-180" /> : null)}
                    {earningsTrend > 0 ? '+' : ''}{earningsTrend}%
                  </div>
                  <span className="text-micro text-[var(--t3)] font-normal">{t('vs last month')}</span>
                </div>
              </div>
              <div className="flex flex-col items-start text-left flex-1 min-w-0">
                <span className="text-micro font-bold uppercase tracking-wider text-[var(--t3)] mb-1">{t('Hours')}</span>
                <div className="flex items-baseline gap-1 h-[36px] justify-start whitespace-nowrap overflow-visible">
                  <RollingNumber
                    value={totalHours}
                    className="text-xl sm:text-2xl font-black text-[var(--t1)] tabular-nums"
                  />
                  <span className="text-xs sm:text-sm font-bold text-[var(--t3)]">h</span>
                </div>
                <div className="flex flex-col mt-2 gap-1 items-start whitespace-nowrap">
                  <div className={`text-[12px] font-bold tabular-nums flex items-center gap-1 ${hoursTrend > 0 ? 'text-[var(--a)]' : hoursTrend < 0 ? 'text-[var(--danger)]' : 'text-[var(--t1)]'}`}>
                    {hoursTrend > 0 ? <TrendingUp size={12} strokeWidth={3} /> : (hoursTrend < 0 ? <TrendingUp size={12} strokeWidth={3} className="rotate-180" /> : null)}
                    {hoursTrend > 0 ? '+' : ''}{hoursTrend}%
                  </div>
                  <span className="text-micro text-[var(--t3)] font-normal">{t('vs last month')}</span>
                </div>
              </div>
              <div className="flex flex-col items-start text-left flex-1 min-w-0">
                <span className="text-micro font-bold uppercase tracking-wider text-[var(--t3)] mb-1">{t('Days')}</span>
                <div className="flex items-baseline gap-1 h-[36px] justify-start whitespace-nowrap overflow-visible">
                  <RollingNumber
                    value={selectedDaysCount}
                    className="text-xl sm:text-2xl font-black text-[var(--t1)] tabular-nums"
                  />
                  <span className="text-xs sm:text-sm font-bold text-[var(--t3)]">d</span>
                </div>
                <div className="flex flex-col mt-2 gap-1 items-start whitespace-nowrap">
                  <div className="text-[12px] font-bold text-[var(--t2)] tabular-nums flex items-center gap-1">
                    {daysInMonth > 0 ? `${Math.round((selectedDaysCount / daysInMonth) * 100)}%` : '0%'}
                  </div>
                  <span className="text-micro text-[var(--t3)] font-normal">{selectedDaysCount}/{daysInMonth}d</span>
                </div>
              </div>
            </div>
            
            {totalHours === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <AnimatedZero type="hours" t={t} onClick={() => setScreen('calendar')} />
              </div>
            )}
          </div>
        </div>
      </div>

      <DashboardWidgets 
        totalEarned={totalEarned}
        goalPct={goalPct}
        entries={entries}
        settings={settings}
        setSettings={setSettings}
        setScreen={setScreen}
        calcEarnings={calcEarnings}
        curSym={curSym}
        t={t}
        deleteEntry={deleteEntry}
        haptic={haptic}
      />

      <div className="px-1">
        <motion.button 
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 20, delay: 0.4 }}
          onClick={openBulkAdd}
          whileHover={{ scale: 0.98 }}
          whileTap={{ scale: 0.96 }}
          className="relative group w-full h-14 rounded-2xl border border-[var(--b)] bg-[var(--bg-1)] font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 text-[var(--t1)] transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:border-[var(--a)]/30 overflow-hidden outline-none"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--a)]/0 via-[var(--a)]/5 to-[var(--a)]/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CalendarPlus size={18} className="text-[var(--a)] relative z-10 transition-transform duration-300 group-hover:scale-110" strokeWidth={2} />
          <span className="relative z-10">{t('Bulk Add Hours')}</span>
        </motion.button>
      </div>
    </div>
  );
};

