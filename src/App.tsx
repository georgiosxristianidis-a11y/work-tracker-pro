/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo, lazy, Suspense, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { supabase } from './lib/supabase';
import { db, Entry } from './lib/db';
import { Logo } from './components/Logo';
import { HomeScreen } from './components/HomeScreen';
import { SplashScreen } from './components/SplashScreen';
import { useSupabaseSync } from './hooks/useSupabaseSync';
import { useDataExport } from './hooks/useDataExport';
import { useAiInsight } from './hooks/useAiInsight';
import { useTrends } from './hooks/useTrends';
import { useQuickFill } from './hooks/useQuickFill';
import { useTranslation } from './hooks/useTranslation';
import { useToast } from './hooks/useToast';
import { usePowerSave } from './hooks/usePowerSave';
import { useAppStore } from './store/useAppStore';
import { Topbar } from './components/Topbar';
import { Navigation } from './components/Navigation';
import { useDoubleTap } from './hooks/useDoubleTap';
import { Toasts, ToastMessage } from './components/Toasts';
import { QuickFillModal } from './components/QuickFillModal';
import { EditorModal } from './components/EditorModal';
import { BulkAddModal } from './components/BulkAddModal';
import { MONTH_NAMES, MONTH_NAMES_RUS, MONTH_NAMES_GR, DOW_NAMES, AppSettings } from './constants';

const AnalyticsScreen = lazy(() => import('./components/AnalyticsScreen').then(m => ({ default: m.AnalyticsScreen })));
const TotalScreen = lazy(() => import('./components/TotalScreen').then(m => ({ default: m.TotalScreen })));
const CalendarScreen = lazy(() => import('./components/CalendarScreen').then(m => ({ default: m.CalendarScreen })));
const SettingsScreen = lazy(() => import('./components/SettingsScreen').then(m => ({ default: m.SettingsScreen })));

// --- Utilities ---
const haptic = (pattern: number | number[] = 30, enabled = true) => {
  if (enabled && typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

const getDeviceId = () => {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('device_id', id);
  }
  return id;
};

// --- Main App Component ---
export default function App() {
  const { 
    screen, setScreen, 
    viewDate, setViewDate, 
    entries, setEntries, 
    allEntries,
    yearEntries, setYearEntries, 
    settings, setSettings,
    isLoading, setIsLoading,
    editorDate, setEditorDate,
    editorHours, setEditorHours,
    loadSettings, loadEntries,
    saveEntry: storeSaveEntry,
    deleteEntry: storeDeleteEntry,
    clearAllData: storeClearAll
  } = useAppStore();

  const [chartPeriod, setChartPeriod] = useState<6 | 12>(6);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { isPowerSaveMode } = usePowerSave(settings);

  const { toasts, addToast, removeToast } = useToast();
  const [excludeSundays, setExcludeSundays] = useState(true);
  const [navClicks, setNavClicks] = useState({ home: 0, calendar: 0, chart: 0, total: 0, settings: 0 });
  const [syncQueue, setSyncQueue] = useState<any[]>([]);
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);

  const curSym = settings.currency === 'RUB' ? '₽' : '€';
  
  const h = (pattern: number | number[] = 30) => haptic(pattern, settings.hapticEnabled);

  const t = useTranslation(settings.language);

  // --- Initialization ---
  useEffect(() => {
    const init = async () => {
      await db.init();
      
      // Migrate from old version
      const migratedCount = await migrateFromLocalStorage();
      if (migratedCount > 0) {
        addToast(`Migrated ${migratedCount} entries`, 'success');
      }

      await loadSettings();
      await loadEntries();
      
      setIsAuthReady(true);
      
      // Artificial delay for splash screen
      setTimeout(() => setIsLoading(false), 1200);

      // Amnesia Recovery Engine
      document.body.addEventListener('click', async (e) => {
        const store = useAppStore.getState();
        if (store.allEntries.length === 0 && (window as any).__chaos_wipe_zustand) {
          // If state is empty but we haven't actually cleared the DB
          const count = await db.getAllEntries();
          if (count.length > 0) {
            console.warn("[Chaos Suspend Recovery] Click detected with empty RAM state. Restoring transparently...");
            await store.loadEntries();
          }
        }
      }, { capture: true });
    };
    init();
  }, []);

  const migrateFromLocalStorage = async () => {
    const done = await db.getSetting('ls_migrated', false);
    if (done) return 0;

    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && /^\d{4}-\d{2}-\d{2}$/.test(key)) {
        const hours = parseFloat(localStorage.getItem(key) || '0');
        if (hours > 0) {
          await storeSaveEntry(key, hours);
          count++;
        }
      }
    }
    await db.setSetting('ls_migrated', true);
    return count;
  };

  useEffect(() => {
    if (isAuthReady) loadEntries();
  }, [viewDate, isAuthReady, loadEntries]);

  // --- Anti-AI / Strict Offline Fortress Mode ---
  useEffect(() => {
    if (settings.strictOfflineMode) {
      console.warn("[Paranoid Security] Strict Offline Mode activated. Fortifying application. No signals will leave this app.");
      
      // Inject strict Content-Security-Policy to block all outbound connections
      let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (!cspMeta) {
        cspMeta = document.createElement('meta');
        cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
        // Allow scripts and styles from self, but STRICTLY block all outbound connections (connect-src 'self')
        cspMeta.setAttribute('content', "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src 'self' blob:;");
        cspMeta.id = "paranoid-csp-fortress";
        document.head.appendChild(cspMeta);
      }
      
      // Attempt to override global fetch and XHR for double-layer protection (ignoring read-only properties)
      const originalFetch = window.fetch;
      const originalXHR = XMLHttpRequest.prototype.open;

      try {
        window.fetch = async function(...args) {
          console.error(`[Paranoid Security] Blocked outbound fetch by Fortress Mode:`, args[0]);
          throw new Error('Paranoid Security: Outbound network request blocked by Strict Offline Fortress Mode.');
        };
      } catch (e) {
        // window.fetch might be read-only in some environments, rely on CSP
      }

      XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...rest: any[]) {
        console.error(`[Paranoid Security] Blocked outbound XHR by Fortress Mode:`, url);
        throw new Error('Paranoid Security: Outbound network request blocked by Strict Offline Fortress Mode.');
      };

      return () => {
        const metaToRemove = document.getElementById('paranoid-csp-fortress');
        if (metaToRemove) metaToRemove.remove();
        
        try { window.fetch = originalFetch; } catch(e) {}
        XMLHttpRequest.prototype.open = originalXHR;
      };
    }
  }, [settings.strictOfflineMode]);

  const { calcEarnings, totalEarned, totalHours, goalPct, chartData } = useTrends(
    entries,
    yearEntries,
    settings,
    viewDate,
    chartPeriod
  );

  const { syncStatus, syncErrorMsg, lastSynced, syncWithSupabaseAction } = useSupabaseSync({
    settings,
    setSettings,
    addToast,
    getDeviceId,
  });

  // Auto-sync polling interval
  useEffect(() => {
    if (settings.strictOfflineMode) return;
    
    // 5 mins normally, 30 mins in power save mode
    const intervalMs = isPowerSaveMode ? 30 * 60 * 1000 : 5 * 60 * 1000;
    
    const timer = setInterval(() => {
      syncWithSupabaseAction();
    }, intervalMs);
    
    return () => clearInterval(timer);
  }, [isPowerSaveMode, settings.strictOfflineMode, syncWithSupabaseAction]);

  const { exportCSV, exportTXT, exportPDF, exportICS, shareToTelegram, shareBackup, isExporting } = useDataExport({
    settings,
    curSym,
    viewDate,
    calcEarnings,
    addToast,
    haptic: h
  });

  const { aiInsight, setAiInsight, isAiLoading, generateAiInsight, aiLangOverride, setAiLangOverride } = useAiInsight(settings, addToast);

  const getMonthName = useCallback((date: Date) => {
    const m = date.getMonth();
    if (settings.language === 'RUS') return MONTH_NAMES_RUS[m];
    if (settings.language === 'GR') return MONTH_NAMES_GR[m];
    return MONTH_NAMES[m];
  }, [settings.language]);

  // --- Actions ---
  const saveEntry = useCallback(async (date: string, hours: number) => {
    haptic(20);
    await storeSaveEntry(date, hours);
    addToast(t('Entry saved'), 'success');
    
    // Background sync
    if (navigator.onLine && !settings.strictOfflineMode) {
      syncWithSupabaseAction();
    }
  }, [haptic, storeSaveEntry, addToast, t, settings.strictOfflineMode, syncWithSupabaseAction]);

  const saveMultipleEntries = useCallback(async (dates: string[], hours: number) => {
    haptic([20, 20]);
    for (const d of dates) {
      await storeSaveEntry(d, hours);
    }
    addToast(t('Entries added'), 'success');
    if (navigator.onLine && !settings.strictOfflineMode) {
      syncWithSupabaseAction();
    }
  }, [haptic, storeSaveEntry, addToast, t, settings.strictOfflineMode, syncWithSupabaseAction]);

  const deleteEntry = useCallback(async (date: string) => {
    haptic([30, 50]);
    await storeDeleteEntry(date);
    addToast(t('Entry deleted'), 'warning', {
      label: t('Undo'),
      onClick: async () => {
        const store = useAppStore.getState();
        await store.undoDelete();
        if (navigator.onLine && !settings.strictOfflineMode) {
          syncWithSupabaseAction();
        }
      }
    });
    
    if (navigator.onLine && !settings.strictOfflineMode) {
      syncWithSupabaseAction();
    }
  }, [haptic, storeDeleteEntry, addToast, t, settings.strictOfflineMode, syncWithSupabaseAction]);

  const {
    selectedTemplate,
    setSelectedTemplate,
    customFill,
    setCustomFill,
    showCustomFill,
    setShowCustomFill,
    isQuickFillOpen,
    setIsQuickFillOpen,
    handleApplyTemplate,
    getDefaultHours,
    clearMonth
  } = useQuickFill({ viewDate, excludeSundays, loadEntries, addToast, undoLabel: t('Undo') });

  const applyTap = useDoubleTap(handleApplyTemplate);
  const clearTap = useDoubleTap(clearMonth);
  const syncTapActual = useDoubleTap(syncWithSupabaseAction);
  
  const clearAllData = async () => {
    await storeClearAll();
    addToast(t('All data deleted'), 'warning', {
      label: t('Undo'),
      onClick: async () => {
        const store = useAppStore.getState();
        await store.undoDelete();
        if (navigator.onLine && !settings.strictOfflineMode) {
          syncWithSupabaseAction();
        }
      }
    });
  };

  const deleteAllTap = useDoubleTap(clearAllData);
  const deleteEntryTap = useDoubleTap(async () => {
    if (editorDate) {
      await deleteEntry(editorDate);
      setEditorDate(null);
    }
  });

  const handleEditorSave = useCallback(() => {
    if (editorDate) saveEntry(editorDate, editorHours);
  }, [editorDate, editorHours, saveEntry]);

  const handleOpenQuickFill = useCallback(() => {
    haptic(10);
    setIsQuickFillOpen(true);
  }, [haptic, setIsQuickFillOpen]);

  const toggleTheme = async () => {
    const themes: ('light' | 'dark' | 'indigo')[] = ['light', 'dark', 'indigo'];
    const nextTheme = themes[(themes.indexOf(settings.theme) + 1) % themes.length];
    const newSettings = { ...settings, theme: nextTheme };
    setSettings(newSettings);
    document.documentElement.className = nextTheme;
    await db.setSetting('settings', newSettings);
  };

  // --- Renderers ---
  return (
    <MotionConfig reducedMotion={isPowerSaveMode ? 'always' : 'user'}>
      <div className="flex items-center justify-center min-h-screen bg-[#111] font-['Epilogue']">
        <AnimatePresence>
          {isLoading && <SplashScreen />}
        </AnimatePresence>

        <div id="frame" className="relative w-full max-w-[393px] h-[100dvh] sm:h-[min(100vh,852px)] bg-[var(--bg)] overflow-hidden flex flex-col shadow-2xl sm:rounded-[52px] sm:border-[11px] sm:border-[#1c1c1e]">
        <Topbar haptic={h} syncStatus={syncStatus} strictMode={settings.strictOfflineMode} t={t} />

        {/* Main Content */}
        <div className="absolute inset-0 overflow-y-auto px-6 pt-[calc(64px+env(safe-area-inset-top))] pb-[calc(128px+env(safe-area-inset-bottom))] scrollbar-hide overscroll-y-none">
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{ willChange: "transform, opacity" }}
            >
              <Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="w-6 h-6 border-2 border-[var(--t3)] border-t-[var(--a)] rounded-full animate-spin" /></div>}>
                {screen === 'home' && (
                  <HomeScreen
                    viewDate={viewDate}
                    setViewDate={setViewDate}
                    getMonthName={getMonthName}
                    totalEarned={totalEarned}
                    goalPct={goalPct}
                    totalHours={totalHours}
                    entries={entries}
                    settings={settings}
                    setSettings={setSettings}
                    setScreen={setScreen}
                    calcEarnings={calcEarnings}
                    t={t}
                    curSym={curSym}
                    deleteEntry={deleteEntry}
                    haptic={h}
                    chartData={chartData}
                    openBulkAdd={() => setIsBulkAddOpen(true)}
                  />
                )}
                {screen === 'calendar' && (
                  <CalendarScreen
                    viewDate={viewDate}
                    setViewDate={setViewDate}
                    entries={entries}
                    settings={settings}
                    setSettings={setSettings}
                    t={t}
                    defaultEditorHours={getDefaultHours()}
                    saveEntry={handleEditorSave}
                    deleteEntry={deleteEntry}
                    calcEarnings={calcEarnings}
                    curSym={curSym}
                    clearTap={deleteEntryTap}
                    clearMonthTap={clearTap}
                    haptic={h}
                    openQuickFill={handleOpenQuickFill}
                  />
                )}
                {screen === 'chart' && (
                  <AnalyticsScreen
                    t={t}
                    aiLangOverride={aiLangOverride}
                    setAiLangOverride={setAiLangOverride}
                    settings={settings}
                    haptic={h}
                    generateAiInsight={generateAiInsight}
                    isAiLoading={isAiLoading}
                    aiInsight={aiInsight}
                    setAiInsight={setAiInsight}
                    goalPct={goalPct}
                    entries={entries}
                    totalHours={totalHours}
                    curSym={curSym}
                    chartPeriod={chartPeriod}
                    setChartPeriod={setChartPeriod}
                    chartData={chartData}
                  />
                )}
                {screen === 'settings' && (
                  <SettingsScreen
                    settings={settings}
                    setSettings={setSettings}
                    t={t}
                    curSym={curSym}
                    haptic={h}
                    syncStatus={syncStatus}
                    syncErrorMsg={syncErrorMsg}
                    lastSynced={lastSynced}
                    syncTapActual={syncTapActual}
                    deleteAllTap={deleteAllTap}
                    toggleTheme={toggleTheme}
                    exportCSV={exportCSV}
                    exportTXT={exportTXT}
                    exportPDF={exportPDF}
                    exportICS={exportICS}
                    shareToTelegram={shareToTelegram}
                    shareBackup={shareBackup}
                    isExporting={isExporting}
                    addToast={addToast}
                  />
                )}
                {screen === 'total' && <TotalScreen allEntries={allEntries} viewDate={viewDate} settings={settings} calcEarnings={calcEarnings} curSym={curSym} t={t} />}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>

        <Navigation t={t} navClicks={navClicks} setNavClicks={setNavClicks} />

        {/* Quick Fill Sheet */}
        <QuickFillModal
          isOpen={isQuickFillOpen}
          setIsOpen={setIsQuickFillOpen}
          t={t}
          haptic={h}
          selectedTemplate={selectedTemplate}
          setSelectedTemplate={setSelectedTemplate}
          showCustomFill={showCustomFill}
          setShowCustomFill={setShowCustomFill}
          customFill={customFill}
          setCustomFill={setCustomFill}
          excludeSundays={excludeSundays}
          setExcludeSundays={setExcludeSundays}
          applyTap={applyTap}
          clearTap={clearTap}
        />

        {/* Editor Sheet */}
        <EditorModal
          settings={settings}
          curSym={curSym}
          calcEarnings={calcEarnings}
          saveEntry={saveEntry}
          deleteEntryTap={deleteEntryTap}
          t={t}
          haptic={h}
        />
        
        <BulkAddModal
          isOpen={isBulkAddOpen}
          setIsOpen={setIsBulkAddOpen}
          t={t}
          haptic={h}
          saveMultipleEntries={saveMultipleEntries}
          settings={settings}
        />

        {/* Toasts */}
        <Toasts toasts={toasts} removeToast={removeToast} />
      </div>

    </div>
    </MotionConfig>
  );
}
