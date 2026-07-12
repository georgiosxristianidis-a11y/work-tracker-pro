import React, { useState, useRef, useCallback } from 'react';
import { supabase, ensureAuth } from '../lib/supabase';
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

  const syncWithSupabaseAction = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (settings.strictOfflineMode) {
      if (!silent) addToast('Sync disabled by Strict Offline Mode', 'warning');
      return;
    }
    if (!supabase) {
      if (!silent) addToast('Supabase credentials missing in .env', 'error');
      return;
    }
    if (silent && !navigator.onLine) return;

    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setSyncStatus('syncing');

    try {
      const userId = await ensureAuth();
      if (!userId) throw new Error('Could not establish a Supabase session.');

      const allEntries = await db.getAllEntries();
      const device_id = getDeviceId();

      if (allEntries.length > 0) {
        const payload = allEntries.map(e => {
          return { ...e, user_id: userId, device_id };
        });

        const { error } = await supabase
          .from('work_entries')
          .upsert(payload, { onConflict: 'user_id,date' });
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
      if (!silent) addToast(errorMsg.length > 50 ? errorMsg.substring(0, 50) + '...' : errorMsg, 'error');
      setTimeout(() => {
        setSyncStatus('idle');
        isSyncingRef.current = false;
      }, 5000);
    }
  }, [settings.strictOfflineMode, settings.language, addToast, getDeviceId, setSettings]);

  // Silent background mirror of local deletions. Never toasts: a failed
  // cloud delete is reconciled by the next full sync, not surfaced to the user.
  const deleteEntryFromCloud = useCallback(async (date: string) => {
    if (!supabase || settings.strictOfflineMode || !navigator.onLine) return;
    try {
      const userId = await ensureAuth();
      if (!userId) return;
      const { error } = await supabase
        .from('work_entries')
        .delete()
        .eq('user_id', userId)
        .eq('date', date);
      if (error) throw error;
    } catch (err: any) {
      console.warn('Cloud delete failed:', err?.message || err);
    }
  }, [settings.strictOfflineMode]);

  const clearCloudData = useCallback(async () => {
    if (!supabase || settings.strictOfflineMode || !navigator.onLine) return;
    try {
      const userId = await ensureAuth();
      if (!userId) return;
      const { error } = await supabase
        .from('work_entries')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    } catch (err: any) {
      console.warn('Cloud clear failed:', err?.message || err);
    }
  }, [settings.strictOfflineMode]);

  return {
    syncStatus,
    syncErrorMsg,
    lastSynced,
    syncWithSupabaseAction,
    deleteEntryFromCloud,
    clearCloudData
  };
};
