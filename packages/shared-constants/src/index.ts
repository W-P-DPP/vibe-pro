export const WORKSPACE_PRODUCTION_ORIGIN = 'http://www.zwpsite.icu:8082';
export const WORKSPACE_LOGIN_PATH = '/login/';

export const ENV_FILE_NAMES = {
  development: '.env.development',
  production: '.env.production',
  developmentExample: '.env.development.example',
  productionExample: '.env.production.example',
} as const;

export function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function joinUrl(baseUrl: string, path: string) {
  const normalizedBaseUrl = trimTrailingSlash(baseUrl.trim());
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBaseUrl}${normalizedPath}`;
}
