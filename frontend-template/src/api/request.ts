import axios, { AxiosError } from 'axios'
import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'

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

function attachAuthToken(config: InternalAxiosRequestConfig) {
  const token = localStorage.getItem('token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
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
  (error: AxiosError<{ message?: string; msg?: string }>) => Promise.reject(normalizeError(error)),
)

export const request = {
  get<T>(url: string, config?: AxiosRequestConfig) {
    return requestClient.get<T>(url, config).then(handleResponse)
  },
  post<TResponse, TPayload = unknown>(
    url: string,
    data?: TPayload,
    config?: AxiosRequestConfig<TPayload>,
  ) {
    return requestClient.post<TResponse>(url, data, config).then(handleResponse)
  },
  put<TResponse, TPayload = unknown>(
    url: string,
    data?: TPayload,
    config?: AxiosRequestConfig<TPayload>,
  ) {
    return requestClient.put<TResponse>(url, data, config).then(handleResponse)
  },
  patch<TResponse, TPayload = unknown>(
    url: string,
    data?: TPayload,
    config?: AxiosRequestConfig<TPayload>,
  ) {
    return requestClient.patch<TResponse>(url, data, config).then(handleResponse)
  },
  delete<T>(url: string, config?: AxiosRequestConfig) {
    return requestClient.delete<T>(url, config).then(handleResponse)
  },
}
