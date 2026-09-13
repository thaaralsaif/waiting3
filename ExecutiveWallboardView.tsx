import React, { useState, useEffect, useMemo } from 'react';
import { AppState, Counter, Ticket, Service, SupervisorSettings } from '../types';
import { playChimeSound } from '../utils';
import { 
  Tv, Maximize, Minimize, Bell, BellOff, Clock, Users, UserCheck, 
  AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp, Award, 
  Activity, ArrowRight, Zap, RefreshCw, Flame, Sliders, Volume2, 
  Building2, Sparkles, Star, ChevronRight, PauseCircle, PlayCircle
} from 'lucide-react';

interface ExecutiveWallboardViewProps {
  appState: AppState;
  onUpdateSettings?: (settings: AppState['settings']) => void;
  onClose?: () => void;
}

export const ExecutiveWallboardView: React.FC<ExecutiveWallboardViewProps> = ({
  appState,
  onUpdateSettings,
  onClose,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [wallboardTheme, setWallboardTheme] = useState<'dark' | 'light'>('dark');

  // Supervisor SLA Settings with safe fallbacks
  const supervisorSettings: SupervisorSettings = appState.settings.supervisorSettings || {
    targetWaitMinutes: 10,
    targetServiceMinutes: 8,
    criticalWaitAlertMinutes: 15,
    soundAlertsEnabled: true,
    refreshIntervalSeconds: 10,
  };

  const [tempSettings, setTempSettings] = useState<SupervisorSettings>(supervisorSettings);

  // Live seconds ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // 1. Operational Calculations
  const waitingTickets = useMemo(() => {
    return appState.tickets
      .filter((t) => t.status === 'waiting')
      .sort((a, b) => a.createdAt - b.createdAt); // oldest first
  }, [appState.tickets]);

  const servingTickets = useMemo(() => {
    return appState.tickets.filter((t) => t.status === 'serving');
  }, [appState.tickets]);

  const completedTodayTickets = useMemo(() => {
    return appState.tickets.filter((t) => t.status === 'completed');
  }, [appState.tickets]);

  // Average wait time of completed tickets today (in minutes)
  const avgWaitMinutes = useMemo(() => {
    if (completedTodayTickets.length === 0) return 0;
    const totalWaitMs = completedTodayTickets.reduce((acc, t) => {
      const waitTime = (t.calledAt || t.completedAt || t.createdAt) - t.createdAt;
      return acc + Math.max(0, waitTime);
    }, 0);
    return Math.round((totalWaitMs / completedTodayTickets.length / 60000) * 10) / 10;
  }, [completedTodayTickets]);

  // Average service duration of completed tickets today (in minutes)
  const avgServiceMinutes = useMemo(() => {
    if (completedTodayTickets.length === 0) return 0;
    const totalServiceMs = completedTodayTickets.reduce((acc, t) => {
      if (t.calledAt && t.completedAt) {
        return acc + Math.max(0, t.completedAt - t.calledAt);
      }
      return acc + 5 * 60000; // default 5m
    }, 0);
    return Math.round((totalServiceMs / completedTodayTickets.length / 60000) * 10) / 10;
  }, [completedTodayTickets]);

  // SLA Adherence % (tickets served within targetWaitMinutes)
  const slaAdherencePct = useMemo(() => {
    if (completedTodayTickets.length === 0) return 100;
    const targetMs = supervisorSettings.targetWaitMinutes * 60000;
    const withinSla = completedTodayTickets.filter((t) => {
      const waitTime = (t.calledAt || t.completedAt || t.createdAt) - t.createdAt;
      return waitTime <= targetMs;
    }).length;
    return Math.round((withinSla / completedTodayTickets.length) * 100);
  }, [completedTodayTickets, supervisorSettings.targetWaitMinutes]);

  // Critical wait breached tickets (waiting > criticalWaitAlertMinutes)
  const criticalTickets = useMemo(() => {
    const now = currentTime.getTime();
    const criticalMs = supervisorSettings.criticalWaitAlertMinutes * 60000;
    return waitingTickets.filter((t) => now - t.createdAt > criticalMs);
  }, [waitingTickets, currentTime, supervisorSettings.criticalWaitAlertMinutes]);

  // Longest waiting customer right now
  const longestWaitingTicket = waitingTickets[0] || null;
  const longestWaitMinutes = longestWaitingTicket
    ? Math.floor((currentTime.getTime() - longestWaitingTicket.createdAt) / 60000)
    : 0;

  // Sound alert on new critical tickets
  useEffect(() => {
    if (soundAlerts && criticalTickets.length > 0) {
      // Play soft chime alert once when critical threshold is crossed
      try {
        playChimeSound();
      } catch {
        // ignore
      }
    }
  }, [criticalTickets.length, soundAlerts]);

  // Overall Hall Congestion Status
  const hallStatus = useMemo(() => {
    if (criticalTickets.length > 0 || waitingTickets.length >= (appState.settings.congestionLimit || 15)) {
      return {
        level: 'critical',
        label: 'ذروة وازدحام مرتفع 🔴',
        bg: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
        badge: 'bg-rose-500 text-white animate-pulse',
      };
    }
    if (waitingTickets.length > 6 || longestWaitMinutes >= supervisorSettings.targetWaitMinutes) {
      return {
        level: 'warning',
        label: 'ضغط تشغيلي متوسط 🟡',
        bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        badge: 'bg-amber-500 text-slate-950',
      };
    }
    return {
      level: 'optimal',
      label: 'حالة انسيابية مستقرة 🟢',
      bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      badge: 'bg-emerald-500 text-white',
    };
  }, [criticalTickets.length, waitingTickets.length, longestWaitMinutes, appState.settings.congestionLimit, supervisorSettings.targetWaitMinutes]);

  // Counter productivity metrics (number of tickets served today per counter)
  const counterStatsMap = useMemo(() => {
    const map: Record<string, { count: number; avgDuration: number }> = {};
    appState.counters.forEach((c) => {
      const served = completedTodayTickets.filter((t) => t.counterId === c.id);
      let totalTime = 0;
      served.forEach((t) => {
        if (t.calledAt && t.completedAt) totalTime += t.completedAt - t.calledAt;
      });
      map[c.id] = {
        count: served.length,
        avgDuration: served.length > 0 ? Math.round((totalTime / served.length / 60000) * 10) / 10 : 0,
      };
    });
    return map;
  }, [appState.counters, completedTodayTickets]);

  // Average CSAT per counter
  const counterFeedbackMap = useMemo(() => {
    const map: Record<string, number> = {};
    (appState.feedbacks || []).forEach((fb) => {
      if (!map[fb.counterId]) map[fb.counterId] = 0;
    });
    appState.counters.forEach((c) => {
      const fbs = (appState.feedbacks || []).filter((fb) => fb.counterId === c.id);
      if (fbs.length > 0) {
        const sum = fbs.reduce((acc, f) => acc + f.rating, 0);
        map[c.id] = Math.round((sum / fbs.length) * 10) / 10;
      } else {
        map[c.id] = 5.0; // default initial score
      }
    });
    return map;
  }, [appState.counters, appState.feedbacks]);

  // Save Supervisor Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateSettings) {
      onUpdateSettings({
        ...appState.settings,
        supervisorSettings: tempSettings,
      });
    }
    setShowSettingsModal(false);
  };

  const isDark = wallboardTheme === 'dark';

  return (
    <div
      className={`min-h-screen w-full flex flex-col transition-colors duration-300 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
      dir="rtl"
    >
      {/* 1. Header Bar: Command Center Header */}
      <header
        className={`px-6 py-4 border-b flex flex-col md:flex-row items-center justify-between gap-4 sticky top-0 z-40 backdrop-blur-md ${
          isDark
            ? 'bg-slate-900/90 border-slate-800'
            : 'bg-white/95 border-slate-200'
        }`}
      >
        {/* Left: Organization Title & Branch */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/20 font-black">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight">
                غرفة العمليات وشاشة المراقبة الجدارية (Executive Wallboard)
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-brand-500/20 text-brand-400 border border-brand-500/30">
                LIVE 4K
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {appState.settings.orgName} • فرع {appState.settings.branchName}
            </p>
          </div>
        </div>

        {/* Center: Live Hall Health Badge */}
        <div className="flex items-center gap-3">
          <div
            className={`px-4 py-2 rounded-2xl border flex items-center gap-2.5 transition shadow-xs ${hallStatus.bg}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${hallStatus.badge}`} />
            <span className="font-extrabold text-xs tracking-wide">
              حالة الصالة: {hallStatus.label}
            </span>
          </div>
        </div>

        {/* Right: Real-Time Seconds Clock & Controls */}
        <div className="flex items-center gap-3">
          {/* Big Digital Clock */}
          <div
            className={`px-4 py-1.5 rounded-2xl border text-center font-mono ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <span className="text-xl font-black num-latin tracking-widest block leading-none">
              {currentTime.toLocaleTimeString('en-US', { hour12: false })}
            </span>
            <span className="text-[10px] opacity-60 num-latin block mt-0.5">
              {currentTime.toLocaleDateString('ar-SA')}
            </span>
          </div>

          {/* Sound Alert Toggle */}
          <button
            type="button"
            onClick={() => setSoundAlerts(!soundAlerts)}
            className={`p-2.5 rounded-xl border transition cursor-pointer ${
              soundAlerts
                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
                : isDark
                ? 'bg-slate-800 text-slate-500 border-slate-700'
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
            title={soundAlerts ? 'التنبيهات الصوتية مفعلة' : 'التنبيهات الصوتية صامتة'}
          >
            {soundAlerts ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>

          {/* Theme Toggle (Dark Command vs Clean Light) */}
          <button
            type="button"
            onClick={() => setWallboardTheme(isDark ? 'light' : 'dark')}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isDark ? 'الوضع النهاري' : 'الوضع الليلي'}
          </button>

          {/* SLA Settings Modal Toggle */}
          <button
            type="button"
            onClick={() => {
              setTempSettings(supervisorSettings);
              setShowSettingsModal(true);
            }}
            className={`p-2.5 rounded-xl border transition cursor-pointer ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
            title="إعدادات اتفاقية مستوى الخدمة SLA والإنذار"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold transition shadow-xs cursor-pointer"
            title="عرض ملء الشاشة للشاشات الكبرى"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Exit / Return Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={`p-2.5 rounded-xl border transition cursor-pointer ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900'
              }`}
              title="العودة للنظام الرئيسي"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Command Canvas */}
      <main className="flex-1 p-5 sm:p-6 space-y-6 max-w-[1920px] w-full mx-auto">
        {/* 2. Critical Alert Banner (if any ticket breached critical threshold) */}
        {criticalTickets.length > 0 && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 border-2 border-rose-500 text-white shadow-xl shadow-rose-950/50 flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3 text-right">
              <div className="p-2 bg-rose-600 rounded-xl">
                <ShieldAlert className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base flex items-center gap-2">
                  <span>تنبيه اختناق تشغيلي: {criticalTickets.length} تذكرة تجاوزت الحد الأقصى للانتظار ({supervisorSettings.criticalWaitAlertMinutes} دقيقة)!</span>
                </h3>
                <p className="text-xs text-rose-200 mt-0.5">
                  يرجى توجيه موظفي المكاتب المتاحة أو تفعيل شبابيك مساندة لمعالجة التذاكر فوراً للحفاظ على مستوى الخدمة.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {criticalTickets.slice(0, 4).map((t) => {
                const waitMin = Math.floor((currentTime.getTime() - t.createdAt) / 60000);
                return (
                  <span
                    key={t.id}
                    className="px-3 py-1 rounded-xl bg-white text-rose-900 font-black text-xs num-latin shadow"
                  >
                    تذكرة #{t.code} ({waitMin} د)
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Top Executive KPI Metrics Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Card 1: Currently Waiting */}
          <div
            className={`p-4 rounded-3xl border transition shadow-sm ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>المنتظرون حالياً</span>
              <Users className="w-4 h-4 text-brand-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-black text-brand-500 num-latin">
                {waitingTickets.length}
              </span>
              <span className="text-xs text-slate-400">مراجع</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>أولوية كبار السن/VIP:</span>
              <span className="font-bold text-amber-500 num-latin">
                {waitingTickets.filter((t) => t.isPriority).length}
              </span>
            </div>
          </div>

          {/* Card 2: Currently Serving */}
          <div
            className={`p-4 rounded-3xl border transition shadow-sm ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>يُخدمون الآن</span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-black text-emerald-500 num-latin">
                {servingTickets.length}
              </span>
              <span className="text-xs text-slate-400">على الشبابيك</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>المكاتب النشطة:</span>
              <span className="font-bold text-emerald-400 num-latin">
                {appState.counters.filter((c) => c.activeTicketId).length} / {appState.counters.length}
              </span>
            </div>
          </div>

          {/* Card 3: Completed Today */}
          <div
            className={`p-4 rounded-3xl border transition shadow-sm ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>المنجزون اليوم</span>
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-black text-blue-500 num-latin">
                {completedTodayTickets.length}
              </span>
              <span className="text-xs text-slate-400">معاملة</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>نسبة الإنجاز:</span>
              <span className="font-bold text-slate-200 num-latin">
                {appState.tickets.length > 0
                  ? Math.round((completedTodayTickets.length / appState.tickets.length) * 100)
                  : 0}
                %
              </span>
            </div>
          </div>

          {/* Card 4: Average Wait Time */}
          <div
            className={`p-4 rounded-3xl border transition shadow-sm ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>متوسط زمن الانتظار</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-4xl font-black num-latin ${
                  avgWaitMinutes > supervisorSettings.targetWaitMinutes
                    ? 'text-rose-500'
                    : 'text-slate-800 dark:text-white'
                }`}
              >
                {avgWaitMinutes}
              </span>
              <span className="text-xs text-slate-400">دقيقة</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>المستهدف (SLA):</span>
              <span className="font-bold text-emerald-400 num-latin">
                ≤ {supervisorSettings.targetWaitMinutes} د
              </span>
            </div>
          </div>

          {/* Card 5: SLA Adherence Rate */}
          <div
            className={`p-4 rounded-3xl border transition shadow-sm ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>الالتزام باتفاقية SLA</span>
              <Award className="w-4 h-4 text-teal-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-4xl font-black num-latin ${
                  slaAdherencePct >= 90
                    ? 'text-emerald-500'
                    : slaAdherencePct >= 75
                    ? 'text-amber-500'
                    : 'text-rose-500'
                }`}
              >
                {slaAdherencePct}%
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>خدموا بالوقت المستهدف:</span>
              <span className="font-bold text-slate-200 num-latin">
                {slaAdherencePct >= 90 ? 'ممتاز' : 'يحتاج متابعة'}
              </span>
            </div>
          </div>

          {/* Card 6: Average Service Duration */}
          <div
            className={`p-4 rounded-3xl border transition shadow-sm ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>متوسط زمن الخدمة</span>
              <Zap className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-black text-indigo-400 num-latin">
                {avgServiceMinutes}
              </span>
              <span className="text-xs text-slate-400">دقيقة</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
              <span>المستهدف بالمكتب:</span>
              <span className="font-bold text-slate-200 num-latin">
                ~ {supervisorSettings.targetServiceMinutes} د
              </span>
            </div>
          </div>
        </div>

        {/* 4. Live Counter & Staff Operations Matrix */}
        <div
          className={`p-6 rounded-3xl border shadow-sm ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b pb-4 mb-5 border-slate-800/80">
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-500" />
              <h2 className="font-black text-base tracking-wide">
                مصفوفة حالة الشبابيك والموظفين اللحظية ({appState.counters.length} مكاتب)
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                يخدم حالياً ({appState.counters.filter((c) => c.activeTicketId).length})
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                متاح بانتظار استدعاء ({appState.counters.filter((c) => !c.activeTicketId).length})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {appState.counters.map((counter) => {
              const activeTicket = counter.activeTicketId
                ? appState.tickets.find((t) => t.id === counter.activeTicketId)
                : null;

              // Elapsed serving duration
              const elapsedSec = activeTicket && activeTicket.calledAt
                ? Math.floor((currentTime.getTime() - activeTicket.calledAt) / 1000)
                : 0;
              const elapsedMin = Math.floor(elapsedSec / 60);
              const elapsedSecRemainder = elapsedSec % 60;
              const isServingOvertime = elapsedMin >= supervisorSettings.targetServiceMinutes;

              const stats = counterStatsMap[counter.id] || { count: 0, avgDuration: 0 };
              const csatRating = counterFeedbackMap[counter.id] || 5.0;

              return (
                <div
                  key={counter.id}
                  className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                    activeTicket
                      ? isServingOvertime
                        ? 'bg-gradient-to-b from-rose-950/40 to-slate-900 border-rose-500/60 shadow-lg shadow-rose-950/30'
                        : 'bg-gradient-to-b from-emerald-950/30 to-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-950/20'
                      : isDark
                      ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {/* Top Bar: Office Name & Status Badge */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-black text-base text-slate-800 dark:text-white">
                          {counter.name}
                        </h3>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          الموظف: <strong className="text-slate-200">{counter.staffName || 'موظف خدمة'}</strong>
                        </span>
                      </div>

                      {activeTicket ? (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow ${
                            isServingOvertime
                              ? 'bg-rose-500 text-white animate-pulse'
                              : 'bg-emerald-500 text-white'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                          <span>يخدم الآن</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          جاهز ومتاح
                        </span>
                      )}
                    </div>

                    {/* Active Ticket Card Details */}
                    {activeTicket ? (
                      <div className="p-3.5 rounded-2xl bg-black/40 border border-slate-700/60 space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 font-semibold">
                            التذكرة الجارية:
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-brand-600 text-white font-black text-sm num-latin">
                            #{activeTicket.code}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-slate-200 truncate">
                          {activeTicket.customerName || 'مراجع'} • {activeTicket.serviceName}
                        </div>

                        {/* Serving Timer Clock */}
                        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs">
                          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                            <Clock className="w-3.5 h-3.5" /> زمن الخدمة:
                          </span>
                          <span
                            className={`font-mono font-black text-sm num-latin ${
                              isServingOvertime ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                            }`}
                          >
                            {String(elapsedMin).padStart(2, '0')}:
                            {String(elapsedSecRemainder).padStart(2, '0')} د
                          </span>
                        </div>

                        {isServingOvertime && (
                          <div className="text-[10px] text-rose-300 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-400" />
                            تجاوز المستهدف ({supervisorSettings.targetServiceMinutes} د)!
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-slate-500 text-xs italic">
                        لا توجد معاملة جارية حالياً (بانتظار استدعاء التذكرة التالية)
                      </div>
                    )}
                  </div>

                  {/* Bottom Counter Metrics: Served Today & CSAT */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <div>
                      <span>أُنجز اليوم: </span>
                      <strong className="text-white num-latin">{stats.count}</strong>
                    </div>

                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span className="font-bold text-amber-400 num-latin">{csatRating}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Lower Split Section: Department Workload & Next in Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section A: Services Workload Distribution */}
          <div
            className={`p-6 rounded-3xl border shadow-sm ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-800/80">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-sm">
                  توزيع الأحمال وضغط الخدمات (Department Workload)
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                {appState.services.length} خدمات مفعّلة
              </span>
            </div>

            <div className="space-y-3">
              {appState.services.map((service) => {
                const waitingInService = waitingTickets.filter((t) => t.serviceId === service.id);
                const servingInService = servingTickets.filter((t) => t.serviceId === service.id);
                const completedInService = completedTodayTickets.filter((t) => t.serviceId === service.id);

                const isOverloaded = waitingInService.length >= 6;

                return (
                  <div
                    key={service.id}
                    className={`p-4 rounded-2xl border transition ${
                      isOverloaded
                        ? 'bg-rose-950/20 border-rose-500/40'
                        : isDark
                        ? 'bg-slate-900/40 border-slate-800'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-lg bg-brand-500/20 text-brand-400 font-black text-xs num-latin">
                          سلسلة {service.prefix}00
                        </span>
                        <h4 className="font-black text-sm text-slate-800 dark:text-white">
                          {service.name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-400">
                          الانتظار:{' '}
                          <strong
                            className={`num-latin text-sm ${
                              waitingInService.length > 5 ? 'text-rose-400 font-black' : 'text-slate-200'
                            }`}
                          >
                            {waitingInService.length}
                          </strong>
                        </span>

                        <span className="text-slate-400">
                          يُخدم:{' '}
                          <strong className="text-emerald-400 font-bold num-latin">
                            {servingInService.length}
                          </strong>
                        </span>

                        <span className="text-slate-400">
                          المنجز:{' '}
                          <strong className="text-blue-400 font-bold num-latin">
                            {completedInService.length}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* Workload Progress Meter */}
                    <div className="w-full h-2 bg-slate-800 rounded-full mt-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOverloaded
                            ? 'bg-rose-500'
                            : waitingInService.length > 2
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(10, waitingInService.length * 15))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B: Next in Queue & Critical Waiting Spotlight */}
          <div
            className={`p-6 rounded-3xl border shadow-sm ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-800/80">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand-500" />
                <h3 className="font-black text-sm">
                  أقدم المراجعين في قائمة الانتظار (Queue Priority Radar)
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                مرتبة حسب الأسبقية والأقدمية
              </span>
            </div>

            {waitingTickets.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <span>رائع! لا يوجد أي مراجع في قائمة الانتظار حالياً. الصالة فارغة ومنجزة بالكامل.</span>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {waitingTickets.slice(0, 6).map((ticket, index) => {
                  const waitMinutes = Math.floor((currentTime.getTime() - ticket.createdAt) / 60000);
                  const isCritical = waitMinutes >= supervisorSettings.criticalWaitAlertMinutes;
                  const isApproaching = waitMinutes >= supervisorSettings.targetWaitMinutes;

                  return (
                    <div
                      key={ticket.id}
                      className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition ${
                        isCritical
                          ? 'bg-rose-950/40 border-rose-500 text-white animate-pulse'
                          : isApproaching
                          ? 'bg-amber-950/30 border-amber-500/50 text-slate-200'
                          : isDark
                          ? 'bg-slate-900/50 border-slate-800 text-slate-300'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-[11px] num-latin">
                          #{index + 1}
                        </span>

                        <span className="px-2.5 py-1 rounded-xl bg-brand-600 text-white font-black text-sm num-latin tracking-wide">
                          #{ticket.code}
                        </span>

                        <div>
                          <span className="font-extrabold text-slate-800 dark:text-white block">
                            {ticket.customerName || 'مراجع'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {ticket.serviceName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {ticket.isPriority && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                            VIP
                          </span>
                        )}

                        <div className="text-right">
                          <span
                            className={`font-mono font-black text-sm num-latin block ${
                              isCritical
                                ? 'text-rose-400 font-black'
                                : isApproaching
                                ? 'text-amber-400 font-bold'
                                : 'text-slate-300'
                            }`}
                          >
                            منذ {waitMinutes} د
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {new Date(ticket.createdAt).toLocaleTimeString('ar-SA', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 6. SLA Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-black text-base flex items-center gap-2">
                <Sliders className="w-5 h-5 text-brand-500" />
                إعدادات اتفاقية مستوى الخدمة (SLA Thresholds)
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  زمن الانتظار المستهدف (Target Wait Time بالدقائق):
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={tempSettings.targetWaitMinutes}
                  onChange={(e) =>
                    setTempSettings({
                      ...tempSettings,
                      targetWaitMinutes: parseInt(e.target.value, 10) || 10,
                    })
                  }
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl font-black text-sm num-latin focus:outline-none focus:border-brand-500"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  الحد الأقصى المسموح به للانتظار قبل اعتباره خارج اتفاقية الخدمة.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  حد الإنذار الحرج للاختناق (Critical Alert Threshold بالدقائق):
                </label>
                <input
                  type="number"
                  min="2"
                  max="120"
                  value={tempSettings.criticalWaitAlertMinutes}
                  onChange={(e) =>
                    setTempSettings({
                      ...tempSettings,
                      criticalWaitAlertMinutes: parseInt(e.target.value, 10) || 15,
                    })
                  }
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl font-black text-sm num-latin focus:outline-none focus:border-rose-500"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  إطلاق شريط الإنذار والتنبيه الصوتي فور تجاوز تذكرة لهذه المدة.
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  زمن الخدمة المستهدف بالمكتب (Target Service Time بالدقائق):
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={tempSettings.targetServiceMinutes}
                  onChange={(e) =>
                    setTempSettings({
                      ...tempSettings,
                      targetServiceMinutes: parseInt(e.target.value, 10) || 8,
                    })
                  }
                  className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl font-black text-sm num-latin focus:outline-none focus:border-brand-500"
                />
                <span className="text-[11px] text-slate-400 block mt-1">
                  تنبيه إذا استغرقت خدمة العميل على الشباك وقتاً أطول من ذلك.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-brand-600 text-white font-black hover:bg-brand-700 shadow-md cursor-pointer"
                >
                  حفظ وتطبيق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
