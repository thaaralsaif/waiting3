import React, { useEffect, useState, useRef, useTransition } from 'react';
import { 
  AppState, ActiveView, Ticket, Service, Counter, TicketTransferLog, TicketFeedback,
  NotificationLog, NotificationTrigger
} from './types';
import { 
  STORAGE_KEY, defaultInitialState, announceTicketCall, playChimeSound 
} from './utils';
import { 
  composeNotificationMessage, 
  getWhatsAppDirectUrl, 
  getSmsDirectUrl,
  defaultNotificationSettings
} from './utils/notifications';

import { KioskView } from './components/KioskView';
import { DisplayView } from './components/DisplayView';
import { StaffView } from './components/StaffView';
import { TrackerView } from './components/TrackerView';
import { SearchView } from './components/SearchView';
import { AdminView } from './components/AdminView';
import { CustomerFeedbackView } from './components/CustomerFeedbackView';
import { ExecutiveWallboardView } from './components/ExecutiveWallboardView';
import { AppointmentBookingView } from './components/AppointmentBookingView';
import { ThermalTicketPrint } from './components/ThermalTicketPrint';
import { 
  subscribeToFirebaseSync, 
  pushStateToFirebase, 
  runQueueTransaction,
  getPublicTracker,
  subscribePublicTracker,
  publishPublicTracker,
  PublicTrackerSnapshot,
  FirebaseConnectionStatus 
} from './services/firebaseService';

import { 
  Ticket as TicketIcon, Tv, UserCheck, Smartphone, Search, 
  Settings, Sun, Moon, Sparkles, Building2, Cloud, CloudOff, HeartHandshake, Activity, CalendarCheck,
  MessageCircle, Send, Check, BellRing, X as CloseIcon, ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  const [appState, setAppState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultInitialState, ...parsed, settings: { ...defaultInitialState.settings, ...parsed.settings } };
      }
    } catch (e) {
      console.warn('Storage parse error:', e);
    }
    return defaultInitialState;
  });

  const [activeView, setActiveView] = useState<ActiveView>('kiosk');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [currentCounterId, setCurrentCounterId] = useState('c1');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [publicTracker, setPublicTracker] = useState<PublicTrackerSnapshot | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [printTicketData, setPrintTicketData] = useState<Ticket | null>(null);

  // Live Notification Dispatch Toast State
  const [notificationToast, setNotificationToast] = useState<{
    id: string;
    title: string;
    message: string;
    channel: 'whatsapp' | 'sms';
    phone: string;
    ticketCode: string;
  } | null>(null);

  const triggerNotificationToast = (params: {
    title: string;
    message: string;
    channel: 'whatsapp' | 'sms';
    phone: string;
    ticketCode: string;
  }) => {
    setNotificationToast({
      id: 'toast_' + Date.now(),
      ...params,
    });
    setTimeout(() => {
      setNotificationToast((cur) => (cur?.phone === params.phone && cur?.ticketCode === params.ticketCode ? null : cur));
    }, 6000);
  };
  
  // وضع عزل المراجع عند مسح الباركود بهاتفه لحماية لوحة الموظف والمدير
  const [isCustomerIsolated, setIsCustomerIsolated] = useState(false);

  // حالة الاتصال والمزامنة السحابية مع Firebase
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseConnectionStatus>({
    connected: false,
    type: 'none',
    status: 'idle',
    message: 'المزامنة السحابية غير مفعلة',
  });

  // مؤشر لمنع حلقة المزامنة (feedback loop) عندما يأتي التحديث من السحابة
  const isIncomingRemoteUpdate = useRef(false);

  // مزامنة حالة التخزين المحلي والدفع إلى السحابة
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (e) {
      console.error('Storage save error:', e);
    }

    // إذا كان التغيير محلياً وليس قادماً من السحابة، ندفعه فوراً إلى Firebase
    if (isIncomingRemoteUpdate.current) {
      isIncomingRemoteUpdate.current = false;
      return;
    }

    if (appState.settings.firebaseConfigStr?.trim()) {
      pushStateToFirebase(appState).catch((err) => {
        console.warn('Firebase push sync warning:', err);
      });
    }
  }, [appState]);

  // الاشتراك بالمزامنة السحابية الحية (Live Real-Time Sync عبر Firebase)
  useEffect(() => {
    const configStr = appState.settings.firebaseConfigStr;
    if (!configStr || !configStr.trim()) {
      setFirebaseStatus({
        connected: false,
        type: 'none',
        status: 'idle',
        message: 'المزامنة السحابية غير مفعلة (وضع المحاكاة المحلي)',
      });
      return;
    }

    // بدء الاشتراك السحابي
    const unsubscribe = subscribeToFirebaseSync(
      configStr,
      (remoteState) => {
        isIncomingRemoteUpdate.current = true;
        setAppState((prevState) => {
          // دمج ذكي: التذاكر والمكاتب وآخر استدعاء تأتي لحظياً من السحابة
          // مع الحفاظ على إعدادات المزامنة المحلية
          return {
            ...prevState,
            tickets: remoteState.tickets || prevState.tickets,
            counters: remoteState.counters || prevState.counters,
            services: remoteState.services || prevState.services,
            feedbacks: remoteState.feedbacks || prevState.feedbacks,
            lastCalled: remoteState.lastCalled !== undefined ? remoteState.lastCalled : prevState.lastCalled,
            settings: {
              ...prevState.settings,
              ...remoteState.settings,
              firebaseConfigStr: prevState.settings.firebaseConfigStr, // الحفاظ على بيانات الدخول المحلية
            },
          };
        });
      },
      (status) => {
        setFirebaseStatus(status);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [appState.settings.firebaseConfigStr]);

  // QR tracking uses an opaque token and a sanitized public read model.
  useEffect(() => {
    const trackToken = new URLSearchParams(window.location.search).get('track');
    if (!trackToken) return;

    setIsCustomerIsolated(true);
    setActiveView('tracker');
    setPublicTracker(null);

    const localTicket = appState.tickets.find((t) => t.publicTrackToken === trackToken);
    if (localTicket) setSelectedTicketId(localTicket.id);

    const config = appState.settings.firebaseConfigStr?.trim();
    if (!config) return;

    const unsubscribe = subscribePublicTracker(config, trackToken, (snapshot) => {
      setPublicTracker(snapshot);
    });

    // Initial read also handles providers that briefly miss the first listener event.
    getPublicTracker(config, trackToken).then((snapshot) => {
      if (snapshot) setPublicTracker(snapshot);
    });

    return () => unsubscribe();
  }, [appState.settings.firebaseConfigStr, appState.tickets]);

  // تطبيق الثيم والألوان والخطوط الديناميكية
  useEffect(() => {
    const theme = appState.settings.theme;
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-accent', theme.accent);
    root.style.setProperty('--theme-bg', theme.bg);
    root.style.setProperty('--theme-card', theme.card);
    root.style.setProperty('--theme-text', theme.textColor || (isDarkMode ? '#f8fafc' : '#0f172a'));
    root.style.setProperty('--theme-card-text', theme.cardTextColor || (isDarkMode ? '#f1f5f9' : '#1e293b'));
    root.style.setProperty('--theme-button-text', theme.buttonTextColor || '#ffffff');
    root.style.setProperty('--theme-font-family', `'${theme.fontFamily || 'Tajawal'}', system-ui, sans-serif`);
    
    // مقياس حجم الخط
    const scale = theme.fontSize === 'lg' ? '1.08rem' : theme.fontSize === 'sm' ? '0.94rem' : '1rem';
    root.style.setProperty('--theme-font-scale', scale);

    // سُمك الخط
    const weightMap: Record<string, string> = {
      normal: '400',
      medium: '500',
      bold: '700',
      extrabold: '800'
    };
    root.style.setProperty('--theme-font-weight', weightMap[theme.fontWeight || 'bold'] || '700');

    // دعم رابط خط خارجي مخصص إذا تم إدخاله
    if (appState.settings.customFontUrl) {
      let customLink = document.getElementById('custom-font-link') as HTMLLinkElement | null;
      if (!customLink) {
        customLink = document.createElement('link');
        customLink.id = 'custom-font-link';
        customLink.rel = 'stylesheet';
        document.head.appendChild(customLink);
      }
      customLink.href = appState.settings.customFontUrl;
    }

    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [appState.settings.theme, appState.settings.customFontUrl, isDarkMode]);

  // إصدار تذكرة جديدة. عند تفعيل Firebase تتم العملية داخل transaction ذرّية
  // حتى لا تصدر جهازان نفس الرقم أو يكتب أحدهما فوق تعديل الجهاز الآخر.
  const handleIssueTicket = async (
    serviceId: string,
    name: string,
    phone: string,
    nationalId: string,
    isPriority: boolean,
    customData?: Record<string, string>
  ): Promise<Ticket | null> => {
    const service = appState.services.find((s) => s.id === serviceId);
    if (!service) return null;

    const notifSettings = appState.settings.notificationSettings || defaultNotificationSettings;
    const ticketId = crypto.randomUUID();
    const publicTrackToken = crypto.randomUUID();
    const now = Date.now();

    const mutate = (state: AppState): AppState => {
      const targetService = state.services.find((s) => s.id === serviceId) || service;
      const prefixBase = parseInt(targetService.prefix, 10) || 1;
      const seriesBase = prefixBase * 100;
      const existingSeqNumbers = state.tickets
        .filter((t) => t.serviceId === serviceId)
        .map((t) => parseInt(t.code, 10) - seriesBase)
        .filter((n) => Number.isFinite(n) && n > 0);
      const nextSeq = (existingSeqNumbers.length ? Math.max(...existingSeqNumbers) : 0) + 1;
      const numericCode = String(seriesBase + nextSeq);
      const isWelcomeEnabled = Boolean(notifSettings.enabled && notifSettings.sendOnTicketIssue && phone.trim());

      const newTicket: Ticket = {
        id: ticketId,
        code: numericCode,
        serviceId: targetService.id,
        serviceName: targetService.name,
        customerName: name,
        phone,
        nationalId,
        isPriority,
        status: 'waiting',
        counterId: null,
        counterName: null,
        createdAt: now,
        calledAt: null,
        completedAt: null,
        publicTrackToken,
        customData: customData && Object.keys(customData).length > 0 ? customData : undefined,
        notificationsSent: { issued: isWelcomeEnabled, approaching: false, called: false, manualCount: 0 },
      };
      return {
        ...state,
        tickets: [...state.tickets, newTicket],
      };
    };

    const cloudConfig = appState.settings.firebaseConfigStr?.trim();
    let committed: AppState | null = null;
    if (cloudConfig) committed = await runQueueTransaction(cloudConfig, mutate);

    if (cloudConfig && !committed) {
      alert('تعذر حفظ التذكرة على الخادم. لم يتم إنشاء تذكرة محلية لتجنب اختلاف الأجهزة.');
      return null;
    }
    const finalState = committed || mutate(appState);
    const newTicket = finalState.tickets.find((t) => t.id === ticketId) || null;
    if (!newTicket) return null;

    if (committed) {
      isIncomingRemoteUpdate.current = true;
      setAppState((prev) => ({
        ...prev,
        ...finalState,
        settings: { ...prev.settings, ...finalState.settings, firebaseConfigStr: prev.settings.firebaseConfigStr },
      }));
    } else {
      setAppState((prev) => mutate(prev));
    }

    if (cloudConfig) {
      const published = await publishPublicTracker(cloudConfig, finalState, newTicket);
      if (!published) console.warn('Ticket created but public QR tracker could not be published yet.');
    }

    if (newTicket.notificationsSent?.issued) {
      const channel = notifSettings.defaultChannel === 'both' ? 'whatsapp' : notifSettings.defaultChannel;
      const welcomeMsg = composeNotificationMessage('ticket_issued', newTicket, appState.settings);
      triggerNotificationToast({
        title: 'رسالة ترحيبية مع رابط التتبع 📲',
        message: welcomeMsg,
        channel,
        phone: newTicket.phone,
        ticketCode: newTicket.code,
      });
    }

    try { confetti({ particleCount: 35, spread: 60, origin: { y: 0.8 } }); } catch { /* ignore */ }
    return newTicket;
  };

  // تسجيل حضور بموعد مسبق وتحويله فوراً إلى تذكرة طابور ذات أولوية
  const handleCheckInAppointment = (appointment: any): Ticket | null => {
    const service = appState.services.find((s) => s.id === appointment.serviceId) || appState.services[0];
    if (!service) return null;

    const serviceTickets = appState.tickets.filter((t) => t.serviceId === service.id);
    const usedNumbers = serviceTickets
      .map((t) => {
        const match = String(t.code).match(/(\d+)$/);
        return match ? Number(match[1]) : 0;
      })
      .filter(Number.isFinite);
    const nextNum = (usedNumbers.length ? Math.max(...usedNumbers) : 0) + 1;
    const numericCode = `${service.prefix}${String(nextNum).padStart(2, '0')}`;

    const newTicket: Ticket = {
      id: crypto.randomUUID(),
      code: numericCode,
      serviceId: service.id,
      serviceName: service.name,
      customerName: appointment.customerName,
      phone: appointment.phone,
      nationalId: appointment.nationalId,
      isPriority: true, // أولوية سريعة لحاملي المواعيد المسبقة
      isAppointment: true,
      appointmentCode: appointment.code,
      status: 'waiting',
      counterId: null,
      counterName: null,
      createdAt: Date.now(),
      calledAt: null,
      completedAt: null,
      publicTrackToken: crypto.randomUUID(),
    };

    setAppState((prev) => {
      const updatedAppointments = (prev.appointments || []).map((a) =>
        a.id === appointment.id
          ? {
              ...a,
              status: 'checked_in' as const,
              ticketId: newTicket.id,
              ticketCode: newTicket.code,
              checkedInAt: Date.now(),
            }
          : a
      );
      return {
        ...prev,
        tickets: [...prev.tickets, newTicket],
        appointments: updatedAppointments,
      };
    });

    try {
      confetti({
        particleCount: 45,
        spread: 70,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }

    return newTicket;
  };

  // إدارة المواعيد: حفظ، تعديل، إلغاء، حذف
  const handleSaveAppointment = (newApt: any) => {
    setAppState((prev) => {
      const existing = prev.appointments || [];
      const index = existing.findIndex((a) => a.id === newApt.id);
      let updated: any[];
      if (index >= 0) {
        updated = [...existing];
        updated[index] = newApt;
      } else {
        updated = [newApt, ...existing];
      }
      return { ...prev, appointments: updated };
    });
  };

  const handleCancelAppointment = (appointmentId: string) => {
    setAppState((prev) => ({
      ...prev,
      appointments: (prev.appointments || []).map((a) =>
        a.id === appointmentId ? { ...a, status: 'cancelled' as const } : a
      ),
    }));
  };

  const handleDeleteAppointment = (appointmentId: string) => {
    setAppState((prev) => ({
      ...prev,
      appointments: (prev.appointments || []).filter((a) => a.id !== appointmentId),
    }));
  };

  // تسجيل الإشعارات الصادرة (واتساب / SMS) يدوياً أو آلياً
  const handleLogNotification = (params: {
    ticket: Ticket;
    channel: 'whatsapp' | 'sms';
    trigger: NotificationTrigger;
    messageText: string;
    counterName?: string;
  }) => {
    const newLog: NotificationLog = {
      id: 'notif_' + Date.now(),
      ticketId: params.ticket.id,
      ticketCode: params.ticket.code,
      customerName: params.ticket.customerName,
      phone: params.ticket.phone,
      channel: params.channel,
      trigger: params.trigger,
      messageText: params.messageText,
      counterName: params.counterName,
      status: 'delivered',
      timestamp: Date.now(),
    };

    setAppState((prev) => {
      const updatedTickets = prev.tickets.map((t) => {
        if (t.id === params.ticket.id) {
          const currentSent = t.notificationsSent || { issued: false, approaching: false, called: false, manualCount: 0 };
          return {
            ...t,
            notificationsSent: {
              ...currentSent,
              manualCount: (currentSent.manualCount || 0) + 1,
              called: params.trigger === 'ticket_called' ? true : currentSent.called,
              approaching: params.trigger === 'turn_approaching' ? true : currentSent.approaching,
              issued: params.trigger === 'ticket_issued' ? true : currentSent.issued,
            },
          };
        }
        return t;
      });

      return {
        ...prev,
        tickets: updatedTickets,
        notificationLogs: [newLog, ...(prev.notificationLogs || [])],
      };
    });

    triggerNotificationToast({
      title: params.channel === 'whatsapp' ? 'تم إرسال إشعار واتساب بنجاح 🟢' : 'تم إرسال رسالة SMS بنجاح 💬',
      message: params.messageText,
      channel: params.channel,
      phone: params.ticket.phone,
      ticketCode: params.ticket.code,
    });
  };

  const handleClearNotificationLogs = () => {
    if (window.confirm('هل أنت متأكد من مسح جميع سجلات الإشعارات وتنبيهات الواتساب؟')) {
      setAppState((prev) => ({
        ...prev,
        notificationLogs: [],
      }));
    }
  };

  // شباك الموظف: استدعاء التالي. اختيار وإسناد التذكرة يتمان ذرياً على السحابة.
  const handleCallNext = async () => {
    const counter = appState.counters.find((c) => c.id === currentCounterId);
    if (!counter) return;
    const config = appState.settings.firebaseConfigStr?.trim();

    const mutate = (state: AppState): AppState => {
      const liveCounter = state.counters.find((c) => c.id === counter.id);
      if (!liveCounter) return state;
      let tickets = state.tickets.map((t) =>
        t.id === liveCounter.activeTicketId ? { ...t, status: 'completed' as const, completedAt: Date.now() } : t
      );
      const waiting = tickets.filter((t) => t.status === 'waiting');
      if (!waiting.length) {
        return {
          ...state,
          tickets,
          counters: state.counters.map((c) =>
            c.id === liveCounter.id ? { ...c, activeTicketId: null } : c
          ),
        };
      }
      const available = waiting.filter((t) => !t.assignedCounterId || t.assignedCounterId === liveCounter.id);
      const pool = available.length ? available : waiting;
      pool.sort((a, b) => {
        const aa = a.assignedCounterId === liveCounter.id ? 1 : 0;
        const bb = b.assignedCounterId === liveCounter.id ? 1 : 0;
        if (aa !== bb) return bb - aa;
        if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
        return a.createdAt - b.createdAt;
      });
      const next = pool[0];
      const now = Date.now();
      tickets = tickets.map((t) => t.id === next.id ? {
        ...t, status: 'serving' as const, counterId: liveCounter.id, counterName: liveCounter.name,
        calledAt: now, assignedCounterId: null,
      } : t);
      return {
        ...state,
        tickets,
        counters: state.counters.map((c) => c.id === liveCounter.id ? { ...c, activeTicketId: next.id } : c),
        lastCalled: { ticketCode: next.code, counterName: liveCounter.name, serviceName: next.serviceName, timestamp: now },
      };
    };

    const committed = config ? await runQueueTransaction(config, mutate) : null;
    if (config && !committed) {
      alert('تعذر تنفيذ الاستدعاء على الخادم. أعد المحاولة بعد التحقق من الاتصال والصلاحيات.');
      return;
    }
    const nextState = committed || mutate(appState);
    const activeAfter = nextState.counters.find((c) => c.id === counter.id)?.activeTicketId;
    const nextTicket = activeAfter ? nextState.tickets.find((t) => t.id === activeAfter) : null;
    if (!nextTicket) {
      alert('لا يوجد مراجعين في قائمة الانتظار حالياً.');
      return;
    }

    if (committed) {
      isIncomingRemoteUpdate.current = true;
      setAppState((prev) => ({ ...prev, ...committed, settings: { ...prev.settings, ...committed.settings, firebaseConfigStr: prev.settings.firebaseConfigStr } }));
    } else {
      setAppState((prev) => mutate(prev));
    }

    if (config) {
      const changedTickets = nextState.tickets.filter((t) =>
        t.id === nextTicket.id || (counter.activeTicketId && t.id === counter.activeTicketId)
      );
      await Promise.all(changedTickets.map((t) => publishPublicTracker(config, nextState, t)));
    }

    const notifSettings = appState.settings.notificationSettings || defaultNotificationSettings;
    if (notifSettings.enabled && notifSettings.sendOnTicketCalled && nextTicket.phone?.trim()) {
      const channel = notifSettings.defaultChannel === 'both' ? 'whatsapp' : notifSettings.defaultChannel;
      const callMsg = composeNotificationMessage('ticket_called', nextTicket, appState.settings, { counterName: counter.name });
      triggerNotificationToast({ title: `إشعار استدعاء التذكرة #${nextTicket.code} إلى ${counter.name} 🔔`, message: callMsg, channel, phone: nextTicket.phone, ticketCode: nextTicket.code });
    }
    announceTicketCall(nextTicket.code, counter.name, appState.settings.announcementVoiceSpeed);
  };

  // إعادة النداء
  const handleRecall = () => {
    const counter = appState.counters.find((c) => c.id === currentCounterId);
    if (!counter || !counter.activeTicketId) return;

    const activeTicket = appState.tickets.find((t) => t.id === counter.activeTicketId);
    if (!activeTicket) return;

    setAppState((prev) => ({
      ...prev,
      lastCalled: {
        ticketCode: activeTicket.code,
        counterName: counter.name,
        serviceName: activeTicket.serviceName,
        timestamp: Date.now(),
      },
    }));

    announceTicketCall(activeTicket.code, counter.name, appState.settings.announcementVoiceSpeed);
  };

  // إنهاء خدمة التذكرة — transaction ذرّية عند العمل السحابي.
  const handleComplete = async () => {
    const counter = appState.counters.find((c) => c.id === currentCounterId);
    if (!counter || !counter.activeTicketId) return;
    const config = appState.settings.firebaseConfigStr?.trim();

    const mutate = (state: AppState): AppState => {
      const liveCounter = state.counters.find((c) => c.id === counter.id);
      if (!liveCounter?.activeTicketId) return state;
      return {
        ...state,
        tickets: state.tickets.map((t) =>
          t.id === liveCounter.activeTicketId ? { ...t, status: 'completed' as const, completedAt: Date.now() } : t
        ),
        counters: state.counters.map((c) => c.id === liveCounter.id ? { ...c, activeTicketId: null } : c),
      };
    };

    const committed = config ? await runQueueTransaction(config, mutate) : null;
    if (config && !committed) {
      alert('تعذر إنهاء الخدمة على الخادم. لم يتم تغيير الحالة محلياً.');
      return;
    }
    if (committed) {
      isIncomingRemoteUpdate.current = true;
      setAppState((prev) => ({ ...prev, ...committed, settings: { ...prev.settings, ...committed.settings, firebaseConfigStr: prev.settings.firebaseConfigStr } }));
    } else {
      setAppState((prev) => mutate(prev));
    }
    if (config) {
      const ticket = committed?.tickets.find((t) => t.id === counter.activeTicketId);
      if (ticket) await publishPublicTracker(config, committed as AppState, ticket);
    }
  };

  // تحويل التذكرة الذكي — تتم العملية كاملة داخل transaction عند توفر Firebase.
  const handleTransfer = async (params: {
    targetServiceId: string;
    targetCounterId?: string | null;
    priorityMode: 'top_priority' | 'normal';
    reason: string;
    note?: string;
  }) => {
    const counter = appState.counters.find((c) => c.id === currentCounterId);
    if (!counter || !counter.activeTicketId) return;
    const targetService = appState.services.find((s) => s.id === params.targetServiceId);
    if (!targetService) return;
    const config = appState.settings.firebaseConfigStr?.trim();
    const transferId = crypto.randomUUID();
    const transferTime = Date.now();

    const mutate = (state: AppState): AppState => {
      const liveCounter = state.counters.find((c) => c.id === counter.id);
      const activeTicket = liveCounter?.activeTicketId ? state.tickets.find((t) => t.id === liveCounter.activeTicketId) : null;
      const service = state.services.find((s) => s.id === params.targetServiceId);
      if (!liveCounter || !activeTicket || !service) return state;
      const targetCounter = params.targetCounterId ? state.counters.find((c) => c.id === params.targetCounterId) : null;
      const transferLog: TicketTransferLog = {
        id: transferId, fromCounterId: liveCounter.id, fromCounterName: liveCounter.name,
        toServiceId: service.id, toServiceName: service.name,
        toCounterId: targetCounter?.id || null, toCounterName: targetCounter?.name || null,
        priorityMode: params.priorityMode, reason: params.reason, note: params.note, transferredAt: transferTime,
      };
      return {
        ...state,
        tickets: state.tickets.map((t) => t.id === activeTicket.id ? {
          ...t, status: 'waiting' as const, serviceId: service.id, serviceName: service.name,
          counterId: null, counterName: null, assignedCounterId: targetCounter?.id || null,
          isTransferred: true, isPriority: params.priorityMode === 'top_priority' ? true : t.isPriority,
          transferHistory: [...(t.transferHistory || []), transferLog],
        } : t),
        counters: state.counters.map((c) => c.id === liveCounter.id ? { ...c, activeTicketId: null } : c),
      };
    };

    const committed = config ? await runQueueTransaction(config, mutate) : null;
    if (config && !committed) {
      alert('تعذر تحويل التذكرة على الخادم. لم يتم تغيير الحالة محلياً.');
      return;
    }
    if (committed) {
      isIncomingRemoteUpdate.current = true;
      setAppState((prev) => ({ ...prev, ...committed, settings: { ...prev.settings, ...committed.settings, firebaseConfigStr: prev.settings.firebaseConfigStr } }));
    } else {
      setAppState((prev) => mutate(prev));
    }
    if (config && committed) {
      const ticket = committed.tickets.find((t) => t.id === counter.activeTicketId);
      if (ticket) await publishPublicTracker(config, committed, ticket);
    }
  };

  // تسجيل تقييم واستطلاع رضا المراجع
  const handleSaveFeedback = (feedback: TicketFeedback) => {
    setAppState((prev) => {
      const existingIdx = (prev.feedbacks || []).findIndex((f) => f.ticketId === feedback.ticketId);
      let updatedFeedbacks: TicketFeedback[];
      if (existingIdx >= 0) {
        updatedFeedbacks = [...(prev.feedbacks || [])];
        updatedFeedbacks[existingIdx] = feedback;
      } else {
        updatedFeedbacks = [...(prev.feedbacks || []), feedback];
      }

      const updatedTickets = prev.tickets.map((t) =>
        t.id === feedback.ticketId || t.code === feedback.ticketCode
          ? { ...t, feedback }
          : t
      );

      return {
        ...prev,
        tickets: updatedTickets,
        feedbacks: updatedFeedbacks,
      };
    });
  };

  // طباعة الإيصال الحراري
  const handlePrintThermal = (ticket: Ticket) => {
    setPrintTicketData(ticket);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const waitingCountByService = (serviceId: string) =>
    appState.tickets.filter((t) => t.status === 'waiting' && t.serviceId === serviceId).length;

  if (activeView === 'wallboard') {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{
          fontFamily: `'${appState.settings.theme.fontFamily || 'Tajawal'}', system-ui, sans-serif`,
        }}
      >
        <ExecutiveWallboardView
          appState={appState}
          onUpdateSettings={(newSettings) =>
            setAppState((prev) => ({ ...prev, settings: newSettings }))
          }
          onClose={() => setActiveView('admin')}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-200"
      style={{
        backgroundColor: appState.settings.theme.bg,
        color: appState.settings.theme.textColor || (isDarkMode ? '#f8fafc' : '#0f172a'),
        fontFamily: `'${appState.settings.theme.fontFamily || 'Tajawal'}', system-ui, sans-serif`,
      }}
    >
      {/* Header & Navigation */}
      <header className="no-print sticky top-0 z-40 bg-white/95 dark:bg-slate-800/95 backdrop-blur border-b border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {appState.settings.logoUrl ? (
              <img
                src={appState.settings.logoUrl}
                alt={appState.settings.orgName}
                className="w-10 h-10 rounded-xl object-contain shadow-md shrink-0 bg-white dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white font-black text-xl shadow-md shrink-0"
                style={{ 
                  backgroundColor: appState.settings.theme.primary,
                  color: appState.settings.theme.buttonTextColor || '#ffffff' 
                }}
              >
                <Building2 className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white leading-none">
                {appState.settings.orgName}
              </h1>
              <span 
                className="text-xs font-semibold"
                style={{ color: appState.settings.theme.primary }}
              >
                {appState.settings.branchName}
              </span>
            </div>

            {/* وضع العزل للمراجع أو وضع الإدارة */}
            <div className="mr-2">
              {isCustomerIsolated ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  شاشة المراجع (تتبع مباشر)
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  نظام سحابي ذكي نشط
                </span>
              )}
            </div>
          </div>

          {/* Nav Tabs (مخفية في حال عزل المراجع لمنع التلاعب) */}
          {!isCustomerIsolated ? (
            <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveView('kiosk')}
                style={activeView === 'kiosk' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'kiosk' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <TicketIcon className="w-3.5 h-3.5" /> كشك التذاكر
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveView('display');
                  setAudioEnabled(true);
                  playChimeSound();
                }}
                style={activeView === 'display' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'display' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Tv className="w-3.5 h-3.5" /> شاشة العرض
              </button>

              <button
                type="button"
                onClick={() => setActiveView('staff')}
                style={activeView === 'staff' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'staff' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" /> شباك الموظف
              </button>

              <button
                type="button"
                onClick={() => setActiveView('tracker')}
                style={activeView === 'tracker' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'tracker' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> تتبع التذكرة
              </button>

              <button
                type="button"
                onClick={() => setActiveView('search')}
                style={activeView === 'search' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'search' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Search className="w-3.5 h-3.5" /> استعلام
              </button>

              <button
                type="button"
                onClick={() => setActiveView('feedback')}
                style={activeView === 'feedback' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'feedback' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5 text-amber-500" /> تقييم الخدمة
              </button>

              <button
                type="button"
                onClick={() => setActiveView('appointments')}
                style={activeView === 'appointments' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'appointments' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5 text-indigo-500" /> حجز موعد مسبق
              </button>

              <button
                type="button"
                onClick={() => setActiveView('wallboard')}
                style={activeView === 'wallboard' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'wallboard' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-emerald-500" /> غرفة العمليات (Wallboard)
              </button>

              <button
                type="button"
                onClick={() => setActiveView('admin')}
                style={activeView === 'admin' ? { backgroundColor: appState.settings.theme.primary, color: appState.settings.theme.buttonTextColor || '#ffffff' } : undefined}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'admin' ? 'shadow-xs font-black' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Settings className="w-3.5 h-3.5" /> الإدارة
              </button>
            </nav>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCustomerIsolated(false)}
                className="text-xs font-bold text-slate-400 hover:text-brand-600 underline"
              >
                العودة للوحة الإدارة
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* مؤشر حالة المزامنة السحابية الحية */}
            {appState.settings.firebaseConfigStr?.trim() && (
              <div 
                title={firebaseStatus.message || (firebaseStatus.connected ? 'المزامنة السحابية متصلة ونشطة' : 'جاري الاتصال بالسحابة...')}
                className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                  firebaseStatus.connected 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' 
                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                }`}
              >
                {firebaseStatus.connected ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                    <span>سحابي متصل</span>
                  </>
                ) : (
                  <>
                    <CloudOff className="w-3.5 h-3.5 text-amber-500" />
                    <span>جاري الربط...</span>
                  </>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 flex items-center justify-center transition shadow-xs cursor-pointer"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 max-w-7xl w-full mx-auto">
        {activeView === 'kiosk' && (
          <KioskView
            services={appState.services}
            ticketPrint={appState.settings.ticketPrint}
            intakeForm={appState.settings.intakeForm}
            appointmentSettings={appState.settings.appointmentSettings}
            onIssueTicket={handleIssueTicket}
            onOpenTracker={(ticketId) => {
              setSelectedTicketId(ticketId);
              setActiveView('tracker');
            }}
            onPrintThermal={handlePrintThermal}
            waitingCountByService={waitingCountByService}
            appointments={appState.appointments}
            onCheckInAppointment={handleCheckInAppointment}
            onNavigateToBooking={() => setActiveView('appointments')}
          />
        )}

        {activeView === 'display' && (
          <DisplayView
            appState={appState}
            onEnableAudio={() => setAudioEnabled(true)}
            audioEnabled={audioEnabled}
          />
        )}

        {activeView === 'staff' && (
          <StaffView
            appState={appState}
            currentCounterId={currentCounterId}
            onChangeCounter={setCurrentCounterId}
            onCallNext={handleCallNext}
            onRecall={handleRecall}
            onComplete={handleComplete}
            onTransfer={handleTransfer}
            onLogNotification={handleLogNotification}
          />
        )}

        {activeView === 'tracker' && (
          <TrackerView
            appState={appState}
            selectedTicketId={selectedTicketId}
            publicTracker={publicTracker}
            onTrackCode={(code) => setSelectedTicketId(code)}
            onPrintThermal={handlePrintThermal}
            onSaveFeedback={handleSaveFeedback}
            isCustomerIsolated={isCustomerIsolated}
          />
        )}

        {activeView === 'search' && (
          <SearchView
            appState={appState}
            onSelectTicketToTrack={(code) => {
              setSelectedTicketId(code);
              setActiveView('tracker');
            }}
          />
        )}

        {activeView === 'feedback' && (
          <CustomerFeedbackView
            appState={appState}
            onSaveFeedback={handleSaveFeedback}
            onBackToKiosk={() => setActiveView('kiosk')}
          />
        )}

        {activeView === 'appointments' && (
          <AppointmentBookingView
            appState={appState}
            onSaveAppointment={handleSaveAppointment}
            onCancelAppointment={handleCancelAppointment}
            onBackToKiosk={() => setActiveView('kiosk')}
          />
        )}

        {activeView === 'admin' && (
          <AdminView
            appState={appState}
            onUpdateSettings={(newSettings) =>
              setAppState((prev) => ({ ...prev, settings: newSettings }))
            }
            onAddService={(serviceData) => {
              const newS: Service = {
                id: 's_' + Date.now(),
                ...serviceData,
              };
              setAppState((prev) => ({ ...prev, services: [...prev.services, newS] }));
            }}
            onDeleteService={(id) =>
              setAppState((prev) => ({ ...prev, services: prev.services.filter((s) => s.id !== id) }))
            }
            onAddCounter={(counterData) => {
              const newC: Counter = {
                id: 'c_' + Date.now(),
                ...counterData,
              };
              setAppState((prev) => ({ ...prev, counters: [...prev.counters, newC] }));
            }}
            onDeleteCounter={(id) =>
              setAppState((prev) => ({ ...prev, counters: prev.counters.filter((c) => c.id !== id) }))
            }
            onResetDayData={() => {
              if (confirm('هل أنت متأكد من تصفير سجلات وتذاكر اليوم؟')) {
                setAppState((prev) => ({
                  ...prev,
                  tickets: [],
                  counters: prev.counters.map((c) => ({ ...c, activeTicketId: null })),
                  lastCalled: null,
                }));
                setSelectedTicketId(null);
                alert('تم تصفير سجلات اليوم بنجاح.');
              }
            }}
            onOpenWallboard={() => setActiveView('wallboard')}
            onSaveAppointment={handleSaveAppointment}
            onCancelAppointment={handleCancelAppointment}
            onDeleteAppointment={handleDeleteAppointment}
            onCheckInAppointment={handleCheckInAppointment}
            onClearNotificationLogs={handleClearNotificationLogs}
            onExportExcel={() => {
              // تصدير ملف CSV / Excel متوافق ومباشر مع الحقول المخصصة
              const customFields = appState.settings.intakeForm?.customFields || [];
              const headers = [
                'رقم التذكرة',
                'الخدمة',
                'اسم المراجع',
                'رقم الجوال',
                'رقم الهوية',
                'الأولوية',
                'الحالة',
                'المكتب',
                'محولة؟',
                'تاريخ وأسباب التحويل',
                'وقت الإصدار',
                ...customFields.map((f) => f.label),
              ];
              const rows = appState.tickets.map((t) => [
                t.code,
                `"${t.serviceName.replace(/"/g, '""')}"`,
                `"${t.customerName.replace(/"/g, '""')}"`,
                `"${t.phone}"`,
                `"${t.nationalId}"`,
                t.isPriority ? 'VIP' : 'عادي',
                t.status,
                t.counterName || '-',
                t.isTransferred ? 'نعم (محولة)' : 'لا',
                `"${(t.transferHistory || []).map((h) => `${h.fromCounterName}➔${h.toServiceName}: ${h.reason}`).join(' | ').replace(/"/g, '""')}"`,
                new Date(t.createdAt).toLocaleString('ar-SA'),
                ...customFields.map((f) => `"${(t.customData?.[f.id] || '').replace(/"/g, '""')}"`),
              ]);
              const csvContent =
                'data:text/csv;charset=utf-8,\uFEFF' +
                [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement('a');
              link.setAttribute('href', encodedUri);
              link.setAttribute('download', `سجلات_الانتظار_${new Date().toISOString().slice(0, 10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          />
        )}
      </main>

      {/* Hidden Print Thermal Receipt Template */}
      <ThermalTicketPrint
        ticket={
          printTicketData ||
          (selectedTicketId
            ? appState.tickets.find((t) => t.id === selectedTicketId || t.code === selectedTicketId) || null
            : null)
        }
        settings={appState.settings}
        aheadCount={
          printTicketData
            ? appState.tickets.filter(
                (t) => t.status === 'waiting' && t.serviceId === printTicketData.serviceId && t.createdAt < printTicketData.createdAt
              ).length
            : 0
        }
      />

      {/* Floating Live Notification Toast */}
      {notificationToast && (
        <div className="fixed top-20 right-4 sm:right-8 z-50 max-w-md w-full animate-bounce-in" dir="rtl">
          <div className="bg-slate-900/95 text-white p-4 rounded-3xl shadow-2xl border border-emerald-500/40 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/30">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-400">
                    {notificationToast.title}
                  </h4>
                  <p className="text-[11px] text-slate-300 font-mono num-latin">
                    إلى: {notificationToast.phone} • تذكرة: #{notificationToast.ticketCode}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setNotificationToast(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-2.5 p-2.5 rounded-xl bg-slate-800/90 text-[11px] text-slate-200 border border-slate-700/60 leading-relaxed font-sans line-clamp-3">
              {notificationToast.message}
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[10px]">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Check className="w-3 h-3" /> تم الإرسال والتسجيل في النظام
              </span>
              {notificationToast.channel === 'whatsapp' && (
                <a
                  href={getWhatsAppDirectUrl(notificationToast.phone, notificationToast.message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition shadow-xs"
                >
                  <span>فتح في واتساب</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
