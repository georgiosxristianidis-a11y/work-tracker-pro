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
      if (!supabase) {
        addToast('Облачная синхронизация недоступна', 'error');
        return;
      }

      try {
        // 1. Establish session on target device
        if (payload.at && payload.rt) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: payload.at,
            refresh_token: payload.rt
          });
          if (sessionError) {
            console.warn('SetSession failed, proceeding with target user ID:', sessionError.message);
          }
        }

        // 2. Query cloud entries for target user
        const { data: cloudRows, error: fetchError } = await supabase
          .from('work_entries')
          .select('date,hours,month')
          .eq('user_id', payload.uid);

        if (fetchError) throw fetchError;

        const cloudEntries: Entry[] = (cloudRows || []).map((r) => ({
          date: r.date,
          hours: Number(r.hours),
          month: r.month
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
