/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Scan, X, Smartphone, CheckCircle, RefreshCw, Share2, Database, Keyboard, Check } from 'lucide-react';
import { BrandedQRCode } from './BrandedQRCode';
import { QRScannerModal } from './QRScannerModal';
import {
  encodePairingPayload,
  buildPairingUrl,
  generatePairingCode,
  normalizePairingCode,
  PairingPayload
} from '../lib/device-pairing';
import { supabase, ensureAuth } from '../lib/supabase';
import { db } from '../lib/db';

interface DevicePairModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'light' | 'dark' | 'indigo';
  deviceId: string;
  localEntriesCount: number;
  onApplyPairing: (payload: PairingPayload, mode: 'merge' | 'overwrite') => Promise<void>;
  addToast: (msg: string, type?: 'info' | 'success' | 'error' | 'warning') => void;
  t?: (key: string) => string;
}

export const DevicePairModal: React.FC<DevicePairModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
  deviceId,
  localEntriesCount,
  onApplyPairing,
  addToast,
  t
}) => {
  const tr = t || ((k: string) => k);
  const [activeTab, setActiveTab] = useState<'show' | 'code'>('show');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [pairingUrl, setPairingUrl] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string>('');
  const [pairingCreatedAt, setPairingCreatedAt] = useState<number>(Date.now());
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<PairingPayload | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [manualCodeInput, setManualCodeInput] = useState<string>('');
  const [isResolvingCode, setIsResolvingCode] = useState(false);
  const [isPairedSuccess, setIsPairedSuccess] = useState(false);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
  const activePayloadRef = useRef<PairingPayload | null>(null);

  const isDark = theme !== 'light';

  const generateUrl = React.useCallback(async () => {
    setIsGenerating(true);
    try {
      const now = Date.now();
      const code = generatePairingCode();
      setPairingCode(code);

      // Case 1: Supabase available (cloud pairing without bloating QR with raw entries)
      if (supabase) {
        try {
          const cloudAuthPromise = (async () => {
            const uid = await ensureAuth();
            if (!uid) return null;
            const { data: { session } } = await supabase.auth.getSession();
            return { uid, session };
          })();
          const timeoutPromise = new Promise<null>((res) => setTimeout(() => res(null), 2500));
          const authResult = await Promise.race([cloudAuthPromise, timeoutPromise]);

          if (authResult?.session) {
            // Omit massive ~850-character access_token if refresh_token is present.
            // Target device exchanges rt via supabase.auth.refreshSession in 1 lightweight request.
            // This shrinks the QR string from ~1400 chars down to ~200 chars (Version 5 matrix with large chunky dots).
            const payload: PairingPayload = {
              v: 1,
              t: now,
              uid: authResult.session.user.id,
              dev: deviceId,
              code,
              ...(authResult.session.refresh_token
                ? { rt: authResult.session.refresh_token }
                : { at: authResult.session.access_token })
            };
            activePayloadRef.current = payload;
            const encoded = encodePairingPayload(payload);
            setPairingCreatedAt(now);
            setPairingUrl(buildPairingUrl(encoded, code));
            setIsGenerating(false);
            return;
          } else if (authResult?.uid) {
            const payload: PairingPayload = {
              v: 1,
              t: now,
              uid: authResult.uid,
              dev: deviceId,
              code
            };
            activePayloadRef.current = payload;
            const encoded = encodePairingPayload(payload);
            setPairingCreatedAt(now);
            setPairingUrl(buildPairingUrl(encoded, code));
            setIsGenerating(false);
            return;
          }
        } catch (cloudErr) {
          console.warn('Cloud session lookup failed, falling back to local pairing:', cloudErr);
        }
      }

      // Case 2: Offline / Local Pairing (Cloud is disabled, absent, or paused)
      const localEntries = await db.getAllEntries();
      const payload: PairingPayload = {
        v: 1,
        t: now,
        uid: deviceId,
        dev: deviceId,
        code
      };

      // Only embed inline entries if count is small (<= 8) to prevent QR matrix bloat
      if (localEntries.length > 0 && localEntries.length <= 8) {
        payload.entries = localEntries.map(e => ({
          date: e.date,
          hours: e.hours,
          updated_at: e.updated_at
        }));
      }

      activePayloadRef.current = payload;
      const encoded = encodePairingPayload(payload);
      setPairingCreatedAt(now);
      setPairingUrl(buildPairingUrl(encoded, code));
    } catch (err) {
      console.error('Failed to generate pairing payload:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [deviceId]);

  // Realtime channel listener for Host (Windows 11)
  useEffect(() => {
    if (!isOpen || !pairingCode) return;

    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
    let bc: BroadcastChannel | null = null;

    if (supabase) {
      const client = supabase;
      channel = client.channel(`pairing:${pairingCode}`);
      channel
        .on('broadcast', { event: 'request_pairing' }, () => {
          if (activePayloadRef.current && channel) {
            channel.send({
              type: 'broadcast',
              event: 'provide_payload',
              payload: { payload: activePayloadRef.current }
            });
          }
        })
        .on('broadcast', { event: 'device_paired' }, (msg: { payload?: { deviceName?: string } }) => {
          setConnectedDeviceName(msg.payload?.deviceName || 'Mobile Device');
          setIsPairedSuccess(true);
        })
        .subscribe();
    }

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel(`pairing_${pairingCode}`);
        bc.onmessage = (ev) => {
          if (ev.data?.type === 'device_paired') {
            setConnectedDeviceName(ev.data?.deviceName || 'Mobile Device');
            setIsPairedSuccess(true);
          }
        };
      } catch {
        // Ignored
      }
    }

    return () => {
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
      if (bc) {
        bc.close();
      }
    };
  }, [isOpen, pairingCode]);

  // Generate pairing URL whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;
    generateUrl();
  }, [isOpen, generateUrl]);

  const handleShareBackup = async () => {
    try {
      const allEntries = await db.getAllEntries();
      const data = { entries: allEntries, version: '1.0' };
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
  };

  const broadcastSuccessToHost = (code?: string) => {
    if (!code) return;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel(`pairing_${code}`);
        bc.postMessage({ type: 'device_paired', deviceName: 'Mobile Device', timestamp: Date.now() });
        setTimeout(() => bc.close(), 1000);
      } catch {
        // Ignored
      }
    }
    if (supabase) {
      const client = supabase;
      const ch = client.channel(`pairing:${code}`);
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          ch.send({
            type: 'broadcast',
            event: 'device_paired',
            payload: { deviceName: 'Mobile Device' }
          });
          setTimeout(() => {
            ch.send({
              type: 'broadcast',
              event: 'device_paired',
              payload: { deviceName: 'Mobile Device' }
            });
            client.removeChannel(ch);
          }, 350);
        }
      });
    }
  };

  const handleScanSuccess = (payload: PairingPayload) => {
    setIsScannerOpen(false);
    if (payload.uid === deviceId) {
      addToast(tr('You scanned the code of this same device'), 'info');
      return;
    }

    if (payload.code) {
      broadcastSuccessToHost(payload.code);
    }

    if (localEntriesCount > 0) {
      setPendingPayload(payload);
    } else {
      executePairing(payload, 'merge');
    }
  };

  const executePairing = async (payload: PairingPayload, mode: 'merge' | 'overwrite') => {
    setIsApplying(true);
    try {
      await onApplyPairing(payload, mode);
      setPendingPayload(null);
      setConnectedDeviceName('Windows 11');
      setIsPairedSuccess(true);
      if (payload.code) {
        broadcastSuccessToHost(payload.code);
      }
    } catch {
      addToast(tr('Failed to apply pairing'), 'error');
    } finally {
      setIsApplying(false);
    }
  };

  const handleManualCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = manualCodeInput.trim().toUpperCase();
    if (cleanCode.replace(/-/g, '').length < 8) return;

    if (!supabase) {
      addToast(tr('Manual code entry requires cloud connection. Please scan QR with camera.'), 'warning');
      return;
    }

    setIsResolvingCode(true);
    const client = supabase;
    const channel = client.channel(`pairing:${cleanCode}`);

    const timeout = setTimeout(() => {
      client.removeChannel(channel);
      setIsResolvingCode(false);
      addToast(tr('Pairing code not found or timed out.'), 'error');
    }, 8000);

    channel
      .on('broadcast', { event: 'provide_payload' }, (msg: { payload?: { payload?: PairingPayload } }) => {
        clearTimeout(timeout);
        const resolvedPayload = msg.payload?.payload;
        if (!resolvedPayload) {
          setIsResolvingCode(false);
          client.removeChannel(channel);
          addToast(tr('Invalid payload received'), 'error');
          return;
        }

        try {
          broadcastSuccessToHost(cleanCode);
          handleScanSuccess(resolvedPayload);
        } catch {
          addToast(tr('Failed to apply pairing'), 'error');
        } finally {
          setIsResolvingCode(false);
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'request_pairing',
            payload: { clientDeviceId: deviceId }
          });
        }
      });
  };

  const handleClose = () => {
    setIsPairedSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className={`relative w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
        isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${
          isDark ? 'border-zinc-800/80' : 'border-zinc-200'
        }`}>
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#d4af37]" />
            <h3 className={`font-bold text-base ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {tr('Device Pairing')}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className={`p-1.5 rounded-full transition-colors ${
              isDark ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isPairedSuccess ? (
          /* Synchronous Realtime Success State (Elara pattern: You're linked / Device connected) */
          <div className="p-8 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 relative">
              <div className="absolute inset-0 rounded-full bg-emerald-400/10 animate-ping" />
              <Check className="w-10 h-10 relative z-10 stroke-[2.5]" />
            </div>
            <h4 className={`text-xl font-black tracking-tight mb-2 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
              {tr('Device Connected')}
            </h4>
            <p className="text-xs text-zinc-400 max-w-xs mb-6 leading-relaxed">
              {tr('Connected to')} <span className="font-bold text-emerald-400">{connectedDeviceName || tr('other device')}</span>. {tr('Your work shifts and database are now synchronized.')}
            </p>
            <button
              onClick={handleClose}
              className="py-2.5 px-8 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              {tr('Done')}
            </button>
          </div>
        ) : (
          <>
            {/* Tab switch */}
            <div className={`flex p-1.5 mx-4 mt-4 rounded-xl border ${
              isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
            }`}>
              <button
                onClick={() => setActiveTab('show')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'show'
                    ? isDark
                      ? 'bg-zinc-800 text-[#d4af37] shadow'
                      : 'bg-white text-zinc-900 shadow'
                    : isDark
                      ? 'text-zinc-400 hover:text-zinc-200'
                      : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>{tr('Show QR')}</span>
              </button>
              <button
                onClick={() => setActiveTab('code')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'code'
                    ? isDark
                      ? 'bg-zinc-800 text-[#d4af37] shadow'
                      : 'bg-white text-zinc-900 shadow'
                    : isDark
                      ? 'text-zinc-400 hover:text-zinc-200'
                      : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Keyboard className="w-4 h-4" />
                <span>{tr('Have a code?')}</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 flex flex-col items-center">
              {pendingPayload ? (
                /* Confirmation Dialog for existing local entries */
                <div className="w-full flex flex-col items-center py-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#d4af37]/10 flex items-center justify-center text-[#d4af37] mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h4 className={`text-sm font-bold mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {tr('Device Detected')}
                  </h4>
                  <p className="text-xs text-zinc-400 mb-4 max-w-xs">
                    {tr('Local entries detected on this device. Choose how to apply pairing:')}
                  </p>

                  <div className="flex flex-col gap-2.5 w-full">
                    <button
                      disabled={isApplying}
                      onClick={() => executePairing(pendingPayload, 'merge')}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#d4af37] hover:bg-[#c29e2f] text-black transition-all flex items-center justify-center gap-2 shadow"
                    >
                      {isApplying ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                      <span>{tr('Merge entries (Smart Merge)')}</span>
                    </button>
                    <button
                      disabled={isApplying}
                      onClick={() => executePairing(pendingPayload, 'overwrite')}
                      className={`w-full py-2 px-4 rounded-xl text-xs font-semibold border transition-all ${
                        isDark
                          ? 'border-zinc-800 text-zinc-300 hover:bg-zinc-900'
                          : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      <span>{tr('Overwrite local data with cloud')}</span>
                    </button>
                    <button
                      disabled={isApplying}
                      onClick={() => setPendingPayload(null)}
                      className="w-full py-2 px-4 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 transition-all"
                    >
                      {tr('Cancel')}
                    </button>
                  </div>
                </div>
              ) : activeTab === 'show' ? (
                /* Show QR Tab */
                isGenerating ? (
                  <div className="flex flex-col items-center justify-center h-64 gap-3">
                    <RefreshCw className="w-8 h-8 text-[#d4af37] animate-spin" />
                    <span className="text-xs text-zinc-400">{tr('Generating secure code...')}</span>
                  </div>
                ) : pairingUrl ? (
                  <>
                    <BrandedQRCode
                      url={pairingUrl}
                      createdAt={pairingCreatedAt}
                      code={pairingCode}
                      isSuccess={isPairedSuccess}
                      statusText={isPairedSuccess ? tr('Linked with device') : tr('Ready for Windows 11')}
                      theme={theme}
                      t={tr}
                      onCopied={() => addToast(tr('Pairing link copied'), 'success')}
                      onRefresh={generateUrl}
                    />
                    {localEntriesCount > 15 && (
                      <div className={`mt-4 w-full p-3.5 rounded-2xl border text-center transition-all ${
                        isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                      }`}>
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <Database className="w-4 h-4 text-[#d4af37]" />
                          <span className={`text-xs font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>
                            {tr('Full database')}: {localEntriesCount} {tr('days')}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mb-2.5 leading-relaxed">
                          {tr('QR pairs devices. To quickly transfer complete history, share database file.')}
                        </p>
                        <button
                          onClick={handleShareBackup}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 shadow-sm ${
                            isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700' : 'bg-white hover:bg-zinc-100 text-zinc-900 border-zinc-300'
                          }`}
                        >
                          <Share2 className="w-3.5 h-3.5 text-[#d4af37]" />
                          <span>{tr('Share database file (.json)')}</span>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                    <p className="text-xs text-zinc-400 mb-2">
                      {tr('Cloud connection required for pairing.')}
                    </p>
                  </div>
                )
              ) : (
                /* Have a Code Tab (Scan Camera or Manual Typing) */
                <div className="w-full flex flex-col items-center py-4 px-2 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/20 flex items-center justify-center text-[#d4af37] mb-3">
                    <Smartphone className="w-7 h-7" />
                  </div>
                  <h4 className={`text-sm font-bold mb-1 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                    {tr('Connect Device')}
                  </h4>
                  <p className="text-xs text-zinc-400 mb-4 max-w-xs leading-relaxed">
                    {tr('Scan the QR code from Windows 11 with your camera, or enter the 8-character code displayed under it.')}
                  </p>

                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#d4af37] hover:bg-[#c29e2f] text-black transition-all flex items-center justify-center gap-2 shadow active:scale-98 mb-4"
                  >
                    <Scan className="w-4 h-4" />
                    <span>{tr('Open Scanner')}</span>
                  </button>

                  <div className="w-full flex items-center gap-3 my-1">
                    <div className={`flex-1 h-px ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                      {tr('Or enter code')}
                    </span>
                    <div className={`flex-1 h-px ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                  </div>

                  <form onSubmit={handleManualCodeSubmit} className="w-full flex flex-col gap-2 mt-2">
                    <input
                      type="text"
                      maxLength={9}
                      placeholder="6Q9E-VUBT"
                      value={manualCodeInput}
                      onChange={(e) => setManualCodeInput(normalizePairingCode(e.target.value))}
                      className={`w-full py-2.5 px-3 rounded-xl text-center font-mono text-base font-bold tracking-widest border transition-all uppercase outline-none focus:ring-2 focus:ring-[#d4af37] ${
                        isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100' : 'bg-zinc-100 border-zinc-200 text-zinc-900'
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={manualCodeInput.replace(/-/g, '').length < 8 || isResolvingCode}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none active:scale-98"
                    >
                      {isResolvingCode ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                      <span>{isResolvingCode ? tr('Connecting...') : tr('Link with code')}</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Camera scanner sub-modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
        onSwitchToManualCode={() => {
          setIsScannerOpen(false);
          setActiveTab('code');
        }}
        t={tr}
      />
    </div>
  );
};
