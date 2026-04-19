import {
  readDevelopmentRedirectHandoff,
  resolveDevelopmentRedirectTarget,
} from '@super-pro/shared-web'

const BLOCKED_PROTOCOL_PATTERN = /^(javascript|data|vbscript):/i
const ABSOLUTE_URL_PATTERN = /^https?:\/\//i
const HOST_LIKE_URL_PATTERN =
  /^(localhost|\d{1,3}(?:\.\d{1,3}){3}|(?:[a-z0-9-]+\.)+[a-z0-9-]+)(?::\d+)?(?:[/?#].*)?$/i

function getCurrentProtocol() {
  if (typeof window !== 'undefined' && window.location.protocol) {
    return window.location.protocol
  }

  return 'http:'
}

function getCurrentOrigin() {
  if (typeof window !== 'undefined' && window.location.origin) {
    return window.location.origin
  }

  return `${getCurrentProtocol()}//localhost`
}

function normalizeRedirectTarget(input: string) {
  const trimmedInput = input.trim()

  if (!trimmedInput || BLOCKED_PROTOCOL_PATTERN.test(trimmedInput)) {
    return null
  }

  if (ABSOLUTE_URL_PATTERN.test(trimmedInput)) {
    const absoluteUrl = new URL(trimmedInput)
    return absoluteUrl.protocol === 'http:' || absoluteUrl.protocol === 'https:'
      ? absoluteUrl.toString()
      : null
  }

  if (trimmedInput.startsWith('//')) {
    return new URL(`${getCurrentProtocol()}${trimmedInput}`).toString()
  }

  if (HOST_LIKE_URL_PATTERN.test(trimmedInput)) {
    return new URL(`${getCurrentProtocol()}//${trimmedInput}`).toString()
  }

  return new URL(trimmedInput, getCurrentOrigin()).toString()
}

export function getRedirectTargetFromLocation(
  search?: string,
  options?: {
    isDevelopment?: boolean
  },
) {
  const resolvedSearch =
    typeof search === 'string' ? search : typeof window !== 'undefined' ? window.location.search : ''

  const searchParams = new URLSearchParams(resolvedSearch)
  const redirectTarget = searchParams.get('redirect')?.trim()
  const normalizedRedirectTarget = redirectTarget ? normalizeRedirectTarget(redirectTarget) : null

  if (!normalizedRedirectTarget) {
    return null
  }

  return resolveDevelopmentRedirectTarget(
    normalizedRedirectTarget,
    readDevelopmentRedirectHandoff(searchParams) ?? undefined,
    options?.isDevelopment ?? import.meta.env.DEV,
  )
}
