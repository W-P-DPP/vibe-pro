import type { Request, Response, NextFunction } from 'express';
import { sanitizeLogValue } from '@super-pro/shared-server';
import config from '../../src/config.ts';
import {
  OperationLogService,
} from '../../src/operationLog/operationLog.service.ts';
import type {
  CreateOperationLogDto,
  OperationLogRuntimeConfig,
} from '../../src/operationLog/operationLog.dto.ts';
import { OperationLogRepository } from '../../src/operationLog/operationLog.repository.ts';
import { Logger } from '../index.ts';

const METHOD_TYPE_MAP: Record<string, string> = {
  GET: '查询',
  POST: '新增',
  PUT: '修改',
  PATCH: '修改',
  DELETE: '删除',
};

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const raw = Array.isArray(forwarded) ? forwarded.join(',') : forwarded;
    return raw.split(',')[0]?.trim() ?? 'unknown';
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

function getModule(path: string): string {
  const segments = path.replace(/\?.*$/, '').split('/').filter(Boolean);
  return segments[segments.length - 1] || 'unknown';
}

function parsePositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveOperationLogConfig(): OperationLogRuntimeConfig {
  const runtimeConfig = (config.operationLog ?? {}) as Record<string, unknown>;

  return {
    enabled: runtimeConfig.enabled === true,
    whitelist: Array.isArray(runtimeConfig.whitelist)
      ? runtimeConfig.whitelist.filter((value): value is string => typeof value === 'string')
      : [],
    batchSize: parsePositiveInteger(runtimeConfig.batchSize, 20),
    flushIntervalMs: parsePositiveInteger(runtimeConfig.flushIntervalMs, 500),
    maxRequestParamsLength: parsePositiveInteger(runtimeConfig.maxRequestParamsLength, 2048),
  };
}

export function createOperationLogMiddleware(options?: {
  config?: OperationLogRuntimeConfig;
  service?: Pick<OperationLogService, 'record'>;
}) {
  const runtimeConfig = options?.config ?? resolveOperationLogConfig();
  const operationLogService = options?.service ?? new OperationLogService({
    repository: new OperationLogRepository(),
    logger: Logger.getInstance(),
    batchSize: runtimeConfig.batchSize,
    flushIntervalMs: runtimeConfig.flushIntervalMs,
    maxRequestParamsLength: runtimeConfig.maxRequestParamsLength,
  });

  return function operationLogMiddleware(req: Request, res: Response, next: NextFunction) {
    if (!runtimeConfig.enabled) {
      return next();
    }

    const reqPath = req.path;

    if (runtimeConfig.whitelist.some((prefix) => reqPath === prefix || reqPath.startsWith(prefix))) {
      return next();
    }

    const startTime = Date.now();

    res.on('finish', () => {
      const requestParams = Object.keys(req.body || {}).length > 0
        ? JSON.stringify(sanitizeLogValue(req.body))
        : Object.keys(req.query || {}).length > 0
          ? JSON.stringify(sanitizeLogValue(req.query))
          : undefined;

      const logEntry: CreateOperationLogDto = {
        user: String(req.jwtPayload?.username || req.jwtPayload?.name || req.jwtPayload?.sub || 'anonymous'),
        module: getModule(req.path),
        operationType: METHOD_TYPE_MAP[req.method.toUpperCase()] || req.method,
        requestUrl: req.originalUrl,
        requestMethod: req.method.toUpperCase(),
        requestParams,
        ip: getClientIp(req),
        status: res.statusCode < 400 ? 'success' : 'fail',
        responseCode: res.statusCode,
        costTime: Date.now() - startTime,
      };

      operationLogService.record(logEntry);
    });

    next();
  };
}

export const operationLogMiddleware = createOperationLogMiddleware();
