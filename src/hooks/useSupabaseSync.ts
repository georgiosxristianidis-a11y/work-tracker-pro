import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { AppSettings } from '../constants';

interface UseSupabaseSyncProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  addToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  getDeviceId: () => string;
}

export const useSupabaseSync = ({
  settings, setSettings, addToast, getDeviceId
}: UseSupabaseSyncProps) => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncErrorMsg, setSyncErrorMsg] = useState<string>('');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const isSyncingRef = useRef(false);

  const syncWithSupabaseAction = useCallback(async () => {
    if (settings.strictOfflineMode) {
      addToast('Sync disabled by Strict Offline Mode', 'warning');
      return;
    }
    if (!supabase) {
      addToast('Supabase credentials missing in .env', 'error');
      return;
    }
    
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncStatus('syncing');

    try {
      const allEntries = await db.getAllEntries();
      const device_id = getDeviceId();
      
      if (allEntries.length > 0) {
        const payload = allEntries.map(e => {
          return { ...e, device_id };
        });
        
        const { error } = await supabase
          .from('work_entries')
          .upsert(payload, { onConflict: 'date' });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('work_entries')
          .delete()
          .eq('device_id', device_id);
        if (error) throw error;
      }

      setSyncStatus('success');
      setSyncErrorMsg('');
      const now = new Date().toLocaleString(settings.language === 'ENG' ? 'en-US' : settings.language === 'RUS' ? 'ru-RU' : 'el-GR', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      setLastSynced(now);
      setSettings(s => {
        const newSettings = { ...s, lastSync: now };
        db.setSetting('settings', newSettings);
        return newSettings;
      });
      
      // Removed addToast here to prevent duplicate success toasts when saving
      
      setTimeout(() => {
        setSyncStatus('idle');
        isSyncingRef.current = false;
      }, 2000);

    } catch (err: any) {
      const errStr = err ? JSON.stringify(err) : 'Unknown error';
      console.warn('Sync warning:', err?.message || errStr);
      setSyncStatus('error');
      let errorMsg = err?.message || err?.error_description || (typeof err === 'string' ? err : 'Sync failed');
      
      if (errorMsg === 'Failed to fetch' || errorMsg.includes('fetch')) {
        errorMsg = 'Check your Supabase URL and network connection.';
      }
      if (err?.code === '42P01') {
        errorMsg = 'Supabase table "work_entries" does not exist.';
      }
      
      setSyncErrorMsg(errorMsg);
      addToast(errorMsg.length > 50 ? errorMsg.substring(0, 50) + '...' : errorMsg, 'error');
      setTimeout(() => {
        setSyncStatus('idle');
        isSyncingRef.current = false;
      }, 5000);
    }
  }, [settings.strictOfflineMode, settings.language, addToast, getDeviceId, setSettings]);

  return {
    syncStatus,
    syncErrorMsg,
    lastSynced,
    syncWithSupabaseAction
  };
};
