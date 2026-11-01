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
  setSettings: (updater) => set((state) => {
    const newSettings = typeof updater === 'function' ? updater(state.settings) : updater;
    // Persist gracefully, not blocking
    db.setSetting('settings', newSettings).catch(console.error);
    
    return { settings: newSettings };
  }),

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
      const mStr = `${dateToUse.getFullYear()}-${String(dateToUse.getMonth() + 1).padStart(2, '0')}`;
      const yearStr = `${dateToUse.getFullYear()}`;
      
      const [mEntriesRaw, allEntriesRaw] = await Promise.all([
        db.getEntriesByMonth(mStr),
        db.getAllEntries()
      ]);
      
      const mEntries = sanitizeEntries(mEntriesRaw);
      const allEntries = sanitizeEntries(allEntriesRaw);
      const yEntries = allEntries.filter(e => e.date.startsWith(yearStr));
      
      set({ entries: mEntries, yearEntries: yEntries, allEntries });
    } catch (e) {
      console.error(e);
    }
  },

  saveEntry: async (date: string, hours: number) => {
    try {
      const entry = { date, hours, month: date.slice(0, 7) };
      await db.saveEntry(entry);
      await get().loadEntries();
    } catch (e) {
      console.error(e);
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
    try {
      const existing = get().allEntries.find(e => e.date === date);
      if (existing) {
        // If we are deleting a single entry, add it to the buffer (but maybe don't overwrite if we are batch deleting, though we don't have batch delete here)
        set({ undoBuffer: [existing] });
      }

      await db.deleteEntry(date);
      await get().loadEntries();
    } catch (e) {
      console.error(e);
    }
  },

  clearAllData: async () => {
    try {
      set({ undoBuffer: [...get().allEntries] });
      await db.clearAll();
      set({ entries: [], yearEntries: [], allEntries: [] });
    } catch (e) {
      console.error(e);
    }
  },

  undoDelete: async () => {
    try {
      const buffer = get().undoBuffer;
      await db.saveMany(buffer);
      set({ undoBuffer: [] });
      await get().loadEntries();
    } catch (e) {
      console.error(e);
    }
  }
}));
