import { request } from '@/api/request';

export type AgentProvider = 'openai' | 'anthropic';

export type AgentBinding = {
  knowledgeBaseId: number;
  name: string;
};

export type AgentMeResponse = {
  agent: {
    id: number;
    code: string;
    name: string;
    description: string;
    defaultProvider: AgentProvider;
    defaultModel: string;
    systemPrompt: string;
  };
  bindings: AgentBinding[];
};

export type AgentCurrentUserResponse = {
  userId: number;
  username: string;
  displayName: string;
};

type ApiEnvelope<T> = {
  code: number;
  msg: string;
  data: T;
  timestamp: number;
};

export function getAgentMe() {
  return request.get<ApiEnvelope<AgentMeResponse>>('/agent/me').then((res) => res.data);
}

export function getAgentCurrentUser() {
  return request
    .get<ApiEnvelope<AgentCurrentUserResponse>>('/agent/current-user')
    .then((res) => res.data);
}

export function getAgentBindings() {
  return request
    .get<ApiEnvelope<AgentBinding[]>>('/agent/default/bindings')
    .then((res) => res.data);
}

export function updateAgentBindings(knowledgeBaseIds: number[]) {
  return request
    .put<ApiEnvelope<AgentBinding[]>, { knowledgeBaseIds: number[] }>(
      '/agent/default/bindings',
      { knowledgeBaseIds },
    )
    .then((res) => res.data);
}
