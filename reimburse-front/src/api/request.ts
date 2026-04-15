import axios, { AxiosError } from 'axios';
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { getReusableAuthToken } from '@/lib/auth-session';
import { redirectToLoginWithCurrentPage } from '@/lib/login-redirect';

export interface RequestConfig<TData = unknown> extends AxiosRequestConfig<TData> {
  requiresAuth?: boolean;
}

type AuthAwareInternalRequestConfig<TData = unknown> = InternalAxiosRequestConfig<TData> & {
  requiresAuth?: boolean;
};

export class RequestError extends Error {
  status?: number;
  code?: string;
  details?: unknown;

  constructor(message: string, options?: { status?: number; code?: string; details?: unknown }) {
    super(message);
    this.name = 'RequestError';
    this.status = options?.status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

function attachAuthToken(config: AuthAwareInternalRequestConfig) {
  const token = getReusableAuthToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}

function normalizeError(error: AxiosError<{ message?: string; msg?: string }>) {
  const responseMessage = error.response?.data?.msg ?? error.response?.data?.message;
  const message = responseMessage ?? error.message ?? '请求失败，请稍后重试';

  return new RequestError(message, {
    status: error.response?.status,
    code: error.code,
    details: error.response?.data,
  });
}

function handleResponse<T>(response: AxiosResponse<T>) {
  return response.data;
}

function handleResponseError(error: AxiosError<{ message?: string; msg?: string }>) {
  const config = error.config as AuthAwareInternalRequestConfig | undefined;
  if (config?.requiresAuth && (error.response?.status === 401 || error.response?.status === 403)) {
    redirectToLoginWithCurrentPage();
  }

  return Promise.reject(normalizeError(error));
}

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || '/reimburse-api';

export const requestClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

requestClient.interceptors.request.use(attachAuthToken);
requestClient.interceptors.response.use((response) => response, handleResponseError);

export const request = {
  get<T>(url: string, config?: RequestConfig) {
    return requestClient.get<T>(url, { requiresAuth: true, ...config }).then(handleResponse);
  },
  post<TResponse, TPayload = unknown>(
    url: string,
    data?: TPayload,
    config?: RequestConfig<TPayload>,
  ) {
    return requestClient
      .post<TResponse>(url, data, { requiresAuth: true, ...config })
      .then(handleResponse);
  },
  put<TResponse, TPayload = unknown>(
    url: string,
    data?: TPayload,
    config?: RequestConfig<TPayload>,
  ) {
    return requestClient
      .put<TResponse>(url, data, { requiresAuth: true, ...config })
      .then(handleResponse);
  },
  delete<TResponse>(url: string, config?: RequestConfig) {
    return requestClient
      .delete<TResponse>(url, { requiresAuth: true, ...config })
      .then(handleResponse);
  },
};
