import { trimTrailingSlash } from '@super-pro/shared-constants'

export function resolveAuthApiBaseUrl(
  configuredApiBaseUrl: string | undefined,
  isDevelopment: boolean,
) {
  const configured = configuredApiBaseUrl?.trim()

  if (configured) {
    return trimTrailingSlash(configured)
  }

  if (isDevelopment) {
    return ''
  }

  return ''
}

export function resolveAuthApiEndpoint(
  path: string,
  configuredApiBaseUrl: string | undefined,
  isDevelopment: boolean,
) {
  return `${resolveAuthApiBaseUrl(configuredApiBaseUrl, isDevelopment)}${path}`
}
