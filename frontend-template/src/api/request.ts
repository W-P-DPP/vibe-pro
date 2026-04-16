import {
  createJsonRequestClient,
  type RequestConfig,
  RequestError,
  shouldRedirectToLoginForRequestError,
} from '@super-pro/shared-web';
import { getReusableAuthToken } from '@/lib/auth-session';
import { redirectToLoginWithCurrentPage } from '@/lib/strict-menu-redirect';

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || '/api';

const client = createJsonRequestClient({
  baseURL,
  timeout: 10000,
  getAccessToken: getReusableAuthToken,
  onUnauthorized: redirectToLoginWithCurrentPage,
  defaultRequiresAuth: false,
});

export { RequestError, shouldRedirectToLoginForRequestError, type RequestConfig };
export const requestClient = client.requestClient;
export const request = client.request;
