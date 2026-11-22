import React, { useEffect, useRef, useState, useCallback } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { Check, Copy, AlertTriangle, RotateCw, Clock } from 'lucide-react';
import { getPairingRemainingSeconds, PAIRING_QR_TTL_MS } from '../lib/device-pairing';

export interface BrandedQRCodeProps {
  url: string;
  createdAt: number;
  code?: string;
  statusText?: string;
  isSuccess?: boolean;
  theme?: string;
  t?: (key: string) => string;
  onCopied?: () => void;
  onRefresh?: () => void;
}

function formatCountdown(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [remainingSec, setRemainingSec] = useState(() => getPairingRemainingSeconds(createdAt));
  const [renderError, setRenderError] = useState<string | null>(null);

  const isDark = theme !== 'light';

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

      // Dark modules on a white plate in every theme. Theme-coloured codes were inverted in dark
      // mode and had low-contrast gold finder patterns in light mode; strict decoders rejected both.
      // Level M keeps the matrix sparse: H/Q made the code too dense to read at a distance
      // (verified with jsQR at 30% scale), and the 36px logo covers far less than 15% of the area.
      const qrDotsColor = '#0b0f19';
      const qrCornersColor = '#0b0f19';
      const qrBgColor = '#ffffff';

      if (!qrCodeRef.current) {
        qrCodeRef.current = new QRCodeStyling({
          width: 250,
          height: 250,
          type: 'svg',
          data: url,
          margin: 12,
          qrOptions: {
            typeNumber: 0,
            mode: 'Byte',
            errorCorrectionLevel: 'M'
          },
          dotsOptions: {
            color: qrDotsColor,
            type: 'rounded'
          },
          cornersSquareOptions: {
            color: qrCornersColor,
            type: 'extra-rounded'
          },
          cornersDotOptions: {
            color: qrCornersColor,
            type: 'dot'
          },
          backgroundOptions: {
            color: qrBgColor
          }
        });

        containerRef.current.replaceChildren();
        qrCodeRef.current.append(containerRef.current);
      } else {
        qrCodeRef.current.update({
          data: url,
          qrOptions: {
            errorCorrectionLevel: 'M'
          },
          dotsOptions: {
            color: qrDotsColor,
            type: 'rounded'
          },
          cornersSquareOptions: {
            color: qrCornersColor,
            type: 'extra-rounded'
          },
          cornersDotOptions: {
            color: qrCornersColor,
            type: 'dot'
          },
          backgroundOptions: {
            color: qrBgColor
          }
        });
      }
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      setRenderError(err instanceof Error ? err.message : 'QR code generation failed');
    }
  }, [url, isDark, theme]);

  const tr = useCallback((key: string): string => {
    return t ? t(key) : key;
  }, [t]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (onCopied) onCopied();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  }, [url, onCopied]);

  const handleCopyCode = useCallback(async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  }, [code]);

  return (
    <div className="flex flex-col items-center">
      {/* Apple Glass modern card frame */}
      <div className="relative p-5 rounded-card apple-glass-panel border border-[var(--b)] shadow-xl transition-all">
        {/* Top badges */}
        <div className="flex items-center justify-between w-full mb-2">
          <span className="text-[10px] font-bold tracking-wider text-[var(--a)] uppercase select-none">
            SECURE SYNC
          </span>

          {/* Countdown timer badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg)] border border-[var(--b)] text-[var(--t2)]">
            {isExpired ? (
              <span className="text-[var(--danger)] flex items-center gap-1 font-bold">
                <AlertTriangle className="w-3 h-3" />
                {tr('Expired')}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[var(--t2)] font-semibold tabular-nums">
                <Clock className="w-3 h-3 text-[var(--a)]" />
                {formatCountdown(remainingSec)}
              </span>
            )}
          </div>
        </div>

        {/* QR Code Container with White Quiet Zone Plate and Expired Overlay */}
        <div className="relative rounded-2xl overflow-hidden p-2.5 bg-white shadow-md flex items-center justify-center" style={{ minWidth: 260, minHeight: 260 }}>
          <div
            ref={containerRef}
            data-testid="branded-qr-canvas"
            className={`flex items-center justify-center transition-all bg-white rounded-xl ${
              isExpired || renderError ? 'opacity-20 blur-[2px]' : 'opacity-100'
            }`}
            style={{ width: 250, height: 250 }}
          />

          {/* Centered Brand Logo Badge Overlay (compact 36x36 with white border) */}
          {!isExpired && !renderError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-9 h-9 rounded-xl p-0.5 shadow-md border-2 border-white bg-[#0b0f19] flex items-center justify-center">
                <div className="w-full h-full rounded-lg bg-[#141824] border border-[#232938] flex flex-col items-center justify-center relative overflow-hidden">
                  <span className="text-[11px] font-black text-white tracking-tighter leading-none select-none">
                    27
                  </span>
                  <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[var(--a)]" />
                </div>
              </div>
            </div>
          )}

          {renderError && !isExpired && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-[var(--bg)]/90 rounded-2xl text-center">
              <AlertTriangle className="w-8 h-8 text-[var(--amber)] mb-2" />
              <p className="text-xs font-bold text-[var(--t1)] mb-1">{tr('Too many entries')}</p>
              <p className="text-[11px] text-[var(--t3)] max-w-[200px] leading-tight mb-2">
                {tr('Use "Backup Data" in settings to transfer full history.')}
              </p>
            </div>
          )}

          {isExpired && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/60 rounded-2xl text-center">
              <AlertTriangle className="w-8 h-8 text-[var(--amber)] mb-2" />
              <p className="text-xs font-bold text-white mb-3">{tr('Code expired')}</p>
              <button
                type="button"
                onClick={onRefresh}
                className="py-2 px-4 rounded-control text-xs font-bold bg-[var(--a)] text-[var(--bg)] hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{tr('Refresh code')}</span>
              </button>
            </div>
          )}
        </div>

        {/* TTL Progress Line */}
        {!isExpired && (
          <div className="w-full h-1 bg-[var(--b)] rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-[var(--a)] transition-all duration-1000"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* Bottom Status Indicator Pill */}
        <div className="mt-3.5 pt-3 border-t border-[var(--b)] flex items-center justify-between w-full text-[11px] text-[var(--t2)]">
          <span className="font-semibold text-xs tracking-tight">
            {statusText || (isSuccess ? tr('Connected') : tr('Windows 11 Pairing'))}
          </span>
          <div className="flex items-center gap-1.5">
            {isSuccess ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[var(--green-bg)] text-[var(--green)] border border-[var(--green)]/30">
                <Check className="w-3.5 h-3.5" />
                <span>{tr('Linked')}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[var(--a-bg)] text-[var(--a)] border border-[var(--a-b)]">
                <span className="w-2 h-2 rounded-full bg-[var(--a)] animate-pulse" />
                <span>{tr('Ready to scan')}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 8-Character Fallback Code Display */}
      {code && !isExpired && (
        <div className="mt-3.5 w-full max-w-[280px] p-3 rounded-control border border-[var(--b)] bg-[var(--bg-1)] text-center transition-all shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--t3)] block mb-1.5">
            {tr('Or enter code on other device')}
          </span>
          <div className="flex items-center justify-between gap-2 bg-[var(--bg)] px-3 py-1.5 rounded-control border border-[var(--b)]">
            <span className="font-mono text-base font-black tracking-widest text-[var(--a)] select-all">
              {code}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-1 rounded text-[var(--t3)] hover:text-[var(--t1)] transition-colors"
              title={tr('Copy code')}
              aria-label={tr('Copy code')}
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-[var(--green)]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* Share / Copy Raw Link Button */}
      <button
        type="button"
        onClick={handleCopy}
        className="mt-3 text-xs font-semibold text-[var(--t3)] hover:text-[var(--t1)] transition-colors flex items-center gap-1.5 py-1 px-3 rounded-full hover:bg-[var(--b)]"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-[var(--green)]" />
            <span className="text-[var(--green)] font-bold">{tr('Copied to clipboard!')}</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>{tr('Copy pairing link')}</span>
          </>
        )}
      </button>
    </div>
  );
};
