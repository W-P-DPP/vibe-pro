import type { Request, Response } from 'express';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import { resolveCurrentUser } from '../auth/current-user.ts';
import { ReimbursementBusinessError, reimbursementService } from './reimbursement.service.ts';
import type { ReimbursementStatus } from './reimbursement.dto.ts';

function handleFailure(res: Response, error: unknown, fallbackMessage: string) {
  if (error instanceof ReimbursementBusinessError) {
    return res.status(error.statusCode).sendFail(error.message, error.statusCode);
  }

  return res.status(HttpStatus.ERROR).sendFail(fallbackMessage, HttpStatus.ERROR);
}

export async function listReimbursements(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const status = typeof req.query.status === 'string' ? (req.query.status as ReimbursementStatus) : undefined;
    const result = await reimbursementService.listReimbursements(currentUser, status);
    return res.sendSuccess(result, '获取报销单列表成功');
  } catch (error) {
    return handleFailure(res, error, '获取报销单列表失败');
  }
}

export async function getReimbursementDetail(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await reimbursementService.getReimbursementDetail(currentUser, Number(req.params.id));
    return res.sendSuccess(result, '获取报销单详情成功');
  } catch (error) {
    return handleFailure(res, error, '获取报销单详情失败');
  }
}

export async function createReimbursement(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await reimbursementService.createReimbursement(currentUser, req.body);
    return res.sendSuccess(result, '创建报销单成功');
  } catch (error) {
    return handleFailure(res, error, '创建报销单失败');
  }
}

export async function updateReimbursement(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await reimbursementService.updateReimbursement(currentUser, Number(req.params.id), req.body);
    return res.sendSuccess(result, '更新报销单成功');
  } catch (error) {
    return handleFailure(res, error, '更新报销单失败');
  }
}

export async function submitReimbursement(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await reimbursementService.submitReimbursement(currentUser, Number(req.params.id));
    return res.sendSuccess(result, '提交报销单成功');
  } catch (error) {
    return handleFailure(res, error, '提交报销单失败');
  }
}

export async function approveReimbursement(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await reimbursementService.approveReimbursement(currentUser, Number(req.params.id));
    return res.sendSuccess(result, '审批通过成功');
  } catch (error) {
    return handleFailure(res, error, '审批通过失败');
  }
}

export async function rejectReimbursement(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await reimbursementService.rejectReimbursement(currentUser, Number(req.params.id), req.body);
    return res.sendSuccess(result, '驳回报销单成功');
  } catch (error) {
    return handleFailure(res, error, '驳回报销单失败');
  }
}

export async function markReimbursementPaid(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await reimbursementService.markReimbursementPaid(currentUser, Number(req.params.id));
    return res.sendSuccess(result, '标记已付款成功');
  } catch (error) {
    return handleFailure(res, error, '标记已付款失败');
  }
}

export async function uploadReimbursementAttachment(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await reimbursementService.uploadAttachment(
      currentUser,
      Number(req.params.id),
      req.file as Express.Multer.File,
      req.headers.authorization,
    );
    return res.sendSuccess(result, '上传附件成功');
  } catch (error) {
    return handleFailure(res, error, '上传附件失败');
  }
}

export async function deleteReimbursementAttachment(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await reimbursementService.deleteAttachment(
      currentUser,
      Number(req.params.id),
      Number(req.params.attachmentId),
    );
    return res.sendSuccess(result, '删除附件成功');
  } catch (error) {
    return handleFailure(res, error, '删除附件失败');
  }
}
