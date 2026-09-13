import React, { useState, useMemo } from 'react';
import { AppState, Appointment, AppointmentSettings, Service, Ticket } from '../types';
import { 
  Calendar, Clock, CheckCircle2, XCircle, Search, Filter, 
  FileSpreadsheet, User, Phone, Sliders, Save, Plus, AlertTriangle, 
  Check, Ticket as TicketIcon, CalendarCheck, ShieldCheck, Trash2,
  CalendarDays, Globe, Smartphone, Edit, RefreshCw
} from 'lucide-react';
import { getBaseAppUrl } from '../utils';

interface AppointmentsManagementTabProps {
  appState: AppState;
  onUpdateSettings: (newSettings: AppState['settings']) => void;
  onSaveAppointment: (appointment: Appointment) => void;
  onCancelAppointment: (appointmentId: string) => void;
  onDeleteAppointment: (appointmentId: string) => void;
  onCheckInAppointment: (appointment: Appointment) => void;
}

const ALL_DAYS_OF_WEEK = [
  { id: 0, name: 'الأحد' },
  { id: 1, name: 'الاثنين' },
  { id: 2, name: 'الثلاثاء' },
  { id: 3, name: 'الأربعاء' },
  { id: 4, name: 'الخميس' },
  { id: 5, name: 'الجمعة' },
  { id: 6, name: 'السبت' },
];

export const AppointmentsManagementTab: React.FC<AppointmentsManagementTabProps> = ({
  appState,
  onUpdateSettings,
  onSaveAppointment,
  onCancelAppointment,
  onDeleteAppointment,
  onCheckInAppointment,
}) => {
  const [subTab, setSubTab] = useState<'list' | 'settings'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'checked_in' | 'completed' | 'cancelled' | 'no_show'>('all');
  const [dateFilter, setDateFilter] = useState<'today' | 'upcoming' | 'past' | 'all'>('today');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Reschedule Modal State
  const [rescheduleApt, setRescheduleApt] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState('');

  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Settings state
  const currentSettings: AppointmentSettings = appState.settings.appointmentSettings || {
    enabled: true,
    startHour: 8, // 8:00 AM
    endHour: 15, // 3:00 PM
    slotDurationMinutes: 30, // 30 mins each
    stopBeforeEndMinutes: 30, // Last appointment is at 14:30
    maxPerSlot: 1, // Exclusive
    hideBookedSlots: true,
    workingDays: [0, 1, 2, 3, 4], // Sun to Thu
    advanceBookingDays: 14,
    allowSameDay: false,
    strictDateCheck: true,
    allowEarlyCheckinMinutes: 60,
    noticeText: 'أوقات العمل من الأحد إلى الخميس من 8:00 صباحاً حتى 3:00 مساءً (آخر موعد 2:30 مساءً). يرجى تأكيد حضورك عبر الكشك الذكي.',
    publicQrBaseUrl: '',
  };

  const [formSettings, setFormSettings] = useState<AppointmentSettings>(currentSettings);

  const appointments = useMemo(() => appState.appointments || [], [appState.appointments]);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      // Status filter
      if (statusFilter !== 'all' && apt.status !== statusFilter) return false;

      // Service filter
      if (serviceFilter !== 'all' && apt.serviceId !== serviceFilter) return false;

      // Date filter
      if (dateFilter === 'today' && apt.date !== todayStr) return false;
      if (dateFilter === 'upcoming' && apt.date < todayStr) return false;
      if (dateFilter === 'past' && apt.date >= todayStr) return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = apt.code.toLowerCase().includes(q);
        const matchName = apt.customerName.toLowerCase().includes(q);
        const matchPhone = apt.phone.includes(q);
        const matchId = apt.nationalId.includes(q);
        if (!matchCode && !matchName && !matchPhone && !matchId) return false;
      }

      return true;
    }).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.timeSlot.localeCompare(b.timeSlot);
    });
  }, [appointments, statusFilter, serviceFilter, dateFilter, searchQuery, todayStr]);

  // Quick Stats
  const todayAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === todayStr);
  }, [appointments, todayStr]);

  const stats = useMemo(() => {
    return {
      todayTotal: todayAppointments.length,
      todayScheduled: todayAppointments.filter((a) => a.status === 'scheduled').length,
      todayCheckedIn: todayAppointments.filter((a) => a.status === 'checked_in').length,
      todayCompleted: todayAppointments.filter((a) => a.status === 'completed').length,
      todayCancelled: todayAppointments.filter((a) => a.status === 'cancelled').length,
      todayNoShow: todayAppointments.filter((a) => a.status === 'no_show').length,
    };
  }, [todayAppointments]);

  // Save Settings Handler
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...appState.settings,
      appointmentSettings: formSettings,
      publicQrBaseUrl: formSettings.publicQrBaseUrl,
    });
    setSaveSuccessMsg('تم حفظ وتحديث إعدادات نظام المواعيد بنجاح.');
    setTimeout(() => setSaveSuccessMsg(''), 3500);
  };

  // Toggle a working day
  const toggleWorkingDay = (dayId: number) => {
    const current = formSettings.workingDays || [0, 1, 2, 3, 4];
    let updated: number[];
    if (current.includes(dayId)) {
      if (current.length <= 1) {
        alert('يجب الإبقاء على يوم عمل واحد على الأقل في الأسبوع.');
        return;
      }
      updated = current.filter((d) => d !== dayId);
    } else {
      updated = [...current, dayId].sort();
    }
    setFormSettings({ ...formSettings, workingDays: updated });
  };

  // Auto-detect Public Preview URL to fix 403 error on external phones
  const handleAutoSetPublicUrl = () => {
    const resolvedUrl = getBaseAppUrl();
    setFormSettings({
      ...formSettings,
      publicQrBaseUrl: resolvedUrl,
    });
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (appointments.length === 0) {
      alert('لا توجد مواعيد لتصديرها.');
      return;
    }

    const headers = [
      'رمز الموعد',
      'اسم المراجع',
      'رقم الجوال',
      'رقم الهوية',
      'الخدمة المطلوبة',
      'تاريخ الموعد',
      'الوقت',
      'الحالة',
      'رقم التذكرة المرتبطة',
      'ملاحظات'
    ];

    const rows = filteredAppointments.map((apt) => [
      `"${apt.code}"`,
      `"${apt.customerName}"`,
      `"${apt.phone}"`,
      `"${apt.nationalId}"`,
      `"${apt.serviceName}"`,
      `"${apt.date}"`,
      `"${apt.timeSlot}"`,
      `"${apt.status}"`,
      `"${apt.ticketCode || '-'}"`,
      `"${apt.notes || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `appointments_report_${todayStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Perform Reschedule
  const handleConfirmReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleApt || !newDate || !newSlot) return;

    const updated: Appointment = {
      ...rescheduleApt,
      date: newDate,
      timeSlot: newSlot,
      status: 'scheduled',
      notes: (rescheduleApt.notes ? rescheduleApt.notes + ' | ' : '') + `تمت إعادة الجدولة إلى ${newDate} ${newSlot}`,
    };

    onSaveAppointment(updated);
    setRescheduleApt(null);
    setSaveSuccessMsg(`تمت إعادة جدولة الموعد (${updated.code}) بنجاح.`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Navigation Ribbon for Appointments Tab */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 flex items-center justify-center font-bold">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-white">
              إدارة منظومة المواعيد المسبقة وتأكيد الحضور
            </h3>
            <p className="text-xs text-slate-400">
              جدولة المواعيد من الأحد إلى الخميس (08:00 ص إلى 03:00 م)، ضبط الفترات، وتأكيد الحضور الصارم
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('list')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              subTab === 'list'
                ? 'bg-brand-600 text-white shadow-xs font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            سجل وجدول المواعيد ({appointments.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('settings')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              subTab === 'settings'
                ? 'bg-brand-600 text-white shadow-xs font-black'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>قائمة الإعدادات الشاملة للمواعيد</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-500 text-white rounded-2xl text-xs font-bold text-center flex items-center justify-center gap-2 shadow animate-fade-in">
          <Check className="w-4 h-4" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* SUBTAB 1: APPOINTMENTS LIST */}
      {subTab === 'list' && (
        <div className="space-y-5">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-semibold block">مواعيد اليوم</span>
              <span className="text-xl font-black text-brand-600 num-latin">{stats.todayTotal}</span>
            </div>
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-semibold block">مؤكد ومجدول</span>
              <span className="text-xl font-black text-emerald-600 num-latin">{stats.todayScheduled}</span>
            </div>
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-semibold block">حضروا بالكشك</span>
              <span className="text-xl font-black text-blue-600 num-latin">{stats.todayCheckedIn}</span>
            </div>
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-semibold block">تمت خدمتهم</span>
              <span className="text-xl font-black text-slate-700 dark:text-slate-300 num-latin">{stats.todayCompleted}</span>
            </div>
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-semibold block">ملغاة</span>
              <span className="text-xl font-black text-rose-500 num-latin">{stats.todayCancelled}</span>
            </div>
            <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center">
              <span className="text-[11px] text-slate-400 font-semibold block">لم يحضر</span>
              <span className="text-xl font-black text-amber-500 num-latin">{stats.todayNoShow}</span>
            </div>
          </div>

          {/* Filters & Export Bar */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Date Filter */}
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold focus:outline-none"
              >
                <option value="today">مواعيد اليوم فقط ({todayStr})</option>
                <option value="upcoming">المواعيد القادمة</option>
                <option value="past">المواعيد السابقة والأرشيف</option>
                <option value="all">كافة التواريخ</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold focus:outline-none"
              >
                <option value="all">كافة الحالات</option>
                <option value="scheduled">مجدول ومؤكد</option>
                <option value="checked_in">تم تسجيل الحضور</option>
                <option value="completed">مكتمل</option>
                <option value="cancelled">ملغي</option>
                <option value="no_show">لم يحضر</option>
              </select>

              {/* Service Filter */}
              <select
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold focus:outline-none"
              >
                <option value="all">كافة الخدمات</option>
                {appState.services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Search Box */}
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث برقم الموعد، الاسم، الجوال أو الهوية..."
                  className="w-full p-2 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium focus:outline-none"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute top-3 right-2.5" />
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>تصدير Excel (CSV)</span>
            </button>
          </div>

          {/* Appointments Table */}
          {filteredAppointments.length === 0 ? (
            <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl bg-white dark:bg-slate-800 space-y-2">
              <Calendar className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-600 dark:text-slate-300">
                لا توجد مواعيد مسجلة مطابقة لخيارات البحث
              </h4>
              <p className="text-xs text-slate-400">
                يمكن للمراجعين حجز مواعيدهم عبر صفحة الحجز، أو تسجيل حضورهم المباشر بالكشك
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                  <tr>
                    <th className="p-3">رمز الموعد</th>
                    <th className="p-3">اسم المراجع</th>
                    <th className="p-3">الجوال / الهوية</th>
                    <th className="p-3">الخدمة المطلوبة</th>
                    <th className="p-3">تاريخ ووقت الموعد</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3">التذكرة الصادرة</th>
                    <th className="p-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredAppointments.map((apt) => {
                    const isToday = apt.date === todayStr;
                    return (
                      <tr key={apt.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition">
                        <td className="p-3">
                          <span className="font-mono font-black text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 px-2 py-0.5 rounded-md border border-brand-500/20">
                            {apt.code}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-800 dark:text-white">
                          {apt.customerName}
                        </td>
                        <td className="p-3 text-slate-500 num-latin">
                          <div>{apt.phone}</div>
                          <div className="text-[10px] text-slate-400">{apt.nationalId}</div>
                        </td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                          {apt.serviceName}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-800 dark:text-white num-latin flex items-center gap-1">
                            <span>{apt.date}</span>
                            {isToday && (
                              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] rounded font-bold">
                                اليوم
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-emerald-600 font-bold num-latin">
                            {apt.timeSlot}
                          </div>
                        </td>
                        <td className="p-3">
                          {apt.status === 'scheduled' && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[11px] border border-amber-500/20">
                              مجدول ومؤكد
                            </span>
                          )}
                          {apt.status === 'checked_in' && (
                            <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[11px] border border-blue-500/20">
                              حضر بالكشك
                            </span>
                          )}
                          {apt.status === 'completed' && (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-[11px]">
                              تمت خدمته
                            </span>
                          )}
                          {apt.status === 'cancelled' && (
                            <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[11px] border border-rose-500/20">
                              ملغي
                            </span>
                          )}
                          {apt.status === 'no_show' && (
                            <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-[11px] border border-purple-500/20">
                              لم يحضر
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          {apt.ticketCode ? (
                            <span className="font-mono font-black text-brand-600 num-latin bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                              {apt.ticketCode}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">لم تصدر بعد</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Manual Check-in Button */}
                            {apt.status === 'scheduled' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!isToday) {
                                    if (!confirm(`تنبيه: هذا الموعد مجدول لتاريخ (${apt.date}) وليس اليوم (${todayStr}). هل ترغب بتسجيل حضوره استثنائياً الآن وإصدار تذكرة؟`)) {
                                      return;
                                    }
                                  }
                                  onCheckInAppointment(apt);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                                title="تسجيل حضور فوري وإصدار تذكرة أولوية"
                              >
                                <TicketIcon className="w-3 h-3" />
                                <span>حضور</span>
                              </button>
                            )}

                            {/* Reschedule Button */}
                            {apt.status === 'scheduled' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRescheduleApt(apt);
                                  setNewDate(apt.date);
                                  setNewSlot(apt.timeSlot);
                                }}
                                className="p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition cursor-pointer"
                                title="تعديل الموعد / إعادة جدولة"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Mark as No-show */}
                            {apt.status === 'scheduled' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`هل ترغب في تحويل حالة الموعد (${apt.code}) إلى "لم يحضر"؟`)) {
                                    onSaveAppointment({
                                      ...apt,
                                      status: 'no_show',
                                    });
                                  }
                                }}
                                className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition cursor-pointer"
                                title="تسجيل عدم حضور (No-show)"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Cancel Button */}
                            {apt.status === 'scheduled' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`هل أنت متأكد من إلغاء الموعد (${apt.code})؟`)) {
                                    onCancelAppointment(apt.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                                title="إلغاء الموعد"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`هل أنت متأكد من حذف سجل الموعد نهائياً (${apt.code})؟`)) {
                                onDeleteAppointment(apt.id);
                                }
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="حذف السجل"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: COMPREHENSIVE APPOINTMENT SETTINGS */}
      {subTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="space-y-6 max-w-4xl">
          {/* Section 1: Working Days & Working Hours */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-5 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/40 text-brand-600 flex items-center justify-center font-bold">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-800 dark:text-white">
                  أيام الدوام وساعات العمل الرسمية
                </h4>
                <p className="text-xs text-slate-400">
                  تحديد أيام وساعات العمل (من الأحد إلى الخميس من 08:00 صباحاً إلى 03:00 مساءً)
                </p>
              </div>
            </div>

            {/* Enable Appointments Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-800 dark:text-white block">
                  تفعيل منظومة حجز المواعيد المسبقة:
                </span>
                <span className="text-[11px] text-slate-400">
                  إتاحة حجز المواعيد للمراجعين عبر النظام وبوابة الحجز المسبق
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formSettings.enabled}
                  onChange={(e) => setFormSettings({ ...formSettings, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-brand-600"></div>
              </label>
            </div>

            {/* Working Days Selector (Sun to Thu) */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-3">
              <label className="block font-bold text-xs text-slate-700 dark:text-slate-300 mb-2">
                أيام العمل المتاحة للحجز (الافتراضي: الأحد إلى الخميس):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                {ALL_DAYS_OF_WEEK.map((day) => {
                  const isSelected = (formSettings.workingDays || [0, 1, 2, 3, 4]).includes(day.id);
                  const isWeekend = day.id === 5 || day.id === 6; // Fri or Sat
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleWorkingDay(day.id)}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        isSelected
                          ? 'border-brand-600 bg-brand-50/50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400 opacity-60'
                      }`}
                    >
                      <span>{day.name}</span>
                      <span className="text-[10px]">
                        {isSelected ? 'يوم عمل' : isWeekend ? 'إجازة أسبوعية' : 'معطل'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Working Hours (8 AM to 3 PM) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 dark:border-slate-700 pt-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  بداية الدوام (ساعة صباحاً):
                </label>
                <select
                  value={formSettings.startHour}
                  onChange={(e) => setFormSettings({ ...formSettings, startHour: parseInt(e.target.value, 10) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold focus:outline-none"
                >
                  <option value={7}>07:00 ص</option>
                  <option value={8}>08:00 ص (الافتراضي الرسمي)</option>
                  <option value={9}>09:00 ص</option>
                  <option value={10}>10:00 ص</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نهاية الدوام (ساعة مساءً):
                </label>
                <select
                  value={formSettings.endHour}
                  onChange={(e) => setFormSettings({ ...formSettings, endHour: parseInt(e.target.value, 10) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold focus:outline-none"
                >
                  <option value={14}>02:00 م (14:00)</option>
                  <option value={15}>03:00 م (15:00 - الافتراضي الرسمي)</option>
                  <option value={16}>04:00 م (16:00)</option>
                  <option value={17}>05:00 م (17:00)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  توقف آخر موعد قبل نهاية الدوام بـ:
                </label>
                <select
                  value={formSettings.stopBeforeEndMinutes ?? 30}
                  onChange={(e) => setFormSettings({ ...formSettings, stopBeforeEndMinutes: parseInt(e.target.value, 10) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold focus:outline-none"
                >
                  <option value={0}>مع نهاية الدوام مباشرة</option>
                  <option value={30}>30 دقيقة قبل النهاية (آخر موعد 2:30 م)</option>
                  <option value={45}>45 دقيقة قبل النهاية</option>
                  <option value={60}>ساعة كاملة قبل النهاية</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Slot Duration, Capacity & Hiding Booked Slots */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-800 dark:text-white">
                  الفترات الزمنية وحذف التواريخ المحجوزة
                </h4>
                <p className="text-xs text-slate-400">
                  مدة كل موعد نصف ساعة، وحذف الفترة المحجوزة تلقائياً من خيارات المراجعين
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  مدة الموعد الواحد (بالدقائق):
                </label>
                <select
                  value={formSettings.slotDurationMinutes}
                  onChange={(e) => setFormSettings({ ...formSettings, slotDurationMinutes: parseInt(e.target.value, 10) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold focus:outline-none"
                >
                  <option value={15}>15 دقيقة</option>
                  <option value={20}>20 دقيقة</option>
                  <option value={30}>30 دقيقة (نصف ساعة - الافتراضي المطلوب)</option>
                  <option value={45}>45 دقيقة</option>
                  <option value={60}>60 دقيقة (ساعة كاملة)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  السعة القصوى لكل فترة زمنية:
                </label>
                <select
                  value={formSettings.maxPerSlot || 1}
                  onChange={(e) => setFormSettings({ ...formSettings, maxPerSlot: parseInt(e.target.value, 10) || 1 })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold focus:outline-none"
                >
                  <option value={1}>مراجع واحد فقط (حجز حصري - بمجرد الحجز تُحذف الفترة)</option>
                  <option value={2}>مراجعان في نفس الفترة</option>
                  <option value={3}>3 مراجعين</option>
                </select>
              </div>
            </div>

            {/* Hide booked slots toggle */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-3">
              <div>
                <span className="font-bold text-xs text-slate-800 dark:text-white block">
                  حذف/إخفاء الفترات المحجوزة بالكامل تلقائياً:
                </span>
                <span className="text-[11px] text-slate-400">
                  عند حجز موعد لنصف ساعة يتم حذفه من قائمة الاختيار للمراجعين القادمين لمنع التعارض
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formSettings.hideBookedSlots !== false}
                  onChange={(e) => setFormSettings({ ...formSettings, hideBookedSlots: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-brand-600"></div>
              </label>
            </div>
          </div>

          {/* Section 3: Booking & Strict Check-in Rules */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-800 dark:text-white">
                  قواعد الحضور الصارمة ومنع التقديم الخاطئ
                </h4>
                <p className="text-xs text-slate-400">
                  التحقق من تاريخ الموعد لمنع تسجيل الحضور في غير يوم الموعد المجدول
                </p>
              </div>
            </div>

            {/* Strict Date Check in Kiosk */}
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-xs text-slate-800 dark:text-white block">
                  التحقق الصارم من تاريخ اليوم عند تسجيل الحضور بالكشك:
                </span>
                <span className="text-[11px] text-slate-400">
                  رفض تسجيل حضور المراجع في الكشك إذا لم يكن التاريخ يطابق تاريخ اليوم الفعلي
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formSettings.strictDateCheck !== false}
                  onChange={(e) => setFormSettings({ ...formSettings, strictDateCheck: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-brand-600"></div>
              </label>
            </div>

            {/* Same Day Booking */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-3">
              <div>
                <span className="font-bold text-xs text-slate-800 dark:text-white block">
                  السماح بالحجز في نفس اليوم (Same-Day Booking):
                </span>
                <span className="text-[11px] text-slate-400">
                  إتاحة حجز الفترات المتبقية لليوم الحالي (إذا كانت غير محجوزة وقبل موعدها)
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formSettings.allowSameDay}
                  onChange={(e) => setFormSettings({ ...formSettings, allowSameDay: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-brand-600"></div>
              </label>
            </div>

            {/* Advance Days & Check-in window */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-700 pt-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المدى الزمني المتاح للحجز مقدماً (بالأيام):
                </label>
                <select
                  value={formSettings.advanceBookingDays}
                  onChange={(e) => setFormSettings({ ...formSettings, advanceBookingDays: parseInt(e.target.value, 10) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold focus:outline-none"
                >
                  <option value={7}>7 أيام (أسبوع)</option>
                  <option value={14}>14 يوماً (أسبوعان - موصى به)</option>
                  <option value={21}>21 يوماً (3 أسابيع)</option>
                  <option value={30}>30 يوماً (شهر كامل)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  نافذة السماح بتسجيل الحضور المبكر بالكشك:
                </label>
                <select
                  value={formSettings.allowEarlyCheckinMinutes ?? 60}
                  onChange={(e) => setFormSettings({ ...formSettings, allowEarlyCheckinMinutes: parseInt(e.target.value, 10) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold focus:outline-none"
                >
                  <option value={30}>قبل الموعد بـ 30 دقيقة</option>
                  <option value={60}>قبل الموعد بساعة واحدة (الافتراضي)</option>
                  <option value={120}>قبل الموعد بساعتين</option>
                  <option value={999}>طوال يوم الموعد دون تقييد زمني</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Public QR Base URL Configuration (Fix for 403 scan error) */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center font-bold">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-800 dark:text-white">
                  رابط مسح الباركود العام للجوال (حل مشكلة خطأ 403 عند المسح)
                </h4>
                <p className="text-xs text-slate-400">
                  تحديد الرابط العام الذي يتضمنه الباركود ليتمكن المراجع من فتحه من أي جوال خارجي دون الحاجة لتسجيل الدخول
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الرابط الأساسي لباركود التتبع والمواعيد:
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formSettings.publicQrBaseUrl || ''}
                    onChange={(e) => setFormSettings({ ...formSettings, publicQrBaseUrl: e.target.value })}
                    placeholder={getBaseAppUrl()}
                    className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-mono text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAutoSetPublicUrl}
                    className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition flex items-center gap-1 cursor-pointer"
                    title="اكتشاف الرابط العام التلقائي (تحويل ais-dev إلى ais-pre)"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>اكتشاف تلقائي</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  الرابط المقترح الذكي الحالي: <span className="font-mono text-brand-600">{getBaseAppUrl()}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Section 5: Notice Text */}
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3 shadow-sm text-xs">
            <label className="block font-bold text-slate-700 dark:text-slate-300">
              تعليمات وشروط الحضور التي تظهر للمراجع:
            </label>
            <textarea
              rows={2}
              value={formSettings.noticeText || ''}
              onChange={(e) => setFormSettings({ ...formSettings, noticeText: e.target.value })}
              placeholder="مثال: أوقات العمل من الأحد إلى الخميس..."
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-medium focus:outline-none"
            />
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              className="px-8 py-3.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-black text-sm shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>حفظ وتطبيق إعدادات المواعيد</span>
            </button>
          </div>
        </form>
      )}

      {/* Reschedule Modal */}
      {rescheduleApt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-black text-slate-800 dark:text-white text-base">
                إعادة جدولة الموعد ({rescheduleApt.code})
              </h3>
              <button
                type="button"
                onClick={() => setRescheduleApt(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReschedule} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  المراجع:
                </label>
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 font-bold">
                  {rescheduleApt.customerName} ({rescheduleApt.phone})
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  تاريخ الموعد الجديد:
                </label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  الوقت / الفترة الجديدة:
                </label>
                <input
                  type="time"
                  required
                  value={newSlot}
                  onChange={(e) => setNewSlot(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setRescheduleApt(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold transition shadow"
                >
                  تأكيد إعادة الجدولة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
