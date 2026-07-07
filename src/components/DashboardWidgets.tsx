import React, { useState, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Clock, ArrowDownUp } from 'lucide-react';
import { AppSettings, DOW_NAMES } from '../constants';
import { formatMoney } from '../lib/utils';
import { Entry } from '../lib/db';
import { AnimatedTrash } from './AnimatedTrash';
import { CountingNumber } from './CountingNumber';

const EntryItem = memo(({ e, calcEarnings, settings, curSym, deleteEntry, haptic, t }: any) => (
  <motion.div 
    layout
    variants={{
      hidden: { opacity: 0, x: 10, scale: 0.95 },
      visible: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    }}
    initial="hidden"
    animate="visible"
    exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0, paddingBottom: 0, paddingTop: 0, overflow: 'hidden', transition: { opacity: { duration: 0.2 }, height: { duration: 0.3 } } }}
    className="relative w-full overflow-hidden rounded-[1rem] bg-[var(--a-bg)] shrink-0"
    style={{ willChange: "transform, opacity, height" }}
  >
    <div className="absolute top-0 right-0 h-full w-[80px] flex items-center justify-end pr-5">
      <motion.button 
        whileHover="hover"
        onClick={() => { if (haptic) haptic(10); if (deleteEntry) deleteEntry(e.date); }} 
        className="text-[var(--danger)] active:scale-90 transition-transform group"
        aria-label={t('Delete entry')}
      >
        <AnimatedTrash size={20} className="group-hover:scale-110 transition-transform group-active:text-[var(--danger)]" />
      </motion.button>
    </div>
    <motion.div 
      drag="x"
      dragConstraints={{ left: -80, right: 0 }}
      dragElastic={0.4}
      whileDrag={{ scale: 0.98 }}
      className="relative z-10 bg-[var(--bg-1)] flex items-center gap-4 p-3 rounded-[1rem] border border-[var(--b)] cursor-grab active:cursor-grabbing"
      style={{ willChange: "transform" }}
    >
      <div className="w-10 h-10 rounded-[12px] bg-[var(--a)] flex flex-col items-center justify-center text-[var(--bg)] transition-transform shrink-0 gap-0.5">
        <span className="text-sm font-black leading-none">{e.date.split('-')[2]}</span>
        <span className="text-micro font-bold uppercase opacity-80 tracking-widest">{DOW_NAMES[new Date(e.date).getDay() === 0 ? 6 : new Date(e.date).getDay() - 1]}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-[var(--t1)] flex items-center gap-2 truncate">
          {e.hours}h 
          {e.hours > settings.normal && (
            <span className="text-micro bg-[var(--green-bg)] text-[var(--green)] px-1.5 py-0.5 rounded uppercase shrink-0">
              +{e.hours - settings.normal}h OT
            </span>
          )}
        </div>
        <div className="text-xs text-[var(--t3)] font-medium truncate">{e.date}</div>
      </div>
      <div className={`text-sm font-black text-[var(--t1)] shrink-0 ${settings.privacyMode ? 'blur-md' : ''}`}>{curSym}{formatMoney(calcEarnings(e.hours))}</div>
    </motion.div>
  </motion.div>
));

const EmptyStateBtn = memo(({ setScreen, t, haptic }: any) => {
  const [clicks, setClicks] = useState(0);
  const lastTapRef = useRef(0);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative py-8 text-center"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg)] to-transparent opacity-50 rounded-[1.5rem]" />
      <div className="relative z-10 space-y-3 flex flex-col items-center">
        <motion.button 
          onClick={() => {
            const now = Date.now();
            if (now - lastTapRef.current < 300) {
              if (haptic) haptic([10, 30, 10]);
              setScreen('calendar');
            } else {
              if (haptic) haptic(10);
              setClicks(c => c + 1);
            }
            lastTapRef.current = now;
          }}
          className="group w-12 h-12 rounded-[16px] bg-[var(--a-bg)] border border-[var(--a)]/20 shadow-[0_0_20px_var(--a)] shadow-[var(--a)]/10 flex items-center justify-center text-[var(--a)] cursor-pointer outline-none"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
        >
          <motion.svg 
            width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            className="transition-transform duration-500 group-hover:scale-[1.05]"
          >
            <circle cx="12" cy="12" r="10" />
            <motion.polyline 
              points="12 6 12 12"
              animate={{ rotate: clicks * 360 }}
              style={{ originX: "12px", originY: "12px" }}
              transition={{ duration: 1.0, ease: [0.1, 1, 0.2, 1] }}
            />
            <motion.line 
              x1="12" y1="12" x2="16" y2="14"
              animate={clicks > 0 ? { rotate: [0, 45, -15, 0] } : { rotate: 0 }}
              style={{ originX: "12px", originY: "12px" }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </motion.svg>
        </motion.button>
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-[var(--t1)]">{t('Time is Money')}</p>
          <p className="text-xs font-medium text-[var(--t3)] uppercase tracking-wider">
            {clicks === 0 ? t('Tap to wind the clock') : t('Tap again to add your first mode')}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

export function DashboardWidgets({
  totalEarned,
  goalPct,
  entries,
  settings,
  setSettings,
  setScreen,
  calcEarnings,
  curSym,
  t,
  deleteEntry,
  haptic
}: any) {
  const [widgetIdx, setWidgetIdx] = useState(0);

  return (
    <div className="relative w-[calc(100%+3rem)] -mx-6 px-6 overflow-x-clip overflow-y-visible py-8 -my-8">
      <motion.div 
        className="flex items-stretch w-full gap-6 cursor-grab active:cursor-grabbing pb-2"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.05}
        onDragEnd={(e, { offset, velocity }) => {
          if (offset.x < -30 || velocity.x < -300) {
            setWidgetIdx(1);
          } else if (offset.x > 30 || velocity.x > 300) {
            setWidgetIdx(0);
          }
        }}
        animate={{ x: `calc(-${widgetIdx * 100}% - ${widgetIdx * 1}rem)` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{ willChange: "transform" }}
      >
        {/* Slide 0: Monthly Earnings */}
        <div className="w-full shrink-0">
          <div className="relative h-full">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              className="relative h-full px-8 py-6 rounded-card border border-[var(--b)] bg-[var(--bg-1)] shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden group transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex flex-col justify-center"
            >
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--t3)]">{t('Monthly Earnings')}</span>
                  <button 
                    onClick={() => { haptic(10); setSettings((s: any) => ({ ...s, privacyMode: !s.privacyMode })); }} 
                    className="flex items-center justify-center w-11 h-11 shrink-0 rounded-full border border-[var(--b)] bg-[var(--bg-1)] text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[var(--b)] transition-all duration-300 active:scale-95 outline-none shadow-sm"
                    aria-label={settings.privacyMode ? t('Show Earnings') : t('Hide Earnings')}
                  >
                    {settings.privacyMode ? <EyeOff size={20} strokeWidth={2} /> : <Eye size={20} strokeWidth={2} />}
                  </button>
                </div>
                <div className={`flex items-baseline justify-center gap-2.5 py-4 text-[var(--t1)] transition-all duration-500 ${settings.privacyMode ? 'blur-xl opacity-20' : ''}`}>
                  <span className="text-xl text-[var(--t3)] font-light">{curSym}</span>
                  <span className="text-4xl font-light"><CountingNumber value={totalEarned} decimals={2} /></span>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-[var(--t3)]">{t('Goal:')} {curSym}{settings.goal}</span>
                      <span className="text-[var(--a)]">{goalPct}%</span>
                    </div>
                    <div className="h-1.5 bg-[var(--b)] rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${goalPct}%` }}
                        className="h-full bg-[var(--a)]"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-[var(--b)]/50 flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--t3)]">{t('All-Time Stats')}</span>
                    <motion.button 
                      onClick={() => setScreen('total')} 
                      className="group flex items-center gap-2 p-1.5 -m-1.5 active:scale-95 transition-all outline-none"
                      aria-label={t('Total')}
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest text-[var(--t3)] group-hover:text-[var(--t1)] transition-colors duration-300">{t('Total')}</span>
                      <div className="w-6 h-6 rounded-full border border-[var(--b)] flex items-center justify-center bg-[var(--bg)] group-hover:border-[var(--t1)] group-hover:bg-[var(--t1)] group-hover:text-[var(--bg)] text-[var(--t2)] transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.04)] group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
                        <ChevronRight size={12} strokeWidth={2.5} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                      </div>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Slide 1: Recent Entries */}
        <div className="w-full shrink-0 flex flex-col justify-center">
          <div className="relative h-full rounded-card border border-[var(--b)] bg-[var(--bg-1)] p-5 pl-7 flex flex-col">
            {widgetIdx === 1 && (
              <div className="absolute top-1/2 -translate-y-1/2 left-2 pointer-events-none z-20">
                <motion.div 
                  animate={{ x: [0, -3, 0] }} 
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }} 
                  className="w-6 h-6 rounded-full bg-[var(--bg)] shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-[var(--b)] flex items-center justify-center text-[var(--t2)]"
                >
                  <ChevronLeft size={14} strokeWidth={2.5} className="mr-0.5" />
                </motion.div>
              </div>
            )}

            <div className="flex items-center justify-between px-1 mb-4 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--t3)]">{t('Recent Entries')}</span>
                <button 
                  onClick={() => setSettings((s: any) => ({ ...s, sortOldestFirst: !s.sortOldestFirst }))}
                  className={`p-2 -m-2 text-[var(--t3)] hover:text-[var(--t1)] transition-colors active:scale-95 ${settings.sortOldestFirst ? 'text-[var(--a)]' : ''}`}
                  aria-label={settings.sortOldestFirst ? t('Sort Oldest First') : t('Sort Newest First')}
                >
                  <ArrowDownUp size={14} strokeWidth={2} />
                </button>
              </div>
              <button onClick={() => setScreen('calendar')} className="p-2 -m-2 text-xs font-bold text-[var(--a)] active:scale-95 transition-transform">{t('View All')}</button>
            </div>
            <motion.div 
              className="space-y-2 flex-1 flex flex-col justify-center overflow-x-hidden"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
              }}
            >
              <AnimatePresence>
                {[...entries]
                  .sort((a: any, b: any) => settings.sortOldestFirst ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date))
                  .slice(0, 3)
                  .map((e: any) => (
                  <EntryItem 
                    key={e.date} 
                    e={e} 
                    calcEarnings={calcEarnings} 
                    settings={settings} 
                    curSym={curSym} 
                    deleteEntry={deleteEntry}
                    haptic={haptic}
                    t={t}
                  />
                ))}
              </AnimatePresence>
              {entries.length === 0 && (
                <EmptyStateBtn setScreen={setScreen} t={t} haptic={haptic} />
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Indicators */}
      <div className="flex justify-center flex-wrap items-center gap-1.5 mt-2">
        {[0, 1].map(w => (
          <button 
            key={w}
            onClick={() => setWidgetIdx(w)} 
            className={`transition-all duration-300 rounded-full h-1.5 ${widgetIdx === w ? 'w-4 bg-[var(--t1)]' : 'w-1.5 bg-[var(--b)]'}`} 
            aria-label={t('Slide') + ' ' + (w + 1)}
          />
        ))}
      </div>
    </div>
  );
}
