import {
  WORKSPACE_LOGIN_PATH,
  WORKSPACE_PRODUCTION_ORIGIN,
  joinUrl,
} from '@super-pro/shared-constants'
import {
  buildLoginRedirectUrl as buildSharedLoginRedirectUrl,
  createAuthSessionStore,
  normalizeAbsoluteUrl,
  redirectToUrl,
} from '@super-pro/shared-web'

const LOGIN_TEMPLATE_AUTH_STORAGE_KEY = 'login-template.auth'

const authSessionStore = createAuthSessionStore({
  storageKey: LOGIN_TEMPLATE_AUTH_STORAGE_KEY,
  enableQueryHandoff: true,
  enableWindowNameHandoff: true,
})

export function getAuthToken(): string | null {
  return authSessionStore.getReusableAuthToken()
}

export function getLoginUrl() {
  const configured = import.meta.env.VITE_STRICT_MENU_LOGIN_URL?.trim()
  return normalizeAbsoluteUrl(
    configured || joinUrl(WORKSPACE_PRODUCTION_ORIGIN, WORKSPACE_LOGIN_PATH),
  )
}

export function buildLoginRedirectUrl(target: string) {
  return buildSharedLoginRedirectUrl(getLoginUrl(), target)
}

export function redirectToLoginPage(target?: string) {
  const redirectTarget =
    target ??
    (typeof window !== 'undefined' ? window.location.href : '')

  return redirectToUrl(
    buildSharedLoginRedirectUrl(getLoginUrl(), redirectTarget, {
      developmentRedirectHandoff:
        target === undefined && import.meta.env.DEV
          ? import.meta.env.VITE_DEV_PROJECT_URL
          : undefined,
    }),
  )
}

export function shouldRedirectToLogin(status: number) {
  return status === 401 || status === 403
}
