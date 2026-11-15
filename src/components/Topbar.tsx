import { useState, useEffect } from 'react';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { Logo } from './Logo';
import { useAppStore } from '../store/useAppStore';
import { OrbitalIndicator } from './OrbitalIndicator';

const Clock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className="text-micro font-semibold text-[var(--t3)] tracking-wider tabular-nums">
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
    </span>
  );
};

interface TopbarProps {
  haptic: (amount: number) => void;
  syncStatus: string;
  strictMode?: boolean;
  t: (key: string) => string;
}

export function Topbar({ haptic, syncStatus, strictMode, t }: TopbarProps) {
  const screen = useAppStore(s => s.screen);
  const setScreen = useAppStore(s => s.setScreen);
  const privacyMode = useAppStore(s => s.settings.privacyMode);
  const setSettings = useAppStore(s => s.setSettings);

  const [isOnlineState, setIsOnlineState] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  useEffect(() => {
    const handleOnline = () => setIsOnlineState(true);
    const handleOffline = () => setIsOnlineState(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isOnline = isOnlineState && !strictMode;

  return (
    <div className="absolute top-0 left-0 right-0 h-[calc(56px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] px-6 flex items-center justify-between shrink-0 z-[100] apple-glass-bar border-b border-[var(--b)]">
      <div className="flex items-center gap-2.5 min-w-0">
        {screen === 'total' && (
          <button
            aria-label={t('Go Back') || "Go Back"}
            onClick={() => {
              haptic(15);
              setScreen('home');
            }}
            className="w-8 h-8 -ml-1.5 flex items-center justify-center text-[var(--t1)] hover:bg-[var(--b)] rounded-full transition-all shrink-0"
          >
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
        )}
        <button 
          aria-label="Work Tracker Pro"
          onClick={() => { haptic(15); setScreen('home'); }}
          className="flex items-center gap-2.5 group shrink-0"
        >
          <motion.div 
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="relative w-7 h-7 flex items-center justify-center text-[var(--t1)]"
          >
            <Logo className="w-full h-full" />
          </motion.div>
          <span className="w-1 h-1 rounded-full bg-[var(--t3)] opacity-40" />
          <Clock />
        </button>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => {
            haptic(10);
            setSettings(s => ({ ...s, privacyMode: !s.privacyMode }));
          }}
          className="w-9 h-9 flex items-center justify-center rounded-full apple-glass-btn text-[var(--t2)] hover:text-[var(--t1)] transition-all active:scale-92"
          aria-label={privacyMode ? (t('Show Earnings') || 'Show Earnings') : (t('Hide Earnings') || 'Hide Earnings')}
          title={privacyMode ? (t('Show Earnings') || 'Show Earnings') : (t('Hide Earnings') || 'Hide Earnings')}
        >
          {privacyMode ? <EyeOff size={16} strokeWidth={2} /> : <Eye size={16} strokeWidth={2} />}
        </button>

        <div className="h-9 flex items-center gap-1.5 px-3 rounded-full text-xs font-bold apple-glass-pill text-[var(--t2)] shrink-0 transition-all">
          {strictMode ? (
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--danger)] opacity-70" />
          ) : syncStatus === 'syncing' ? (
            <OrbitalIndicator size={12} color="var(--green)" speed={1.8} interactive={false} />
          ) : syncStatus === 'error' ? (
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--danger)] animate-pulse" />
          ) : !isOnline ? (
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--t3)] opacity-60" />
          ) : (
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
          )}
          <span className="lowercase text-micro font-bold tracking-wider">{strictMode ? t('offline') : isOnline ? (syncStatus === 'syncing' ? t('syncing') : t('online')) : t('offline')}</span>
        </div>
      </div>
    </div>
  );
}
