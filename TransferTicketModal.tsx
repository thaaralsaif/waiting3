import React, { useState, useMemo } from 'react';
import { AppState, Counter, Service, Ticket } from '../types';
import { 
  Shuffle, ArrowRight, Check, AlertCircle, Sparkles, Clock, 
  Users, ShieldAlert, FileText, ChevronRight, Zap, Scale
} from 'lucide-react';
import { 
  calculateCounterWorkloads, 
  calculateServiceWorkloads, 
  formatMinutes, 
  formatCustomerCount 
} from '../utils';

interface TransferTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTicket: Ticket | null;
  currentCounter: Counter;
  appState: AppState;
  onConfirmTransfer: (params: {
    targetServiceId: string;
    targetCounterId?: string | null;
    priorityMode: 'top_priority' | 'normal';
    reason: string;
    note?: string;
  }) => void;
}

const PRESET_REASONS = [
  { id: 'docs', label: 'استكمال ومطابقة مستندات', icon: '📑' },
  { id: 'attest', label: 'اعتماد وتصديق رسمي', icon: '⚖️' },
  { id: 'payment', label: 'سداد الرسوم والصندوق', icon: '💳' },
  { id: 'supervisor', label: 'تحويل للمشرف الإداري', icon: '👔' },
  { id: 'reroute', label: 'توجيه للخدمة المناسبة', icon: '🔄' },
];

export const TransferTicketModal: React.FC<TransferTicketModalProps> = ({
  isOpen,
  onClose,
  activeTicket,
  currentCounter,
  appState,
  onConfirmTransfer,
}) => {
  if (!isOpen || !activeTicket) return null;

  // Workload calculations
  const counterWorkloads = useMemo(() => calculateCounterWorkloads(appState), [appState]);
  const serviceWorkloads = useMemo(() => calculateServiceWorkloads(appState), [appState]);

  // Find lowest load service and counter
  const otherServices = appState.services.filter((s) => s.id !== activeTicket.serviceId);
  const targetServiceList = otherServices.length > 0 ? otherServices : appState.services;
  
  const recommendedService = useMemo(() => {
    return [...serviceWorkloads]
      .filter((sw) => sw.serviceId !== activeTicket.serviceId)
      .sort((a, b) => a.waitingCount - b.waitingCount)[0] || serviceWorkloads[0];
  }, [serviceWorkloads, activeTicket.serviceId]);

  const recommendedCounter = useMemo(() => {
    return [...counterWorkloads]
      .filter((cw) => cw.counterId !== currentCounter.id)
      .sort((a, b) => a.loadScore - b.loadScore)[0] || counterWorkloads[0];
  }, [counterWorkloads, currentCounter.id]);

  // Form states
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    recommendedService ? recommendedService.serviceId : targetServiceList[0]?.id || ''
  );
  const [selectedCounterId, setSelectedCounterId] = useState<string>('auto'); // 'auto' or counterId
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_REASONS[0].label);
  const [customReason, setCustomReason] = useState<string>('');
  const [priorityMode, setPriorityMode] = useState<'top_priority' | 'normal'>('top_priority');
  const [staffNote, setStaffNote] = useState<string>('');

  const finalReason = customReason.trim() ? customReason.trim() : selectedReason;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServiceId) return;

    onConfirmTransfer({
      targetServiceId: selectedServiceId,
      targetCounterId: selectedCounterId === 'auto' ? null : selectedCounterId,
      priorityMode,
      reason: finalReason,
      note: staffNote.trim() || undefined,
    });
    onClose();
  };

  const selectedServiceWorkload = serviceWorkloads.find((sw) => sw.serviceId === selectedServiceId);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-xl w-full p-5 sm:p-7 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-5 my-auto max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-brand-500/10 text-brand-600 flex items-center justify-center shrink-0">
              <Shuffle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                تحويل التذكرة وإعادة التوجيه الذكي
              </h3>
              <p className="text-xs text-slate-400">
                توزيع ضغط العمل بين المكاتب وإحالة المراجع مع حفظ بياناته
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Current Active Ticket Badge */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-brand-600 num-latin bg-white dark:bg-slate-800 px-3 py-1 rounded-xl shadow-2xs border border-slate-200 dark:border-slate-700">
              {activeTicket.code}
            </span>
            <div>
              <span className="font-bold text-slate-800 dark:text-slate-100 block">
                {activeTicket.customerName || 'مراجع'} {activeTicket.phone ? `(${activeTicket.phone})` : ''}
              </span>
              <span className="text-slate-400 text-[11px]">
                الخدمة الحالية: {activeTicket.serviceName} • المحطة: {currentCounter.name}
              </span>
            </div>
          </div>
          {activeTicket.isPriority && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              ⚡ ذات أولوية
            </span>
          )}
        </div>

        {/* Smart Workload Recommendation Insight */}
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-extrabold block text-xs">توصية توازن الأحمال التلقائي:</span>
            <p className="text-[11px] opacity-90 leading-relaxed">
              المكتب <strong className="font-black text-emerald-700 dark:text-emerald-200">{recommendedCounter?.counterName}</strong> هو الأقل حملاً حالياً
              {recommendedCounter?.isIdle ? ' (شاغر ومتاح للاستقبال فوراً)' : ' (أقل وقت انتظار متوقع)'}.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target Service Selection */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5">
              1. اختر الخدمة أو القسم المستهدف:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {appState.services.map((s) => {
                const sWorkload = serviceWorkloads.find((sw) => sw.serviceId === s.id);
                const isCurrent = s.id === activeTicket.serviceId;
                const isSelected = selectedServiceId === s.id;
                const isRecommended = recommendedService?.serviceId === s.id && !isCurrent;

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedServiceId(s.id)}
                    className={`p-3 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/70 dark:bg-brand-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {s.name}
                      </span>
                      <span className="text-[10px] font-black num-latin text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                        {s.prefix}01+
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      <span>الانتظار: {formatCustomerCount(sWorkload?.waitingCount || 0)}</span>
                      {isRecommended && (
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                          ⭐ الأقل انتظاراً
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-[10px] text-slate-400">
                          (الخدمة الحالية)
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target Counter Selection */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5">
              2. توجيه التحويل إلى شباك / موظف محدد (اختياري):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Auto Option */}
              <button
                type="button"
                onClick={() => setSelectedCounterId('auto')}
                className={`p-2.5 rounded-2xl border text-center transition cursor-pointer ${
                  selectedCounterId === 'auto'
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs block font-bold">تلقائي (أي مكتب متاح)</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">أول موظف يستدعي التذكرة</span>
              </button>

              {/* Counters List */}
              {appState.counters.map((c) => {
                const cw = counterWorkloads.find((w) => w.counterId === c.id);
                const isSelected = selectedCounterId === c.id;
                const isCurrent = c.id === currentCounter.id;
                const isRecommended = recommendedCounter?.counterId === c.id && !isCurrent;

                return (
                  <button
                    key={c.id}
                    type="button"
                    disabled={isCurrent}
                    onClick={() => setSelectedCounterId(c.id)}
                    className={`p-2.5 rounded-2xl border text-right transition cursor-pointer relative ${
                      isCurrent
                        ? 'opacity-40 border-slate-200 bg-slate-100 dark:bg-slate-800 cursor-not-allowed'
                        : isSelected
                        ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        {c.name}
                      </span>
                      {cw?.isIdle ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="شاغر ومتاح الآن" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-amber-500" title="مشغول حالياً" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {isCurrent ? 'مكتبك الحالي' : cw?.isIdle ? 'شاغر ومستعد' : 'يخدم مراجعاً'}
                    </span>
                    {isRecommended && (
                      <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block mt-0.5">
                        ⭐ مقترح للموازنة
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Preset Reasons */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5">
              3. سبب التحويل والمطابقة:
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {PRESET_REASONS.map((r) => {
                const isActive = selectedReason === r.label && !customReason.trim();
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setSelectedReason(r.label);
                      setCustomReason('');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    <span>{r.icon}</span>
                    <span>{r.label}</span>
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="أو اكتب سبب تحويل مخصص هنا إن لم يكن ضمن الخيارات..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none transition"
            />
          </div>

          {/* Priority Escalation Options */}
          <div>
            <label className="block text-xs font-extrabold text-slate-800 dark:text-slate-200 mb-1.5">
              4. مستوى الأسبقية في طابور المكتب المستلم:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPriorityMode('top_priority')}
                className={`p-3 rounded-2xl border text-right transition cursor-pointer flex items-start gap-2.5 ${
                  priorityMode === 'top_priority'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 font-bold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <Zap className={`w-4 h-4 mt-0.5 shrink-0 ${priorityMode === 'top_priority' ? 'text-amber-600' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs font-black block">أولوية عاجلة (مقدمة الطابور)</span>
                  <span className="text-[10px] opacity-75 block mt-0.5">
                    مراعاة وقت انتظار المراجع السابق واستدعائه فور فراغ المكتب المستهدف
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPriorityMode('normal')}
                className={`p-3 rounded-2xl border text-right transition cursor-pointer flex items-start gap-2.5 ${
                  priorityMode === 'normal'
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40 text-brand-800 dark:text-brand-200 font-bold'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                }`}
              >
                <Clock className={`w-4 h-4 mt-0.5 shrink-0 ${priorityMode === 'normal' ? 'text-brand-600' : 'text-slate-400'}`} />
                <div>
                  <span className="text-xs font-bold block">ترتيب عادي حسب الوقت</span>
                  <span className="text-[10px] opacity-75 block mt-0.5">
                    إدراج التذكرة وفق وقت الإصدار الأصلي بدون قفز الأولويات
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Internal Staff Handover Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ملاحظة سرية للزميل المستلم (اختياري):
            </label>
            <textarea
              rows={2}
              value={staffNote}
              onChange={(e) => setStaffNote(e.target.value)}
              placeholder="مثال: تم التأكد من السجل التجاري، يحتاج المراجع ختم الوكالة الشرعية فقط..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-black bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/25 transition cursor-pointer flex items-center gap-1.5"
            >
              <Shuffle className="w-4 h-4" />
              تأكيد تحويل التذكرة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
