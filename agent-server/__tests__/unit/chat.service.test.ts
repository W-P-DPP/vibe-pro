import { jest } from '@jest/globals';
import { agentService } from '../../src/agent/agent.service.ts';
import { chatRepository } from '../../src/chat/chat.repository.ts';
import { chatProvider } from '../../src/chat/chat.provider.ts';
import { ChatBusinessError, chatService } from '../../src/chat/chat.service.ts';
import { knowledgeService } from '../../src/knowledge/knowledge.service.ts';

async function collectEvents<T>(iterator: AsyncGenerator<T>) {
  const events: T[] = [];
  for await (const event of iterator) {
    events.push(event);
  }
  return events;
}

async function* streamChunks(...chunks: string[]) {
  for (const chunk of chunks) {
    yield chunk;
  }
}

describe('chatService session identifiers', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('maps session responses to uuid identifiers', async () => {
    jest.spyOn(chatRepository, 'listSessions').mockResolvedValue([
      {
        id: 1,
        sessionId: 'uuid-session-1',
        ownerUserId: 7,
        title: 'session-title',
        lastMessageAt: new Date('2026-04-13T08:00:00.000Z'),
        createTime: new Date('2026-04-13T07:00:00.000Z'),
      } as never,
    ]);

    const result = await chatService.getSessions(7);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'uuid-session-1',
        title: 'session-title',
      }),
    ]);
  });

  it('rejects message query when session does not exist', async () => {
    jest.spyOn(chatRepository, 'getSessionById').mockResolvedValue(null);

    await expect(chatService.getMessages(7, 'uuid-missing')).rejects.toEqual(
      expect.objectContaining({
        name: ChatBusinessError.name,
        statusCode: 404,
      }),
    );
  });

  it('deletes session by uuid identifier', async () => {
    const deleteSpy = jest.spyOn(chatRepository, 'deleteSession').mockResolvedValue({
      id: 2,
      sessionId: 'uuid-delete-1',
      ownerUserId: 7,
      title: 'to-delete',
    } as never);

    const result = await chatService.deleteSession(7, 'uuid-delete-1');

    expect(deleteSpy).toHaveBeenCalledWith(7, 'uuid-delete-1');
    expect(result).toEqual({ id: 'uuid-delete-1' });
  });

  it('streams replies with uuid session identifiers and completion metadata', async () => {
    const createRunSpy = jest.spyOn(chatRepository, 'createRun').mockResolvedValue({ id: 99 } as never);
    const createMessageSpy = jest
      .spyOn(chatRepository, 'createMessage')
      .mockResolvedValueOnce({ id: 101 } as never)
      .mockResolvedValueOnce({
        id: 102,
        role: 'assistant',
        content: 'hello world',
        provider: 'openai',
        model: 'gpt-5',
        createTime: new Date('2026-04-13T08:01:00.000Z'),
      } as never);

    jest.spyOn(chatRepository, 'getSessionById').mockResolvedValue({
      id: 1,
      sessionId: 'uuid-stream-1',
      ownerUserId: 7,
      title: '新会话',
      createTime: new Date('2026-04-13T08:00:00.000Z'),
    } as never);
    jest.spyOn(agentService, 'getDefaultAgentProfile').mockResolvedValue({
      id: 3,
      systemPrompt: 'system',
      defaultProvider: 'openai',
      defaultModel: 'gpt-5',
    } as never);
    jest.spyOn(agentService, 'listBindings').mockResolvedValue([]);
    jest.spyOn(agentService, 'getProviderModels').mockResolvedValue({
      provider: 'openai',
      defaultModel: 'gpt-5',
      models: [{ value: 'gpt-5', label: 'gpt-5', provider: 'openai', model: 'gpt-5' }],
    });
    jest.spyOn(knowledgeService, 'searchAcrossKnowledgeBases').mockResolvedValue([]);
    jest
      .spyOn(chatRepository, 'updateSessionActivity')
      .mockResolvedValueOnce({
        id: 1,
        sessionId: 'uuid-stream-1',
        ownerUserId: 7,
        title: 'hello',
        lastMessageAt: new Date('2026-04-13T08:00:10.000Z'),
        createTime: new Date('2026-04-13T08:00:00.000Z'),
      } as never)
      .mockResolvedValueOnce({
        id: 1,
        sessionId: 'uuid-stream-1',
        ownerUserId: 7,
        title: 'hello',
        lastMessageAt: new Date('2026-04-13T08:00:20.000Z'),
        createTime: new Date('2026-04-13T08:00:00.000Z'),
      } as never);
    jest.spyOn(chatRepository, 'listMessages').mockResolvedValue([
      {
        id: 101,
        role: 'user',
        content: 'hello',
        provider: '',
        model: '',
        createTime: new Date('2026-04-13T08:00:00.000Z'),
      } as never,
    ]);
    jest.spyOn(chatRepository, 'completeRun').mockResolvedValue({ durationMs: 25 } as never);
    jest.spyOn(chatProvider, 'streamAgentReply').mockImplementation(() => streamChunks('hello ', 'world'));

    const events = await collectEvents(
      chatService.streamSessionReply(
        { userId: 7, username: 'alice' },
        'uuid-stream-1',
        {
          message: 'hello',
          knowledgeBaseIds: [],
          provider: 'openai',
          model: 'gpt-5',
        },
      ),
    );

    expect(createRunSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'uuid-stream-1',
      }),
    );
    expect(createMessageSpy).toHaveBeenCalledTimes(2);
    expect(events[0]).toMatchObject({
      event: 'run-start',
      data: expect.objectContaining({
        sessionId: 'uuid-stream-1',
      }),
    });
    expect(events.find((item) => item.event === 'message-complete')).toMatchObject({
      event: 'message-complete',
      data: {
        message: expect.objectContaining({
          id: 102,
          content: 'hello world',
        }),
        session: expect.objectContaining({
          id: 'uuid-stream-1',
          title: 'hello',
        }),
      },
    });
    expect(events.at(-1)).toMatchObject({
      event: 'run-complete',
      data: expect.objectContaining({
        status: 'success',
      }),
    });
  });

  it('rejects invalid selected models before running the stream', async () => {
    jest.spyOn(chatRepository, 'getSessionById').mockResolvedValue({
      id: 1,
      sessionId: 'uuid-invalid-model',
      ownerUserId: 7,
      title: '新会话',
    } as never);
    jest.spyOn(agentService, 'getDefaultAgentProfile').mockResolvedValue({
      id: 3,
      systemPrompt: 'system',
      defaultProvider: 'openai',
      defaultModel: 'gpt-5',
    } as never);
    jest.spyOn(agentService, 'listBindings').mockResolvedValue([]);
    jest.spyOn(agentService, 'getProviderModels').mockResolvedValue({
      provider: 'openai',
      defaultModel: 'gpt-5',
      models: [{ value: 'gpt-5', label: 'gpt-5', provider: 'openai', model: 'gpt-5' }],
    });

    await expect(
      collectEvents(
        chatService.streamSessionReply(
          { userId: 7, username: 'alice' },
          'uuid-invalid-model',
          {
            message: 'hello',
            knowledgeBaseIds: [],
            provider: 'openai',
            model: 'gpt-4.1',
          },
        ),
      ),
    ).rejects.toEqual(
      expect.objectContaining({
        name: ChatBusinessError.name,
        statusCode: 400,
      }),
    );
  });

  it('treats empty streamed replies as failures without persisting assistant messages', async () => {
    const createMessageSpy = jest
      .spyOn(chatRepository, 'createMessage')
      .mockResolvedValueOnce({ id: 101 } as never);

    jest.spyOn(chatRepository, 'getSessionById').mockResolvedValue({
      id: 1,
      sessionId: 'uuid-empty-reply',
      ownerUserId: 7,
      title: '新会话',
      createTime: new Date('2026-04-13T08:00:00.000Z'),
    } as never);
    jest.spyOn(agentService, 'getDefaultAgentProfile').mockResolvedValue({
      id: 3,
      systemPrompt: 'system',
      defaultProvider: 'openai',
      defaultModel: 'gpt-5',
    } as never);
    jest.spyOn(agentService, 'listBindings').mockResolvedValue([]);
    jest.spyOn(agentService, 'getProviderModels').mockResolvedValue({
      provider: 'openai',
      defaultModel: 'gpt-5',
      models: [{ value: 'gpt-5', label: 'gpt-5', provider: 'openai', model: 'gpt-5' }],
    });
    jest.spyOn(knowledgeService, 'searchAcrossKnowledgeBases').mockResolvedValue([]);
    jest.spyOn(chatRepository, 'updateSessionActivity').mockResolvedValue({
      id: 1,
      sessionId: 'uuid-empty-reply',
      ownerUserId: 7,
      title: 'hello',
      lastMessageAt: new Date('2026-04-13T08:00:10.000Z'),
      createTime: new Date('2026-04-13T08:00:00.000Z'),
    } as never);
    jest.spyOn(chatRepository, 'createRun').mockResolvedValue({ id: 99 } as never);
    jest.spyOn(chatRepository, 'listMessages').mockResolvedValue([
      {
        id: 101,
        role: 'user',
        content: 'hello',
        provider: '',
        model: '',
        createTime: new Date('2026-04-13T08:00:00.000Z'),
      } as never,
    ]);
    const completeRunSpy = jest.spyOn(chatRepository, 'completeRun').mockResolvedValue({ durationMs: 12 } as never);
    jest.spyOn(chatProvider, 'streamAgentReply').mockImplementation(() => streamChunks());

    const events = await collectEvents(
      chatService.streamSessionReply(
        { userId: 7, username: 'alice' },
        'uuid-empty-reply',
        {
          message: 'hello',
          knowledgeBaseIds: [],
          provider: 'openai',
          model: 'gpt-5',
        },
      ),
    );

    expect(createMessageSpy).toHaveBeenCalledTimes(1);
    expect(completeRunSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 99,
        status: 'failed',
      }),
    );
    expect(events.at(-1)).toMatchObject({
      event: 'error',
      data: expect.objectContaining({
        status: 'failed',
      }),
    });
  });
});
