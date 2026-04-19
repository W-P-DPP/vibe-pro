import {
  WORKSPACE_LOGIN_PATH,
  WORKSPACE_PRODUCTION_ORIGIN,
  joinUrl,
} from '@super-pro/shared-constants';

const ABSOLUTE_URL_PATTERN = /^https?:\/\//i;
const HOST_LIKE_URL_PATTERN =
  /^(localhost|\d{1,3}(?:\.\d{1,3}){3}|(?:[a-z0-9-]+\.)+[a-z0-9-]+)(?::\d+)?(?:[/?#].*)?$/i;
const DEVELOPMENT_REDIRECT_HANDOFF_PARAM = 'spdev';

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

function normalizeHttpUrl(input: string | undefined) {
  const normalizedInput = normalizeAbsoluteUrl(input?.trim() ?? '');

  if (!normalizedInput) {
    return '';
  }

  try {
    const url = new URL(normalizedInput);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.toString()
      : '';
  } catch {
    return '';
  }
}

export function resolveDevelopmentRedirectTarget(
  target: string,
  developmentProjectUrl: string | undefined,
  isDevelopment: boolean,
) {
  const normalizedTarget = normalizeHttpUrl(target);

  if (!normalizedTarget) {
    return '';
  }

  if (!isDevelopment) {
    return normalizedTarget;
  }

  const normalizedDevelopmentProjectUrl = normalizeHttpUrl(developmentProjectUrl);

  if (!normalizedDevelopmentProjectUrl) {
    return normalizedTarget;
  }

  const targetUrl = new URL(normalizedTarget);
  const developmentProjectTarget = new URL(normalizedDevelopmentProjectUrl);

  return new URL(
    `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`,
    developmentProjectTarget,
  ).toString();
}

export function readDevelopmentRedirectHandoff(
  search: string | URLSearchParams | undefined,
) {
  const searchParams =
    typeof search === 'string'
      ? new URLSearchParams(search)
      : search ?? new URLSearchParams();
  return (
    normalizeHttpUrl(
      searchParams.get(DEVELOPMENT_REDIRECT_HANDOFF_PARAM)?.trim() ?? '',
    ) || null
  );
}

export function buildLoginRedirectUrl(
  loginUrl: string,
  target: string,
  options?: {
    developmentRedirectHandoff?: string | undefined;
  },
) {
  const url = new URL(normalizeAbsoluteUrl(loginUrl));
  const normalizedTarget = normalizeAbsoluteUrl(target.trim());

  if (normalizedTarget) {
    url.searchParams.set('redirect', normalizedTarget);
  }

  const normalizedDevelopmentRedirectHandoff = normalizeHttpUrl(
    options?.developmentRedirectHandoff,
  );

  if (normalizedDevelopmentRedirectHandoff) {
    url.searchParams.set(
      DEVELOPMENT_REDIRECT_HANDOFF_PARAM,
      normalizedDevelopmentRedirectHandoff,
    );
  }

  return url.toString();
}

export function redirectToUrl(target: string) {
  if (typeof window !== 'undefined') {
    window.location.assign(target);
  }

  return target;
}
