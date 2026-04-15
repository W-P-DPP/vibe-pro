import { hasReusableAuthToken } from './auth-session';

const DEFAULT_LOGIN_URL = 'http://www.zwpsite.icu:8082/login/';

function normalizeAbsoluteUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return '';
  }

  try {
    return new URL(trimmed).toString();
  } catch {
    if (typeof window !== 'undefined') {
      return new URL(trimmed, window.location.origin).toString();
    }

    return trimmed;
  }
}

export function getLoginUrl() {
  const configured = import.meta.env.VITE_LOGIN_URL?.trim();
  return normalizeAbsoluteUrl(configured || DEFAULT_LOGIN_URL);
}

export function buildLoginRedirectUrl(target: string) {
  const loginUrl = new URL(getLoginUrl());
  loginUrl.searchParams.set('redirect', target);
  return loginUrl.toString();
}

export function buildCurrentPageLoginRedirectUrl() {
  if (typeof window === 'undefined') {
    return getLoginUrl();
  }

  return buildLoginRedirectUrl(window.location.href);
}

export function redirectToLoginWithCurrentPage() {
  const nextUrl = buildCurrentPageLoginRedirectUrl();

  if (typeof window !== 'undefined') {
    window.location.assign(nextUrl);
  }

  return nextUrl;
}

export function resolveProtectedTargetUrl(target: string) {
  return hasReusableAuthToken() ? target : buildLoginRedirectUrl(target);
}
