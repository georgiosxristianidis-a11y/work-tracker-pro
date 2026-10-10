/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { Copy, Check, Share2 } from 'lucide-react';

interface BrandedQRCodeProps {
  url: string;
  theme?: 'light' | 'dark' | 'indigo';
  onCopied?: () => void;
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

export const BrandedQRCode: React.FC<BrandedQRCodeProps> = ({ url, theme = 'dark', onCopied }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const [copied, setCopied] = useState(false);

  const isDark = theme !== 'light';
  const dotsColor = isDark ? '#f4f4f5' : '#15171e';
  const cornerColor = '#d4af37'; // Revolut-style gold accent
  const bgColor = isDark ? '#15171e' : '#ffffff';

  useEffect(() => {
    if (!containerRef.current) return;

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
          errorCorrectionLevel: 'H'
        },
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.32,
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
        dotsOptions: { color: dotsColor, type: 'rounded' },
        cornersSquareOptions: { color: cornerColor, type: 'extra-rounded' },
        cornersDotOptions: { color: dotsColor, type: 'dot' },
        backgroundOptions: { color: bgColor }
      });
    }
  }, [url, isDark, dotsColor, cornerColor, bgColor]);

  const handleCopy = async () => {
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
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Work Tracker Pro — Синхронизация',
          text: 'Ссылка для привязки и синхронизации Work Tracker Pro между устройствами',
          url
        });
      } catch {
        // Ignored if user cancels share dialog
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
        {/* Subtle gold badge in corner */}
        <div className="absolute top-2.5 right-3 text-[10px] font-bold tracking-wider text-[#d4af37] uppercase select-none">
          SECURE SYNC
        </div>

        <div
          ref={containerRef}
          className="flex items-center justify-center rounded-2xl overflow-hidden"
          style={{ width: 250, height: 250 }}
        />
      </div>

      <p className="mt-3 text-xs text-center text-zinc-400 max-w-[270px]">
        Наведите камеру смартфона для быстрого сопряжения и общей базы данных
      </p>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-4 w-full max-w-[280px]">
        <button
          onClick={handleCopy}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all active:scale-95 border ${
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
            className={`flex items-center justify-center p-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 border ${
              isDark
                ? 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-800'
            }`}
            title="Поделиться"
          >
            <Share2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
