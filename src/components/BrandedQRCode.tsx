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
  theme?: 'light' | 'dark' | 'indigo';
  onCopied?: () => void;
  onRefresh?: () => void;
}

const BRAND_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <clipPath id="logo-clip">
      <rect x="5" y="5" width="90" height="90" rx="20" />
    </clipPath>
    <mask id="logo-mask">
      <rect x="0" y="0" width="100" height="100" fill="white" />
      <path d="M-10 25 L25 -10" stroke="black" stroke-width="12" />
      <path d="M75 110 L110 75" stroke="black" stroke-width="12" />
    </mask>
  </defs>
  <rect width="100" height="100" rx="20" fill="#15171e" />
  <rect x="5" y="5" width="90" height="90" rx="20" stroke="#f4f4f5" stroke-width="8" mask="url(#logo-mask)" />
  <text x="50" y="54" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="46" font-weight="900" text-anchor="middle" dominant-baseline="middle" fill="#f4f4f5">27</text>
  <g clip-path="url(#logo-clip)">
    <rect x="5" y="90" width="90" height="10" fill="#d4af37"/>
  </g>
</svg>`;

const BRAND_LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(BRAND_LOGO_SVG)}`;

export const BrandedQRCode: React.FC<BrandedQRCodeProps> = ({
  url,
  createdAt,
  theme = 'dark',
  onCopied,
  onRefresh
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const [copied, setCopied] = useState(false);
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
          width: 250,
          height: 250,
          type: 'svg',
          data: url,
          image: BRAND_LOGO_DATA_URL,
          margin: 6,
          qrOptions: {
            typeNumber: 0,
            mode: 'Byte',
            errorCorrectionLevel: 'M'
          },
          imageOptions: {
            hideBackgroundDots: true,
            imageSize: 0.28,
            margin: 4,
            crossOrigin: 'anonymous'
          },
          dotsOptions: {
            color: dotsColor,
            type: 'rounded'
          },
          cornersSquareOptions: {
            color: cornerColor,
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
            errorCorrectionLevel: 'M'
          },
          dotsOptions: { color: dotsColor, type: 'rounded' },
          cornersSquareOptions: { color: cornerColor, type: 'extra-rounded' },
          cornersDotOptions: { color: dotsColor, type: 'dot' },
          backgroundOptions: { color: bgColor }
        });
      }
    } catch (err) {
      console.warn('QR code generation overflow or error:', err);
      setRenderError('Слишком большой объем данных для одного QR-кода.');
    }
  }, [url, isDark, dotsColor, cornerColor, bgColor]);

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
          title: 'Work Tracker Pro — Синхронизация',
          text: 'Ссылка для привязки и синхронизации Work Tracker Pro между устройствами',
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
                Истёк
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
        <div className="relative rounded-2xl overflow-hidden" style={{ minWidth: 250, minHeight: 250 }}>
          <div
            ref={containerRef}
            className={`flex items-center justify-center transition-all ${
              isExpired || renderError ? 'opacity-20 blur-[2px]' : 'opacity-100'
            }`}
            style={{ width: 250, height: 250 }}
          />

          {renderError && !isExpired && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-zinc-900/90 rounded-2xl text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
              <p className="text-xs font-bold text-zinc-200 mb-1">Слишком много записей</p>
              <p className="text-[11px] text-zinc-400 max-w-[200px] leading-tight mb-2">
                Для передачи полной истории используйте «Файл бэкапа» в настройках.
              </p>
            </div>
          )}

          {isExpired && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/60 rounded-2xl text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
              <p className="text-xs font-bold text-white mb-3">Срок действия кода истёк</p>
              <button
                onClick={onRefresh}
                className="py-2 px-4 rounded-xl text-xs font-bold bg-[#d4af37] text-black hover:bg-[#c29e2f] transition-all flex items-center gap-1.5 shadow"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Обновить код</span>
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
      </div>

      <p className="mt-3 text-xs text-center text-zinc-400 max-w-[270px]">
        {isExpired
          ? 'Нажмите «Обновить код», чтобы сгенерировать свежий ключ сопряжения'
          : 'Наведите камеру смартфона для быстрого сопряжения и общей базы данных'}
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
          <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
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
            title="Поделиться"
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
            title="Обновить код"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
