import { describe, expect, it } from 'vitest';
import {
  buildFixedAgentChatStreamPayload,
  buildPendingAssistantMessage,
  FIXED_AGENT_MODEL,
} from './agent-models';

describe('fixed agent model helpers', () => {
  it('builds chat payloads with pinned openai/gpt-5 values', () => {
    expect(buildFixedAgentChatStreamPayload('hello', [1, 2])).toEqual({
      message: 'hello',
      knowledgeBaseIds: [1, 2],
      provider: 'openai',
      model: 'gpt-5',
    });
  });

  it('builds pending assistant messages with pinned openai/gpt-5 metadata', () => {
    expect(buildPendingAssistantMessage('assistant-temp')).toEqual({
      id: 'assistant-temp',
      role: 'assistant',
      content: '',
      provider: 'openai',
      model: 'gpt-5',
    });
  });

  it('exports the fixed model label for chat page copy', () => {
    expect(FIXED_AGENT_MODEL).toEqual({
      provider: 'openai',
      model: 'gpt-5',
      label: 'gpt-5',
    });
  });
});
