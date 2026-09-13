import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, get, runTransaction, Database } from 'firebase/database';
import { getFirestore, doc, setDoc, onSnapshot, runTransaction as runFirestoreTransaction, Firestore } from 'firebase/firestore';
import { AppState, SystemSettings, Ticket, Counter, Service } from '../types';


export interface PublicTrackerSnapshot {
  token: string;
  ticketCode: string;
  serviceName: string;
  status: Ticket['status'];
  counterName: string | null;
  aheadCount: number;
  createdAt: number;
  calledAt: number | null;
  completedAt: number | null;
  updatedAt: number;
  transferCount: number;
}

function toPublicTrackerSnapshot(state: AppState, ticket: Ticket): PublicTrackerSnapshot | null {
  if (!ticket.publicTrackToken) return null;
  const aheadCount = ticket.status === 'waiting'
    ? state.tickets.filter((t) =>
        t.status === 'waiting' &&
        t.serviceId === ticket.serviceId &&
        t.createdAt < ticket.createdAt
      ).length
    : 0;

  return {
    token: ticket.publicTrackToken,
    ticketCode: ticket.code,
    serviceName: ticket.serviceName,
    status: ticket.status,
    counterName: ticket.counterName || null,
    aheadCount,
    createdAt: ticket.createdAt,
    calledAt: ticket.calledAt,
    completedAt: ticket.completedAt,
    updatedAt: Date.now(),
    transferCount: ticket.transferHistory?.length || 0,
  };
}

export async function publishPublicTracker(
  configStr: string,
  state: AppState,
  ticket: Ticket
): Promise<boolean> {
  const config = parseFirebaseConfig(configStr);
  if (!config || !ticket.publicTrackToken) return false;
  try {
    if (!cachedRtdb && !cachedFirestore) {
      const init = initFirebaseService(configStr);
      if (!init.success) return false;
    }
    const snapshot = toPublicTrackerSnapshot(state, ticket);
    if (!snapshot) return false;

    if (config.databaseURL && cachedRtdb) {
      await set(ref(cachedRtdb, `public_trackers/${snapshot.token}`), snapshot);
      return true;
    }
    if (cachedFirestore) {
      await setDoc(doc(cachedFirestore, 'public_trackers', snapshot.token), snapshot, { merge: true });
      return true;
    }
  } catch (e) {
    console.warn('Public tracker publish failed:', e);
  }
  return false;
}

export async function getPublicTracker(
  configStr: string,
  token: string
): Promise<PublicTrackerSnapshot | null> {
  const config = parseFirebaseConfig(configStr);
  if (!config || !token || token.length < 20 || token.length > 100) return null;
  try {
    if (!cachedRtdb && !cachedFirestore) {
      const init = initFirebaseService(configStr);
      if (!init.success) return null;
    }
    if (config.databaseURL && cachedRtdb) {
      const snapshot = await get(ref(cachedRtdb, `public_trackers/${token}`));
      return snapshot.exists() ? snapshot.val() as PublicTrackerSnapshot : null;
    }
    if (cachedFirestore) {
      const snapshot = await get(doc(cachedFirestore, 'public_trackers', token));
      return snapshot.exists() ? snapshot.data() as PublicTrackerSnapshot : null;
    }
  } catch (e) {
    console.warn('Public tracker fetch failed:', e);
  }
  return null;
}


export function subscribePublicTracker(
  configStr: string,
  token: string,
  onSnapshotReceived: (snapshot: PublicTrackerSnapshot | null) => void
): () => void {
  const config = parseFirebaseConfig(configStr);
  if (!config || !token || token.length < 20 || token.length > 100) return () => {};
  try {
    if (!cachedRtdb && !cachedFirestore) {
      const init = initFirebaseService(configStr);
      if (!init.success) return () => {};
    }
    if (config.databaseURL && cachedRtdb) {
      const trackerRef = ref(cachedRtdb, `public_trackers/${token}`);
      return onValue(trackerRef, (snapshot) => {
        onSnapshotReceived(snapshot.exists() ? snapshot.val() as PublicTrackerSnapshot : null);
      }, () => onSnapshotReceived(null));
    }
    if (cachedFirestore) {
      return onSnapshot(doc(cachedFirestore, 'public_trackers', token), (snapshot) => {
        onSnapshotReceived(snapshot.exists() ? snapshot.data() as PublicTrackerSnapshot : null);
      }, () => onSnapshotReceived(null));
    }
  } catch (e) {
    console.warn('Public tracker subscription failed:', e);
  }
  return () => {};
}

export interface FirebaseConnectionStatus {
  connected: boolean;
  type: 'none' | 'rtdb' | 'firestore';
  projectId?: string;
  error?: string;
  lastSyncedAt?: number;
  /** UI-friendly status label/message. Kept optional for backward compatibility. */
  status?: 'idle' | 'connecting' | 'connected' | 'error';
  message?: string;
}

let cachedApp: FirebaseApp | null = null;
let cachedRtdb: Database | null = null;
let cachedFirestore: Firestore | null = null;
let unsubscribeSync: (() => void) | null = null;

/**
 * تنظيف والتحقق من صحة كود Firebase Config JSON المدخل من قبل المستخدم
 */
export function parseFirebaseConfig(configStr: string): any | null {
  if (!configStr || !configStr.trim()) return null;
  try {
    let clean = configStr.trim();
    // إزالة علامات الاقتباس الزائدة أو التعليقات إن وجدت
    if (clean.startsWith('const firebaseConfig =')) {
      clean = clean.replace('const firebaseConfig =', '').replace(/;$/, '').trim();
    }
    const parsed = JSON.parse(clean);
    if (parsed.projectId || parsed.databaseURL || parsed.apiKey) {
      return parsed;
    }
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * تهيئة Firebase بالـ Config المدخل من المستخدم
 */
export function initFirebaseService(configStr: string): {
  success: boolean;
  app: FirebaseApp | null;
  type: 'rtdb' | 'firestore' | 'none';
  error?: string;
} {
  const config = parseFirebaseConfig(configStr);
  if (!config) {
    return { success: false, app: null, type: 'none', error: 'تكوين JSON غير صالح أو فارغ' };
  }

  try {
    const appName = 'smart-queue-user-client';
    const existingApps = getApps();
    const foundApp = existingApps.find((a) => a.name === appName);
    
    const app = foundApp || initializeApp(config, appName);
    cachedApp = app;

    // تحديد ما إذا كان المستخدم يستخدم Realtime Database أو Firestore
    if (config.databaseURL) {
      cachedRtdb = getDatabase(app);
      cachedFirestore = null;
      return { success: true, app, type: 'rtdb' };
    } else {
      cachedFirestore = getFirestore(app);
      cachedRtdb = null;
      return { success: true, app, type: 'firestore' };
    }
  } catch (err: any) {
    return {
      success: false,
      app: null,
      type: 'none',
      error: err?.message || 'فشل تهيئة تطبيق Firebase',
    };
  }
}

/**
 * الاستماع للتحديثات اللحظية المباشرة من السحابة ومزامنة حالة التطبيق
 */
export function subscribeToFirebaseSync(
  configStr: string,
  onRemoteStateReceived: (remoteState: Partial<AppState>) => void,
  onStatusChange?: (status: FirebaseConnectionStatus) => void
): () => void {
  // إلغاء أي اشتراك سابق أولاً لمنع التكرار
  if (unsubscribeSync) {
    unsubscribeSync();
    unsubscribeSync = null;
  }

  const init = initFirebaseService(configStr);
  if (!init.success || !init.app) {
    onStatusChange?.({
      connected: false,
      type: 'none',
      status: 'error',
      message: init.error || 'لم يتم تفعيل الربط السحابي',
      error: init.error || 'لم يتم تفعيل الربط السحابي',
    });
    return () => {};
  }

  const parsedConfig = parseFirebaseConfig(configStr);

  // 1. مزامنة Realtime Database
  if (init.type === 'rtdb' && cachedRtdb) {
    try {
      const stateRef = ref(cachedRtdb, 'smart_queue_live_state');
      const unsub = onValue(
        stateRef,
        (snapshot) => {
          const val = snapshot.val();
          if (val) {
            onRemoteStateReceived(val);
            onStatusChange?.({
              connected: true,
              type: 'rtdb',
              status: 'connected',
              message: 'المزامنة السحابية متصلة',
              projectId: parsedConfig?.projectId || 'Realtime DB',
              lastSyncedAt: Date.now(),
            });
          } else {
            onStatusChange?.({
              connected: true,
              type: 'rtdb',
              status: 'connected',
              message: 'المزامنة السحابية متصلة',
              projectId: parsedConfig?.projectId,
              lastSyncedAt: Date.now(),
            });
          }
        },
        (error) => {
          onStatusChange?.({
            connected: false,
            type: 'rtdb',
            status: 'error',
            message: error.message,
            projectId: parsedConfig?.projectId,
            error: error.message,
          });
        }
      );

      unsubscribeSync = () => unsub();
      return unsubscribeSync;
    } catch (err: any) {
      onStatusChange?.({
        connected: false,
        type: 'rtdb',
        status: 'error',
        message: err?.message,
        error: err?.message,
      });
      return () => {};
    }
  }

  // 2. مزامنة Cloud Firestore
  if (init.type === 'firestore' && cachedFirestore) {
    try {
      const docRef = doc(cachedFirestore, 'queue_system', 'current_state');
      const unsub = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            onRemoteStateReceived(data as Partial<AppState>);
            onStatusChange?.({
              connected: true,
              type: 'firestore',
              status: 'connected',
              message: 'المزامنة السحابية متصلة',
              projectId: parsedConfig?.projectId,
              lastSyncedAt: Date.now(),
            });
          } else {
            onStatusChange?.({
              connected: true,
              type: 'firestore',
              status: 'connected',
              message: 'المزامنة السحابية متصلة',
              projectId: parsedConfig?.projectId,
              lastSyncedAt: Date.now(),
            });
          }
        },
        (error) => {
          onStatusChange?.({
            connected: false,
            type: 'firestore',
            status: 'error',
            message: error.message,
            projectId: parsedConfig?.projectId,
            error: error.message,
          });
        }
      );

      unsubscribeSync = () => unsub();
      return unsubscribeSync;
    } catch (err: any) {
      onStatusChange?.({
        connected: false,
        type: 'firestore',
        status: 'error',
        message: err?.message,
        error: err?.message,
      });
      return () => {};
    }
  }

  return () => {};
}


export type QueueTransactionMutator = (state: AppState) => AppState;

/**
 * Atomically mutate the shared queue state. Unlike a blind set(), this retries
 * against the latest cloud value, preventing two devices from overwriting each
 * other's queue actions. Use this for queue-domain mutations (issue/call/transfer/complete).
 */
export async function runQueueTransaction(
  configStr: string,
  mutate: QueueTransactionMutator
): Promise<AppState | null> {
  const config = parseFirebaseConfig(configStr);
  if (!config) return null;

  if (!cachedRtdb && !cachedFirestore) {
    const init = initFirebaseService(configStr);
    if (!init.success) return null;
  }

  try {
    if (config.databaseURL && cachedRtdb) {
      const stateRef = ref(cachedRtdb, 'smart_queue_live_state');
      const result = await runTransaction(stateRef, (current) => {
        const base = (current || {}) as Partial<AppState>;
        const normalized: AppState = {
          ...(defaultStateForTransaction as AppState),
          ...base,
          settings: { ...(defaultStateForTransaction as AppState).settings, ...(base.settings || {}) },
          services: Array.isArray(base.services) ? base.services : [],
          counters: Array.isArray(base.counters) ? base.counters : [],
          tickets: Array.isArray(base.tickets) ? base.tickets : [],
          feedbacks: Array.isArray(base.feedbacks) ? base.feedbacks : [],
          appointments: Array.isArray(base.appointments) ? base.appointments : [],
          notificationLogs: Array.isArray(base.notificationLogs) ? base.notificationLogs : [],
          lastCalled: base.lastCalled ?? null,
        };
        return { ...mutate(normalized), updatedAt: Date.now() };
      });
      return result.committed ? (result.snapshot.val() as AppState) : null;
    }

    if (cachedFirestore) {
      const docRef = doc(cachedFirestore, 'queue_system', 'current_state');
      let committedState: AppState | null = null;
      await runFirestoreTransaction(cachedFirestore, async (tx) => {
        const snap = await tx.get(docRef);
        const base = snap.exists() ? (snap.data() as Partial<AppState>) : {};
        const normalized: AppState = {
          ...(defaultStateForTransaction as AppState),
          ...base,
          settings: { ...(defaultStateForTransaction as AppState).settings, ...(base.settings || {}) },
          services: Array.isArray(base.services) ? base.services : [],
          counters: Array.isArray(base.counters) ? base.counters : [],
          tickets: Array.isArray(base.tickets) ? base.tickets : [],
          feedbacks: Array.isArray(base.feedbacks) ? base.feedbacks : [],
          appointments: Array.isArray(base.appointments) ? base.appointments : [],
          notificationLogs: Array.isArray(base.notificationLogs) ? base.notificationLogs : [],
          lastCalled: base.lastCalled ?? null,
        };
        committedState = { ...mutate(normalized) };
        tx.set(docRef, { ...committedState, updatedAt: Date.now() }, { merge: true });
      });
      return committedState;
    }
  } catch (e) {
    console.warn('Atomic Firebase queue transaction failed:', e);
  }
  return null;
}

// Kept isolated so the transaction helper never depends on the React tree.
const defaultStateForTransaction: Partial<AppState> = {
  settings: {} as SystemSettings,
  services: [], counters: [], tickets: [], lastCalled: null, feedbacks: [], appointments: [], notificationLogs: [],
};

/**
 * بث التحديثات إلى سحابة Firebase عند حدوث أي تغيير محلي (مثل نداء تذكرة، إصدار تذكرة، إلخ)
 * يدعم الاستدعاء بالشكل pushStateToFirebase(configStr, state) أو مباشرة pushStateToFirebase(state)
 */
export async function pushStateToFirebase(arg1: string | AppState, arg2?: AppState): Promise<boolean> {
  let configStr: string;
  let currentState: AppState;

  if (typeof arg1 === 'string') {
    configStr = arg1;
    if (!arg2) return false;
    currentState = arg2;
  } else {
    currentState = arg1;
    configStr = currentState.settings.firebaseConfigStr || '';
  }

  const config = parseFirebaseConfig(configStr);
  if (!config) return false;

  try {
    // تجهيز كائن الحالة للبث (مع استبعاد تفاصيل الاتصال الحساسة إن لزم)
    const payload = {
      tickets: currentState.tickets,
      counters: currentState.counters,
      services: currentState.services,
      lastCalled: currentState.lastCalled,
      updatedAt: Date.now(),
    };

    if (config.databaseURL && cachedRtdb) {
      const stateRef = ref(cachedRtdb, 'smart_queue_live_state');
      await set(stateRef, payload);
      return true;
    } else if (cachedFirestore) {
      const docRef = doc(cachedFirestore, 'queue_system', 'current_state');
      await setDoc(docRef, payload, { merge: true });
      return true;
    } else {
      // محاولة تهيئة سريعة إذا لم تكن مهيأة
      const init = initFirebaseService(configStr);
      if (init.success) {
        return pushStateToFirebase(configStr, currentState);
      }
    }
    return false;
  } catch (e) {
    console.warn('Firebase push failed:', e);
    return false;
  }
}
