import { useState, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { Logo } from './Logo';
import { useAppStore } from '../store/useAppStore';

const Clock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className="text-micro font-bold text-[var(--t3)] uppercase tracking-widest mt-0.5">
      {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
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
  const { screen, setScreen } = useAppStore();
  const isOnline = navigator.onLine && !strictMode;

  return (
    <div className="absolute top-0 left-0 right-0 h-[calc(56px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] px-6 flex items-center justify-between shrink-0 z-[100] bg-[var(--bg)] border-b border-[var(--b)] shadow-sm">
      <div className="flex items-center gap-2 -ml-3">
        <div className="w-8 flex justify-center shrink-0">
          <button
            aria-label={t('Go Back') || "Go Back"}
            onClick={() => { 
              if (screen !== 'home') {
                haptic(15); 
                setScreen('home'); 
              }
            }}
            className={`p-1 text-[var(--t1)] hover:bg-[var(--b)] rounded-full transition-all duration-300 ${screen === 'home' ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'}`}
          >
            <ChevronLeft size={24} />
          </button>
        </div>
        <button 
          aria-label="Home Screen"
          onClick={() => { haptic(15); setScreen('home'); }}
          className="flex items-center gap-2.5 group shrink-0"
        >
          <motion.div 
            whileTap={{ scale: 0.85, y: 2 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            className="relative w-7 h-7 flex items-center justify-center text-[var(--t1)]"
          >
            <Logo className="w-full h-full" />
          </motion.div>
          <div className="flex flex-col ml-1">
            <span className="text-[11px] font-black tracking-[0.2em] uppercase leading-none gemini-text-gradient bg-clip-text text-left">
              Work Tracker Pro
            </span>
            <div className="flex justify-start text-left gap-1">
              <Clock />
            </div>
          </div>
        </button>
      </div>
      
      <div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 mr-1 rounded-full text-xs font-bold lowercase transition-all duration-500 ${strictMode ? 'bg-[var(--b)] text-[var(--t2)] border border-[var(--b)]' : isOnline ? 'bg-[var(--t1)] text-[var(--bg)] border border-transparent' : 'bg-[var(--b)] text-[var(--t2)] border border-[var(--b)]'}`}>
        {strictMode ? (
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--danger)] border border-[var(--danger)]/50 opacity-40" />
        ) : syncStatus === 'syncing' ? (
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
        ) : (!isOnline || syncStatus === 'error') ? (
          <motion.div 
            animate={{ opacity: [0.2, 1, 0.2] }} 
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-1.5 h-1.5 rounded-full bg-[var(--danger)] opacity-60" 
          />
        ) : (
          <motion.div 
            animate={{ opacity: [0.2, 1, 0.2] }} 
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" 
          />
        )}
        <span>{strictMode ? t('offline') : isOnline ? (syncStatus === 'syncing' ? t('syncing') : t('online')) : t('offline')}</span>
      </div>
    </div>
  );
}
