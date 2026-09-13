import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Copy, ExternalLink, Check } from 'lucide-react';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
  showActions?: boolean;
  title?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 140,
  className = '',
  showActions = false,
  title,
}) => {
  const [svgString, setSvgString] = useState<string>('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!value) return;

    QRCode.toString(value, {
      type: 'svg',
      margin: 1,
      width: size,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((svg) => {
        if (isMounted) setSvgString(svg);
      })
      .catch((err) => {
        console.error('QR Generation Error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(value).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div
        className="p-2.5 bg-white rounded-2xl shadow-inner border border-slate-200 dark:border-slate-700 inline-block overflow-hidden"
        style={{ width: size + 20, height: size + 20 }}
      >
        {svgString ? (
          <div
            className="w-full h-full flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
            dangerouslySetInnerHTML={{ __html: svgString }}
          />
        ) : (
          <div
            className="w-full h-full bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg flex items-center justify-center text-xs text-slate-400"
          >
            جاري التوليد...
          </div>
        )}
      </div>

      {title && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium text-center">
          {title}
        </p>
      )}

      {showActions && (
        <div className="flex items-center gap-2 mt-2.5">
          <button
            type="button"
            onClick={handleCopy}
            title="نسخ الرابط المباشر"
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1 transition cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
          </button>

          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            title="فتح الرابط في نافذة جديدة للاختبار"
            className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-1 transition cursor-pointer"
          >
            <ExternalLink className="w-3 h-3" />
            <span>تجربة الرابط</span>
          </a>
        </div>
      )}
    </div>
  );
};
