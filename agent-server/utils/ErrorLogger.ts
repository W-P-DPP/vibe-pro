import { createErrorMiddleware } from '@super-pro/shared-server';
import { Logger } from './Logger.ts';

export class ErrorLogger {
  private static logger = Logger.getInstance();

  public static middleware() {
    return createErrorMiddleware({
      logger: {
        error: (message, meta) => ErrorLogger.logger.error(message, meta),
      },
      fallbackMessage: '服务器内部错误',
    });
  }
}
