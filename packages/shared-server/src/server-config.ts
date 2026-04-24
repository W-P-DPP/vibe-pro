import fs from 'node:fs';
import path from 'node:path';
import type { LegacyDatabaseConfig } from './env.ts';
import type { SharedLogConfig } from './winston-logger.ts';

export type ServerAxiosConfig = {
  baseURL: string;
  timeout: number;
};

export type ServerRedisConfig = {
  host: string;
  port: number;
};

export type ServerOperationLogConfig = {
  enabled?: boolean;
  whitelist?: string[];
  batchSize?: number;
  flushIntervalMs?: number;
  maxRequestParamsLength?: number;
};

export type ServerConfig = {
  expires_in: number;
  axios: ServerAxiosConfig;
  Redis: ServerRedisConfig;
  Database: LegacyDatabaseConfig;
  log?: SharedLogConfig;
  operationLog?: ServerOperationLogConfig;
};

type RawServerConfig = Partial<{
  expires_in: number | string;
  axios: Partial<{
    baseURL: string;
    timeout: number | string;
  }>;
  Redis: Partial<{
    host: string;
    port: number | string;
  }>;
  Database: LegacyDatabaseConfig;
  log: SharedLogConfig;
  operationLog: ServerOperationLogConfig;
}>;

export type LoadServerConfigOptions = {
  configPath?: string;
  cwd?: string;
  defaults?: Partial<ServerConfig>;
};

export const defaultServerConfig: ServerConfig = {
  expires_in: 7200,
  axios: {
    baseURL: '',
    timeout: 5000,
  },
  Redis: {
    host: '127.0.0.1',
    port: 6379,
  },
  Database: {},
};

function readJsonConfig(configPath: string): RawServerConfig {
  if (!fs.existsSync(configPath)) {
    return {};
  }

  const rawContent = fs.readFileSync(configPath, 'utf8');
  if (!rawContent.trim()) {
    return {};
  }

  return JSON.parse(rawContent) as RawServerConfig;
}

function toNumber(value: number | string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeString(value: string | undefined, fallback: string) {
  return typeof value === 'string' ? value : fallback;
}

export function loadServerConfig(options: LoadServerConfigOptions = {}): ServerConfig {
  const configPath = options.configPath ?? path.resolve(options.cwd ?? process.cwd(), 'config.json');
  const rawConfig = readJsonConfig(configPath);
  const defaults = {
    ...defaultServerConfig,
    ...options.defaults,
    axios: {
      ...defaultServerConfig.axios,
      ...options.defaults?.axios,
    },
    Redis: {
      ...defaultServerConfig.Redis,
      ...options.defaults?.Redis,
    },
    Database: {
      ...defaultServerConfig.Database,
      ...options.defaults?.Database,
    },
  };

  const normalized: ServerConfig = {
    expires_in: toNumber(rawConfig.expires_in, defaults.expires_in),
    axios: {
      baseURL: normalizeString(rawConfig.axios?.baseURL, defaults.axios.baseURL),
      timeout: toNumber(rawConfig.axios?.timeout, defaults.axios.timeout),
    },
    Redis: {
      host: normalizeString(rawConfig.Redis?.host, defaults.Redis.host),
      port: toNumber(rawConfig.Redis?.port, defaults.Redis.port),
    },
    Database: {
      ...defaults.Database,
      ...(rawConfig.Database ?? {}),
    },
  };

  const log = rawConfig.log ?? defaults.log;
  if (log) {
    normalized.log = log;
  }

  const operationLog = rawConfig.operationLog ?? defaults.operationLog;
  if (operationLog) {
    normalized.operationLog = operationLog;
  }

  return normalized;
}
