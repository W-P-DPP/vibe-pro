import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getDatabaseConfig,
  getProfileEnvFile,
  getRuntimeProfile,
  loadProfileEnv,
} from './env.ts';

describe('shared-server env helpers', () => {
  const dbEnvKeys = [
    'DB_TYPE',
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'DB_TIMEZONE',
    'DB_CHARSET',
    'DB_SYNCHRONIZE',
  ] as const;
  const originalDbEnv = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of dbEnvKeys) {
      originalDbEnv.set(key, process.env[key]);
      delete process.env[key];
    }
  });

  afterEach(() => {
    delete process.env.SHARED_SERVER_TEST_VALUE;

    for (const key of dbEnvKeys) {
      const value = originalDbEnv.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    originalDbEnv.clear();
  });

  it('maps node env values to runtime profiles', () => {
    expect(getRuntimeProfile('production')).toBe('production');
    expect(getRuntimeProfile('development')).toBe('development');
    expect(getRuntimeProfile('test')).toBe('development');
  });

  it('returns the matching env file name for a profile', () => {
    expect(getProfileEnvFile('development')).toBe('.env.development');
    expect(getProfileEnvFile('production')).toBe('.env.production');
  });

  it('loads the matching profile env file from the provided cwd', async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'shared-server-env-'));
    await fs.writeFile(
      path.join(cwd, '.env.production'),
      'SHARED_SERVER_TEST_VALUE=loaded-from-production\n',
      'utf8',
    );

    const loaded = loadProfileEnv({ cwd, profile: 'production' });

    expect(loaded.profile).toBe('production');
    expect(loaded.envFile).toBe('.env.production');
    expect(process.env.SHARED_SERVER_TEST_VALUE).toBe('loaded-from-production');
  });

  it('resolves database config from defaults', () => {
    expect(getDatabaseConfig()).toEqual({
      type: 'mysql',
      host: '127.0.0.1',
      port: 3306,
      username: 'root',
      password: 'password',
      database: 'wxbot',
      timezone: '+08:00',
      charset: 'utf8mb4',
      synchronize: true,
    });
  });

  it('uses legacy config values when env values are absent', () => {
    expect(getDatabaseConfig({
      type: 'mysql',
      host: 'db.internal',
      port: '3307',
      user: 'config-user',
      password: 'config-password',
      database: 'config-db',
      timezone: '+00:00',
      charset: 'utf8',
    })).toEqual({
      type: 'mysql',
      host: 'db.internal',
      port: 3307,
      username: 'config-user',
      password: 'config-password',
      database: 'config-db',
      timezone: '+00:00',
      charset: 'utf8',
      synchronize: true,
    });
  });

  it('lets environment values override legacy config values', () => {
    process.env.DB_TYPE = 'mysql';
    process.env.DB_HOST = 'env-db.internal';
    process.env.DB_PORT = '3308';
    process.env.DB_USER = 'env-user';
    process.env.DB_PASSWORD = 'env-password';
    process.env.DB_NAME = 'env-db';
    process.env.DB_TIMEZONE = '+09:00';
    process.env.DB_CHARSET = 'utf8mb4_bin';

    expect(getDatabaseConfig({
      host: 'config-db.internal',
      port: 3307,
      user: 'config-user',
      password: 'config-password',
      database: 'config-db',
      timezone: '+00:00',
      charset: 'utf8',
    })).toEqual({
      type: 'mysql',
      host: 'env-db.internal',
      port: 3308,
      username: 'env-user',
      password: 'env-password',
      database: 'env-db',
      timezone: '+09:00',
      charset: 'utf8mb4_bin',
      synchronize: true,
    });
  });

  it('disables synchronize by default in production', () => {
    expect(getDatabaseConfig({}, { nodeEnv: 'production' }).synchronize).toBe(false);
  });

  it('allows env to disable synchronize in development', () => {
    process.env.DB_SYNCHRONIZE = 'false';

    expect(getDatabaseConfig({}, { nodeEnv: 'development' }).synchronize).toBe(false);
  });

  it('keeps synchronize disabled in production even when env requests true', () => {
    process.env.DB_SYNCHRONIZE = 'true';

    expect(getDatabaseConfig({}, { nodeEnv: 'production' }).synchronize).toBe(false);
  });
});
