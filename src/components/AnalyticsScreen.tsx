import React, { Suspense, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Sparkles, Plus, Calendar } from 'lucide-react';
import { AppSettings, MONTH_NAMES, MONTH_NAMES_RUS, MONTH_NAMES_GR } from '../constants';
import { Entry } from '../lib/db';
import { CountingNumber } from './CountingNumber';

const AnalyticsChart = React.lazy(() => import('./AnalyticsChart'));

interface AnalyticsScreenProps {
  t: (key: string) => string;
  aiLangOverride: string | null;
  setAiLangOverride: React.Dispatch<React.SetStateAction<string | null>>;
  settings: AppSettings;
  haptic: (pattern?: number | number[]) => void;
  generateAiInsight: () => void;
  isAiLoading: boolean;
  aiInsight: string | null;
  setAiInsight: React.Dispatch<React.SetStateAction<string | null>>;
  goalPct: number;
  entries: Entry[];
  totalHours: number;
  curSym: string;
  chartPeriod: 6 | 12;
  setChartPeriod: React.Dispatch<React.SetStateAction<6 | 12>>;
  chartData: any[];
}

export const AnalyticsScreen = ({
  t, aiLangOverride, setAiLangOverride, settings, haptic, generateAiInsight,
  isAiLoading, aiInsight, setAiInsight, goalPct, entries, totalHours,
  curSym, chartPeriod, setChartPeriod, chartData
}: AnalyticsScreenProps) => {
  const [widgetIdx, setWidgetIdx] = useState(0);
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [chartMetric, setChartMetric] = useState<'earnings' | 'hours' | 'velocity'>('earnings');

  const currentMonthData = chartData && chartData.length > 0 ? chartData[chartData.length - 1] : null;
  const prevMonthData = chartData && chartData.length > 1 ? chartData[chartData.length - 2] : null;
  
  const currentVelocity = currentMonthData ? currentMonthData.velocity : 0;
  const prevVelocity = prevMonthData ? prevMonthData.velocity : 0;
  
  const velocityTrend = prevVelocity > 0 
    ? Math.round(((currentVelocity - prevVelocity) / prevVelocity) * 100) 
    : (currentVelocity > 0 ? 100 : 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight text-[var(--t1)]">{t('Analytics')}</h1>
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95, y: 2 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            onClick={() => {
              haptic(10);
              const langs: ('ENG' | 'RUS' | 'GR')[] = ['ENG', 'RUS', 'GR'];
              const current = aiLangOverride || settings.language;
              const nextLang = langs[(langs.indexOf(current as 'ENG'|'RUS'|'GR') + 1) % langs.length];
              setAiLangOverride(nextLang);
            }}
            className="h-9 px-3 flex items-center justify-center rounded-xl border border-[var(--b)] bg-[var(--bg-1)] text-[var(--t2)] transition-colors text-xs font-black tracking-widest"
          >
            {aiLangOverride || settings.language}
          </motion.button>
          <motion.button 
            whileTap={{ scale: 0.95, y: 2 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            onClick={generateAiInsight} 
            disabled={isAiLoading}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--a)] text-[var(--bg)] disabled:opacity-50"
          >
            {isAiLoading ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {aiInsight && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-6 rounded-card bg-[var(--bg-1)] border border-[var(--b)] text-[var(--t1)] relative overflow-hidden shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-[var(--t3)] flex items-center gap-1.5">
                <Sparkles size={14} className="text-[var(--a)]" />
                {t('AI Insight')}
              </span>
              <button 
                onClick={() => setAiInsight(null)} 
                className="p-1.5 rounded-full hover:bg-[var(--b)] transition-colors opacity-50 hover:opacity-100 -mr-1.5 -mt-1.5 active:scale-95"
                aria-label={t('Close')}
              >
                <Plus size={18} className="rotate-45" />
              </button>
            </div>
            <div className="text-sm font-medium leading-relaxed tracking-tight space-y-3 text-[var(--t2)]">
              {aiInsight.split('\n').filter(line => line.trim().length > 0).map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative w-full -mx-1">
        <motion.div 
          className="flex items-stretch w-full cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.05}
          onDragEnd={(e, { offset, velocity }) => {
            if (offset.x < -30 || velocity.x < -300) {
              haptic(10);
              setWidgetIdx(w => Math.min(3, w + 1));
            } else if (offset.x > 30 || velocity.x > 300) {
              haptic(10);
              setWidgetIdx(w => Math.max(0, w - 1));
            }
          }}
          animate={{ x: `-${widgetIdx * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Slide 0: Goal Widget */}
          <div className="w-full flex-shrink-0 px-1">
            <div className="h-full p-8 rounded-card border border-[var(--b)] bg-[var(--bg-1)] flex flex-col items-center justify-between gap-6 relative overflow-hidden">
              
              <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx={96} cy={96} r={80} fill="none" stroke="var(--b)" strokeWidth={8} />
                  <motion.circle 
                    cx={96} cy={96} r={80} fill="none" stroke="var(--a)" strokeWidth={8} 
                    strokeDasharray={502}
                    initial={{ strokeDashoffset: 502 }}
                    animate={{ strokeDashoffset: 502 - (502 * (goalPct || 0)) / 100 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="text-center space-y-1 relative z-10">
                  <div className="text-4xl font-black text-[var(--t1)]"><CountingNumber value={goalPct} decimals={1} />%</div>
                  <div className="text-micro font-bold text-[var(--t3)]">{t('of Goal')}</div>
                </div>
              </div>
              <div className="grid grid-cols-4 w-full gap-2 pt-6 border-t border-[var(--b)]">
                <div className="text-center space-y-1">
                  <div className="text-lg font-black text-[var(--t1)]">{entries.length}</div>
                  <div className="text-micro font-bold text-[var(--t3)]">{t('Days')}</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-lg font-black text-[var(--t1)]">{totalHours}h</div>
                  <div className="text-micro font-bold text-[var(--t3)]">{t('Hours')}</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-lg font-black text-[var(--t1)]">{curSym}{settings.goal}</div>
                  <div className="text-micro font-bold text-[var(--t3)]">{t('Goal')}</div>
                </div>
                <div className="text-center space-y-1 flex flex-col items-center">
                  <div className="flex gap-[1px] h-[28px] items-center justify-center pt-1">
                    {(() => {
                      const cols = 8;
                      const today = new Date();
                      const grid = [];
                      const eMap = new Map((entries || []).map(e => [e.date, e.hours]));
                      for(let i = cols - 1; i >= 0; i--) {
                        const week = [];
                        for(let j = 0; j < 7; j++) {
                          const d = new Date(today);
                          d.setUTCDate(d.getUTCDate() - (i * 7 + (6 - j)));
                          const ds = d.toISOString().split('T')[0];
                          const hours = eMap.get(ds) || 0;
                          let intensityClass = 'bg-[var(--b)] opacity-30';
                          if(hours > 0 && hours <= 4) intensityClass = 'bg-[var(--a)] opacity-40';
                          else if(hours > 4 && hours <= 8) intensityClass = 'bg-[var(--a)] opacity-70';
                          else if(hours > 8) intensityClass = 'bg-[var(--a)] opacity-100 shadow-[0_0_4px_var(--a)] shadow-[var(--a)]/50';
                          
                          week.push(
                            <div 
                              key={ds}
                              className={`w-[3px] h-[3px] rounded-[1px] ${intensityClass}`}
                            />
                          );
                        }
                        grid.push(<div key={i} className="flex flex-col gap-[1px] justify-center">{week}</div>);
                      }
                      return grid;
                    })()}
                  </div>
                  <div className="text-micro font-bold text-[var(--t3)]">{t('Activity')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Slide 1: Earnings */}
          <div className="w-full flex-shrink-0 px-1">
            <div className="h-full p-8 rounded-card border border-[var(--b)] bg-[var(--bg-1)] flex flex-col gap-6">
              <div className="flex flex-col mb-4 gap-3">
                <span className="text-xs font-black text-[var(--t3)]">{t('Monthly Activity')}</span>
                
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex gap-2">
                    <div className="flex-1 flex p-1 rounded-panel bg-[var(--bg)] border border-[var(--b)]">
                      <button
                        onClick={() => setChartMetric('earnings')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-control transition-all ${
                          chartMetric === 'earnings' 
                            ? 'bg-[var(--bg-1)] text-[var(--t1)] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[var(--b)]' 
                            : 'text-[var(--t3)] hover:text-[var(--t2)] border border-transparent'
                        }`}
                      >
                        {t('Earnings')}
                      </button>
                      <button
                        onClick={() => setChartMetric('hours')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-control transition-all ${
                          chartMetric === 'hours' 
                            ? 'bg-[var(--bg-1)] text-[var(--t1)] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[var(--b)]' 
                            : 'text-[var(--t3)] hover:text-[var(--t2)] border border-transparent'
                        }`}
                      >
                        {t('Hours')}
                      </button>
                      <button
                        onClick={() => setChartMetric('velocity')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-control transition-all ${
                          chartMetric === 'velocity' 
                            ? 'bg-[var(--bg-1)] text-[var(--t1)] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[var(--b)]' 
                            : 'text-[var(--t3)] hover:text-[var(--t2)] border border-transparent'
                        }`}
                        title={t('Avg Hours/Day')}
                      >
                        {t('Velocity')}
                      </button>
                    </div>

                    <div className="flex-1 flex p-1 rounded-panel bg-[var(--bg)] border border-[var(--b)]">
                      <button
                        onClick={() => setChartType('area')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-control transition-all ${
                          chartType === 'area' 
                            ? 'bg-[var(--bg-1)] text-[var(--t1)] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[var(--b)]' 
                            : 'text-[var(--t3)] hover:text-[var(--t2)] border border-transparent'
                        }`}
                      >
                        {t('Area')}
                      </button>
                      <button
                        onClick={() => setChartType('bar')}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-control transition-all ${
                          chartType === 'bar' 
                            ? 'bg-[var(--bg-1)] text-[var(--t1)] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[var(--b)]' 
                            : 'text-[var(--t3)] hover:text-[var(--t2)] border border-transparent'
                        }`}
                      >
                        {t('Bar')}
                      </button>
                    </div>
                  </div>

                  <div className="flex p-1 rounded-panel bg-[var(--bg)] border border-[var(--b)] w-full">
                    {[6, 12].map((p) => (
                      <button
                        key={p}
                        onClick={() => {
                          haptic(10);
                          setChartPeriod(p as 6 | 12);
                        }}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-control transition-all ${
                          chartPeriod === p 
                            ? 'bg-[var(--bg-1)] text-[var(--t1)] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[var(--b)]' 
                            : 'text-[var(--t3)] hover:text-[var(--t2)] border border-transparent'
                        }`}
                      >
                        {p} {t('Months')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full flex items-center min-h-[14rem]">
                <div className="w-full h-56">
                  <Suspense fallback={<div className="w-full h-full flex flex-col items-center justify-center animate-pulse"><div className="w-5 h-5 border-2 border-[var(--a)] border-t-transparent rounded-full animate-spin"></div></div>}>
                    <AnalyticsChart chartData={chartData} curSym={curSym} goal={settings.goal} t={t} chartType={chartType} chartMetric={chartMetric} />
                  </Suspense>
                </div>
              </div>
            </div>
          </div>

          {/* Slide 2: Activity Map (Detailed) */}
          <div className="w-full flex-shrink-0 px-1">
            <div className="h-full p-6 rounded-card border border-[var(--b)] bg-[var(--bg-1)] flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-[var(--t3)]" />
                <span className="text-xs font-black text-[var(--t3)]">{t('Activity Map')}</span>
              </div>
              <div className="flex-1 relative w-full overflow-hidden flex flex-col justify-center">
                <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[var(--bg-1)] to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[var(--bg-1)] to-transparent z-10 pointer-events-none" />
                <div className="w-full overflow-x-auto scrollbar-hide py-2" dir="rtl">
                  <div className="inline-flex gap-1 px-8 w-max" dir="ltr">
                    {(() => {
                      const cols = 16; 
                      const today = new Date();
                      const grid = [];
                      const eMap = new Map((entries || []).map(e => [e.date, e.hours]));
                      
                      for(let i = cols - 1; i >= 0; i--) {
                        const week = [];
                        for(let j = 0; j < 7; j++) {
                          const d = new Date(today);
                          d.setUTCDate(d.getUTCDate() - (i * 7 + (6 - j)));
                          const ds = d.toISOString().split('T')[0];
                          const hours = eMap.get(ds) || 0;
                          let intensityClass = 'bg-[var(--b)] opacity-30';
                          if(hours > 0 && hours <= 4) intensityClass = 'bg-[var(--a)] opacity-40';
                          else if(hours > 4 && hours <= 8) intensityClass = 'bg-[var(--a)] opacity-70';
                          else if(hours > 8) intensityClass = 'bg-[var(--a)] opacity-100 shadow-[0_0_8px_var(--a)] shadow-[var(--a)]/50';
                          
                          week.push(
                            <div 
                              key={ds}
                              className={`w-3.5 h-3.5 rounded-[3px] transition-all hover:scale-125 hover:z-10 ${intensityClass}`}
                              title={`${ds}: ${hours}h`}
                            />
                          );
                        }
                        grid.push(<div key={i} className="flex flex-col gap-1">{week}</div>);
                      }
                      return grid;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slide 3: Work Velocity */}
          <div className="w-full flex-shrink-0 px-1">
            <div className="h-full p-8 rounded-card border border-[var(--b)] bg-[var(--bg-1)] flex flex-col items-center justify-center gap-6 relative overflow-hidden">
              <div className="flex flex-col items-center gap-2 relative z-10">
                <span className="text-xs font-black text-[var(--t3)] uppercase tracking-widest">{t('Work Velocity')}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-6xl font-black tracking-tighter text-[var(--t1)]">{currentVelocity}</span>
                  <span className="text-sm font-bold text-[var(--t3)]">h/d</span>
                </div>
                <span className="text-sm font-bold text-[var(--t2)]">{t('Average hours per active day')}</span>
              </div>
              
              <div className="flex w-full items-center justify-between pt-6 border-t border-[var(--b)] z-10">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--t3)] uppercase">{t('Previous Month')}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-[var(--t2)]">{prevVelocity}</span>
                    <span className="text-xs font-bold text-[var(--t3)]">h/d</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <span className="text-xs font-bold text-[var(--t3)] uppercase">{t('Trend')}</span>
                  <div className={`px-2 py-1 rounded-md text-sm font-black flex items-center gap-1 ${velocityTrend > 0 ? 'bg-[var(--a)] text-[var(--bg)]' : velocityTrend < 0 ? 'bg-[var(--t3)] text-[var(--bg)]' : 'bg-[var(--b)] text-[var(--t2)]'}`}>
                    {velocityTrend > 0 ? '+' : ''}{velocityTrend}%
                  </div>
                </div>
              </div>
              
              {/* Background Decoration */}
              <svg className="absolute -bottom-10 -right-10 w-48 h-48 text-[var(--b)] opacity-20 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>
          </div>
        </motion.div>

        {/* Carousel Indicators */}
        <div className="flex justify-center items-center gap-1.5 mt-4">
          <button 
            onClick={() => { haptic(5); setWidgetIdx(0); }} 
            className={`transition-all duration-300 rounded-full h-1.5 ${widgetIdx === 0 ? 'w-4 bg-[var(--t1)]' : 'w-1.5 bg-[var(--b)]'}`} 
            aria-label={t('Slide 1')}
          />
          <button 
            onClick={() => { haptic(5); setWidgetIdx(1); }} 
            className={`transition-all duration-300 rounded-full h-1.5 ${widgetIdx === 1 ? 'w-4 bg-[var(--t1)]' : 'w-1.5 bg-[var(--b)]'}`} 
            aria-label={t('Slide 2')}
          />
          <button 
            onClick={() => { haptic(5); setWidgetIdx(2); }} 
            className={`transition-all duration-300 rounded-full h-1.5 ${widgetIdx === 2 ? 'w-4 bg-[var(--t1)]' : 'w-1.5 bg-[var(--b)]'}`} 
            aria-label={t('Slide 3')}
          />
          <button 
            onClick={() => { haptic(5); setWidgetIdx(3); }} 
            className={`transition-all duration-300 rounded-full h-1.5 ${widgetIdx === 3 ? 'w-4 bg-[var(--t1)]' : 'w-1.5 bg-[var(--b)]'}`} 
            aria-label={t('Slide 4')}
          />
        </div>
      </div>

    </div>
  );
};
