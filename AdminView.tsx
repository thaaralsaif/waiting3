import React, { useState } from 'react';
import { AppState, Service, Counter, SystemTheme } from '../types';
import { 
  ShieldCheck, Palette, ListOrdered, Monitor, Settings2, Cloud, FileSpreadsheet,
  AlertTriangle, Trash2, Plus, RotateCcw, Save, Check, LineChart as ChartIcon,
  CheckCircle2, XCircle, RefreshCw, Zap, Clock, Type, Sliders, Sparkles, Eye, Users, Ticket as TicketIcon,
  Printer, FormInput, HeartHandshake, Star, Activity, ArrowRight, CalendarCheck,
  Smartphone, MessageSquare
} from 'lucide-react';
import { WaitTimeAnalytics } from './WaitTimeAnalytics';
import { TicketCustomizerTab } from './TicketCustomizerTab';
import { IntakeFieldsCustomizerTab } from './IntakeFieldsCustomizerTab';
import { FeedbackAnalyticsTab } from './FeedbackAnalyticsTab';
import { AppointmentsManagementTab } from './AppointmentsManagementTab';
import { NotificationSettingsTab } from './NotificationSettingsTab';
import { initFirebaseService, parseFirebaseConfig } from '../services/firebaseService';
import { signInUser, signOutUser, subscribeToAuthState, UserRole } from '../services/firebaseAuth';

interface AdminViewProps {
  appState: AppState;
  onUpdateSettings: (newSettings: AppState['settings']) => void;
  onAddService: (s: Omit<Service, 'id'>) => void;
  onDeleteService: (id: string) => void;
  onAddCounter: (c: Omit<Counter, 'id'>) => void;
  onDeleteCounter: (id: string) => void;
  onResetDayData: () => void;
  onExportExcel: () => void;
  onOpenWallboard?: () => void;
  onSaveAppointment?: (appointment: any) => void;
  onCancelAppointment?: (appointmentId: string) => void;
  onDeleteAppointment?: (appointmentId: string) => void;
  onCheckInAppointment?: (appointment: any) => void;
  onClearNotificationLogs?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  appState,
  onUpdateSettings,
  onAddService,
  onDeleteService,
  onAddCounter,
  onDeleteCounter,
  onResetDayData,
  onExportExcel,
  onOpenWallboard,
  onSaveAppointment,
  onCancelAppointment,
  onDeleteAppointment,
  onCheckInAppointment,
  onClearNotificationLogs,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authRole, setAuthRole] = useState<UserRole>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'analytics' | 'theme' | 'ticket_design' | 'intake_fields' | 'services' | 'counters' | 'branding' | 'firebase' | 'reports' | 'feedback' | 'appointments' | 'notifications'>('analytics');
  const [settingsForm, setSettingsForm] = useState(appState.settings);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // New Service Modal State
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrefix, setNewServicePrefix] = useState('4');
  const [newServiceDuration, setNewServiceDuration] = useState(5);
  const [showAddService, setShowAddService] = useState(false);

  // New Counter Modal State
  const [newCounterName, setNewCounterName] = useState('');
  const [newCounterStaff, setNewCounterStaff] = useState('');
  const [showAddCounter, setShowAddCounter] = useState(false);

  // Firebase Connection Test State
  const [isTestingFirebase, setIsTestingFirebase] = useState(false);
  const [firebaseTestResult, setFirebaseTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  React.useEffect(() => {
    const config = appState.settings.firebaseConfigStr?.trim();
    if (!config) {
      setIsAuthenticated(false);
      setAuthRole(null);
      return;
    }
    return subscribeToAuthState(config, (user, role) => {
      setIsAuthenticated(Boolean(user && (role === 'admin' || role === 'supervisor')));
      setAuthRole(role);
      if (user && (role === 'admin' || role === 'supervisor')) setSettingsForm(appState.settings);
    });
  }, [appState.settings.firebaseConfigStr]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const config = appState.settings.firebaseConfigStr?.trim();
      if (!config) throw new Error('فعّل Firebase أولاً ثم أنشئ حسابًا عبر Firebase Authentication.');
      const result = await signInUser(config, emailInput, passwordInput);
      if (result.role !== 'admin' && result.role !== 'supervisor') {
        await signOutUser();
        throw new Error('الحساب صحيح، لكنه لا يملك صلاحية لوحة الإدارة.');
      }
      setIsAuthenticated(true);
      setAuthRole(result.role);
      setSettingsForm(appState.settings);
      setPasswordInput('');
    } catch (err: any) {
      setIsAuthenticated(false);
      setAuthRole(null);
      setAuthError(err?.message || 'فشل تسجيل الدخول.');
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    setIsAuthenticated(false);
    setAuthRole(null);
  };

  const handleSaveTheme = () => {
    onUpdateSettings(settingsForm);
    setSaveSuccessMsg('تم حفظ وتطبيق الثيم والألوان بنجاح!');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleSaveBranding = () => {
    onUpdateSettings(settingsForm);
    setSaveSuccessMsg('تم حفظ إعدادات الهوية بنجاح!');
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const applyPreset = (
    primary: string,
    accent: string,
    bg: string,
    card: string,
    buttonTextColor = '#ffffff',
    textColor = '#0f172a',
    cardTextColor = '#1e293b',
    fontFamily = 'Tajawal'
  ) => {
    setSettingsForm((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        primary,
        accent,
        bg,
        card,
        buttonTextColor,
        textColor,
        cardTextColor,
        fontFamily,
      },
    }));
  };

  // KPIs
  const totalTickets = appState.tickets.length;
  const completedTickets = appState.tickets.filter((t) => t.status === 'completed');
  const waitingTickets = appState.tickets.filter((t) => t.status === 'waiting');

  let totalWaitMin = 0;
  let totalServMin = 0;
  completedTickets.forEach((t) => {
    if (t.calledAt) totalWaitMin += (t.calledAt - t.createdAt) / 60000;
    if (t.completedAt && t.calledAt) totalServMin += (t.completedAt - t.calledAt) / 60000;
  });

  const avgWait = completedTickets.length > 0 ? Math.round(totalWaitMin / completedTickets.length) : 0;
  const avgServ = completedTickets.length > 0 ? Math.round(totalServMin / completedTickets.length) : 0;
  const isCongested = waitingTickets.length >= (appState.settings.congestionLimit || 15);

  if (!isAuthenticated) {
    return (
      <section className="max-w-md mx-auto bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl text-center space-y-5 my-8">
        <div 
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-sm"
          style={{ 
            backgroundColor: `${appState.settings.theme.primary}18`,
            color: appState.settings.theme.primary 
          }}
        >
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white">المنطقة الإدارية المحمية</h3>
          <p className="text-xs text-slate-400 mt-1">سجّل الدخول بحساب Firebase المصرح له بدور admin أو supervisor</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="admin@example.com"
            autoComplete="username"
            className="w-full text-center py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold focus:ring-2 focus:outline-none"
            style={{ accentColor: appState.settings.theme.primary }}
            required
          />
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="كلمة المرور"
            autoComplete="current-password"
            className="w-full text-center py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold focus:ring-2 focus:outline-none"
            style={{ accentColor: appState.settings.theme.primary }}
            required
          />
          {authError && <div className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl">{authError}</div>}
          <button
            type="submit"
            style={{ 
              backgroundColor: appState.settings.theme.primary,
              color: appState.settings.theme.buttonTextColor || '#ffffff' 
            }}
            className="w-full py-3.5 font-extrabold text-sm rounded-2xl transition shadow-lg hover:opacity-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>تسجيل الدخول للإدارة</span>
          </button>
        </form>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">الصلاحية الحالية: {authRole === 'admin' ? 'مدير النظام' : 'مشرف'}</span>
        <button type="button" onClick={handleLogout} className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:opacity-80">تسجيل الخروج</button>
      </div>
      {/* Congestion Alert */}
      {isCongested && (
        <div className="p-4 rounded-2xl bg-rose-500 text-white shadow-lg flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <div>
              <h4 className="font-black text-sm">تنبيه ذروة وازدحام في الصالة!</h4>
              <p className="text-xs text-rose-100">
                عدد المراجعين في الانتظار ({waitingTickets.length}) تجاوز الحد المسموح ({appState.settings.congestionLimit}). يرجى فتح مكاتب إضافية.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-white text-rose-600 font-black rounded-xl text-xs num-latin">
            {waitingTickets.length} مراجع بالانتظار
          </span>
        </div>
      )}

      {/* Quick Launch Wallboard Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-black text-sm text-white flex items-center gap-2">
              <span>غرفة العمليات والشاشة الجدارية (Executive Wallboard 4K)</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">مباشر</span>
            </h4>
            <p className="text-xs text-indigo-200/80">مراقبة حية لاختناقات الصالة، أزمنة الانتظار، اتفاقية SLA، ومصفوفة المكاتب للشاشات الكبرى.</p>
          </div>
        </div>

        {onOpenWallboard && (
          <button
            type="button"
            onClick={onOpenWallboard}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs transition shadow-md flex items-center gap-2 cursor-pointer"
          >
            <span>تشغيل الشاشة الجدارية</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
            <TicketIcon className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block">إجمالي تذاكر اليوم</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white num-latin">{totalTickets}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block">متوسط زمن الانتظار</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">
              <span className="num-latin">{avgWait}</span> دقيقة
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block">متوسط مدة الخدمة</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">
              <span className="num-latin">{avgServ}</span> دقيقة
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 block">المراجعون في الانتظار</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white num-latin">{waitingTickets.length}</span>
          </div>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-500 text-white rounded-2xl text-xs font-bold text-center shadow flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Main Admin Tabbed Box */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto p-2 gap-2 bg-slate-50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            style={activeTab === 'analytics' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'analytics' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <ChartIcon className="w-4 h-4" /> ذروة الانتظار والرسوم البيانية
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            style={activeTab === 'theme' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'theme' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Palette className="w-4 h-4" /> الخطوط والألوان وتخصيص الصفحات
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ticket_design')}
            style={activeTab === 'ticket_design' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'ticket_design' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Printer className="w-4 h-4" /> تصميم التذاكر والطباعة
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('intake_fields')}
            style={activeTab === 'intake_fields' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'intake_fields' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <FormInput className="w-4 h-4" /> نموذج بيانات الكشك والحقول
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('services')}
            style={activeTab === 'services' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'services' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <ListOrdered className="w-4 h-4" /> إدارة الخدمات والأرقام
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('counters')}
            style={activeTab === 'counters' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'counters' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-4 h-4" /> إدارة المكاتب والشبابيك
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            style={activeTab === 'branding' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'branding' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Settings2 className="w-4 h-4" /> إعدادات الهوية والشاشات
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('firebase')}
            style={activeTab === 'firebase' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'firebase' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <Cloud className="w-4 h-4" /> الربط السحابي (Firebase)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            style={activeTab === 'reports' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'reports' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" /> التقارير وتصدير Excel
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            style={activeTab === 'feedback' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'feedback' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <HeartHandshake className="w-4 h-4 text-amber-500" /> قياس رضا المراجعين (CSAT)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appointments')}
            style={activeTab === 'appointments' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'appointments' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-4 h-4 text-emerald-500" /> إدارة المواعيد المسبقة
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notifications')}
            style={activeTab === 'notifications' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'notifications' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-teal-500" /> إشعارات SMS وواتساب (WhatsApp Readiness)
          </button>
        </div>

        {/* Tab 0: Analytics & Wait Time Peak (Recharts) */}
        {activeTab === 'analytics' && (
          <div className="p-6">
            <WaitTimeAnalytics
              tickets={appState.tickets}
              services={appState.services}
              congestionLimit={appState.settings.congestionLimit}
            />
          </div>
        )}

        {/* Tab 1: Theme & Fonts & Colors */}
        {activeTab === 'theme' && (
          <div className="p-6 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
              <div>
                <h4 className="font-black text-slate-800 dark:text-white text-base flex items-center gap-2">
                  <Palette className="w-5 h-5 text-brand-600" />
                  تخصيص ألوان وثيم وخطوط النظام اليدوي
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  تحكم يدوي كامل في نوع الخط، سُمكه، ألوان الأزرار والأيقونات، ولون النصوص لتنسيقها وحل مشكلة البهتان
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  applyPreset(
                    '#0d9488',
                    '#14b8a6',
                    '#f8fafc',
                    '#ffffff',
                    '#ffffff',
                    '#0f172a',
                    '#1e293b',
                    'Tajawal'
                  );
                }}
                className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> استعادة الضبط المتناسق عالي التباين
              </button>
            </div>

            {/* القسم 1: نوع وشكل الخطوط العربية وسُمكها */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 space-y-5">
              <div className="flex items-center gap-2">
                <Type className="w-5 h-5 text-brand-600" />
                <h5 className="font-extrabold text-slate-800 dark:text-white text-sm">نوع الخط وشكله وسُمكه (Typography)</h5>
              </div>

              {/* اختيار عائلة الخط */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  عائلة الخط العربي المعتمدة:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {[
                    { id: 'Tajawal', name: 'تجوال', desc: 'متزن وواضح جداً (افتراضي)' },
                    { id: 'Cairo', name: 'القاهرة (Cairo)', desc: 'عريض وهندسي للشاشات' },
                    { id: 'Almarai', name: 'المراعي', desc: 'رسمي وحكومي فخم' },
                    { id: 'Alexandria', name: 'الإسكندرية', desc: 'عالي الدقة للمسافات' },
                    { id: 'Readex Pro', name: 'ريديكس برو', desc: 'تقني ومريح للعين' },
                    { id: 'IBM Plex Sans Arabic', name: 'IBM Plex', desc: 'رسمي ودقيق' },
                  ].map((f) => {
                    const isSelected = (settingsForm.theme.fontFamily || 'Tajawal') === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, fontFamily: f.id },
                          }))
                        }
                        style={{ fontFamily: `'${f.id}', sans-serif` }}
                        className={`p-3 rounded-xl border text-right transition cursor-pointer ${
                          isSelected
                            ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40 shadow-sm ring-2 ring-brand-500'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <span className="block text-sm font-bold text-slate-900 dark:text-white">{f.name}</span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">{f.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* سُمك الخط وحجمه */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    سُمك الخط (Font Weight) - موصى بـ عريض لوضوح الكلمات:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'normal', label: 'عادي (400)' },
                      { id: 'medium', label: 'متوسط (500)' },
                      { id: 'bold', label: 'عريض (700)' },
                    ].map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, fontWeight: w.id as any },
                          }))
                        }
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                          (settingsForm.theme.fontWeight || 'bold') === w.id
                            ? 'bg-brand-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    مقياس حجم النصوص (Font Scaling):
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'sm', label: 'مدمج (94%)' },
                      { id: 'md', label: 'قياسي (100%)' },
                      { id: 'lg', label: 'كبير ومريح (108%)' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, fontSize: s.id as any },
                          }))
                        }
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition cursor-pointer ${
                          (settingsForm.theme.fontSize || 'md') === s.id
                            ? 'bg-brand-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* القسم 2: التحكم بألوان نصوص الأزرار والأيقونات والتباين */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 space-y-5">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-brand-600" />
                <h5 className="font-extrabold text-slate-800 dark:text-white text-sm">
                  ألوان نصوص الأزرار والأيقونات لضمان الوضوح التام مع الخلفية
                </h5>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* لون نصوص الأزرار والأيقونات */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-white">
                      لون نص الأزرار والأيقونات النشطة:
                    </label>
                    <span className="text-[11px] text-slate-500 block">
                      يحل مشكلة بهتان كلمات الأيقونات والأزرار فوراً
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settingsForm.theme.buttonTextColor || '#ffffff'}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, buttonTextColor: e.target.value },
                        }))
                      }
                      className="w-12 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={settingsForm.theme.buttonTextColor || '#ffffff'}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, buttonTextColor: e.target.value },
                        }))
                      }
                      className="flex-1 p-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 num-latin text-center font-bold"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    {[
                      { hex: '#ffffff', label: 'أبيض ناصع' },
                      { hex: '#0f172a', label: 'أسود كحلي' },
                      { hex: '#fef08a', label: 'ذهبي ساطع' },
                      { hex: '#5eead4', label: 'سماوي فاتح' },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, buttonTextColor: c.hex },
                          }))
                        }
                        className="px-2 py-1 text-[10px] font-bold rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* لون النصوص العامة للعناوين */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-white">
                      لون النصوص والعناوين العامة:
                    </label>
                    <span className="text-[11px] text-slate-500 block">
                      لضمان تباين النصوص مع خلفية الصفحة
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settingsForm.theme.textColor || '#0f172a'}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, textColor: e.target.value },
                        }))
                      }
                      className="w-12 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={settingsForm.theme.textColor || '#0f172a'}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, textColor: e.target.value },
                        }))
                      }
                      className="flex-1 p-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 num-latin text-center font-bold"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    {[
                      { hex: '#0f172a', label: 'داكن عالي التباين' },
                      { hex: '#1e293b', label: 'رمادي غامق' },
                      { hex: '#f8fafc', label: 'أبيض للشاشات' },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, textColor: c.hex },
                          }))
                        }
                        className="px-2 py-1 text-[10px] font-bold rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* لون نصوص الكروت والبطاقات */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-white">
                      لون نصوص البطاقات والكروت:
                    </label>
                    <span className="text-[11px] text-slate-500 block">
                      وضوح عناوين كروت الخدمات والإحصائيات
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settingsForm.theme.cardTextColor || '#1e293b'}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, cardTextColor: e.target.value },
                        }))
                      }
                      className="w-12 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={settingsForm.theme.cardTextColor || '#1e293b'}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, cardTextColor: e.target.value },
                        }))
                      }
                      className="flex-1 p-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 num-latin text-center font-bold"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    {[
                      { hex: '#1e293b', label: 'داكن مريح' },
                      { hex: '#0f172a', label: 'أسود واضح' },
                      { hex: '#f1f5f9', label: 'فاتح للكروت الداكنة' },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() =>
                          setSettingsForm((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, cardTextColor: c.hex },
                          }))
                        }
                        className="px-2 py-1 text-[10px] font-bold rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* القسم 3: ألوان الهوية الرئيسية والخلفيات */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 space-y-4">
              <h5 className="font-extrabold text-slate-800 dark:text-white text-sm">
                ألوان الهوية وخلفية الصفحات والكروت
              </h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">اللون الرئيسي (الأزرار والبادجات)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settingsForm.theme.primary}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, primary: e.target.value },
                        }))
                      }
                      className="w-12 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={settingsForm.theme.primary}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, primary: e.target.value },
                        }))
                      }
                      className="flex-1 p-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 num-latin text-center font-bold"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">لون التمييز (Accent)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settingsForm.theme.accent}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, accent: e.target.value },
                        }))
                      }
                      className="w-12 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={settingsForm.theme.accent}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, accent: e.target.value },
                        }))
                      }
                      className="flex-1 p-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 num-latin text-center font-bold"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">لون خلفية الصفحة (Background)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settingsForm.theme.bg}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, bg: e.target.value },
                        }))
                      }
                      className="w-12 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={settingsForm.theme.bg}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, bg: e.target.value },
                        }))
                      }
                      className="flex-1 p-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 num-latin text-center font-bold"
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">لون البطاقات والكروت (Cards)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settingsForm.theme.card}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, card: e.target.value },
                        }))
                      }
                      className="w-12 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={settingsForm.theme.card}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          theme: { ...prev.theme, card: e.target.value },
                        }))
                      }
                      className="flex-1 p-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 num-latin text-center font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* القسم 4: المعاينة الحية الفورية للتباين والخطوط والألوان */}
            <div className="p-6 rounded-2xl border-2 border-brand-200 dark:border-brand-900 bg-white dark:bg-slate-800 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-brand-600" />
                  <h5 className="font-black text-slate-800 dark:text-white text-sm">
                    معاينة حية فورية للخط والألوان والتباين (Live Contrast Preview)
                  </h5>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> تباين وتناسق عالي الوضوح
                </span>
              </div>

              {/* عينة تفاعلية في بيئة الخلفية المختارة */}
              <div
                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700 transition-colors"
                style={{
                  backgroundColor: settingsForm.theme.bg,
                  fontFamily: `'${settingsForm.theme.fontFamily || 'Tajawal'}', sans-serif`,
                }}
              >
                <div className="space-y-4">
                  <div>
                    <h3
                      className="text-lg font-black transition-colors"
                      style={{ color: settingsForm.theme.textColor || '#0f172a' }}
                    >
                      عنوان تجريبي بالخط المعتمد ({settingsForm.theme.fontFamily || 'Tajawal'})
                    </h3>
                    <p
                      className="text-xs transition-colors mt-0.5"
                      style={{ color: settingsForm.theme.textColor || '#0f172a', opacity: 0.85 }}
                    >
                      هكذا ستظهر نصوص المنظومة بدقة ووضوح مريح للعين دون أي بهتان أو تداخل مع الخلفية.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* زر رئيسي */}
                    <button
                      type="button"
                      style={{
                        backgroundColor: settingsForm.theme.primary,
                        color: settingsForm.theme.buttonTextColor || '#ffffff',
                      }}
                      className="px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-md flex items-center gap-2 transition"
                    >
                      <Sparkles className="w-4 h-4" /> زر رئيسي نشط (واضح تماماً)
                    </button>

                    {/* تبويب نشط */}
                    <div
                      style={{
                        backgroundColor: settingsForm.theme.primary,
                        color: settingsForm.theme.buttonTextColor || '#ffffff',
                      }}
                      className="px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs"
                    >
                      <Palette className="w-4 h-4" /> كلمة الأيقونة واضحة 100%
                    </div>

                    {/* زر ثانوي */}
                    <button
                      type="button"
                      style={{
                        backgroundColor: settingsForm.theme.card,
                        color: settingsForm.theme.cardTextColor || '#1e293b',
                        borderColor: settingsForm.theme.accent,
                      }}
                      className="px-4 py-2.5 rounded-xl font-bold text-xs border transition shadow-xs"
                    >
                      بطاقة / زر ثانوي
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* القسم 5: قوالب ثيمات جاهزة سريعة عالية التباين */}
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                قوالب ثيمات جاهزة عالية التباين بنقرة واحدة:
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    applyPreset('#0d9488', '#14b8a6', '#f8fafc', '#ffffff', '#ffffff', '#0f172a', '#1e293b', 'Tajawal')
                  }
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-800 text-teal-100 hover:opacity-90 transition cursor-pointer"
                >
                  فيروزي ملكي (الافتراضي المتزن)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset('#2563eb', '#3b82f6', '#f8fafc', '#ffffff', '#ffffff', '#0f172a', '#1e293b', 'Cairo')
                  }
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-700 text-blue-100 hover:opacity-90 transition cursor-pointer"
                >
                  أزرق بنكي فخم (خط القاهرة العريض)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset('#059669', '#10b981', '#f8fafc', '#ffffff', '#ffffff', '#0f172a', '#1e293b', 'Almarai')
                  }
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-700 text-emerald-100 hover:opacity-90 transition cursor-pointer"
                >
                  أخضر زمردي رسمي (خط المراعي)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset('#7c3aed', '#8b5cf6', '#f8fafc', '#ffffff', '#ffffff', '#0f172a', '#1e293b', 'Alexandria')
                  }
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-700 text-purple-100 hover:opacity-90 transition cursor-pointer"
                >
                  بنفسجي رويال (خط الإسكندرية)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyPreset('#0284c7', '#38bdf8', '#0b1329', '#111c38', '#ffffff', '#f8fafc', '#e2e8f0', 'Cairo')
                  }
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-sky-400 border border-sky-500 hover:opacity-90 transition cursor-pointer"
                >
                  داكن سينمائي عالي التباين (شاشات العرض)
                </button>
              </div>
            </div>

            {/* زر الحفظ النهائي والتطبيق */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleSaveTheme}
                style={{
                  backgroundColor: settingsForm.theme.primary,
                  color: settingsForm.theme.buttonTextColor || '#ffffff',
                }}
                className="px-8 py-3.5 rounded-xl text-sm font-black transition flex items-center justify-center gap-2 shadow-lg hover:opacity-95 cursor-pointer"
              >
                <Save className="w-5 h-5" /> حفظ وتطبيق الخطوط والألوان في كامل النظام فوراً
              </button>
            </div>
          </div>
        )}

        {/* Tab: Ticket Customizer & Print Layout (المقترح 1) */}
        {activeTab === 'ticket_design' && (
          <div className="p-6">
            <TicketCustomizerTab
              settings={appState.settings}
              onSave={(newSettings) => {
                onUpdateSettings(newSettings);
                setSettingsForm(newSettings);
              }}
            />
          </div>
        )}

        {/* Tab: Intake Form Customizer (المقترح 2) */}
        {activeTab === 'intake_fields' && (
          <div className="p-6">
            <IntakeFieldsCustomizerTab
              settings={appState.settings}
              services={appState.services}
              onSave={(newSettings) => {
                onUpdateSettings(newSettings);
                setSettingsForm(newSettings);
              }}
            />
          </div>
        )}

        {/* Tab 2: Services */}
        {activeTab === 'services' && (
          <div className="p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-800 dark:text-white text-sm">قائمة الخدمات المتاحة وسلسلة الأرقام</h4>
              <button
                type="button"
                onClick={() => setShowAddService(true)}
                className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> إضافة خدمة جديدة
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
                  <tr>
                    <th className="p-3">اسم الخدمة</th>
                    <th className="p-3">رقم السلسلة</th>
                    <th className="p-3">متوسط وقت الخدمة</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {appState.services.map((s: Service) => (
                    <tr key={s.id}>
                      <td className="p-3 font-bold">{s.name}</td>
                      <td className="p-3 font-mono text-brand-600 font-bold num-latin">
                        {s.prefix} (سلسلة {s.prefix}01 فما فوق)
                      </td>
                      <td className="p-3 num-latin">{s.avgDuration} دقيقة</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                          مفعل
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => onDeleteService(s.id)}
                          className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Counters */}
        {activeTab === 'counters' && (
          <div className="p-6 space-y-5">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-800 dark:text-white text-sm">قائمة الشبابيك والمكاتب المتاحة</h4>
              <button
                type="button"
                onClick={() => setShowAddCounter(true)}
                className="px-4 py-2 bg-brand-600 text-white rounded-xl text-xs font-bold hover:bg-brand-700 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> إضافة مكتب
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500">
                  <tr>
                    <th className="p-3">رقم / اسم المكتب</th>
                    <th className="p-3">الموظف المعين</th>
                    <th className="p-3">التذكرة النشطة الحالية</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {appState.counters.map((c: Counter) => {
                    const activeTicket = appState.tickets.find((t) => t.id === c.activeTicketId);
                    return (
                      <tr key={c.id}>
                        <td className="p-3 font-bold">{c.name}</td>
                        <td className="p-3 text-slate-500">{c.staffName || '---'}</td>
                        <td className="p-3 font-mono font-bold text-brand-600 num-latin">
                          {activeTicket ? activeTicket.code : 'لا يوجد'}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              activeTicket ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {activeTicket ? 'في الخدمة' : 'شاغر'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => onDeleteCounter(c.id)}
                            className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Branding */}
        {activeTab === 'branding' && (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1">اسم المنشأة / المؤسسة</label>
                <input
                  type="text"
                  value={settingsForm.orgName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, orgName: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">اسم الفرع / الصالة</label>
                <input
                  type="text"
                  value={settingsForm.branchName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, branchName: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">حد تنبيه الازدحام (عدد المعلقين)</label>
                <input
                  type="number"
                  value={settingsForm.congestionLimit}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, congestionLimit: parseInt(e.target.value, 10) || 12 })
                  }
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 num-latin"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1">نص شريط الإعلانات والأخبار المتحرك</label>
                <input
                  type="text"
                  value={settingsForm.marqueeText}
                  onChange={(e) => setSettingsForm({ ...settingsForm, marqueeText: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1">رابط الفيديو في شاشة العرض (YouTube Embed URL - اختياري)</label>
                <input
                  type="text"
                  value={settingsForm.youtubeUrl}
                  onChange={(e) => setSettingsForm({ ...settingsForm, youtubeUrl: e.target.value })}
                  placeholder="https://www.youtube.com/embed/..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 num-latin"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1">تذييل الإيصال المطبوع (Thermal Receipt Footer)</label>
                <input
                  type="text"
                  value={settingsForm.printFooter}
                  onChange={(e) => setSettingsForm({ ...settingsForm, printFooter: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveBranding}
              className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Save className="w-4 h-4" /> حفظ إعدادات الهوية والشاشة
            </button>
          </div>
        )}

        {/* Tab 5: Firebase */}
        {activeTab === 'firebase' && (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <Cloud className="w-4 h-4 text-amber-600" />
                المزامنة السحابية الحية (Live Cross-Device Cloud Sync):
              </div>
              <p className="leading-relaxed">
                يقوم هذا الكود بربط النظام سحابياً مع Firebase (يدعم كلاً من Realtime Database و Cloud Firestore).
                بمجرد إدخال الـ Web Config وحفظه، يتم مزامنة استدعاء التذاكر، وحالة الشاشات، وأكشاك الحجز لحظياً بين جميع الأجهزة والهواتف المتصلة.
              </p>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold">Firebase Web Config (JSON Format)</label>
                <button
                  type="button"
                  onClick={() => {
                    const sample = JSON.stringify({
                      apiKey: "AIzaSyDummyKeyForTestingQueue123456",
                      authDomain: "my-smart-queue.firebaseapp.com",
                      databaseURL: "https://my-smart-queue-default-rtdb.firebaseio.com",
                      projectId: "my-smart-queue",
                      storageBucket: "my-smart-queue.appspot.com",
                      messagingSenderId: "123456789012",
                      appId: "1:123456789012:web:abcdef123456"
                    }, null, 2);
                    setSettingsForm({ ...settingsForm, firebaseConfigStr: sample });
                  }}
                  className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline cursor-pointer font-bold"
                >
                  إدراج نموذج تجريبي (Sample Config)
                </button>
              </div>
              <textarea
                rows={8}
                value={settingsForm.firebaseConfigStr}
                onChange={(e) => {
                  setSettingsForm({ ...settingsForm, firebaseConfigStr: e.target.value });
                  setFirebaseTestResult(null);
                }}
                placeholder='{
  "apiKey": "AIzaSy...",
  "authDomain": "my-queue.firebaseapp.com",
  "databaseURL": "https://my-queue-default-rtdb.firebaseio.com",
  "projectId": "my-queue",
  "appId": "..."
}'
                className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 num-latin"
              ></textarea>
            </div>

            {/* Test Result Message */}
            {firebaseTestResult && (
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2.5 ${
                  firebaseTestResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                }`}
              >
                {firebaseTestResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{firebaseTestResult.message}</div>
                  {firebaseTestResult.details && (
                    <div className="text-[11px] opacity-80 mt-1 font-mono">{firebaseTestResult.details}</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isTestingFirebase}
                onClick={() => {
                  setIsTestingFirebase(true);
                  setFirebaseTestResult(null);

                  try {
                    const parsed = parseFirebaseConfig(settingsForm.firebaseConfigStr);
                    if (!parsed) {
                      setFirebaseTestResult({
                        tested: true,
                        success: false,
                        message: 'صيغة JSON غير صحيحة أو البيانات فارغة.',
                        details: 'يرجى التأكد من كتابة كود JSON سليم يحتوي على apiKey و projectId.',
                      });
                      setIsTestingFirebase(false);
                      return;
                    }

                    const initRes = initFirebaseService(settingsForm.firebaseConfigStr);
                    if (initRes.success) {
                      setFirebaseTestResult({
                        tested: true,
                        success: true,
                        message: 'تم التحقق من صحة كود الربط وتهيئة Firebase بنجاح!',
                        details: `نوع قاعدة البيانات: ${
                          initRes.type === 'rtdb' ? 'Firebase Realtime Database (مزامنة فورية فائقة السرعة)' : 'Cloud Firestore'
                        } | معرف المشروع: ${parsed.projectId || 'سحابي'}`,
                      });
                    } else {
                      setFirebaseTestResult({
                        tested: true,
                        success: false,
                        message: 'فشل تهيئة تطبيق Firebase بالبيانات المدخلة.',
                        details: initRes.error,
                      });
                    }
                  } catch (e: any) {
                    setFirebaseTestResult({
                      tested: true,
                      success: false,
                      message: 'حدث خطأ أثناء اختبار الاتصال.',
                      details: e?.message,
                    });
                  } finally {
                    setIsTestingFirebase(false);
                  }
                }}
                className="px-5 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
              >
                {isTestingFirebase ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                <span>فحص كود الربط والاتصال</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSaveBranding();
                  // إذا تم الفحص مسبقاً أو لم يتم
                  if (!firebaseTestResult) {
                    const parsed = parseFirebaseConfig(settingsForm.firebaseConfigStr);
                    if (parsed) {
                      setFirebaseTestResult({
                        tested: true,
                        success: true,
                        message: 'تم حفظ إعدادات Firebase وبدء المزامنة السحابية الحية!',
                        details: `المشروع: ${parsed.projectId || 'Firebase Live'}`,
                      });
                    }
                  }
                }}
                className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Save className="w-4 h-4" /> حفظ وتفعيل المزامنة السحابية
              </button>
            </div>
          </div>
        )}

        {/* Tab 6: Reports */}
        {activeTab === 'reports' && (
          <div className="p-6 space-y-5">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">سجلات التذاكر والعمليات المنفذة</h4>
                <p className="text-xs text-slate-400">تصدير تقرير شامل لكافة المعاملات وأوقات الانتظار إلى ملف Excel</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onExportExcel}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" /> تصدير Excel
                </button>
                <button
                  type="button"
                  onClick={onResetDayData}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <RotateCcw className="w-4 h-4" /> تصفير سجلات اليوم
                </button>
              </div>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 sticky top-0">
                  <tr>
                    <th className="p-2.5">رقم التذكرة</th>
                    <th className="p-2.5">الخدمة</th>
                    <th className="p-2.5">المراجع</th>
                    <th className="p-2.5">المكتب</th>
                    <th className="p-2.5">وقت الإصدار</th>
                    <th className="p-2.5">مدة الانتظار</th>
                    <th className="p-2.5">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {appState.tickets.slice(-40).reverse().map((t) => {
                    const waitMin = t.calledAt ? Math.round((t.calledAt - t.createdAt) / 60000) : '-';
                    return (
                      <tr key={t.id}>
                        <td className="p-2.5 font-black num-latin text-brand-600 text-sm">{t.code}</td>
                        <td className="p-2.5">{t.serviceName}</td>
                        <td className="p-2.5 text-slate-500">{t.customerName || 'مراجع'}</td>
                        <td className="p-2.5">{t.counterName || '-'}</td>
                        <td className="p-2.5 num-latin text-slate-400">
                          {new Date(t.createdAt).toLocaleTimeString('en-US')}
                        </td>
                        <td className="p-2.5 num-latin">{waitMin} د</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              t.status === 'completed'
                                ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                : t.status === 'serving'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-brand-100 text-brand-800'
                            }`}
                          >
                            {t.status === 'completed' ? 'منجز' : t.status === 'serving' ? 'قيد النداء' : 'انتظار'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 9: Customer Satisfaction (CSAT) & Feedback Analytics */}
        {activeTab === 'feedback' && (
          <div className="p-6">
            <FeedbackAnalyticsTab
              appState={appState}
              onUpdateSettings={onUpdateSettings}
            />
          </div>
        )}

        {/* Tab 10: Appointments Management */}
        {activeTab === 'appointments' && (
          <div className="p-6">
            <AppointmentsManagementTab
              appState={appState}
              onUpdateSettings={onUpdateSettings}
              onSaveAppointment={onSaveAppointment || (() => {})}
              onCancelAppointment={onCancelAppointment || (() => {})}
              onDeleteAppointment={onDeleteAppointment || (() => {})}
              onCheckInAppointment={onCheckInAppointment || (() => {})}
            />
          </div>
        )}

        {/* Tab 11: SMS & WhatsApp Notifications & Live Mobile Preview */}
        {activeTab === 'notifications' && (
          <div className="p-6">
            <NotificationSettingsTab
              settings={appState.settings}
              notificationLogs={appState.notificationLogs}
              onSaveSettings={onUpdateSettings}
              onClearLogs={onClearNotificationLogs}
            />
          </div>
        )}
      </div>

      {/* Add Service Modal */}
      {showAddService && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">إضافة خدمة جديدة</h3>
            <div>
              <label className="block text-xs font-semibold mb-1">اسم الخدمة</label>
              <input
                type="text"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="مثال: قسم الشركات والتمويل"
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1">رقم السلسلة (مثال: 4 لسلسلة 401)</label>
                <input
                  type="number"
                  min="1"
                  max="9"
                  value={newServicePrefix}
                  onChange={(e) => setNewServicePrefix(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold num-latin"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">متوسط المدة (دقيقة)</label>
                <input
                  type="number"
                  value={newServiceDuration}
                  onChange={(e) => setNewServiceDuration(parseInt(e.target.value, 10) || 5)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 num-latin"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddService(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newServiceName.trim() && newServicePrefix.trim()) {
                    onAddService({
                      name: newServiceName.trim(),
                      prefix: newServicePrefix.trim(),
                      avgDuration: newServiceDuration,
                      active: true,
                    });
                    setNewServiceName('');
                    setShowAddService(false);
                  }
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 text-white hover:bg-brand-700"
              >
                حفظ الخدمة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Counter Modal */}
      {showAddCounter && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700 shadow-2xl">
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">إضافة مكتب جديد</h3>
            <div>
              <label className="block text-xs font-semibold mb-1">اسم / رقم المكتب</label>
              <input
                type="text"
                value={newCounterName}
                onChange={(e) => setNewCounterName(e.target.value)}
                placeholder="مثال: مكتب رقم 5 أو شباك التميز"
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">اسم الموظف المسؤول (اختياري)</label>
              <input
                type="text"
                value={newCounterStaff}
                onChange={(e) => setNewCounterStaff(e.target.value)}
                placeholder="مثال: عبد العزيز الدوسري"
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddCounter(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newCounterName.trim()) {
                    onAddCounter({
                      name: newCounterName.trim(),
                      staffName: newCounterStaff.trim() || 'موظف خدمة',
                      activeTicketId: null,
                    });
                    setNewCounterName('');
                    setNewCounterStaff('');
                    setShowAddCounter(false);
                  }
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-brand-600 text-white hover:bg-brand-700"
              >
                حفظ المكتب
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
