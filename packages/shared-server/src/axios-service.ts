import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { sanitizeLogValue } from './logging.ts';
import type { ServerAxiosConfig } from './server-config.ts';

export type AxiosLoggerLike = {
  info: (message: string) => void;
  error: (message: string) => void;
};

export type SharedAxiosServiceOptions = {
  axiosConfig?: ServerAxiosConfig;
  logger?: AxiosLoggerLike;
  maxLoggedBodyLength?: number;
};

const fallbackLogger: AxiosLoggerLike = {
  info: () => undefined,
  error: () => undefined,
};

export function formatAxiosLogPayload(value: unknown, maxLength = 2048) {
  const serialized = JSON.stringify(sanitizeLogValue(value));
  if (serialized.length <= maxLength) {
    return serialized;
  }

  return `${serialized.slice(0, maxLength)}...[truncated]`;
}

export class SharedAxiosService {
  private readonly axiosInstance: AxiosInstance;
  private readonly logger: AxiosLoggerLike;
  private readonly maxLoggedBodyLength: number;

  constructor(options: SharedAxiosServiceOptions = {}) {
    const axiosConfig = options.axiosConfig ?? {
      baseURL: '',
      timeout: 5000,
    };

    this.logger = options.logger ?? fallbackLogger;
    this.maxLoggedBodyLength = Math.max(128, options.maxLoggedBodyLength ?? 2048);
    this.axiosInstance = axios.create({
      baseURL: axiosConfig.baseURL,
      timeout: axiosConfig.timeout,
    });

    this.setupInterceptors();
  }

  getAxios(): AxiosInstance {
    return this.axiosInstance;
  }

  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.get<T>(url, config);
    return response.data;
  }

  async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.post<T>(url, data, config);
    return response.data;
  }

  async put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.put<T>(url, data, config);
    return response.data;
  }

  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axiosInstance.delete<T>(url, config);
    return response.data;
  }

  private setupInterceptors() {
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        this.logger.info(`[Axios Request] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error: unknown) => {
        this.logger.error(`[Axios Request Error] ${String(error)}`);
        return Promise.reject(error);
      },
    );

    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        this.logger.info(
          `[Axios Response] ${response.status} ${response.config.url} ${
            formatAxiosLogPayload(response.data, this.maxLoggedBodyLength)
          }`,
        );
        return response;
      },
      (error: { message?: string; response?: { data?: unknown } }) => {
        this.logger.error(`[Axios Response Error] ${error.message || 'Unknown Error'}`);
        if (error.response) {
          this.logger.error(
            `[Axios Response Data] ${
              formatAxiosLogPayload(error.response.data, this.maxLoggedBodyLength)
            }`,
          );
        }
        return Promise.reject(error);
      },
    );
  }
}
