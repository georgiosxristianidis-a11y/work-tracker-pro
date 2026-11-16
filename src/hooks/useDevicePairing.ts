/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { db, Entry, RawCloudEntryRow, fromWorkEntryRow, parseEntryTimestamp, toWorkEntryRow } from '../lib/db';
import {
  decodePairingPayload,
  isPairingPayloadExpired,
  mergeEntries,
  PairingPayload
} from '../lib/device-pairing';

interface UseDevicePairingProps {
  getDeviceId: () => string;
  loadEntries: () => Promise<void>;
  addToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  haptic: (pattern?: number | number[], enabled?: boolean) => void;
  t?: (key: string) => string;
}

export const useDevicePairing = ({
  getDeviceId,
  loadEntries,
  addToast,
  haptic,
  t
}: UseDevicePairingProps) => {
  const tr = useMemo(() => t || ((k: string) => k), [t]);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [incomingPayload, setIncomingPayload] = useState<PairingPayload | null>(null);

  const [pairSuccess, setPairSuccess] = useState(false);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);

  const broadcastPairSuccess = useCallback(async (code: string, deviceName = 'Windows 11') => {
    // 1. BroadcastChannel (Local browser tabs on same machine)
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(`pairing_${code}`);
        bc.postMessage({ type: 'device_paired', deviceName, timestamp: Date.now() });
        setTimeout(() => bc.close(), 1000);
      } catch {
        // Ignored
      }
    }

    // 2. Supabase Realtime (Cross-device, e.g. Phone <-> Windows 11)
    if (supabase) {
      try {
        const channel = supabase.channel(`pairing:${code}`);
        channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'device_paired',
              payload: { deviceName, timestamp: Date.now() }
            });
            // Repeat after 350ms to defeat WebSocket subscription race conditions (#devil)
            setTimeout(() => {
              channel.send({
                type: 'broadcast',
                event: 'device_paired',
                payload: { deviceName, timestamp: Date.now() }
              });
              setTimeout(() => {
                supabase?.removeChannel(channel);
              }, 2000);
            }, 350);
          }
        });
      } catch (err) {
        console.warn('Realtime broadcast error:', err);
      }
    }
  }, []);

  const applyPairing = useCallback(
    async (payload: PairingPayload, mode: 'merge' | 'overwrite') => {
      if (isPairingPayloadExpired(payload)) {
        addToast(tr('QR code expired. Refresh code on the other device.'), 'error');
        setIncomingPayload(null);
        return;
      }

      // Offline P2P direct sync fallback (works without Supabase / when cloud is sleeping)
      if (!supabase || (!payload.at && !payload.rt && payload.entries)) {
        if (!payload.entries || payload.entries.length === 0) {
          if (!supabase) {
            addToast(tr('Cloud sync unavailable and no local entries in QR'), 'error');
            return;
          }
        } else {
          try {
            const p2pEntries: Entry[] = payload.entries.map((e) => ({
              date: e.date,
              hours: Number(e.hours),
              month: e.date.substring(0, 7),
              updated_at: parseEntryTimestamp(e.updated_at)
            }));
            const localEntries = await db.getAllEntries();

            if (mode === 'overwrite') {
              await db.clearAll();
              if (p2pEntries.length > 0) {
                await db.saveMany(p2pEntries);
              }
              addToast(`${tr('P2P: Data replaced')} (${p2pEntries.length} ${tr('entries')})`, 'success');
            } else {
              const mergeResult = mergeEntries(localEntries, p2pEntries);
              if (mergeResult.merged.length > 0) {
                await db.saveMany(mergeResult.merged);
              }
              addToast(
                `${tr('P2P: Synchronized')} +${mergeResult.newFromCloud} ${tr('entries')}`,
                'success'
              );
            }
            if (payload.code) {
              broadcastPairSuccess(payload.code, 'Mobile Device');
            }
            setConnectedDeviceName('Windows 11');
            setPairSuccess(true);
            await loadEntries();
            haptic(25, true);
            setIncomingPayload(null);
            return;
          } catch (p2pErr) {
            console.error('P2P merge failed:', p2pErr);
            addToast(tr('P2P sync error'), 'error');
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
          (cloudRows as RawCloudEntryRow[] | null) || []
        ).map(fromWorkEntryRow);

        const localEntries = await db.getAllEntries();

        if (mode === 'overwrite') {
          await db.clearAll();
          if (cloudEntries.length > 0) {
            await db.saveMany(cloudEntries);
          }
          addToast(`${tr('Data replaced')}: ${cloudEntries.length} ${tr('entries')}`, 'success');
        } else {
          // Smart Merge
          const mergeResult = mergeEntries(localEntries, cloudEntries);
          if (mergeResult.merged.length > 0) {
            await db.saveMany(mergeResult.merged);
          }

          // Push merged entries back to Supabase so both devices have full history
          const deviceId = getDeviceId();
          const uploadPayload = mergeResult.merged.map((e) =>
            toWorkEntryRow(e, payload.uid, deviceId)
          );

          if (uploadPayload.length > 0) {
            const { error: upsertError } = await supabase
              .from('work_entries')
              .upsert(uploadPayload, { onConflict: 'user_id,date' });
            if (upsertError) throw upsertError;
          }

          addToast(
            `${tr('Synchronized')}: +${mergeResult.newFromCloud} ${tr('from cloud')}, +${mergeResult.newFromLocal} ${tr('from device')}`,
            'success'
          );
        }

        if (payload.code) {
          broadcastPairSuccess(payload.code, 'Mobile Device');
        }
        setConnectedDeviceName('Windows 11');
        setPairSuccess(true);
        haptic([40, 60, 40]);
        await loadEntries();
      } catch (err: unknown) {
        console.error('Pairing application error:', err);
        const msg = err instanceof Error ? err.message : tr('Sync error');
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, broadcastPairSuccess, getDeviceId, haptic, loadEntries, tr]
  );

  const resolvePairingCode = useCallback(async (code: string): Promise<PairingPayload> => {
    const client = supabase;
    if (!client) {
      throw new Error(tr('Manual code entry requires cloud connection. Please scan QR with camera.'));
    }

    return new Promise((resolve, reject) => {
      const channel = client.channel(`pairing:${code}`);
      const timeout = setTimeout(() => {
        client.removeChannel(channel);
        reject(new Error(tr('Pairing code not found or timed out.')));
      }, 7000);

      channel
        .on('broadcast', { event: 'provide_payload' }, (msg: { payload?: { payload?: PairingPayload } }) => {
          clearTimeout(timeout);
          client.removeChannel(channel);
          if (msg.payload?.payload) {
            resolve(msg.payload.payload);
          } else {
            reject(new Error(tr('Invalid response from device')));
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            channel.send({
              type: 'broadcast',
              event: 'request_pairing',
              payload: { clientDeviceId: getDeviceId() }
            });
          }
        });
    });
  }, [getDeviceId, tr]);

  // Check URL query parameters for ?pair=... upon initial boot
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const search = window.location.search;
    if (search.includes('pair=')) {
      const payload = decodePairingPayload(search);
      const url = new URL(window.location.href);
      url.searchParams.delete('pair');
      url.searchParams.delete('code');
      window.history.replaceState({}, document.title, url.toString());
      if (payload && !isPairingPayloadExpired(payload)) {
        setIncomingPayload(payload);
      }
    }
  }, []);

  return {
    isPairModalOpen,
    setIsPairModalOpen,
    incomingPayload,
    setIncomingPayload,
    applyPairing,
    pairSuccess,
    setPairSuccess,
    connectedDeviceName,
    setConnectedDeviceName,
    broadcastPairSuccess,
    resolvePairingCode
  };
};
