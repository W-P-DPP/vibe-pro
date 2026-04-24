import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import {
  createErrorMiddleware,
  createHttpApp,
  createRequestLoggerMiddleware,
  createResponseMiddleware,
} from './http.ts';

describe('shared-server http helpers', () => {
  it('creates an app with shared response and api middleware pipeline', async () => {
    const app = createHttpApp({
      responseMiddleware: createResponseMiddleware(),
      apiMiddlewares: [
        (req, res, next) => {
          res.setHeader('x-api-middleware', 'yes');
          next();
        },
      ],
      apiRouter: express.Router().get('/health', (req, res) => {
        res.sendSuccess({ ok: true }, '检查成功');
      }),
      rootHandler: (req, res) => {
        res.sendSuccess({ root: true }, '根路径成功');
      },
    });

    const rootResponse = await request(app).get('/');
    expect(rootResponse.status).toBe(200);
    expect(rootResponse.body).toMatchObject({
      code: 200,
      msg: '根路径成功',
      data: {
        root: true,
      },
    });

    const apiResponse = await request(app).get('/api/health');
    expect(apiResponse.status).toBe(200);
    expect(apiResponse.headers['x-api-middleware']).toBe('yes');
    expect(apiResponse.body).toMatchObject({
      code: 200,
      msg: '检查成功',
      data: {
        ok: true,
      },
    });
  });

  it('uses sendFail response envelope in the shared error middleware', async () => {
    const logger = {
      error: vi.fn(),
    };
    const app = createHttpApp({
      responseMiddleware: createResponseMiddleware(),
      apiRouter: express.Router().get('/boom', () => {
        throw new Error('unexpected');
      }),
      errorMiddleware: createErrorMiddleware({
        logger,
      }),
    });

    const response = await request(app).get('/api/boom');

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      code: 500,
      msg: '服务器内部错误',
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('logs sanitized request bodies through the shared request logger', async () => {
    const logger = {
      info: vi.fn(),
    };
    const app = createHttpApp({
      requestLogger: createRequestLoggerMiddleware({
        logger,
        format: ':method :url :body',
      }),
      responseMiddleware: createResponseMiddleware(),
      apiRouter: express.Router().post('/login', (req, res) => {
        res.sendSuccess({ ok: true });
      }),
    });

    await request(app).post('/api/login').send({
      username: 'alice',
      password: 'secret',
      token: 'token-value',
    });

    expect(logger.info).toHaveBeenCalledTimes(1);
    const [message] = logger.info.mock.calls[0] ?? [];
    expect(message).toContain('POST /api/login');
    expect(message).toContain('"username":"alice"');
    expect(message).toContain('"password":"[REDACTED]"');
    expect(message).toContain('"token":"[REDACTED]"');
    expect(message).not.toContain('secret');
    expect(message).not.toContain('token-value');
  });
});
