import { AppState, Counter, Service, Ticket, TicketFeedback } from './types';
import { defaultNotificationSettings, initialDemoNotificationLogs } from './utils/notifications';

export const STORAGE_KEY = 'smart_queue_system_react_v2';

export const defaultInitialState: AppState = {
  settings: {
    orgName: 'نظام الانتظار السحابي الذكي',
    branchName: 'الفرع الرئيسي الذكي',
    congestionLimit: 12,
    youtubeUrl: '',
    marqueeText: 'أهلاً بكم في صالتنا الذكية • نسعد بخدمتكم وتوفير تجربة انتظار مريحة • يرجى متابعة شاشات العرض للتوجه للشباك فور النداء',
    customFontUrl: '',
    printFooter: 'شكراً لزيارتكم - نتمنى لكم يوماً سعيداً ودمتم بخير',
    firebaseConfigStr: '',
    theme: {
      primary: '#0d9488',
      accent: '#14b8a6',
      bg: '#0f172a',
      card: '#1e293b',
      textColor: '#0f172a',
      cardTextColor: '#1e293b',
      buttonTextColor: '#ffffff',
      fontFamily: 'Tajawal',
      fontWeight: 'bold',
      fontSize: 'md'
    },
    ticketPrint: {
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
      fontSizeScale: 'medium'
    },
    intakeForm: {
      nameField: 'required',
      phoneField: 'required',
      nationalIdField: 'required',
      enablePriorityToggle: true,
      customFields: [],
      instructionNotice: 'يرجى تعبئة بيانات المراجع بدقة لتسهيل الخدمة واستلام إشعار الدور'
    },
    feedbackSettings: {
      enabled: true,
      promptTitle: 'رأيكم يهمنا لتطوير جودة الخدمة وقياس الرضا',
      allowComments: true,
      lowRatingAlertThreshold: 2,
      availableTags: [
        'سرعة فائقة ⚡',
        'تعامل راقٍ ومحترم 🤝',
        'شرح واضح وميسّر 💡',
        'بيئة انتظار مريحة 🛋️',
        'تنظيم وانسيابية 🎯',
        'إنجاز شامل دون تأخير ✨'
      ]
    },
    supervisorSettings: {
      targetWaitMinutes: 10,
      targetServiceMinutes: 8,
      criticalWaitAlertMinutes: 15,
      soundAlertsEnabled: true,
      refreshIntervalSeconds: 10
    },
    appointmentSettings: {
      enabled: true,
      startHour: 8, // 8:00 AM
      endHour: 15, // 3:00 PM
      slotDurationMinutes: 30, // 30 mins each
      stopBeforeEndMinutes: 30, // Last appointment is at 14:30 (half an hour before end of shift)
      maxPerSlot: 1, // Exclusive 1 appointment per slot
      hideBookedSlots: true, // Automatically remove/hide booked slots
      workingDays: [0, 1, 2, 3, 4], // Sunday to Thursday (Friday & Saturday are weekends)
      advanceBookingDays: 14,
      allowSameDay: false, // Default: Advance booking required
      strictDateCheck: true, // Strictly verify check-in only on appointment date
      allowEarlyCheckinMinutes: 60,
      noticeText: 'أوقات العمل من الأحد إلى الخميس من الساعة 8:00 صباحاً حتى 3:00 مساءً (آخر موعد 2:30 مساءً). يرجى تأكيد حضورك عبر الكشك الذكي عند الوصول.'
    },
    notificationSettings: defaultNotificationSettings,
    announcementVoiceSpeed: 0.88
  },
  services: [
    { id: 's1', name: 'خدمة العملاء والاستقبال', prefix: '1', avgDuration: 5, active: true, description: 'فتح حسابات وتحديث بيانات واستفسارات عامة' },
    { id: 's2', name: 'المعاملات السريعة والصندوق', prefix: '2', avgDuration: 3, active: true, description: 'إيداع وسحب وتصديق مستندات سريعة' },
    { id: 's3', name: 'الاستشارات والدعم المتخصص', prefix: '3', avgDuration: 10, active: true, description: 'حل النزاعات والشكاوى وخدمات كبار العملاء' }
  ],
  counters: [
    { id: 'c1', name: 'مكتب رقم 1', staffName: 'أحمد المنصور', activeTicketId: null },
    { id: 'c2', name: 'مكتب رقم 2', staffName: 'سارة خالد', activeTicketId: null },
    { id: 'c3', name: 'مكتب رقم 3', staffName: 'فهد العتيبي', activeTicketId: null },
    { id: 'c4', name: 'مكتب رقم 4', staffName: 'نورة السالم', activeTicketId: null }
  ],
  tickets: [
    {
      id: 't_demo_1',
      code: '101',
      serviceId: 's1',
      serviceName: 'خدمة العملاء والاستقبال',
      customerName: 'سعد العلي',
      phone: '0501234567',
      nationalId: '1012345678',
      isPriority: false,
      status: 'completed',
      counterId: 'c1',
      counterName: 'مكتب رقم 1',
      createdAt: Date.now() - 4 * 3600 * 1000,
      calledAt: Date.now() - 3.8 * 3600 * 1000,
      completedAt: Date.now() - 3.7 * 3600 * 1000
    },
    {
      id: 't_demo_2',
      code: '201',
      serviceId: 's2',
      serviceName: 'المعاملات السريعة والصندوق',
      customerName: 'فاطمة الشهري',
      phone: '0559876543',
      nationalId: '1098765432',
      isPriority: true,
      status: 'completed',
      counterId: 'c2',
      counterName: 'مكتب رقم 2',
      createdAt: Date.now() - 3 * 3600 * 1000,
      calledAt: Date.now() - 2.7 * 3600 * 1000,
      completedAt: Date.now() - 2.65 * 3600 * 1000
    },
    {
      id: 't_demo_3',
      code: '102',
      serviceId: 's1',
      serviceName: 'خدمة العملاء والاستقبال',
      customerName: 'تركي الدوسري',
      phone: '0543322110',
      nationalId: '1033221100',
      isPriority: false,
      status: 'completed',
      counterId: 'c1',
      counterName: 'مكتب رقم 1',
      createdAt: Date.now() - 2 * 3600 * 1000,
      calledAt: Date.now() - 1.6 * 3600 * 1000,
      completedAt: Date.now() - 1.5 * 3600 * 1000
    },
    {
      id: 't_demo_4',
      code: '301',
      serviceId: 's3',
      serviceName: 'الاستشارات والدعم المتخصص',
      customerName: 'م. خالد الحربي',
      phone: '0567788990',
      nationalId: '1077889900',
      isPriority: false,
      status: 'completed',
      counterId: 'c3',
      counterName: 'مكتب رقم 3',
      createdAt: Date.now() - 1.5 * 3600 * 1000,
      calledAt: Date.now() - 1.1 * 3600 * 1000,
      completedAt: Date.now() - 0.9 * 3600 * 1000
    },
    {
      id: 't_demo_5',
      code: '103',
      serviceId: 's1',
      serviceName: 'خدمة العملاء والاستقبال',
      customerName: 'عبدالله القحطاني',
      phone: '0512233445',
      nationalId: '1012233445',
      isPriority: false,
      status: 'waiting',
      counterId: null,
      counterName: null,
      createdAt: Date.now() - 25 * 60 * 1000,
      calledAt: null,
      completedAt: null
    },
    {
      id: 't_demo_6',
      code: '202',
      serviceId: 's2',
      serviceName: 'المعاملات السريعة والصندوق',
      customerName: 'سارة التميمي',
      phone: '0533344556',
      nationalId: '1033344556',
      isPriority: true,
      status: 'waiting',
      counterId: null,
      counterName: null,
      createdAt: Date.now() - 15 * 60 * 1000,
      calledAt: null,
      completedAt: null
    }
  ],
  lastCalled: null,
  feedbacks: [
    {
      id: 'fb_1',
      ticketId: 't_demo_1',
      ticketCode: '101',
      serviceId: 's1',
      serviceName: 'خدمة العملاء والاستقبال',
      counterId: 'c1',
      counterName: 'مكتب رقم 1',
      staffName: 'أحمد المنصور',
      customerName: 'سعد العلي',
      rating: 5,
      tags: ['سرعة فائقة ⚡', 'تعامل راقٍ ومحترم 🤝', 'تنظيم وانسيابية 🎯'],
      aspects: { speed: 5, reception: 5, clarity: 5 },
      comment: 'خدمة ممتازة وسريعة جداً، والأستاذ أحمد كان قمة في الأخلاق والتعاون.',
      createdAt: Date.now() - 3.5 * 3600 * 1000,
    },
    {
      id: 'fb_2',
      ticketId: 't_demo_2',
      ticketCode: '201',
      serviceId: 's2',
      serviceName: 'المعاملات السريعة والصندوق',
      counterId: 'c2',
      counterName: 'مكتب رقم 2',
      staffName: 'سارة خالد',
      customerName: 'فاطمة الشهري',
      rating: 5,
      tags: ['سرعة فائقة ⚡', 'إنجاز شامل دون تأخير ✨'],
      aspects: { speed: 5, reception: 5, clarity: 4 },
      comment: 'ما شاء الله تبارك الله، تم إنهاء المعاملة والإيداع في أقل من دقيقتين.',
      createdAt: Date.now() - 2.5 * 3600 * 1000,
    },
    {
      id: 'fb_3',
      ticketId: 't_demo_3',
      ticketCode: '102',
      serviceId: 's1',
      serviceName: 'خدمة العملاء والاستقبال',
      counterId: 'c1',
      counterName: 'مكتب رقم 1',
      staffName: 'أحمد المنصور',
      customerName: 'تركي الدوسري',
      rating: 4,
      tags: ['شرح واضح وميسّر 💡', 'بيئة انتظار مريحة 🛋️'],
      aspects: { speed: 4, reception: 5, clarity: 5 },
      comment: 'الشرح كان وافياً وواضحاً لمتطلبات التحديث.',
      createdAt: Date.now() - 1.4 * 3600 * 1000,
    },
    {
      id: 'fb_4',
      ticketId: 't_demo_4',
      ticketCode: '301',
      serviceId: 's3',
      serviceName: 'الاستشارات والدعم المتخصص',
      counterId: 'c3',
      counterName: 'مكتب رقم 3',
      staffName: 'فهد العتيبي',
      customerName: 'م. خالد الحربي',
      rating: 5,
      tags: ['تعامل راقٍ ومحترم 🤝', 'شرح واضح وميسّر 💡', 'إنجاز شامل دون تأخير ✨'],
      aspects: { speed: 5, reception: 5, clarity: 5 },
      comment: 'استشارة قانونية وإجرائية دقيقة ومتميزة وفرت علي الكثير من الوقت.',
      createdAt: Date.now() - 40 * 60 * 1000,
    }
  ],
  appointments: [
    {
      id: 'apt_demo_1',
      code: 'APT-1042',
      serviceId: 's1',
      serviceName: 'خدمة العملاء والاستقبال',
      customerName: 'عبدالرحمن التميمي',
      phone: '0505123456',
      nationalId: '1023456789',
      date: getLocalDateString(),
      timeSlot: '09:30',
      status: 'scheduled',
      notes: 'تحديث بيانات المنشأة والسجل التجاري',
      createdAt: Date.now() - 24 * 3600 * 1000
    },
    {
      id: 'apt_demo_2',
      code: 'APT-2089',
      serviceId: 's3',
      serviceName: 'الاستشارات والدعم المتخصص',
      customerName: 'د. ليلى الشمري',
      phone: '0567890123',
      nationalId: '1087654321',
      date: getLocalDateString(),
      timeSlot: '11:00',
      status: 'scheduled',
      notes: 'استشارة فنية متخصصة وحوكمة',
      createdAt: Date.now() - 12 * 3600 * 1000
    }
  ],
  notificationLogs: initialDemoNotificationLogs
};

// تحويل الأرقام إلى نطق عربي فصيح وطبيعي (101 -> مائة وواحد)

/** Return YYYY-MM-DD using the browser's local timezone (not UTC). */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function arabicNumberToWords(num: string | number): string {
  const n = parseInt(String(num), 10);
  if (isNaN(n)) return String(num);
  if (n === 0) return 'صفر';

  const ones = [
    '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة',
    'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'
  ];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  if (n < 20) return ones[n];
  if (n < 100) {
    const r = n % 10;
    return r === 0 ? tens[Math.floor(n / 10)] : `${ones[r]} و${tens[Math.floor(n / 10)]}`;
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    return remainder === 0 ? hundreds[h] : `${hundreds[h]} و${arabicNumberToWords(remainder)}`;
  }
  if (n < 10000) {
    const th = Math.floor(n / 1000);
    const remainder = n % 1000;
    const thWord = th === 1 ? 'ألف' : (th === 2 ? 'ألفان' : `${ones[th]} آلاف`);
    return remainder === 0 ? thWord : `${thWord} و${arabicNumberToWords(remainder)}`;
  }
  return String(num);
}

// تشغيل نغمة تنبيه صوتية (Chime)
export function playChimeSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    
    // نغمتين متتاليتين راقيتين
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880.00, now + 0.22); // A5

    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 1.2);
  } catch (e) {
    console.warn('Audio chime error:', e);
  }
}

// النداء الصوتي الشامل مع التفعيل المسبق
export function announceTicketCall(ticketCode: string, counterName: string, speed = 0.88) {
  playChimeSound();
  if (!('speechSynthesis' in window)) return;

  const spokenNumber = arabicNumberToWords(ticketCode);
  const speechText = `تذكرة رقم، ${spokenNumber}، يرجى التوجه إلى، ${counterName}`;

  setTimeout(() => {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = 'ar-SA';
      utterance.rate = speed;
      const voices = window.speechSynthesis.getVoices();
      const arabicVoice = voices.find(v => v.lang && (v.lang.startsWith('ar') || v.lang.includes('Arabic')));
      if (arabicVoice) {
        utterance.voice = arabicVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }, 500);
}

// معالجة قواعد التمييز والعدد باللغة العربية (سليمة نحوياً وبصرياً)
export function formatTicketCount(count: number): string {
  if (count === 0) return 'لا توجد تذاكر';
  if (count === 1) return 'تذكرة واحدة';
  if (count === 2) return 'تذكرتان';
  if (count >= 3 && count <= 10) return `${count} تذاكر`;
  return `${count} تذكرة`;
}

export function formatCustomerCount(count: number): string {
  if (count === 0) return 'لا يوجد مراجعين';
  if (count === 1) return 'مراجع واحد';
  if (count === 2) return 'مراجِعان';
  if (count >= 3 && count <= 10) return `${count} مراجعين`;
  return `${count} مراجعاً`;
}

export function formatMinutes(count: number): string {
  const rounded = Math.round(count);
  if (rounded <= 0) return 'أقل من دقيقة';
  if (rounded === 1) return 'دقيقة واحدة';
  if (rounded === 2) return 'دقيقتان';
  if (rounded >= 3 && rounded <= 10) return `${rounded} دقائق`;
  return `${rounded} دقيقة`;
}

export interface CounterWorkload {
  counterId: string;
  counterName: string;
  isIdle: boolean;
  activeTicket: Ticket | null;
  servingServiceName: string | null;
  completedTodayCount: number;
  assignedWaitingCount: number;
  loadScore: number;
}

export interface ServiceWorkload {
  serviceId: string;
  serviceName: string;
  prefix: string;
  waitingCount: number;
  estimatedWaitMinutes: number;
  activeCountersCount: number;
}

export function calculateCounterWorkloads(appState: AppState): CounterWorkload[] {
  return appState.counters.map((counter) => {
    const activeTicket = counter.activeTicketId
      ? appState.tickets.find((t) => t.id === counter.activeTicketId) || null
      : null;
    const isIdle = !activeTicket;

    const completedTodayCount = appState.tickets.filter(
      (t) => t.counterId === counter.id && t.status === 'completed'
    ).length;

    const assignedWaitingCount = appState.tickets.filter(
      (t) => t.assignedCounterId === counter.id && t.status === 'waiting'
    ).length;

    const loadScore = (isIdle ? 0 : 10) + (assignedWaitingCount * 3);

    return {
      counterId: counter.id,
      counterName: counter.name,
      isIdle,
      activeTicket,
      servingServiceName: counter.servingServiceName || activeTicket?.serviceName || null,
      completedTodayCount,
      assignedWaitingCount,
      loadScore,
    };
  });
}

export function calculateServiceWorkloads(appState: AppState): ServiceWorkload[] {
  return appState.services.map((service) => {
    const waitingTickets = appState.tickets.filter(
      (t) => t.serviceId === service.id && t.status === 'waiting'
    );
    const waitingCount = waitingTickets.length;
    const estimatedWaitMinutes = waitingCount * (service.avgDuration || 4);

    const activeCountersCount = appState.counters.filter((c) => {
      const active = appState.tickets.find((t) => t.id === c.activeTicketId);
      return active?.serviceId === service.id;
    }).length;

    return {
      serviceId: service.id,
      serviceName: service.name,
      prefix: service.prefix,
      waitingCount,
      estimatedWaitMinutes,
      activeCountersCount,
    };
  });
}

export interface CSATAnalytics {
  totalCount: number;
  averageRating: number;
  satisfactionPercentage: number;
  starCounts: Record<number, number>;
  aspectAverages: {
    speed: number;
    reception: number;
    clarity: number;
  };
  counterStats: {
    counterId: string;
    counterName: string;
    staffName?: string;
    count: number;
    avgRating: number;
  }[];
  serviceStats: {
    serviceId: string;
    serviceName: string;
    count: number;
    avgRating: number;
  }[];
}

export function calculateCSATStats(feedbacks: TicketFeedback[] = []): CSATAnalytics {
  const totalCount = feedbacks.length;
  if (totalCount === 0) {
    return {
      totalCount: 0,
      averageRating: 0,
      satisfactionPercentage: 0,
      starCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      aspectAverages: { speed: 0, reception: 0, clarity: 0 },
      counterStats: [],
      serviceStats: [],
    };
  }

  const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;
  let satisfiedCount = 0;

  let speedSum = 0, speedCount = 0;
  let recSum = 0, recCount = 0;
  let claSum = 0, claCount = 0;

  const counterMap: Record<string, { counterName: string; staffName?: string; sum: number; count: number }> = {};
  const serviceMap: Record<string, { serviceName: string; sum: number; count: number }> = {};

  feedbacks.forEach((fb) => {
    const r = Math.min(5, Math.max(1, Math.round(fb.rating || 5)));
    starCounts[r] = (starCounts[r] || 0) + 1;
    ratingSum += fb.rating;
    if (fb.rating >= 4) satisfiedCount++;

    if (fb.aspects?.speed) { speedSum += fb.aspects.speed; speedCount++; }
    if (fb.aspects?.reception) { recSum += fb.aspects.reception; recCount++; }
    if (fb.aspects?.clarity) { claSum += fb.aspects.clarity; claCount++; }

    // Counter stats
    if (fb.counterId) {
      if (!counterMap[fb.counterId]) {
        counterMap[fb.counterId] = { counterName: fb.counterName || fb.counterId, staffName: fb.staffName, sum: 0, count: 0 };
      }
      counterMap[fb.counterId].sum += fb.rating;
      counterMap[fb.counterId].count += 1;
      if (fb.staffName && !counterMap[fb.counterId].staffName) {
        counterMap[fb.counterId].staffName = fb.staffName;
      }
    }

    // Service stats
    if (fb.serviceId) {
      if (!serviceMap[fb.serviceId]) {
        serviceMap[fb.serviceId] = { serviceName: fb.serviceName || fb.serviceId, sum: 0, count: 0 };
      }
      serviceMap[fb.serviceId].sum += fb.rating;
      serviceMap[fb.serviceId].count += 1;
    }
  });

  const averageRating = Number((ratingSum / totalCount).toFixed(1));
  const satisfactionPercentage = Math.round((satisfiedCount / totalCount) * 100);

  const counterStats = Object.entries(counterMap).map(([counterId, data]) => ({
    counterId,
    counterName: data.counterName,
    staffName: data.staffName,
    count: data.count,
    avgRating: Number((data.sum / data.count).toFixed(1)),
  })).sort((a, b) => b.avgRating - a.avgRating);

  const serviceStats = Object.entries(serviceMap).map(([serviceId, data]) => ({
    serviceId,
    serviceName: data.serviceName,
    count: data.count,
    avgRating: Number((data.sum / data.count).toFixed(1)),
  })).sort((a, b) => b.avgRating - a.avgRating);

  return {
    totalCount,
    averageRating,
    satisfactionPercentage,
    starCounts,
    aspectAverages: {
      speed: speedCount ? Number((speedSum / speedCount).toFixed(1)) : averageRating,
      reception: recCount ? Number((recSum / recCount).toFixed(1)) : averageRating,
      clarity: claCount ? Number((claSum / claCount).toFixed(1)) : averageRating,
    },
    counterStats,
    serviceStats,
  };
}

/**
 * Returns the public base URL for customer QR codes and links.
 * Automatically resolves 'ais-dev-' to 'ais-pre-' to avoid Google Cloud 403 Forbidden
 * errors when scanned on external mobile devices.
 */
export function getBaseAppUrl(customUrl?: string): string {
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window === 'undefined') return '';
  let origin = window.location.origin;
  // If running in development cloud preview, rewrite to public shared URL
  if (origin.includes('ais-dev-')) {
    origin = origin.replace('ais-dev-', 'ais-pre-');
  }
  // Preserve any base pathname if hosted in subpath, strip trailing slashes or index.html
  let pathname = window.location.pathname || '';
  pathname = pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '');
  return `${origin}${pathname}`;
}


