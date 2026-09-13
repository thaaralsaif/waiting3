export interface Service {
  id: string;
  name: string;
  prefix: string;
  avgDuration: number;
  active: boolean;
  description?: string;
  icon?: string;
}

export interface Counter {
  id: string;
  name: string;
  staffName: string;
  activeTicketId: string | null;
  servingServiceName?: string | null;
}

export type TicketStatus = 'waiting' | 'serving' | 'completed' | 'cancelled';

export interface TicketTransferLog {
  id: string;
  fromCounterId: string;
  fromCounterName: string;
  toServiceId: string;
  toServiceName: string;
  toCounterId?: string | null;
  toCounterName?: string | null;
  priorityMode: 'top_priority' | 'normal';
  reason: string;
  note?: string;
  transferredAt: number;
}

export interface TicketFeedback {
  id: string;
  ticketId: string;
  ticketCode: string;
  serviceId: string;
  serviceName: string;
  counterId: string;
  counterName: string;
  staffName?: string;
  customerName?: string;
  rating: number; // 1 to 5
  tags: string[];
  aspects?: {
    speed?: number;
    reception?: number;
    clarity?: number;
  };
  comment?: string;
  createdAt: number;
}

export interface Ticket {
  id: string;
  code: string;
  serviceId: string;
  serviceName: string;
  customerName: string;
  phone: string;
  nationalId: string;
  isPriority: boolean;
  status: TicketStatus;
  counterId: string | null;
  counterName: string | null;
  createdAt: number;
  calledAt: number | null;
  completedAt: number | null;
  customData?: Record<string, string>;
  isTransferred?: boolean;
  assignedCounterId?: string | null;
  transferHistory?: TicketTransferLog[];
  feedback?: TicketFeedback;
  isAppointment?: boolean;
  appointmentCode?: string;
  /** Opaque public token used by QR tracking. Never use ticket code as the public identifier. */
  publicTrackToken?: string;
  notificationsSent?: {
    issued?: boolean;
    approaching?: boolean;
    called?: boolean;
    manualCount?: number;
  };
}

export type FieldRequirement = 'required' | 'optional' | 'hidden';

export interface CustomFieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
  required: boolean;
  placeholder?: string;
  serviceId?: string;
}

export interface IntakeFormSettings {
  nameField: FieldRequirement;
  phoneField: FieldRequirement;
  nationalIdField: FieldRequirement;
  enablePriorityToggle: boolean;
  customFields: CustomFieldDefinition[];
  instructionNotice?: string;
}

export interface LastCalled {
  ticketCode: string;
  counterName: string;
  serviceName: string;
  timestamp: number;
}

export interface SystemTheme {
  primary: string;
  accent: string;
  bg: string;
  card: string;
  textColor?: string;
  cardTextColor?: string;
  buttonTextColor?: string;
  fontFamily?: string;
  fontWeight?: string;
  fontSize?: string;
}

export interface TicketPrintSettings {
  headerText: string;
  subHeaderText: string;
  footerText: string;
  showQrCode: boolean;
  showWaitTimeEstimate: boolean;
  showWaitingCountAhead: boolean;
  showBranchName: boolean;
  showDateAndTime: boolean;
  showCustomerName: boolean;
  paperWidth: '80mm' | '58mm';
  fontSizeScale: 'small' | 'medium' | 'large';
}

export interface FeedbackSettings {
  enabled: boolean;
  promptTitle: string;
  allowComments: boolean;
  lowRatingAlertThreshold: number;
  availableTags: string[];
}

export type AppointmentStatus = 'scheduled' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: string;
  code: string; // e.g. "APT-7821"
  serviceId: string;
  serviceName: string;
  customerName: string;
  phone: string;
  nationalId: string;
  date: string; // "YYYY-MM-DD"
  timeSlot: string; // "09:30"
  status: AppointmentStatus;
  ticketId?: string;
  ticketCode?: string;
  notes?: string;
  createdAt: number;
  checkedInAt?: number;
}

export interface AppointmentSettings {
  enabled: boolean;
  startHour: number; // e.g. 8 (8:00 AM)
  endHour: number; // e.g. 15 (3:00 PM)
  slotDurationMinutes: number; // e.g. 30 minutes
  stopBeforeEndMinutes: number; // e.g. 30 minutes (last appointment is 30 mins before end of shift)
  maxPerSlot: number; // e.g. 1 (exclusive slot)
  hideBookedSlots: boolean; // Hide slot once booked
  workingDays: number[]; // [0, 1, 2, 3, 4] -> Sun to Thu
  advanceBookingDays: number; // e.g. 14
  allowSameDay: boolean; // whether same day booking is allowed
  strictDateCheck: boolean; // strictly enforce check-in only on the date of appointment
  allowEarlyCheckinMinutes: number; // e.g. 60
  noticeText?: string;
  publicQrBaseUrl?: string; // custom public URL for external mobile QR scans
}

export type NotificationChannel = 'whatsapp' | 'sms' | 'both';

export type NotificationTrigger = 'ticket_issued' | 'turn_approaching' | 'ticket_called' | 'manual_staff';

export interface NotificationLog {
  id: string;
  ticketId: string;
  ticketCode: string;
  customerName: string;
  phone: string;
  channel: 'whatsapp' | 'sms';
  trigger: NotificationTrigger;
  messageText: string;
  status: 'sent' | 'delivered' | 'failed';
  timestamp: number;
  counterName?: string;
}

export interface NotificationTemplates {
  ticketIssued: string;
  turnApproaching: string;
  ticketCalled: string;
  manualStaff: string;
}

export interface NotificationSettings {
  enabled: boolean;
  defaultChannel: NotificationChannel;
  approachingQueueThreshold: number; // e.g. 2: notify when ahead <= 2
  sendOnTicketIssue: boolean; // welcome message with live tracker link
  sendOnApproaching: boolean; // alert when close to turn
  sendOnTicketCalled: boolean; // alert when called to specific counter
  allowStaffManualSend: boolean; // enable WhatsApp/SMS send in staff view
  whatsappCountryCode: string; // default "966"
  templates: NotificationTemplates;
  providerType: 'direct_whatsapp_web' | 'sms_gateway' | 'hybrid';
  smsSenderName?: string;
  simulateDeliveryReceipts: boolean;
}

export interface SupervisorSettings {
  targetWaitMinutes: number;
  targetServiceMinutes: number;
  criticalWaitAlertMinutes: number;
  soundAlertsEnabled: boolean;
  refreshIntervalSeconds: number;
}

export interface SystemSettings {
  orgName: string;
  branchName: string;
  congestionLimit: number;
  youtubeUrl: string;
  marqueeText: string;
  customFontUrl: string;
  printFooter: string;
  firebaseConfigStr: string;
  publicQrBaseUrl?: string; // Base URL used for mobile QR codes to avoid 403 errors
  theme: SystemTheme;
  ticketPrint?: TicketPrintSettings;
  intakeForm?: IntakeFormSettings;
  feedbackSettings?: FeedbackSettings;
  supervisorSettings?: SupervisorSettings;
  appointmentSettings?: AppointmentSettings;
  notificationSettings?: NotificationSettings;
  announcementVoiceSpeed: number;
}

export interface AppState {
  settings: SystemSettings;
  services: Service[];
  counters: Counter[];
  tickets: Ticket[];
  lastCalled: LastCalled | null;
  feedbacks?: TicketFeedback[];
  appointments?: Appointment[];
  notificationLogs?: NotificationLog[];
}

export type ActiveView = 'kiosk' | 'display' | 'staff' | 'tracker' | 'feedback' | 'wallboard' | 'appointments' | 'search' | 'admin';
