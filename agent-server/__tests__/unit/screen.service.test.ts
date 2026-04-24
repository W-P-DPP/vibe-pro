import { jest } from '@jest/globals';

const queryMock = jest.fn();
const getSnapshotMock = jest.fn();
const getDataSourceMock = jest.fn(() => ({
  isInitialized: true,
  query: queryMock,
}));
const initDataBaseMock = jest.fn(async () => ({
  isInitialized: true,
  query: queryMock,
}));

jest.mock('../../utils/mysql.ts', () => ({
  __esModule: true,
  default: initDataBaseMock,
  getDataSource: getDataSourceMock,
}));

jest.mock('../../src/screen/device.collector.ts', () => ({
  deviceMetricsCollector: {
    getSnapshot: getSnapshotMock,
  },
}));

import { screenService } from '../../src/screen/screen.service.ts';

describe('screenService', () => {
  beforeEach(() => {
    queryMock.mockReset();
    getSnapshotMock.mockReset();
    getDataSourceMock.mockClear();
    initDataBaseMock.mockClear();
  });

  it('aggregates overview metrics with deltas', async () => {
    queryMock
      .mockResolvedValueOnce([{ value: 12 }])
      .mockResolvedValueOnce([{ value: 10 }])
      .mockResolvedValueOnce([{ value: 36 }])
      .mockResolvedValueOnce([{ value: 30 }])
      .mockResolvedValueOnce([{ value: 148 }])
      .mockResolvedValueOnce([{ value: 121 }])
      .mockResolvedValueOnce([{ value: 9 }])
      .mockResolvedValueOnce([{ value: 3 }])
      .mockResolvedValueOnce([{ value: 4 }])
      .mockResolvedValueOnce([{ value: 185.5 }])
      .mockResolvedValueOnce([{ value: 202.2 }]);

    const result = await screenService.getOverview('24h');

    expect(result.range).toBe('24h');
    expect(result.serviceStatus.agentServer).toBe('up');
    expect(result.metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'activeUsers',
          label: '活跃用户',
          value: 12,
          delta: { value: 20, direction: 'up' },
        }),
        expect.objectContaining({
          key: 'errors',
          label: '错误数',
          value: 3,
          delta: { value: 25, direction: 'down' },
        }),
        expect.objectContaining({
          key: 'avgResponseTimeMs',
          label: '平均耗时',
          unit: 'ms',
          precision: 1,
        }),
      ]),
    );
    expect(getDataSourceMock).toHaveBeenCalled();
    expect(initDataBaseMock).not.toHaveBeenCalled();
  });

  it('fills missing trend buckets for dashboard ranges', async () => {
    queryMock
      .mockResolvedValueOnce([{ bucket: '2026-04-11', value: 3 }])
      .mockResolvedValueOnce([{ bucket: '2026-04-12', value: 9 }])
      .mockResolvedValueOnce([{ bucket: '2026-04-13', value: 6 }])
      .mockResolvedValueOnce([{ bucket: '2026-04-14', value: 1 }]);

    const result = await screenService.getTrends('7d');

    expect(result.range).toBe('7d');
    expect(result.bucket).toBe('day');
    expect(result.sessionTrend).toHaveLength(7);
    expect(result.sessionTrend.some((item) => item.value === 0)).toBe(true);
    expect(result.messageTrend.reduce((total, item) => total + item.value, 0)).toBe(9);
  });

  it('maps recent activity rows into dashboard feed items', async () => {
    queryMock
      .mockResolvedValueOnce([
        {
          id: 1,
          createTime: '2026-04-17T07:58:00.000Z',
          requestMethod: 'GET',
          requestUrl: '/api/screen/overview',
          responseCode: 500,
          module: 'screen',
          costTime: 82,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 2,
          createTime: '2026-04-17T07:57:00.000Z',
          requestMethod: 'POST',
          requestUrl: '/api/chat/stream',
          module: 'chat',
          costTime: 248,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 3,
          sessionId: 'session-1',
          title: '本周运营复盘',
          createTime: '2026-04-17T07:56:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 4,
          originalFileName: '产品手册.pdf',
          parseStatus: 'success',
          createTime: '2026-04-17T07:55:00.000Z',
        },
      ]);

    const result = await screenService.getActivity('24h');

    expect(result.recentErrors[0]).toMatchObject({
      id: 'error-1',
      title: 'GET /api/screen/overview',
      description: '状态码 500，耗时 82 ms',
      level: 'error',
    });
    expect(result.recentOperations[0]).toMatchObject({
      id: 'operation-2',
      description: '模块 chat，耗时 248 ms',
    });
    expect(result.recentSessions[0]).toMatchObject({
      id: 'session-3',
      description: '会话 session-1',
    });
    expect(result.recentKnowledgeChanges[0]).toMatchObject({
      id: 'knowledge-4',
      description: '解析状态 success',
    });
  });

  it('delegates device snapshots to the collector', async () => {
    const snapshot = {
      generatedAt: '2026-04-17T08:00:00.000Z',
      window: '5m',
      supportedWindows: ['5m', '15m', '1h'],
      node: {
        hostname: 'node-a',
        platform: 'linux',
        arch: 'x64',
        uptimeSec: 7200,
      },
      current: {
        cpuUsageRate: 42.3,
        memoryUsageRate: 63.4,
        totalMemoryBytes: 1024,
        usedMemoryBytes: 512,
        freeMemoryBytes: 512,
        processRssBytes: 256,
        processHeapUsedBytes: 128,
        processHeapTotalBytes: 192,
        processCpuUsageRate: 12.1,
      },
      cpuTrend: [{ time: '2026-04-17T07:55:00.000Z', value: 42.3 }],
      memoryTrend: [{ time: '2026-04-17T07:55:00.000Z', value: 63.4 }],
      networkTrend: [
        { time: '2026-04-17T07:55:00.000Z', rxBytesPerSec: 1024, txBytesPerSec: 512 },
      ],
      diskUsage: [
        {
          name: 'system',
          mount: '/',
          totalBytes: 2048,
          usedBytes: 1024,
          freeBytes: 1024,
          usageRate: 50,
        },
      ],
    };

    getSnapshotMock.mockResolvedValue(snapshot);

    await expect(screenService.getDevice('5m')).resolves.toEqual(snapshot);
    expect(getSnapshotMock).toHaveBeenCalledWith('5m');
  });
});
