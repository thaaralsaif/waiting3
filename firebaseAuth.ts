import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
  Auth,
} from 'firebase/auth';
import { getApps, initializeApp } from 'firebase/app';
import { parseFirebaseConfig } from './firebaseService';

export type UserRole = 'admin' | 'supervisor' | 'staff' | 'viewer' | null;

let cachedAuth: Auth | null = null;

function ensureAuth(configStr: string): Auth | null {
  const config = parseFirebaseConfig(configStr);
  if (!config) return null;
  try {
    const appName = 'smart-queue-user-client';
    const app = getApps().find((a) => a.name === appName) || initializeApp(config, appName);
    cachedAuth = cachedAuth || getAuth(app);
    return cachedAuth;
  } catch {
    return null;
  }
}

export function subscribeToAuthState(
  configStr: string,
  callback: (user: User | null, role: UserRole) => void
): () => void {
  const auth = ensureAuth(configStr);
  if (!auth) {
    callback(null, null);
    return () => {};
  }

  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      callback(null, null);
      return;
    }
    try {
      const token = await user.getIdTokenResult();
      const rawRole = token.claims.role;
      const role: UserRole = ['admin', 'supervisor', 'staff', 'viewer'].includes(String(rawRole))
        ? (rawRole as UserRole)
        : null;
      callback(user, role);
    } catch {
      callback(user, null);
    }
  });
}

export async function signInUser(configStr: string, email: string, password: string) {
  const auth = ensureAuth(configStr);
  if (!auth) throw new Error('Firebase Authentication غير مهيأ. تحقق من إعدادات Firebase.');
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const token = await credential.user.getIdTokenResult(true);
  const rawRole = token.claims.role;
  const role: UserRole = ['admin', 'supervisor', 'staff', 'viewer'].includes(String(rawRole))
    ? (rawRole as UserRole)
    : null;
  return { user: credential.user, role };
}

export async function signOutUser() {
  if (cachedAuth) await signOut(cachedAuth);
}

export function getAuthInstance(configStr: string): Auth | null {
  return ensureAuth(configStr);
}
