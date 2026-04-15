import type { Express } from 'express';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import type {
  CreateReimbursementRequestDto,
  RejectReimbursementRequestDto,
  ReimbursementAttachmentItemDto,
  ReimbursementDetailDto,
  ReimbursementListItemDto,
  ReimbursementStatus,
  UpdateReimbursementRequestDto,
} from './reimbursement.dto.ts';
import { reimbursementRepository } from './reimbursement.repository.ts';
import { fileServerClient } from './file-server.client.ts';
import type { CurrentUserDto } from '../auth/current-user.ts';
import type {
  ReimbursementAttachmentEntity,
  ReimbursementEntity,
} from './reimbursement.entity.ts';

const CATEGORY_SET = new Set(['travel', 'meal', 'office', 'transport', 'other']);
const EDITABLE_STATUSES = new Set<ReimbursementStatus>(['draft', 'rejected']);

type ReimbursementViewerContext = {
  includeAll: boolean;
  canApproveAny: boolean;
  canMarkPaidAny: boolean;
};

export class ReimbursementBusinessError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'ReimbursementBusinessError';
  }
}

function isApprover(user: CurrentUserDto) {
  return user.role === 'approver' || user.role === 'admin';
}

function canViewReimbursement(user: CurrentUserDto, entity: ReimbursementEntity) {
  return entity.applicantUserId === user.userId || isApprover(user);
}

function buildViewerContext(user: CurrentUserDto): ReimbursementViewerContext {
  return {
    includeAll: isApprover(user),
    canApproveAny: isApprover(user),
    canMarkPaidAny: user.role === 'admin',
  };
}

function toAmountCents(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ReimbursementBusinessError('报销金额必须大于 0', HttpStatus.BAD_REQUEST);
  }

  const cents = Math.round(amount * 100);
  if (!Number.isInteger(cents) || cents <= 0) {
    throw new ReimbursementBusinessError('报销金额格式不合法', HttpStatus.BAD_REQUEST);
  }

  return cents;
}

function normalizeDate(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ReimbursementBusinessError(`${fieldName}不能为空`, HttpStatus.BAD_REQUEST);
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new ReimbursementBusinessError(`${fieldName}格式不合法`, HttpStatus.BAD_REQUEST);
  }

  return trimmed;
}

function normalizeString(value: unknown, fieldName: string, optional = false) {
  if (value === undefined || value === null) {
    if (optional) {
      return '';
    }
    throw new ReimbursementBusinessError(`${fieldName}不能为空`, HttpStatus.BAD_REQUEST);
  }

  if (typeof value !== 'string') {
    throw new ReimbursementBusinessError(`${fieldName}格式不合法`, HttpStatus.BAD_REQUEST);
  }

  const trimmed = value.trim();
  if (!trimmed && !optional) {
    throw new ReimbursementBusinessError(`${fieldName}不能为空`, HttpStatus.BAD_REQUEST);
  }

  return trimmed;
}

function normalizeCategory(value: unknown) {
  if (typeof value !== 'string' || !CATEGORY_SET.has(value)) {
    throw new ReimbursementBusinessError('报销类别不合法', HttpStatus.BAD_REQUEST);
  }

  return value as CreateReimbursementRequestDto['category'];
}

function ensureReimbursementExists(entity: ReimbursementEntity | null) {
  if (!entity) {
    throw new ReimbursementBusinessError('报销单不存在', HttpStatus.NOT_FOUND);
  }

  return entity;
}

function ensureCanView(user: CurrentUserDto, entity: ReimbursementEntity) {
  if (!canViewReimbursement(user, entity)) {
    throw new ReimbursementBusinessError('无权查看该报销单', HttpStatus.FORBIDDEN);
  }
}

function ensureCanEdit(user: CurrentUserDto, entity: ReimbursementEntity) {
  if (entity.applicantUserId !== user.userId) {
    throw new ReimbursementBusinessError('只能编辑自己的报销单', HttpStatus.FORBIDDEN);
  }

  if (!EDITABLE_STATUSES.has(entity.status)) {
    throw new ReimbursementBusinessError('当前状态不允许编辑', HttpStatus.CONFLICT);
  }
}

function ensureCanApprove(user: CurrentUserDto, entity: ReimbursementEntity) {
  if (!isApprover(user)) {
    throw new ReimbursementBusinessError('当前用户无审批权限', HttpStatus.FORBIDDEN);
  }

  if (entity.status !== 'submitted') {
    throw new ReimbursementBusinessError('只有待审批报销单可以执行审批操作', HttpStatus.CONFLICT);
  }
}

function ensureCanMarkPaid(user: CurrentUserDto, entity: ReimbursementEntity) {
  if (user.role !== 'admin') {
    throw new ReimbursementBusinessError('只有管理员可以标记为已付款', HttpStatus.FORBIDDEN);
  }

  if (entity.status !== 'approved') {
    throw new ReimbursementBusinessError('只有已通过报销单可以标记为已付款', HttpStatus.CONFLICT);
  }
}

function toAttachmentDto(entity: ReimbursementAttachmentEntity): ReimbursementAttachmentItemDto {
  return {
    id: entity.id,
    fileId: entity.fileId,
    originalFileName: entity.originalFileName,
    fileSize: entity.fileSize,
    contentType: entity.contentType,
    fileUrl: entity.fileUrl,
    createTime: entity.createTime instanceof Date ? entity.createTime.toISOString() : String(entity.createTime ?? ''),
  };
}

function toListItemDto(entity: ReimbursementEntity, user: CurrentUserDto): ReimbursementListItemDto {
  const canEdit = entity.applicantUserId === user.userId && EDITABLE_STATUSES.has(entity.status);
  const canSubmit = entity.applicantUserId === user.userId && EDITABLE_STATUSES.has(entity.status);
  const canApprove = isApprover(user) && entity.status === 'submitted';
  const canReject = canApprove;
  const canMarkPaid = user.role === 'admin' && entity.status === 'approved';

  return {
    id: entity.id,
    title: entity.title,
    category: entity.category,
    amount: entity.amountCents / 100,
    amountCents: entity.amountCents,
    currency: 'CNY',
    expenseDate: entity.expenseDate,
    status: entity.status,
    applicantUserId: entity.applicantUserId,
    applicantUsername: entity.applicantUsername,
    canEdit,
    canSubmit,
    canApprove,
    canReject,
    canMarkPaid,
    updateTime: entity.updateTime instanceof Date ? entity.updateTime.toISOString() : String(entity.updateTime ?? ''),
  };
}

export class ReimbursementService {
  async listReimbursements(user: CurrentUserDto, status?: ReimbursementStatus) {
    const viewerContext = buildViewerContext(user);
    const entities = await reimbursementRepository.listReimbursements({
      applicantUserId: user.userId,
      includeAll: viewerContext.includeAll,
      status,
    });

    return entities.map((entity) => toListItemDto(entity, user));
  }

  async getReimbursementDetail(user: CurrentUserDto, id: number): Promise<ReimbursementDetailDto> {
    const entity = ensureReimbursementExists(await reimbursementRepository.getReimbursementById(id));
    ensureCanView(user, entity);
    const attachments = await reimbursementRepository.listAttachments([entity.id]);
    const listItem = toListItemDto(entity, user);

    return {
      ...listItem,
      description: entity.description,
      payeeName: entity.payeeName,
      payeeAccount: entity.payeeAccount,
      rejectReason: entity.rejectReason,
      approvedByUserId: entity.approvedByUserId,
      approvedByUsername: entity.approvedByUsername || null,
      approvedTime: entity.approvedTime || null,
      attachments: attachments.map(toAttachmentDto),
      createTime: entity.createTime instanceof Date ? entity.createTime.toISOString() : String(entity.createTime ?? ''),
    };
  }

  async createReimbursement(user: CurrentUserDto, input: CreateReimbursementRequestDto | Record<string, unknown>) {
    const title = normalizeString(input.title, '标题');
    const category = normalizeCategory(input.category);
    const amountCents = toAmountCents(Number(input.amount));
    const expenseDate = normalizeDate(input.expenseDate, '报销日期');
    const description = normalizeString(input.description, '报销说明', true);
    const payeeName = normalizeString(input.payeeName, '收款人', true);
    const payeeAccount = normalizeString(input.payeeAccount, '收款账号', true);

    const entity = await reimbursementRepository.createReimbursement({
      applicantUserId: user.userId,
      applicantUsername: user.username,
      title,
      category,
      amountCents,
      expenseDate,
      description,
      payeeName,
      payeeAccount,
    });

    return this.getReimbursementDetail(user, entity.id);
  }

  async updateReimbursement(
    user: CurrentUserDto,
    id: number,
    input: UpdateReimbursementRequestDto | Record<string, unknown>,
  ) {
    const entity = ensureReimbursementExists(await reimbursementRepository.getReimbursementById(id));
    ensureCanEdit(user, entity);

    const patch: Parameters<typeof reimbursementRepository.updateReimbursement>[1] = {
      updateBy: String(user.userId),
    };

    if (Object.prototype.hasOwnProperty.call(input, 'title')) {
      patch.title = normalizeString(input.title, '标题');
    }
    if (Object.prototype.hasOwnProperty.call(input, 'category')) {
      patch.category = normalizeCategory(input.category);
    }
    if (Object.prototype.hasOwnProperty.call(input, 'amount')) {
      patch.amountCents = toAmountCents(Number(input.amount));
    }
    if (Object.prototype.hasOwnProperty.call(input, 'expenseDate')) {
      patch.expenseDate = normalizeDate(input.expenseDate, '报销日期');
    }
    if (Object.prototype.hasOwnProperty.call(input, 'description')) {
      patch.description = normalizeString(input.description, '报销说明', true);
    }
    if (Object.prototype.hasOwnProperty.call(input, 'payeeName')) {
      patch.payeeName = normalizeString(input.payeeName, '收款人', true);
    }
    if (Object.prototype.hasOwnProperty.call(input, 'payeeAccount')) {
      patch.payeeAccount = normalizeString(input.payeeAccount, '收款账号', true);
    }
    if (entity.status === 'rejected') {
      patch.status = 'draft';
      patch.rejectReason = '';
    }

    await reimbursementRepository.updateReimbursement(entity, patch);
    return this.getReimbursementDetail(user, entity.id);
  }

  async submitReimbursement(user: CurrentUserDto, id: number) {
    const entity = ensureReimbursementExists(await reimbursementRepository.getReimbursementById(id));
    ensureCanEdit(user, entity);
    await reimbursementRepository.updateReimbursement(entity, {
      status: 'submitted',
      rejectReason: '',
      updateBy: String(user.userId),
    });
    return this.getReimbursementDetail(user, entity.id);
  }

  async approveReimbursement(user: CurrentUserDto, id: number) {
    const entity = ensureReimbursementExists(await reimbursementRepository.getReimbursementById(id));
    ensureCanApprove(user, entity);
    await reimbursementRepository.updateReimbursement(entity, {
      status: 'approved',
      approvedByUserId: user.userId,
      approvedByUsername: user.username,
      approvedTime: new Date().toISOString(),
      rejectReason: '',
      updateBy: String(user.userId),
    });
    return this.getReimbursementDetail(user, entity.id);
  }

  async rejectReimbursement(
    user: CurrentUserDto,
    id: number,
    input: RejectReimbursementRequestDto | Record<string, unknown>,
  ) {
    const entity = ensureReimbursementExists(await reimbursementRepository.getReimbursementById(id));
    ensureCanApprove(user, entity);
    const rejectReason = normalizeString(input.rejectReason, '驳回原因');
    await reimbursementRepository.updateReimbursement(entity, {
      status: 'rejected',
      rejectReason,
      approvedByUserId: user.userId,
      approvedByUsername: user.username,
      approvedTime: new Date().toISOString(),
      updateBy: String(user.userId),
    });
    return this.getReimbursementDetail(user, entity.id);
  }

  async markReimbursementPaid(user: CurrentUserDto, id: number) {
    const entity = ensureReimbursementExists(await reimbursementRepository.getReimbursementById(id));
    ensureCanMarkPaid(user, entity);
    await reimbursementRepository.updateReimbursement(entity, {
      status: 'paid',
      updateBy: String(user.userId),
    });
    return this.getReimbursementDetail(user, entity.id);
  }

  async uploadAttachment(user: CurrentUserDto, id: number, file: Express.Multer.File, authorization?: string) {
    if (!file) {
      throw new ReimbursementBusinessError('请先选择附件', HttpStatus.BAD_REQUEST);
    }

    const entity = ensureReimbursementExists(await reimbursementRepository.getReimbursementById(id));
    ensureCanEdit(user, entity);
    const targetPath = `/reimbursements/${entity.id}`;
    const uploaded = await fileServerClient.uploadAttachment({
      file,
      targetPath,
      authorization,
    });

    await reimbursementRepository.createAttachment({
      reimbursementId: entity.id,
      fileId: uploaded.fileId,
      originalFileName: uploaded.originalFileName,
      fileSize: uploaded.fileSize,
      contentType: uploaded.contentType,
      fileUrl: uploaded.fileUrl,
      createBy: String(user.userId),
    });

    return this.getReimbursementDetail(user, entity.id);
  }

  async deleteAttachment(user: CurrentUserDto, id: number, attachmentId: number) {
    const entity = ensureReimbursementExists(await reimbursementRepository.getReimbursementById(id));
    ensureCanEdit(user, entity);
    const attachment = await reimbursementRepository.getAttachmentById(attachmentId);
    if (!attachment || attachment.reimbursementId !== entity.id) {
      throw new ReimbursementBusinessError('附件不存在', HttpStatus.NOT_FOUND);
    }

    await reimbursementRepository.deleteAttachment(attachmentId);
    return this.getReimbursementDetail(user, entity.id);
  }
}

export const reimbursementService = new ReimbursementService();
