import { EntitySchema } from 'typeorm';
import { BaseEntity, BaseSchemaColumns } from '../../utils/entities/base.entity.ts';
import type { ReimbursementCategory, ReimbursementStatus } from './reimbursement.dto.ts';

export class ReimbursementEntity extends BaseEntity {
  id!: number;
  applicantUserId!: number;
  applicantUsername!: string;
  title!: string;
  category!: ReimbursementCategory;
  amountCents!: number;
  currency!: 'CNY';
  expenseDate!: string;
  description!: string;
  payeeName!: string;
  payeeAccount!: string;
  status!: ReimbursementStatus;
  rejectReason!: string;
  approvedByUserId!: number | null;
  approvedByUsername!: string;
  approvedTime!: string | null;
}

export class ReimbursementAttachmentEntity extends BaseEntity {
  id!: number;
  reimbursementId!: number;
  fileId!: string;
  originalFileName!: string;
  fileSize!: number;
  contentType!: string;
  fileUrl!: string;
}

export const ReimbursementEntitySchema = new EntitySchema<ReimbursementEntity>({
  name: 'Reimbursement',
  target: ReimbursementEntity,
  tableName: 'reimbursement',
  columns: {
    id: { name: 'id', type: Number, primary: true, generated: 'increment' },
    applicantUserId: { name: 'applicant_user_id', type: Number, nullable: false },
    applicantUsername: { name: 'applicant_username', type: String, length: 64, nullable: false },
    title: { name: 'title', type: String, length: 128, nullable: false },
    category: { name: 'category', type: String, length: 32, nullable: false },
    amountCents: { name: 'amount_cents', type: Number, nullable: false },
    currency: { name: 'currency', type: String, length: 8, nullable: false, default: 'CNY' },
    expenseDate: { name: 'expense_date', type: String, length: 32, nullable: false },
    description: { name: 'description', type: 'text', nullable: false, default: '' },
    payeeName: { name: 'payee_name', type: String, length: 128, nullable: false, default: '' },
    payeeAccount: { name: 'payee_account', type: String, length: 128, nullable: false, default: '' },
    status: { name: 'status', type: String, length: 32, nullable: false, default: 'draft' },
    rejectReason: { name: 'reject_reason', type: 'text', nullable: false, default: '' },
    approvedByUserId: { name: 'approved_by_user_id', type: Number, nullable: true, default: null },
    approvedByUsername: { name: 'approved_by_username', type: String, length: 64, nullable: false, default: '' },
    approvedTime: { name: 'approved_time', type: String, length: 64, nullable: true, default: null },
    ...BaseSchemaColumns,
  },
  indices: [
    { name: 'idx_reimbursement_applicant_user_id', columns: ['applicantUserId'] },
    { name: 'idx_reimbursement_status', columns: ['status'] },
  ],
});

export const ReimbursementAttachmentEntitySchema = new EntitySchema<ReimbursementAttachmentEntity>({
  name: 'ReimbursementAttachment',
  target: ReimbursementAttachmentEntity,
  tableName: 'reimbursement_attachment',
  columns: {
    id: { name: 'id', type: Number, primary: true, generated: 'increment' },
    reimbursementId: { name: 'reimbursement_id', type: Number, nullable: false },
    fileId: { name: 'file_id', type: String, length: 128, nullable: false },
    originalFileName: { name: 'original_file_name', type: String, length: 255, nullable: false },
    fileSize: { name: 'file_size', type: Number, nullable: false, default: 0 },
    contentType: { name: 'content_type', type: String, length: 128, nullable: false, default: '' },
    fileUrl: { name: 'file_url', type: String, length: 512, nullable: false },
    ...BaseSchemaColumns,
  },
  indices: [
    { name: 'idx_reimbursement_attachment_reimbursement_id', columns: ['reimbursementId'] },
  ],
});
