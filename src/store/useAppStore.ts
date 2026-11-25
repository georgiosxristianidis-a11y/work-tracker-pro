import { create } from 'zustand';
import { Entry, db } from '../lib/db';
import { sanitizeEntries } from '../lib/utils';
import { AppSettings, DEFAULT_SETTINGS } from '../constants';

export type AppScreen = 'home' | 'calendar' | 'chart' | 'total' | 'settings' | 'finance';

interface AppState {
  // UI State
  screen: AppScreen;
  setScreen: (screen: AppScreen | string) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  editorDate: string | null;
  setEditorDate: (date: string | null) => void;
  editorHours: number;
  setEditorHours: (hours: number) => void;
  
  viewDate: Date;
  setViewDate: (date: Date) => void;
  
  // Data State
  entries: Entry[];
  setEntries: (entries: Entry[]) => void;
  
  allEntries: Entry[];
  setAllEntries: (entries: Entry[]) => void;
  yearEntries: Entry[];
  setYearEntries: (entries: Entry[]) => void;

  undoBuffer: Entry[];
  setUndoBuffer: (entries: Entry[]) => void;
  
  // Settings State
  settings: AppSettings;
  setSettings: (settings: AppSettings | ((prev: AppSettings) => AppSettings)) => void;
  
  // Actions
  loadSettings: () => Promise<void>;
  loadEntries: (date?: Date) => Promise<void>;
  saveEntry: (date: string, hours: number) => Promise<void>;
  saveMany: (entries: Entry[]) => Promise<void>;
  deleteEntry: (date: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  undoDelete: () => Promise<void>;
}

let settingsWriteChain: Promise<unknown> = Promise.resolve();

function deriveEntrySlices(allEntries: Entry[], dateToUse: Date) {
  const mStr = `${dateToUse.getFullYear()}-${String(dateToUse.getMonth() + 1).padStart(2, '0')}`;
  const yearStr = `${dateToUse.getFullYear()}`;
  return {
    entries: allEntries.filter(e => e.month === mStr).reverse(),
    yearEntries: allEntries.filter(e => e.date.startsWith(yearStr)),
    allEntries
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  screen: 'home' as AppScreen,
  setScreen: (screen) => set({ screen: screen as AppScreen }),
  isLoading: true,
  setIsLoading: (isLoading) => set({ isLoading }),
  editorDate: null,
  setEditorDate: (editorDate) => set({ editorDate }),
  editorHours: 10,
  setEditorHours: (editorHours) => set({ editorHours }),
  
  viewDate: new Date(),
  setViewDate: (viewDate) => set({ viewDate }),
  
  entries: [],
  setEntries: (entries) => set({ entries }),
  
  allEntries: [],
  setAllEntries: (allEntries) => set({ allEntries }),
  
  yearEntries: [],
  setYearEntries: (yearEntries) => set({ yearEntries }),

  undoBuffer: [],
  setUndoBuffer: (undoBuffer) => set({ undoBuffer }),
  
  settings: DEFAULT_SETTINGS,
  setSettings: (updater) => {
    const newSettings = typeof updater === 'function' ? updater(get().settings) : updater;
    set({ settings: newSettings });
    settingsWriteChain = settingsWriteChain
      .then(() => db.setSetting('settings', newSettings))
      .catch(console.error);
  },

  loadSettings: async () => {
    try {
      const savedSettings = await db.getSetting('settings', DEFAULT_SETTINGS);
      const mergedSettings = { ...DEFAULT_SETTINGS };
      if (savedSettings) {
        const copyIfDefined = <K extends keyof AppSettings>(key: K) => {
          if (savedSettings[key] !== undefined) {
            mergedSettings[key] = savedSettings[key];
          }
        };
        (Object.keys(savedSettings) as (keyof AppSettings)[]).forEach(copyIfDefined);
      }
      set({ settings: mergedSettings });
    } catch (e) {
      console.error(e);
    }
  },

  loadEntries: async (currentDate) => {
    try {
      const dateToUse = currentDate || get().viewDate;
      const allEntriesRaw = await db.getAllEntries();
      const allEntries = sanitizeEntries(allEntriesRaw);
      set(deriveEntrySlices(allEntries, dateToUse));
    } catch (e) {
      console.error(e);
    }
  },

  saveEntry: async (date: string, hours: number) => {
    const prevAll = get().allEntries;
    const now = Date.now();
    const entry: Entry = { date, hours, month: date.slice(0, 7), updated_at: now };
    const nextAll = [entry, ...prevAll.filter(e => e.date !== date)]
      .sort((a, b) => b.date.localeCompare(a.date));
    set(deriveEntrySlices(nextAll, get().viewDate));
    try {
      await db.saveEntry(entry);
    } catch (e) {
      set(deriveEntrySlices(prevAll, get().viewDate));
      throw e;
    }
  },

  saveMany: async (entries: Entry[]) => {
    if (entries.length === 0) return;
    try {
      await db.saveMany(entries);
      await get().loadEntries();
    } catch (e) {
      console.error('saveMany failed:', e);
      throw e;
    }
  },

  deleteEntry: async (date: string) => {
    const prevAll = get().allEntries;
    const existing = prevAll.find(e => e.date === date);
    if (existing) {
      set({ undoBuffer: [existing] });
    }
    const nextAll = prevAll.filter(e => e.date !== date);
    set(deriveEntrySlices(nextAll, get().viewDate));
    try {
      await db.deleteEntry(date);
    } catch (e) {
      set(deriveEntrySlices(prevAll, get().viewDate));
      throw e;
    }
  },

  clearAllData: async () => {
    set({ undoBuffer: [...get().allEntries] });
    await db.clearAll();
    set({ entries: [], yearEntries: [], allEntries: [] });
  },

  undoDelete: async () => {
    const buffer = get().undoBuffer;
    const now = Date.now();
    await db.saveMany(buffer.map(e => ({ ...e, updated_at: now })));
    set({ undoBuffer: [] });
    await get().loadEntries();
  }
}));
