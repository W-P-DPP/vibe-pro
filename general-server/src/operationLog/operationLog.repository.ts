import { OperationLogEntity } from './operationLog.entity.ts';
import type { CreateOperationLogDto } from './operationLog.dto.ts';
import { getDataSource } from '../../utils/mysql.ts';

export interface OperationLogRepositoryPort {
  saveMany(entries: ReadonlyArray<CreateOperationLogDto>): Promise<void>;
}

export class OperationLogRepository implements OperationLogRepositoryPort {
  async saveMany(entries: ReadonlyArray<CreateOperationLogDto>) {
    if (entries.length === 0) {
      return;
    }

    const dataSource = getDataSource();
    if (!dataSource?.isInitialized) {
      return;
    }

    await dataSource.getRepository(OperationLogEntity).save(entries);
  }
}
