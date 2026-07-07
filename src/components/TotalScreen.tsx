import React from 'react';
import { motion } from 'motion/react';
import { AppSettings, MONTH_NAMES, MONTH_NAMES_RUS, MONTH_NAMES_GR } from '../constants';
import { formatMoney } from '../lib/utils';
import { CountingNumber } from './CountingNumber';
import { Entry } from '../lib/db';

interface TotalScreenProps {
  allEntries: Entry[];
  viewDate: Date;
  settings: AppSettings;
  calcEarnings: (hours: number) => number;
  curSym: string;
  t: (key: string) => string;
}

export const TotalScreen = ({
  allEntries, viewDate, settings, calcEarnings, curSym, t
}: TotalScreenProps) => {
  const getMonthName = (date: Date) => {
    const m = date.getMonth();
    if (settings.language === 'RUS') return MONTH_NAMES_RUS[m];
    if (settings.language === 'GR') return MONTH_NAMES_GR[m];
    return MONTH_NAMES[m];
  };

  const [selectedYear, setSelectedYear] = React.useState<string>(String(viewDate.getFullYear()));
  const [customYear, setCustomYear] = React.useState<string>('');

  const availableYears = React.useMemo(() => {
    const years = Array.from(new Set(allEntries.map(e => e.date.substring(0, 4))));
    const currentYearStr = String(viewDate.getFullYear());
    if (!years.includes(currentYearStr)) {
      years.push(currentYearStr);
    }
    return years.sort().reverse();
  }, [allEntries, viewDate]);

  const displayedEntries = React.useMemo(() => {
    if (selectedYear === 'all') return allEntries;
    return allEntries.filter(e => e.date.startsWith(selectedYear));
  }, [allEntries, selectedYear]);

  const yearTotal = React.useMemo(() => displayedEntries.reduce((s, e) => s + calcEarnings(e.hours), 0), [displayedEntries, calcEarnings]);
  const yearHours = React.useMemo(() => displayedEntries.reduce((s, e) => s + e.hours, 0), [displayedEntries]);
  
  const groups = React.useMemo(() => {
    if (selectedYear === 'all') {
      return Array.from(new Set(displayedEntries.map(e => e.date.substring(0, 4)))).sort().reverse();
    }
    return Array.from(new Set(displayedEntries.map(e => e.date.slice(0, 7)))).sort().reverse();
  }, [displayedEntries, selectedYear]);

  const currentPhysYear = new Date().getFullYear();
  const isFuture = selectedYear !== 'all' && parseInt(selectedYear) > currentPhysYear;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 mt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tight text-[var(--t1)]">{t('Annual Total')}</h1>
        </div>
        
        <div className="flex flex-wrap gap-2 pb-2">
          <button
            onClick={() => setSelectedYear('all')}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              selectedYear === 'all' 
              ? 'bg-[var(--t1)] text-[var(--bg)] shadow-md' 
              : 'bg-[var(--bg-1)] border border-[var(--b)] text-[var(--t3)] hover:text-[var(--t2)]'
            }`}
          >
            {t('All Time')}
          </button>
          {availableYears.map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                selectedYear === y 
                ? 'bg-[var(--t1)] text-[var(--bg)] shadow-md' 
                : 'bg-[var(--bg-1)] border border-[var(--b)] text-[var(--t3)] hover:text-[var(--t2)]'
              }`}
            >
              {y}
            </button>
          ))}
          <div className="flex-shrink-0 relative">
            <input 
              type="number"
              placeholder={t('Year') + '...'}
              value={customYear || ((!availableYears.includes(selectedYear) && selectedYear !== 'all') ? selectedYear : '')}
              onChange={(e) => {
                setCustomYear(e.target.value);
                if (e.target.value.length === 4) {
                  setSelectedYear(e.target.value);
                }
              }}
              onFocus={(e) => {
                setCustomYear('');
                e.target.value = '';
              }}
              className={`w-[70px] px-3 py-2 rounded-full text-xs font-bold transition-all text-center outline-none ${
                !availableYears.includes(selectedYear) && selectedYear !== 'all'
                ? 'bg-[var(--t1)] text-[var(--bg)] shadow-md placeholder:text-[var(--bg)]/50' 
                : 'bg-[var(--bg-1)] border border-[var(--b)] text-[var(--t1)] placeholder:text-[var(--t3)] hover:border-[var(--t3)]'
              }`}
            />
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 rounded-card bg-[var(--bg-1)] border border-[var(--b)] relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.03)]"
      >
        <div className="space-y-4">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--t3)] block">
            {selectedYear === 'all' 
              ? t('Total Earned') 
              : isFuture 
                ? `${t('Projected in')} ${selectedYear}` 
                : `${t('Total Earned in')} ${selectedYear}`}
          </span>
          <div className="text-4xl md:text-5xl font-light text-[var(--t1)] pb-2 flex items-baseline justify-center gap-2.5">
            <span className="text-xl text-[var(--t3)]">{curSym}</span>
            <CountingNumber value={yearTotal} decimals={2} />
          </div>
          <div className="text-xs font-medium text-[var(--t2)]">{groups.length} {selectedYear === 'all' ? t('active years') : t('active months')} · {yearHours} {t('total hours')}</div>
        </div>
      </motion.div>

      <motion.div 
        className="space-y-3"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
      >
        {groups.map((groupKey: unknown) => {
          const keyStr = groupKey as string;
          const isYear = selectedYear === 'all';
          const gEntries = displayedEntries.filter(e => e.date.startsWith(keyStr));
          const gHours = gEntries.reduce((s, e) => s + e.hours, 0);
          const gEarned = gEntries.reduce((s, e) => s + calcEarnings(e.hours), 0);
          
          let title = '';
          let subtitle = '';
          
          if (isYear) {
            title = keyStr;
            subtitle = `${gEntries.length} entries`;
          } else {
            const mIndex = parseInt(keyStr.split('-')[1]) - 1;
            title = getMonthName(new Date(parseInt(keyStr.split('-')[0]), mIndex)).slice(0, 3);
            subtitle = keyStr.split('-')[0].slice(2);
          }
          
          const isGoalReached = !isYear && settings.goal > 0 && gEarned >= settings.goal;
          const cardBg = isGoalReached 
            ? 'bg-gradient-to-br from-[var(--bg-1)] to-[var(--a-bg)]' 
            : 'bg-[var(--bg-1)]';
          const cardBorder = isGoalReached
            ? 'border-[var(--a)] shadow-[0_0_15px_var(--a)] shadow-[var(--a)]/20'
            : 'border-[var(--b)]';
          
          return (
            <motion.div 
              key={keyStr} 
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
              }}
              className={`flex items-center gap-4 p-5 rounded-3xl border ${cardBg} ${cardBorder} transition-all relative overflow-hidden`}
              style={{ willChange: "transform, opacity", contentVisibility: "auto" }}
            >
              <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center border relative z-10 ${isYear ? 'bg-[var(--b)]/30 border-transparent text-[var(--t2)]' : 'bg-[var(--a-bg)] border-[var(--a-b)] text-[var(--a)]'}`}>
                <span className={`text-xs font-black uppercase leading-none ${isYear ? 'text-xs' : ''}`}>{title}</span>
                {!isYear && <span className="text-micro font-bold opacity-60">{subtitle}</span>}
              </div>
              <div className="flex-1 relative z-10">
                <div className="text-sm font-bold text-[var(--t1)]">{isYear ? `${gHours}${t('h total')}` : `${gEntries.length} ${t('days')} · ${gHours}${t('h recorded')}`}</div>
                <div className="text-xs text-[var(--t3)] font-medium">{isYear ? t('Year total') : getMonthName(new Date(parseInt(keyStr.split('-')[0]), parseInt(keyStr.split('-')[1]) - 1))}</div>
              </div>
              <div className="flex flex-col items-end relative z-10">
                <div className={`text-lg font-black ${isGoalReached ? 'text-[var(--a)]' : 'text-[var(--t1)]'}`}>
                  {curSym}{formatMoney(gEarned, 0)}
                </div>
                {isGoalReached && (
                  <span className="text-micro font-black uppercase tracking-widest text-[var(--a)] opacity-80 mt-0.5">{t('Goal Reached')}</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};
