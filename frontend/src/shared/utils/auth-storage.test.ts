import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_REMEMBER_KEY,
  IDLE_TIMEOUT_MS,
  REMEMBERED_IDLE_TIMEOUT_MS,
  clearAuthSession,
  getAuthToken,
  getStoredUser,
  isRememberedSession,
  isSessionIdleExpired,
  setAuthSession,
  touchActivity,
  updateAuthToken,
  updateStoredUser,
} from './auth-storage';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

describe('auth-storage', () => {
  const sampleUser = {
    id: 'usr-1',
    email: 'admin@bm.com',
    nombre: 'Admin',
    empresaId: 'emp-1',
    roles: ['ADMIN'],
  };

  let localStorageMock: MemoryStorage;
  let sessionStorageMock: MemoryStorage;

  beforeEach(() => {
    localStorageMock = new MemoryStorage();
    sessionStorageMock = new MemoryStorage();
    vi.stubGlobal('window', {
      localStorage: localStorageMock,
      sessionStorage: sessionStorageMock,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('guarda la sesión en sessionStorage por defecto cuando rememberMe es false', () => {
    setAuthSession('tok-session', sampleUser, false);

    expect(isRememberedSession()).toBe(false);
    expect(sessionStorageMock.getItem('token')).toBe('tok-session');
    expect(localStorageMock.getItem('token')).toBeNull();
    expect(localStorageMock.getItem(AUTH_REMEMBER_KEY)).toBeNull();
    expect(getAuthToken()).toBe('tok-session');
    expect(getStoredUser()?.email).toBe('admin@bm.com');
  });

  it('guarda la sesión en localStorage cuando rememberMe es true y limpia sessionStorage', () => {
    setAuthSession('tok-old', sampleUser, false);
    setAuthSession('tok-remembered', sampleUser, true);

    expect(isRememberedSession()).toBe(true);
    expect(sessionStorageMock.getItem('token')).toBeNull();
    expect(localStorageMock.getItem('token')).toBe('tok-remembered');
    expect(localStorageMock.getItem(AUTH_REMEMBER_KEY)).toBe('true');
    expect(getAuthToken()).toBe('tok-remembered');
  });

  it('actualiza token y usuario en el almacenamiento activo correspondiente', () => {
    setAuthSession('tok-1', sampleUser, false);
    updateAuthToken('tok-2');
    updateStoredUser({ ...sampleUser, nombre: 'Actualizado' });

    expect(sessionStorageMock.getItem('token')).toBe('tok-2');
    expect(localStorageMock.getItem('token')).toBeNull();
    expect(getStoredUser()?.nombre).toBe('Actualizado');

    clearAuthSession();
    expect(getAuthToken()).toBeNull();
    expect(getStoredUser()).toBeNull();
  });

  it('detecta expiración por inactividad respetando modo normal vs Recordarme', () => {
    const start = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(start);
    setAuthSession('tok-1', sampleUser, false);

    expect(isSessionIdleExpired(start + IDLE_TIMEOUT_MS - 1000)).toBe(false);
    expect(isSessionIdleExpired(start + IDLE_TIMEOUT_MS + 1)).toBe(true);

    touchActivity(start + IDLE_TIMEOUT_MS);
    expect(isSessionIdleExpired(start + IDLE_TIMEOUT_MS + 5000)).toBe(false);

    setAuthSession('tok-rem', sampleUser, true);
    expect(isSessionIdleExpired(start + IDLE_TIMEOUT_MS + 60_000)).toBe(false);
    expect(isSessionIdleExpired(start + REMEMBERED_IDLE_TIMEOUT_MS + 1)).toBe(true);
  });
});
