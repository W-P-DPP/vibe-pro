import { createHttpApp } from '@super-pro/shared-server';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import router from './src/index.ts';
import { ErrorLogger, RequestLogger } from './utils/index.ts';
import { operationLogMiddleware } from './utils/middleware/operationLogMiddleware.ts';
import { responseMiddleware } from './utils/middleware/responseMiddleware.ts';

export function createApp() {
  const publicPath = fileURLToPath(new URL('./public', import.meta.url));

  return createHttpApp({
    requestLogger: RequestLogger.middleware(),
    staticDir: path.resolve(publicPath),
    staticMountPath: '/public',
    serveStaticAtRoot: true,
    responseMiddleware,
    rootHandler: (req, res) => {
      res.sendSuccess();
    },
    apiMiddlewares: [operationLogMiddleware],
    apiRouter: router,
    errorMiddleware: ErrorLogger.middleware(),
  });
}
