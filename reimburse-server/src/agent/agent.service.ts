import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import type { CurrentUserDto } from '../auth/current-user.ts';
import { knowledgeRepository } from '../knowledge/knowledge.repository.ts';
import type {
  AgentBindingDto,
  AgentCurrentUserResponseDto,
  AgentMeResponseDto,
  AgentModelOptionDto,
  AgentModelsResponseDto,
  AgentProvider,
  AgentProviderModelsResponseDto,
  AgentResponseDto,
} from './agent.dto.ts';
import { agentRepository } from './agent.repository.ts';

export class AgentBusinessError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = HttpStatus.BAD_REQUEST,
  ) {
    super(message);
    this.name = 'AgentBusinessError';
  }
}

export const FIXED_AGENT_PROVIDER = 'openai' as const;
export const FIXED_AGENT_MODEL = 'gpt-5';

function normalizeAgentResponse(
  agent: Awaited<ReturnType<typeof agentRepository.getDefaultAgent>>,
): AgentResponseDto {
  return {
    id: agent.id,
    code: agent.code,
    name: agent.name,
    description: agent.description,
    defaultProvider: agent.defaultProvider,
    defaultModel: agent.defaultModel,
    systemPrompt: agent.systemPrompt,
  };
}

function isAgentProvider(value: string): value is AgentProvider {
  return value === FIXED_AGENT_PROVIDER;
}

function normalizeCurrentUser(currentUser: CurrentUserDto): AgentCurrentUserResponseDto {
  const username = currentUser.username.trim();

  return {
    userId: currentUser.userId,
    username,
    displayName: username,
  };
}

function buildFixedModelOption(): AgentModelOptionDto {
  return {
    value: FIXED_AGENT_MODEL,
    label: FIXED_AGENT_MODEL,
    provider: FIXED_AGENT_PROVIDER,
    model: FIXED_AGENT_MODEL,
  };
}

function buildFixedModelCatalog(): AgentModelOptionDto[] {
  return [buildFixedModelOption()];
}

export class AgentService {
  async getModels(): Promise<AgentModelsResponseDto> {
    return {
      defaultProvider: FIXED_AGENT_PROVIDER,
      defaultModel: FIXED_AGENT_MODEL,
      models: buildFixedModelCatalog(),
    };
  }

  async getDefaultAgentProfile() {
    return agentRepository.getDefaultAgent();
  }

  async getCurrentUser(currentUser: CurrentUserDto): Promise<AgentCurrentUserResponseDto> {
    return normalizeCurrentUser(currentUser);
  }

  async getAgentMe(ownerUserId: number): Promise<AgentMeResponseDto> {
    const agent = await agentRepository.getDefaultAgent();
    const bindings = await this.listBindings(ownerUserId);

    return {
      agent: normalizeAgentResponse(agent),
      bindings,
    };
  }

  async listBindings(ownerUserId: number): Promise<AgentBindingDto[]> {
    const agent = await agentRepository.getDefaultAgent();
    const bindings = await agentRepository.listBindings(ownerUserId, agent.id);

    if (bindings.length === 0) {
      return [];
    }

    const knowledgeBases = await knowledgeRepository.getKnowledgeBasesByIds(
      ownerUserId,
      bindings.map((item) => item.knowledgeBaseId),
    );
    const knowledgeBaseMap = new Map(knowledgeBases.map((item) => [item.id, item]));

    return bindings
      .map((item) => knowledgeBaseMap.get(item.knowledgeBaseId))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map((item) => ({
        knowledgeBaseId: item.id,
        name: item.name,
      }));
  }

  async updateBindings(ownerUserId: number, knowledgeBaseIds: number[]) {
    const normalizedIds = Array.from(
      new Set(
        knowledgeBaseIds
          .map((item) => Number(item))
          .filter((item) => Number.isInteger(item) && item > 0),
      ),
    );

    if (normalizedIds.length !== knowledgeBaseIds.length) {
      throw new AgentBusinessError('知识库绑定参数无效');
    }

    const agent = await agentRepository.getDefaultAgent();
    const knowledgeBases = await knowledgeRepository.getKnowledgeBasesByIds(
      ownerUserId,
      normalizedIds,
    );

    if (knowledgeBases.length !== normalizedIds.length) {
      throw new AgentBusinessError('存在不可用的知识库', HttpStatus.NOT_FOUND);
    }

    await agentRepository.replaceBindings(ownerUserId, agent.id, normalizedIds);
    return this.listBindings(ownerUserId);
  }

  async getOpenAiModels(): Promise<AgentProviderModelsResponseDto> {
    return {
      provider: FIXED_AGENT_PROVIDER,
      defaultModel: FIXED_AGENT_MODEL,
      models: buildFixedModelCatalog(),
    };
  }

  async getProviderModels(provider: string): Promise<AgentProviderModelsResponseDto> {
    const normalizedProvider = provider.trim().toLowerCase();
    if (!isAgentProvider(normalizedProvider)) {
      throw new AgentBusinessError('不支持的模型提供方', HttpStatus.NOT_FOUND);
    }

    return this.getOpenAiModels();
  }
}

export const agentService = new AgentService();
