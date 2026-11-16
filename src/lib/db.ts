/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Entry {
  date: string;
  hours: number;
  month: string;
  updated_at?: number;
}

export interface WorkEntryRow {
  user_id: string;
  date: string;
  hours: number;
  month: string;
  device_id: string;
  updated_at: string;
}

export interface RawCloudEntryRow {
  date: string;
  hours: number | string;
  month: string;
  updated_at?: number | string | null;
}

const MIN_ISO_MS = -62135596800000; // 0001-01-01T00:00:00.000Z
const MAX_ISO_MS = 253402300799999; // 9999-12-31T23:59:59.999Z

const isValidIsoMs = (ms: number): boolean =>
  Number.isFinite(ms) && ms >= MIN_ISO_MS && ms <= MAX_ISO_MS;

/** Normalizes epoch ms, numeric strings, or ISO-8601 strings to finite epoch ms. */
export function parseEntryTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return isValidIsoMs(value) ? value : undefined;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const numeric = Number(trimmed);
      return isValidIsoMs(numeric) ? numeric : undefined;
    }
    const parsed = Date.parse(trimmed);
    return isValidIsoMs(parsed) ? parsed : undefined;
  }
  return undefined;
}

/** Formats an entry timestamp as an ISO-8601 string for PostgreSQL timestamptz. */
export function formatSupabaseTimestamp(value: unknown, fallbackMs = Date.now()): string {
  const ms = parseEntryTimestamp(value) ?? parseEntryTimestamp(fallbackMs) ?? Date.now();
  return new Date(ms).toISOString();
}

/** Maps a local Entry to the exact public.work_entries columns for Supabase upsert. */
export function toWorkEntryRow(
  entry: Entry,
  userId: string,
  deviceId: string,
  fallbackMs = Date.now()
): WorkEntryRow {
  const hours = Number(entry.hours);
  return {
    user_id: userId,
    date: entry.date,
    hours: Number.isFinite(hours) ? hours : 0,
    month: entry.month || entry.date.slice(0, 7),
    device_id: deviceId,
    updated_at: formatSupabaseTimestamp(entry.updated_at, fallbackMs)
  };
}

/** Maps a Supabase work_entries row back to a local IndexedDB Entry. */
export function fromWorkEntryRow(row: RawCloudEntryRow): Entry {
  const hours = Number(row.hours);
  return {
    date: row.date,
    hours: Number.isFinite(hours) ? hours : 0,
    month: row.month || row.date.slice(0, 7),
    updated_at: parseEntryTimestamp(row.updated_at)
  };
}

const DB_NAME = 'WorkTrackerProDB';
const DB_VER = 1;

export class WorkDB {
  private db: IDBDatabase | null = null;

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VER);
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        if (event.oldVersion >= DB_VER) return;
        const db = request.result;
        if (!db.objectStoreNames.contains('entries')) {
          const s = db.createObjectStore('entries', { keyPath: 'date' });
          s.createIndex('by_month', 'month', { unique: false });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  private tx(store: string, mode: IDBTransactionMode = 'readonly') {
    if (!this.db) throw new Error('DB not initialized');
    return this.db.transaction(store, mode).objectStore(store);
  }

  async saveEntry(entry: Entry) {
    const toSave: Entry = {
      ...entry,
      updated_at: parseEntryTimestamp(entry.updated_at) ?? Date.now()
    };
    return new Promise((res, rej) => {
      const req = this.tx('entries', 'readwrite').put(toSave);
      req.onsuccess = () => res(true);
      req.onerror = () => rej(req.error);
    });
  }

  async saveMany(entries: Entry[]): Promise<boolean> {
    if (!this.db) throw new Error('DB not initialized');
    if (entries.length === 0) return true;
    const now = Date.now();
    return new Promise((res, rej) => {
      const tx = this.db!.transaction('entries', 'readwrite');
      const store = tx.objectStore('entries');
      for (const entry of entries) {
        store.put({
          ...entry,
          updated_at: parseEntryTimestamp(entry.updated_at) ?? now
        });
      }
      tx.oncomplete = () => res(true);
      tx.onerror = () => rej(tx.error);
    });
  }

  async deleteEntry(date: string) {
    return new Promise((res, rej) => {
      const req = this.tx('entries', 'readwrite').delete(date);
      req.onsuccess = () => res(true);
      req.onerror = () => rej(req.error);
    });
  }

  async deleteMany(dates: string[]): Promise<boolean> {
    if (!this.db) throw new Error('DB not initialized');
    if (dates.length === 0) return true;
    return new Promise((res, rej) => {
      const tx = this.db!.transaction('entries', 'readwrite');
      const store = tx.objectStore('entries');
      for (const date of dates) {
        store.delete(date);
      }
      tx.oncomplete = () => res(true);
      tx.onerror = () => rej(tx.error);
    });
  }

  async getEntriesByMonth(month: string): Promise<Entry[]> {
    return new Promise((res, rej) => {
      const req = this.tx('entries').index('by_month').getAll(IDBKeyRange.only(month));
      req.onsuccess = () => res(req.result.sort((a: Entry, b: Entry) => a.date.localeCompare(b.date)));
      req.onerror = () => rej(req.error);
    });
  }

  async getAllEntries(): Promise<Entry[]> {
    return new Promise((res, rej) => {
      const req = this.tx('entries').getAll();
      req.onsuccess = () => res(req.result.sort((a: Entry, b: Entry) => b.date.localeCompare(a.date)));
      req.onerror = () => rej(req.error);
    });
  }

  async getSetting<T>(key: string, def: T): Promise<T> {
    return new Promise((res) => {
      if (!this.db) return res(def);
      const req = this.tx('settings').get(key);
      req.onsuccess = () => res(req.result ? req.result.value : def);
      req.onerror = () => res(def);
    });
  }

  async setSetting(key: string, value: unknown) {
    return new Promise((res, rej) => {
      const req = this.tx('settings', 'readwrite').put({ key, value });
      req.onsuccess = () => res(true);
      req.onerror = () => rej(req.error);
    });
  }

  async clearAll() {
    return new Promise((res, rej) => {
      const req = this.tx('entries', 'readwrite').clear();
      req.onsuccess = () => res(true);
      req.onerror = () => rej(req.error);
    });
  }
}

export const db = new WorkDB();
