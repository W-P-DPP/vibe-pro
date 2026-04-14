import type { Request, Response } from 'express';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import { resolveCurrentUser } from '../auth/current-user.ts';
import { ChatBusinessError, chatService } from './chat.service.ts';

function resolveSessionId(req: Request) {
  return typeof req.params.id === 'string' ? req.params.id.trim() : '';
}




export async function getChatSessions(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await chatService.getSessions(currentUser.userId);
    res.sendSuccess(result, '获取会话列表成功');
  } catch (error) {
    if (error instanceof ChatBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取会话列表失败', HttpStatus.ERROR);
  }
}

export async function createChatSession(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const payload = req.body as { title?: string };
    const result = await chatService.createSession(currentUser.userId, payload.title);
    res.sendSuccess(result, '创建会话成功');
  } catch (error) {
    if (error instanceof ChatBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('创建会话失败', HttpStatus.ERROR);
  }
}

export async function deleteChatSession(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await chatService.deleteSession(currentUser.userId, resolveSessionId(req));
    res.sendSuccess(result, '删除会话成功');
  } catch (error) {
    if (error instanceof ChatBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('删除会话失败', HttpStatus.ERROR);
  }
}

export async function getChatMessages(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const result = await chatService.getMessages(currentUser.userId, resolveSessionId(req));
    res.sendSuccess(result, '获取消息列表成功');
  } catch (error) {
    if (error instanceof ChatBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取消息列表失败', HttpStatus.ERROR);
  }
}

function writeSseEvent(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export async function streamChatSession(req: Request, res: Response) {
  try {
    const currentUser = resolveCurrentUser(req);
    const sessionId = resolveSessionId(req);

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    for await (const event of chatService.streamSessionReply(currentUser, sessionId, req.body)) {
      writeSseEvent(res, event.event, event.data);
    }

    res.end();
  } catch (error) {
    if (!res.headersSent) {
      if (error instanceof ChatBusinessError) {
        return res.status(error.statusCode).sendFail(error.message, error.statusCode);
      }

      return res.status(HttpStatus.ERROR).sendFail('发起会话失败', HttpStatus.ERROR);
    }

    writeSseEvent(res, 'error', {
      message: error instanceof Error ? error.message : '会话执行失败',
    });
    res.end();
  }
}
