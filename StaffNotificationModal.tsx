import React, { useState } from 'react';
import { Ticket, Counter, SystemSettings, NotificationTrigger } from '../types';
import { X, Send, MessageCircle, Smartphone, CheckCircle2, AlertCircle, Sparkles, ExternalLink, Copy, Check } from 'lucide-react';
import {
  formatPhoneForWhatsApp,
  getWhatsAppDirectUrl,
  getSmsDirectUrl,
  composeNotificationMessage,
  renderNotificationTemplate,
} from '../utils/notifications';

interface StaffNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket;
  counter: Counter;
  settings: SystemSettings;
  aheadCount?: number;
  onLogNotification: (params: {
    channel: 'whatsapp' | 'sms';
    trigger: NotificationTrigger;
    messageText: string;
  }) => void;
}

export const StaffNotificationModal: React.FC<StaffNotificationModalProps> = ({
  isOpen,
  onClose,
  ticket,
  counter,
  settings,
  aheadCount = 0,
  onLogNotification,
}) => {
  if (!isOpen) return null;

  const cfg = settings.notificationSettings;
  const countryCode = cfg?.whatsappCountryCode || '966';

  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [selectedTemplateType, setSelectedTemplateType] = useState<'call' | 'custom' | 'docs' | 'approaching'>('call');
  const [customText, setCustomText] = useState('');
  const [copied, setCopied] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  // نصوص جاهزة سريعة للموظف
  const templatesMap = {
    call: composeNotificationMessage('ticket_called', ticket, settings, {
      counterName: counter.name,
      aheadCount,
    }),
    approaching: composeNotificationMessage('turn_approaching', ticket, settings, {
      counterName: counter.name,
      aheadCount,
    }),
    docs: `عزيزي ${ticket.customerName}، نرجو تجهيز وتوفير أصل الهوية الوطنية والمستندات المطلوبة لتسهيل إنهاء معاملتك (${ticket.serviceName}) لدى ${counter.name}. نسعد بخدمتكم!`,
    custom: customText || `عزيزي ${ticket.customerName}، الموظف في ${counter.name} بانتظارك لخدمة تذكرتك رقم (${ticket.code}). نتطلع لخدمتك!`,
  };

  const activeMessage = selectedTemplateType === 'custom' ? (customText || templatesMap.custom) : templatesMap[selectedTemplateType];

  const handleSendAction = (chosenChannel: 'whatsapp' | 'sms') => {
    onLogNotification({
      channel: chosenChannel,
      trigger: selectedTemplateType === 'call' ? 'ticket_called' : 'manual_staff',
      messageText: activeMessage,
    });

    setSentSuccess(true);

    // فتح الرابط الفعلي
    if (chosenChannel === 'whatsapp') {
      const url = getWhatsAppDirectUrl(ticket.phone, activeMessage, countryCode);
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      const url = getSmsDirectUrl(ticket.phone, activeMessage);
      window.location.href = url;
    }

    setTimeout(() => {
      setSentSuccess(false);
      onClose();
    }, 1200);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-5 border border-slate-200 dark:border-slate-700 shadow-2xl relative animate-scale-in">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 left-5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xl font-bold shadow-xs">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-slate-800 dark:text-white text-base">
              مراسلة المراجع عبر واتساب / SMS
            </h3>
            <p className="text-xs text-slate-400">
              إرسال إشعار فوري وتوجيه العميل إلى {counter.name}
            </p>
          </div>
        </div>

        {/* Customer Info Card */}
        <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-brand-600 text-lg num-latin">{ticket.code}</span>
              <span className="font-bold text-slate-800 dark:text-white text-sm">{ticket.customerName}</span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
              {ticket.serviceName} • {counter.name}
            </span>
          </div>

          <div className="text-left font-mono font-bold text-slate-700 dark:text-slate-300 num-latin">
            {ticket.phone || 'بدون رقم'}
          </div>
        </div>

        {/* Template Quick Selectors */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            اختر نوع الرسالة أو القالب المطلوب:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedTemplateType('call')}
              className={`p-2.5 rounded-xl text-xs font-bold transition text-right cursor-pointer border ${
                selectedTemplateType === 'call'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              📢 نداء للشباك الآن
            </button>

            <button
              type="button"
              onClick={() => setSelectedTemplateType('docs')}
              className={`p-2.5 rounded-xl text-xs font-bold transition text-right cursor-pointer border ${
                selectedTemplateType === 'docs'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              📑 طلب المستندات والأصل
            </button>

            <button
              type="button"
              onClick={() => setSelectedTemplateType('approaching')}
              className={`p-2.5 rounded-xl text-xs font-bold transition text-right cursor-pointer border ${
                selectedTemplateType === 'approaching'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              ⏳ تنبيه اقتراب الدور
            </button>

            <button
              type="button"
              onClick={() => setSelectedTemplateType('custom')}
              className={`p-2.5 rounded-xl text-xs font-bold transition text-right cursor-pointer border ${
                selectedTemplateType === 'custom'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              ✍️ رسالة خاصة مخصصة
            </button>
          </div>
        </div>

        {/* Message Content Preview or Edit */}
        {selectedTemplateType === 'custom' ? (
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              اكتب نص الرسالة الخاصة للمراجع:
            </label>
            <textarea
              rows={3}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="مثال: يرجى التوجه لمكتب 2 لإتمام التوقيع وإحضار بطاقة الهوية الأصلية..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold leading-relaxed focus:outline-none focus:border-emerald-500"
            />
          </div>
        ) : (
          <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
              <span>معاينة نص الرسالة التي ستصل للعميل:</span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
              </button>
            </div>
            <p className="whitespace-pre-line text-emerald-950 dark:text-emerald-100 leading-relaxed font-medium">
              {activeMessage}
            </p>
          </div>
        )}

        {/* Prior Notifications Sent Status */}
        {ticket.notificationsSent && (
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 text-[11px] text-slate-500 flex items-center justify-between">
            <span>سجل إشعارات هذه التذكرة:</span>
            <div className="flex items-center gap-2">
              <span className={ticket.notificationsSent.issued ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                ترحيب {ticket.notificationsSent.issued ? '✓' : '—'}
              </span>
              <span>•</span>
              <span className={ticket.notificationsSent.approaching ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                اقتراب الدور {ticket.notificationsSent.approaching ? '✓' : '—'}
              </span>
              <span>•</span>
              <span className={ticket.notificationsSent.called ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                نداء الشباك {ticket.notificationsSent.called ? '✓' : '—'}
              </span>
            </div>
          </div>
        )}

        {sentSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>تم إطلاق الإشعار وتسجيله بنجاح!</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleSendAction('whatsapp')}
            className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>إرسال عبر واتساب فوراً</span>
          </button>

          <button
            type="button"
            onClick={() => handleSendAction('sms')}
            className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>إرسال رسالة SMS</span>
          </button>
        </div>
      </div>
    </div>
  );
};
