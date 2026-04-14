import type { Request, Response } from 'express';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import { resolveCurrentUser } from '../auth/current-user.ts';
import { AgentBusinessError, agentService } from './agent.service.ts';

export async function getModels(req: Request, res: Response) {
  try {
    resolveCurrentUser(req);
    const result = await agentService.getModels();
    res.sendSuccess(result, '获取模型列表成功');
  } catch (error) {
    if (error instanceof AgentBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取模型列表失败', HttpStatus.ERROR);
  }
}

export async function getAgentMe(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await agentService.getAgentMe(currentUser.userId);
    res.sendSuccess(result, '获取 Agent 信息成功');
  } catch (error) {
    if (error instanceof AgentBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail(
      '获取 Agent 信息失败',
      HttpStatus.ERROR,
    );
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await agentService.getCurrentUser(currentUser);
    res.sendSuccess(result, '获取当前用户信息成功');
  } catch (error) {
    if (error instanceof AgentBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail(
      '获取当前用户信息失败',
      HttpStatus.ERROR,
    );
  }
}

export async function getDefaultBindings(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await agentService.listBindings(currentUser.userId);
    res.sendSuccess(result, '获取知识库绑定成功');
  } catch (error) {
    if (error instanceof AgentBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail(
      '获取知识库绑定失败',
      HttpStatus.ERROR,
    );
  }
}

export async function updateDefaultBindings(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const payload = req.body as { knowledgeBaseIds?: number[] };
    const result = await agentService.updateBindings(
      currentUser.userId,
      payload.knowledgeBaseIds ?? [],
    );
    res.sendSuccess(result, '更新知识库绑定成功');
  } catch (error) {
    if (error instanceof AgentBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail(
      '更新知识库绑定失败',
      HttpStatus.ERROR,
    );
  }
}

export async function getOpenAiModels(req: Request, res: Response) {
  try {
    resolveCurrentUser(req);
    const result = await agentService.getOpenAiModels();
    res.sendSuccess(result, '获取 OpenAI 模型目录成功');
  } catch (error) {
    if (error instanceof AgentBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail(
      '获取 OpenAI 模型目录失败',
      HttpStatus.ERROR,
    );
  }
}

export async function getProviderModels(req: Request, res: Response) {
  try {
    resolveCurrentUser(req);
    const result = await agentService.getProviderModels(String(req.params.provider ?? ''));
    res.sendSuccess(result, '获取模型列表成功');
  } catch (error) {
    if (error instanceof AgentBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取模型列表失败', HttpStatus.ERROR);
  }
}
