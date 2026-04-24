export type BatchProcessorOptions<T> = {
  maxBatchSize?: number;
  flushIntervalMs?: number;
  onError?: (error: unknown, items: T[]) => void;
};

export class BatchProcessor<T> {
  private readonly maxBatchSize: number;
  private readonly flushIntervalMs: number;
  private readonly onError: ((error: unknown, items: T[]) => void) | undefined;
  private readonly queue: T[] = [];

  private flushPromise: Promise<void> | null = null;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly handler: (items: T[]) => Promise<void>,
    options: BatchProcessorOptions<T> = {},
  ) {
    this.maxBatchSize = Math.max(1, options.maxBatchSize ?? 20);
    this.flushIntervalMs = Math.max(1, options.flushIntervalMs ?? 500);
    this.onError = options.onError;
  }

  add(item: T) {
    this.queue.push(item);

    if (this.queue.length >= this.maxBatchSize) {
      void this.flush();
      return;
    }

    this.ensureFlushTimer();
  }

  async flush() {
    if (this.flushPromise) {
      return this.flushPromise;
    }

    this.clearFlushTimer();

    this.flushPromise = this.flushPendingItems().finally(() => {
      this.flushPromise = null;

      if (this.queue.length > 0) {
        this.ensureFlushTimer();
      }
    });

    return this.flushPromise;
  }

  async dispose() {
    this.clearFlushTimer();
    await this.flush();
  }

  private ensureFlushTimer() {
    if (this.flushTimer || this.flushPromise || this.queue.length === 0) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, this.flushIntervalMs);

    this.flushTimer.unref?.();
  }

  private clearFlushTimer() {
    if (!this.flushTimer) {
      return;
    }

    clearTimeout(this.flushTimer);
    this.flushTimer = null;
  }

  private async flushPendingItems() {
    while (this.queue.length > 0) {
      const items = this.queue.splice(0, this.maxBatchSize);

      try {
        await this.handler(items);
      } catch (error) {
        this.onError?.(error, items);
      }
    }
  }
}
