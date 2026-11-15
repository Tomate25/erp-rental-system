export const AUTH_TOKEN_KEY = 'token';
export const AUTH_USER_KEY = 'user';
export const AUTH_REMEMBER_KEY = 'bismark_remember_me';
export const AUTH_LAST_ACTIVITY_KEY = 'bismark_last_activity';

export const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos de inactividad sin "Recordarme"
export const REMEMBERED_IDLE_TIMEOUT_MS = 12 * 60 * 60 * 1000; // 12 horas de inactividad con "Recordarme"

export interface StoredAuthUser {
  id: string;
  email: string;
  nombre: string;
  apellido?: string | null;
  empresaId: string;
  sucursalId?: string | null;
  roles?: string[];
  requiereCambioPassword?: boolean;
}

function getStorage(kind: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function isRememberedSession(): boolean {
  const local = getStorage('local');
  return local?.getItem(AUTH_REMEMBER_KEY) === 'true';
}

function getActiveStorage(): Storage | null {
  const local = getStorage('local');
  const session = getStorage('session');

  if (session?.getItem(AUTH_TOKEN_KEY) || session?.getItem(AUTH_USER_KEY)) {
    return session;
  }
  if (
    local?.getItem(AUTH_REMEMBER_KEY) === 'true' ||
    local?.getItem(AUTH_TOKEN_KEY) ||
    local?.getItem(AUTH_USER_KEY)
  ) {
    return local;
  }
  return session ?? local;
}

export function getAuthToken(): string | null {
  const session = getStorage('session');
  const sessionToken = session?.getItem(AUTH_TOKEN_KEY);
  if (sessionToken) {
    return sessionToken;
  }
  const local = getStorage('local');
  return local?.getItem(AUTH_TOKEN_KEY) ?? null;
}

export function getStoredUserRaw(): string | null {
  const session = getStorage('session');
  const sessionUser = session?.getItem(AUTH_USER_KEY);
  if (sessionUser) {
    return sessionUser;
  }
  const local = getStorage('local');
  return local?.getItem(AUTH_USER_KEY) ?? null;
}

export function getStoredUser<T = StoredAuthUser>(): T | null {
  const raw = getStoredUserRaw();
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function setAuthSession(
  token: string,
  user: unknown,
  rememberMe = false,
): void {
  clearAuthSession();

  const target = rememberMe ? getStorage('local') : getStorage('session');
  if (!target) {
    return;
  }

  target.setItem(AUTH_TOKEN_KEY, token);
  target.setItem(AUTH_USER_KEY, JSON.stringify(user));
  target.setItem(AUTH_LAST_ACTIVITY_KEY, String(Date.now()));

  if (rememberMe) {
    getStorage('local')?.setItem(AUTH_REMEMBER_KEY, 'true');
  }
}

export function updateAuthToken(token: string): void {
  const target = isRememberedSession()
    ? getStorage('local')
    : getActiveStorage();
  if (!target) {
    return;
  }
  target.setItem(AUTH_TOKEN_KEY, token);
  target.setItem(AUTH_LAST_ACTIVITY_KEY, String(Date.now()));
}

export function updateStoredUser(user: unknown): void {
  const target = isRememberedSession()
    ? getStorage('local')
    : getActiveStorage();
  if (!target) {
    return;
  }
  target.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuthSession(): void {
  for (const kind of ['local', 'session'] as const) {
    const storage = getStorage(kind);
    if (!storage) continue;
    storage.removeItem(AUTH_TOKEN_KEY);
    storage.removeItem(AUTH_USER_KEY);
    storage.removeItem(AUTH_REMEMBER_KEY);
    storage.removeItem(AUTH_LAST_ACTIVITY_KEY);
  }
}

export function touchActivity(now = Date.now()): void {
  const storage = getActiveStorage();
  if (!storage) {
    return;
  }
  if (!storage.getItem(AUTH_TOKEN_KEY) && !storage.getItem(AUTH_USER_KEY)) {
    return;
  }
  storage.setItem(AUTH_LAST_ACTIVITY_KEY, String(now));
}

export function getLastActivityAt(): number | null {
  const storage = getActiveStorage();
  const raw = storage?.getItem(AUTH_LAST_ACTIVITY_KEY);
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getIdleTimeoutMs(): number {
  return isRememberedSession() ? REMEMBERED_IDLE_TIMEOUT_MS : IDLE_TIMEOUT_MS;
}

export function isSessionIdleExpired(now = Date.now()): boolean {
  const lastActivity = getLastActivityAt();
  if (lastActivity === null) {
    return false;
  }
  return now - lastActivity > getIdleTimeoutMs();
}
