import type { Entry } from './db';

type RawEntry = { date: string; hours?: unknown; month?: unknown };

const isRawEntry = (e: unknown): e is RawEntry =>
  typeof e === 'object' && e !== null && typeof (e as { date?: unknown }).date === 'string';

// Defensive sanitization: rows read from IndexedDB may have missing or
// non-numeric fields (e.g. after a partial write); normalize them.
export const sanitizeEntries = (list: unknown): Entry[] => {
  if (!Array.isArray(list)) return [];
  return list.filter(isRawEntry).map(e => {
    const rawHours = parseFloat(String(e.hours));
    // Fallback to 0 if NaN, string "cat", or undefined, preserving integrity
    return {
      date: e.date,
      hours: isNaN(rawHours) ? 0 : rawHours,
      month: typeof e.month === 'string' && e.month ? e.month : e.date.slice(0, 7)
    };
  });
};

export const formatMoney = (val: number, decimals: number = 2) => {
  const cleanVal = parseFloat(val.toFixed(decimals));
  const parts = cleanVal.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts.join(',');
};

export const PRIVACY_MASK = '••••';

export const formatPrivacyMoney = (
  val: number,
  isPrivate: boolean,
  curSym: string = '',
  decimals: number = 2
): string => {
  if (isPrivate) return curSym ? `${curSym}${PRIVACY_MASK}` : PRIVACY_MASK;
  return curSym ? `${curSym}${formatMoney(val, decimals)}` : formatMoney(val, decimals);
};
