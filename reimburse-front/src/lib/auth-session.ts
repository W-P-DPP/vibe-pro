export const AUTH_STORAGE_KEY = 'login-template.auth';
const AUTH_HANDOFF_WINDOW_NAME_KEY = 'super-pro.auth-handoff';
const AUTH_HANDOFF_QUERY_KEY = 'spauth';

export type StoredAuthSession = {
  token: string;
  tokenType: 'Bearer';
  expiresAt?: number;
};

function isExpiredAuthSession(session: StoredAuthSession) {
  return typeof session.expiresAt === 'number' && Number.isFinite(session.expiresAt) && session.expiresAt <= Date.now();
}

function getStorage() {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function consumeWindowNameAuthSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.name?.trim();
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as {
      key?: string;
      session?: unknown;
    };

    if (parsed.key !== AUTH_HANDOFF_WINDOW_NAME_KEY || !isStoredAuthSession(parsed.session)) {
      return null;
    }

    window.name = '';
    return parsed.session;
  } catch {
    return null;
  }
}

function consumeQueryAuthSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const rawValue = params.get(AUTH_HANDOFF_QUERY_KEY)?.trim();
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as {
      key?: string;
      session?: unknown;
    };

    if (parsed.key !== AUTH_HANDOFF_WINDOW_NAME_KEY || !isStoredAuthSession(parsed.session)) {
      return null;
    }

    params.delete(AUTH_HANDOFF_QUERY_KEY);
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
    return parsed.session;
  } catch {
    return null;
  }
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

export function readReusableAuthSession() {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(AUTH_STORAGE_KEY);
  if (rawValue) {
    try {
      const parsed = JSON.parse(rawValue) as unknown;
      if (isStoredAuthSession(parsed) && !isExpiredAuthSession(parsed)) {
        return parsed;
      }
    } catch {
      // Fall through and try one-time auth handoff.
    }

    storage.removeItem(AUTH_STORAGE_KEY);
  }

  const querySession = consumeQueryAuthSession();
  if (querySession && !isExpiredAuthSession(querySession)) {
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(querySession));
    return querySession;
  }

  const handoffSession = consumeWindowNameAuthSession();
  if (!handoffSession || isExpiredAuthSession(handoffSession)) {
    return null;
  }

  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(handoffSession));
  return handoffSession;
}

export function getReusableAuthToken() {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  const directToken = storage.getItem('token')?.trim();
  if (directToken) {
    return directToken;
  }

  return readReusableAuthSession()?.token ?? null;
}

export function hasReusableAuthToken() {
  return Boolean(getReusableAuthToken());
}

export function clearReusableAuthSession() {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(AUTH_STORAGE_KEY);
  storage.removeItem('token');
}
