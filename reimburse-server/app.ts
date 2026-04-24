import { createHttpApp } from '@super-pro/shared-server';
import router from './src/index.ts';
import { ErrorLogger, RequestLogger } from './utils/index.ts';
import { jwtMiddleware } from './utils/middleware/jwtMiddleware.ts';
import { responseMiddleware } from './utils/middleware/responseMiddleware.ts';

export function createApp() {
  return createHttpApp({
    requestLogger: RequestLogger.middleware(),
    responseMiddleware,
    apiMiddlewares: [jwtMiddleware],
    apiRouter: router,
    errorMiddleware: ErrorLogger.middleware(),
  });
}
