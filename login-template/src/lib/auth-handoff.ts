import type { LoginResponse } from '@/lib/auth-client'
import { createStoredAuthSession } from '@/lib/auth-storage'
import type { StoredAuthSession } from '@super-pro/shared-types'

const AUTH_HANDOFF_WINDOW_NAME_KEY = 'super-pro.auth-handoff'
const AUTH_HANDOFF_QUERY_KEY = 'spauth'

type AuthHandoffEnvelope = {
  key: typeof AUTH_HANDOFF_WINDOW_NAME_KEY
  session: ReturnType<typeof createStoredAuthSession>
}

export function writeAuthHandoff(payload: LoginResponse) {
  writeStoredAuthHandoff(createStoredAuthSession(payload))
}

export function writeStoredAuthHandoff(session: StoredAuthSession) {
  if (typeof window === 'undefined') {
    return
  }

  const envelope: AuthHandoffEnvelope = {
    key: AUTH_HANDOFF_WINDOW_NAME_KEY,
    session,
  }

  window.name = JSON.stringify(envelope)
}

export function appendAuthHandoffToUrl(target: string, payload: LoginResponse) {
  return appendStoredAuthHandoffToUrl(target, createStoredAuthSession(payload))
}

export function appendStoredAuthHandoffToUrl(target: string, session: StoredAuthSession) {
  const url = new URL(target)
  url.searchParams.set(
    AUTH_HANDOFF_QUERY_KEY,
    JSON.stringify({
      key: AUTH_HANDOFF_WINDOW_NAME_KEY,
      session,
    } satisfies AuthHandoffEnvelope),
  )
  return url.toString()
}
