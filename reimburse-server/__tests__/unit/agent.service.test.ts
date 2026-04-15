import { jest } from '@jest/globals';
import { agentRepository } from '../../src/agent/agent.repository.ts';
import {
  AgentBusinessError,
  agentService,
  FIXED_AGENT_MODEL,
  FIXED_AGENT_PROVIDER,
} from '../../src/agent/agent.service.ts';

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

describe('agentService.getModels', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the fixed gpt-5 catalog without querying upstream models', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    const result = await agentService.getModels();

    expect(result).toEqual({
      defaultProvider: FIXED_AGENT_PROVIDER,
      defaultModel: FIXED_AGENT_MODEL,
      models: [
        {
          value: FIXED_AGENT_MODEL,
          label: FIXED_AGENT_MODEL,
          provider: FIXED_AGENT_PROVIDER,
          model: FIXED_AGENT_MODEL,
        },
      ],
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('keeps the unified catalog fixed even when stored defaults are not gpt-5', async () => {
    jest.spyOn(agentRepository, 'getDefaultAgent').mockResolvedValueOnce({
      id: 1,
      code: 'default-agent',
      name: 'default-agent',
      description: '',
      systemPrompt: '',
      defaultProvider: 'anthropic',
      defaultModel: 'claude-sonnet',
      status: 1,
    } as never);

    const result = await agentService.getModels();

    expect(result.defaultProvider).toBe(FIXED_AGENT_PROVIDER);
    expect(result.defaultModel).toBe(FIXED_AGENT_MODEL);
    expect(result.models).toHaveLength(1);
  });

  it('keeps the legacy openai catalog method compatible', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    const result = await agentService.getOpenAiModels();

    expect(result).toEqual({
      provider: FIXED_AGENT_PROVIDER,
      defaultModel: FIXED_AGENT_MODEL,
      models: [
        {
          value: FIXED_AGENT_MODEL,
          label: FIXED_AGENT_MODEL,
          provider: FIXED_AGENT_PROVIDER,
          model: FIXED_AGENT_MODEL,
        },
      ],
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('agentService.getProviderModels', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('keeps the openai provider route compatible with the fixed catalog', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    const result = await agentService.getProviderModels('openai');

    expect(result.provider).toBe(FIXED_AGENT_PROVIDER);
    expect(result.defaultModel).toBe(FIXED_AGENT_MODEL);
    expect(result.models).toEqual([
      {
        value: FIXED_AGENT_MODEL,
        label: FIXED_AGENT_MODEL,
        provider: FIXED_AGENT_PROVIDER,
        model: FIXED_AGENT_MODEL,
      },
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects anthropic provider lookup', async () => {
    await expect(agentService.getProviderModels('anthropic')).rejects.toBeInstanceOf(
      AgentBusinessError,
    );
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
