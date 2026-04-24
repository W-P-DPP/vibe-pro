import { BatchProcessor } from '@super-pro/shared-server';
import type { CreateOperationLogDto } from './operationLog.dto.ts';
import type { OperationLogRepositoryPort } from './operationLog.repository.ts';

type OperationLogLogger = {
  error: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
};

export type OperationLogServiceOptions = {
  repository?: OperationLogRepositoryPort;
  logger?: OperationLogLogger;
  batchSize?: number;
  flushIntervalMs?: number;
  maxRequestParamsLength?: number;
};

export class OperationLogService {
  private readonly repository: OperationLogRepositoryPort;
  private readonly logger: OperationLogLogger;
  private readonly maxRequestParamsLength: number;
  private readonly batchProcessor: BatchProcessor<CreateOperationLogDto>;

  constructor(options: OperationLogServiceOptions = {}) {
    this.repository = options.repository ?? {
      async saveMany() {
        return undefined;
      },
    };
    this.logger = options.logger ?? {
      error(message, meta) {
        console.error(message, meta);
      },
      warn(message, meta) {
        console.warn(message, meta);
      },
    };
    this.maxRequestParamsLength = Math.max(1, options.maxRequestParamsLength ?? 2048);
    this.batchProcessor = new BatchProcessor(
      async (entries) => {
        await this.repository.saveMany(entries.map((entry) => this.normalizeEntry(entry)));
      },
      {
        maxBatchSize: options.batchSize ?? 20,
        flushIntervalMs: options.flushIntervalMs ?? 500,
        onError: (error, entries) => {
          this.logger.error('写入操作日志失败', {
            error,
            size: entries.length,
          });
        },
      },
    );
  }

  record(entry: CreateOperationLogDto) {
    this.batchProcessor.add(entry);
  }

  async flush() {
    await this.batchProcessor.flush();
  }

  async dispose() {
    await this.batchProcessor.dispose();
  }

  private normalizeEntry(entry: CreateOperationLogDto): CreateOperationLogDto {
    if (!entry.requestParams) {
      return entry;
    }

    if (entry.requestParams.length <= this.maxRequestParamsLength) {
      return entry;
    }

    return {
      ...entry,
      requestParams: `${entry.requestParams.slice(0, this.maxRequestParamsLength)}...[truncated]`,
    };
  }
}
