import { describe, expect, it } from 'vitest';
import type { AgentModelOption } from '@/api/modules/agent';
import {
  buildAgentChatStreamPayload,
  buildAgentModelSelectionKey,
  buildPendingAssistantMessage,
  findAgentModelOption,
  formatAgentProviderLabel,
  pickAgentModelOption,
} from './agent-models';

const openAiDefaultOption: AgentModelOption = {
  value: 'gpt-5',
  label: 'gpt-5',
  provider: 'openai',
  model: 'gpt-5',
};

const anthropicOption: AgentModelOption = {
  value: 'claude-sonnet-4-20250514',
  label: 'Claude Sonnet 4',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
};

describe('agent model selection helpers', () => {
  it('builds stable selection keys and finds the matching option', () => {
    const selectionKey = buildAgentModelSelectionKey('anthropic', 'claude-sonnet-4-20250514');
    const result = findAgentModelOption([openAiDefaultOption, anthropicOption], selectionKey);

    expect(selectionKey).toBe('anthropic::claude-sonnet-4-20250514');
    expect(result).toEqual(anthropicOption);
  });

  it('falls back within the default provider before using another provider option', () => {
    const result = pickAgentModelOption(
      [openAiDefaultOption, anthropicOption],
      null,
      'anthropic',
      'claude-missing',
    );

    expect(result).toEqual(anthropicOption);
  });
});

describe('agent chat model metadata helpers', () => {
  it('builds stream payloads with the selected provider-model pair', () => {
    expect(
      buildAgentChatStreamPayload(anthropicOption, 'hello', [1, 2]),
    ).toEqual({
      message: 'hello',
      knowledgeBaseIds: [1, 2],
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    });
  });

  it('builds pending assistant metadata from the selected model', () => {
    expect(buildPendingAssistantMessage('assistant-temp', anthropicOption)).toEqual({
      id: 'assistant-temp',
      role: 'assistant',
      content: '',
      provider: 'anthropic',
      model: 'claude-sonnet-4-20250514',
    });
  });

  it('formats provider labels for the current theme-neutral UI copy', () => {
    expect(formatAgentProviderLabel('openai')).toBe('OpenAI');
    expect(formatAgentProviderLabel('anthropic')).toBe('Anthropic');
  });
});
