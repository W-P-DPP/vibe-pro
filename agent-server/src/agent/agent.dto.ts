export type AgentProvider = 'openai' | 'anthropic';

export interface AgentResponseDto {
  id: number;
  code: string;
  name: string;
  description: string;
  defaultProvider: AgentProvider;
  defaultModel: string;
  systemPrompt: string;
}

export interface AgentBindingDto {
  knowledgeBaseId: number;
  name: string;
}

export interface AgentMeResponseDto {
  agent: AgentResponseDto;
  bindings: AgentBindingDto[];
}

export interface AgentCurrentUserResponseDto {
  userId: number;
  username: string;
  displayName: string;
}

export interface UpdateAgentBindingsRequestDto {
  knowledgeBaseIds: number[];
}

export interface AgentModelOptionDto {
  value: string;
  label: string;
  provider: AgentProvider;
  model: string;
}

export interface AgentModelsResponseDto {
  defaultProvider: AgentProvider;
  defaultModel: string;
  models: AgentModelOptionDto[];
}

export interface AgentProviderModelsResponseDto {
  provider: AgentProvider;
  defaultModel: string;
  models: AgentModelOptionDto[];
}
