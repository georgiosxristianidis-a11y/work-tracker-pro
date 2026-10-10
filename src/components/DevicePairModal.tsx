/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { QrCode, Scan, X, Smartphone, CheckCircle, RefreshCw } from 'lucide-react';
import { BrandedQRCode } from './BrandedQRCode';
import { QRScannerModal } from './QRScannerModal';
import {
  encodePairingPayload,
  buildPairingUrl,
  PairingPayload
} from '../lib/device-pairing';
import { supabase, ensureAuth } from '../lib/supabase';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<PairingPayload | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const isDark = theme !== 'light';

  // Generate pairing URL whenever the modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function generateUrl() {
      setIsGenerating(true);
      try {
        if (!supabase) {
          addToast('Supabase не подключен в .env', 'warning');
          setIsGenerating(false);
          return;
        }

        const userId = await ensureAuth();
        const { data: { session } } = await supabase.auth.getSession();

        if (session && isMounted) {
          const payload: PairingPayload = {
            v: 1,
            t: Date.now(),
            uid: session.user.id,
            at: session.access_token,
            rt: session.refresh_token,
            dev: deviceId
          };
          const encoded = encodePairingPayload(payload);
          setPairingUrl(buildPairingUrl(encoded));
        } else if (userId && isMounted) {
          const payload: PairingPayload = {
            v: 1,
            t: Date.now(),
            uid: userId,
            dev: deviceId
          };
          const encoded = encodePairingPayload(payload);
          setPairingUrl(buildPairingUrl(encoded));
        }
      } catch (err) {
        console.error('Failed to generate pairing payload:', err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    }

    generateUrl();

    return () => {
      isMounted = false;
    };
  }, [isOpen, deviceId, addToast]);

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
              <BrandedQRCode
                url={pairingUrl}
                theme={theme}
                onCopied={() => addToast('Ссылка сопряжения скопирована', 'success')}
              />
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
