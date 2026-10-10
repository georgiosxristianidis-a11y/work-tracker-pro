import React, { useState, useRef } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { formatMoney } from '../lib/utils';

export interface ChartDataItem {
  month: string;
  earnings: number;
  hours: number;
  velocity: number;
  [key: string]: string | number;
}

export interface AnalyticsChartProps {
  chartData: ChartDataItem[];
  curSym: string;
  goal?: number;
  t: (key: string) => string;
  chartType?: 'area' | 'bar';
  chartMetric?: 'earnings' | 'hours' | 'velocity';
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; payload: ChartDataItem }>;
  label?: string;
  curSym: string;
  chartMetric: 'earnings' | 'hours' | 'velocity';
  t: (key: string) => string;
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  curSym,
  chartMetric,
  t
}) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0];
  const value = Number(item.value || 0);

  const formattedValue =
    chartMetric === 'earnings'
      ? `${curSym}${formatMoney(value)}`
      : chartMetric === 'velocity'
      ? `${value.toFixed(1)} h/d`
      : `${value} h`;

  const labelMetric =
    chartMetric === 'earnings'
      ? t('Earned')
      : chartMetric === 'velocity'
      ? t('Velocity')
      : t('Hours');

  return (
    <div className="rounded-2xl border border-[var(--b)] bg-[var(--bg-1)]/95 backdrop-blur-md px-3.5 py-2 shadow-xl min-w-[124px] pointer-events-none select-none">
      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--t3)] mb-1">
        {label}
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--a)] shrink-0 shadow-[0_0_6px_var(--a)]" />
          <span className="text-xs text-[var(--t2)] font-semibold">{labelMetric}:</span>
        </div>
        <span className="text-sm font-black tabular-nums text-[var(--t1)]">
          {formattedValue}
        </span>
      </div>
    </div>
  );
};

export default function AnalyticsChart({
  chartData,
  curSym,
  goal,
  t,
  chartType = 'area',
  chartMetric = 'earnings'
}: AnalyticsChartProps) {
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
              className="text-micro font-bold uppercase tracking-widest px-3 py-1.5 bg-[var(--t1)] text-[var(--bg)] rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
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
              <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--a)" stopOpacity={0.35} />
                    <stop offset="60%" stopColor="var(--a)" stopOpacity={0.08} />
                    <stop offset="100%" stopColor="var(--a)" stopOpacity={0} />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--b)" opacity={0.4} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 600 }}
                  tickFormatter={(val) =>
                    chartMetric === 'earnings'
                      ? `${curSym}${val}`
                      : chartMetric === 'velocity'
                      ? `${val}h/d`
                      : `${val}h`
                  }
                />
                <Tooltip
                  cursor={{ stroke: 'var(--a)', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.6 }}
                  content={<CustomChartTooltip curSym={curSym} chartMetric={chartMetric} t={t} />}
                  isAnimationActive={false}
                />
                {chartMetric === 'earnings' && (
                  <ReferenceLine
                    y={goal || 0}
                    stroke="var(--a)"
                    strokeDasharray="4 4"
                    opacity={0.4}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey={chartMetric}
                  stroke="var(--a)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorEarnings)"
                  activeDot={{
                    r: 5,
                    fill: 'var(--bg)',
                    stroke: 'var(--a)',
                    strokeWidth: 2.5
                  }}
                  dot={false}
                  style={{ filter: 'url(#glow)' }}
                />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--b)" opacity={0.4} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: 'var(--t3)', fontWeight: 600 }}
                  tickFormatter={(val) =>
                    chartMetric === 'earnings'
                      ? `${curSym}${val}`
                      : chartMetric === 'velocity'
                      ? `${val}h/d`
                      : `${val}h`
                  }
                />
                <Tooltip
                  cursor={{ fill: 'var(--b)', opacity: 0.3 }}
                  content={<CustomChartTooltip curSym={curSym} chartMetric={chartMetric} t={t} />}
                  isAnimationActive={false}
                />
                {chartMetric === 'earnings' && (
                  <ReferenceLine
                    y={goal || 0}
                    stroke="var(--a)"
                    strokeDasharray="4 4"
                    opacity={0.4}
                  />
                )}
                <Bar dataKey={chartMetric} radius={[6, 6, 0, 0]}>
                  {chartData.map((entry: ChartDataItem, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        chartMetric === 'earnings'
                          ? entry.earnings >= (goal || 0)
                            ? 'var(--a)'
                            : 'var(--b)'
                          : 'var(--a)'
                      }
                      opacity={
                        chartMetric === 'earnings'
                          ? entry.earnings >= (goal || 0)
                            ? 1
                            : 0.6
                          : 0.85
                      }
                    />
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
