import { describe, expect, it, vi } from 'vitest';
import { BatchProcessor } from './batch-processor.ts';

describe('BatchProcessor', () => {
  it('flushes queued items in configured batches', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    const processor = new BatchProcessor(handler, {
      maxBatchSize: 2,
      flushIntervalMs: 1000,
    });

    processor.add(1);
    processor.add(2);
    processor.add(3);

    await processor.dispose();

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(1, [1, 2]);
    expect(handler).toHaveBeenNthCalledWith(2, [3]);
  });

  it('flushes pending items after the configured interval', async () => {
    vi.useFakeTimers();

    const handler = vi.fn().mockResolvedValue(undefined);
    const processor = new BatchProcessor(handler, {
      maxBatchSize: 10,
      flushIntervalMs: 50,
    });

    processor.add(1);
    expect(handler).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(50);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith([1]);

    await processor.dispose();
    vi.useRealTimers();
  });

  it('invokes the error hook when a batch fails', async () => {
    const error = new Error('flush failed');
    const handler = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();
    const processor = new BatchProcessor(handler, {
      maxBatchSize: 1,
      flushIntervalMs: 1000,
      onError,
    });

    processor.add(1);

    await processor.dispose();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(error, [1]);
  });
});
