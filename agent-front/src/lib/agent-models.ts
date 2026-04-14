import type { AgentModelOption, AgentProvider } from '@/api/modules/agent';
export function buildAgentModelSelectionKey(provider: AgentProvider, model: string) {
  return `${provider}::${model}`;
}

export function findAgentModelOption(
  options: AgentModelOption[],
  selectionKey: string | null | undefined,
) {
  if (!selectionKey) {
    return null;
  }

  return (
    options.find(
      (item) => buildAgentModelSelectionKey(item.provider, item.model) === selectionKey,
    ) ?? null
  );
}

export function pickAgentModelOption(
  options: AgentModelOption[],
  preferredSelectionKey: string | null | undefined,
  defaultProvider: AgentProvider,
  defaultModel: string,
) {
  const preferredOption = findAgentModelOption(options, preferredSelectionKey);
  if (preferredOption) {
    return preferredOption;
  }

  const exactDefault = options.find(
    (item) => item.provider === defaultProvider && item.model === defaultModel,
  );
  if (exactDefault) {
    return exactDefault;
  }

  const providerFallback = options.find((item) => item.provider === defaultProvider);
  if (providerFallback) {
    return providerFallback;
  }

  return options[0] ?? null;
}

export function formatAgentProviderLabel(provider: AgentProvider) {
  if (provider === 'anthropic') {
    return 'Anthropic';
  }

  return 'OpenAI';
}

export function buildAgentChatStreamPayload(
  option: AgentModelOption,
  message: string,
  knowledgeBaseIds: number[],
) {
  return {
    message,
    knowledgeBaseIds,
    provider: option.provider,
    model: option.model,
  };
}

export function buildPendingAssistantMessage(
  id: number | string,
  option: AgentModelOption,
): {
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
    provider: option.provider,
    model: option.model,
  };
}
