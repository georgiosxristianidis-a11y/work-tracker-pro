import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Minus, Plus, Palette, Bell, Sliders, Check, RefreshCw, AlertTriangle, Database, FileText, Download, Trash, ChevronRight, Send, CalendarPlus, Smartphone, Flame, Zap, Shield, Lock, Terminal, CircleCheck, Save, AlignLeft, Table } from 'lucide-react';
import { AnimatedTrash } from './AnimatedTrash';
import { db } from '../lib/db';
import { AppSettings } from '../constants';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface SettingsScreenProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  t: (key: string) => string;
  curSym: string;
  haptic: (pattern?: number | number[], enabled?: boolean) => void;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncErrorMsg: string;
  lastSynced: string;
  syncTapActual: { trigger: () => void; isConfirming: boolean };
  deleteAllTap: { trigger: () => void; isConfirming: boolean };
  toggleTheme: () => void;
  exportCSV: () => void;
  exportTXT: () => void;
  exportPDF: (period: '6months' | 'year') => void;
  exportICS: () => void;
  shareToTelegram: (format?: 'summary' | 'txt' | 'csv' | 'json' | 'pdf') => void;
  shareBackup: () => void;
  exportLogoPNG: () => void;
  isExporting: boolean;
  addToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const SettingsScreen = ({
  settings, setSettings, t, curSym, haptic, syncStatus, syncErrorMsg,
  lastSynced, syncTapActual, deleteAllTap, toggleTheme,
  exportCSV, exportTXT, exportPDF, exportICS, shareToTelegram, shareBackup, isExporting, addToast
}: SettingsScreenProps) => {
  const { isInstallable, promptInstall } = usePWAInstall();

  const [localRate, setLocalRate] = React.useState(settings.rate === 0 ? '' : settings.rate.toString());
  const [localGoal, setLocalGoal] = React.useState(settings.goal === 0 ? '' : settings.goal.toString());

  React.useEffect(() => {
    if (parseFloat(localRate || '0') !== settings.rate) {
      setLocalRate(settings.rate === 0 ? '' : settings.rate.toString());
    }
  }, [settings.rate]);

  React.useEffect(() => {
    if (parseFloat(localGoal || '0') !== settings.goal) {
      setLocalGoal(settings.goal === 0 ? '' : settings.goal.toString());
    }
  }, [settings.goal]);

  // Chaos Lab States
  const [chaosFetch, setChaosFetch] = React.useState(!!(window as any).__chaos_fetch_active);
  const [chaosMonkey, setChaosMonkey] = React.useState(!!(window as any).__chaos_monkey_active);
  const [isCorrupting, setIsCorrupting] = React.useState(false);
  const [devTapCount, setDevTapCount] = React.useState(0);
  const [showChaos, setShowChaos] = React.useState(false);
  const [showTgConfirm, setShowTgConfirm] = React.useState(false);
  const [showSpyAnim, setShowSpyAnim] = React.useState(false);
  const [showTgAnim, setShowTgAnim] = React.useState(false);

  const toggleFetchChaos = () => {
    const next = !chaosFetch;
    (window as any).__chaos_fetch_active = next;
    setChaosFetch(next);
    addToast(next ? "Network Blackhole Active (fetch fuzzer)" : "Network Blackhole Deactivated", next ? "warning" : "success");
    haptic(10);
  };

  const toggleMonkeyChaos = () => {
    const next = !chaosMonkey;
    if (next) {
      if ((window as any).__chaos_monkey_start) {
        (window as any).__chaos_monkey_start(50);
      }
    } else {
      if ((window as any).__chaos_monkey_stop) {
        (window as any).__chaos_monkey_stop();
      }
    }
    setChaosMonkey(next);
    addToast(next ? "UI Gremlin Monkey Active!" : "UI Gremlin Monkey Stopped", next ? "warning" : "success");
    haptic(10);
  };

  const runDbCorruptor = async () => {
    if (isCorrupting) return;
    setIsCorrupting(true);
    haptic([40, 40]);
    addToast("Executing direct DB corrupt transaction...", "info");
    try {
      if ((window as any).__chaos_corrupt_db) {
        await (window as any).__chaos_corrupt_db();
        addToast("IndexedDB poisoned! Fallback engine isolated poisoned rows.", "warning");
      } else {
        addToast("DB corruptor script not loaded yet.", "error");
      }
    } catch(err) {
      addToast("Failed to corrupt DB", "error");
    } finally {
      setIsCorrupting(false);
    }
  };

  const runAmnesia = () => {
    haptic([30, 30]);
    addToast("Volatile RAM Wiped! Forcing Amnesia scenario...", "warning");
    if ((window as any).__chaos_trigger_amnesia) {
      (window as any).__chaos_trigger_amnesia();
      addToast("Zustand state successfully purged. Touch UI to auto-restore from DB.", "success");
    } else {
      addToast("Amnesia script not loaded yet.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="px-1 mt-6 flex items-center justify-between">
        <span 
          onClick={() => {
            if (devTapCount >= 6) {
              const nextState = !settings.developerMode;
              setShowChaos(nextState);
              setSettings(s => ({ ...s, developerMode: nextState }));
              db.setSetting('settings', { ...settings, developerMode: nextState });
              addToast(nextState ? "Developer Mode Unlocked" : "Developer Mode Locked", "success");
              setDevTapCount(0);
            } else {
              setDevTapCount(c => c + 1);
            }
          }}
          className="text-xs font-black text-[var(--t3)] select-none"
        >
          {t('Settings')}
        </span>
      </div>
      
      <div className="space-y-4">
        {/* Chaos Laboratory Block */}
        {settings.developerMode && (
        <div className="rounded-card border border-[var(--b)] bg-[var(--bg-1)] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col p-2">
          <div className="flex flex-col px-4 py-3.5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-[12px] bg-[var(--bg)] border border-[var(--b)] flex items-center justify-center text-[var(--danger)] shadow-[0_2px_8px_rgba(255,59,48,0.08)]">
                <Flame size={18} className="animate-pulse text-[var(--danger)]" />
              </div>
              <div className="flex-1 space-y-1">
                <span className="text-[11px] font-black text-[var(--t1)] block">Chaos Lab</span>
                <span className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider block">Asynchronous Fuzzing & Resilience</span>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              {/* 1. Network Blackhole */}
              <div className="flex items-center justify-between p-3.5 rounded-panel bg-[var(--bg)] border border-[var(--b)]">
                <div className="flex flex-col gap-0.5 max-w-[70%]">
                  <span className="text-xs font-black text-[var(--t1)] text-left">Network Blackhole</span>
                  <span className="text-micro font-semibold text-[var(--t3)] leading-relaxed text-left">Fuzzes fetch with latency, drops & Bad Gateways.</span>
                </div>
                <button 
                  onClick={toggleFetchChaos}
                  className={`w-10 h-6 p-1 rounded-full border border-[var(--b)] transition-colors relative flex items-center shrink-0 ${chaosFetch ? 'bg-[var(--danger)] border-[var(--danger)]' : 'bg-[var(--bg-1)] text-[var(--t3)]'}`}
                >
                  <motion.div layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`w-4 h-4 rounded-full shadow-sm ${chaosFetch ? 'bg-[var(--bg)] ml-auto' : 'bg-[var(--t3)]/50'}`} />
                </button>
              </div>

              {/* 2. DB Corruptor */}
              <div className="flex items-center justify-between p-3.5 rounded-panel bg-[var(--bg)] border border-[var(--b)]">
                <div className="flex flex-col gap-0.5 max-w-[70%]">
                  <span className="text-xs font-black text-[var(--t1)] text-left">DB Corruptor</span>
                  <span className="text-micro font-semibold text-[var(--t3)] leading-relaxed text-left">Direct IndexedDB poisoning with invalid types.</span>
                </div>
                <button 
                  onClick={runDbCorruptor}
                  className="px-3 py-1.5 rounded-full text-micro font-black bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 hover:bg-[var(--b)] hover:text-[var(--danger)] transition-all active:scale-95 shrink-0"
                >
                  Corrupt DB
                </button>
              </div>

              {/* 3. Gremlin Monkey */}
              <div className="flex items-center justify-between p-3.5 rounded-panel bg-[var(--bg)] border border-[var(--b)]">
                <div className="flex flex-col gap-0.5 max-w-[70%]">
                  <span className="text-xs font-black text-[var(--t1)] text-left">Gremlin Monkey</span>
                  <span className="text-micro font-semibold text-[var(--t3)] leading-relaxed text-left">Fuzz clicks up to 50 interactions per second.</span>
                </div>
                <button 
                  onClick={toggleMonkeyChaos}
                  className={`w-10 h-6 p-1 rounded-full border border-[var(--b)] transition-colors relative flex items-center shrink-0 ${chaosMonkey ? 'bg-[var(--danger)] border-[var(--danger)] animate-pulse' : 'bg-[var(--bg-1)] text-[var(--t3)]'}`}
                >
                  <motion.div layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`w-4 h-4 rounded-full shadow-sm ${chaosMonkey ? 'bg-[var(--bg)] ml-auto' : 'bg-[var(--t3)]/50'}`} />
                </button>
              </div>

              {/* 4. Amnesia Trigger */}
              <div className="flex items-center justify-between p-3.5 rounded-panel bg-[var(--bg)] border border-[var(--b)]">
                <div className="flex flex-col gap-0.5 max-w-[70%]">
                  <span className="text-xs font-black text-[var(--t1)] text-left">RAM Amnesia</span>
                  <span className="text-micro font-semibold text-[var(--t3)] leading-relaxed text-left">Wipes memory store to test transparent recovery.</span>
                </div>
                <button 
                  onClick={runAmnesia}
                  className="px-3 py-1.5 rounded-full text-micro font-black bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20 hover:bg-[var(--b)] hover:text-[var(--danger)] transition-all active:scale-95 shrink-0"
                >
                  Purge RAM
                </button>
              </div>
            </div>
          </div>
        </div>
        )}
        {/* Privacy Block */}
        <div className="rounded-card border border-[var(--b)] bg-[var(--bg-1)] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col p-2">
          <div className="flex flex-col px-4 py-3.5">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-10 h-10 rounded-[12px] bg-[var(--bg)] border border-[var(--b)] flex items-center justify-center text-[var(--t2)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div className="flex-1 space-y-1">
                <span className="text-[11px] font-black text-[var(--t1)] block">{t('Privacy & Security')}</span>
                <span className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider block">{t('E2E Encryption & Blurring')}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 p-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--t2)] uppercase tracking-wider">{t('Privacy Mode (Blur)')}</span>
                <button 
                  onClick={() => setSettings(s => ({ ...s, privacyMode: !s.privacyMode }))}
                  className={`w-10 h-6 p-1 rounded-full border border-[var(--b)] transition-colors relative flex items-center shrink-0 ${settings.privacyMode ? 'bg-[var(--a)] border-[var(--a)]' : 'bg-[var(--bg)]'}`}
                  aria-label={settings.privacyMode ? t('Disable Privacy Mode') : t('Enable Privacy Mode')}
                >
                  <motion.div layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`w-4 h-4 rounded-full shadow-sm ${settings.privacyMode ? 'bg-[var(--bg)] ml-auto' : 'bg-[var(--t3)]'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[var(--b)]/50">
                <div className="flex flex-col gap-1 pr-4">
                  <span className="text-xs font-black text-[var(--danger)] uppercase tracking-widest">{t('ANTI - AI')}</span>
                  <span className="text-[9px] font-bold text-[var(--t1)] uppercase tracking-wider">{t('Paranoid Data Security')}</span>
                  <span className="text-micro font-medium text-[var(--t3)] leading-snug">{t('Block all network connections & disable cloud services')}</span>
                </div>
                <button 
                  onClick={() => {
                    const nextVal = !settings.strictOfflineMode;
                    setSettings(s => ({ ...s, strictOfflineMode: nextVal }));
                    if (nextVal) {
                      setShowSpyAnim(true);
                      haptic(50);
                      setTimeout(() => setShowSpyAnim(false), 2000);
                    } else {
                      haptic(10);
                    }
                  }}
                  className={`w-10 h-6 p-1 rounded-full border border-[var(--b)] transition-colors relative flex items-center shrink-0 ${settings.strictOfflineMode ? 'bg-[var(--danger)] border-[var(--danger)]' : 'bg-[var(--bg)]'}`}
                >
                  <motion.div layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`w-4 h-4 rounded-full shadow-sm ${settings.strictOfflineMode ? 'bg-[var(--bg)] ml-auto' : 'bg-[var(--t3)]'}`} />
                </button>
              </div>


            </div>
          </div>
        </div>

        {/* Salary & Goal Block */}
        <div className="rounded-card border border-[var(--b)] bg-[var(--bg-1)] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col p-2">
          <div className="flex flex-col px-4 py-3.5 mb-2">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-[12px] bg-[var(--bg)] border border-[var(--b)] flex items-center justify-center text-[var(--t2)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 6V4c0-.5.5-1 1-1h4c.5 0 1 .5 1 1v2" />
                  <rect width="18" height="12" x="3" y="6" rx="2" />
                </svg>
              </div>
              <div className="flex-1 space-y-1">
                <span className="text-[11px] font-black text-[var(--t1)] block">{t('Salary & Goal')}</span>
                <span className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider block">{t('Manage your target revenue')}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-[var(--t2)] uppercase tracking-wider px-1">{t('Hourly Rate')}</span>
                <div className="flex p-1 rounded-panel bg-[var(--bg)] border border-[var(--b)] items-center focus-within:border-[var(--a)] transition-colors h-12">
                  <motion.button onClick={() => { haptic(10); setSettings(s => ({ ...s, rate: Math.max(0, s.rate - 1) })); }} className="w-12 h-full rounded-control bg-[var(--bg-1)] flex items-center justify-center text-[var(--t2)] hover:text-[var(--t1)] transition-colors active:scale-95">
                    <Minus size={16} strokeWidth={2.5} />
                  </motion.button>
                  <div className="flex items-center flex-1 justify-center text-[var(--t1)] px-2">
                    <span className="text-sm font-black opacity-40 mr-1">{curSym}</span>
                    <input 
                      type="number" 
                      value={localRate} 
                      onChange={e => {
                        setLocalRate(e.target.value);
                        const num = parseFloat(e.target.value);
                        if (!isNaN(num)) setSettings(s => ({ ...s, rate: num }));
                        else if (e.target.value === '') setSettings(s => ({ ...s, rate: 0 }));
                      }} 
                      className="w-full bg-transparent text-center text-lg font-black outline-none placeholder:text-[var(--t3)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                      placeholder="0"
                    />
                  </div>
                  <motion.button onClick={() => { haptic(10); setSettings(s => ({ ...s, rate: s.rate + 1 })); }} className="w-12 h-full rounded-control bg-[var(--bg-1)] flex items-center justify-center text-[var(--t2)] hover:text-[var(--t1)] transition-colors active:scale-95">
                    <Plus size={16} strokeWidth={2.5} />
                  </motion.button>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-bold text-[var(--t2)] uppercase tracking-wider px-1">{t('Goal')} <span className="opacity-40">/ mo</span></span>
                <div className="flex p-1 rounded-panel bg-[var(--bg)] border border-[var(--b)] items-center focus-within:border-[var(--a)] transition-colors h-12">
                  <motion.button onClick={() => { haptic(10); setSettings(s => ({ ...s, goal: Math.max(0, s.goal - 50) })); }} className="w-12 h-full rounded-control bg-[var(--bg-1)] flex items-center justify-center text-[var(--t2)] hover:text-[var(--t1)] transition-colors active:scale-95">
                    <Minus size={16} strokeWidth={2.5} />
                  </motion.button>
                  <div className="flex items-center flex-1 justify-center text-[var(--t1)] px-2">
                    <span className="text-sm font-black opacity-40 mr-1">{curSym}</span>
                    <input 
                      type="number" 
                      value={localGoal} 
                      onChange={e => {
                        setLocalGoal(e.target.value);
                        const num = parseFloat(e.target.value);
                        if (!isNaN(num)) setSettings(s => ({ ...s, goal: num }));
                        else if (e.target.value === '') setSettings(s => ({ ...s, goal: 0 }));
                      }} 
                      className="w-full bg-transparent text-center text-lg font-black outline-none placeholder:text-[var(--t3)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                      placeholder="0"
                    />
                  </div>
                  <motion.button onClick={() => { haptic(10); setSettings(s => ({ ...s, goal: s.goal + 50 })); }} className="w-12 h-full rounded-control bg-[var(--bg-1)] flex items-center justify-center text-[var(--t2)] hover:text-[var(--t1)] transition-colors active:scale-95">
                    <Plus size={16} strokeWidth={2.5} />
                  </motion.button>
                </div>
              </div>

              <motion.button onClick={async () => { await db.setSetting('settings', settings); addToast(t('Save'), 'success'); haptic(10); }} className="w-full h-14 rounded-panel bg-[var(--t1)] text-[var(--bg)] font-black text-xs mt-6 mb-2 transition-all shadow-md active:scale-95 flex items-center justify-center leading-none">
                {t('Save')}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Appearance Block */}
        <div className="rounded-card border border-[var(--b)] bg-[var(--bg-1)] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col p-2">
          <div className="flex flex-col px-4 py-3.5 mb-2">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-[12px] bg-[var(--bg)] border border-[var(--b)] flex items-center justify-center text-[var(--t2)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <Palette size={18} strokeWidth={1.5} />
              </div>
              <div className="flex-1 space-y-1">
                <span className="text-[11px] font-black text-[var(--t1)] block">{t('Appearance & Config')}</span>
                <span className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider block">{t('Customize the interface')}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-[var(--t2)] uppercase tracking-wider px-1">{t('Theme')}</span>
                <div className="flex p-1 rounded-panel bg-[var(--bg)] border border-[var(--b)]">
                  {['light', 'dark', 'indigo'].map(th => (
                    <button 
                      key={th}
                      onClick={() => {
                        const newSettings = { ...settings, theme: th as any };
                        setSettings(newSettings);
                        document.documentElement.className = th;
                        db.setSetting('settings', newSettings);
                        haptic(10);
                      }}
                      className={`flex-1 py-2.5 text-xs font-black rounded-control transition-all border ${settings.theme === th ? 'bg-[var(--bg-1)] text-[var(--t1)] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border-[var(--b)]' : 'text-[var(--t3)] hover:text-[var(--t2)] border-transparent'}`}
                    >
                      {t(th)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-bold text-[var(--t2)] uppercase tracking-wider px-1">{t('Language')}</span>
                <div className="flex p-1 rounded-panel bg-[var(--bg)] border border-[var(--b)]">
                  {['ENG', 'RUS', 'GR'].map(lang => (
                    <button 
                      key={lang}
                      onClick={() => { setSettings(s => ({ ...s, language: lang as any })); haptic(10); }}
                      className={`flex-1 py-2.5 text-xs font-black rounded-control transition-all border ${settings.language === lang ? 'bg-[var(--bg-1)] text-[var(--t1)] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border-[var(--b)]' : 'text-[var(--t3)] hover:text-[var(--t2)] border-transparent'}`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-bold text-[var(--t2)] uppercase tracking-wider px-1">{t('Currency')}</span>
                <div className="flex p-1 rounded-panel bg-[var(--bg)] border border-[var(--b)]">
                  {['EUR', 'RUB'].map(cur => (
                    <button 
                      key={cur}
                      onClick={() => { setSettings(s => ({ ...s, currency: cur as any })); haptic(10); }}
                      className={`flex-1 py-2.5 text-xs font-black rounded-control transition-all border ${settings.currency === cur ? 'bg-[var(--bg-1)] text-[var(--t1)] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border-[var(--b)]' : 'text-[var(--t3)] hover:text-[var(--t2)] border-transparent'}`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              </div>


              
              {isInstallable && (
                <button 
                  onClick={promptInstall}
                  className="w-full flex items-center justify-between p-3.5 mt-2 rounded-panel bg-[var(--bg)] border border-[var(--b)] hover:bg-[var(--b)] transition-colors"
                >
                  <span className="text-xs font-bold text-[var(--a)] uppercase tracking-wider">{t('Install App')}</span>
                  <Smartphone size={16} className="text-[var(--a)]" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Data & Backup Block */}
        <div className="rounded-card border border-[var(--b)] bg-[var(--bg-1)] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col p-2">
          <div className="flex flex-col px-4 py-3.5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-[12px] bg-[var(--bg)] border border-[var(--b)] flex items-center justify-center text-[var(--t2)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <Database size={18} strokeWidth={1.5} />
              </div>
              <div className="flex-1 space-y-1">
                <span className="text-[11px] font-black text-[var(--t1)] block">{t('Data & Backup')}</span>
                <span className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider block">{t('Export your records safely')}</span>
              </div>
            </div>
            
            <div className="space-y-3 mt-4">
              <button onClick={exportCSV} className="w-full flex items-center justify-between h-14 px-4 rounded-panel bg-[var(--bg)] border border-[var(--b)] hover:bg-[var(--b)] transition-all">
                <div className="flex items-center gap-3.5"><FileText size={16} className="text-[var(--t2)]"/> <span className="text-sm font-black text-[var(--t1)]">{t('Export CSV')}</span></div>
                <ChevronRight size={16} className="text-[var(--t3)]"/>
              </button>
              <button onClick={exportTXT} className="w-full flex items-center justify-between h-14 px-4 rounded-panel bg-[var(--bg)] border border-[var(--b)] hover:bg-[var(--b)] transition-all">
                <div className="flex items-center gap-3.5"><FileText size={16} className="text-[var(--t2)]"/> <span className="text-sm font-black text-[var(--t1)]">{t('Save .txt')}</span></div>
                <ChevronRight size={16} className="text-[var(--t3)]"/>
              </button>
              <button 
                onClick={() => exportPDF('year')} 
                disabled={isExporting}
                className="w-full flex items-center justify-between h-14 px-4 rounded-panel bg-[var(--bg)] border border-[var(--b)] hover:bg-[var(--b)] transition-all disabled:opacity-50"
              >
                <div className="flex items-center gap-3.5"><Save size={16} className="text-[var(--t2)]"/> <span className="text-sm font-black text-[var(--t1)]">{t('PDF Report')}</span></div>
                <ChevronRight size={16} className="text-[var(--t3)]"/>
              </button>
              <button onClick={exportICS} className="w-full flex items-center justify-between h-14 px-4 rounded-panel bg-[var(--bg)] border border-[var(--b)] hover:bg-[var(--b)] transition-all">
                <div className="flex items-center gap-3.5"><CalendarPlus size={16} className="text-[var(--t2)]"/> <span className="text-sm font-black text-[var(--t1)]">{t('Add to Calendar')}</span></div>
                <ChevronRight size={16} className="text-[var(--t3)]"/>
              </button>
              <button 
                onClick={() => { setShowTgConfirm(true); haptic(10); }} 
                disabled={settings.strictOfflineMode}
                className={`w-full flex items-center justify-between h-14 px-4 rounded-panel bg-[var(--bg)] border border-[var(--b)] transition-all relative overflow-hidden group ${settings.strictOfflineMode ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-[var(--b)] text-[var(--t1)]'}`}
              >
                <div className={`flex items-center gap-3.5 relative ${settings.strictOfflineMode ? 'text-[var(--t3)]' : 'text-[var(--t1)]'}`}><Send size={16} /> <span className="text-sm font-black">{t('Share & Export...')}</span></div>
                <ChevronRight size={16} className={`relative ${settings.strictOfflineMode ? 'text-[var(--t3)]' : 'text-[var(--t1)]'}`}/>
              </button>
              <button onClick={shareBackup} className="w-full flex items-center justify-between h-14 px-4 rounded-panel bg-[var(--bg)] border border-[var(--b)] hover:bg-[var(--b)] transition-all">
                <div className="flex items-center gap-3.5"><Download size={16} className="text-[var(--t2)]"/> <span className="text-sm font-black text-[var(--t1)]">{t('Backup Data')}</span></div>
                <ChevronRight size={16} className="text-[var(--t3)]"/>
              </button>
            </div>
          </div>
        </div>


        {/* Device & System Block */}
        <div className="rounded-card border border-[var(--b)] bg-[var(--bg-1)] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col p-2">
          <div className="flex flex-col px-4 py-3.5 mb-2">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-[12px] bg-[var(--bg)] border border-[var(--b)] flex items-center justify-center text-[var(--t2)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <Sliders size={18} strokeWidth={1.5} />
              </div>
              <div className="flex-1 space-y-1">
                <span className="text-[11px] font-black text-[var(--t1)] block">{t('Device & System')}</span>
                <span className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider block">{t('System preferences')}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 p-1">
              
              {/* Notifications */}
              <div className="flex items-center justify-between p-3.5 rounded-panel bg-[var(--bg)] border border-[var(--b)]">
                <div className="flex items-center gap-3">
                  <Bell size={16} className="text-[var(--t2)]" />
                  <span className="text-xs font-bold text-[var(--t2)] uppercase tracking-wider">{t('Notifications')}</span>
                </div>
                <button 
                  onClick={() => {
                    const newVal = !settings.notificationsEnabled;
                    setSettings(s => ({ ...s, notificationsEnabled: newVal }));
                    if (newVal) haptic(30, true);
                  }} 
                  className={`w-10 h-6 p-1 rounded-full border border-[var(--b)] transition-colors relative flex items-center ${settings.notificationsEnabled ? 'bg-[var(--a)] border-[var(--a)]' : 'bg-[var(--bg-1)] text-[var(--t3)]'}`}
                  aria-label={settings.notificationsEnabled ? t('Disable Notifications') : t('Enable Notifications')}
                >
                  <motion.div layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`w-4 h-4 rounded-full shadow-sm ${settings.notificationsEnabled ? 'bg-[var(--bg)] ml-auto' : 'bg-[var(--t3)]/50'}`} />
                </button>
              </div>

              {/* Haptics */}
              <div className="flex items-center justify-between p-3.5 mt-2 rounded-panel bg-[var(--bg)] border border-[var(--b)]">
                <div className="flex items-center gap-3">
                  <Smartphone size={16} className="text-[var(--t2)]" />
                  <span className="text-xs font-bold text-[var(--t2)] uppercase tracking-wider">{t('Haptics')}</span>
                </div>
                <button 
                  onClick={() => {
                    const newVal = !settings.hapticEnabled;
                    setSettings(s => ({ ...s, hapticEnabled: newVal }));
                    if (newVal) haptic(30, true);
                  }} 
                  className={`w-10 h-6 p-1 rounded-full border border-[var(--b)] transition-colors relative flex items-center ${settings.hapticEnabled ? 'bg-[var(--a)] border-[var(--a)]' : 'bg-[var(--bg-1)] text-[var(--t3)]'}`}
                  aria-label={settings.hapticEnabled ? t('Disable Haptics') : t('Enable Haptics')}
                >
                  <motion.div layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`w-4 h-4 rounded-full shadow-sm ${settings.hapticEnabled ? 'bg-[var(--bg)] ml-auto' : 'bg-[var(--t3)]/50'}`} />
                </button>
              </div>

              {/* Power Save Mode */}
              <div className="flex items-center justify-between p-3.5 mt-2 rounded-panel bg-[var(--bg)] border border-[var(--b)]">
                <div className="flex items-center gap-3">
                  <Zap size={16} className="text-[var(--t2)]" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-[var(--t2)] uppercase tracking-wider">{t('Power Save Mode')}</span>
                    <span className="text-[9px] font-medium text-[var(--t3)]">{t('Battery optimization')}</span>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    const nextVal = !settings.powerSaveMode;
                    setSettings(s => ({ ...s, powerSaveMode: nextVal }));
                    haptic(10);
                  }}
                  className={`w-10 h-6 p-1 rounded-full border border-[var(--b)] transition-colors relative flex items-center shrink-0 ${settings.powerSaveMode ? 'bg-[var(--a)] border-[var(--a)]' : 'bg-[var(--bg-1)] text-[var(--t3)]'}`}
                  aria-label={settings.powerSaveMode ? t('Disable Power Save Mode') : t('Enable Power Save Mode')}
                >
                  <motion.div layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`w-4 h-4 rounded-full shadow-sm ${settings.powerSaveMode ? 'bg-[var(--bg)] ml-auto' : 'bg-[var(--t3)]/50'}`} />
                </button>
              </div>

            </div>
          </div>
        </div>
\n        {/* Cloud Sync Block */}
        <div className={`rounded-card border border-[var(--b)] bg-[var(--bg-1)] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col p-2 ${settings.strictOfflineMode ? 'opacity-50 grayscale' : ''}`}>
          <div className="flex flex-col px-4 py-3.5 mb-2 relative">
            {settings.strictOfflineMode && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--bg-1)]/60 backdrop-blur-[2px]">
                <div className="text-xs font-black text-[var(--danger)] px-4 py-2 bg-[var(--danger)]/10 rounded-full border border-[var(--danger)]/30 backdrop-blur-md text-center leading-snug break-words max-w-[80%]">
                  {t('Blocked by Paranoia Mode')}
                </div>
              </div>
            )}
            <div className={`flex items-center gap-4 mb-4 ${settings.strictOfflineMode ? 'pointer-events-none' : ''}`}>
              <div className="w-10 h-10 rounded-[12px] bg-[var(--bg)] border border-[var(--b)] flex items-center justify-center text-[var(--t2)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
                  <path d="M12 12v6" />
                  <path d="m9 15 3-3 3 3" />
                </svg>
              </div>
              <div className="flex-1 space-y-1">
                <span className="text-[11px] font-black text-[var(--t1)] block">{t('Cloud Sync')}</span>
                <span className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider block">
                  {syncStatus === 'syncing' ? t('Syncing...') : (settings.lastSync || lastSynced) ? `${t('Last')}: ${settings.lastSync || lastSynced}` : t('Never synced')}
                </span>
              </div>
            </div>

            {syncStatus === 'error' && (
              <div className="mb-4 text-[9px] text-[var(--danger)] font-bold bg-[var(--danger)]/10 p-2.5 rounded-[12px] leading-relaxed">
                Error: {syncErrorMsg}
              </div>
            )}

            <button 
              onClick={syncTapActual.trigger}
              disabled={syncStatus === 'syncing' || settings.strictOfflineMode}
              className={`h-14 flex items-center justify-center gap-2 rounded-panel font-black text-xs active:scale-95 transition-all disabled:opacity-50 relative overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.05)] ${
                syncStatus === 'success' ? 'bg-[var(--green)] text-white' : 
                syncStatus === 'error' ? 'bg-[var(--danger)] text-white' : 
                'bg-[var(--t1)] text-[var(--bg)]'
              }`}
            >
              {syncStatus === 'syncing' ? (
                <><RefreshCw size={14} className="animate-spin" /> {t('Syncing...')}</>
              ) : syncTapActual.isConfirming ? (
                <div className="flex items-center gap-2">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_white]"
                  />
                  {t('Tap to Sync')}
                </div>
              ) : syncStatus === 'success' ? (
                <><Check size={14} /> {t('Synchronized')}</>
              ) : syncStatus === 'error' ? (
                <><AlertTriangle size={14} /> {t('Sync Failed')}</>
              ) : (
                <><RefreshCw size={14} /> {t('Sync')}</>
              )}
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-12 pt-8 border-t border-[var(--danger)]/20 px-2 mb-12">
          <div className="flex flex-col gap-2 mb-4">
            <span className="text-xs font-black text-[var(--danger)]">Danger Zone</span>
            <span className="text-[9px] font-bold text-[var(--t3)] uppercase tracking-wider">Irreversible actions</span>
          </div>
          <button 
            onClick={() => { haptic(10); deleteAllTap.trigger(); }}
            className="w-full flex items-center justify-between h-14 px-4 rounded-panel bg-[var(--danger)]/5 border border-[var(--danger)]/30 hover:bg-[var(--b)] transition-all text-[var(--danger)] relative overflow-hidden group shadow-[0_8px_16px_rgba(255,59,48,0.05)]"
          >
            <div className="flex items-center gap-3.5 relative">
              <AnimatedTrash size={16} isConfirming={deleteAllTap.isConfirming} className="group-hover:scale-110 transition-transform" /> 
              <span className="text-sm font-black">
                {deleteAllTap.isConfirming ? t('Tap to Confirm Wipe') : t('Wipe All Local Data')}
              </span>
            </div>
            {deleteAllTap.isConfirming ? (
              <AlertTriangle size={16} className="text-[var(--danger)] animate-pulse relative" />
            ) : (
              <ChevronRight size={16} className="text-[var(--danger)] relative" />
            )}
          </button>
        </div>

        {/* Modals via Portal */}
        {createPortal(
          <>
        {/* Share Data Choice Modal */}
        {showTgConfirm && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[var(--bg)] w-full max-w-sm rounded-[24px] border border-[var(--b)] shadow-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-[#3390ec]/10 flex items-center justify-center text-[#3390ec]">
                  <Send size={24} />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-[var(--t1)]">{t('Share Data')}</h3>
                <p className="text-sm font-medium text-[var(--t2)]">
                  {t('Choose the format you want to send:')}
                </p>
              </div>
              
              <div className="flex flex-col gap-2 pt-2">
                <button 
                  onClick={() => {
                    setShowTgConfirm(false);
                    setShowTgAnim(true);
                    haptic(50);
                    setTimeout(() => shareToTelegram('summary'), 1000);
                    setTimeout(() => setShowTgAnim(false), 2500);
                  }}
                  className="w-full flex items-center justify-between h-14 px-4 rounded-panel bg-[var(--bg-1)] border border-[var(--b)] hover:bg-[var(--b)] transition-all"
                >
                  <div className="flex items-center gap-3"><AlignLeft size={16} className="text-[#3390ec]" /> <span className="text-sm font-black text-[var(--t1)]">{t('Short Summary (Text)')}</span></div>
                  <ChevronRight size={16} className="text-[var(--t3)]" />
                </button>

                <button 
                  onClick={() => {
                    setShowTgConfirm(false);
                    setShowTgAnim(true);
                    haptic(50);
                    setTimeout(() => shareToTelegram('txt'), 1000);
                    setTimeout(() => setShowTgAnim(false), 2500);
                  }}
                  className="w-full flex items-center justify-between h-14 px-4 rounded-panel bg-[var(--bg-1)] border border-[var(--b)] hover:bg-[var(--b)] transition-all"
                >
                  <div className="flex items-center gap-3"><FileText size={16} className="text-[var(--t2)]" /> <span className="text-sm font-black text-[var(--t1)]">{t('Detailed Report (TXT)')}</span></div>
                  <ChevronRight size={16} className="text-[var(--t3)]" />
                </button>

                <button 
                  onClick={() => {
                    setShowTgConfirm(false);
                    setShowTgAnim(true);
                    haptic(50);
                    setTimeout(() => shareToTelegram('pdf'), 1000);
                    setTimeout(() => setShowTgAnim(false), 2500);
                  }}
                  className="w-full flex items-center justify-between h-14 px-4 rounded-panel bg-[var(--bg-1)] border border-[var(--b)] hover:bg-[var(--b)] transition-all"
                >
                  <div className="flex items-center gap-3"><FileText size={16} className="text-[var(--a)]" /> <span className="text-sm font-black text-[var(--t1)]">{t('Visual Report (PDF)')}</span></div>
                  <ChevronRight size={16} className="text-[var(--t3)]" />
                </button>

                <button 
                  onClick={() => {
                    setShowTgConfirm(false);
                    setShowTgAnim(true);
                    haptic(50);
                    setTimeout(() => shareToTelegram('csv'), 1000);
                    setTimeout(() => setShowTgAnim(false), 2500);
                  }}
                  className="w-full flex items-center justify-between h-14 px-4 rounded-panel bg-[var(--bg-1)] border border-[var(--b)] hover:bg-[var(--b)] transition-all"
                >
                  <div className="flex items-center gap-3"><Table size={16} className="text-[var(--t2)]" /> <span className="text-sm font-black text-[var(--t1)]">{t('Spreadsheet (CSV)')}</span></div>
                  <ChevronRight size={16} className="text-[var(--t3)]" />
                </button>

                <button 
                  onClick={() => {
                    setShowTgConfirm(false);
                    setShowTgAnim(true);
                    haptic(50);
                    setTimeout(() => shareToTelegram('json'), 1000);
                    setTimeout(() => setShowTgAnim(false), 2500);
                  }}
                  className="w-full flex items-center justify-between h-14 px-4 rounded-panel bg-[var(--bg-1)] border border-[var(--b)] hover:bg-[var(--b)] transition-all"
                >
                  <div className="flex items-center gap-3"><Database size={16} className="text-[var(--t2)]" /> <span className="text-sm font-black text-[var(--t1)]">{t('Full Backup (JSON)')}</span></div>
                  <ChevronRight size={16} className="text-[var(--t3)]" />
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowTgConfirm(false)}
                  className="w-full py-3.5 rounded-panel bg-[var(--bg)] text-[var(--t2)] font-bold text-sm hover:text-[var(--t1)] hover:bg-[var(--b)] border border-[var(--b)] transition-colors active:scale-95"
                >
                  {t('Cancel')}
                </button>
              </div>
            </div>
          </div>
        )}



        {/* Spy Mode / Anti-AI Animation Overlay */}
        <AnimatePresence>
          {showSpyAnim && (
            <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl font-mono">
              <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.2, opacity: 0 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="flex flex-col items-center gap-6"
                >
                  <div className="relative">
                    <Shield size={100} className="text-[#34c759] opacity-20 animate-pulse" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Lock size={48} className="text-[#34c759]" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <motion.h2 
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-2xl font-black text-[#34c759] "
                    >
                      Fortress Mode
                    </motion.h2>
                    <motion.p
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-[#34c759]/70 text-sm font-medium tracking-widest"
                    >
                      NETWORK SEVERED. DATA SECURED.
                    </motion.p>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      className="flex items-center justify-center gap-2 mt-4 text-xs text-[#34c759]/50"
                    >
                      <Terminal size={12} />
                      <span>ANTI-AI PROTOCOL ENGAGED</span>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

        {/* Telegram WOW Animation Overlay */}
        <AnimatePresence>
          {showTgAnim && (
            <div className="absolute inset-0 z-[200] flex flex-col items-center justify-center bg-[var(--bg)]/90 backdrop-blur-xl">
                <motion.div
                  initial={{ y: 100, opacity: 0, scale: 0.5 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: -100, opacity: 0, scale: 0.5 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="flex flex-col items-center gap-6"
                >
                  <motion.div 
                    animate={{ 
                      y: [-10, 10, -10],
                      rotate: [-5, 5, -5]
                    }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl"
                  >
                    <Send size={64} className="text-[var(--t1)] ml-2" />
                  </motion.div>
                  <div className="text-center space-y-2">
                    <motion.h2 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-3xl font-black text-white  shadow-black drop-shadow-md"
                    >
                      Sending
                    </motion.h2>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center justify-center gap-2 text-white/80 font-bold tracking-widest"
                    >
                      <CircleCheck size={18} />
                      <span>DATA PACKAGED</span>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

          </>,
          document.getElementById('frame') || document.body
        )}
        {/* Footer Area */}
        <div className="flex flex-col items-center justify-center pt-6 pb-8 gap-4">
          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--t3)] opacity-40">Version V1.024</div>
        </div>
      </div>
    </div>
  );
}
