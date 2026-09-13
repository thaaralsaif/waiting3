import React, { useState } from 'react';
import { AppState, Counter, Ticket, Service, NotificationTrigger } from '../types';
import { ArrowRight, PhoneCall, CheckCircle2, Shuffle, Users, Crown, Clock, Monitor, FileText, Bell, AlertCircle, Info, CalendarCheck, MessageCircle, Send } from 'lucide-react';
import { formatMinutes, formatCustomerCount } from '../utils';
import { TransferTicketModal } from './TransferTicketModal';
import { StaffNotificationModal } from './StaffNotificationModal';

interface StaffViewProps {
  appState: AppState;
  currentCounterId: string;
  onChangeCounter: (id: string) => void;
  onCallNext: () => void;
  onRecall: () => void;
  onComplete: () => void;
  onTransfer: (params: {
    targetServiceId: string;
    targetCounterId?: string | null;
    priorityMode: 'top_priority' | 'normal';
    reason: string;
    note?: string;
  }) => void;
  onLogNotification?: (params: {
    ticket: Ticket;
    channel: 'whatsapp' | 'sms';
    trigger: NotificationTrigger;
    messageText: string;
  }) => void;
}

export const StaffView: React.FC<StaffViewProps> = ({
  appState,
  currentCounterId,
  onChangeCounter,
  onCallNext,
  onRecall,
  onComplete,
  onTransfer,
  onLogNotification,
}) => {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [notificationTargetTicket, setNotificationTargetTicket] = useState<Ticket | null>(null);

  const currentCounter = appState.counters.find((c) => c.id === currentCounterId) || appState.counters[0];
  const activeTicket = currentCounter ? appState.tickets.find((t) => t.id === currentCounter.activeTicketId) : null;

  const waitingTickets = appState.tickets.filter((t) => t.status === 'waiting');
  
  // تذاكر محولة موجهة مباشرة لهذا المكتب
  const assignedIncomingTickets = waitingTickets.filter(
    (t) => t.assignedCounterId === currentCounter?.id
  );

  // ترتيب الطابور: المخصصة لهذا المكتب أولاً، ثم الأولوية، ثم الأقدم
  const sortedQueue = [...waitingTickets].sort((a, b) => {
    const aAssigned = a.assignedCounterId === currentCounter?.id ? 1 : 0;
    const bAssigned = b.assignedCounterId === currentCounter?.id ? 1 : 0;
    if (aAssigned !== bAssigned) return bAssigned - aAssigned;

    if (a.isPriority && !b.isPriority) return -1;
    if (!a.isPriority && b.isPriority) return 1;
    return a.createdAt - b.createdAt;
  });

  const minutesWaiting = activeTicket ? Math.floor((Date.now() - activeTicket.createdAt) / 60000) : 0;
  const latestTransfer = activeTicket?.transferHistory && activeTicket.transferHistory.length > 0
    ? activeTicket.transferHistory[activeTicket.transferHistory.length - 1]
    : null;

  return (
    <section className="space-y-6">
      {/* Top Header Bar */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-900/50 text-brand-600 flex items-center justify-center text-xl shadow-sm">
            <Monitor className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-white text-lg">لوحة تحكم شباك الموظف</h3>
            <p className="text-xs text-slate-500">استدعاء المراجعين، إنجاز المعاملات والتحويل الذكي بين المكاتب</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-600 dark:text-slate-300">المكتب الحالي:</label>
          <select
            value={currentCounter?.id || ''}
            onChange={(e) => onChangeCounter(e.target.value)}
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-brand-600 font-black rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-500 cursor-pointer shadow-sm"
          >
            {appState.counters.map((c: Counter) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.staffName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Direct Counter Hand-off Incoming Notification */}
      {assignedIncomingTickets.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-xs animate-pulse">
          <div className="flex items-center gap-2.5 text-xs">
            <Bell className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-extrabold block text-sm">
                🔔 تنبيه تحويل مباشر: لديك {assignedIncomingTickets.length} تذكرة محولة موجهة إلى مكتبك!
              </span>
              <span className="text-[11px] opacity-85 block mt-0.5">
                تذكرة رقم ({assignedIncomingTickets[0].code}) من {assignedIncomingTickets[0].transferHistory?.[0]?.fromCounterName || 'مكتب آخر'} 
                {assignedIncomingTickets[0].transferHistory?.[0]?.reason ? ` • السبب: ${assignedIncomingTickets[0].transferHistory[0].reason}` : ''}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCallNext}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shrink-0 transition cursor-pointer shadow-sm"
          >
            استدعاء المحولة فوراً
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Ticket Controls */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
            <div>
              <span className="text-xs font-bold text-slate-400 block mb-1">التذكرة الحالية قيد الخدمة</span>
              <h2 className="text-5xl sm:text-6xl font-black text-brand-600 num-latin my-1 tracking-wider">
                {activeTicket ? activeTicket.code : 'لا يوجد'}
              </h2>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {activeTicket ? activeTicket.serviceName : 'اضغط "استدعاء التالي" للبدء بالخدمة'}
              </span>
            </div>

            <div className="flex flex-col items-end gap-1.5">
              {activeTicket?.isPriority && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-500 text-white shadow">
                  <Crown className="w-4 h-4" /> عميل أولوية خاصة VIP
                </span>
              )}
              {activeTicket?.isAppointment && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-indigo-600 text-white shadow">
                  <CalendarCheck className="w-3.5 h-3.5" /> موعد مسبق مؤكد ({activeTicket.appointmentCode || 'حجز'})
                </span>
              )}
              {latestTransfer && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
                  <Shuffle className="w-3 h-3" /> محوّلة من {latestTransfer.fromCounterName}
                </span>
              )}
            </div>
          </div>

          {/* Transfer Info Banner if active ticket was transferred */}
          {latestTransfer && (
            <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 p-3 rounded-2xl text-xs space-y-1">
              <div className="flex items-center justify-between text-blue-900 dark:text-blue-200 font-bold">
                <span className="flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  بيانات التحويل الوارد من: {latestTransfer.fromCounterName}
                </span>
                <span className="text-[10px] text-blue-500 num-latin">
                  {new Date(latestTransfer.transferredAt).toLocaleTimeString('ar-SA')}
                </span>
              </div>
              <p className="text-blue-800 dark:text-blue-300 text-[11px]">
                <strong>السبب:</strong> {latestTransfer.reason}
                {latestTransfer.note && ` • ملاحظة الزميل: "${latestTransfer.note}"`}
              </p>
            </div>
          )}

          {/* Active Ticket Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-slate-400 block mb-1 font-semibold">اسم المراجع:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                {activeTicket?.customerName || 'غير مسجل'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1 font-semibold">رقم الجوال:</span>
              <span className="font-bold text-slate-700 dark:text-slate-200 num-latin text-sm">
                {activeTicket?.phone || '---'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1 font-semibold">وقت الانتظار:</span>
              <span className="font-bold text-brand-600 text-sm">
                {formatMinutes(minutesWaiting)}
              </span>
            </div>
          </div>

          {/* Active Ticket Custom Intake Data */}
          {activeTicket?.customData && Object.keys(activeTicket.customData).length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-bold text-xs flex items-center gap-1.5 mb-2">
                <FileText className="w-3.5 h-3.5 text-brand-600" />
                بيانات النموذج المخصص للمراجع:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(activeTicket.customData).map(([fId, val]) => {
                  const fDef = appState.settings.intakeForm?.customFields?.find((f) => f.id === fId);
                  return (
                    <div key={fId} className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span className="text-slate-400 block text-[10px]">{fDef?.label || 'بيان'}:</span>
                      <span className="font-bold text-slate-800 dark:text-white text-xs">{val}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <button
              type="button"
              onClick={onCallNext}
              style={{
                backgroundColor: appState.settings.theme.primary,
                color: appState.settings.theme.buttonTextColor || '#ffffff'
              }}
              className="py-3.5 px-4 rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-1.5 shadow-lg transition cursor-pointer hover:opacity-95"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
              <span>استدعاء التالي</span>
            </button>

            <button
              type="button"
              onClick={onRecall}
              disabled={!activeTicket}
              className={`py-3.5 px-4 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition ${
                activeTicket
                  ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/25 cursor-pointer'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              <PhoneCall className="w-5 h-5" />
              <span>إعادة النداء</span>
            </button>

            <button
              type="button"
              onClick={onComplete}
              disabled={!activeTicket}
              className={`py-3.5 px-4 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition ${
                activeTicket
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25 cursor-pointer'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>إنهاء الخدمة</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTransferModal(true)}
              disabled={!activeTicket}
              className={`py-3.5 px-4 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition ${
                activeTicket
                  ? 'bg-slate-700 hover:bg-slate-800 text-white shadow-md cursor-pointer'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Shuffle className="w-5 h-5" />
              <span>تحويل التذكرة</span>
            </button>
          </div>

          {/* Quick WhatsApp & SMS Communication Bar */}
          {activeTicket && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setNotificationTargetTicket(activeTicket)}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-l from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs flex items-center justify-between shadow-md shadow-emerald-600/20 transition cursor-pointer border border-emerald-500/30"
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <MessageCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span>إرسال تنبيه واتساب / SMS للمراجع (WhatsApp Readiness)</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono opacity-90 num-latin">
                    {activeTicket.phone || 'إرسال مباشر'}
                  </span>
                  <Send className="w-3.5 h-3.5 rotate-180" />
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Queue List */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700 mb-3">
            <h4 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-600" />
              طابور الانتظار الحالي
            </h4>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-black text-brand-600 num-latin">
              {waitingTickets.length}
            </span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[350px] flex-1 pr-1">
            {sortedQueue.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">لا يوجد مراجعين في قائمة الانتظار حالياً.</p>
            ) : (
              sortedQueue.map((t: Ticket, index: number) => {
                const isAssignedToThisCounter = t.assignedCounterId === currentCounter?.id;
                const isTransferred = t.isTransferred || (t.transferHistory && t.transferHistory.length > 0);
                const lastLog = t.transferHistory && t.transferHistory.length > 0 ? t.transferHistory[t.transferHistory.length - 1] : null;

                return (
                  <div
                    key={t.id}
                    className={`p-3 rounded-2xl border text-xs transition ${
                      isAssignedToThisCounter
                        ? 'border-amber-400 bg-amber-50/90 dark:bg-amber-950/40 shadow-xs ring-1 ring-amber-400/50'
                        : t.isPriority
                        ? 'border-amber-300 bg-amber-50/60 dark:bg-amber-950/20'
                        : isTransferred
                        ? 'border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-950/20'
                        : 'border-slate-100 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="font-bold text-slate-400 text-xs num-latin">#{index + 1}</span>
                        <div>
                          <span className="font-black text-brand-600 num-latin text-base block">{t.code}</span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate max-w-[140px]">
                            {t.serviceName} • {t.customerName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setNotificationTargetTicket(t)}
                          title="إرسال تنبيه واتساب / SMS لهذا المراجع"
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-600 transition cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex flex-col items-end gap-1">
                          {isAssignedToThisCounter && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-600 text-white shadow-2xs">
                              موجهة لك 🎯
                            </span>
                          )}
                          {t.isPriority && !isAssignedToThisCounter && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-white shadow-2xs">
                              VIP
                            </span>
                          )}
                          {t.isAppointment && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-600 text-white shadow-2xs">
                              موعد 📅
                            </span>
                          )}
                          {isTransferred && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                              محوّلة ↩️
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {lastLog && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>من {lastLog.fromCounterName}: {lastLog.reason}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Smart Workload Balancing & Transfer Modal */}
      {showTransferModal && activeTicket && currentCounter && (
        <TransferTicketModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          activeTicket={activeTicket}
          currentCounter={currentCounter}
          appState={appState}
          onConfirmTransfer={(params) => {
            onTransfer(params);
            setShowTransferModal(false);
          }}
        />
      )}

      {/* Staff Direct WhatsApp / SMS Modal */}
      {notificationTargetTicket && currentCounter && (
        <StaffNotificationModal
          isOpen={Boolean(notificationTargetTicket)}
          onClose={() => setNotificationTargetTicket(null)}
          ticket={notificationTargetTicket}
          counter={currentCounter}
          settings={appState.settings}
          aheadCount={sortedQueue.findIndex((t) => t.id === notificationTargetTicket.id)}
          onLogNotification={(params) => {
            if (onLogNotification) {
              onLogNotification({
                ticket: notificationTargetTicket,
                ...params,
              });
            }
          }}
        />
      )}
    </section>
  );
};

