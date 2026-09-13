import React, { useState, useMemo } from 'react';
import { AppState, Service, Appointment, AppointmentSettings } from '../types';
import { 
  Calendar, Clock, CheckCircle2, User, Phone, FileText, ArrowRight, 
  Search, XCircle, Download, Printer, ShieldCheck, Sparkles, AlertCircle,
  CalendarCheck, ChevronLeft, ChevronRight, Hash, BookmarkCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { QRCodeDisplay } from './QRCodeDisplay';
import { getBaseAppUrl, getLocalDateString } from '../utils';

interface AppointmentBookingViewProps {
  appState: AppState;
  onSaveAppointment: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onBackToKiosk?: () => void;
}

export const AppointmentBookingView: React.FC<AppointmentBookingViewProps> = ({
  appState,
  onSaveAppointment,
  onCancelAppointment,
  onBackToKiosk,
}) => {
  const [activeTab, setActiveTab] = useState<'book' | 'lookup'>('book');

  // Booking Flow Steps: 1: Service, 2: Date & Slot, 3: Details, 4: Success Pass
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return getLocalDateString();
  });
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [nationalId, setNationalId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Generated Appointment Confirmation
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  // Lookup State
  const [lookupQuery, setLookupQuery] = useState<string>('');
  const [lookupResult, setLookupResult] = useState<Appointment | null>(null);
  const [lookupSearched, setLookupSearched] = useState(false);

  // Settings
  const settings: AppointmentSettings = appState.settings.appointmentSettings || {
    enabled: true,
    startHour: 8,
    endHour: 16,
    slotDurationMinutes: 30,
    stopBeforeEndMinutes: 30,
    maxPerSlot: 2,
    hideBookedSlots: false,
    workingDays: [0, 1, 2, 3, 4],
    advanceBookingDays: 7,
    allowSameDay: true,
    strictDateCheck: true,
    allowEarlyCheckinMinutes: 60,
    noticeText: 'يرجى الحضور قبل موعدك بـ 5 دقائق وتأكيد الحضور عبر الكشك الذكي.',
  };

  const activeServices = useMemo(() => {
    return appState.services.filter((s) => s.active);
  }, [appState.services]);

  const selectedService = useMemo(() => {
    return appState.services.find((s) => s.id === selectedServiceId) || null;
  }, [appState.services, selectedServiceId]);

  // Generate available calendar dates (Next X days)
  const availableDates = useMemo(() => {
    const list: { dateStr: string; label: string; dayName: string }[] = [];
    const now = new Date();
    const daysToShow = Math.max(1, settings.advanceBookingDays || 7);

    for (let i = settings.allowSameDay ? 0 : 1; i < daysToShow; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);

      const dayOfWeek = d.getDay();
      const workingDays = settings.workingDays ?? [0, 1, 2, 3, 4];
      if (!workingDays.includes(dayOfWeek)) continue;

      const dateStr = getLocalDateString(d);
      const dayName = d.toLocaleDateString('ar-SA', { weekday: 'long' });
      const label = d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });

      list.push({ dateStr, label, dayName });
    }
    return list;
  }, [settings.advanceBookingDays, settings.allowSameDay]);

  // Generate Available Time Slots for selected date
  const timeSlots = useMemo(() => {
    const slots: { time: string; bookedCount: number; isAvailable: boolean }[] = [];
    const startHour = settings.startHour || 8;
    const endHour = settings.endHour || 16;
    const duration = settings.slotDurationMinutes || 30;
    const maxBookings = settings.maxPerSlot || 2;

    const existingAppointments = (appState.appointments || []).filter(
      (a) => a.date === selectedDate && a.status !== 'cancelled'
    );

    let currentMinutes = startHour * 60;
    const endMinutes = Math.max(startHour * 60, endHour * 60 - (settings.stopBeforeEndMinutes ?? 0));

    while (currentMinutes < endMinutes) {
      const h = Math.floor(currentMinutes / 60);
      const m = currentMinutes % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

      // Count bookings for this slot and service
      const count = existingAppointments.filter(
        (a) => a.timeSlot === timeStr && (!selectedServiceId || a.serviceId === selectedServiceId)
      ).length;

      slots.push({
        time: timeStr,
        bookedCount: count,
        isAvailable: count < maxBookings,
      });

      currentMinutes += duration;
    }

    return slots;
  }, [settings, selectedDate, selectedServiceId, appState.appointments]);

  // Submit Booking
  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedSlot) return;

    if (!customerName.trim() || !phone.trim() || !nationalId.trim()) {
      alert('الرجاء تعبئة كافة الحقول الإلزامية (الاسم، الجوال، رقم الهوية).');
      return;
    }

    // Generate reference code e.g. APT-8391
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `APT-${randomSuffix}`;

    const newAppointment: Appointment = {
      id: crypto.randomUUID(),
      code,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      customerName: customerName.trim(),
      phone: phone.trim(),
      nationalId: nationalId.trim(),
      date: selectedDate,
      timeSlot: selectedSlot,
      status: 'scheduled',
      notes: notes.trim() || undefined,
      createdAt: Date.now(),
    };

    onSaveAppointment(newAppointment);
    setConfirmedAppointment(newAppointment);
    setStep(4);

    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
  };

  // Lookup appointment
  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupSearched(true);
    const q = lookupQuery.trim().toLowerCase();
    if (!q) {
      setLookupResult(null);
      return;
    }

    const found = (appState.appointments || []).find((a) => {
      return (
        a.code.toLowerCase() === q ||
        a.nationalId.trim() === q ||
        a.phone.trim() === q
      );
    });

    setLookupResult(found || null);
  };

  // Status Badge Helper
  const renderStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'scheduled':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30">
            مؤكد ومجدول 🟢
          </span>
        );
      case 'checked_in':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-500/30">
            تم تسجيل الحضور في الكشك 🎫
          </span>
        );
      case 'completed':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-600/30">
            تمت الخدمة بنجاح ✨
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-500/30">
            تم إلغاء الموعد 🔴
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6" dir="rtl">
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-black shadow-lg shadow-brand-500/20">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white">
              بوابة حجز المواعيد المسبقة الرقمية
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              احجز موعدك مسبقاً وتفادى الانتظار، واحصل على أولوية استدعاء فورية بالفرع
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl gap-1 border border-slate-200 dark:border-slate-700 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('book');
              if (step === 4) setStep(1);
            }}
            className={`px-4 py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'book'
                ? 'bg-brand-600 text-white shadow-sm font-black'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            حجز موعد جديد
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lookup')}
            className={`px-4 py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'lookup'
                ? 'bg-brand-600 text-white shadow-sm font-black'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            استعلام أو إدارة موعد
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      {settings.noticeText && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>{settings.noticeText}</span>
        </div>
      )}

      {/* TAB 1: BOOKING FLOW */}
      {activeTab === 'book' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden p-6">
          {/* Step Indicator */}
          {step < 4 && (
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-5 mb-6 text-xs font-bold">
              <div
                className={`flex items-center gap-2 ${
                  step >= 1 ? 'text-brand-600 font-black' : 'text-slate-400'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-600 flex items-center justify-center font-mono">
                  1
                </span>
                <span>اختيار الخدمة</span>
              </div>
              <ChevronLeft className="w-4 h-4 text-slate-300" />
              <div
                className={`flex items-center gap-2 ${
                  step >= 2 ? 'text-brand-600 font-black' : 'text-slate-400'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-600 flex items-center justify-center font-mono">
                  2
                </span>
                <span>اليوم والوقت</span>
              </div>
              <ChevronLeft className="w-4 h-4 text-slate-300" />
              <div
                className={`flex items-center gap-2 ${
                  step >= 3 ? 'text-brand-600 font-black' : 'text-slate-400'
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-600 flex items-center justify-center font-mono">
                  3
                </span>
                <span>بيانات المراجع</span>
              </div>
            </div>
          )}

          {/* STEP 1: SELECT SERVICE */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="mb-2">
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  اختر الخدمة أو القسم المطلوب
                </h3>
                <p className="text-xs text-slate-400">
                  حدد المعاملة التي ترغب بإجرائها أثناء زيارتك
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {activeServices.map((service) => {
                  const isSelected = selectedServiceId === service.id;
                  return (
                    <div
                      key={service.id}
                      onClick={() => setSelectedServiceId(service.id)}
                      className={`p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-brand-600 bg-brand-50/40 dark:bg-brand-950/20 shadow-md'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 font-black text-xs num-latin">
                            سلسلة {service.prefix}00
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-brand-600" />
                          )}
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">
                          {service.name}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {service.description || 'إجراءات ومعاملات القسم'}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-400">
                        متوسط وقت الخدمة: {service.avgDuration || 5} دقيقة
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  disabled={!selectedServiceId}
                  onClick={() => setStep(2)}
                  className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition cursor-pointer ${
                    selectedServiceId
                      ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-md'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>متابعة لاختيار الموعد</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: SELECT DATE & TIME SLOT */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  حدد اليوم ووقت الحضور المناسب
                </h3>
                <p className="text-xs text-slate-400">
                  الخدمة المختارة: <strong className="text-brand-600">{selectedService?.name}</strong>
                </p>
              </div>

              {/* Date Chips */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                  1. اختر تاريخ الزيارة:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {availableDates.map((d) => {
                    const isSelected = selectedDate === d.dateStr;
                    return (
                      <button
                        type="button"
                        key={d.dateStr}
                        onClick={() => {
                          setSelectedDate(d.dateStr);
                          setSelectedSlot('');
                        }}
                        className={`p-3 rounded-2xl border text-center transition cursor-pointer ${
                          isSelected
                            ? 'bg-brand-600 border-brand-600 text-white shadow-md font-black'
                            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <span className="text-xs block opacity-80">{d.dayName}</span>
                        <span className="text-sm font-black block mt-0.5 num-latin">{d.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">
                  2. اختر الفترة الزمنية (الساعة):
                </label>

                {timeSlots.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    لا توجد فترات متاحة في هذا التاريخ. الرجاء اختيار يوم آخر.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {timeSlots.map((slot) => {
                      const isSelected = selectedSlot === slot.time;
                      return (
                        <button
                          type="button"
                          key={slot.time}
                          disabled={!slot.isAvailable}
                          onClick={() => setSelectedSlot(slot.time)}
                          className={`p-3 rounded-xl border text-center font-mono font-bold text-xs transition ${
                            !slot.isAvailable
                              ? 'bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 line-through cursor-not-allowed'
                              : isSelected
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-md font-black cursor-pointer'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-brand-500 cursor-pointer'
                          }`}
                        >
                          <span className="num-latin block">{slot.time}</span>
                          <span className="text-[10px] font-sans block opacity-75 mt-0.5">
                            {slot.isAvailable ? 'متاح' : 'ممتلئ'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  الرجوع للخدمات
                </button>

                <button
                  type="button"
                  disabled={!selectedDate || !selectedSlot}
                  onClick={() => setStep(3)}
                  className={`px-6 py-3 rounded-2xl font-black text-sm flex items-center gap-2 transition cursor-pointer ${
                    selectedDate && selectedSlot
                      ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-md'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>متابعة لبيانات المراجع</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CUSTOMER DETAILS FORM */}
          {step === 3 && (
            <form onSubmit={handleConfirmBooking} className="space-y-4">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  معلومات وبيانات المراجع
                </h3>
                <p className="text-xs text-slate-400">
                  يرجى إدخال بياناتك بدقة لإصدار بطاقة الموعد ومطابقتها عند الحضور
                </p>
              </div>

              {/* Summary of Selection */}
              <div className="p-4 rounded-2xl bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">الخدمة:</span>
                  <strong className="text-brand-700 dark:text-brand-300">{selectedService?.name}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">التاريخ:</span>
                  <strong className="text-brand-700 dark:text-brand-300 num-latin">{selectedDate}</strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">الوقت:</span>
                  <strong className="text-brand-700 dark:text-brand-300 font-mono num-latin">{selectedSlot}</strong>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    الاسم الثلاثي أو الرباعي <span className="text-rose-500">*</span>:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="مثال: عبدالله محمد القحطاني"
                      className="w-full p-3 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold focus:outline-none focus:border-brand-500"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute top-3.5 right-3" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    رقم الجوال <span className="text-rose-500">*</span>:
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="05xxxxxxxx"
                      className="w-full p-3 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold num-latin focus:outline-none focus:border-brand-500"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute top-3.5 right-3" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    رقم الهوية الوطنية / الإقامة <span className="text-rose-500">*</span>:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={10}
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="1xxxxxxxxx"
                      className="w-full p-3 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold num-latin focus:outline-none focus:border-brand-500"
                    />
                    <Hash className="w-4 h-4 text-slate-400 absolute top-3.5 right-3" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ملاحظات أو متطلبات خاصة (اختياري):
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="مثال: مراجع من ذوي الاحتياجات، تجديد سجل"
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  الرجوع لاختيار الوقت
                </button>

                <button
                  type="submit"
                  className="px-8 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-black text-sm shadow-lg shadow-brand-500/20 cursor-pointer flex items-center gap-2"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span>تأكيد الحجز وإصدار البطاقة الرقمية</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: DIGITAL APPOINTMENT CONFIRMATION PASS */}
          {step === 4 && confirmedAppointment && (
            <div className="space-y-6">
              {/* Success Banner */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto" />
                <h3 className="font-black text-base">تم تأكيد حجز موعدك بنجاح!</h3>
                <p className="text-xs opacity-90">
                  احتفظ برقم الموعد أو رمز الاستجابة السريعة (QR) لإبرازه أو مسحه عند كشك الخدمة بالفرع
                </p>
              </div>

              {/* Digital Pass Card */}
              <div className="max-w-md mx-auto p-6 rounded-3xl bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border-2 border-brand-500/40 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-brand-600 via-indigo-600 to-brand-600" />

                <div className="text-center pb-4 border-b border-dashed border-slate-300 dark:border-slate-700">
                  <span className="text-xs text-slate-400 font-semibold block">
                    {appState.settings.orgName} • فرع {appState.settings.branchName}
                  </span>
                  <h4 className="font-black text-base text-slate-800 dark:text-white mt-1">
                    بطاقة موعد مراجع رسمي
                  </h4>
                  <div className="mt-3 inline-block px-4 py-1.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono font-black text-lg tracking-widest border border-brand-500/30">
                    {confirmedAppointment.code}
                  </div>
                </div>

                {/* QR Code */}
                <div className="py-3 flex flex-col items-center justify-center bg-white rounded-2xl p-3 my-4 border border-slate-200">
                  <QRCodeDisplay
                    value={confirmedAppointment.code}
                    size={120}
                    title="رمز التحقق السريع في الكشك"
                    showActions={true}
                  />
                  <span className="text-[10px] text-slate-600 font-mono mt-1 font-bold">
                    رمز التحقق السريع في الكشك ({confirmedAppointment.code})
                  </span>
                </div>

                {/* Appointment Info Grid */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">اسم المراجع:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{confirmedAppointment.customerName}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">الخدمة / المعاملة:</span>
                    <strong className="text-brand-600 dark:text-brand-400">{confirmedAppointment.serviceName}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">تاريخ الموعد:</span>
                    <strong className="text-slate-800 dark:text-slate-200 num-latin">{confirmedAppointment.date}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400">الفترة الزمنية:</span>
                    <strong className="text-emerald-600 font-mono font-black num-latin">{confirmedAppointment.timeSlot}</strong>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">حالة الموعد:</span>
                    {renderStatusBadge(confirmedAppointment.status)}
                  </div>
                </div>

                <div className="mt-5 text-center text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-900 p-2.5 rounded-xl">
                  عند وصولك للفرع، اضغط زر "لدي موعد مسبق" في الكشك وأدخل كود الموعد للحصول على أولوية الاستدعاء مباشرة.
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-bold transition flex items-center gap-2 cursor-pointer text-slate-800 dark:text-white"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة بطاقة الموعد</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConfirmedAppointment(null);
                    setStep(1);
                    setSelectedSlot('');
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>حجز موعد جديد آخر</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LOOKUP & MANAGE APPOINTMENT */}
      {activeTab === 'lookup' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-6">
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-white">
              الاستعلام عن موعدك المحجوز أو إلغاؤه
            </h3>
            <p className="text-xs text-slate-400">
              أدخل رمز الموعد (مثل APT-1042) أو رقم الهوية أو رقم الجوال لاسترجاع تفاصيل الموعد
            </p>
          </div>

          <form onSubmit={handleLookup} className="flex gap-2">
            <input
              type="text"
              required
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              placeholder="رقم الموعد (APT-xxxx) أو رقم الهوية أو الجوال..."
              className="flex-1 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              className="px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black text-xs transition shadow cursor-pointer flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>استعلام</span>
            </button>
          </form>

          {lookupSearched && (
            <div>
              {lookupResult ? (
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 font-mono font-black text-sm">
                        {lookupResult.code}
                      </span>
                      <span className="font-bold text-sm text-slate-800 dark:text-white">
                        {lookupResult.customerName}
                      </span>
                    </div>

                    <div>{renderStatusBadge(lookupResult.status)}</div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">الخدمة:</span>
                      <strong className="text-slate-800 dark:text-white">{lookupResult.serviceName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">التاريخ:</span>
                      <strong className="text-slate-800 dark:text-white num-latin">{lookupResult.date}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">الوقت:</span>
                      <strong className="text-emerald-600 font-mono font-bold num-latin">{lookupResult.timeSlot}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">رقم الهوية:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 num-latin">{lookupResult.nationalId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">رقم الجوال:</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 num-latin">{lookupResult.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">تاريخ الحجز:</span>
                      <span className="text-slate-500 num-latin">
                        {new Date(lookupResult.createdAt).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  </div>

                  {lookupResult.notes && (
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-xl text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <strong>ملاحظات:</strong> {lookupResult.notes}
                    </div>
                  )}

                  {/* Actions on this appointment */}
                  {lookupResult.status === 'scheduled' && (
                    <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`هل أنت متأكد من رغبتك في إلغاء الموعد (${lookupResult.code})؟`)) {
                            onCancelAppointment(lookupResult.id);
                            setLookupResult({ ...lookupResult, status: 'cancelled' });
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs transition border border-rose-500/30 flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>إلغاء هذا الموعد</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  لم يتم العثور على أي موعد مطابق لبيانات البحث ({lookupQuery}).
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
