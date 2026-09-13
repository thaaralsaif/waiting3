import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'مسح الباركود بالكاميرا',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setErrorMsg(null);
    setIsScanning(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('متصفحك لا يدعم فتح الكاميرا أو الصلاحية غير متوفرة');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check for native BarcodeDetector API
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'code_128', 'code_39'],
        });

        const detectLoop = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            animationFrameRef.current = requestAnimationFrame(detectLoop);
            return;
          }

          try {
            const barcodes = await barcodeDetector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const rawVal = barcodes[0].rawValue;
              if (rawVal) {
                stopCamera();
                onScanSuccess(rawVal);
                return;
              }
            }
          } catch {
            // continue detection
          }

          animationFrameRef.current = requestAnimationFrame(detectLoop);
        };

        animationFrameRef.current = requestAnimationFrame(detectLoop);
      } else {
        setErrorMsg('الكاميرا تعمل، ولكن متصفحك لا يدعم قراءة الباركود الآلية المباشرة. يمكنك إدخال الرمز يدوياً أدناه.');
      }
    } catch (err: any) {
      console.warn('Camera Error:', err);
      setErrorMsg(
        err.message?.includes('Permission')
          ? 'يرجى إعطاء صلاحية الكاميرا للمتصفح للتمكن من مسح الباركود'
          : 'تعذر الوصول إلى الكاميرا. يرجى إدخال الرمز يدوياً.'
      );
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700 shadow-2xl relative">
        <button
          type="button"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="absolute top-5 left-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center font-bold shadow-md">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 dark:text-white text-base">{title}</h3>
            <p className="text-xs text-slate-400">وجه الكاميرا نحو باركود التذكرة أو بطاقة الموعد</p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Video Viewfinder */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-2 border-dashed border-brand-500/50 aspect-4/3 flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Scanner targeting overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-brand-400 rounded-2xl relative animate-pulse">
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-brand-500" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-brand-500" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-brand-500" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-brand-500" />
            </div>
          </div>
        </div>

        {/* Manual fallback input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (manualCode.trim()) {
              stopCamera();
              onScanSuccess(manualCode.trim());
            }
          }}
          className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700"
        >
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
            أو أدخل رقم الموعد / التذكرة يدوياً:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="مثال: APT-1042 أو 101"
              className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center font-bold text-xs"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-xs transition cursor-pointer"
            >
              تأكيد
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
