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

    try {
      const allEntries = await db.getAllEntries();

      // Delta sync (card D5): background (silent) syncs upload only the rows that
      // changed since the last successful sync; the manual Sync stays a full
      // upsert to realign everything ("sync all"). Deletions are mirrored
      // separately (deleteEntryFromCloud / clearCloudData) — here we only diff
      // upserts. The snapshot is date -> hours as last pushed to the cloud.
      const prevSnapshot = await db.getSetting<Record<string, number>>('syncSnapshot', {});
      const nextSnapshot: Record<string, number> = {};
      for (const e of allEntries) nextSnapshot[e.date] = e.hours;

      const toUpload = silent
        ? allEntries.filter(e => prevSnapshot[e.date] !== e.hours)
        : allEntries;

      if (silent && toUpload.length === 0) {
        // No upserts to push. Persist the snapshot anyway so dates deleted since
        // the last sync drop out of it (a later re-add of the same date/hours is
        // then detected as a change); skip the network round-trip — the point of D5.
        await db.setSetting('syncSnapshot', nextSnapshot);
        isSyncingRef.current = false;
        return;
      }

      setSyncStatus('syncing');

      const userId = await ensureAuth();
      if (!userId) throw new Error('Could not establish a Supabase session.');

      const device_id = getDeviceId();

      if (toUpload.length > 0) {
        const payload = toUpload.map(e => {
          return { ...e, user_id: userId, device_id };
        });

        const { error } = await supabase
          .from('work_entries')
          .upsert(payload, { onConflict: 'user_id,date' });
        if (error) throw error;
      }

      // Record what the cloud now reflects so the next background sync only sends
      // further changes.
      await db.setSetting('syncSnapshot', nextSnapshot);

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

  // Manual restore: pulls every cloud row for this user and inserts the
  // dates that are missing locally. On conflict the local entry always wins —
  // local entries carry no timestamp to compare against cloud updated_at, so
  // overwriting local data could silently lose the newest edit.
  // Returns the number of restored entries, or null when nothing ran.
  const restoreFromCloudAction = useCallback(async (): Promise<number | null> => {
    if (settings.strictOfflineMode) {
      addToast('Sync disabled by Strict Offline Mode', 'warning');
      return null;
    }
    if (!supabase) {
      addToast('Supabase credentials missing in .env', 'error');
      return null;
    }
    if (isSyncingRef.current) return null;
    isSyncingRef.current = true;
    setSyncStatus('syncing');

    try {
      const userId = await ensureAuth();
      if (!userId) throw new Error('Could not establish a Supabase session.');

      const { data, error } = await supabase
        .from('work_entries')
        .select('date,hours,month')
        .eq('user_id', userId);
      if (error) throw error;

      const localEntries = await db.getAllEntries();
      const localDates = new Set(localEntries.map(e => e.date));
      let restored = 0;
      for (const row of data ?? []) {
        if (localDates.has(row.date)) continue;
        await db.saveEntry({ date: row.date, hours: Number(row.hours), month: row.month });
        restored++;
      }

      setSyncStatus('success');
      setSyncErrorMsg('');
      setTimeout(() => {
        setSyncStatus('idle');
        isSyncingRef.current = false;
      }, 2000);
      return restored;

    } catch (err: any) {
      const errStr = err ? JSON.stringify(err) : 'Unknown error';
      console.warn('Restore warning:', err?.message || errStr);
      setSyncStatus('error');
      let errorMsg = err?.message || err?.error_description || (typeof err === 'string' ? err : 'Restore failed');

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
      return null;
    }
  }, [settings.strictOfflineMode, addToast]);

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
    restoreFromCloudAction,
    deleteEntryFromCloud,
    clearCloudData
  };
};
