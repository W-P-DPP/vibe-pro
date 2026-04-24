import { createWinstonLogger } from '@super-pro/shared-server';
import type { Logger as WinstonLogger } from 'winston';
import config from '../src/config.ts';

export class Logger {
  private static instance: WinstonLogger;

  public static getInstance(): WinstonLogger {
    if (!Logger.instance) {
      Logger.instance = createWinstonLogger({
        logConfig: config.log,
        nodeEnv: process.env.NODE_ENV,
      });
    }

    return Logger.instance;
  }
}
