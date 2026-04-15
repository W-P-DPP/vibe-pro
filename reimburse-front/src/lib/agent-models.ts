export const FIXED_AGENT_MODEL = {
  provider: 'openai' as const,
  model: 'gpt-5',
  label: 'gpt-5',
};

export function buildFixedAgentChatStreamPayload(
  message: string,
  knowledgeBaseIds: number[],
) {
  return {
    message,
    knowledgeBaseIds,
    provider: FIXED_AGENT_MODEL.provider,
    model: FIXED_AGENT_MODEL.model,
  };
}

export function buildPendingAssistantMessage(id: number | string): {
  id: number | string;
  role: 'assistant';
  content: string;
  provider: string;
  model: string;
} {
  return {
    id,
    role: 'assistant',
    content: '',
    provider: FIXED_AGENT_MODEL.provider,
    model: FIXED_AGENT_MODEL.model,
  };
}
