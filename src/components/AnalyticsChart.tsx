import React, { useState, useRef, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { formatMoney } from '../lib/utils';

export default function AnalyticsChart({ chartData, curSym, goal, t, chartType = 'area', chartMetric = 'earnings' }: any) {
  const [zoom, setZoom] = useState(1);
  const touchState = useRef({ distance: 0 });

  // Handle native scroll/wheel to zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      e.stopPropagation();
      setZoom(prev => Math.max(1, Math.min(prev - e.deltaY * 0.01, 5)));
    } else {
      e.stopPropagation();
      setZoom(prev => Math.max(1, Math.min(prev - e.deltaY * 0.005, 5)));
    }
  };

  // Handle pinch to zoom on touch devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchState.current.distance = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const diff = dist - touchState.current.distance;
      if (Math.abs(diff) > 5) {
        setZoom(prev => Math.max(1, Math.min(prev + (diff > 0 ? 0.15 : -0.15), 5)));
        touchState.current.distance = dist;
      }
    }
  };

  return (
    <div className="w-full h-full relative group">
      <AnimatePresence>
        {zoom > 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute -top-10 right-0 z-30"
          >
            <button 
              onClick={() => setZoom(1)} 
              className="text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 bg-[var(--t1)] text-[var(--bg)] rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              Reset Zoom ({Math.round(zoom * 100)}%)
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        className="w-full h-full overflow-x-auto overflow-y-hidden scrollbar-hide relative"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onPointerDownCapture={(e) => e.stopPropagation()}
        style={{ touchAction: 'pan-x pan-y' }}
      >
        <div 
          style={{ 
            width: `${zoom * 100}%`, 
            minWidth: '100%', 
            height: '100%', 
            transition: 'width 0.1s cubic-bezier(0.4, 0, 0.2, 1)' 
          }}
          className="will-change-transform"
        >
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            {chartType === 'area' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--a)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--a)" stopOpacity={0}/>
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 'bold' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 'bold' }} tickFormatter={(val) => chartMetric === 'earnings' ? `${curSym}${val}` : chartMetric === 'velocity' ? `${val}h/d` : `${val}h`} />
                <Tooltip 
                  cursor={{ stroke: 'var(--t3)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  contentStyle={{ backgroundColor: 'var(--bg)', borderColor: 'var(--b)', borderRadius: '1rem', fontSize: '12px', fontWeight: 'bold', color: 'var(--t1)', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: 'var(--a)' }}
                  formatter={(value: number) => chartMetric === 'earnings' ? [`${curSym}${formatMoney(value)}`, t('Earned')] : chartMetric === 'velocity' ? [`${value}h/d`, t('Velocity')] : [`${value}h`, t('Hours')]}
                />
                {chartMetric === 'earnings' && <ReferenceLine y={goal || 0} stroke="var(--a)" strokeDasharray="3 3" opacity={0.5} />}
                <Area 
                  type="monotone" 
                  dataKey={chartMetric}
                  stroke="var(--a)" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorEarnings)" 
                  activeDot={{ r: 6, fill: 'var(--bg)', stroke: 'var(--a)', strokeWidth: 3 }}
                  dot={false}
                  style={{ filter: "url(#glow)" }}
                />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 'bold' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 'bold' }} tickFormatter={(val) => chartMetric === 'earnings' ? `${curSym}${val}` : chartMetric === 'velocity' ? `${val}h/d` : `${val}h`} />
                <Tooltip 
                  cursor={{ fill: 'var(--b)' }}
                  contentStyle={{ backgroundColor: 'var(--bg)', borderColor: 'var(--b)', borderRadius: '1rem', fontSize: '12px', fontWeight: 'bold', color: 'var(--t1)' }}
                  itemStyle={{ color: 'var(--a)' }}
                  formatter={(value: number) => chartMetric === 'earnings' ? [`${curSym}${formatMoney(value)}`, t('Earned')] : chartMetric === 'velocity' ? [`${value}h/d`, t('Velocity')] : [`${value}h`, t('Hours')]}
                />
                {chartMetric === 'earnings' && <ReferenceLine y={goal || 0} stroke="var(--a)" strokeDasharray="3 3" opacity={0.5} />}
                <Bar dataKey={chartMetric} radius={[4, 4, 0, 0]}>
                  {chartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={chartMetric === 'earnings' ? (entry.earnings >= goal ? 'var(--a)' : 'var(--t3)') : 'var(--a)'} opacity={chartMetric === 'earnings' ? (entry.earnings >= goal ? 1 : 0.5) : 0.8} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
