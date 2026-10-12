import { Entry } from './db';
import { CurrencyMath } from './currency-math';

export interface HistoricalSummary {
  entries: Entry[];
  totalHours: number;
  totalEarned: number;
  years: number;
  startDate: string;
  endDate: string;
  yearlyBreakdown: { year: string; hours: number; earned: number }[];
  categoryTotals: {
    coreScaled: string;
    clientsScaled: string;
    retainerScaled: string;
    consultingScaled: string;
  };
}

export type WorkProfile = 'balanced' | 'freelance' | 'intensive';

export class HistoricalGenerator {
  /**
   * Generates 3 or 5 years of realistic work records terminating on today's date.
   *
   * @param years - 3 or 5
   * @param hourlyRate - Hourly rate from user settings (default 25)
   * @param profile - Work distribution profile
   */
  static generateHistory(
    years: 3 | 5 = 3,
    hourlyRate = 25,
    profile: WorkProfile = 'balanced'
  ): HistoricalSummary {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setFullYear(today.getFullYear() - years);

    const entries: Entry[] = [];
    const yearlyHoursMap = new Map<string, number>();

    let current = new Date(startDate);
    const dayMs = 24 * 60 * 60 * 1000;

    // Deterministic pseudo-random seed based on year count for repeatable preview
    let seed = years * 1337;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    while (current <= today) {
      const year = current.getFullYear().toString();
      const month = `${year}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      const dateStr = `${month}-${String(current.getDate()).padStart(2, '0')}`;

      const dayOfWeek = current.getDay(); // 0 is Sunday, 6 is Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      let hours = 0;

      if (!isWeekend) {
        const roll = random();

        // 6% chance of day off (vacation, holiday, sick leave)
        if (roll < 0.06) {
          hours = 0;
        } else if (profile === 'balanced') {
          // Standard fulltime: mostly 8h, occasionally 7h or 9h
          if (roll < 0.25) hours = 7.0;
          else if (roll < 0.85) hours = 8.0;
          else if (roll < 0.96) hours = 9.0;
          else hours = 10.0; // Rare overtime
        } else if (profile === 'intensive') {
          // High throughput: 8.5 to 11h
          if (roll < 0.20) hours = 8.0;
          else if (roll < 0.70) hours = 9.5;
          else hours = 11.0;
        } else {
          // Freelance: variable sprints 4h to 10h
          if (roll < 0.20) hours = 4.5;
          else if (roll < 0.50) hours = 6.0;
          else if (roll < 0.85) hours = 8.5;
          else hours = 10.0;
        }
      } else {
        // Weekend crunch: 3% probability
        if (random() < 0.03) {
          hours = profile === 'intensive' ? 6.0 : 4.0;
        }
      }

      if (hours > 0) {
        entries.push({
          date: dateStr,
          hours,
          month
        });

        yearlyHoursMap.set(year, (yearlyHoursMap.get(year) || 0) + hours);
      }

      current = new Date(current.getTime() + dayMs);
    }

    const totalHours = entries.reduce((acc, e) => acc + e.hours, 0);
    const totalEarned = totalHours * hourlyRate;
    const totalEarnedScaled = CurrencyMath.toScaled(totalEarned);

    // Exact BigInt Hare-Niemeyer allocation for 4 categories:
    // Core (40%), Clients (30%), Retainer (20%), Consulting (10%)
    const coreScaled = (totalEarnedScaled * 40n) / 100n;
    const clientsScaled = (totalEarnedScaled * 30n) / 100n;
    const retainerScaled = (totalEarnedScaled * 20n) / 100n;
    const consultingScaled = totalEarnedScaled - (coreScaled + clientsScaled + retainerScaled);

    const yearlyBreakdown = Array.from(yearlyHoursMap.entries())
      .map(([yr, hrs]) => ({
        year: yr,
        hours: Math.round(hrs * 10) / 10,
        earned: Math.round(hrs * hourlyRate * 100) / 100
      }))
      .sort((a, b) => a.year.localeCompare(b.year));

    return {
      entries,
      totalHours: Math.round(totalHours * 10) / 10,
      totalEarned: Math.round(totalEarned * 100) / 100,
      years,
      startDate: entries[0]?.date || '',
      endDate: entries[entries.length - 1]?.date || '',
      yearlyBreakdown,
      categoryTotals: {
        coreScaled: coreScaled.toString(),
        clientsScaled: clientsScaled.toString(),
        retainerScaled: retainerScaled.toString(),
        consultingScaled: consultingScaled.toString()
      }
    };
  }
}
