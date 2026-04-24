import dotenv from 'dotenv';
import path from 'node:path';

export type LegacyDatabaseConfig = {
  type?: string;
  host?: string;
  port?: number | string;
  user?: string;
  password?: string;
  database?: string;
  timezone?: string;
  charset?: string;
};

export type ResolvedDatabaseConfig = {
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  timezone: string;
  charset: string;
  synchronize: boolean;
};

export function getRuntimeProfile(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv === 'production' ? 'production' : 'development';
}

export function getProfileEnvFile(profile = getRuntimeProfile()) {
  return `.env.${profile}`;
}

export function loadProfileEnv(options?: { cwd?: string; profile?: string }) {
  const cwd = options?.cwd ?? process.cwd();
  const profile = options?.profile ?? getRuntimeProfile();
  const envFile = getProfileEnvFile(profile);
  const resolvedPath = path.resolve(cwd, envFile);

  dotenv.config({ path: resolvedPath });

  return {
    profile,
    envFile,
    resolvedPath,
  };
}

function firstDefined<T>(...values: Array<T | undefined>) {
  return values.find((value) => value !== undefined && value !== '') as T | undefined;
}

function parseBoolean(value: string | undefined) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return undefined;
}

export function getDatabaseConfig(
  configDatabase: LegacyDatabaseConfig = {},
  options?: { nodeEnv?: string },
): ResolvedDatabaseConfig {
  const profile = getRuntimeProfile(options?.nodeEnv);
  const requestedSynchronize = parseBoolean(process.env.DB_SYNCHRONIZE);
  const defaultSynchronize = profile !== 'production';
  const synchronize = profile === 'production'
    ? false
    : requestedSynchronize ?? defaultSynchronize;

  return {
    type: firstDefined(process.env.DB_TYPE, configDatabase.type, 'mysql')!,
    host: firstDefined(process.env.DB_HOST, configDatabase.host, '127.0.0.1')!,
    port: Number(firstDefined(process.env.DB_PORT, configDatabase.port, 3306)),
    username: firstDefined(process.env.DB_USER, configDatabase.user, 'root')!,
    password: firstDefined(process.env.DB_PASSWORD, configDatabase.password, '123456')!,
    database: firstDefined(process.env.DB_NAME, configDatabase.database, 'wxbot')!,
    timezone: firstDefined(process.env.DB_TIMEZONE, configDatabase.timezone, '+08:00')!,
    charset: firstDefined(process.env.DB_CHARSET, configDatabase.charset, 'utf8mb4')!,
    synchronize,
  };
}
