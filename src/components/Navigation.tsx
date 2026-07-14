import React from 'react';
import { motion } from 'motion/react';
import { useAppStore } from '../store/useAppStore';

interface NavigationProps {
  t: (key: string) => string;
  navClicks: { home: number; calendar: number; chart: number; total: number; settings: number };
  setNavClicks: React.Dispatch<React.SetStateAction<any>>;
}

export function Navigation({ t, navClicks, setNavClicks }: NavigationProps) {
  const { screen, setScreen } = useAppStore();

  return (
    <nav className="absolute bottom-0 left-0 right-0 h-[calc(80px+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] bg-[var(--bg)] sm:rounded-b-[41px] flex items-center px-2 z-[50] border-t border-[var(--b)] shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
      {[
        { 
          id: 'home', 
          label: t('Home'),
          icon: (
            <motion.svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <motion.path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" animate={{ y: navClicks.home % 2 !== 0 ? -2 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 10 }} />
              <motion.rect width={18} height={14} x={3} y={6} rx={3} animate={{ scaleY: navClicks.home % 2 !== 0 ? 0.9 : 1, y: navClicks.home % 2 !== 0 ? 1 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 10 }} />
            </motion.svg>
          )
        },
        { 
          id: 'calendar', 
          label: t('Calendar'),
          icon: (
            <motion.svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <rect width={18} height={18} x={3} y={4} rx={3} />
              <motion.path d="M16 2v4" animate={{ y: navClicks.calendar % 2 !== 0 ? -2 : 0 }} transition={{ type: "spring", stiffness: 300 }} />
              <motion.path d="M8 2v4" animate={{ y: navClicks.calendar % 2 !== 0 ? -2 : 0 }} transition={{ type: "spring", stiffness: 300 }} />
              <path d="M3 10h18" />
              <motion.circle cx={7} cy={14} r={1.5} fill="currentColor" stroke="none" initial={false} animate={{ cx: 7 + ((navClicks.calendar) % 3) * 5, cy: 14 + Math.floor((navClicks.calendar % 6) / 3) * 4 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} />
            </motion.svg>
          )
        },
        { 
          id: 'chart', 
          label: t('Chart'),
          icon: (
            <motion.svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <motion.line x1={6} y1={20} x2={6} y2={14} initial={false} animate={{ y2: navClicks.chart % 2 !== 0 ? 8 : 14 }} transition={{ type: "spring", stiffness: 150, damping: 15, delay: 0 }} />
              <motion.line x1={12} y1={20} x2={12} y2={6} initial={false} animate={{ y2: navClicks.chart % 2 !== 0 ? 14 : 6 }} transition={{ type: "spring", stiffness: 150, damping: 15, delay: 0.05 }} />
              <motion.line x1={18} y1={20} x2={18} y2={12} initial={false} animate={{ y2: navClicks.chart % 2 !== 0 ? 6 : 12 }} transition={{ type: "spring", stiffness: 150, damping: 15, delay: 0.1 }} />
            </motion.svg>
          )
        },
        { 
          id: 'settings', 
          label: t('Settings'),
          icon: (
            <motion.svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" animate={{ rotate: navClicks.settings * 180 }} transition={{ duration: 1.5, ease: [0.1, 1, 0.2, 1] }}>
              <circle cx={12} cy={12} r={3} />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </motion.svg>
          )
        }
      ].map(item => (
        <button 
          key={item.id}
          aria-label={item.label}
          onClick={() => {
            setScreen(item.id);
            setNavClicks((c: any) => ({ ...c, [item.id]: c[item.id as keyof typeof c] + 1 }));
          }}
          className="flex-1 h-full flex flex-col items-center justify-center gap-1.5 relative"
        >
          {screen === item.id && (
            <motion.div layoutId="nav-indicator" className="absolute top-0 w-8 h-[3px] bg-[var(--t1)] rounded-b-full" transition={{ type: "spring", stiffness: 300, damping: 30 }} />
          )}
          <div className={`transition-all duration-500 ${screen === item.id ? 'text-[var(--t1)] scale-110' : 'text-[var(--t3)] hover:text-[var(--t2)]'}`}>
            {item.icon}
          </div>
        </button>
      ))}
    </nav>
  );
}
