/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, X, Zap, ZapOff, Upload, AlertCircle } from 'lucide-react';
import { decodePairingPayload, PairingPayload } from '../lib/device-pairing';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (payload: PairingPayload) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [torchOn, setTorchOn] = useState(false);
  const [canTorch, setCanTorch] = useState(false);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
  }, []);

  const handleDetectedCode = useCallback(
    (rawValue: string) => {
      const payload = decodePairingPayload(rawValue);
      if (payload) {
        stopCamera();
        onScanSuccess(payload);
      }
    },
    [stopCamera, onScanSuccess]
  );

  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Try native BarcodeDetector if available
        if ('BarcodeDetector' in window) {
          try {
            // @ts-expect-error BarcodeDetector standard experimental API
            const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
            detector
              .detect(video)
              .then((barcodes: Array<{ rawValue: string }>) => {
                if (barcodes.length > 0) {
                  handleDetectedCode(barcodes[0].rawValue);
                }
              })
              .catch(() => {
                // Fallback to jsQR on detection failure
              });
          } catch {
            // Fallback to jsQR
          }
        }

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          handleDetectedCode(code.data);
          return;
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [handleDetectedCode]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    let isMounted = true;

    async function initCamera() {
      try {
        setErrorMessage('');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setHasPermission(true);

        const track = stream.getVideoTracks()[0];
        const capabilities = track?.getCapabilities?.() as { torch?: boolean } | undefined;
        setCanTorch(Boolean(capabilities?.torch));

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          animFrameRef.current = requestAnimationFrame(scanFrame);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        setHasPermission(false);
        const errObj = err as { name?: string; message?: string };
        if (errObj.name === 'NotAllowedError') {
          setErrorMessage('Доступ к камере заблокирован. Разрешите доступ в настройках браузера.');
        } else if (errObj.name === 'NotFoundError') {
          setErrorMessage('Камера на этом устройстве не найдена.');
        } else {
          setErrorMessage('Не удалось запустить камеру. Проверьте права доступа.');
        }
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [isOpen, scanFrame, stopCamera]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && canTorch) {
      try {
        const nextState = !torchOn;
        // @ts-expect-error applyConstraints advanced torch API
        await track.applyConstraints({ advanced: [{ torch: nextState }] });
        setTorchOn(nextState);
      } catch {
        // Ignored
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          handleDetectedCode(code.data);
        } else {
          setErrorMessage('На выбранном изображении не удалось обнаружить QR-код.');
        }
      }
    };
    img.src = url;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-2 text-zinc-100 font-semibold text-sm">
            <Camera className="w-4 h-4 text-[#d4af37]" />
            <span>Сканирование QR-кода</span>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder area */}
        <div className="relative w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Aiming Reticle with gold accent */}
          {hasPermission && (
            <div className="relative w-56 h-56 pointer-events-none">
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#d4af37] rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#d4af37] rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#d4af37] rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#d4af37] rounded-br-xl" />

              {/* Animated laser line */}
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent animate-pulse top-1/2 -translate-y-1/2" />
            </div>
          )}

          {/* Fallback & Error Screen */}
          {hasPermission === false && (
            <div className="flex flex-col items-center justify-center p-6 text-center z-10">
              <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
              <p className="text-xs text-zinc-300 mb-4">{errorMessage}</p>

              {/* Upload image fallback */}
              <label className="flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-200 hover:bg-zinc-700 cursor-pointer border border-zinc-700 transition-all">
                <Upload className="w-4 h-4 text-[#d4af37]" />
                <span>Выбрать скриншот/фото</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className="flex items-center justify-between p-4 bg-zinc-900 border-t border-zinc-800 text-xs">
          <label className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>Загрузить фото</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {canTorch && (
            <button
              onClick={toggleTorch}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                torchOn
                  ? 'bg-amber-400/10 border-amber-400 text-amber-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {torchOn ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
              <span>Фонарик</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
