import type { LoginResponse } from '@/lib/auth-client'
import type { StoredAuthSession } from '@super-pro/shared-types'

export function isExpiredAuthSession(session: StoredAuthSession) {
  return typeof session.expiresAt === 'number' && session.expiresAt <= Date.now()
}

const AUTH_STORAGE_KEY = 'login-template.auth'

function getStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage
}

function isStoredAuthSession(value: unknown): value is StoredAuthSession {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.token === 'string' &&
    candidate.token.length > 0 &&
    candidate.tokenType === 'Bearer' &&
    typeof candidate.expiresAt === 'number' &&
    Number.isFinite(candidate.expiresAt)
  )
}

export function createStoredAuthSession(payload: LoginResponse): StoredAuthSession {
  return {
    token: payload.token,
    tokenType: payload.tokenType,
    expiresAt: Date.now() + payload.expiresIn * 1000,
  }
}

export function saveAuthSession(payload: LoginResponse) {
  const storage = getStorage()
  if (!storage) {
    return
  }

  storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(createStoredAuthSession(payload)))
}

export function readAuthSession(): StoredAuthSession | null {
  const storage = getStorage()
  if (!storage) {
    return null
  }

  const rawValue = storage.getItem(AUTH_STORAGE_KEY)
  if (!rawValue) {
    return null
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown
    return isStoredAuthSession(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function getAuthToken() {
  return readAuthSession()?.token ?? null
}

export function clearAuthSession() {
  const storage = getStorage()
  storage?.removeItem(AUTH_STORAGE_KEY)
}
