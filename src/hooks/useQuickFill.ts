import { useState, useMemo } from 'react';
import { db, Entry } from '../lib/db';
import { useAppStore } from '../store/useAppStore';

export interface SmartFillPreview {
  targetDay: number;
  datesToFill: string[];
  emptyCount: number;
  totalHours: number;
  hoursPerDay: number;
  isCurrentMonth: boolean;
  canSmartFill: boolean;
  dateRangeLabel: string;
}

export interface UseQuickFillProps {
  viewDate: Date;
  entries?: Entry[];
  excludeSundays: boolean;
  loadEntries: () => Promise<void>;
  addToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', action?: { label: string; onClick: () => void }) => void;
  undoLabel?: string;
  onSync?: () => void;
}

interface ComputeCandidateOptions {
  viewDate: Date;
  entries?: Entry[];
  selectedTemplate: string;
  customFill: { work: number; off: number; hours: number };
  excludeSundays: boolean;
  targetDay?: number;
  customHours?: number;
}

export function computeSmartFillCandidates({
  viewDate,
  entries = [],
  selectedTemplate,
  customFill,
  excludeSundays,
  targetDay,
  customHours
}: ComputeCandidateOptions): SmartFillPreview {
  const now = new Date();
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
  const isFutureMonth = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const target = targetDay ?? (isCurrentMonth ? now.getDate() : daysInMonth);
  const finalDay = Math.min(Math.max(1, target), daysInMonth);
  const canSmartFill = !isFutureMonth && finalDay >= 1;

  let hours = customHours ?? 8;
  let workDays = 5;
  let offDays = 2;

  if (customHours === undefined) {
    if (selectedTemplate === 'custom') {
      hours = customFill.hours || 8;
      workDays = customFill.work || 5;
      offDays = customFill.off || 2;
    } else {
      const parts = selectedTemplate.split('-');
      if (parts.length === 2) {
        hours = parseInt(parts[1], 10) || 8;
        const [w, o] = parts[0].split('/');
        workDays = parseInt(w, 10) || 5;
        offDays = parseInt(o, 10) || 2;
      }
    }
  }

  const cycleLength = workDays + offDays;
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const existingSet = new Set(
    entries
      .filter(e => e.hours > 0 && e.date.startsWith(monthPrefix))
      .map(e => e.date)
  );

  const datesToFill: string[] = [];
  let workDayCounter = 0;

  for (let i = 1; i <= finalDay; i++) {
    const dateStr = `${monthPrefix}-${String(i).padStart(2, '0')}`;
    const dow = new Date(year, month, i).getDay(); // 0: Sunday, 6: Saturday

    let isWorkDay = false;
    if (cycleLength === 7 && (workDays === 5 || workDays === 6)) {
      if (workDays === 5) {
        isWorkDay = dow >= 1 && dow <= 5;
      } else if (workDays === 6) {
        isWorkDay = dow >= 1 && dow <= 6;
      }
    } else {
      isWorkDay = (workDayCounter % cycleLength) < workDays;
      workDayCounter++;
    }

    if (excludeSundays && dow === 0) {
      isWorkDay = false;
    }

    if (isWorkDay && !existingSet.has(dateStr)) {
      datesToFill.push(dateStr);
    }
  }

  return {
    targetDay: finalDay,
    datesToFill,
    emptyCount: datesToFill.length,
    totalHours: datesToFill.length * hours,
    hoursPerDay: hours,
    isCurrentMonth,
    canSmartFill,
    dateRangeLabel: finalDay === 1 ? '1' : `1–${finalDay}`
  };
}

export function useQuickFill({ viewDate, entries = [], excludeSundays, loadEntries, addToast, undoLabel = 'Undo', onSync }: UseQuickFillProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('5/2-8');
  const [customFill, setCustomFill] = useState({ work: 5, off: 2, hours: 8 });
  const [showCustomFill, setShowCustomFill] = useState(false);
  const [isQuickFillOpen, setIsQuickFillOpen] = useState(false);

  const applyQuickFill = async (workDays: number, offDays: number, hours: number) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    // Save existing entries to undo buffer
    const existingEntries = await db.getEntriesByMonth(monthStr);
    useAppStore.getState().setUndoBuffer(existingEntries);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cycleLength = workDays + offDays;
    
    let workDayCounter = 0;
    const toSave: { date: string; hours: number; month: string }[] = [];
    const toDelete: string[] = [];
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dow = new Date(year, month, i).getDay(); // 0 is Sunday
      
      if (excludeSundays && dow === 0) {
        toDelete.push(dateStr);
        continue;
      }
      
      let isWorkDay = false;
      if (cycleLength === 7 && (workDays === 5 || workDays === 6)) {
        if (workDays === 5) isWorkDay = dow >= 1 && dow <= 5;
        if (workDays === 6) isWorkDay = dow !== 0;
      } else {
        isWorkDay = (workDayCounter % cycleLength) < workDays;
        workDayCounter++;
      }
      
      if (isWorkDay) {
        toSave.push({ date: dateStr, hours, month: dateStr.slice(0, 7) });
      } else {
        toDelete.push(dateStr);
      }
    }

    if (toSave.length > 0) await db.saveMany(toSave);
    if (toDelete.length > 0) await db.deleteMany(toDelete);
    
    await loadEntries();
    onSync?.();
    
    // Use an undo action here
    addToast('Schedule applied', 'success', {
      label: undoLabel,
      onClick: async () => {
        const store = useAppStore.getState();
        const datesToDelete: string[] = [];
        for (let i = 1; i <= daysInMonth; i++) {
          datesToDelete.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
        }
        await db.deleteMany(datesToDelete);
        await store.undoDelete();
        await loadEntries();
        onSync?.();
      }
    });
  };

  const handleApplyTemplate = () => {
    if (selectedTemplate === 'custom') {
      applyQuickFill(customFill.work, customFill.off, customFill.hours);
    } else {
      const [days, hoursStr] = selectedTemplate.split('-');
      const [work, off] = days.split('/');
      applyQuickFill(parseInt(work, 10), parseInt(off, 10), parseInt(hoursStr, 10));
    }
  };

  const getDefaultHours = () => {
    if (selectedTemplate === 'custom') return customFill.hours || 8;
    const parts = selectedTemplate.split('-');
    return parts.length === 2 ? parseInt(parts[1], 10) || 8 : 8;
  };

  const clearMonth = async () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    const existingEntries = await db.getEntriesByMonth(monthStr);
    useAppStore.getState().setUndoBuffer(existingEntries);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const datesToDelete: string[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      datesToDelete.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
    }
    await db.deleteMany(datesToDelete);
    await loadEntries();
    onSync?.();
    addToast('Month cleared', 'warning', {
      label: undoLabel,
      onClick: async () => {
        await useAppStore.getState().undoDelete();
        await loadEntries();
        onSync?.();
      }
    });
  };

  const smartFillPreview = useMemo(() => {
    return computeSmartFillCandidates({
      viewDate,
      entries,
      selectedTemplate,
      customFill,
      excludeSundays
    });
  }, [viewDate, entries, selectedTemplate, customFill, excludeSundays]);

  const smartFillUpToDay = async (targetDay?: number, customHours?: number) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    const existingEntries = await db.getEntriesByMonth(monthStr);
    useAppStore.getState().setUndoBuffer(existingEntries);

    const candidate = computeSmartFillCandidates({
      viewDate,
      entries: existingEntries,
      selectedTemplate,
      customFill,
      excludeSundays,
      targetDay,
      customHours
    });

    if (candidate.datesToFill.length === 0) {
      addToast(`All workdays 1–${candidate.targetDay} already logged`, 'info');
      return;
    }

    const toSave = candidate.datesToFill.map(dateStr => ({
      date: dateStr,
      hours: candidate.hoursPerDay,
      month: dateStr.slice(0, 7)
    }));

    await db.saveMany(toSave);
    await loadEntries();
    onSync?.();

    addToast(`Filled ${toSave.length} empty days with ${candidate.hoursPerDay}h`, 'success', {
      label: undoLabel,
      onClick: async () => {
        const store = useAppStore.getState();
        const datesToDelete = toSave.map(e => e.date);
        await db.deleteMany(datesToDelete);
        await store.undoDelete();
        await loadEntries();
        onSync?.();
      }
    });
  };

  return {
    selectedTemplate,
    setSelectedTemplate,
    customFill,
    setCustomFill,
    showCustomFill,
    setShowCustomFill,
    isQuickFillOpen,
    setIsQuickFillOpen,
    handleApplyTemplate,
    smartFillUpToDay,
    smartFillPreview,
    getDefaultHours,
    clearMonth
  };
}
