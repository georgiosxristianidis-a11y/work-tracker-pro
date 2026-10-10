import { useState } from 'react';
import { db } from '../lib/db';
import { useAppStore } from '../store/useAppStore';

interface UseQuickFillProps {
  viewDate: Date;
  excludeSundays: boolean;
  loadEntries: () => Promise<void>;
  addToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', action?: { label: string; onClick: () => void }) => void;
  undoLabel?: string;
  onSync?: () => void;
}

export function useQuickFill({ viewDate, excludeSundays, loadEntries, addToast, undoLabel = 'Undo', onSync }: UseQuickFillProps) {
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
      applyQuickFill(parseInt(work), parseInt(off), parseInt(hoursStr));
    }
  };

  const getDefaultHours = () => {
    if (selectedTemplate === 'custom') return customFill.hours || 8;
    const parts = selectedTemplate.split('-');
    return parts.length === 2 ? parseInt(parts[1]) || 8 : 8;
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
        onSync?.();
      }
    });
  };

  const smartFillUpToDay = async (targetDay?: number, customHours?: number) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const now = new Date();
    
    // Default target day: if current month, use today's date; otherwise whole month
    const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
    const finalDay = targetDay ?? (isCurrentMonth ? now.getDate() : new Date(year, month + 1, 0).getDate());
    const hours = customHours ?? getDefaultHours();

    const existingEntries = await db.getEntriesByMonth(monthStr);
    useAppStore.getState().setUndoBuffer(existingEntries);
    const existingSet = new Set(existingEntries.filter(e => e.hours > 0).map(e => e.date));

    // Schedule check: 5/2 excludes Saturdays and Sundays; 6/1 excludes Sundays
    const isFiveTwo = selectedTemplate.startsWith('5/2');

    const toSave: { date: string; hours: number; month: string }[] = [];

    for (let i = 1; i <= finalDay; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dow = new Date(year, month, i).getDay(); // 0 = Sunday, 6 = Saturday

      // Skip Sundays
      if (dow === 0) continue;

      // Skip Saturdays if 5/2 schedule
      if (isFiveTwo && dow === 6) continue;

      // Safe mode: preserve existing manual entries
      if (existingSet.has(dateStr)) continue;

      toSave.push({ date: dateStr, hours, month: dateStr.slice(0, 7) });
    }

    if (toSave.length === 0) {
      addToast(`All workdays 1–${finalDay} already logged`, 'info');
      return;
    }

    await db.saveMany(toSave);
    await loadEntries();
    onSync?.();

    addToast(`Filled ${toSave.length} empty days with ${hours}h`, 'success', {
      label: undoLabel,
      onClick: async () => {
        const store = useAppStore.getState();
        const datesToDelete = toSave.map(e => e.date);
        await db.deleteMany(datesToDelete);
        await store.undoDelete();
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
    getDefaultHours,
    clearMonth
  };
}
