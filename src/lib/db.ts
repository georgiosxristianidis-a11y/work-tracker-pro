/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Entry {
  date: string;
  hours: number;
  month: string;
}

const DB_NAME = 'WorkTrackerProDB';
const DB_VER = 1;

export class WorkDB {
  private db: IDBDatabase | null = null;

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VER);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('entries')) {
          const s = db.createObjectStore('entries', { keyPath: 'date' });
          s.createIndex('by_month', 'month', { unique: false });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
      request.onsuccess = (e: any) => {
        this.db = e.target.result;
        resolve();
      };
      request.onerror = (e: any) => reject(e.target.error);
    });
  }

  private tx(store: string, mode: IDBTransactionMode = 'readonly') {
    if (!this.db) throw new Error('DB not initialized');
    return this.db.transaction(store, mode).objectStore(store);
  }

  async saveEntry(entry: Entry) {
    return new Promise((res, rej) => {
      const req = this.tx('entries', 'readwrite').put(entry);
      req.onsuccess = () => res(true);
      req.onerror = () => rej(req.error);
    });
  }

  async deleteEntry(date: string) {
    return new Promise((res, rej) => {
      const req = this.tx('entries', 'readwrite').delete(date);
      req.onsuccess = () => res(true);
      req.onerror = () => rej(req.error);
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

  async setSetting(key: string, value: any) {
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
