import { hasReusableAuthToken } from './auth-session'

const DEFAULT_STRICT_MENU_LOGIN_URL = 'http://www.zwpsite.icu:8082/login'

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i
const HOST_LIKE_URL_PATTERN =
  /^(localhost|\d{1,3}(?:\.\d{1,3}){3}|(?:[a-z0-9-]+\.)+[a-z0-9-]+)(?::\d+)?(?:[/?#].*)?$/i

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

export function normalizeMenuTargetUrl(target: string) {
  return normalizeAbsoluteUrl(target)
}

export function getStrictMenuLoginUrl() {
  const configured = import.meta.env.VITE_STRICT_MENU_LOGIN_URL?.trim()
  return normalizeAbsoluteUrl(configured || DEFAULT_STRICT_MENU_LOGIN_URL)
}

export function buildLoginRedirectUrl(target: string) {
  const loginUrl = getStrictMenuLoginUrl()
  const normalizedTarget = normalizeMenuTargetUrl(target)

  if (!normalizedTarget) {
    return loginUrl
  }

  const url = new URL(loginUrl)
  url.searchParams.set('redirect', normalizedTarget)
  return url.toString()
}

export function buildStrictMenuLoginRedirectUrl(target: string) {
  return buildLoginRedirectUrl(target)
}

export function buildCurrentPageLoginRedirectUrl() {
  if (typeof window === 'undefined') {
    return getStrictMenuLoginUrl()
  }

  return buildLoginRedirectUrl(window.location.href)
}

export function redirectToLoginWithCurrentPage() {
  const nextUrl = buildCurrentPageLoginRedirectUrl()

  if (typeof window !== 'undefined') {
    window.location.assign(nextUrl)
  }

  return nextUrl
}

export function resolveStrictMenuNavigationUrl(target: string) {
  const normalizedTarget = normalizeMenuTargetUrl(target)

  if (!normalizedTarget) {
    return ''
  }

  return hasReusableAuthToken() ? normalizedTarget : buildLoginRedirectUrl(normalizedTarget)
}
