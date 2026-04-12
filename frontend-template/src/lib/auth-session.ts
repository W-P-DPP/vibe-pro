export const LOGIN_TEMPLATE_AUTH_STORAGE_KEY = 'login-template.auth'

export type StoredAuthSession = {
  token: string
  tokenType: 'Bearer'
  expiresAt?: number
}

function getStorage() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage
}

export function isStoredAuthSession(value: unknown): value is StoredAuthSession {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.token === 'string' &&
    candidate.token.length > 0 &&
    candidate.tokenType === 'Bearer' &&
    (candidate.expiresAt == null || typeof candidate.expiresAt === 'number')
  )
}

export function readReusableAuthSession() {
  const storage = getStorage()
  if (!storage) {
    return null
  }

  const rawValue = storage.getItem(LOGIN_TEMPLATE_AUTH_STORAGE_KEY)
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

export function getReusableAuthToken() {
  const storage = getStorage()
  if (!storage) {
    return null
  }

  const directToken = storage.getItem('token')?.trim()
  if (directToken) {
    return directToken
  }

  return readReusableAuthSession()?.token ?? null
}

export function hasReusableAuthToken() {
  return Boolean(getReusableAuthToken())
}
