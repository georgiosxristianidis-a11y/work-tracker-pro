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
  chartData?: any[];
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

  const [showSuccess, setShowSuccess] = React.useState(false);
  const prevTotalHoursRef = React.useRef(totalHours);

  React.useEffect(() => {
    if (totalHours > prevTotalHoursRef.current) {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 2000);
      prevTotalHoursRef.current = totalHours;
      return () => clearTimeout(timer);
    }
    prevTotalHoursRef.current = totalHours;
  }, [totalHours]);

  return (
    <div className="space-y-4 pt-1 relative">
      <SuccessSparkles active={showSuccess} />
      
      <div className="flex justify-between items-center">
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold text-[var(--t3)] uppercase tracking-widest leading-none mb-1 ml-7">
            {viewDate.getFullYear()}
          </span>
          <h1 className="text-4xl font-black tracking-tighter text-[var(--t1)] truncate pr-2">
            {getMonthName(viewDate)}
          </h1>
        </div>
        <div className="flex gap-1.5">
          <motion.button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="group p-1.5 rounded-xl border border-[var(--b)] bg-[var(--bg-1)] text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--b)] hover:border-[var(--b)] hover:shadow-sm active:scale-95 transition-all duration-300" aria-label={t('Previous Month')}>
            <ChevronLeft size={18} strokeWidth={1.25} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
          </motion.button>
          <motion.button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="group p-1.5 rounded-xl border border-[var(--b)] bg-[var(--bg-1)] text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--b)] hover:border-[var(--b)] hover:shadow-sm active:scale-95 transition-all duration-300" aria-label={t('Next Month')}>
            <ChevronRight size={18} strokeWidth={1.25} className="transition-transform duration-300 group-hover:translate-x-0.5" />
          </motion.button>
        </div>
      </div>

      <div className="px-1 mt-4">
        <div className="p-6 rounded-card border border-[var(--b)] bg-[var(--bg-1)] shadow-[0_8px_32px_rgba(0,0,0,0.03)] flex flex-col gap-4 relative overflow-hidden">
          {/* Subtle accent gradient for premium feel without breaking the solid style */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--a)]/5 rounded-full blur-3xl pointer-events-none" />
          
          <span className="text-xs font-black uppercase tracking-widest text-[var(--t3)] relative z-10">{t('Monthly Summary')}</span>
          <div className="relative min-h-[100px] flex justify-center">
            <div className="flex gap-4 sm:gap-10 w-full max-w-[300px] justify-between transition-all duration-500 opacity-100 visible">
              <div className="flex flex-col items-start text-left flex-1 min-w-0">
                <span className="text-[12px] text-[var(--t3)] opacity-60 mb-1">{t('Earnings')}</span>
                <div className="flex items-baseline gap-2.5 h-[36px] justify-start whitespace-nowrap overflow-visible">
                  <span className="text-lg text-[var(--t3)] font-light">{curSym}</span>
                  <motion.span
                    key={totalEarned}
                    initial={{ scale: 1.15, color: 'var(--a)' }}
                    animate={{ scale: 1, color: 'var(--t1)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="text-2xl font-black text-[var(--t1)] origin-left inline-block"
                  >
                    {formatMoney(totalEarned)}
                  </motion.span>
                </div>
                <div className="flex flex-col mt-2 gap-1 items-start whitespace-nowrap">
                  <div className={`text-[12px] font-bold flex items-center gap-1 ${earningsTrend > 0 ? 'text-[var(--a)]' : earningsTrend < 0 ? 'text-[var(--danger)]' : 'text-[var(--t1)]'}`}>
                    {earningsTrend > 0 ? <TrendingUp size={12} strokeWidth={3} /> : (earningsTrend < 0 ? <TrendingUp size={12} strokeWidth={3} className="rotate-180" /> : null)}
                    {earningsTrend > 0 ? '+' : ''}{earningsTrend}%
                  </div>
                  <span className="text-xs text-[var(--t3)] opacity-40 font-normal">{t('vs last month')}</span>
                </div>
              </div>
              <div className="flex flex-col items-start text-left flex-1 min-w-0">
                <span className="text-[12px] text-[var(--t3)] opacity-60 mb-1">{t('Hours')}</span>
                <div className="flex items-baseline gap-2.5 h-[36px] justify-start whitespace-nowrap overflow-visible">
                  <motion.span
                    key={totalHours}
                    initial={{ scale: 1.15, color: 'var(--a)' }}
                    animate={{ scale: 1, color: 'var(--t1)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="text-2xl font-black text-[var(--t1)] origin-left inline-block"
                  >
                    {totalHours}
                  </motion.span>
                  <span className="text-sm font-bold text-[var(--t3)] opacity-40">h</span>
                </div>
                <div className="flex flex-col mt-2 gap-1 items-start whitespace-nowrap">
                  <div className={`text-[12px] font-bold flex items-center gap-1 ${hoursTrend > 0 ? 'text-[var(--a)]' : hoursTrend < 0 ? 'text-[var(--danger)]' : 'text-[var(--t1)]'}`}>
                    {hoursTrend > 0 ? <TrendingUp size={12} strokeWidth={3} /> : (hoursTrend < 0 ? <TrendingUp size={12} strokeWidth={3} className="rotate-180" /> : null)}
                    {hoursTrend > 0 ? '+' : ''}{hoursTrend}%
                  </div>
                  <span className="text-xs text-[var(--t3)] opacity-40 font-normal">{t('vs last month')}</span>
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

      <div className="px-1 mt-6">
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

