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

export function getLoginUrl() {
  const configured = import.meta.env.VITE_LOGIN_URL?.trim();
  return normalizeAbsoluteUrl(
    configured || joinUrl(WORKSPACE_PRODUCTION_ORIGIN, WORKSPACE_LOGIN_PATH),
  );
}

export function buildCurrentPageLoginRedirectUrl() {
  if (typeof window === 'undefined') {
    return getLoginUrl();
  }

  return buildSharedLoginRedirectUrl(
    getLoginUrl(),
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
