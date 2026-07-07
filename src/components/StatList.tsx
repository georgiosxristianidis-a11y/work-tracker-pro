import React from 'react';
import { motion } from 'motion/react';

export interface StatItem {
  label: string;
  val: string | number;
  unit: string;
  icon: React.ReactNode;
  isPrefix?: boolean;
}

export const StatList = ({ stats, title }: { stats: StatItem[], title?: string }) => {
  return (
    <div className="space-y-3 px-1 mt-6">
      {title && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-widest text-[var(--t3)]">{title}</span>
        </div>
      )}
      
      <div className="w-full mt-2">
        <div className="rounded-card border border-[var(--b)] bg-[var(--bg-1)] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] flex flex-col p-2">
          {stats.map((stat, i) => (
            <div key={i} className="flex items-center justify-between py-3.5 px-4 rounded-[1.5rem] hover:bg-[var(--b)] transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-[12px] bg-[var(--bg)] border border-[var(--b)] flex items-center justify-center text-[var(--t2)] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                  {stat.icon}
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest text-[var(--t2)]">{stat.label}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                {stat.isPrefix && <span className="text-sm font-bold text-[var(--t3)]">{stat.unit}</span>}
                <motion.span
                  key={stat.val}
                  initial={{ scale: 1.15 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="text-xl font-black text-[var(--t1)] inline-block origin-right"
                >
                  {stat.val}
                </motion.span>
                {!stat.isPrefix && <span className="text-xs font-bold text-[var(--t3)] uppercase tracking-widest">{stat.unit}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
