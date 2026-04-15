import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import {
  agentService,
  FIXED_AGENT_MODEL,
  FIXED_AGENT_PROVIDER,
} from '../agent/agent.service.ts';
import type { CurrentUserDto } from '../auth/current-user.ts';
import { knowledgeService } from '../knowledge/knowledge.service.ts';
import type {
  ChatMessageResponseDto,
  ChatSessionResponseDto,
  ChatStreamEvent,
  StreamChatSessionRequestDto,
} from './chat.dto.ts';
import { chatProvider } from './chat.provider.ts';
import { chatRepository } from './chat.repository.ts';

export class ChatBusinessError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = HttpStatus.BAD_REQUEST,
  ) {
    super(message);
    this.name = 'ChatBusinessError';
  }
}

function normalizeDateTime(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
}

function normalizeSessionId(value: unknown) {
  if (typeof value !== 'string') {
    throw new ChatBusinessError('会话标识无效');
  }

  const sessionId = value.trim();
  if (!sessionId) {
    throw new ChatBusinessError('会话标识无效');
  }

  return sessionId;
}

function toSessionResponse(
  entity: Awaited<ReturnType<typeof chatRepository.listSessions>>[number],
): ChatSessionResponseDto {
  return {
    id: entity.sessionId,
    title: entity.title,
    lastMessageAt: normalizeDateTime(entity.lastMessageAt),
    createTime: normalizeDateTime(entity.createTime),
  };
}

function toMessageResponse(
  entity: Awaited<ReturnType<typeof chatRepository.listMessages>>[number],
): ChatMessageResponseDto {
  return {
    id: entity.id,
    role: entity.role,
    content: entity.content,
    provider: entity.provider,
    model: entity.model,
    createTime: normalizeDateTime(entity.createTime),
  };
}

function normalizeSessionTitle(value?: string) {
  if (!value || !value.trim()) {
    return '新会话';
  }

  return value.trim().slice(0, 60);
}

function buildSessionTitleFromMessage(message: string) {
  return normalizeSessionTitle(message.replace(/\s+/g, ' ').trim().slice(0, 24) || '新会话');
}

export class ChatService {
  async getSessions(ownerUserId: number) {
    const sessions = await chatRepository.listSessions(ownerUserId);
    return sessions.map(toSessionResponse);
  }

  async createSession(ownerUserId: number, title?: string) {
    const created = await chatRepository.createSession(ownerUserId, normalizeSessionTitle(title));
    return toSessionResponse(created);
  }

  async getMessages(ownerUserId: number, sessionId: string) {
    const normalizedSessionId = normalizeSessionId(sessionId);
    const session = await chatRepository.getSessionById(ownerUserId, normalizedSessionId);
    if (!session) {
      throw new ChatBusinessError('会话不存在', HttpStatus.NOT_FOUND);
    }

    const messages = await chatRepository.listMessages(ownerUserId, normalizedSessionId);
    return messages.map(toMessageResponse);
  }

  async deleteSession(ownerUserId: number, sessionId: string) {
    const normalizedSessionId = normalizeSessionId(sessionId);
    const deleted = await chatRepository.deleteSession(ownerUserId, normalizedSessionId);

    if (!deleted) {
      throw new ChatBusinessError('会话不存在', HttpStatus.NOT_FOUND);
    }

    return {
      id: deleted.sessionId,
    };
  }

  async *streamSessionReply(
    currentUser: CurrentUserDto,
    sessionId: string,
    input: StreamChatSessionRequestDto,
  ): AsyncGenerator<ChatStreamEvent> {
    const normalizedSessionId = normalizeSessionId(sessionId);
    const question = typeof input.message === 'string' ? input.message.trim() : '';
    if (!question) {
      throw new ChatBusinessError('消息内容不能为空');
    }

    const session = await chatRepository.getSessionById(currentUser.userId, normalizedSessionId);
    if (!session) {
      throw new ChatBusinessError('会话不存在', HttpStatus.NOT_FOUND);
    }

    const agent = await agentService.getDefaultAgentProfile();
    const availableBindings = await agentService.listBindings(currentUser.userId);
    const availableKnowledgeBaseIds = new Set(
      availableBindings.map((item) => item.knowledgeBaseId),
    );
    const selectedKnowledgeBaseIds = Array.from(
      new Set(
        (input.knowledgeBaseIds ?? [])
          .map((item) => Number(item))
          .filter((item) => Number.isInteger(item) && item > 0),
      ),
    );

    if (selectedKnowledgeBaseIds.some((item) => !availableKnowledgeBaseIds.has(item))) {
      throw new ChatBusinessError('存在未绑定或不可用的知识库', HttpStatus.BAD_REQUEST);
    }

    const provider = FIXED_AGENT_PROVIDER;
    const model = FIXED_AGENT_MODEL;
    const sessionTitle =
      session.title === '新会话' ? buildSessionTitleFromMessage(question) : session.title;

    const updatedSession = await chatRepository.updateSessionActivity(
      currentUser.userId,
      normalizedSessionId,
      sessionTitle,
    );
    const run = await chatRepository.createRun({
      ownerUserId: currentUser.userId,
      sessionId: normalizedSessionId,
      agentProfileId: agent.id,
      provider,
      model,
      selectedKnowledgeBaseIds,
    });
    await chatRepository.createMessage({
      ownerUserId: currentUser.userId,
      sessionId: normalizedSessionId,
      role: 'user',
      content: question,
      runId: run.id,
    });

    yield {
      event: 'run-start',
      data: {
        runId: run.id,
        sessionId: normalizedSessionId,
        provider,
        model,
      },
    };

    try {
      const retrievedItems = selectedKnowledgeBaseIds.length
        ? await knowledgeService.searchAcrossKnowledgeBases(
            currentUser.userId,
            selectedKnowledgeBaseIds,
            question,
          )
        : [];

      yield {
        event: 'retrieval-result',
        data: {
          knowledgeBaseIds: selectedKnowledgeBaseIds,
          count: retrievedItems.length,
          items: retrievedItems,
        },
      };

      const history = (await chatRepository.listMessages(currentUser.userId, normalizedSessionId))
        .slice(0, -1)
        .slice(-12)
        .map(toMessageResponse);

      let assistantContent = '';
      for await (const chunk of chatProvider.streamAgentReply({
        model,
        systemPrompt: agent.systemPrompt,
        history: history.filter((item) => item.role !== 'assistant' || item.content.trim()),
        question,
        retrievedItems: retrievedItems.map((item) => ({
          documentName: item.documentName,
          snippet: item.snippet,
        })),
      })) {
        assistantContent += chunk;
        yield {
          event: 'token',
          data: {
            content: chunk,
          },
        };
      }

      const finalAssistantContent = assistantContent.trim();
      if (!finalAssistantContent) {
        await chatRepository.completeRun({
          ownerUserId: currentUser.userId,
          runId: run.id,
          status: 'failed',
          retrievedChunkCount: retrievedItems.length,
          errorMessage: '当前模型未返回有效回复',
        });

        yield {
          event: 'error',
          data: {
            runId: run.id,
            status: 'failed',
            message: '当前模型未返回有效回复，请重试',
          },
        };
        return;
      }

      const assistantMessageEntity = await chatRepository.createMessage({
        ownerUserId: currentUser.userId,
        sessionId: normalizedSessionId,
        role: 'assistant',
        content: finalAssistantContent,
        provider,
        model,
        runId: run.id,
      });

      const completedRun = await chatRepository.completeRun({
        ownerUserId: currentUser.userId,
        runId: run.id,
        status: 'success',
        retrievedChunkCount: retrievedItems.length,
      });
      const completedSession = await chatRepository.updateSessionActivity(
        currentUser.userId,
        normalizedSessionId,
      );

      yield {
        event: 'message-complete',
        data: {
          message: toMessageResponse(assistantMessageEntity),
          session: toSessionResponse(
            (completedSession ?? updatedSession ?? session) as Awaited<
              ReturnType<typeof chatRepository.listSessions>
            >[number],
          ),
        },
      };

      yield {
        event: 'run-complete',
        data: {
          runId: run.id,
          status: 'success',
          durationMs: completedRun?.durationMs ?? 0,
        },
      };
    } catch (error) {
      await chatRepository.completeRun({
        ownerUserId: currentUser.userId,
        runId: run.id,
        status: 'failed',
        retrievedChunkCount: 0,
        errorMessage: error instanceof Error ? error.message : '会话执行失败',
      });

      yield {
        event: 'error',
        data: {
          runId: run.id,
          status: 'failed',
          message: error instanceof Error ? error.message : '会话执行失败',
        },
      };
    }
  }
}

export const chatService = new ChatService();
