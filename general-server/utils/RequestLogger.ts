import { createRequestLoggerMiddleware } from '@super-pro/shared-server';
import { Logger } from './Logger.ts';

export class RequestLogger {
  private static logger = Logger.getInstance();

  public static middleware() {
    return createRequestLoggerMiddleware({
      logger: {
        info: (message) => RequestLogger.logger.info(message),
      },
    });
  }
}
