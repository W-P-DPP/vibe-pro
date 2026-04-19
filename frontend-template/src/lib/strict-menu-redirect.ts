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

export type StrictMenuDevelopmentTargetMapping = {
  productionPrefix: string;
  developmentBaseUrl: string;
};

const STRICT_MENU_TARGET_MAPPING_SEPARATOR = ';';
const STRICT_MENU_TARGET_MAPPING_PAIR_SEPARATOR = '=>';

export function normalizeMenuTargetUrl(target: string) {
  return normalizeAbsoluteUrl(target);
}

export function parseStrictMenuDevelopmentTargetMappings(
  rawValue: string | undefined,
) {
  return (rawValue ?? '')
    .split(STRICT_MENU_TARGET_MAPPING_SEPARATOR)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf(
        STRICT_MENU_TARGET_MAPPING_PAIR_SEPARATOR,
      );

      if (separatorIndex < 0) {
        return null;
      }

      const productionPrefix = normalizeAbsoluteUrl(
        entry.slice(0, separatorIndex).trim(),
      );
      const developmentBaseUrl = normalizeAbsoluteUrl(
        entry
          .slice(separatorIndex + STRICT_MENU_TARGET_MAPPING_PAIR_SEPARATOR.length)
          .trim(),
      );

      if (!productionPrefix || !developmentBaseUrl) {
        return null;
      }

      return {
        productionPrefix,
        developmentBaseUrl,
      } satisfies StrictMenuDevelopmentTargetMapping;
    })
    .filter(
      (
        mapping,
      ): mapping is StrictMenuDevelopmentTargetMapping => mapping !== null,
    )
    .sort(
      (left, right) => right.productionPrefix.length - left.productionPrefix.length,
    );
}

export function getStrictMenuDevelopmentTargetMappings() {
  return parseStrictMenuDevelopmentTargetMappings(
    import.meta.env.VITE_STRICT_MENU_DEV_TARGET_MAPPINGS,
  );
}

export function resolveStrictMenuTargetUrl(
  target: string,
  options?: {
    isDevelopment?: boolean;
    mappings?: StrictMenuDevelopmentTargetMapping[];
  },
) {
  const normalizedTarget = normalizeMenuTargetUrl(target);

  if (!normalizedTarget) {
    return '';
  }

  const isDevelopment = options?.isDevelopment ?? import.meta.env.DEV;

  if (!isDevelopment) {
    return normalizedTarget;
  }

  const mappings =
    options?.mappings ?? getStrictMenuDevelopmentTargetMappings();

  for (const mapping of mappings) {
    if (!normalizedTarget.startsWith(mapping.productionPrefix)) {
      continue;
    }

    return new URL(
      normalizedTarget.slice(mapping.productionPrefix.length),
      mapping.developmentBaseUrl,
    ).toString();
  }

  return normalizedTarget;
}

export function getStrictMenuLoginUrl() {
  const configured = import.meta.env.VITE_STRICT_MENU_LOGIN_URL?.trim();
  return normalizeAbsoluteUrl(
    configured || joinUrl(WORKSPACE_PRODUCTION_ORIGIN, WORKSPACE_LOGIN_PATH),
  );
}

export function buildLoginRedirectUrl(target: string) {
  return buildSharedLoginRedirectUrl(
    getStrictMenuLoginUrl(),
    resolveStrictMenuTargetUrl(target),
  );
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
  const normalizedTarget = resolveStrictMenuTargetUrl(target);

  if (!normalizedTarget) {
    return '';
  }

  return hasReusableAuthToken() ? normalizedTarget : buildLoginRedirectUrl(normalizedTarget);
}
