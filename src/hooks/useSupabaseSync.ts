import React, { useState, useRef, useCallback, useEffect } from 'react';
import { supabase, ensureAuth } from '../lib/supabase';
import { db, Entry, RawCloudEntryRow, parseEntryTimestamp, toTombstoneRow, toWorkEntryRow } from '../lib/db';
import { reconcileCloudEntries } from '../lib/device-pairing';
import { AppSettings } from '../constants';

interface UseSupabaseSyncProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  addToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  getDeviceId: () => string;
  onLocalChange?: () => Promise<void> | void;
}

const PENDING_DELETES_KEY = 'pendingDeletes';
const UPSERT_CHUNK_SIZE = 100;

let pendingQueue: Promise<unknown> = Promise.resolve();
const withPendingLock = <T,>(fn: () => Promise<T>): Promise<T> => {
  const run = pendingQueue.then(fn);
  pendingQueue = run.catch(() => undefined);
  return run;
};

async function readPendingDeletesMap(): Promise<Record<string, number>> {
  const raw = await db.getSetting<unknown>(PENDING_DELETES_KEY, {});
  if (!raw || typeof raw !== 'object') return {};
  if (Array.isArray(raw)) {
    const now = Date.now();
    const migrated: Record<string, number> = {};
    for (const d of raw) {
      if (typeof d === 'string') migrated[d] = now;
    }
    return migrated;
  }
  const clean: Record<string, number> = {};
  for (const [date, ts] of Object.entries(raw as Record<string, unknown>)) {
    const parsed = parseEntryTimestamp(ts);
    if (parsed !== undefined) clean[date] = parsed;
  }
  return clean;
}

const isMissingDeletedAtCol = (err: { code?: string; message?: string } | null | undefined): boolean =>
  Boolean(err && (err.code === 'PGRST204' || err.code === '42703' || err.message?.includes('deleted_at')));

export const useSupabaseSync = ({
  settings, setSettings, addToast, getDeviceId, onLocalChange
}: UseSupabaseSyncProps) => {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncErrorMsg, setSyncErrorMsg] = useState<string>('');
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const isSyncingRef = useRef(false);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The status timer only drives the UI badge; the sync lock is released in `finally`.
  const cancelStatusReset = useCallback(() => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = null;
  }, []);

  const resetStatusLater = useCallback((ms: number) => {
    cancelStatusReset();
    statusTimerRef.current = setTimeout(() => setSyncStatus('idle'), ms);
  }, [cancelStatusReset]);

  useEffect(() => cancelStatusReset, [cancelStatusReset]);

  const pushCloudMutations = useCallback(async (
    userId: string,
    deviceId: string,
    entriesToUpload: Entry[],
    clearDeletedAtDates: Set<string>,
    tombstonesToUpload: Array<{ date: string; deletedAtMs: number }>
  ) => {
    if (!supabase) return;

    if (entriesToUpload.length > 0) {
      for (let i = 0; i < entriesToUpload.length; i += UPSERT_CHUNK_SIZE) {
        const batch = entriesToUpload.slice(i, i + UPSERT_CHUNK_SIZE);
        const rows = batch.map(e => toWorkEntryRow(e, userId, deviceId, Date.now(), clearDeletedAtDates.has(e.date)));
        const { error } = await supabase.from('work_entries').upsert(rows, { onConflict: 'user_id,date' });
        if (error) {
          if (isMissingDeletedAtCol(error)) {
            const legacyRows = batch.map(e => toWorkEntryRow(e, userId, deviceId));
            const { error: retryErr } = await supabase.from('work_entries').upsert(legacyRows, { onConflict: 'user_id,date' });
            if (retryErr) throw retryErr;
          } else {
            throw error;
          }
        }
      }
    }

    if (tombstonesToUpload.length > 0) {
      for (let i = 0; i < tombstonesToUpload.length; i += UPSERT_CHUNK_SIZE) {
        const batch = tombstonesToUpload.slice(i, i + UPSERT_CHUNK_SIZE);
        const rows = batch.map(t => toTombstoneRow(t.date, userId, deviceId, t.deletedAtMs));
        const { error } = await supabase.from('work_entries').upsert(rows, { onConflict: 'user_id,date' });
        if (error) {
          if (isMissingDeletedAtCol(error)) {
            const { error: delErr } = await supabase
              .from('work_entries')
              .delete()
              .eq('user_id', userId)
              .in('date', batch.map(t => t.date));
            if (delErr) throw delErr;
          } else {
            throw error;
          }
        }
      }
    }
  }, []);

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
    cancelStatusReset();

    try {
      const allEntries = await db.getAllEntries();
      const prevSnapshot = await db.getSetting<Record<string, number>>('syncSnapshot', {});
      const pendingBefore = await readPendingDeletesMap();
      const pendingKeys = Object.keys(pendingBefore);

      if (silent) {
        const deltaEntries = allEntries.filter(
          e => prevSnapshot[e.date] !== e.hours || pendingBefore[e.date] !== undefined
        );
        if (deltaEntries.length === 0 && pendingKeys.length === 0) {
          const nextSnap: Record<string, number> = {};
          for (const e of allEntries) nextSnap[e.date] = e.hours;
          await db.setSetting('syncSnapshot', nextSnap);
          return;
        }
      }

      setSyncStatus('syncing');

      const userId = await ensureAuth();
      if (!userId) throw new Error('Could not establish a Supabase session.');
      const syncOwnerId = await db.getSetting<string>('syncOwnerId', '') || userId;
      const device_id = getDeviceId();

      const { data: cloudData, error: fetchErr } = await supabase
        .from('work_entries')
        .select('*')
        .eq('user_id', syncOwnerId);
      if (fetchErr) throw fetchErr;

      const cloudRows = (cloudData as RawCloudEntryRow[] | null) ?? [];
      const plan = reconcileCloudEntries(allEntries, pendingBefore, cloudRows);

      if (plan.datesToDeleteLocally.length > 0) {
        await db.deleteMany(plan.datesToDeleteLocally);
      }
      if (plan.entriesToSaveLocally.length > 0) {
        await db.saveMany(plan.entriesToSaveLocally);
      }

      await pushCloudMutations(
        syncOwnerId,
        device_id,
        plan.entriesToUpload,
        plan.clearDeletedAtDates,
        plan.tombstonesToUpload
      );

      await withPendingLock(async () => {
        const latestPending = await readPendingDeletesMap();
        const latestLocal = await db.getAllEntries();
        const latestMap = new Map(latestLocal.map(e => [e.date, e] as const));
        const keptPending: Record<string, number> = {};

        for (const [d, ts] of Object.entries(latestPending)) {
          const wasHandled = pendingBefore[d] !== undefined && pendingBefore[d] === ts;
          const loc = latestMap.get(d);
          if (!wasHandled && (!loc || (parseEntryTimestamp(loc.updated_at) ?? 0) < ts)) {
            keptPending[d] = ts;
          }
        }

        const finalSnapshot: Record<string, number> = {};
        for (const e of latestLocal) finalSnapshot[e.date] = e.hours;
        await db.setSetting(PENDING_DELETES_KEY, keptPending);
        await db.setSetting('syncSnapshot', finalSnapshot);
      });

      if (plan.datesToDeleteLocally.length > 0 || plan.entriesToSaveLocally.length > 0) {
        await onLocalChange?.();
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
      setSettings(s => ({ ...s, lastSync: now }));

      resetStatusLater(2000);

    } catch (rawErr: unknown) {
      const err = (rawErr && typeof rawErr === 'object' ? rawErr : {}) as { message?: string; error_description?: string; code?: string };
      const errStr = rawErr ? JSON.stringify(rawErr) : 'Unknown error';
      console.warn('Sync warning:', err.message || errStr);
      setSyncStatus('error');
      let errorMsg = err.message || err.error_description || (typeof rawErr === 'string' ? rawErr : 'Sync failed');
      
      if (errorMsg === 'Failed to fetch' || errorMsg.includes('fetch')) {
        errorMsg = 'Check your Supabase URL and network connection.';
      }
      if (err.code === '42P01') {
        errorMsg = 'Supabase table "work_entries" does not exist.';
      }
      
      setSyncErrorMsg(errorMsg);
      if (!silent) addToast(errorMsg.length > 50 ? errorMsg.substring(0, 50) + '...' : errorMsg, 'error');
      resetStatusLater(5000);
    } finally {
      isSyncingRef.current = false;
    }
  }, [settings.strictOfflineMode, settings.language, addToast, getDeviceId, setSettings, cancelStatusReset, resetStatusLater, pushCloudMutations, onLocalChange]);

  // Manual restore: reconciles cloud rows against local state and tombstones using
  // causal LWW timestamps (updated_at / deleted_at) so newer remote edits apply
  // and deleted shifts never resurrect.
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
    cancelStatusReset();
    setSyncStatus('syncing');

    try {
      const userId = await ensureAuth();
      if (!userId) throw new Error('Could not establish a Supabase session.');
      const syncOwnerId = await db.getSetting<string>('syncOwnerId', '') || userId;

      const { data, error } = await supabase
        .from('work_entries')
        .select('*')
        .eq('user_id', syncOwnerId);
      if (error) throw error;

      const localEntries = await db.getAllEntries();
      const pendingBefore = await readPendingDeletesMap();
      const rows = (data as RawCloudEntryRow[] | null) ?? [];
      const plan = reconcileCloudEntries(localEntries, pendingBefore, rows);

      if (plan.datesToDeleteLocally.length > 0) {
        await db.deleteMany(plan.datesToDeleteLocally);
      }
      if (plan.entriesToSaveLocally.length > 0) {
        await db.saveMany(plan.entriesToSaveLocally);
      }

      if (plan.tombstonesToUpload.length > 0) {
        await pushCloudMutations(syncOwnerId, getDeviceId(), [], new Set(), plan.tombstonesToUpload);
      }

      const changedCount = plan.entriesToSaveLocally.length + plan.datesToDeleteLocally.length;

      setSyncStatus('success');
      setSyncErrorMsg('');
      resetStatusLater(2000);
      return changedCount;

    } catch (rawErr: unknown) {
      const err = (rawErr && typeof rawErr === 'object' ? rawErr : {}) as { message?: string; error_description?: string; code?: string };
      const errStr = rawErr ? JSON.stringify(rawErr) : 'Unknown error';
      console.warn('Restore warning:', err.message || errStr);
      setSyncStatus('error');
      let errorMsg = err.message || err.error_description || (typeof rawErr === 'string' ? rawErr : 'Restore failed');

      if (errorMsg === 'Failed to fetch' || errorMsg.includes('fetch')) {
        errorMsg = 'Check your Supabase URL and network connection.';
      }
      if (err.code === '42P01') {
        errorMsg = 'Supabase table "work_entries" does not exist.';
      }

      setSyncErrorMsg(errorMsg);
      addToast(errorMsg.length > 50 ? errorMsg.substring(0, 50) + '...' : errorMsg, 'error');
      resetStatusLater(5000);
      return null;
    } finally {
      isSyncingRef.current = false;
    }
  }, [settings.strictOfflineMode, addToast, cancelStatusReset, resetStatusLater, getDeviceId, pushCloudMutations]);

  // Persists deletion timestamps locally first (offline-safe), then next background
  // or manual sync pushes server-side deleted_at tombstones so no device resurrects them.
  const queueCloudDeletes = useCallback(async (dates: string[], deletedAtMs = Date.now()) => {
    if (dates.length === 0) return;
    try {
      await withPendingLock(async () => {
        const cur = await readPendingDeletesMap();
        for (const d of dates) {
          if (d) cur[d] = Math.max(cur[d] || 0, deletedAtMs);
        }
        await db.setSetting(PENDING_DELETES_KEY, cur);
      });
    } catch (err: unknown) {
      console.warn('Pending delete save failed:', err);
    }
  }, []);

  const clearPendingDeletes = useCallback(async (dates: string[]) => {
    if (dates.length === 0) return;
    try {
      await withPendingLock(async () => {
        const cur = await readPendingDeletesMap();
        let changed = false;
        for (const d of dates) {
          if (cur[d] !== undefined) {
            delete cur[d];
            changed = true;
          }
        }
        if (changed) await db.setSetting(PENDING_DELETES_KEY, cur);
      });
    } catch (err: unknown) {
      console.warn('Pending delete cleanup failed:', err);
    }
  }, []);

  const deleteEntryFromCloud = useCallback(async (date: string) => {
    await queueCloudDeletes([date]);
  }, [queueCloudDeletes]);

  const clearCloudData = useCallback(async (datesToTombstone: string[] = []) => {
    if (datesToTombstone.length > 0) {
      await queueCloudDeletes(datesToTombstone);
    }
    if (!supabase || settings.strictOfflineMode || !navigator.onLine) return;
    try {
      const userId = await ensureAuth();
      if (!userId) return;
      const syncOwnerId = await db.getSetting<string>('syncOwnerId', '') || userId;
      if (datesToTombstone.length > 0) {
        const nowMs = Date.now();
        await pushCloudMutations(
          syncOwnerId,
          getDeviceId(),
          [],
          new Set(),
          datesToTombstone.map(date => ({ date, deletedAtMs: nowMs }))
        );
      }
    } catch (err: unknown) {
      console.warn('Cloud clear failed:', err instanceof Error ? err.message : err);
    }
  }, [settings.strictOfflineMode, queueCloudDeletes, pushCloudMutations, getDeviceId]);

  return {
    syncStatus,
    syncErrorMsg,
    lastSynced,
    syncWithSupabaseAction,
    restoreFromCloudAction,
    deleteEntryFromCloud,
    queueCloudDeletes,
    clearPendingDeletes,
    clearCloudData
  };
};
