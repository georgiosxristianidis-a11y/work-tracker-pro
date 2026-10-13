/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { db, Entry } from '../lib/db';
import {
  decodePairingPayload,
  mergeEntries,
  PairingPayload
} from '../lib/device-pairing';

interface UseDevicePairingProps {
  getDeviceId: () => string;
  loadEntries: () => Promise<void>;
  addToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  haptic: (pattern?: number | number[], enabled?: boolean) => void;
}

export const useDevicePairing = ({
  getDeviceId,
  loadEntries,
  addToast,
  haptic
}: UseDevicePairingProps) => {
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [incomingPayload, setIncomingPayload] = useState<PairingPayload | null>(null);

  const applyPairing = useCallback(
    async (payload: PairingPayload, mode: 'merge' | 'overwrite') => {
      // Offline P2P direct sync fallback (works without Supabase / when cloud is sleeping)
      if (!supabase || (!payload.at && !payload.rt && payload.entries)) {
        if (!payload.entries || payload.entries.length === 0) {
          if (!supabase) {
            addToast('Облачная синхронизация недоступна и нет локальных записей в QR', 'error');
            return;
          }
        } else {
          try {
            const p2pEntries: Entry[] = payload.entries.map((e) => ({
              date: e.date,
              hours: Number(e.hours),
              month: e.date.substring(0, 7),
              updated_at: e.updated_at
            }));
            const localEntries = await db.getAllEntries();

            if (mode === 'overwrite') {
              await db.clearAll();
              if (p2pEntries.length > 0) {
                await db.saveMany(p2pEntries);
              }
              addToast(`P2P: Данные заменены (${p2pEntries.length} записей)`, 'success');
            } else {
              const mergeResult = mergeEntries(localEntries, p2pEntries);
              if (mergeResult.merged.length > 0) {
                await db.saveMany(mergeResult.merged);
              }
              addToast(
                `P2P: Синхронизировано +${mergeResult.newFromCloud} записей`,
                'success'
              );
            }
            await loadEntries();
            haptic(25, true);
            setIncomingPayload(null);
            setIsPairModalOpen(false);
            return;
          } catch (p2pErr) {
            console.error('P2P merge failed:', p2pErr);
            addToast('Ошибка P2P синхронизации', 'error');
            return;
          }
        }
      }

      try {
        // 1. Establish session on target device
        if (payload.rt) {
          const { error: refreshError } = await supabase.auth.refreshSession({
            refresh_token: payload.rt
          });
          if (refreshError) {
            console.warn('RefreshSession failed, trying setSession if available:', refreshError.message);
            if (payload.at) {
              await supabase.auth.setSession({
                access_token: payload.at,
                refresh_token: payload.rt
              });
            }
          }
        } else if (payload.at) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: payload.at,
            refresh_token: payload.rt || ''
          });
          if (sessionError) {
            console.warn('SetSession failed, proceeding with target user ID:', sessionError.message);
          }
        }

        // 2. Query cloud entries for target user
        const { data: cloudRows, error: fetchError } = await supabase
          .from('work_entries')
          .select('*')
          .eq('user_id', payload.uid);

        if (fetchError) throw fetchError;

        const cloudEntries: Entry[] = (
          (cloudRows as Array<{ date: string; hours: number; month: string; updated_at?: number | string }> | null) || []
        ).map((r) => ({
          date: r.date,
          hours: Number(r.hours),
          month: r.month,
          updated_at: r.updated_at ? Number(r.updated_at) : undefined
        }));

        const localEntries = await db.getAllEntries();

        if (mode === 'overwrite') {
          await db.clearAll();
          if (cloudEntries.length > 0) {
            await db.saveMany(cloudEntries);
          }
          addToast(`Данные заменены: ${cloudEntries.length} записей`, 'success');
        } else {
          // Smart Merge
          const mergeResult = mergeEntries(localEntries, cloudEntries);
          if (mergeResult.merged.length > 0) {
            await db.saveMany(mergeResult.merged);
          }

          // Push merged entries back to Supabase so both devices have full history
          const deviceId = getDeviceId();
          const uploadPayload = mergeResult.merged.map((e) => ({
            ...e,
            user_id: payload.uid,
            device_id: deviceId
          }));

          if (uploadPayload.length > 0) {
            await supabase
              .from('work_entries')
              .upsert(uploadPayload, { onConflict: 'user_id,date' });
          }

          addToast(
            `Синхронизировано: +${mergeResult.newFromCloud} из облака, +${mergeResult.newFromLocal} с устройства`,
            'success'
          );
        }

        haptic([40, 60, 40]);
        await loadEntries();
      } catch (err: unknown) {
        console.error('Pairing application error:', err);
        const msg = err instanceof Error ? err.message : 'Ошибка при синхронизации';
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, getDeviceId, haptic, loadEntries]
  );

  // Check URL query parameters for ?pair=... upon initial boot
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const search = window.location.search;
    if (search.includes('pair=')) {
      const payload = decodePairingPayload(search);
      if (payload) {
        setIncomingPayload(payload);
        // Clean URL without reload
        const url = new URL(window.location.href);
        url.searchParams.delete('pair');
        window.history.replaceState({}, document.title, url.toString());
      }
    }
  }, []);

  return {
    isPairModalOpen,
    setIsPairModalOpen,
    incomingPayload,
    setIncomingPayload,
    applyPairing
  };
};
