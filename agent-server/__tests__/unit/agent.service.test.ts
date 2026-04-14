import { jest } from '@jest/globals';
import { agentRepository } from '../../src/agent/agent.repository.ts';
import { agentService, AgentBusinessError } from '../../src/agent/agent.service.ts';

jest.mock('../../src/agent/agent.repository.ts', () => ({
  agentRepository: {
    getDefaultAgent: jest.fn(async () => ({
      id: 1,
      code: 'default-agent',
      name: 'default-agent',
      description: '',
      systemPrompt: '',
      defaultProvider: 'openai',
      defaultModel: 'gpt-5',
      status: 1,
    })),
    listBindings: jest.fn(),
    replaceBindings: jest.fn(),
  },
}));

jest.mock('../../src/knowledge/knowledge.repository.ts', () => ({
  knowledgeRepository: {
    getKnowledgeBasesByIds: jest.fn(),
  },
}));

const originalFetch = global.fetch;

function mockFetchJsonOnce(payload: unknown, ok = true) {
  global.fetch = jest.fn(async () => ({
    ok,
    json: async () => payload,
  })) as typeof fetch;
}

describe('agentService.getModels', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('returns the unified model catalog with configured default model', async () => {
    mockFetchJsonOnce({
      data: [{ id: 'gpt-5' }, { id: 'gpt-5-mini' }, { id: 'gpt-5' }],
    });

    const result = await agentService.getModels();

    expect(result.defaultProvider).toBe('openai');
    expect(result.defaultModel).toBe('gpt-5');
    expect(result.models).toEqual(
      expect.arrayContaining([
        { value: 'gpt-5', label: 'gpt-5', provider: 'openai', model: 'gpt-5' },
        {
          value: 'gpt-5-mini',
          label: 'gpt-5-mini',
          provider: 'openai',
          model: 'gpt-5-mini',
        },
        {
          value: 'claude-sonnet-4-20250514',
          label: 'Claude Sonnet 4',
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
        },
      ]),
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/models'),
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it('falls back to first returned model when configured default is unavailable', async () => {
    mockFetchJsonOnce({
      data: [{ id: 'gpt-4.1' }, { id: 'gpt-4.1-mini' }],
    });

    const result = await agentService.getModels();

    expect(result.defaultProvider).toBe('openai');
    expect(result.defaultModel).toBe('gpt-4.1');
  });

  it('falls back within the configured default provider when the default model is unavailable', async () => {
    jest.spyOn(agentRepository, 'getDefaultAgent').mockResolvedValueOnce({
      id: 1,
      code: 'default-agent',
      name: 'default-agent',
      description: '',
      systemPrompt: '',
      defaultProvider: 'anthropic',
      defaultModel: 'claude-missing',
      status: 1,
    } as never);
    mockFetchJsonOnce({
      data: [{ id: 'gpt-5' }],
    });

    const result = await agentService.getModels();

    expect(result.defaultProvider).toBe('anthropic');
    expect(result.defaultModel).toBe('claude-sonnet-4-20250514');
  });

  it('keeps the unified catalog available when openai catalog loading fails', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      json: async () => ({}),
    })) as typeof fetch;

    const result = await agentService.getModels();

    expect(result.defaultProvider).toBe('anthropic');
    expect(result.defaultModel).toBe('claude-sonnet-4-20250514');
    expect(result.models).toEqual([
      {
        value: 'claude-sonnet-4-20250514',
        label: 'Claude Sonnet 4',
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
      },
      {
        value: 'claude-3-7-sonnet-latest',
        label: 'Claude 3.7 Sonnet',
        provider: 'anthropic',
        model: 'claude-3-7-sonnet-latest',
      },
      {
        value: 'claude-3-5-haiku-latest',
        label: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        model: 'claude-3-5-haiku-latest',
      },
    ]);
  });

  it('falls back to other providers when openai gateway payload is invalid', async () => {
    mockFetchJsonOnce({
      data: [{ object: 'model-without-id' }],
    });

    const result = await agentService.getModels();

    expect(result.defaultProvider).toBe('anthropic');
    expect(result.defaultModel).toBe('claude-sonnet-4-20250514');
    expect(result.models.every((item) => item.provider === 'anthropic')).toBe(true);
  });

  it('rejects invalid gateway payload on the legacy openai-only endpoint', async () => {
    mockFetchJsonOnce({
      data: [{ object: 'model-without-id' }],
    });

    await expect(agentService.getOpenAiModels()).rejects.toBeInstanceOf(AgentBusinessError);
  });

  it('keeps the legacy openai catalog method compatible', async () => {
    mockFetchJsonOnce({
      data: [{ id: 'gpt-5' }],
    });

    const result = await agentService.getOpenAiModels();

    expect(result).toEqual({
      provider: 'openai',
      defaultModel: 'gpt-5',
      models: [{ value: 'gpt-5', label: 'gpt-5', provider: 'openai', model: 'gpt-5' }],
    });
  });
});

describe('agentService.getProviderModels', () => {
  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('keeps backward-compatible anthropic model lookup', async () => {
    const result = await agentService.getProviderModels('anthropic');

    expect(result.provider).toBe('anthropic');
    expect(result.defaultModel).toBe('claude-sonnet-4-20250514');
    expect(result.models[0]).toEqual({
      value: 'claude-sonnet-4-20250514',
      label: 'Claude Sonnet 4',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    });
  });

  it('rejects unsupported providers', async () => {
    await expect(agentService.getProviderModels('custom')).rejects.toBeInstanceOf(
      AgentBusinessError,
    );
  });
});

describe('agentService.getCurrentUser', () => {
  it('maps current user payload to display info', async () => {
    const result = await agentService.getCurrentUser({
      userId: 7,
      username: 'alice',
    });

    expect(result).toEqual({
      userId: 7,
      username: 'alice',
      displayName: 'alice',
    });
  });
});
