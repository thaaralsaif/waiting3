import React, { useState } from 'react';
import { Ticket, Service, TicketPrintSettings, IntakeFormSettings, Appointment, AppointmentSettings } from '../types';
import { QrCode, Printer, Eye, Sparkles, AlertCircle, Crown, Clock, Users, ArrowRight, CalendarCheck, X, CheckCircle2, Camera, MessageCircle } from 'lucide-react';
import { formatCustomerCount, formatMinutes, getBaseAppUrl } from '../utils';
import { getWhatsAppDirectUrl } from '../utils/notifications';
import { QRCodeDisplay } from './QRCodeDisplay';
import { QRScannerModal } from './QRScannerModal';

interface KioskViewProps {
  services: Service[];
  ticketPrint?: TicketPrintSettings;
  intakeForm?: IntakeFormSettings;
  appointmentSettings?: AppointmentSettings;
  onIssueTicket: (
    serviceId: string,
    name: string,
    phone: string,
    nationalId: string,
    isPriority: boolean,
    customData?: Record<string, string>
  ) => Promise<Ticket | null>;
  onOpenTracker: (ticketId: string) => void;
  onPrintThermal: (ticket: Ticket) => void;
  waitingCountByService: (serviceId: string) => number;
  appointments?: Appointment[];
  onCheckInAppointment?: (appointment: Appointment) => Ticket | null;
  onNavigateToBooking?: () => void;
}

export const KioskView: React.FC<KioskViewProps> = ({
  services,
  ticketPrint,
  intakeForm,
  appointmentSettings,
  onIssueTicket,
  onOpenTracker,
  onPrintThermal,
  waitingCountByService,
  appointments,
  onCheckInAppointment,
  onNavigateToBooking,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, string>>({});
  const [isPriority, setIsPriority] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [issuedTicket, setIssuedTicket] = useState<Ticket | null>(null);

  // Appointment Check-in Modal State
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [appointmentLookupCode, setAppointmentLookupCode] = useState('');
  const [appointmentLookupError, setAppointmentLookupError] = useState<string | null>(null);

  const isNameRequired = intakeForm ? intakeForm.nameField === 'required' : true;
  const isNameHidden = intakeForm?.nameField === 'hidden';

  const isPhoneRequired = intakeForm ? intakeForm.phoneField === 'required' : true;
  const isPhoneHidden = intakeForm?.phoneField === 'hidden';

  const isNationalIdRequired = intakeForm ? intakeForm.nationalIdField === 'required' : true;
  const isNationalIdHidden = intakeForm?.nationalIdField === 'hidden';

  const showPriority = intakeForm ? intakeForm.enablePriorityToggle : true;

  const handleCustomFieldChange = (fieldId: string, val: string) => {
    setCustomFieldsData((prev) => ({
      ...prev,
      [fieldId]: val,
    }));
  };

  const handleServiceSelect = async (serviceId: string) => {
    // التحقق من الحقول الأساسية
    if (isNameRequired && !name.trim()) {
      setErrorMsg('عذراً، يرجى إدخال اسم المراجع الكامل أولاً لإصدار التذكرة!');
      return;
    }

    if (isPhoneRequired && !phone.trim()) {
      setErrorMsg('عذراً، يرجى إدخال رقم الجوال أولاً لإصدار التذكرة واستلام إشعار الدور!');
      return;
    }

    // التحقق الصارم من صحة رقم الجوال إذا تم إدخاله أو كان إلزامياً
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (isPhoneRequired && (!cleanPhone || cleanPhone.length < 10)) {
      setErrorMsg('عذراً، يرجى إدخال رقم جوال صحيح مكون من 10 أرقام (مثال: 05xxxxxxxx).');
      return;
    }
    if (phone.trim() && cleanPhone.length < 10) {
      setErrorMsg('رقم الجوال المدخل غير مكتمل! يجب أن يتكون من 10 أرقام (مثال: 05xxxxxxxx).');
      return;
    }

    const cleanNationalId = nationalId.replace(/[^0-9]/g, '');
    if (isNationalIdRequired && (!cleanNationalId || cleanNationalId.length < 10)) {
      setErrorMsg('عذراً، يرجى إدخال رقم هوية وطنية أو إقامة صحيح مكون من 10 أرقام!');
      return;
    }
    if (nationalId.trim() && cleanNationalId.length < 10) {
      setErrorMsg('رقم الهوية المدخل غير مكتمل! يجب أن يتكون من 10 أرقام.');
      return;
    }

    // التحقق من الحقول الإضافية المخصصة
    if (intakeForm?.customFields) {
      for (const field of intakeForm.customFields) {
        if (!field.serviceId || field.serviceId === serviceId) {
          if (field.required) {
            const val = customFieldsData[field.id]?.trim();
            if (!val) {
              setErrorMsg(`عذراً، حقل "${field.label}" إلزامي لإتمام إصدار التذكرة!`);
              return;
            }
          }
        }
      }
    }

    setErrorMsg(null);

    const finalCustomerName = name.trim() || 'مراجع';
    const finalPhone = phone.trim() || '—';
    const finalNationalId = nationalId.trim() || '—';

    const ticket = await onIssueTicket(
      serviceId,
      finalCustomerName,
      finalPhone,
      finalNationalId,
      isPriority,
      customFieldsData
    );

    if (ticket) {
      setIssuedTicket(ticket);
      // تفريغ المدخلات للعملية التالية مع بقاء كرت النتيجة
      setName('');
      setPhone('');
      setNationalId('');
      setCustomFieldsData({});
      setIsPriority(false);
    }
  };

  // رابط التتبع الذاتي المتكامل الذي يعمل على أي جهاز خارجي بدون أخطاء 403
  const getSelfContainedTrackUrl = (t: Ticket) => {
    const baseUrl = getBaseAppUrl(appointmentSettings?.publicQrBaseUrl);
    const params = new URLSearchParams();
    params.set('track', t.code);
    params.set('svc', t.serviceName);
    params.set('name', t.customerName);
    params.set('time', String(t.createdAt));
    return `${baseUrl}?${params.toString()}`;
  };

  // معالجة تسجيل حضور الموعد مع التحقق الصارم من تاريخ اليوم
  const processAppointmentCheckIn = (inputCode: string) => {
    setAppointmentLookupError(null);
    const q = inputCode.trim().toLowerCase();
    if (!q) {
      setAppointmentLookupError('الرجاء إدخال رمز الموعد أو رقم الهوية.');
      return;
    }

    const aptList = appointments || [];
    const found = aptList.find(
      (a) =>
        a.code.toLowerCase() === q ||
        a.nationalId.trim() === q ||
        a.phone.trim() === q
    );

    if (!found) {
      setAppointmentLookupError('عذراً، لم يتم العثور على موعد مطابق لرمز الموعد أو رقم الهوية المدخل.');
      return;
    }

    if (found.status === 'cancelled') {
      setAppointmentLookupError('عذراً، هذا الموعد ملغي مسبقاً.');
      return;
    }

    if (found.status === 'checked_in') {
      setAppointmentLookupError(`تم تسجيل حضور هذا الموعد مسبقاً بالتذكرة رقم (${found.ticketCode || ''}).`);
      return;
    }

    // التحقق الصارم من تاريخ الموعد: هل هو نفس تاريخ اليوم؟
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const strictDateCheck = appointmentSettings?.strictDateCheck !== false;
    if (strictDateCheck && found.date !== todayStr) {
      if (found.date > todayStr) {
        setAppointmentLookupError(`عذراً، هذا الموعد مجدول لتاريخ قادم (${found.date}) الساعة (${found.timeSlot}). لا يمكن تسجيل الحضور وإصدار تذكرة إلا في نفس يوم الموعد!`);
        return;
      } else {
        setAppointmentLookupError(`عذراً، هذا الموعد منتهي الصلاحية وكان مجدولاً لتاريخ سابق (${found.date}). يرجى حجز موعد جديد.`);
        return;
      }
    }

    if (onCheckInAppointment) {
      const t = onCheckInAppointment(found);
      if (t) {
        setIssuedTicket(t);
        setShowAppointmentModal(false);
        setAppointmentLookupCode('');
      }
    }
  };

  return (
    <section className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-l from-brand-700 to-brand-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden app-banner-gradient">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs backdrop-blur font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> مرحباً بك في صالتنا الذكية
          </span>
          <h2 className="text-2xl sm:text-4xl font-black mb-2 tracking-tight">أهلاً بك، تفضل بإصدار تذكرتك الرقمية</h2>
          <p className="text-brand-100 text-sm sm:text-base leading-relaxed">
            يرجى تعبئة بياناتك ثم اختيار الخدمة المطلوبة للحصول على رقم دورك الفوري ومتابعة الانتظار من هاتفك.
          </p>
        </div>
        <div className="absolute -left-10 -bottom-10 opacity-15 pointer-events-none text-white">
          <QrCode className="w-56 h-56" />
        </div>
      </div>

      {/* Appointment Fast Lane Ribbon */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-brand-500/10 to-indigo-500/10 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-800 dark:text-white">
              هل قمت بحجز موعد مسبق عبر الإنترنت؟
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              يمكنك مسح باركود الموعد أو إدخال رقم الحجز للتحقق وتأكيد حضورك واستلام تذكرة أولوية سريعة.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAppointmentLookupError(null);
              setShowAppointmentModal(true);
            }}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-md shadow-indigo-600/25 flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تسجيل حضور بموعد</span>
          </button>

          {onNavigateToBooking && (
            <button
              type="button"
              onClick={onNavigateToBooking}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>حجز موعد جديد</span>
              <ArrowRight className="w-3 h-3 rotate-180" />
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Intake Form & Services Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Step 1: Customer Data Inputs */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
            <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              بيانات المراجع
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">أدخل بياناتك لتصلك إشعارات وتتبع دورك</p>
          </div>

          <div className="space-y-4">
            {!isNameHidden && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الاسم الكامل {isNameRequired && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: محمد عبدالله القحطاني"
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold focus:outline-none focus:border-brand-500"
                />
              </div>
            )}

            {!isPhoneHidden && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الجوال {isPhoneRequired && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-right font-bold focus:outline-none focus:border-brand-500"
                />
              </div>
            )}

            {!isNationalIdHidden && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رقم الهوية الوطنية / الإقامة {isNationalIdRequired && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="10xxxxxxxx"
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-right font-bold focus:outline-none focus:border-brand-500"
                />
              </div>
            )}

            {/* Custom Intake Fields if configured */}
            {intakeForm?.customFields && intakeForm.customFields.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                {intakeForm.customFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {field.label} {field.required && <span className="text-rose-500">*</span>}
                    </label>
                    {field.type === 'select' && field.options ? (
                      <select
                        value={customFieldsData[field.id] || ''}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold focus:outline-none focus:border-brand-500"
                      >
                        <option value="">-- اختر من القائمة --</option>
                        {field.options.map((opt, idx) => (
                          <option key={idx} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={customFieldsData[field.id] || ''}
                        onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder || ''}
                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold focus:outline-none focus:border-brand-500"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Priority Toggle */}
            {showPriority && (
              <div className="pt-2">
                <label className="flex items-center gap-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPriority}
                    onChange={(e) => setIsPriority(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500" />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-white block">
                        خدمة أولوية خاصة (كبار السن / ذوي الإعاقة)
                      </span>
                      <span className="text-[11px] text-slate-500">تقديم الدور تلقائياً في الطابور</span>
                    </div>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Service Selection Cards */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              اختر الخدمة المطلوبة لإصدار التذكرة فوراً:
            </h3>
            <span className="text-xs text-slate-400">انقر على الخدمة لطباعة التذكرة</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((svc) => {
              const waiting = waitingCountByService(svc.id);
              return (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => handleServiceSelect(svc.id)}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-lg transition-all text-right group cursor-pointer flex flex-col justify-between min-h-[140px]"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 font-mono font-black text-sm flex items-center justify-center">
                        {svc.prefix}
                      </span>
                      <div className="flex items-center gap-1 text-slate-400 text-xs">
                        <Users className="w-3.5 h-3.5" />
                        <span className="num-latin">{formatCustomerCount(waiting)}</span>
                      </div>
                    </div>
                    <h4 className="font-black text-base text-slate-800 dark:text-white group-hover:text-brand-600 transition">
                      {svc.name}
                    </h4>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>متوسط {svc.avgDuration || 5} د</span>
                    </div>
                    <span className="font-bold text-brand-600 group-hover:translate-x-[-4px] transition-transform">
                      إصدار التذكرة ←
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Issued Ticket Result Modal */}
      {issuedTicket && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-5 border border-slate-200 dark:border-slate-700 shadow-2xl relative animate-scale-in text-center">
            <button
              type="button"
              onClick={() => setIssuedTicket(null)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">تم إصدار تذكرتك بنجاح</span>
              <h3 className="text-3xl font-black text-brand-600 font-mono tracking-wider num-latin">
                {issuedTicket.code}
              </h3>
              <p className="text-sm font-bold text-slate-800 dark:text-white">
                {issuedTicket.serviceName}
              </p>
            </div>

            {/* Offline SVG Barcode with Public Base URL */}
            {ticketPrint?.showQrCode !== false && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col items-center">
                <QRCodeDisplay
                  value={getSelfContainedTrackUrl(issuedTicket)}
                  size={140}
                  title="باركود التتبع الفوري"
                  showActions={false}
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                  امسح الباركود بجوالك لتتبع دورك مباشرة في أي وقت
                </span>
              </div>
            )}

            {/* Direct WhatsApp Track Link Share */}
            <a
              href={getWhatsAppDirectUrl(
                issuedTicket.phone || '',
                `مرحباً بك في نظام إدارة الانتظار!\nتذكرتك رقم: *${issuedTicket.code}*\nالخدمة: *${issuedTicket.serviceName}*\nرابط التتبع الحي لدورك عبر الجوال:\n${getSelfContainedTrackUrl(issuedTicket)}`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer text-center"
            >
              <MessageCircle className="w-4 h-4 text-white" />
              <span>إرسال تذكرة التتبع إلى واتساب (WhatsApp)</span>
            </a>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onPrintThermal(issuedTicket)}
                className="py-3 px-3 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Printer className="w-4 h-4" /> طباعة ورقية
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenTracker(issuedTicket.id);
                  setIssuedTicket(null);
                }}
                className="py-3 px-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Eye className="w-4 h-4" /> شاشة التتبع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Fast Check-in Modal */}
      {showAppointmentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 dark:border-slate-700 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowAppointmentModal(false)}
              className="absolute top-5 left-5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 font-bold">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 dark:text-white text-base">
                  تسجيل حضور بموعد مسبق
                </h3>
                <p className="text-xs text-slate-400">
                  أدخل رمز الموعد (مثل APT-1042) أو امسح الباركود بالكاميرا
                </p>
              </div>
            </div>

            {appointmentLookupError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{appointmentLookupError}</span>
              </div>
            )}

            {/* Quick Camera Barcode Scanner Trigger */}
            <button
              type="button"
              onClick={() => setShowQrScanner(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Camera className="w-4 h-4" />
              <span>مسح باركود الموعد عبر الكاميرا</span>
            </button>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                processAppointmentCheckIn(appointmentLookupCode);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  أو أدخل رمز الموعد أو رقم الهوية / الإقامة يدوياً:
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={appointmentLookupCode}
                  onChange={(e) => setAppointmentLookupCode(e.target.value)}
                  placeholder="مثال: APT-1042 أو 10xxxxxxxx"
                  className="w-full p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-center font-bold text-sm tracking-wider focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs transition shadow-lg shadow-indigo-600/25 cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تأكيد الحضور واستلام التذكرة</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Camera QR Scanner Modal */}
      <QRScannerModal
        isOpen={showQrScanner}
        onClose={() => setShowQrScanner(false)}
        onScan={(scannedCode) => {
          setShowQrScanner(false);
          setAppointmentLookupCode(scannedCode);
          processAppointmentCheckIn(scannedCode);
        }}
        title="مسح باركود الموعد عبر الكاميرا"
      />
    </section>
  );
};
