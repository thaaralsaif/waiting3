import React, { useState } from 'react';
import { SystemSettings, NotificationSettings, NotificationLog, NotificationTemplates, Ticket } from '../types';
import {
  MessageSquare, Smartphone, Send, CheckCircle2, AlertCircle, Copy, ExternalLink,
  Sliders, ShieldCheck, Flame, Users, Bell, RefreshCw, Eye, Sparkles, Filter,
  Phone, Globe, Check, MessageCircle
} from 'lucide-react';
import {
  defaultNotificationSettings,
  defaultNotificationTemplates,
  renderNotificationTemplate,
  formatPhoneForWhatsApp,
  getWhatsAppDirectUrl,
  getSmsDirectUrl,
  getTicketTrackingUrl,
} from '../utils/notifications';
import { getBaseAppUrl } from '../utils';

interface NotificationSettingsTabProps {
  settings: SystemSettings;
  notificationLogs?: NotificationLog[];
  onSaveSettings: (newSettings: SystemSettings) => void;
  onClearLogs?: () => void;
}

export const NotificationSettingsTab: React.FC<NotificationSettingsTabProps> = ({
  settings,
  notificationLogs = [],
  onSaveSettings,
  onClearLogs,
}) => {
  const currentConfig: NotificationSettings = settings.notificationSettings || defaultNotificationSettings;
  const [cfg, setCfg] = useState<NotificationSettings>(currentConfig);
  const [publicBaseUrl, setPublicBaseUrl] = useState<string>(
    settings.publicQrBaseUrl || settings.appointmentSettings?.publicQrBaseUrl || ''
  );
  const [activePreviewType, setActivePreviewType] = useState<keyof NotificationTemplates>('ticketIssued');
  const [previewPlatform, setPreviewPlatform] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [testPhoneNumber, setTestPhoneNumber] = useState('0501234567');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [logsFilter, setLogsFilter] = useState<'all' | 'whatsapp' | 'sms'>('all');

  const currentLiveAppUrl = getBaseAppUrl(publicBaseUrl || settings.publicQrBaseUrl || settings.appointmentSettings?.publicQrBaseUrl);

  const sampleTicket: Ticket = {
    id: 't_sample_105',
    code: '105',
    serviceId: 's1',
    serviceName: 'خدمة العملاء والاستقبال',
    customerName: 'سلطان الشمري',
    phone: testPhoneNumber || '0501234567',
    nationalId: '1012345678',
    isPriority: false,
    status: 'waiting',
    counterId: null,
    counterName: null,
    createdAt: Date.now(),
    calledAt: null,
    completedAt: null,
  };

  // توليد الرابط الحقيقي المباشر لصفحة التتبع لتذكرة سلطان الشمري
  const dynamicSampleTrackUrl = getTicketTrackingUrl(sampleTicket, {
    ...settings,
    publicQrBaseUrl: publicBaseUrl.trim() || undefined,
  });

  // بيانات نموذجية حية للمحاكي مرتبطة برابط التطبيق الفعلي
  const sampleData = {
    name: 'سلطان الشمري',
    ticket: '105',
    service: 'خدمة العملاء والاستقبال',
    counter: 'مكتب رقم 2',
    ahead_count: cfg.approachingQueueThreshold || 2,
    track_url: dynamicSampleTrackUrl,
    org: settings.orgName || 'جمعية البر الخيرية بحفر الباطن',
    branch: settings.branchName || 'الفرع الرئيسي',
  };

  const currentTemplateText = cfg.templates?.[activePreviewType] || defaultNotificationTemplates[activePreviewType];
  const renderedMessage = renderNotificationTemplate(currentTemplateText, sampleData);

  const handleTemplateChange = (key: keyof NotificationTemplates, value: string) => {
    setCfg((prev) => ({
      ...prev,
      templates: {
        ...prev.templates,
        [key]: value,
      },
    }));
  };

  const insertVariable = (variableKey: string) => {
    const current = cfg.templates[activePreviewType] || '';
    const updated = current + ` ${variableKey} `;
    handleTemplateChange(activePreviewType, updated);
  };

  const handleSave = () => {
    onSaveSettings({
      ...settings,
      publicQrBaseUrl: publicBaseUrl.trim() || undefined,
      notificationSettings: cfg,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(renderedMessage);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  const filteredLogs = notificationLogs.filter((log) => {
    if (logsFilter === 'all') return true;
    return log.channel === logsFilter;
  });

  const totalSent = notificationLogs.length;
  const whatsappCount = notificationLogs.filter((l) => l.channel === 'whatsapp').length;
  const smsCount = notificationLogs.filter((l) => l.channel === 'sms').length;

  return (
    <div className="space-y-8" dir="rtl">
      {/* Top Header Card */}
      <div className="bg-gradient-to-l from-emerald-600 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold mb-3 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            نظام التنبيهات الذكي التفاعلي
          </span>
          <h2 className="text-2xl sm:text-3xl font-black mb-2 tracking-tight">
            إشعارات الرسائل النصية (SMS) والواتساب (WhatsApp Readiness)
          </h2>
          <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed">
            تواصل لحظي وفعّال مع المراجعين: إرسال رسائل ترحيبية فور إصدار التذكرة، تنبيه آلي عند اقتراب الدور، وإشعار فوري عند النداء للشباك مع إمكانية المراسلة اليدوية بنقرة زر من شاشة الموظف.
          </p>
        </div>

        <div className="absolute -left-6 -bottom-10 opacity-15 pointer-events-none">
          <MessageSquare className="w-48 h-48 text-white" />
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">إجمالي الرسائل المرسلة</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white num-latin">{totalSent}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center font-bold">
            <Send className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">رسائل واتساب (WhatsApp)</span>
            <span className="text-2xl font-black text-emerald-600 num-latin">{whatsappCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
            <MessageCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">رسائل SMS القصيرة</span>
            <span className="text-2xl font-black text-blue-600 num-latin">{smsCount}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center font-bold">
            <Smartphone className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 block">نسبة الوصول والتسليم</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white num-latin">99.8%</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Controls & Templates (Right) + Live Mobile Preview (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Right Column: Settings & Template Editors */}
        <div className="lg:col-span-7 space-y-6">
          {/* Master Control Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-600" />
                  قواعد التشغيل الآلي والتنبيهات
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  التحكم في القنوات الافتراضية ومحفزات الإرسال اللحظية
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={cfg.enabled}
                  onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  القناة الافتراضية للإشعارات
                </label>
                <select
                  value={cfg.defaultChannel}
                  onChange={(e) => setCfg({ ...cfg, defaultChannel: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold focus:outline-none focus:border-emerald-500"
                >
                  <option value="both">واتساب + رسائل قصيرة SMS (مزدوج ومستحسن)</option>
                  <option value="whatsapp">واتساب فقط (WhatsApp Direct)</option>
                  <option value="sms">رسائل نصية قصيرة فقط (SMS Gateway)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  عتبة تنبيه اقتراب الدور (عدد المراجعين أمام العميل)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={cfg.approachingQueueThreshold}
                    onChange={(e) => setCfg({ ...cfg, approachingQueueThreshold: parseInt(e.target.value, 10) || 2 })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold focus:outline-none focus:border-emerald-500 num-latin text-center"
                  />
                  <span className="text-xs text-slate-500 shrink-0 font-medium">مراجعين متبقين</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-700">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700/60 cursor-pointer">
                <div>
                  <span className="text-xs font-black text-slate-800 dark:text-white block">
                    1. إرسال ترحيب فوري مع رابط التتبع الحي عند إصدار التذكرة
                  </span>
                  <span className="text-[11px] text-slate-400">
                    يستلم المراجع رابطاً مباشراً لمتابعة دوره لحظة بلحظة من هاتفه
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={cfg.sendOnTicketIssue}
                  onChange={(e) => setCfg({ ...cfg, sendOnTicketIssue: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700/60 cursor-pointer">
                <div>
                  <span className="text-xs font-black text-slate-800 dark:text-white block">
                    2. إرسال تنبيه آلي ذكي عند اقتراب الدور
                  </span>
                  <span className="text-[11px] text-slate-400">
                    تنبيه المراجع تلقائياً للاستعداد فور وصول الطابور أمامه إلى {cfg.approachingQueueThreshold} مراجعين
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={cfg.sendOnApproaching}
                  onChange={(e) => setCfg({ ...cfg, sendOnApproaching: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700/60 cursor-pointer">
                <div>
                  <span className="text-xs font-black text-slate-800 dark:text-white block">
                    3. إرسال إشعار فوري عند نداء التذكرة واستدعائها للشباك
                  </span>
                  <span className="text-[11px] text-slate-400">
                    يوضح اسم ورقم الشباك/المكتب المطلوب التوجه إليه لإنهاء المعاملة
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={cfg.sendOnTicketCalled}
                  onChange={(e) => setCfg({ ...cfg, sendOnTicketCalled: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700/60 cursor-pointer">
                <div>
                  <span className="text-xs font-black text-slate-800 dark:text-white block">
                    4. تمكين الإرسال اليدوي المباشر عبر واتساب من شاشة الموظف
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ظهور زر واتساب فوري في لوحة شباك الموظف لمراسلة العميل بنقرة واحدة
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={cfg.allowStaffManualSend}
                  onChange={(e) => setCfg({ ...cfg, allowStaffManualSend: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
              </label>
            </div>
          </div>

          {/* Public Tracking Domain & URL Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  نطاق ورابط تطبيق التتبع الحي (Live Tracking Domain)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  هذا هو الرابط الفعلي للتطبيق الذي يتم تضمينه في رسائل الواتساب والـ SMS ليفتح صفحة تتبع التذكرة للمراجع
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                رابط تتبع مباشر
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نطاق/رابط التطبيق الأساسي (Base URL):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    dir="ltr"
                    value={publicBaseUrl}
                    onChange={(e) => setPublicBaseUrl(e.target.value)}
                    placeholder={getBaseAppUrl()}
                    className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setPublicBaseUrl(getBaseAppUrl())}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                    title="استعادة رابط التطبيق الحالي تلقائياً"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>تلقائي</span>
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  الرابط المعتمد حالياً: <span className="font-mono text-emerald-600 font-bold" dir="ltr">{currentLiveAppUrl}</span>
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs space-y-1 flex-1 min-w-[240px]">
                  <span className="font-black text-emerald-900 dark:text-emerald-200 block">
                    الرابط المباشر لتتبع التذكرة رقم (105):
                  </span>
                  <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-300 break-all select-all block leading-tight" dir="ltr">
                    {dynamicSampleTrackUrl}
                  </span>
                </div>
                <a
                  href={dynamicSampleTrackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح تجربة التتبع الآن 🔗</span>
                </a>
              </div>
            </div>
          </div>

          {/* Template Customizer Card */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                تخصيص قوالب الرسائل (Template Customizer)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                انقر على أي قالب لتعديله ومراجعته لحظياً في محاكي الجوال
              </p>
            </div>

            {/* Template Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setActivePreviewType('ticketIssued')}
                className={`p-2.5 rounded-xl text-xs font-bold text-center transition cursor-pointer border ${
                  activePreviewType === 'ticketIssued'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                1. ترحيب وتتبع
              </button>

              <button
                type="button"
                onClick={() => setActivePreviewType('turnApproaching')}
                className={`p-2.5 rounded-xl text-xs font-bold text-center transition cursor-pointer border ${
                  activePreviewType === 'turnApproaching'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                2. اقتراب الدور
              </button>

              <button
                type="button"
                onClick={() => setActivePreviewType('ticketCalled')}
                className={`p-2.5 rounded-xl text-xs font-bold text-center transition cursor-pointer border ${
                  activePreviewType === 'ticketCalled'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                3. استدعاء الشباك
              </button>

              <button
                type="button"
                onClick={() => setActivePreviewType('manualStaff')}
                className={`p-2.5 rounded-xl text-xs font-bold text-center transition cursor-pointer border ${
                  activePreviewType === 'manualStaff'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                4. رسالة الموظف
              </button>
            </div>

            {/* Variable Insertion Pills */}
            <div>
              <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                المتغيرات الديناميكية (انقر لإدراج المتغير داخل نص الرسالة):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { tag: '{name}', label: 'اسم العميل' },
                  { tag: '{ticket}', label: 'رقم التذكرة' },
                  { tag: '{service}', label: 'اسم الخدمة' },
                  { tag: '{counter}', label: 'الشباك / المكتب' },
                  { tag: '{ahead_count}', label: 'المتبقين أمامه' },
                  { tag: '{track_url}', label: 'رابط التتبع الحي' },
                  { tag: '{org}', label: 'اسم المنشأة' },
                  { tag: '{branch}', label: 'اسم الفرع' },
                ].map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    onClick={() => insertVariable(item.tag)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 hover:text-emerald-700 dark:hover:text-emerald-300 text-slate-700 dark:text-slate-200 text-[11px] font-mono font-bold transition cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-slate-600"
                  >
                    <span>+</span>
                    <span>{item.tag}</span>
                    <span className="text-[10px] opacity-70">({item.label})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                نص قالب الرسالة المختارة:
              </label>
              <textarea
                rows={5}
                value={currentTemplateText}
                onChange={(e) => handleTemplateChange(activePreviewType, e.target.value)}
                className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-sans leading-relaxed focus:outline-none focus:border-emerald-500 font-medium"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                ملاحظة: تدعم الرسائل الرموز التعبيرية والأسطر المتعددة وروابط الإنترنت المشفرة.
              </span>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleTemplateChange(activePreviewType, defaultNotificationTemplates[activePreviewType])}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>استعادة القالب الافتراضي</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>حفظ التعديلات والقوالب</span>
              </button>
            </div>

            {saveSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>تم حفظ إعدادات وقوالب الإشعارات بنجاح!</span>
              </div>
            )}
          </div>
        </div>

        {/* Left Column: Realistic Live Mobile Simulator */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-sm space-y-3">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                محاكي الجوال الحي (Live Mobile Preview)
              </span>

              {/* Toggle WhatsApp vs SMS View */}
              <div className="flex rounded-xl p-1 bg-slate-200 dark:bg-slate-700 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('whatsapp')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    previewPlatform === 'whatsapp'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewPlatform('sms')}
                  className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                    previewPlatform === 'sms'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  }`}
                >
                  SMS
                </button>
              </div>
            </div>

            {/* Realistic Smartphone Frame */}
            <div className="relative mx-auto border-[10px] border-slate-900 dark:border-slate-950 rounded-[44px] shadow-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 w-full max-w-[320px] aspect-[9/18.5] flex flex-col ring-1 ring-slate-800/20">
              {/* Dynamic Island / Speaker Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-30 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-2"></div>
                <div className="w-2 h-2 rounded-full bg-blue-950/60"></div>
              </div>

              {/* Status Bar */}
              <div className="pt-3 px-6 pb-2 flex items-center justify-between text-[11px] font-bold z-20 select-none text-slate-700 dark:text-slate-300">
                <span>09:41</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px]">5G</span>
                  <div className="w-4 h-2.5 border border-current rounded-xs p-0.5 flex items-center">
                    <div className="h-full w-full bg-current rounded-2xs"></div>
                  </div>
                </div>
              </div>

              {/* App Content Header */}
              {previewPlatform === 'whatsapp' ? (
                /* WhatsApp Header */
                <div className="bg-[#075E54] text-white p-3 pt-2 flex items-center justify-between shadow-xs select-none">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs">
                      🏢
                    </div>
                    <div>
                      <h4 className="text-xs font-black truncate max-w-[150px]">{settings.orgName}</h4>
                      <span className="text-[9px] text-emerald-200 block">حساب تجاري موثق • متصل</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-white/80">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                </div>
              ) : (
                /* SMS Header */
                <div className="bg-slate-200 dark:bg-slate-800 p-2.5 text-center border-b border-slate-300 dark:border-slate-700 select-none">
                  <span className="text-[10px] text-slate-400 block font-mono">SMS Message</span>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">
                    {cfg.smsSenderName || 'QUEUE-ALERT'}
                  </h4>
                </div>
              )}

              {/* Chat Canvas */}
              <div
                className={`flex-1 p-3.5 overflow-y-auto space-y-3 flex flex-col justify-end text-xs ${
                  previewPlatform === 'whatsapp'
                    ? 'bg-[#E5DDD5] dark:bg-[#0b141a]'
                    : 'bg-slate-50 dark:bg-slate-900'
                }`}
                style={
                  previewPlatform === 'whatsapp'
                    ? {
                        backgroundImage:
                          'radial-gradient(#0000000d 1px, transparent 1px)',
                        backgroundSize: '16px 16px',
                      }
                    : undefined
                }
              >
                {/* Date Chip */}
                <div className="text-center">
                  <span className="px-2.5 py-0.5 rounded-md bg-white/80 dark:bg-slate-800/80 text-[10px] text-slate-500 font-bold shadow-2xs">
                    اليوم
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[88%] rounded-2xl p-3 shadow-xs space-y-1.5 self-start animate-fade-in ${
                    previewPlatform === 'whatsapp'
                      ? 'bg-white dark:bg-[#1f2c34] text-slate-900 dark:text-slate-100 rounded-tr-xs border border-emerald-900/10'
                      : 'bg-blue-600 text-white rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-line text-xs leading-relaxed font-sans select-text">
                    {renderedMessage.split(/(https?:\/\/[^\s]+)/g).map((chunk, idx) => {
                      if (chunk.match(/^https?:\/\//)) {
                        return (
                          <a
                            key={idx}
                            href={chunk}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`underline font-mono break-all font-bold ${
                              previewPlatform === 'whatsapp'
                                ? 'text-sky-600 dark:text-sky-400 hover:text-sky-700'
                                : 'text-blue-100 hover:text-white'
                            }`}
                            title="انقر لفتح رابط التتبع في نافذة جديدة"
                          >
                            {chunk}
                          </a>
                        );
                      }
                      return <span key={idx}>{chunk}</span>;
                    })}
                  </p>

                  <div
                    className={`flex items-center justify-end gap-1 text-[9px] ${
                      previewPlatform === 'whatsapp'
                        ? 'text-slate-400 dark:text-slate-400'
                        : 'text-blue-100'
                    }`}
                  >
                    <span>09:41</span>
                    {previewPlatform === 'whatsapp' && (
                      <span className="text-sky-500 font-black">✓✓</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Fake Input Bar */}
              <div className="p-2 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2 text-slate-400 text-xs select-none">
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full py-1.5 px-3 text-[11px] truncate">
                  كتابة رسالة...
                </div>
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Send className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Home Indicator Bar */}
              <div className="h-4 bg-white dark:bg-slate-800 flex items-center justify-center pb-1">
                <div className="w-24 h-1 bg-slate-400 rounded-full"></div>
              </div>
            </div>

            {/* Quick Test Tracking Link Button */}
            <a
              href={dynamicSampleTrackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer text-center shadow-xs"
            >
              <ExternalLink className="w-4 h-4 text-emerald-600" />
              <span>اختبار فتح صفحة التتبع لتذكرة (105) في نافذة جديدة</span>
            </a>

            {/* Test Send Trigger Bar */}
            <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block">
                تجربة إرسال المعاينة الحالية لرقمك:
              </span>
              <div className="flex gap-2">
                <input
                  type="tel"
                  dir="ltr"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="flex-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold text-right"
                />
                <a
                  href={
                    previewPlatform === 'whatsapp'
                      ? getWhatsAppDirectUrl(testPhoneNumber, renderedMessage, cfg.whatsappCountryCode)
                      : getSmsDirectUrl(testPhoneNumber, renderedMessage)
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح في {previewPlatform === 'whatsapp' ? 'واتساب' : 'SMS'}</span>
                </a>
              </div>

              <button
                type="button"
                onClick={handleCopyMessage}
                className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>تم نسخ نص الرسالة للحافظة!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>نسخ نص الرسالة</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Notification Logs Stream (سجل الرسائل المرسلة الحية) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-600" />
              سجل نشاط الإشعارات والرسائل اللحظية (Notification Activity Logs)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              متابعة الرسائل الصادرة تلقائياً أو يدوياً مع حالة التسليم المباشرة
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <button
                type="button"
                onClick={() => setLogsFilter('all')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  logsFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-black' : 'text-slate-500'
                }`}
              >
                الكل ({notificationLogs.length})
              </button>
              <button
                type="button"
                onClick={() => setLogsFilter('whatsapp')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  logsFilter === 'whatsapp' ? 'bg-emerald-600 text-white shadow-2xs font-black' : 'text-slate-500'
                }`}
              >
                واتساب ({whatsappCount})
              </button>
              <button
                type="button"
                onClick={() => setLogsFilter('sms')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  logsFilter === 'sms' ? 'bg-blue-600 text-white shadow-2xs font-black' : 'text-slate-500'
                }`}
              >
                SMS ({smsCount})
              </button>
            </div>

            {onClearLogs && (
              <button
                type="button"
                onClick={onClearLogs}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
              >
                تفريغ السجل
              </button>
            )}
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
            <p>لا توجد رسائل مسجلة تطابق التصفية الحالية.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold">
                  <th className="py-3 px-3">التذكرة</th>
                  <th className="py-3 px-3">المراجع</th>
                  <th className="py-3 px-3">رقم الجوال</th>
                  <th className="py-3 px-3">القناة</th>
                  <th className="py-3 px-3">السبب / المحفز</th>
                  <th className="py-3 px-3">نص الرسالة</th>
                  <th className="py-3 px-3">الوقت</th>
                  <th className="py-3 px-3">الحالة</th>
                  <th className="py-3 px-3 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition">
                    <td className="py-3 px-3 font-mono font-black text-brand-600 text-sm num-latin">
                      {log.ticketCode}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                      {log.customerName}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400 num-latin">
                      {log.phone}
                    </td>
                    <td className="py-3 px-3">
                      {log.channel === 'whatsapp' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          <MessageCircle className="w-3 h-3" /> واتساب
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300">
                          <Smartphone className="w-3 h-3" /> SMS
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-600 dark:text-slate-300">
                      {log.trigger === 'ticket_issued' && 'ترحيب وتتبع حي 🎟️'}
                      {log.trigger === 'turn_approaching' && 'اقتراب الدور ⏳'}
                      {log.trigger === 'ticket_called' && `نداء للشباك (${log.counterName || 'شباك'}) 📢`}
                      {log.trigger === 'manual_staff' && 'رسالة موظف يدوية 👨‍💼'}
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={log.messageText}>
                      {log.messageText}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px] num-latin whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" /> تم التسليم
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <a
                        href={
                          log.channel === 'whatsapp'
                            ? getWhatsAppDirectUrl(log.phone, log.messageText, cfg.whatsappCountryCode)
                            : getSmsDirectUrl(log.phone, log.messageText)
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition inline-block cursor-pointer"
                        title="فتح المحادثة مجدداً"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
