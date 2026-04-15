import { In, type FindOptionsWhere, type Repository } from 'typeorm';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import {
  ReimbursementAttachmentEntity,
  ReimbursementEntity,
} from './reimbursement.entity.ts';
import type { ReimbursementStatus } from './reimbursement.dto.ts';

async function ensureDataSource() {
  const current = getDataSource();
  if (current?.isInitialized) {
    return current;
  }

  return initDataBase();
}

export class ReimbursementRepository {
  private async getReimbursementRepository(): Promise<Repository<ReimbursementEntity>> {
    const dataSource = await ensureDataSource();
    return dataSource.getRepository(ReimbursementEntity);
  }

  private async getAttachmentRepository(): Promise<Repository<ReimbursementAttachmentEntity>> {
    const dataSource = await ensureDataSource();
    return dataSource.getRepository(ReimbursementAttachmentEntity);
  }

  async listReimbursements(input: {
    applicantUserId: number;
    includeAll: boolean;
    status?: ReimbursementStatus;
  }) {
    const repository = await this.getReimbursementRepository();
    const where: FindOptionsWhere<ReimbursementEntity> = input.includeAll
      ? {}
      : { applicantUserId: input.applicantUserId };

    if (input.status) {
      where.status = input.status;
    }

    return repository.find({
      where,
      order: { id: 'DESC' },
    });
  }

  async getReimbursementById(id: number) {
    const repository = await this.getReimbursementRepository();
    return repository.findOne({ where: { id } });
  }

  async createReimbursement(input: {
    applicantUserId: number;
    applicantUsername: string;
    title: string;
    category: string;
    amountCents: number;
    expenseDate: string;
    description: string;
    payeeName: string;
    payeeAccount: string;
  }) {
    const repository = await this.getReimbursementRepository();
    const entity = repository.create({
      applicantUserId: input.applicantUserId,
      applicantUsername: input.applicantUsername,
      title: input.title,
      category: input.category as ReimbursementEntity['category'],
      amountCents: input.amountCents,
      currency: 'CNY',
      expenseDate: input.expenseDate,
      description: input.description,
      payeeName: input.payeeName,
      payeeAccount: input.payeeAccount,
      status: 'draft',
      rejectReason: '',
      approvedByUserId: null,
      approvedByUsername: '',
      approvedTime: null,
      createBy: String(input.applicantUserId),
      updateBy: String(input.applicantUserId),
    });

    return repository.save(entity);
  }

  async updateReimbursement(
    entity: ReimbursementEntity,
    input: Partial<{
      title: string;
      category: string;
      amountCents: number;
      expenseDate: string;
      description: string;
      payeeName: string;
      payeeAccount: string;
      status: ReimbursementStatus;
      rejectReason: string;
      approvedByUserId: number | null;
      approvedByUsername: string;
      approvedTime: string | null;
      updateBy: string;
    }>,
  ) {
    Object.assign(entity, input);
    return (await this.getReimbursementRepository()).save(entity);
  }

  async listAttachments(reimbursementIds: number[]) {
    if (reimbursementIds.length === 0) {
      return [];
    }

    const repository = await this.getAttachmentRepository();
    return repository.find({
      where: { reimbursementId: In(reimbursementIds) },
      order: { id: 'ASC' },
    });
  }

  async createAttachment(input: {
    reimbursementId: number;
    fileId: string;
    originalFileName: string;
    fileSize: number;
    contentType: string;
    fileUrl: string;
    createBy: string;
  }) {
    const repository = await this.getAttachmentRepository();
    const entity = repository.create({
      reimbursementId: input.reimbursementId,
      fileId: input.fileId,
      originalFileName: input.originalFileName,
      fileSize: input.fileSize,
      contentType: input.contentType,
      fileUrl: input.fileUrl,
      createBy: input.createBy,
      updateBy: input.createBy,
    });

    return repository.save(entity);
  }

  async getAttachmentById(id: number) {
    return (await this.getAttachmentRepository()).findOne({ where: { id } });
  }

  async deleteAttachment(id: number) {
    return (await this.getAttachmentRepository()).delete({ id });
  }
}

export const reimbursementRepository = new ReimbursementRepository();
