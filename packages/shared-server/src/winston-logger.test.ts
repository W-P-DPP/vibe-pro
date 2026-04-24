import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createWinstonLogger, resolveLogDirectory } from './winston-logger.ts';

describe('shared-server winston logger', () => {
  it('resolves the default log directory from cwd', () => {
    expect(resolveLogDirectory({ cwd: '/tmp/app' })).toBe(path.resolve('/tmp/app/logs'));
  });

  it('creates the log directory and logger transports', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'shared-server-logger-'));
    const logger = createWinstonLogger({
      cwd,
      nodeEnv: 'production',
      logConfig: {
        rotate: false,
      },
    });

    expect(fs.existsSync(path.join(cwd, 'logs'))).toBe(true);
    expect(logger.transports).toHaveLength(2);

    logger.close();
  });

  it('supports a custom log directory and log level', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'shared-server-logger-'));
    const logger = createWinstonLogger({
      cwd,
      nodeEnv: 'production',
      logConfig: {
        logDir: 'custom-logs',
        level: 'warn',
      },
    });

    expect(fs.existsSync(path.join(cwd, 'custom-logs'))).toBe(true);
    expect(logger.level).toBe('warn');

    logger.close();
  });
});
