import React from 'react';
import { Calendar, ChevronDown, Settings } from 'lucide-react';
import { useFinancialDashboardStore } from '../../store/useFinancialDashboardStore';

export function BenefitsAreaChartCard() {
  const { benefitsData, selectedPeriod, setSelectedPeriod } = useFinancialDashboardStore();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  // Math for smooth Catmull-Rom to Cubic Bezier conversion
  const svgWidth = 420;
  const svgHeight = 150;
  const paddingLeft = 32;
  const paddingRight = 16;
  const paddingTop = 16;
  const paddingBottom = 26;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const maxY = 8;
  const minY = 0;

  const points = React.useMemo(() => {
    return benefitsData.map((d, index) => {
      const x = paddingLeft + (index / (benefitsData.length - 1)) * chartWidth;
      const normalizedY = (d.value - minY) / (maxY - minY);
      const y = paddingTop + (1 - normalizedY) * chartHeight;
      return { x, y, month: d.month, val: d.value };
    });
  }, [benefitsData, chartWidth, chartHeight]);

  // Generate smooth cubic Bezier path
  const { linePath, areaPath } = React.useMemo(() => {
    if (points.length === 0) return { linePath: '', areaPath: '' };

    let line = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? i : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      // Catmull-Rom to Bezier control points
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      line += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }

    const baselineY = paddingTop + chartHeight;
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    const area = `${line} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`;

    return { linePath: line, areaPath: area };
  }, [points, chartHeight]);

  const periods = ['June - December', 'January - May', 'Full Year (1Y)'];

  return (
    <div className="flex flex-col w-full p-5 bg-white/90 rounded-2xl shadow-[6px_6px_16px_rgba(180,195,215,0.35),_-6px_-6px_16px_rgba(255,255,255,0.95)] backdrop-blur-sm">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold tracking-tight text-slate-800">
          Benefits
        </h3>

        <div className="flex items-center gap-2">
          {/* Date Range Dropdown Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 
                text-slate-700 text-xs font-semibold transition-colors duration-150"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{selectedPeriod}</span>
              <ChevronDown className="w-3 h-3 text-slate-500 ml-0.5" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 z-20 w-44 mt-1 bg-white rounded-xl shadow-lg border border-slate-100 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {periods.map(period => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => {
                      setSelectedPeriod(period);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-slate-50 transition-colors ${
                      period === selectedPeriod ? 'text-indigo-600 font-semibold bg-indigo-50/50' : 'text-slate-700'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Settings Icon */}
          <button
            type="button"
            aria-label="Benefits Settings"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SVG Chart with Smooth Spectral Gradient */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Spectral Horizontal Gradient for Stroke and Fill */}
            <linearGradient id="benefitsSpectral" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38BDF8" />     {/* Cyan */}
              <stop offset="50%" stopColor="#EC4899" />    {/* Magenta/Pink */}
              <stop offset="100%" stopColor="#FBBF24" />   {/* Amber/Yellow */}
            </linearGradient>

            {/* Vertical Fade Mask */}
            <linearGradient id="benefitsFadeMask" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0.75" />
              <stop offset="100%" stopColor="white" stopOpacity="0.05" />
            </linearGradient>

            <mask id="benefitsMask">
              <rect
                x="0"
                y="0"
                width={svgWidth}
                height={svgHeight}
                fill="url(#benefitsFadeMask)"
              />
            </mask>
          </defs>

          {/* Left Y-Axis Grid & Labels (8, 6, 4, 2, 0) */}
          {[8, 6, 4, 2, 0].map(val => {
            const normalizedY = (val - minY) / (maxY - minY);
            const y = paddingTop + (1 - normalizedY) * chartHeight;

            return (
              <g key={val} className="text-[10px] fill-slate-300 font-medium">
                <text x="14" y={y + 3.5} textAnchor="end">
                  {val}
                </text>
                {/* Subtle horizontal grid guide */}
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeWidth="1"
                  strokeDasharray={val === 0 ? undefined : '2,2'}
                />
              </g>
            );
          })}

          {/* Fill Area with Gradient */}
          <path
            d={areaPath}
            fill="url(#benefitsSpectral)"
            mask="url(#benefitsMask)"
            className="transition-all duration-500"
          />

          {/* Top Line Stroke */}
          <path
            d={linePath}
            fill="none"
            stroke="url(#benefitsSpectral)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-500 drop-shadow-[0_2px_4px_rgba(236,72,153,0.3)]"
          />

          {/* Bottom X-Axis Month Labels */}
          {points.map(pt => (
            <text
              key={pt.month}
              x={pt.x}
              y={svgHeight - 6}
              textAnchor="middle"
              className="text-[9.5px] font-semibold fill-slate-400"
            >
              {pt.month}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
