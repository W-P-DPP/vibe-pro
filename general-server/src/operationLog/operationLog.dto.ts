export type CreateOperationLogDto = {
  user?: string;
  module?: string;
  operationType?: string;
  requestUrl?: string;
  requestMethod?: string;
  requestParams?: string;
  ip?: string;
  status?: string;
  responseCode?: number;
  costTime?: number;
};

export type OperationLogRuntimeConfig = {
  enabled: boolean;
  whitelist: string[];
  batchSize: number;
  flushIntervalMs: number;
  maxRequestParamsLength: number;
};
