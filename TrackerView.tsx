import React, { useState } from 'react';
import { AppState, Ticket, TicketFeedback } from '../types';
import { PublicTrackerSnapshot } from '../services/firebaseService';
import { Smartphone, Bell, Clock, Users, ArrowRight, Printer, Sparkles, CheckCircle2, Shuffle, GitBranch, Check, HeartHandshake } from 'lucide-react';
import { CustomerFeedbackForm } from './CustomerFeedbackView';

interface TrackerViewProps {
  appState: AppState;
  selectedTicketId: string | null;
  publicTracker?: PublicTrackerSnapshot | null;
  onTrackCode: (code: string) => void;
  onPrintThermal: (ticket: Ticket) => void;
  onSaveFeedback?: (feedback: TicketFeedback) => void;
  isCustomerIsolated?: boolean;
}

export const TrackerView: React.FC<TrackerViewProps> = ({
  appState,
  selectedTicketId,
  publicTracker,
  onTrackCode,
  onPrintThermal,
  onSaveFeedback,
  isCustomerIsolated = false,
}) => {
  const [inputCode, setInputCode] = useState('');

  // استخراج التذكرة الحالية
  const localTicket = selectedTicketId
    ? appState.tickets.find((t) => t.id === selectedTicketId || String(t.code) === String(selectedTicketId))
    : appState.tickets[appState.tickets.length - 1] || null;

  const currentTicket: Ticket | null = publicTracker ? {
    id: `public_${publicTracker.token}`,
    code: publicTracker.ticketCode,
    serviceId: 'public',
    serviceName: publicTracker.serviceName,
    customerName: '',
    phone: '',
    nationalId: '',
    isPriority: false,
    status: publicTracker.status,
    counterId: null,
    counterName: publicTracker.counterName,
    createdAt: publicTracker.createdAt,
    calledAt: publicTracker.calledAt,
    completedAt: publicTracker.completedAt,
    publicTrackToken: publicTracker.token,
  } : localTicket;

  const publicAheadCount = publicTracker?.aheadCount ?? 0;

  const aheadCount = publicTracker
    ? publicAheadCount
    : localTicket
    ? appState.tickets.filter(
        (t) => t.status === 'waiting' && t.serviceId === localTicket.serviceId && t.createdAt < localTicket.createdAt
      ).length
    : publicAheadCount;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      onTrackCode(inputCode.trim());
    }
  };

  return (
    <section className="max-w-2xl mx-auto w-full space-y-6">
      {/* Customer Mode Banner */}
      {isCustomerIsolated && (
        <div className="p-3 bg-emerald-500 text-white rounded-2xl text-center text-xs font-bold shadow-sm flex items-center justify-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          <span>أهلاً بك! تم تثبيت صفحة التتبع المباشر لدورك بنجاح على هاتفك.</span>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-lg text-center space-y-6">
        {/* Header info */}
        <div className="flex items-center justify-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center text-xl shadow-sm">
            <Smartphone className="w-6 h-6 animate-pulse" />
          </div>
          <div className="text-right">
            <h3 className="text-xl font-black text-slate-800 dark:text-white">التتبع الحي المباشر لتذكرتك</h3>
            <p className="text-xs text-slate-400">تابع دورك لحظة بلحظة برقم تذكرتك دون الحاجة للوقوف داخل الصالة</p>
          </div>
        </div>

        {/* Manual lookup is intentionally disabled in public QR mode; the opaque token is the only public identifier. */}
        {!isCustomerIsolated && (
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="number"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="أدخل رقم تذكرتك (مثال: 101)"
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-center font-black text-brand-600 text-xl num-latin focus:ring-2 focus:ring-brand-500 focus:outline-none transition"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-brand-600 text-white rounded-2xl text-sm font-bold hover:bg-brand-700 transition shadow-sm cursor-pointer"
          >
            تتبع
          </button>
        </form>
        )}

        {/* Status Card */}
        {!currentTicket ? (
          <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-slate-400 text-xs">
            الرجاء إدخال رقم تذكرتك في الأعلى للمتابعة الحية.
          </div>
        ) : (
          <div className="border-2 border-brand-500/40 bg-brand-50/40 dark:bg-brand-950/20 p-6 rounded-3xl space-y-5">
            {/* Status Badge */}
            <div className="flex justify-between items-center text-xs font-bold border-b border-slate-200 dark:border-slate-700/60 pb-3">
              <span className="text-slate-500">حالة التذكرة:</span>
              <span
                className={`px-3.5 py-1 rounded-full text-xs font-black ${
                  currentTicket.status === 'serving'
                    ? 'bg-emerald-500 text-white animate-bounce shadow'
                    : currentTicket.status === 'completed'
                    ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                }`}
              >
                {currentTicket.status === 'serving'
                  ? 'يتم النداء الآن! تفضل للشباك'
                  : currentTicket.status === 'completed'
                  ? 'تمت الخدمة بنجاح'
                  : 'في قائمة الانتظار'}
              </span>
            </div>

            {/* Big Ticket Code Display */}
            <div className="py-2">
              <span className="text-xs text-slate-400 block font-semibold mb-1">رقم تذكرتك</span>
              <h2 className="text-6xl sm:text-7xl font-black text-brand-600 num-latin tracking-wider my-1">
                {currentTicket.code}
              </h2>
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 block">
                {currentTicket.serviceName}
              </span>
              {currentTicket.customerName && (
                <span className="text-xs text-slate-400 block mt-0.5">
                  المراجع: {currentTicket.customerName}
                </span>
              )}
            </div>

            {/* Transfer Notification Banner */}
            {currentTicket.transferHistory && currentTicket.transferHistory.length > 0 && (
              <div className="p-4 bg-blue-500/15 border border-blue-500/30 rounded-2xl text-right text-xs space-y-1 text-blue-900 dark:text-blue-200">
                <div className="flex items-center gap-2 font-black text-sm text-blue-700 dark:text-blue-300">
                  <Shuffle className="w-4 h-4" />
                  <span>تم تحويل معاملتك إلى: {currentTicket.serviceName}</span>
                </div>
                <p className="text-[11px] opacity-90">
                  <strong>السبب:</strong> {currentTicket.transferHistory[currentTicket.transferHistory.length - 1].reason}
                  {currentTicket.transferHistory[currentTicket.transferHistory.length - 1].toCounterName && 
                    ` • موجهة إلى: ${currentTicket.transferHistory[currentTicket.transferHistory.length - 1].toCounterName}`}
                </p>
                <p className="text-[10px] text-blue-600 dark:text-blue-400">
                  أولويتك محفوظة بالنظام وسيقوم الشباك الجديد بالنداء عليك تلقائياً.
                </p>
              </div>
            )}

            {/* Serving Alert Banner */}
            {currentTicket.status === 'serving' && (
              <div className="p-4 bg-emerald-500 text-white rounded-2xl font-black text-base shadow-lg animate-pulse flex items-center justify-center gap-2">
                <Bell className="w-5 h-5" />
                <span>حان دورك الآن! يرجى التوجه إلى: {currentTicket.counterName || 'المكتب المحدد'}</span>
              </div>
            )}

            {/* Live Metrics */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-center">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xs">
                <span className="text-[11px] text-slate-400 block font-semibold">أمامك الآن</span>
                <span className="text-2xl font-black text-slate-800 dark:text-white num-latin">
                  {currentTicket.status === 'waiting' ? aheadCount : 0}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xs">
                <span className="text-[11px] text-slate-400 block font-semibold">تُخدم حالياً</span>
                <span className="text-2xl font-black text-brand-600 num-latin">
                  {appState.lastCalled ? appState.lastCalled.ticketCode : '---'}
                </span>
              </div>
              <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xs">
                <span className="text-[11px] text-slate-400 block font-semibold">الوقت المتبقي</span>
                <span className="text-2xl font-black text-emerald-600 num-latin">
                  {currentTicket.status === 'serving'
                    ? 'الآن'
                    : currentTicket.status === 'completed'
                    ? 'منتهي'
                    : `~ ${Math.max(1, aheadCount * 4)} د`}
                </span>
              </div>
            </div>

            {/* Multi-Step Review & Transfer Journey Stepper */}
            {currentTicket.transferHistory && currentTicket.transferHistory.length > 0 && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 text-right text-xs">
                <span className="font-extrabold text-slate-700 dark:text-slate-300 block mb-2.5 flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-brand-600" /> مسار المراجعة والتحويلات:
                </span>
                <div className="space-y-2 border-r-2 border-slate-200 dark:border-slate-700 pr-3 mr-2">
                  <div className="relative">
                    <span className="absolute -right-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-800" />
                    <span className="font-bold text-slate-700 dark:text-slate-300 block text-[11px]">
                      إصدار التذكرة
                    </span>
                    <span className="text-[10px] text-slate-400 num-latin">
                      {new Date(currentTicket.createdAt).toLocaleTimeString('ar-SA')}
                    </span>
                  </div>

                  {currentTicket.transferHistory.map((log, idx) => (
                    <div key={log.id} className="relative pt-1">
                      <span className="absolute -right-[19px] top-2 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-800" />
                      <span className="font-bold text-blue-700 dark:text-blue-300 block text-[11px]">
                        تحويل من {log.fromCounterName} ➔ {log.toServiceName} {log.toCounterName ? `(${log.toCounterName})` : ''}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                        السبب: {log.reason} {log.note ? `• (${log.note})` : ''}
                      </span>
                      <span className="text-[9px] text-slate-400 num-latin">
                        {new Date(log.transferredAt).toLocaleTimeString('ar-SA')}
                      </span>
                    </div>
                  ))}

                  <div className="relative pt-1">
                    <span className="absolute -right-[19px] top-2 w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-white dark:ring-slate-800" />
                    <span className="font-bold text-slate-700 dark:text-slate-300 block text-[11px]">
                      {currentTicket.status === 'serving'
                        ? 'يتم النداء الآن'
                        : currentTicket.status === 'completed'
                        ? 'تم إنجاز المعاملة'
                        : 'في انتظار الاستدعاء بالشباك الجديد'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Satisfaction Survey (CSAT) for Completed Tickets */}
            {currentTicket.status === 'completed' && appState.settings.feedbackSettings?.enabled !== false && (
              <div className="pt-2">
                <CustomerFeedbackForm
                  appState={appState}
                  ticket={currentTicket}
                  onSaveFeedback={(fb) => {
                    if (onSaveFeedback) {
                      onSaveFeedback(fb);
                    }
                  }}
                  isCompact={true}
                />
              </div>
            )}

            {/* Thermal Print Button */}
            {!isCustomerIsolated && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onPrintThermal(currentTicket)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> طباعة إيصال التذكرة الورقي (Thermal 80mm)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
