/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase, ensureAuth } from '../lib/supabase';
import { db, Entry, RawCloudEntryRow, fromWorkEntryRow, parseEntryTimestamp, toWorkEntryRow } from '../lib/db';
import {
  buildPairingUrl,
  decodePairingPayloadAsync,
  encodePairingPayloadAsync,
  generatePairingCode,
  isPairingPayloadExpired,
  mergeEntries,
  PairingPayload
} from '../lib/device-pairing';

export interface PreparedPairingSession {
  url: string;
  code: string;
  createdAt: number;
  payload: PairingPayload;
}

interface UseDevicePairingProps {
  getDeviceId: () => string;
  loadEntries: () => Promise<void>;
  addToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  haptic: (pattern?: number | number[], enabled?: boolean) => void;
  strictOfflineMode?: boolean;
  t?: (key: string) => string;
}

export const useDevicePairing = ({
  getDeviceId,
  loadEntries,
  addToast,
  haptic,
  strictOfflineMode = false,
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
    if (supabase && !strictOfflineMode) {
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
  }, [strictOfflineMode]);

  const preparePairingSession = useCallback(async (): Promise<PreparedPairingSession> => {
    const now = Date.now();
    let code = generatePairingCode();
    const deviceId = getDeviceId();
    const localEntries = await db.getAllEntries();
    const recentEntries = localEntries.slice(0, 60).map(e => ({
      date: e.date,
      hours: e.hours,
      updated_at: e.updated_at
    }));

    let ownerUid = deviceId;
    if (supabase && !strictOfflineMode && navigator.onLine) {
      try {
        const authPromise = (async () => {
          const uid = await ensureAuth();
          if (!uid) return null;
          const storedOwner = await db.getSetting<string>('syncOwnerId', '');
          let { data: rpcOwner, error: rpcErr } = await supabase.rpc('create_pairing_code', { p_code: code });
          if (rpcErr?.message?.includes('already in use')) {
            code = generatePairingCode();
            ({ data: rpcOwner, error: rpcErr } = await supabase.rpc('create_pairing_code', { p_code: code }));
          }
          if (!rpcErr && typeof rpcOwner === 'string' && rpcOwner) {
            return rpcOwner;
          }
          return storedOwner || uid;
        })();
        const timeoutPromise = new Promise<null>(res => setTimeout(() => res(null), 2500));
        const resolvedOwner = await Promise.race([authPromise, timeoutPromise]);
        if (resolvedOwner) ownerUid = resolvedOwner;
      } catch (err) {
        console.warn('Cloud pairing code registration skipped, using P2P payload:', err);
      }
    }

    const payload: PairingPayload = {
      v: 1,
      t: now,
      uid: ownerUid,
      dev: deviceId,
      code,
      ...(recentEntries.length > 0 ? { entries: recentEntries } : {})
    };
    const encoded = await encodePairingPayloadAsync(payload);
    return {
      url: buildPairingUrl(encoded, code),
      code,
      createdAt: now,
      payload
    };
  }, [getDeviceId, strictOfflineMode]);

  const subscribeHostPairing = useCallback((
    code: string,
    getPayload: () => PairingPayload | null,
    onPeerPaired: (deviceName: string) => void
  ) => {
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
    let bc: BroadcastChannel | null = null;
    let providedOnce = false;

    if (supabase && !strictOfflineMode) {
      const client = supabase;
      channel = client.channel(`pairing:${code}`);
      channel
        .on('broadcast', { event: 'request_pairing' }, () => {
          const active = getPayload();
          if (active && channel && !providedOnce) {
            providedOnce = true;
            channel.send({
              type: 'broadcast',
              event: 'provide_payload',
              payload: { payload: active }
            });
          }
        })
        .on('broadcast', { event: 'device_paired' }, (msg: { payload?: { deviceName?: string } }) => {
          onPeerPaired(msg.payload?.deviceName || 'Mobile Device');
        })
        .subscribe();
    }

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel(`pairing_${code}`);
        bc.onmessage = (ev) => {
          if (ev.data?.type === 'device_paired') {
            onPeerPaired(ev.data?.deviceName || 'Mobile Device');
          } else if (ev.data?.type === 'request_pairing') {
            const active = getPayload();
            if (active) bc?.postMessage({ type: 'provide_payload', payload: active });
          }
        };
      } catch {
        // Ignored
      }
    }

    return () => {
      if (channel && supabase) supabase.removeChannel(channel);
      if (bc) bc.close();
    };
  }, [strictOfflineMode]);

  const exportPairingBackup = useCallback(async () => {
    try {
      const allEntries = await db.getAllEntries();
      const data = { version: 1 as const, exportedAt: Date.now(), entries: allEntries };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const file = new File([blob], 'work-tracker-backup.json', { type: 'application/json' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: tr('Work Tracker Pro — Database Backup'),
          text: `${tr('Shift database')} (${allEntries.length} ${tr('entries')})`
        });
        addToast(tr('Backup file sent'), 'success');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'work-tracker-backup.json';
        a.click();
        URL.revokeObjectURL(url);
        addToast(tr('Backup file downloaded (.json)'), 'success');
      }
    } catch (err) {
      console.warn('Share backup cancelled or failed:', err);
    }
  }, [addToast, tr]);

  const applyPairing = useCallback(
    async (payload: PairingPayload, mode: 'merge' | 'overwrite') => {
      if (isPairingPayloadExpired(payload)) {
        addToast(tr('QR code expired. Refresh code on the other device.'), 'error');
        setIncomingPayload(null);
        return;
      }

      const p2pEntries: Entry[] = (payload.entries || []).map((e) => ({
        date: e.date,
        hours: Number(e.hours),
        month: e.date.substring(0, 7),
        updated_at: parseEntryTimestamp(e.updated_at)
      }));

      // Offline P2P direct sync (Strict Offline Mode or without Supabase)
      if (!supabase || strictOfflineMode || !navigator.onLine) {
        if (p2pEntries.length === 0) {
          addToast(tr('Cloud sync unavailable and no local entries in QR'), 'error');
          return;
        }
        try {
          const localEntries = await db.getAllEntries();
          if (mode === 'overwrite') {
            await db.clearAll();
            await db.saveMany(p2pEntries);
            addToast(`${tr('P2P: Data replaced')} (${p2pEntries.length} ${tr('entries')})`, 'success');
          } else {
            const mergeResult = mergeEntries(localEntries, p2pEntries);
            if (mergeResult.merged.length > 0) await db.saveMany(mergeResult.merged);
            addToast(`${tr('P2P: Synchronized')} +${mergeResult.newFromCloud} ${tr('entries')}`, 'success');
          }
          if (payload.code) broadcastPairSuccess(payload.code, 'Mobile Device');
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

      try {
        // 1. Establish independent anonymous session on this device (no shared refresh_token!)
        const localAuthUid = await ensureAuth();
        let targetOwnerUid = payload.uid;

        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (localAuthUid && payload.code) {
          const { data: claimedOwner, error: claimErr } = await supabase.rpc('claim_pairing_code', {
            p_code: payload.code
          });
          if (!claimErr && typeof claimedOwner === 'string' && claimedOwner) {
            if (uuidRe.test(payload.uid) && claimedOwner !== payload.uid) {
              throw new Error('Pairing code owner mismatch');
            }
            targetOwnerUid = claimedOwner;
            await db.setSetting('syncOwnerId', claimedOwner);
          }
        }

        // 2. Query cloud entries when targetOwnerUid is a valid Supabase UUID;
        //    non-UUID P2P payloads or sleeping/unreachable cloud fall back to inline QR shifts.
        const isUuid = uuidRe.test(targetOwnerUid);
        let activeCloudEntries: Entry[] = [];
        if (isUuid) {
          const { data: cloudRows, error: fetchError } = await supabase
            .from('work_entries')
            .select('*')
            .eq('user_id', targetOwnerUid);
          if (fetchError) {
            if (p2pEntries.length === 0) throw fetchError;
            console.warn('Cloud fetch skipped during pairing, using inline QR entries:', fetchError.message);
          } else {
            activeCloudEntries = ((cloudRows as RawCloudEntryRow[] | null) || [])
              .filter(r => (r.deleted_at === null || r.deleted_at === undefined) && Number(r.hours) > 0)
              .map(fromWorkEntryRow);
          }
        }

        const combinedRemote = mergeEntries(p2pEntries, activeCloudEntries).merged;
        const localEntries = await db.getAllEntries();

        if (mode === 'overwrite') {
          await db.clearAll();
          if (combinedRemote.length > 0) {
            await db.saveMany(combinedRemote);
          }
          addToast(`${tr('Data replaced')}: ${combinedRemote.length} ${tr('entries')}`, 'success');
        } else {
          const mergeResult = mergeEntries(localEntries, combinedRemote);
          if (mergeResult.merged.length > 0) {
            await db.saveMany(mergeResult.merged);
          }

          if (localAuthUid && isUuid) {
            const deviceId = getDeviceId();
            const uploadPayload = mergeResult.merged.map((e) =>
              toWorkEntryRow(e, targetOwnerUid, deviceId)
            );
            if (uploadPayload.length > 0) {
              const { error: upsertError } = await supabase
                .from('work_entries')
                .upsert(uploadPayload, { onConflict: 'user_id,date' });
              if (upsertError) {
                console.warn('Pairing cloud upsert skipped (P2P local merge preserved):', upsertError.message);
              }
            }
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
        setIncomingPayload(null);
      } catch (err: unknown) {
        console.error('Pairing application error:', err);
        const msg = err instanceof Error ? err.message : tr('Sync error');
        addToast(msg, 'error');
        throw err;
      }
    },
    [addToast, broadcastPairSuccess, getDeviceId, haptic, loadEntries, strictOfflineMode, tr]
  );

  const resolvePairingCode = useCallback(async (code: string): Promise<PairingPayload> => {
    if (!supabase || strictOfflineMode) {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        return new Promise((resolve, reject) => {
          let settled = false;
          const bc = new BroadcastChannel(`pairing_${code}`);
          const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            bc.close();
            reject(new Error(tr('Manual code entry requires cloud connection. Please scan QR with camera.')));
          }, 1200);
          bc.onmessage = (ev) => {
            if (settled || ev.data?.type !== 'provide_payload') return;
            settled = true;
            clearTimeout(timer);
            bc.close();
            if (ev.data?.payload) resolve(ev.data.payload as PairingPayload);
            else reject(new Error(tr('Invalid response from device')));
          };
          bc.postMessage({ type: 'request_pairing', clientDeviceId: getDeviceId() });
        });
      }
      throw new Error(tr('Manual code entry requires cloud connection. Please scan QR with camera.'));
    }

    const client = supabase;
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
  }, [getDeviceId, strictOfflineMode, tr]);

  // Check URL fragment (#pair=...) and legacy query (?pair=...) upon initial boot
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rawHref = window.location.href;
    const hasHashPair = window.location.hash.includes('pair=');
    const hasSearchPair = window.location.search.includes('pair=');
    if (!hasHashPair && !hasSearchPair) return;

    const url = new URL(rawHref);
    url.searchParams.delete('pair');
    url.searchParams.delete('code');
    if (hasHashPair) url.hash = '';
    window.history.replaceState({}, document.title, url.toString());

    decodePairingPayloadAsync(rawHref).then((payload) => {
      if (payload && !isPairingPayloadExpired(payload)) {
        setIncomingPayload(payload);
      }
    }).catch(() => {});
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
    preparePairingSession,
    subscribeHostPairing,
    resolvePairingCode,
    exportPairingBackup
  };
};
