import { parseEntryTimestamp, type Entry } from './db.ts';
import type { AppSettings } from '../constants.ts';

type RawEntry = { date: string; hours?: unknown; month?: unknown; updated_at?: unknown };

const isRawEntry = (e: unknown): e is RawEntry =>
  typeof e === 'object' && e !== null && typeof (e as { date?: unknown }).date === 'string';

export const shiftMonth = (date: Date, delta: number): Date =>
  new Date(date.getFullYear(), date.getMonth() + delta, 1);

// Defensive sanitization: rows read from IndexedDB may have missing or
// non-numeric fields (e.g. after a partial write); normalize them.
export const sanitizeEntries = (list: unknown): Entry[] => {
  if (!Array.isArray(list)) return [];
  return list.filter(isRawEntry).map(e => {
    const rawHours = parseFloat(String(e.hours));
    const updatedAt = parseEntryTimestamp(e.updated_at);
    // Fallback to 0 if NaN, string "cat", or undefined, preserving integrity
    return {
      date: e.date,
      hours: isNaN(rawHours) ? 0 : rawHours,
      month: typeof e.month === 'string' && e.month ? e.month : e.date.slice(0, 7),
      ...(updatedAt !== undefined ? { updated_at: updatedAt } : {}),
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

export interface ValidatedBackupPayload {
  version: 1;
  entries: Entry[];
  settings?: Partial<AppSettings>;
}

export const parseBackupPayload = (raw: string): ValidatedBackupPayload | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const obj = parsed as Record<string, unknown>;
    if (obj.version !== undefined && obj.version !== 1) return null;
    if (!Array.isArray(obj.entries)) return null;

    const entries = sanitizeEntries(obj.entries).filter(
      e => /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.hours > 0 && e.hours <= 24
    );
    const settings: Partial<AppSettings> = {};
    if (obj.settings && typeof obj.settings === 'object' && !Array.isArray(obj.settings)) {
      const s = obj.settings as Record<string, unknown>;
      for (const k of ['rate', 'overtime', 'normal', 'goal', 'bonus', 'deduction'] as const) {
        if (typeof s[k] === 'number' && Number.isFinite(s[k]) && s[k] >= 0) settings[k] = s[k];
      }
      for (const k of ['privacyMode', 'strictOfflineMode', 'hapticEnabled', 'powerSaveMode', 'notificationsEnabled', 'sortOldestFirst'] as const) {
        if (typeof s[k] === 'boolean') settings[k] = s[k];
      }
      if (s.currency === 'EUR' || s.currency === 'RUB') settings.currency = s.currency;
      if (s.language === 'ENG' || s.language === 'RUS' || s.language === 'GR') settings.language = s.language;
      if (s.theme === 'light' || s.theme === 'dark' || s.theme === 'indigo') settings.theme = s.theme;
    }
    return { version: 1, entries, settings };
  } catch {
    return null;
  }
};
