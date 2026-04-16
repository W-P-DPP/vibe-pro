import {
  WORKSPACE_LOGIN_PATH,
  WORKSPACE_PRODUCTION_ORIGIN,
  joinUrl,
} from '@super-pro/shared-constants';
import {
  buildLoginRedirectUrl as buildSharedLoginRedirectUrl,
  normalizeAbsoluteUrl,
  redirectToUrl,
} from '@super-pro/shared-web';
import { hasReusableAuthToken } from './auth-session';

export function getLoginUrl() {
  const configured = import.meta.env.VITE_LOGIN_URL?.trim();
  return normalizeAbsoluteUrl(
    configured || joinUrl(WORKSPACE_PRODUCTION_ORIGIN, WORKSPACE_LOGIN_PATH),
  );
}

export function buildLoginRedirectUrl(target: string) {
  return buildSharedLoginRedirectUrl(getLoginUrl(), target);
}

export function buildCurrentPageLoginRedirectUrl() {
  if (typeof window === 'undefined') {
    return getLoginUrl();
  }

  return buildLoginRedirectUrl(window.location.href);
}

export function redirectToLoginWithCurrentPage() {
  return redirectToUrl(buildCurrentPageLoginRedirectUrl());
}

export function resolveProtectedTargetUrl(target: string) {
  return hasReusableAuthToken() ? target : buildLoginRedirectUrl(target);
}
