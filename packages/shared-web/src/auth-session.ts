import type { StoredAuthSession } from '@super-pro/shared-types';

type AuthSessionOptions = {
  storageKey: string;
  directTokenStorageKey?: string;
  handoffWindowNameKey?: string;
  handoffQueryKey?: string;
  enableQueryHandoff?: boolean;
  enableWindowNameHandoff?: boolean;
};

function isExpiredAuthSession(session: StoredAuthSession) {
  return (
    typeof session.expiresAt === 'number' &&
    Number.isFinite(session.expiresAt) &&
    session.expiresAt <= Date.now()
  );
}

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

export function isStoredAuthSession(value: unknown): value is StoredAuthSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.token === 'string' &&
    candidate.token.length > 0 &&
    candidate.tokenType === 'Bearer' &&
    (candidate.expiresAt == null || typeof candidate.expiresAt === 'number')
  );
}

function consumeWindowNameAuthSession(options: Required<AuthSessionOptions>) {
  if (typeof window === 'undefined' || !options.enableWindowNameHandoff) {
    return null;
  }

  const rawValue = window.name?.trim();
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as { key?: string; session?: unknown };

    if (
      parsed.key !== options.handoffWindowNameKey ||
      !isStoredAuthSession(parsed.session)
    ) {
      return null;
    }

    window.name = '';
    return parsed.session;
  } catch {
    return null;
  }
}

function consumeQueryAuthSession(options: Required<AuthSessionOptions>) {
  if (typeof window === 'undefined' || !options.enableQueryHandoff) {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const rawValue = params.get(options.handoffQueryKey)?.trim();
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as { key?: string; session?: unknown };

    if (
      parsed.key !== options.handoffWindowNameKey ||
      !isStoredAuthSession(parsed.session)
    ) {
      return null;
    }

    params.delete(options.handoffQueryKey);
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
    return parsed.session;
  } catch {
    return null;
  }
}

export function createAuthSessionStore(options: AuthSessionOptions) {
  const normalizedOptions: Required<AuthSessionOptions> = {
    directTokenStorageKey: 'token',
    enableQueryHandoff: false,
    enableWindowNameHandoff: false,
    handoffWindowNameKey: 'super-pro.auth-handoff',
    handoffQueryKey: 'spauth',
    ...options,
  };

  function readReusableAuthSession() {
    const storage = getStorage();
    if (!storage) {
      return null;
    }

    const rawValue = storage.getItem(normalizedOptions.storageKey);
    if (rawValue) {
      try {
        const parsed = JSON.parse(rawValue) as unknown;
        if (isStoredAuthSession(parsed) && !isExpiredAuthSession(parsed)) {
          return parsed;
        }
      } catch {}

      storage.removeItem(normalizedOptions.storageKey);
    }

    const querySession = consumeQueryAuthSession(normalizedOptions);
    if (querySession && !isExpiredAuthSession(querySession)) {
      storage.setItem(normalizedOptions.storageKey, JSON.stringify(querySession));
      return querySession;
    }

    const handoffSession = consumeWindowNameAuthSession(normalizedOptions);
    if (!handoffSession || isExpiredAuthSession(handoffSession)) {
      return null;
    }

    storage.setItem(normalizedOptions.storageKey, JSON.stringify(handoffSession));
    return handoffSession;
  }

  function getReusableAuthToken() {
    const storage = getStorage();
    if (!storage) {
      return null;
    }

    const directToken = storage.getItem(normalizedOptions.directTokenStorageKey)?.trim();
    if (directToken) {
      return directToken;
    }

    return readReusableAuthSession()?.token ?? null;
  }

  function hasReusableAuthToken() {
    return Boolean(getReusableAuthToken());
  }

  function clearReusableAuthSession() {
    const storage = getStorage();
    if (!storage) {
      return;
    }

    storage.removeItem(normalizedOptions.storageKey);
    storage.removeItem(normalizedOptions.directTokenStorageKey);
  }

  return {
    readReusableAuthSession,
    getReusableAuthToken,
    hasReusableAuthToken,
    clearReusableAuthSession,
  };
}
