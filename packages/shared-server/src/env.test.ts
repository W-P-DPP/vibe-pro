import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getProfileEnvFile, getRuntimeProfile, loadProfileEnv } from './env.ts';

describe('shared-server env helpers', () => {
  afterEach(() => {
    delete process.env.SHARED_SERVER_TEST_VALUE;
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
});
