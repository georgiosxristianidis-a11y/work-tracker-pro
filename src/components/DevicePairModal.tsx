/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { QrCode, Scan, X, Smartphone, CheckCircle, RefreshCw, Share2, Database } from 'lucide-react';
import { BrandedQRCode } from './BrandedQRCode';
import { QRScannerModal } from './QRScannerModal';
import {
  encodePairingPayload,
  buildPairingUrl,
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
}

export const DevicePairModal: React.FC<DevicePairModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark',
  deviceId,
  localEntriesCount,
  onApplyPairing,
  addToast
}) => {
  const [activeTab, setActiveTab] = useState<'show' | 'scan'>('show');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [pairingUrl, setPairingUrl] = useState<string>('');
  const [pairingCreatedAt, setPairingCreatedAt] = useState<number>(Date.now());
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<PairingPayload | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const isDark = theme !== 'light';

  const generateUrl = React.useCallback(async () => {
    setIsGenerating(true);
    try {
      const now = Date.now();

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
              ...(authResult.session.refresh_token
                ? { rt: authResult.session.refresh_token }
                : { at: authResult.session.access_token })
            };
            const encoded = encodePairingPayload(payload);
            setPairingCreatedAt(now);
            setPairingUrl(buildPairingUrl(encoded));
            setIsGenerating(false);
            return;
          } else if (authResult?.uid) {
            const payload: PairingPayload = {
              v: 1,
              t: now,
              uid: authResult.uid,
              dev: deviceId
            };
            const encoded = encodePairingPayload(payload);
            setPairingCreatedAt(now);
            setPairingUrl(buildPairingUrl(encoded));
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
        dev: deviceId
      };

      // Only embed inline entries if count is small (<= 8) to prevent QR matrix bloat
      if (localEntries.length > 0 && localEntries.length <= 8) {
        payload.entries = localEntries.map(e => ({
          date: e.date,
          hours: e.hours,
          updated_at: e.updated_at
        }));
      }

      const encoded = encodePairingPayload(payload);
      setPairingCreatedAt(now);
      setPairingUrl(buildPairingUrl(encoded));
    } catch (err) {
      console.error('Failed to generate pairing payload:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [deviceId]);

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
          title: 'Work Tracker Pro — Резервная копия базы',
          text: `База смен (${allEntries.length} записей)`
        });
        addToast('Файл бэкапа отправлен', 'success');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'work-tracker-backup.json';
        a.click();
        URL.revokeObjectURL(url);
        addToast('Файл бэкапа скачан (.json)', 'success');
      }
    } catch (err) {
      console.warn('Share backup cancelled or failed:', err);
    }
  };

  const handleScanSuccess = (payload: PairingPayload) => {
    setIsScannerOpen(false);
    if (payload.uid === deviceId) {
      addToast('Вы отсканировали код этого же устройства', 'info');
      return;
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
      onClose();
    } catch {
      addToast('Ошибка применения сопряжения', 'error');
    } finally {
      setIsApplying(false);
    }
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
              Синхронизация устройств
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors ${
              isDark ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

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
            <span>Показать QR</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('scan');
              setIsScannerOpen(true);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'scan'
                ? isDark
                  ? 'bg-zinc-800 text-[#d4af37] shadow'
                  : 'bg-white text-zinc-900 shadow'
                : isDark
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Scan className="w-4 h-4" />
            <span>Сканировать</span>
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
                Обнаружено устройство
              </h4>
              <p className="text-xs text-zinc-400 mb-4 max-w-xs">
                На этом устройстве есть {localEntriesCount} сохраненных записей. Как вы хотите применить синхронизацию?
              </p>

              <div className="flex flex-col gap-2.5 w-full">
                <button
                  disabled={isApplying}
                  onClick={() => executePairing(pendingPayload, 'merge')}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#d4af37] hover:bg-[#c29e2f] text-black transition-all flex items-center justify-center gap-2 shadow"
                >
                  {isApplying ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  <span>Объединить записи (Smart Merge)</span>
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
                  <span>Заменить локальные данные облачными</span>
                </button>
                <button
                  disabled={isApplying}
                  onClick={() => setPendingPayload(null)}
                  className="w-full py-2 px-4 rounded-xl text-xs text-zinc-400 hover:text-zinc-200 transition-all"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : activeTab === 'show' ? (
            /* Show QR Tab */
            isGenerating ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3">
                <RefreshCw className="w-8 h-8 text-[#d4af37] animate-spin" />
                <span className="text-xs text-zinc-400">Формирование защищенного кода...</span>
              </div>
            ) : pairingUrl ? (
              <>
                <BrandedQRCode
                  url={pairingUrl}
                  createdAt={pairingCreatedAt}
                  theme={theme}
                  onCopied={() => addToast('Ссылка сопряжения скопирована', 'success')}
                  onRefresh={generateUrl}
                />
                {localEntriesCount > 15 && (
                  <div className={`mt-4 w-full p-3.5 rounded-2xl border text-center transition-all ${
                    isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                  }`}>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Database className="w-4 h-4 text-[#d4af37]" />
                      <span className={`text-xs font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>
                        Полная база: {localEntriesCount} смен
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mb-2.5 leading-relaxed">
                      QR связывает устройства. Для мгновенного переноса всей истории передайте файл базы данных.
                    </p>
                    <button
                      onClick={handleShareBackup}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 shadow-sm ${
                        isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700' : 'bg-white hover:bg-zinc-100 text-zinc-900 border-zinc-300'
                      }`}
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>Поделиться файлом базы (.json)</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <p className="text-xs text-zinc-400 mb-2">
                  Для сопряжения необходима настройка облачного подключения.
                </p>
              </div>
            )
          ) : (
            /* Scan QR Tab */
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-[#d4af37]/10 flex items-center justify-center text-[#d4af37]">
                <Scan className="w-8 h-8" />
              </div>
              <p className="text-xs text-zinc-400 max-w-xs">
                Нажмите кнопку ниже, чтобы включить камеру и отсканировать код со второго экрана
              </p>
              <button
                onClick={() => setIsScannerOpen(true)}
                className="py-2.5 px-6 rounded-xl text-xs font-bold bg-[#d4af37] hover:bg-[#c29e2f] text-black transition-all shadow active:scale-95 flex items-center gap-2"
              >
                <Scan className="w-4 h-4" />
                <span>Открыть сканер</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Camera scanner sub-modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
};
