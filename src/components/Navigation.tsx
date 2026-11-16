import React from 'react';
import { motion } from 'motion/react';
import { useAppStore, AppScreen } from '../store/useAppStore';

interface NavigationProps {
  t: (key: string) => string;
}

export function Navigation({ t }: NavigationProps) {
  const screen = useAppStore(s => s.screen);
  const setScreen = useAppStore(s => s.setScreen);
  const [navClicks, setNavClicks] = React.useState({ home: 0, calendar: 0, chart: 0, total: 0, settings: 0 });
  const [pulse, setPulse] = React.useState<{ id: string; seq: number } | null>(null);
  const prevScreenRef = React.useRef<AppScreen>(screen);

  React.useEffect(() => {
    if (prevScreenRef.current !== screen) {
      prevScreenRef.current = screen;
      if (screen === 'home' || screen === 'calendar' || screen === 'chart' || screen === 'settings') {
        setPulse({ id: screen, seq: Date.now() + Math.random() });
      }
    }
  }, [screen]);

  const items = [
    {
      id: 'home' as const,
      label: t('Home'),
      icon: (
        <motion.svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
          <motion.path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" initial={false} animate={{ y: navClicks.home % 2 !== 0 ? -1.5 : 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} />
          <motion.rect width={18} height={14} x={3} y={6} rx={3} initial={false} animate={{ scaleY: navClicks.home % 2 !== 0 ? 0.92 : 1, y: navClicks.home % 2 !== 0 ? 1 : 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} />
        </motion.svg>
      ),
    },
    {
      id: 'calendar' as const,
      label: t('Calendar'),
      icon: (
        <motion.svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
          <rect width={18} height={18} x={3} y={4} rx={3} />
          <motion.path d="M16 2v4" initial={false} animate={{ y: navClicks.calendar % 2 !== 0 ? -1.5 : 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} />
          <motion.path d="M8 2v4" initial={false} animate={{ y: navClicks.calendar % 2 !== 0 ? -1.5 : 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} />
          <path d="M3 10h18" />
          <motion.circle cx={7} cy={14} r={1.4} fill="currentColor" stroke="none" initial={false} animate={{ cx: 7 + (navClicks.calendar % 3) * 5, cy: 14 + Math.floor((navClicks.calendar % 6) / 3) * 4 }} transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }} />
        </motion.svg>
      ),
    },
    {
      id: 'chart' as const,
      label: t('Chart'),
      icon: (
        <motion.svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
          <motion.line x1={6} y1={20} x2={6} y2={14} initial={false} animate={{ y2: navClicks.chart % 2 !== 0 ? 8 : 14 }} transition={{ duration: 0.48, ease: [0.16, 1, 0.3, 1] }} />
          <motion.line x1={12} y1={20} x2={12} y2={6} initial={false} animate={{ y2: navClicks.chart % 2 !== 0 ? 14 : 6 }} transition={{ duration: 0.48, delay: 0.04, ease: [0.16, 1, 0.3, 1] }} />
          <motion.line x1={18} y1={20} x2={18} y2={12} initial={false} animate={{ y2: navClicks.chart % 2 !== 0 ? 6 : 12 }} transition={{ duration: 0.48, delay: 0.08, ease: [0.16, 1, 0.3, 1] }} />
        </motion.svg>
      ),
    },
    {
      id: 'settings' as const,
      label: t('Settings'),
      icon: (
        <motion.svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" initial={false} animate={{ rotate: navClicks.settings * 90 }} transition={{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }}>
          <circle cx={12} cy={12} r={3} />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </motion.svg>
      ),
    },
  ];

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-[calc(88px+env(safe-area-inset-bottom))] bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/75 to-transparent z-[45] sm:rounded-b-[41px]"
      />
      <nav className="absolute bottom-[calc(14px+env(safe-area-inset-bottom))] left-4 right-4 h-[52px] apple-glass-dock !border-0 rounded-full flex items-center px-2 z-[50] overflow-hidden">
        {items.map(item => {
          const isActive = screen === item.id;
          const isPulsing = pulse?.id === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              title={item.label}
              onClick={() => {
                prevScreenRef.current = item.id;
                setScreen(item.id as AppScreen);
                setNavClicks(c => ({ ...c, [item.id]: (c[item.id as keyof typeof c] ?? 0) + 1 }));
                setPulse({ id: item.id, seq: Date.now() + Math.random() });
              }}
              className="flex-1 h-full flex items-center justify-center relative select-none min-w-0 rounded-full transition-transform active:scale-95"
            >
              {isActive && (
                <span
                  key={isPulsing && pulse ? `pulse-${pulse.seq}` : `active-${item.id}`}
                  className={`wt-nav-topline ${isPulsing && pulse ? 'is-pulsing' : 'is-active'}`}
                  aria-hidden="true"
                />
              )}
              <div
                className={`relative z-10 transition-all duration-300 ${
                  isActive
                    ? 'text-[var(--t1)] scale-[1.08]'
                    : 'text-[var(--t3)] opacity-60 hover:opacity-90 hover:text-[var(--t2)]'
                }`}
              >
                {item.icon}
              </div>
            </button>
          );
        })}
      </nav>
    </>
  );
}
