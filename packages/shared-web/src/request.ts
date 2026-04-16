import axios, { AxiosError } from 'axios';
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

export interface RequestConfig<TData = unknown> extends AxiosRequestConfig<TData> {
  requiresAuth?: boolean;
}

export type AuthAwareInternalRequestConfig<TData = unknown> =
  InternalAxiosRequestConfig<TData> & {
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

export function shouldRedirectToLoginForRequestError(
  status: number | undefined,
  config?: { requiresAuth?: boolean },
) {
  return Boolean(config?.requiresAuth) && (status === 401 || status === 403);
}

export function normalizeAxiosRequestError(
  error: AxiosError<{ message?: string; msg?: string }>,
  fallbackMessage = '请求失败，请稍后重试',
) {
  const responseMessage = error.response?.data?.msg ?? error.response?.data?.message;
  const message = responseMessage ?? error.message ?? fallbackMessage;

  return new RequestError(message, {
    status: error.response?.status,
    code: error.code,
    details: error.response?.data,
  });
}

function handleResponse<T>(response: AxiosResponse<T>) {
  return response.data;
}

type CreateJsonRequestClientOptions = {
  baseURL: string;
  timeout?: number;
  defaultRequiresAuth?: boolean;
  getAccessToken?: () => string | null;
  onUnauthorized?: () => void;
  fallbackMessage?: string;
};

export function createJsonRequestClient(options: CreateJsonRequestClientOptions) {
  const requestClient: AxiosInstance = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeout ?? 15000,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  requestClient.interceptors.request.use((config) => {
    const authConfig = config as AuthAwareInternalRequestConfig;
    const token = options.getAccessToken?.();

    if (token) {
      authConfig.headers.Authorization = `Bearer ${token}`;
    }

    return authConfig;
  });

  requestClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ message?: string; msg?: string }>) => {
      const config = error.config as AuthAwareInternalRequestConfig | undefined;
      if (
        shouldRedirectToLoginForRequestError(error.response?.status, config)
      ) {
        options.onUnauthorized?.();
      }

      return Promise.reject(
        normalizeAxiosRequestError(error, options.fallbackMessage),
      );
    },
  );

  const defaultRequiresAuth = options.defaultRequiresAuth ?? true;

  return {
    requestClient,
    request: {
      get<T>(url: string, config?: RequestConfig) {
        return requestClient
          .get<T>(url, { requiresAuth: defaultRequiresAuth, ...config })
          .then(handleResponse);
      },
      post<TResponse, TPayload = unknown>(
        url: string,
        data?: TPayload,
        config?: RequestConfig<TPayload>,
      ) {
        return requestClient
          .post<TResponse>(url, data, { requiresAuth: defaultRequiresAuth, ...config })
          .then(handleResponse);
      },
      put<TResponse, TPayload = unknown>(
        url: string,
        data?: TPayload,
        config?: RequestConfig<TPayload>,
      ) {
        return requestClient
          .put<TResponse>(url, data, { requiresAuth: defaultRequiresAuth, ...config })
          .then(handleResponse);
      },
      patch<TResponse, TPayload = unknown>(
        url: string,
        data?: TPayload,
        config?: RequestConfig<TPayload>,
      ) {
        return requestClient
          .patch<TResponse>(url, data, { requiresAuth: defaultRequiresAuth, ...config })
          .then(handleResponse);
      },
      delete<TResponse>(url: string, config?: RequestConfig) {
        return requestClient
          .delete<TResponse>(url, { requiresAuth: defaultRequiresAuth, ...config })
          .then(handleResponse);
      },
    },
  };
}
