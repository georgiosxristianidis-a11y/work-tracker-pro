import { create } from 'zustand';
import { Entry, db } from '../lib/db';
import { AppSettings, DEFAULT_SETTINGS } from '../constants';

interface AppState {
  // UI State
  screen: string;
  setScreen: (screen: string) => void;
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
  deleteEntry: (date: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  undoDelete: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  screen: 'home',
  setScreen: (screen) => set({ screen }),
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
    
    // Apply theme
    const nextTheme = newSettings.theme || 'dark';
    if (document.documentElement.className !== nextTheme) {
      document.documentElement.className = nextTheme;
    }
    
    return { settings: newSettings };
  }),

  loadSettings: async () => {
    try {
      const savedSettings = await db.getSetting('settings', DEFAULT_SETTINGS);
      const mergedSettings = { ...DEFAULT_SETTINGS };
      if (savedSettings) {
        Object.keys(savedSettings).forEach(key => {
          if (savedSettings[key] !== undefined) {
            (mergedSettings as any)[key] = savedSettings[key];
          }
        });
      }
      set({ settings: mergedSettings });
      document.documentElement.className = mergedSettings.theme || 'dark';

      // Setup window bindings for chaos laboratory
      (window as any).__chaos_wipe_zustand = () => {
        console.warn("[Chaos Engine] State wiped! Forcing memory loss scenario.");
        set({
          entries: [],
          allEntries: [],
          yearEntries: [],
          editorDate: null
        });
      };
      (window as any).__chaos_reload_store = async () => {
        console.log("[Chaos Engine] Refreshing stores from IndexedDB...");
        await get().loadEntries();
      };
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
      
      // DEFIANT DATABASE SANITIZATION ENGINE (Chaos Engineering Fallback)
      const sanitize = (list: any[]): Entry[] => {
        return (list || []).filter(e => e && typeof e.date === 'string').map(e => {
          const rawHours = parseFloat(e.hours);
          // Fallback to 0 if NaN, string "cat", or undefined, preserving integrity
          const cleanHours = isNaN(rawHours) || typeof rawHours !== 'number' ? 0 : rawHours;
          return {
            date: e.date,
            hours: cleanHours,
            month: e.month || e.date.slice(0, 7)
          };
        });
      };

      const mEntries = sanitize(mEntriesRaw);
      const allEntries = sanitize(allEntriesRaw);
      const yEntries = allEntries.filter(e => e.date.startsWith(yearStr));
      
      set({ entries: mEntries, yearEntries: yEntries, allEntries });
    } catch (e) {
      console.error(e);
    }
  },

  saveEntry: async (date: string, hours: number) => {
    try {
      // Automatic memory amnesia restoration trigger
      if (get().allEntries.length === 0) {
        console.warn("[Chaos Suspend Recovery] Restoring memory state transparently before transaction.");
        await get().loadEntries();
      }
      
      const entry = { date, hours, month: date.slice(0, 7) };
      await db.saveEntry(entry);
      await get().loadEntries();
    } catch (e) {
      console.error(e);
    }
  },

  deleteEntry: async (date: string) => {
    try {
      // Automatic memory amnesia restoration trigger
      if (get().allEntries.length === 0) {
        console.warn("[Chaos Suspend Recovery] Restoring memory state transparently before transaction.");
        await get().loadEntries();
      }
      
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
      if (buffer.length === 0) return;
      for (const entry of buffer) {
        await db.saveEntry(entry);
      }
      set({ undoBuffer: [] });
      await get().loadEntries();
    } catch (e) {
      console.error(e);
    }
  }
}));
