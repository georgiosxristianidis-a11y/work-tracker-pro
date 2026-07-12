import { useMemo, useCallback } from 'react';
import { Entry } from '../lib/db';
import { AppSettings, MONTH_NAMES } from '../constants';

export function useTrends(
  entries: Entry[],
  yearEntries: Entry[],
  settings: AppSettings,
  viewDate: Date,
  chartPeriod: number
) {
  const calcEarnings = useCallback((hours: number) => {
    const rate = settings.rate || 0;
    const overtime = settings.overtime || 0;
    const normal = settings.normal || 0;
    if (hours <= normal) return hours * rate;
    return normal * rate + (hours - normal) * rate * overtime;
  }, [settings.rate, settings.overtime, settings.normal]);

  const totalEarned = useMemo(() => {
    const base = entries.reduce((s, e) => s + calcEarnings(e.hours), 0);
    return base + (settings.bonus || 0) - (settings.deduction || 0);
  }, [entries, settings, calcEarnings]);

  const totalHours = useMemo(() => entries.reduce((s, e) => s + e.hours, 0), [entries]);
  
  const goalPct = settings.goal > 0 
    ? Math.min(100, Math.max(0, Math.round(((totalEarned || 0) / settings.goal) * 100))) 
    : 0;

  const chartData = useMemo(() => {
    const months: {
      month: string; fullMonth: string; earnings: number;
      hours: number; daysWorked: number; velocity: number; goal: number;
    }[] = [];
    const count = chartPeriod - 1;
    for (let i = count; i >= 0; i--) {
      const d = new Date(viewDate.getFullYear(), viewDate.getMonth() - i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({
        month: MONTH_NAMES[d.getMonth()].slice(0, 3),
        fullMonth: mStr,
        earnings: 0,
        hours: 0,
        daysWorked: 0,
        velocity: 0,
        goal: settings.goal || 0
      });
    }
    
    yearEntries.forEach(e => {
      const m = months.find(m => m.fullMonth === e.date.slice(0, 7));
      if (m) {
        m.earnings += calcEarnings(e.hours) || 0;
        m.hours += e.hours || 0;
        if (e.hours > 0) m.daysWorked += 1;
      }
    });

    months.forEach(m => {
      m.velocity = m.daysWorked > 0 ? Number((m.hours / m.daysWorked).toFixed(1)) : 0;
    });
    
    return months;
  }, [yearEntries, viewDate, settings.goal, calcEarnings, chartPeriod]);

  return {
    calcEarnings,
    totalEarned,
    totalHours,
    goalPct,
    chartData
  };
}
