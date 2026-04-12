const DEFAULT_LOGIN_URL = 'http://www.zwpsite.icu:8082/login'
const LOGIN_TEMPLATE_AUTH_STORAGE_KEY = 'login-template.auth'
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i
const HOST_LIKE_URL_PATTERN =
  /^(localhost|\d{1,3}(?:\.\d{1,3}){3}|(?:[a-z0-9-]+\.)+[a-z0-9-]+)(?::\d+)?(?:[/?#].*)?$/i

export type StoredAuthSession = {
  token: string
  tokenType: 'Bearer'
  expiresAt?: number
}

function getCurrentProtocol() {
  if (typeof window !== 'undefined' && window.location.protocol) {
    return window.location.protocol
  }

  return 'http:'
}

function normalizeAbsoluteUrl(input: string) {
  const trimmedInput = input.trim()

  if (!trimmedInput) {
    return ''
  }

  if (ABSOLUTE_URL_PATTERN.test(trimmedInput)) {
    return new URL(trimmedInput).toString()
  }

  if (trimmedInput.startsWith('//')) {
    return new URL(`${getCurrentProtocol()}${trimmedInput}`).toString()
  }

  if (HOST_LIKE_URL_PATTERN.test(trimmedInput)) {
    return new URL(`${getCurrentProtocol()}//${trimmedInput}`).toString()
  }

  if (trimmedInput.startsWith('/')) {
    if (typeof window === 'undefined') {
      return trimmedInput
    }

    return new URL(trimmedInput, window.location.origin).toString()
  }

  return trimmedInput
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

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const directToken = window.localStorage.getItem('token')?.trim()
  if (directToken) {
    return directToken
  }

  const loginSession = window.localStorage.getItem(LOGIN_TEMPLATE_AUTH_STORAGE_KEY)
  if (!loginSession) {
    return null
  }

  try {
    const parsed = JSON.parse(loginSession) as unknown
    return isStoredAuthSession(parsed) ? parsed.token : null
  } catch {
    return null
  }
}

export function getLoginUrl() {
  const configured = import.meta.env.VITE_STRICT_MENU_LOGIN_URL?.trim()
  return normalizeAbsoluteUrl(configured || DEFAULT_LOGIN_URL)
}

export function buildLoginRedirectUrl(target: string) {
  const loginUrl = getLoginUrl()
  const normalizedTarget = normalizeAbsoluteUrl(target)

  if (!normalizedTarget) {
    return loginUrl
  }

  const url = new URL(loginUrl)
  url.searchParams.set('redirect', normalizedTarget)
  return url.toString()
}

export function redirectToLoginPage(target?: string) {
  const nextUrl = buildLoginRedirectUrl(
    target ?? (typeof window !== 'undefined' ? window.location.href : ''),
  )

  if (typeof window !== 'undefined') {
    window.location.assign(nextUrl)
  }

  return nextUrl
}

export function shouldRedirectToLogin(status: number) {
  return status === 401 || status === 403
}
