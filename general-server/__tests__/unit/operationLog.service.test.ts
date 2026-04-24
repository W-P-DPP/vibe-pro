import { jest } from '@jest/globals';
import { OperationLogService } from '../../src/operationLog/operationLog.service.ts';
import type { OperationLogRepositoryPort } from '../../src/operationLog/operationLog.repository.ts';

describe('OperationLogService', () => {
  it('flushes logs in batches and truncates oversized params', async () => {
    const saveMany = jest.fn().mockResolvedValue(undefined);
    const repository: OperationLogRepositoryPort = {
      saveMany,
    };
    const logger = {
      error: jest.fn(),
      warn: jest.fn(),
    };
    const service = new OperationLogService({
      repository,
      logger,
      batchSize: 2,
      flushIntervalMs: 1000,
      maxRequestParamsLength: 12,
    });

    service.record({
      module: 'user',
      requestParams: '{"username":"alice"}',
    });
    service.record({
      module: 'site-menu',
      requestParams: '{"path":"/menu"}',
    });
    service.record({
      module: 'file',
    });

    await service.dispose();

    expect(saveMany).toHaveBeenCalledTimes(2);
    expect(saveMany).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        expect.objectContaining({
          module: 'user',
          requestParams: '{"username":...[truncated]',
        }),
        expect.objectContaining({
          module: 'site-menu',
          requestParams: '{"path":"/me...[truncated]',
        }),
      ]),
    );
    expect(saveMany).toHaveBeenNthCalledWith(
      2,
      expect.arrayContaining([
        expect.objectContaining({
          module: 'file',
        }),
      ]),
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('records repository failures without throwing to the caller', async () => {
    const repository: OperationLogRepositoryPort = {
      saveMany: jest.fn().mockRejectedValue(new Error('db unavailable')),
    };
    const logger = {
      error: jest.fn(),
      warn: jest.fn(),
    };
    const service = new OperationLogService({
      repository,
      logger,
      batchSize: 1,
      flushIntervalMs: 1000,
    });

    service.record({
      module: 'user',
    });

    await service.dispose();

    expect(logger.error).toHaveBeenCalledWith(
      '写入操作日志失败',
      expect.objectContaining({
        size: 1,
      }),
    );
  });
});
