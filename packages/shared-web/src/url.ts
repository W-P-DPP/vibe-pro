import {
  WORKSPACE_LOGIN_PATH,
  WORKSPACE_PRODUCTION_ORIGIN,
  joinUrl,
} from '@super-pro/shared-constants';

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;
const HOST_LIKE_URL_PATTERN =
  /^(localhost|\d{1,3}(?:\.\d{1,3}){3}|(?:[a-z0-9-]+\.)+[a-z0-9-]+)(?::\d+)?(?:[/?#].*)?$/i;

function getCurrentProtocol() {
  if (typeof window !== 'undefined' && window.location.protocol) {
    return window.location.protocol;
  }

  return 'http:';
}

export function normalizeAbsoluteUrl(input: string) {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return '';
  }

  if (ABSOLUTE_URL_PATTERN.test(trimmedInput)) {
    return new URL(trimmedInput).toString();
  }

  if (trimmedInput.startsWith('//')) {
    return new URL(`${getCurrentProtocol()}${trimmedInput}`).toString();
  }

  if (HOST_LIKE_URL_PATTERN.test(trimmedInput)) {
    return new URL(`${getCurrentProtocol()}//${trimmedInput}`).toString();
  }

  if (trimmedInput.startsWith('/')) {
    if (typeof window === 'undefined') {
      return trimmedInput;
    }

    return new URL(trimmedInput, window.location.origin).toString();
  }

  return trimmedInput;
}

export function getDefaultLoginUrl() {
  return joinUrl(WORKSPACE_PRODUCTION_ORIGIN, WORKSPACE_LOGIN_PATH);
}

export function buildLoginRedirectUrl(loginUrl: string, target: string) {
  const url = new URL(normalizeAbsoluteUrl(loginUrl));
  if (target.trim()) {
    url.searchParams.set('redirect', normalizeAbsoluteUrl(target));
  }
  return url.toString();
}

export function redirectToUrl(target: string) {
  if (typeof window !== 'undefined') {
    window.location.assign(target);
  }

  return target;
}
