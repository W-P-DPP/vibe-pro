import axios, { AxiosError } from 'axios'
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { getReusableAuthToken } from '@/lib/auth-session'
import { redirectToLoginWithCurrentPage } from '@/lib/strict-menu-redirect'

export interface RequestConfig<TData = unknown> extends AxiosRequestConfig<TData> {
  requiresAuth?: boolean
}

type AuthAwareInternalRequestConfig<TData = unknown> = InternalAxiosRequestConfig<TData> & {
  requiresAuth?: boolean
}

export class RequestError extends Error {
  status?: number
  code?: string
  details?: unknown

  constructor(message: string, options?: { status?: number; code?: string; details?: unknown }) {
    super(message)
    this.name = 'RequestError'
    this.status = options?.status
    this.code = options?.code
    this.details = options?.details
  }
}

function attachAuthToken(config: AuthAwareInternalRequestConfig) {
  const token = getReusableAuthToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
}

export function shouldRedirectToLoginForRequestError(
  status: number | undefined,
  config?: { requiresAuth?: boolean },
) {
  return Boolean(config?.requiresAuth) && (status === 401 || status === 403)
}

function normalizeError(error: AxiosError<{ message?: string; msg?: string }>) {
  const responseMessage = error.response?.data?.msg ?? error.response?.data?.message
  const message =
    responseMessage ?? error.message ?? '请求失败，请稍后重试。'

  return new RequestError(message, {
    status: error.response?.status,
    code: error.code,
    details: error.response?.data,
  })
}

function handleResponse<T>(response: AxiosResponse<T>) {
  return response.data
}

function handleResponseError(error: AxiosError<{ message?: string; msg?: string }>) {
  if (
    shouldRedirectToLoginForRequestError(
      error.response?.status,
      error.config as AuthAwareInternalRequestConfig | undefined,
    )
  ) {
    redirectToLoginWithCurrentPage()
  }

  return Promise.reject(normalizeError(error))
}

const baseURL =
  import.meta.env.VITE_API_BASE_URL?.trim() || '/api'

export const requestClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

requestClient.interceptors.request.use(attachAuthToken)
requestClient.interceptors.response.use(
  (response) => response,
  handleResponseError,
)

export const request = {
  get<T>(url: string, config?: RequestConfig) {
    return requestClient.get<T>(url, config).then(handleResponse)
  },
  post<TResponse, TPayload = unknown>(
    url: string,
    data?: TPayload,
    config?: RequestConfig<TPayload>,
  ) {
    return requestClient.post<TResponse>(url, data, config).then(handleResponse)
  },
  put<TResponse, TPayload = unknown>(
    url: string,
    data?: TPayload,
    config?: RequestConfig<TPayload>,
  ) {
    return requestClient.put<TResponse>(url, data, config).then(handleResponse)
  },
  patch<TResponse, TPayload = unknown>(
    url: string,
    data?: TPayload,
    config?: RequestConfig<TPayload>,
  ) {
    return requestClient.patch<TResponse>(url, data, config).then(handleResponse)
  },
  delete<T>(url: string, config?: RequestConfig) {
    return requestClient.delete<T>(url, config).then(handleResponse)
  },
}
