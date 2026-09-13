import React, { useState } from 'react';
import { SystemSettings, TicketPrintSettings } from '../types';
import { Printer, QrCode, Check, RotateCcw, Sliders, Layout, Eye } from 'lucide-react';
import { QRCodeDisplay } from './QRCodeDisplay';

interface TicketCustomizerTabProps {
  settings: SystemSettings;
  onSave: (newSettings: SystemSettings) => void;
}

const defaultTicketPrint: TicketPrintSettings = {
  headerText: 'نظام الانتظار السحابي الذكي',
  subHeaderText: 'الفرع الرئيسي الذكي',
  footerText: 'شكراً لزيارتكم - نتمنى لكم يوماً سعيداً ودمتم بخير',
  showQrCode: true,
  showWaitTimeEstimate: true,
  showWaitingCountAhead: true,
  showBranchName: true,
  showDateAndTime: true,
  showCustomerName: true,
  paperWidth: '80mm',
  fontSizeScale: 'medium',
};

export const TicketCustomizerTab: React.FC<TicketCustomizerTabProps> = ({ settings, onSave }) => {
  const [ticketConfig, setTicketConfig] = useState<TicketPrintSettings>(() => ({
    ...defaultTicketPrint,
    headerText: settings.ticketPrint?.headerText || settings.orgName || defaultTicketPrint.headerText,
    subHeaderText: settings.ticketPrint?.subHeaderText || settings.branchName || defaultTicketPrint.subHeaderText,
    footerText: settings.ticketPrint?.footerText || settings.printFooter || defaultTicketPrint.footerText,
    showQrCode: settings.ticketPrint?.showQrCode ?? defaultTicketPrint.showQrCode,
    showWaitTimeEstimate: settings.ticketPrint?.showWaitTimeEstimate ?? defaultTicketPrint.showWaitTimeEstimate,
    showWaitingCountAhead: settings.ticketPrint?.showWaitingCountAhead ?? defaultTicketPrint.showWaitingCountAhead,
    showBranchName: settings.ticketPrint?.showBranchName ?? defaultTicketPrint.showBranchName,
    showDateAndTime: settings.ticketPrint?.showDateAndTime ?? defaultTicketPrint.showDateAndTime,
    showCustomerName: settings.ticketPrint?.showCustomerName ?? defaultTicketPrint.showCustomerName,
    paperWidth: settings.ticketPrint?.paperWidth || defaultTicketPrint.paperWidth,
    fontSizeScale: settings.ticketPrint?.fontSizeScale || defaultTicketPrint.fontSizeScale,
  }));

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleToggle = (key: keyof TicketPrintSettings) => {
    setTicketConfig((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    const updated: SystemSettings = {
      ...settings,
      printFooter: ticketConfig.footerText,
      ticketPrint: ticketConfig,
    };
    onSave(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleReset = () => {
    setTicketConfig(defaultTicketPrint);
  };

  const handleTestPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm"
            style={{
              backgroundColor: `${settings.theme.primary}18`,
              color: settings.theme.primary,
            }}
          >
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
              محرر ومخصص التذكرة المطبوعة والرقمية
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تحكم كامل في نصوص الترويسة، الخاتمة، الباركود، حجم الورق الحراري، والعناصر المعروضة للمراجع
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>استعادة الافتراضي</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              backgroundColor: settings.theme.primary,
              color: settings.theme.buttonTextColor || '#ffffff',
            }}
            className="px-6 py-2.5 rounded-xl font-black text-xs transition shadow-md flex items-center gap-2 cursor-pointer hover:opacity-95"
          >
            <Check className="w-4 h-4" />
            <span>حفظ إعدادات التذكرة</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-500 text-white text-xs font-bold rounded-2xl text-center shadow-sm flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          <span>تم حفظ إعدادات التذكرة والطباعة بنجاح! سيتم تطبيقها فوراً على الكشك والطباعة.</span>
        </div>
      )}

      {/* Main Grid: Controls vs Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left/Middle Column: Controls Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Texts & Branding */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <Layout className="w-4 h-4 text-brand-600" />
              <span>نصوص الترويسة والرسائل</span>
            </h4>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  عنوان ترويسة التذكرة (اسم المنشأة / الجهة):
                </label>
                <input
                  type="text"
                  value={ticketConfig.headerText}
                  onChange={(e) => setTicketConfig({ ...ticketConfig, headerText: e.target.value })}
                  placeholder="مثال: مستشفى النور التخصصي"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  السطر الفرعي (الفرع / الصالة):
                </label>
                <input
                  type="text"
                  value={ticketConfig.subHeaderText}
                  onChange={(e) => setTicketConfig({ ...ticketConfig, subHeaderText: e.target.value })}
                  placeholder="مثال: الفرع الرئيسي - صالة خدمة المراجعين"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  الرسالة الختامية أسفل التذكرة:
                </label>
                <textarea
                  rows={2}
                  value={ticketConfig.footerText}
                  onChange={(e) => setTicketConfig({ ...ticketConfig, footerText: e.target.value })}
                  placeholder="مثال: شكراً لزيارتكم - نتمنى لكم يوماً سعيداً ودمتم بخير"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Paper Width & Scaling */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-600" />
              <span>خيارات ومقاس ورق الطابعة الحرارية</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  عرض رول الورق الحراري:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTicketConfig({ ...ticketConfig, paperWidth: '80mm' })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      ticketConfig.paperWidth === '80mm'
                        ? 'bg-brand-50 dark:bg-brand-900/40 border-brand-500 text-brand-600 dark:text-brand-400 shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>80 ملم (80mm)</span>
                    <span className="text-[10px] text-slate-400 font-normal">عريض قياسي (POS)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTicketConfig({ ...ticketConfig, paperWidth: '58mm' })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                      ticketConfig.paperWidth === '58mm'
                        ? 'bg-brand-50 dark:bg-brand-900/40 border-brand-500 text-brand-600 dark:text-brand-400 shadow-xs'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <span>58 ملم (58mm)</span>
                    <span className="text-[10px] text-slate-400 font-normal">مدمج صغير</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  مقياس حجم الخطوط:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['small', 'medium', 'large'] as const).map((scale) => (
                    <button
                      key={scale}
                      type="button"
                      onClick={() => setTicketConfig({ ...ticketConfig, fontSizeScale: scale })}
                      className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        ticketConfig.fontSizeScale === scale
                          ? 'bg-brand-50 dark:bg-brand-900/40 border-brand-500 text-brand-600 dark:text-brand-400 shadow-xs'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {scale === 'small' ? 'صغير' : scale === 'medium' ? 'متوسط' : 'كبير'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Element Toggles */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-600" />
              <span>إظهار أو إخفاء عناصر التذكرة</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-brand-600" />
                  رمز الباركود QR Code للجوال
                </span>
                <input
                  type="checkbox"
                  checked={ticketConfig.showQrCode}
                  onChange={() => handleToggle('showQrCode')}
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  الوقت التقديري للانتظار
                </span>
                <input
                  type="checkbox"
                  checked={ticketConfig.showWaitTimeEstimate}
                  onChange={() => handleToggle('showWaitTimeEstimate')}
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  عدد المراجعين أمامك في الطابور
                </span>
                <input
                  type="checkbox"
                  checked={ticketConfig.showWaitingCountAhead}
                  onChange={() => handleToggle('showWaitingCountAhead')}
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  اسم المراجع
                </span>
                <input
                  type="checkbox"
                  checked={ticketConfig.showCustomerName}
                  onChange={() => handleToggle('showCustomerName')}
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  التاريخ ووقت الإصدار
                </span>
                <input
                  type="checkbox"
                  checked={ticketConfig.showDateAndTime}
                  onChange={() => handleToggle('showDateAndTime')}
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  اسم الفرع / الصالة
                </span>
                <input
                  type="checkbox"
                  checked={ticketConfig.showBranchName}
                  onChange={() => handleToggle('showBranchName')}
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live Thermal Receipt Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-brand-600" />
                معاينة حية فورية لإيصال الطابعة الحرارية
              </span>
              <button
                type="button"
                onClick={handleTestPrint}
                className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>تجربة الطباعة</span>
              </button>
            </div>

            {/* Paper Container Simulator */}
            <div className="bg-slate-200 dark:bg-slate-950 p-4 sm:p-6 rounded-3xl border border-slate-300 dark:border-slate-800 flex justify-center shadow-inner">
              <div
                style={{
                  width: ticketConfig.paperWidth === '58mm' ? '240px' : '310px',
                }}
                className={`bg-white text-black p-4 rounded shadow-md border-t-8 border-slate-800 font-mono text-center transition-all ${
                  ticketConfig.fontSizeScale === 'small'
                    ? 'text-[11px]'
                    : ticketConfig.fontSizeScale === 'large'
                    ? 'text-sm'
                    : 'text-xs'
                }`}
              >
                {/* Header */}
                <h3 className="font-black text-base text-black mb-0.5 tracking-tight">
                  {ticketConfig.headerText || 'اسم المنشأة'}
                </h3>
                {ticketConfig.showBranchName && (
                  <p className="text-[11px] text-slate-600 mb-2">
                    {ticketConfig.subHeaderText || 'اسم الفرع'}
                  </p>
                )}

                <div className="border-b-2 border-dashed border-slate-400 my-2"></div>

                {/* Ticket Number */}
                <p className="text-[11px] font-bold text-slate-500 my-0.5">رقم التذكرة</p>
                <h2 className="text-5xl font-black my-1 text-black tracking-widest num-latin">
                  101
                </h2>
                <p className="text-xs font-black text-black">خدمة العملاء والاستقبال</p>

                <div className="border-b-2 border-dashed border-slate-400 my-2"></div>

                {/* Details */}
                <div className="space-y-1 text-right my-2 text-[11px]">
                  {ticketConfig.showDateAndTime && (
                    <div className="flex justify-between text-slate-700">
                      <span>التاريخ والوقت:</span>
                      <span className="num-latin">10:30:15 AM</span>
                    </div>
                  )}

                  {ticketConfig.showCustomerName && (
                    <div className="flex justify-between text-slate-700">
                      <span>اسم المراجع:</span>
                      <span className="font-bold text-black">سعد العلي</span>
                    </div>
                  )}

                  {ticketConfig.showWaitingCountAhead && (
                    <div className="flex justify-between text-slate-700">
                      <span>المراجعون أمامك:</span>
                      <span className="font-black text-black num-latin">2 مراجع</span>
                    </div>
                  )}

                  {ticketConfig.showWaitTimeEstimate && (
                    <div className="flex justify-between text-slate-700">
                      <span>الوقت المتوقع:</span>
                      <span className="font-black text-black num-latin">~ 8 دقائق</span>
                    </div>
                  )}
                </div>

                <div className="border-b-2 border-dashed border-slate-400 my-2"></div>

                {/* QR Code */}
                {ticketConfig.showQrCode && (
                  <div className="my-2.5 flex flex-col items-center">
                    <div className="p-1 bg-white border border-slate-300 rounded inline-block">
                      <QRCodeDisplay
                        value="https://example.com/track/101"
                        size={80}
                        title="باركود التتبع"
                        showActions={false}
                      />
                    </div>
                    <span className="text-[9px] text-slate-500 mt-1 block">
                      امسح الباركود بهاتفك لمتابعة دورك
                    </span>
                  </div>
                )}

                {/* Footer */}
                {ticketConfig.footerText && (
                  <p className="text-[10px] text-slate-600 font-sans mt-2 pt-2 border-t border-slate-200 leading-snug">
                    {ticketConfig.footerText}
                  </p>
                )}

                {/* Serrated paper cut edge */}
                <div className="mt-4 pt-1 flex justify-center gap-1 opacity-25">
                  <div className="w-1.5 h-1.5 rotate-45 bg-black"></div>
                  <div className="w-1.5 h-1.5 rotate-45 bg-black"></div>
                  <div className="w-1.5 h-1.5 rotate-45 bg-black"></div>
                  <div className="w-1.5 h-1.5 rotate-45 bg-black"></div>
                  <div className="w-1.5 h-1.5 rotate-45 bg-black"></div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-center text-slate-400 mt-2">
              عرض الورق المحدد: {ticketConfig.paperWidth} • مقياس الخط: {ticketConfig.fontSizeScale}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
