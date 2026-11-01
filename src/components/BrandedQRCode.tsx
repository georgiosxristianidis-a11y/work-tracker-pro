/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { Copy, Check, Share2, Clock, RotateCw, AlertTriangle } from 'lucide-react';
import {
  getPairingRemainingSeconds,
  formatCountdown,
  PAIRING_QR_TTL_MS
} from '../lib/device-pairing';

interface BrandedQRCodeProps {
  url: string;
  createdAt: number;
  code?: string;
  statusText?: string;
  isSuccess?: boolean;
  theme?: 'light' | 'dark' | 'indigo';
  t?: (key: string) => string;
  onCopied?: () => void;
  onRefresh?: () => void;
}


export const BrandedQRCode: React.FC<BrandedQRCodeProps> = ({
  url,
  createdAt,
  code,
  statusText,
  isSuccess = false,
  theme = 'dark',
  t,
  onCopied,
  onRefresh
}) => {
  const tr = t || ((k: string) => k);
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [remainingSec, setRemainingSec] = useState(() => getPairingRemainingSeconds(createdAt));
  const [renderError, setRenderError] = useState<string | null>(null);

  const isDark = theme !== 'light';
  const dotsColor = isDark ? '#f4f4f5' : '#15171e';
  const cornerColor = '#d4af37'; // Revolut-style gold accent
  const bgColor = isDark ? '#15171e' : '#ffffff';

  // Live countdown timer
  useEffect(() => {
    setRemainingSec(getPairingRemainingSeconds(createdAt));
    const interval = setInterval(() => {
      const left = getPairingRemainingSeconds(createdAt);
      setRemainingSec(left);
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  const isExpired = remainingSec <= 0;
  const progressPct = Math.max(0, Math.min(100, (remainingSec / (PAIRING_QR_TTL_MS / 1000)) * 100));

  useEffect(() => {
    if (!containerRef.current || !url) return;

    try {
      setRenderError(null);
      if (!qrCodeRef.current) {
        qrCodeRef.current = new QRCodeStyling({
          width: 260,
          height: 260,
          type: 'svg',
          data: url,
          margin: 6,
          qrOptions: {
            typeNumber: 0,
            mode: 'Byte',
            errorCorrectionLevel: 'Q'
          },
          dotsOptions: {
            color: dotsColor,
            type: 'dots',
            roundSize: true
          },
          cornersSquareOptions: {
            color: dotsColor,
            type: 'extra-rounded'
          },
          cornersDotOptions: {
            color: dotsColor,
            type: 'dot'
          },
          backgroundOptions: {
            color: bgColor
          }
        });
        containerRef.current.innerHTML = '';
        qrCodeRef.current.append(containerRef.current);
      } else {
        qrCodeRef.current.update({
          data: url,
          qrOptions: {
            typeNumber: 0,
            mode: 'Byte',
            errorCorrectionLevel: 'Q'
          },
          dotsOptions: { color: dotsColor, type: 'dots', roundSize: true },
          cornersSquareOptions: { color: dotsColor, type: 'extra-rounded' },
          cornersDotOptions: { color: dotsColor, type: 'dot' },
          backgroundOptions: { color: bgColor }
        });
      }
    } catch (err) {
      console.warn('QR code generation overflow or error:', err);
      setRenderError(tr('Too many entries'));
    }
  }, [url, isDark, dotsColor, bgColor, tr]);

  const handleCopyCode = async () => {
    if (!code || isExpired) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Ignored
    }
  };

  const handleCopy = async () => {
    if (isExpired) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    if (isExpired) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Work Tracker Pro — ${tr('Device Pairing')}`,
          text: tr('Pairing link for Work Tracker Pro'),
          url
        });
      } catch {
        // Ignored
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Revolut-style modern card frame */}
      <div className={`relative p-5 rounded-3xl border shadow-xl transition-all ${
        isDark
          ? 'bg-[#15171e] border-white/10 shadow-black/40'
          : 'bg-white border-zinc-200 shadow-zinc-200'
      }`}>
        {/* Top badges */}
        <div className="flex items-center justify-between w-full mb-2">
          <span className="text-[10px] font-bold tracking-wider text-[#d4af37] uppercase select-none">
            SECURE SYNC
          </span>

          {/* Countdown timer badge */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800/80 border border-zinc-700/80 text-zinc-300">
            {isExpired ? (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {tr('Expired')}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-zinc-300">
                <Clock className="w-3 h-3 text-[#d4af37]" />
                {formatCountdown(remainingSec)}
              </span>
            )}
          </div>
        </div>

        {/* QR Code Container with Expired Overlay */}
        <div className="relative rounded-2xl overflow-hidden" style={{ minWidth: 260, minHeight: 260 }}>
          <div
            ref={containerRef}
            data-testid="branded-qr-canvas"
            className={`flex items-center justify-center transition-all ${
              isExpired || renderError ? 'opacity-20 blur-[2px]' : 'opacity-100'
            }`}
            style={{ width: 260, height: 260 }}
          />

          {/* Centered Brand Logo Badge Overlay (Reference-style Island Badge) */}
          {!isExpired && !renderError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-12 h-12 rounded-2xl p-1 shadow-lg border flex items-center justify-center transition-transform ${
                isDark ? 'bg-[#15171e] border-[#15171e]' : 'bg-white border-white'
              }`}>
                <div className="w-full h-full rounded-xl bg-zinc-900 border border-zinc-700/80 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                  <span className="text-[13px] font-black text-white tracking-tighter leading-none select-none">
                    27
                  </span>
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-[#d4af37]" />
                </div>
              </div>
            </div>
          )}

          {renderError && !isExpired && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-zinc-900/90 rounded-2xl text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
              <p className="text-xs font-bold text-zinc-200 mb-1">{tr('Too many entries')}</p>
              <p className="text-[11px] text-zinc-400 max-w-[200px] leading-tight mb-2">
                {tr('Use "Backup Data" in settings to transfer full history.')}
              </p>
            </div>
          )}

          {isExpired && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/60 rounded-2xl text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
              <p className="text-xs font-bold text-white mb-3">{tr('Code expired')}</p>
              <button
                onClick={onRefresh}
                className="py-2 px-4 rounded-xl text-xs font-bold bg-[#d4af37] text-black hover:bg-[#c29e2f] transition-all flex items-center gap-1.5 shadow"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{tr('Refresh code')}</span>
              </button>
            </div>
          )}
        </div>

        {/* TTL Progress Line */}
        {!isExpired && (
          <div className="w-full h-1 bg-zinc-800 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#d4af37] to-amber-300 transition-all duration-1000"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* Bottom Status Indicator Pill (Reference photo: "Extension Installed" style) */}
        <div className={`mt-3.5 pt-3 border-t flex items-center justify-between w-full text-[11px] ${
          isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-100 text-zinc-500'
        }`}>
          <span className="font-semibold text-xs tracking-tight">
            {statusText || (isSuccess ? tr('Connected') : tr('Windows 11 Pairing'))}
          </span>
          <div className="flex items-center gap-1.5">
            {isSuccess ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <Check className="w-3.5 h-3.5" />
                <span>{tr('Linked')}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span>{tr('Ready to scan')}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 8-Character Fallback Code Display (Elara pattern: 6Q9E VUBT) */}
      {code && !isExpired && (
        <div className={`mt-3.5 w-full max-w-[280px] p-3 rounded-2xl border text-center transition-all ${
          isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
        }`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
            {tr('Or enter code on other device')}
          </span>
          <div className="flex items-center justify-between gap-2 bg-black/30 dark:bg-zinc-950 px-3 py-1.5 rounded-xl border border-white/5">
            <span className="font-mono text-base font-black tracking-widest text-[#d4af37] select-all">
              {code}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors"
              title={tr('Copy')}
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-center text-zinc-400 max-w-[270px]">
        {isExpired
          ? tr('Tap "Refresh code" to generate a fresh pairing key')
          : tr('Point smartphone camera for instant pairing and shared database')}
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-4 w-full max-w-[280px]">
        <button
          onClick={handleCopy}
          disabled={isExpired}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all active:scale-95 border disabled:opacity-40 disabled:pointer-events-none ${
            copied
              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
              : isDark
                ? 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-800'
          }`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? tr('Copied!') : tr('Copy')}</span>
        </button>

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            onClick={handleShare}
            disabled={isExpired}
            className={`flex items-center justify-center p-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 border disabled:opacity-40 disabled:pointer-events-none ${
              isDark
                ? 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-800'
            }`}
            title={tr('Share')}
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}

        {onRefresh && (
          <button
            onClick={onRefresh}
            className={`flex items-center justify-center p-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 border ${
              isDark
                ? 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-800'
            }`}
            title={tr('Refresh code')}
          >
            <RotateCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
