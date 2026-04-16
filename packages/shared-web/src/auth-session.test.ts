import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAuthSessionStore, isStoredAuthSession } from './index.ts';

type MemoryStorage = Storage & { clear(): void };

function createMemoryStorage(): MemoryStorage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

const originalWindow = globalThis.window;

describe('shared-web auth session helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalWindow === undefined) {
      delete (globalThis as typeof globalThis & { window?: Window }).window;
      return;
    }

    vi.stubGlobal('window', originalWindow);
  });

  it('prefers a direct token when one is present', () => {
    const localStorage = createMemoryStorage();
    localStorage.setItem('token', 'direct-token');
    vi.stubGlobal('window', { localStorage });

    const store = createAuthSessionStore({ storageKey: 'login-template.auth' });

    expect(store.getReusableAuthToken()).toBe('direct-token');
    expect(store.hasReusableAuthToken()).toBe(true);
  });

  it('reads a reusable session from storage and clears it on request', () => {
    const localStorage = createMemoryStorage();
    localStorage.setItem(
      'login-template.auth',
      JSON.stringify({
        token: 'session-token',
        tokenType: 'Bearer',
        expiresAt: Date.now() + 60_000,
      }),
    );
    vi.stubGlobal('window', { localStorage });

    const store = createAuthSessionStore({ storageKey: 'login-template.auth' });

    expect(store.readReusableAuthSession()).toEqual({
      token: 'session-token',
      tokenType: 'Bearer',
      expiresAt: expect.any(Number),
    });

    store.clearReusableAuthSession();
    expect(store.getReusableAuthToken()).toBeNull();
  });

  it('validates stored auth session payloads', () => {
    expect(isStoredAuthSession({ token: 'abc', tokenType: 'Bearer' })).toBe(true);
    expect(isStoredAuthSession({ token: 'abc', tokenType: 'Basic' })).toBe(false);
    expect(isStoredAuthSession({ tokenType: 'Bearer' })).toBe(false);
  });
});
