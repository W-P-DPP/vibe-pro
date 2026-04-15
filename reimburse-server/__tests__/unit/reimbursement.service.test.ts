import { jest } from '@jest/globals';
import { reimbursementRepository } from '../../src/reimbursement/reimbursement.repository.ts';
import { fileServerClient } from '../../src/reimbursement/file-server.client.ts';
import {
  ReimbursementBusinessError,
  reimbursementService,
} from '../../src/reimbursement/reimbursement.service.ts';

jest.mock('../../src/reimbursement/reimbursement.repository.ts', () => ({
  reimbursementRepository: {
    listReimbursements: jest.fn(),
    getReimbursementById: jest.fn(),
    createReimbursement: jest.fn(),
    updateReimbursement: jest.fn(),
    listAttachments: jest.fn(),
    createAttachment: jest.fn(),
    getAttachmentById: jest.fn(),
    deleteAttachment: jest.fn(),
  },
}));

jest.mock('../../src/reimbursement/file-server.client.ts', () => ({
  fileServerClient: {
    uploadAttachment: jest.fn(),
  },
}));

const employee = { userId: 7, username: 'alice', role: 'employee' as const };
const approver = { userId: 8, username: 'bob', role: 'approver' as const };
const admin = { userId: 1, username: 'root', role: 'admin' as const };

const baseEntity = {
  id: 11,
  applicantUserId: 7,
  applicantUsername: 'alice',
  title: '差旅报销',
  category: 'travel',
  amountCents: 12345,
  currency: 'CNY',
  expenseDate: '2026-04-15',
  description: '上海出差',
  payeeName: 'alice',
  payeeAccount: '6222',
  status: 'draft',
  rejectReason: '',
  approvedByUserId: null,
  approvedByUsername: '',
  approvedTime: null,
  createTime: new Date('2026-04-15T00:00:00.000Z'),
  updateTime: new Date('2026-04-15T00:00:00.000Z'),
};

describe('reimbursementService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates reimbursement bound to current user', async () => {
    jest.spyOn(reimbursementRepository, 'createReimbursement').mockResolvedValueOnce({
      ...baseEntity,
    } as never);
    jest.spyOn(reimbursementRepository, 'getReimbursementById').mockResolvedValueOnce({
      ...baseEntity,
    } as never);
    jest.spyOn(reimbursementRepository, 'listAttachments').mockResolvedValueOnce([] as never);

    const result = await reimbursementService.createReimbursement(employee, {
      title: '差旅报销',
      category: 'travel',
      amount: 123.45,
      expenseDate: '2026-04-15',
      description: '上海出差',
    });

    expect(reimbursementRepository.createReimbursement).toHaveBeenCalledWith(
      expect.objectContaining({
        applicantUserId: 7,
        applicantUsername: 'alice',
        amountCents: 12345,
      }),
    );
    expect(result.applicantUserId).toBe(7);
  });

  it('rejects approval from employee role', async () => {
    jest.spyOn(reimbursementRepository, 'getReimbursementById').mockResolvedValueOnce({
      ...baseEntity,
      status: 'submitted',
    } as never);

    await expect(reimbursementService.approveReimbursement(employee, 11)).rejects.toBeInstanceOf(
      ReimbursementBusinessError,
    );
  });

  it('allows approver to approve submitted reimbursement', async () => {
    jest.spyOn(reimbursementRepository, 'getReimbursementById').mockResolvedValueOnce({
      ...baseEntity,
      status: 'submitted',
    } as never);
    jest.spyOn(reimbursementRepository, 'updateReimbursement').mockResolvedValueOnce({} as never);
    jest.spyOn(reimbursementRepository, 'getReimbursementById').mockResolvedValueOnce({
      ...baseEntity,
      status: 'approved',
      approvedByUserId: 8,
      approvedByUsername: 'bob',
      approvedTime: '2026-04-16T00:00:00.000Z',
    } as never);
    jest.spyOn(reimbursementRepository, 'listAttachments').mockResolvedValueOnce([] as never);

    const result = await reimbursementService.approveReimbursement(approver, 11);

    expect(reimbursementRepository.updateReimbursement).toHaveBeenCalled();
    expect(result.status).toBe('approved');
  });

  it('returns rejected reimbursement to draft on update', async () => {
    jest.spyOn(reimbursementRepository, 'getReimbursementById').mockResolvedValueOnce({
      ...baseEntity,
      status: 'rejected',
      rejectReason: '缺少附件',
    } as never);
    jest.spyOn(reimbursementRepository, 'updateReimbursement').mockResolvedValueOnce({} as never);
    jest.spyOn(reimbursementRepository, 'getReimbursementById').mockResolvedValueOnce({
      ...baseEntity,
      status: 'draft',
      rejectReason: '',
      title: '更新后的报销单',
    } as never);
    jest.spyOn(reimbursementRepository, 'listAttachments').mockResolvedValueOnce([] as never);

    const result = await reimbursementService.updateReimbursement(employee, 11, {
      title: '更新后的报销单',
    });

    expect(reimbursementRepository.updateReimbursement).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ status: 'draft', rejectReason: '' }),
    );
    expect(result.status).toBe('draft');
  });

  it('uploads attachment via file-server and saves metadata', async () => {
    jest.spyOn(reimbursementRepository, 'getReimbursementById').mockResolvedValueOnce({
      ...baseEntity,
    } as never);
    jest.spyOn(fileServerClient, 'uploadAttachment').mockResolvedValueOnce({
      fileId: '/reimbursements/11/invoice.pdf',
      fileUrl: 'http://127.0.0.1:30010/api/file/preview?targetPath=%2Freimbursements%2F11%2Finvoice.pdf',
      originalFileName: 'invoice.pdf',
      fileSize: 1024,
      contentType: 'application/pdf',
    } as never);
    jest.spyOn(reimbursementRepository, 'createAttachment').mockResolvedValueOnce({} as never);
    jest.spyOn(reimbursementRepository, 'getReimbursementById').mockResolvedValueOnce({
      ...baseEntity,
    } as never);
    jest.spyOn(reimbursementRepository, 'listAttachments').mockResolvedValueOnce([
      {
        id: 1,
        reimbursementId: 11,
        fileId: '/reimbursements/11/invoice.pdf',
        originalFileName: 'invoice.pdf',
        fileSize: 1024,
        contentType: 'application/pdf',
        fileUrl: 'http://127.0.0.1:30010/api/file/preview?targetPath=%2Freimbursements%2F11%2Finvoice.pdf',
        createTime: new Date('2026-04-15T00:00:00.000Z'),
      },
    ] as never);

    const result = await reimbursementService.uploadAttachment(
      employee,
      11,
      {
        originalname: 'invoice.pdf',
        size: 1024,
        mimetype: 'application/pdf',
        buffer: Buffer.from('pdf'),
      } as never,
      'Bearer token',
    );

    expect(fileServerClient.uploadAttachment).toHaveBeenCalled();
    expect(reimbursementRepository.createAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ reimbursementId: 11, originalFileName: 'invoice.pdf' }),
    );
    expect(result.attachments).toHaveLength(1);
  });

  it('allows admin to mark approved reimbursement as paid', async () => {
    jest.spyOn(reimbursementRepository, 'getReimbursementById').mockResolvedValueOnce({
      ...baseEntity,
      status: 'approved',
    } as never);
    jest.spyOn(reimbursementRepository, 'updateReimbursement').mockResolvedValueOnce({} as never);
    jest.spyOn(reimbursementRepository, 'getReimbursementById').mockResolvedValueOnce({
      ...baseEntity,
      status: 'paid',
    } as never);
    jest.spyOn(reimbursementRepository, 'listAttachments').mockResolvedValueOnce([] as never);

    const result = await reimbursementService.markReimbursementPaid(admin, 11);

    expect(result.status).toBe('paid');
  });
});
