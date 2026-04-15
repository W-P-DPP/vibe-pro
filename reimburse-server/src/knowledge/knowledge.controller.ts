import type { Request, Response } from 'express';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import { resolveCurrentUser } from '../auth/current-user.ts';
import { KnowledgeBusinessError, knowledgeService } from './knowledge.service.ts';

export async function getKnowledgeBases(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await knowledgeService.getKnowledgeBases(currentUser.userId);
    res.sendSuccess(result, '获取知识库列表成功');
  } catch (error) {
    if (error instanceof KnowledgeBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取知识库列表失败', HttpStatus.ERROR);
  }
}

export async function createKnowledgeBase(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await knowledgeService.createKnowledgeBase(currentUser.userId, req.body);
    res.sendSuccess(result, '创建知识库成功');
  } catch (error) {
    if (error instanceof KnowledgeBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('创建知识库失败', HttpStatus.ERROR);
  }
}

export async function getKnowledgeBaseDetail(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await knowledgeService.getKnowledgeBaseDetail(
      currentUser.userId,
      Number(req.params.id),
    );
    res.sendSuccess(result, '获取知识库详情成功');
  } catch (error) {
    if (error instanceof KnowledgeBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取知识库详情失败', HttpStatus.ERROR);
  }
}

export async function getKnowledgeDocuments(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await knowledgeService.getKnowledgeBaseDocuments(
      currentUser.userId,
      Number(req.params.id),
    );
    res.sendSuccess(result, '获取文档列表成功');
  } catch (error) {
    if (error instanceof KnowledgeBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取文档列表失败', HttpStatus.ERROR);
  }
}

export async function uploadKnowledgeDocument(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await knowledgeService.uploadKnowledgeDocument(
      currentUser.userId,
      Number(req.params.id),
      req.file,
    );
    res.sendSuccess(result, '上传文档成功');
  } catch (error) {
    if (error instanceof KnowledgeBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('上传文档失败', HttpStatus.ERROR);
  }
}

export async function searchKnowledge(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const payload = req.body as { query?: string };
    const result = await knowledgeService.searchKnowledgeBase(
      currentUser.userId,
      Number(req.params.id),
      payload.query ?? '',
    );
    res.sendSuccess({ items: result }, '知识库检索成功');
  } catch (error) {
    if (error instanceof KnowledgeBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('知识库检索失败', HttpStatus.ERROR);
  }
}
