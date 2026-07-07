import { useState } from 'react';
import { db } from '../lib/db';
import { useAppStore } from '../store/useAppStore';

interface UseQuickFillProps {
  viewDate: Date;
  excludeSundays: boolean;
  loadEntries: () => Promise<void>;
  addToast: (msg: string, type?: 'info' | 'success' | 'warning' | 'error', action?: { label: string; onClick: () => void }) => void;
  undoLabel?: string;
}

export function useQuickFill({ viewDate, excludeSundays, loadEntries, addToast, undoLabel = 'Undo' }: UseQuickFillProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('6/1-10');
  const [customFill, setCustomFill] = useState({ work: 5, off: 2, hours: 8 });
  const [showCustomFill, setShowCustomFill] = useState(false);
  const [isQuickFillOpen, setIsQuickFillOpen] = useState(false);

  const applyQuickFill = async (workDays: number, offDays: number, hours: number) => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    
    // Save existing entries to undo buffer
    const existingEntries = await db.getEntriesByMonth(monthStr);
    if (existingEntries.length > 0) {
      useAppStore.getState().setUndoBuffer(existingEntries);
    }
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cycleLength = workDays + offDays;
    
    let workDayCounter = 0;
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dow = new Date(year, month, i).getDay(); // 0 is Sunday
      
      if (excludeSundays && dow === 0) {
        await db.deleteEntry(dateStr);
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
        await db.saveEntry({ date: dateStr, hours, month: dateStr.slice(0, 7) });
      } else {
        await db.deleteEntry(dateStr);
      }
    }
    
    await loadEntries();
    
    // Use an undo action here
    addToast('Schedule applied', 'success', {
      label: undoLabel,
      onClick: async () => {
        const store = useAppStore.getState();
        // Since we overwrote entries, we need to clear current month first?
        // Let's just restore the buffer over whatever is there (which might not clear new ones).
        // Best approach is: delete everything for this month, then put back the buffer.
        for (let i = 1; i <= daysInMonth; i++) {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
          await db.deleteEntry(dateStr);
        }
        await store.undoDelete();
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
    if (existingEntries.length > 0) {
      useAppStore.getState().setUndoBuffer(existingEntries);
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      await db.deleteEntry(dateStr);
    }
    await loadEntries();
    addToast('Month cleared', 'warning', {
      label: undoLabel,
      onClick: async () => {
        await useAppStore.getState().undoDelete();
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
    getDefaultHours,
    clearMonth
  };
}
