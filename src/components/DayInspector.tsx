import React from 'react';
import { motion } from 'motion/react';
import { Plus, Minus, Pencil, Trash2, Zap, Settings2, Check } from 'lucide-react';
import { AppSettings, DOW_NAMES } from '../constants';
import { formatMoney } from '../lib/utils';

export interface DayInspectorProps {
  selectedDate: string; // YYYY-MM-DD
  entry?: { hours: number } | null;
  settings: AppSettings;
  curSym: string;
  calcEarnings: (hours: number) => number;
  onSaveHours: (date: string, hours: number) => void;
  onDelete: (date: string) => void;
  onOpenEditor: (date: string, hours: number) => void;
  onOpenQuickFill: () => void;
  onSmartFill?: () => void;
  defaultHours: number;
  haptic: (pattern?: number | number[]) => void;
  t: (key: string) => string;
  canSmartFill?: boolean;
  smartFillDay?: number;
  emptyDaysCount?: number;
}

export const DayInspector = React.memo(({
  selectedDate,
  entry,
  settings,
  curSym,
  calcEarnings,
  onSaveHours,
  onDelete,
  onOpenEditor,
  onOpenQuickFill,
  onSmartFill,
  defaultHours,
  haptic,
  t,
  canSmartFill,
  smartFillDay,
  emptyDaysCount
}: DayInspectorProps) => {
  const [yStr, mStr, dStr] = selectedDate.split('-');
  const dateObj = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
  const dowIdx = dateObj.getDay();
  const mappedDow = dowIdx === 0 ? 6 : dowIdx - 1;
  const dowName = DOW_NAMES[mappedDow] || '';

  const hours = entry ? entry.hours : 0;
  const hasHours = hours > 0;
  const isOvertime = hours > settings.normal;

  return (
    <div className="space-y-3">
      {/* Active Day Card */}
      <motion.div
        key={selectedDate}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="p-3.5 rounded-panel border border-[var(--b)] bg-[var(--bg-1)] shadow-sm"
      >
        <div className="flex items-center justify-between gap-3">
          {/* Date Badge */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-11 h-11 rounded-control flex flex-col items-center justify-center shrink-0 transition-colors ${
              hasHours ? 'bg-[var(--a)] text-[var(--bg)] font-black' : 'bg-[var(--b)] text-[var(--t2)]'
            }`}>
              <span className="text-sm leading-none font-bold">{dStr}</span>
              <span className="text-micro uppercase tracking-wider font-semibold opacity-80 mt-0.5">{dowName}</span>
            </div>

            <div className="min-w-0">
              <div className="text-xs font-semibold text-[var(--t3)] truncate">
                {selectedDate}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {hasHours ? (
                  <>
                    <span className="text-base font-black text-[var(--t1)] leading-none tabular-nums">
                      {hours}h
                    </span>
                    {isOvertime && (
                      <span className="text-micro font-bold bg-[var(--green-bg)] text-[var(--green)] px-1.5 py-0.5 rounded leading-none shrink-0">
                        +{hours - settings.normal}h OT
                      </span>
                    )}
                    <span className={`text-xs font-bold text-[var(--t2)] leading-none tabular-nums ${settings.privacyMode ? 'blur-sm' : ''}`}>
                      {curSym}{formatMoney(calcEarnings(hours))}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-medium text-[var(--t3)]">
                    {t('No hours logged')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Inline Action Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {hasHours ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    haptic(10);
                    const next = Math.max(0, hours - 0.5);
                    if (next === 0) {
                      onDelete(selectedDate);
                    } else {
                      onSaveHours(selectedDate, next);
                    }
                  }}
                  className="w-9 h-9 rounded-control border border-[var(--b)] bg-[var(--bg)] text-[var(--t1)] flex items-center justify-center hover:bg-[var(--b)] active:scale-95 transition-all"
                  aria-label={t('Decrease hours')}
                >
                  <Minus size={16} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptic(10);
                    onSaveHours(selectedDate, Math.min(24, hours + 0.5));
                  }}
                  className="w-9 h-9 rounded-control border border-[var(--b)] bg-[var(--bg)] text-[var(--t1)] flex items-center justify-center hover:bg-[var(--b)] active:scale-95 transition-all"
                  aria-label={t('Increase hours')}
                >
                  <Plus size={16} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptic(15);
                    onOpenEditor(selectedDate, hours);
                  }}
                  className="w-9 h-9 rounded-control border border-[var(--b)] bg-[var(--bg)] text-[var(--t2)] hover:text-[var(--t1)] flex items-center justify-center hover:bg-[var(--b)] active:scale-95 transition-all"
                  aria-label={t('Edit Details')}
                >
                  <Pencil size={15} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptic([20, 40]);
                    onDelete(selectedDate);
                  }}
                  className="w-9 h-9 rounded-control border border-[var(--b)] bg-[var(--bg)] text-[var(--danger)] hover:bg-[var(--danger-bg)] flex items-center justify-center active:scale-95 transition-all"
                  aria-label={t('Delete entry')}
                >
                  <Trash2 size={15} strokeWidth={2} />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    haptic(15);
                    onSaveHours(selectedDate, defaultHours || 8);
                  }}
                  className="h-9 px-3 rounded-control bg-[var(--t1)] text-[var(--bg)] text-xs font-bold active:scale-95 transition-all shadow-sm flex items-center gap-1"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  +{defaultHours || 8}h
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptic(10);
                    onSaveHours(selectedDate, (defaultHours || 8) / 2);
                  }}
                  className="h-9 px-2.5 rounded-control border border-[var(--b)] bg-[var(--bg)] text-[var(--t2)] text-xs font-semibold hover:text-[var(--t1)] active:scale-95 transition-all"
                >
                  +4h
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptic(10);
                    onOpenEditor(selectedDate, defaultHours || 8);
                  }}
                  className="w-9 h-9 rounded-control border border-[var(--b)] bg-[var(--bg)] text-[var(--t3)] hover:text-[var(--t1)] flex items-center justify-center active:scale-95 transition-all"
                  aria-label={t('Custom hours')}
                >
                  <Pencil size={14} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Smart Actions & Utility Toolbar */}
      <div className="flex items-center gap-2">
        {canSmartFill && onSmartFill && (
          emptyDaysCount === 0 ? (
            <div className="flex-1 h-11 px-3.5 rounded-control border border-[var(--b)] bg-[var(--bg-1)] text-[var(--t3)] text-xs font-semibold flex items-center justify-center gap-2 select-none opacity-80">
              <Check size={14} className="text-[var(--green)] shrink-0" strokeWidth={2.5} />
              <span className="truncate">1–{smartFillDay ?? dStr} {t('complete')}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                haptic([15, 20]);
                onSmartFill();
              }}
              className="flex-1 h-11 px-3.5 rounded-control border border-[var(--a-b)] bg-[var(--a-bg)] text-[var(--a)] text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all"
            >
              <Zap size={14} className="shrink-0" strokeWidth={2.2} />
              <span className="truncate">
                Smart Fill ({emptyDaysCount ?? smartFillDay ?? dStr} {emptyDaysCount === 1 ? t('day') : t('days')})
              </span>
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => {
            haptic(10);
            onOpenQuickFill();
          }}
          className={`h-11 px-3.5 rounded-control border border-[var(--b)] bg-[var(--bg-1)] text-[var(--t2)] hover:text-[var(--t1)] text-xs font-semibold flex items-center justify-center gap-2 hover:bg-[var(--b)] active:scale-[0.98] transition-all ${
            canSmartFill ? 'shrink-0' : 'flex-1'
          }`}
        >
          <Settings2 size={15} strokeWidth={2} />
          <span>{t('Quick Fill')}</span>
        </button>
      </div>
    </div>
  );
});
