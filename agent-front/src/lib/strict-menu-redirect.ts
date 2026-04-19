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

export function normalizeMenuTargetUrl(target: string) {
  return normalizeAbsoluteUrl(target);
}

export function getStrictMenuLoginUrl() {
  const configured = import.meta.env.VITE_STRICT_MENU_LOGIN_URL?.trim();
  return normalizeAbsoluteUrl(
    configured || joinUrl(WORKSPACE_PRODUCTION_ORIGIN, WORKSPACE_LOGIN_PATH),
  );
}

export function buildLoginRedirectUrl(target: string) {
  const normalizedTarget = normalizeMenuTargetUrl(target);
  return buildSharedLoginRedirectUrl(getStrictMenuLoginUrl(), normalizedTarget);
}

export function buildStrictMenuLoginRedirectUrl(target: string) {
  return buildLoginRedirectUrl(target);
}

export function buildCurrentPageLoginRedirectUrl() {
  if (typeof window === 'undefined') {
    return getStrictMenuLoginUrl();
  }

  return buildSharedLoginRedirectUrl(
    getStrictMenuLoginUrl(),
    window.location.href,
    {
      developmentRedirectHandoff: import.meta.env.DEV
        ? import.meta.env.VITE_DEV_PROJECT_URL
        : undefined,
    },
  );
}

export function redirectToLoginWithCurrentPage() {
  return redirectToUrl(buildCurrentPageLoginRedirectUrl());
}

export function resolveStrictMenuNavigationUrl(target: string) {
  const normalizedTarget = normalizeMenuTargetUrl(target);

  if (!normalizedTarget) {
    return '';
  }

  return hasReusableAuthToken() ? normalizedTarget : buildLoginRedirectUrl(normalizedTarget);
}
