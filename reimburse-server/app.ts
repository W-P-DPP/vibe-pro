import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { responseMiddleware } from './utils/middleware/responseMiddleware.ts';
import { jwtMiddleware } from './utils/middleware/jwtMiddleware.ts';
import router from './src/index.ts';
import { RequestLogger, ErrorLogger } from './utils/index.ts';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(bodyParser.text({ type: 'text/xml' }));
  app.use(RequestLogger.middleware());
  app.use(responseMiddleware);
  app.use('/api', jwtMiddleware, router);
  app.use(ErrorLogger.middleware());
  return app;
}
