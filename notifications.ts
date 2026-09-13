import { NotificationSettings, NotificationTemplates, NotificationLog, NotificationTrigger, NotificationChannel, Ticket, SystemSettings } from '../types';
import { getBaseAppUrl } from '../utils';

export const defaultNotificationTemplates: NotificationTemplates = {
  ticketIssued: 'مرحباً بك {name} في {org}!\nتم إصدار تذكرتك برقم ({ticket}) لخدمة: {service}.\nيمكنك متابعة دورك الحي من هاتفك عبر الرابط:\n{track_url}',
  turnApproaching: 'عزيزي {name}، اقترب دورك!\nتذكرتك رقم ({ticket}) لخدمة: {service}.\nيتبقى أمامك {ahead_count} مراجعين فقط.\nيرجى الاستعداد والتواجد بالقرب من صالة الانتظار.',
  ticketCalled: 'عزيزي {name}، حان دورك الآن!\nيرجى التوجه فوراً إلى ({counter}) لخدمة تذكرتك رقم ({ticket}).\nنسعد بخدمتكم في {org}!',
  manualStaff: 'عزيزي {name}، الموظف في ({counter}) بانتظارك الآن لإتمام معاملتك الخاصة بتذكرة رقم ({ticket}). نتطلع لخدمتكم!',
};

export const defaultNotificationSettings: NotificationSettings = {
  enabled: true,
  defaultChannel: 'both',
  approachingQueueThreshold: 2,
  sendOnTicketIssue: true,
  sendOnApproaching: true,
  sendOnTicketCalled: true,
  allowStaffManualSend: true,
  whatsappCountryCode: '966',
  providerType: 'hybrid',
  smsSenderName: 'QUEUE-ALERT',
  simulateDeliveryReceipts: true,
  templates: defaultNotificationTemplates,
};

/**
 * تنظيف وتنسيق رقم الجوال ليتوافق مع معايير WhatsApp الدولية (E.164)
 */
export function formatPhoneForWhatsApp(phone: string, defaultCountryCode = '966'): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');

  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // أرقام الجوال السعودية التي تبدأ بـ 05
  if (cleaned.startsWith('05') && cleaned.length === 10) {
    return `${defaultCountryCode}${cleaned.substring(1)}`;
  }

  // إذا بدأ بـ 5 وتكون من 9 أرقام
  if (cleaned.startsWith('5') && cleaned.length === 9) {
    return `${defaultCountryCode}${cleaned}`;
  }

  return cleaned;
}

/**
 * توليد رابط إرسال مباشر عبر WhatsApp Web أو تطبيق الجوال
 */
export function getWhatsAppDirectUrl(phone: string, text: string, defaultCountryCode = '966'): string {
  const formattedPhone = formatPhoneForWhatsApp(phone, defaultCountryCode);
  const encodedText = encodeURIComponent(text);
  if (!formattedPhone) {
    return `https://wa.me/?text=${encodedText}`;
  }
  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
}

/**
 * توليد رابط إرسال رسالة SMS عبر تطبيق الرسائل الافتراضي بالجوال
 */
export function getSmsDirectUrl(phone: string, text: string): string {
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const encodedText = encodeURIComponent(text);
  return `sms:${cleanPhone}?body=${encodedText}`;
}

/**
 * استبدال المتغيرات داخل قالب الرسالة
 */
export function renderNotificationTemplate(
  template: string,
  variables: {
    name?: string;
    ticket?: string;
    service?: string;
    counter?: string;
    ahead_count?: number | string;
    track_url?: string;
    org?: string;
    branch?: string;
  }
): string {
  if (!template) return '';
  let output = template;

  const map: Record<string, string> = {
    '{name}': variables.name || 'عزيزي المراجع',
    '{ticket}': variables.ticket || '---',
    '{service}': variables.service || 'الخدمة',
    '{counter}': variables.counter || 'شباك الخدمة',
    '{ahead_count}': String(variables.ahead_count ?? '0'),
    '{track_url}': variables.track_url || '',
    '{org}': variables.org || 'الصالة الذكية',
    '{branch}': variables.branch || 'الفرع الرئيسي',
  };

  for (const [key, val] of Object.entries(map)) {
    output = output.split(key).join(val);
  }

  return output;
}

/**
 * استخراج رابط التتبع المباشر للتذكرة
 */
export function getTicketTrackingUrl(ticket: Ticket, settings: SystemSettings): string {
  const baseUrl = getBaseAppUrl(settings.publicQrBaseUrl || settings.appointmentSettings?.publicQrBaseUrl);
  const params = new URLSearchParams();
  // Public QR links must contain only an opaque random token. Never expose
  // ticket code, customer name, phone, national ID, or timestamps in the URL.
  if (ticket.publicTrackToken) params.set('track', ticket.publicTrackToken);
  return `${baseUrl}?${params.toString()}`;
}

/**
 * بناء رسالة جاهزة لأي حدث
 */
export function composeNotificationMessage(
  trigger: NotificationTrigger,
  ticket: Ticket,
  settings: SystemSettings,
  extra?: {
    counterName?: string;
    aheadCount?: number;
    customText?: string;
  }
): string {
  const cfg = settings.notificationSettings || defaultNotificationSettings;
  const templates = cfg.templates || defaultNotificationTemplates;
  const trackUrl = getTicketTrackingUrl(ticket, settings);

  let rawTemplate = '';
  switch (trigger) {
    case 'ticket_issued':
      rawTemplate = templates.ticketIssued || defaultNotificationTemplates.ticketIssued;
      break;
    case 'turn_approaching':
      rawTemplate = templates.turnApproaching || defaultNotificationTemplates.turnApproaching;
      break;
    case 'ticket_called':
      rawTemplate = templates.ticketCalled || defaultNotificationTemplates.ticketCalled;
      break;
    case 'manual_staff':
      rawTemplate = extra?.customText || templates.manualStaff || defaultNotificationTemplates.manualStaff;
      break;
  }

  return renderNotificationTemplate(rawTemplate, {
    name: ticket.customerName,
    ticket: ticket.code,
    service: ticket.serviceName,
    counter: extra?.counterName || ticket.counterName || 'شباك الخدمة',
    ahead_count: extra?.aheadCount !== undefined ? extra.aheadCount : 0,
    track_url: trackUrl,
    org: settings.orgName,
    branch: settings.branchName,
  });
}

/**
 * سجل افتراضي تجريبي لبداية تشغيل النظام
 */
export const initialDemoNotificationLogs: NotificationLog[] = [
  {
    id: 'n_demo_1',
    ticketId: 't_demo_1',
    ticketCode: '101',
    customerName: 'سعد العلي',
    phone: '0501234567',
    channel: 'whatsapp',
    trigger: 'ticket_issued',
    messageText: 'مرحباً بك سعد العلي في نظام الانتظار السحابي الذكي! تم إصدار تذكرتك برقم (101) لخدمة: خدمة العملاء والاستقبال. يمكنك متابعة دورك الحي من هاتفك.',
    status: 'delivered',
    timestamp: Date.now() - 4 * 3600 * 1000,
  },
  {
    id: 'n_demo_2',
    ticketId: 't_demo_1',
    ticketCode: '101',
    customerName: 'سعد العلي',
    phone: '0501234567',
    channel: 'sms',
    trigger: 'ticket_called',
    messageText: 'عزيزي سعد العلي، حان دورك الآن! يرجى التوجه فوراً إلى (مكتب رقم 1) لخدمة تذكرتك رقم (101). نسعد بخدمتكم!',
    status: 'delivered',
    timestamp: Date.now() - 3.8 * 3600 * 1000,
    counterName: 'مكتب رقم 1',
  },
  {
    id: 'n_demo_3',
    ticketId: 't_demo_2',
    ticketCode: '201',
    customerName: 'فاطمة الشهري',
    phone: '0559876543',
    channel: 'whatsapp',
    trigger: 'turn_approaching',
    messageText: 'عزيزي فاطمة الشهري، اقترب دورك! تذكرتك رقم (201) لخدمة: المعاملات السريعة والصندوق. يتبقى أمامك 1 مراجعين فقط. يرجى الاستعداد.',
    status: 'delivered',
    timestamp: Date.now() - 2.8 * 3600 * 1000,
  },
];
