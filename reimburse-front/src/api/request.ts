import {
  createJsonRequestClient,
  type RequestConfig,
  RequestError,
} from '@super-pro/shared-web';
import { getReusableAuthToken } from '@/lib/auth-session';
import { redirectToLoginWithCurrentPage } from '@/lib/login-redirect';

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || '/reimburse-api';

const client = createJsonRequestClient({
  baseURL,
  getAccessToken: getReusableAuthToken,
  onUnauthorized: redirectToLoginWithCurrentPage,
  defaultRequiresAuth: true,
});

export { RequestError, type RequestConfig };
export const requestClient = client.requestClient;
export const request = client.request;
