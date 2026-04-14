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

const OPENAI_DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const ALL_AGENT_PROVIDERS: AgentProvider[] = ['openai', 'anthropic'];
const STATIC_PROVIDER_MODELS: Record<
  Exclude<AgentProvider, 'openai'>,
  Array<{ value: string; label: string }>
> = {
  anthropic: [
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { value: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet' },
    { value: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku' },
  ],
};

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
  return value === 'openai' || value === 'anthropic';
}

function normalizeCurrentUser(currentUser: CurrentUserDto): AgentCurrentUserResponseDto {
  const username = currentUser.username.trim();

  return {
    userId: currentUser.userId,
    username,
    displayName: username,
  };
}

function readOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function buildOpenAiModelsUrl(baseURL: string) {
  const normalizedBaseURL = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
  return new URL('models', normalizedBaseURL).toString();
}

function toModelOption(
  provider: AgentProvider,
  model: string,
  label = model,
): AgentModelOptionDto {
  return {
    value: model,
    label,
    provider,
    model,
  };
}

function normalizeOpenAiModelOptions(payload: unknown): AgentModelOptionDto[] {
  if (!payload || typeof payload !== 'object' || !('data' in payload)) {
    throw new AgentBusinessError('OpenAI 模型目录响应格式无效', HttpStatus.ERROR);
  }

  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) {
    throw new AgentBusinessError('OpenAI 模型目录响应格式无效', HttpStatus.ERROR);
  }

  const uniqueModelIds = Array.from(
    new Set(
      data
        .map((item) =>
          item && typeof item === 'object' && 'id' in item ? String(item.id ?? '').trim() : '',
        )
        .filter(Boolean),
    ),
  );

  if (uniqueModelIds.length === 0) {
    throw new AgentBusinessError('OpenAI 模型目录为空', HttpStatus.ERROR);
  }

  return uniqueModelIds.map((modelId) => toModelOption('openai', modelId));
}

async function fetchOpenAiModelOptions(): Promise<AgentModelOptionDto[]> {
  const baseURL = readOptionalEnv('OPENAI_BASE_URL') ?? OPENAI_DEFAULT_BASE_URL;
  const apiKey = readOptionalEnv('OPENAI_API_KEY');
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  let response: Response;
  try {
    response = await fetch(buildOpenAiModelsUrl(baseURL), {
      method: 'GET',
      headers,
    });
  } catch {
    throw new AgentBusinessError('获取 OpenAI 模型目录失败', HttpStatus.ERROR);
  }

  if (!response.ok) {
    throw new AgentBusinessError('获取 OpenAI 模型目录失败', HttpStatus.ERROR);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AgentBusinessError('OpenAI 模型目录响应格式无效', HttpStatus.ERROR);
  }

  return normalizeOpenAiModelOptions(payload);
}

function pickDefaultModel(models: AgentModelOptionDto[], preferredModel: string) {
  if (models.some((item) => item.model === preferredModel)) {
    return preferredModel;
  }

  const fallbackModel = models[0]?.model;
  if (!fallbackModel) {
    throw new AgentBusinessError('当前未发现可用模型', HttpStatus.ERROR);
  }

  return fallbackModel;
}

function pickDefaultModelOption(
  models: AgentModelOptionDto[],
  preferredProvider: AgentProvider,
  preferredModel: string,
) {
  const exactMatch = models.find(
    (item) => item.provider === preferredProvider && item.model === preferredModel,
  );
  if (exactMatch) {
    return exactMatch;
  }

  const providerFallback = models.find((item) => item.provider === preferredProvider);
  if (providerFallback) {
    return providerFallback;
  }

  const firstAvailable = models[0];
  if (firstAvailable) {
    return firstAvailable;
  }

  throw new AgentBusinessError('当前未发现可用模型', HttpStatus.ERROR);
}

function getStaticProviderModelOptions(
  provider: Exclude<AgentProvider, 'openai'>,
): AgentModelOptionDto[] {
  return STATIC_PROVIDER_MODELS[provider].map((item) =>
    toModelOption(provider, item.value, item.label),
  );
}

async function getProviderModelOptions(provider: AgentProvider): Promise<AgentModelOptionDto[]> {
  if (provider === 'openai') {
    return fetchOpenAiModelOptions();
  }

  return getStaticProviderModelOptions(provider);
}

async function getAvailableModelOptions(
  providers: AgentProvider[],
): Promise<AgentModelOptionDto[]> {
  const results = await Promise.allSettled(
    providers.map((provider) => getProviderModelOptions(provider)),
  );

  const models = results.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : [],
  );

  if (models.length > 0) {
    return models;
  }

  const firstFailure = results.find((result) => result.status === 'rejected');
  if (firstFailure?.reason instanceof AgentBusinessError) {
    throw firstFailure.reason;
  }

  throw new AgentBusinessError('当前未发现可用模型', HttpStatus.ERROR);
}

export class AgentService {
  async getModels(): Promise<AgentModelsResponseDto> {
    const agent = await agentRepository.getDefaultAgent();
    const models = await getAvailableModelOptions(ALL_AGENT_PROVIDERS);
    const defaultOption = pickDefaultModelOption(
      models,
      agent.defaultProvider,
      agent.defaultModel,
    );

    return {
      defaultProvider: defaultOption.provider,
      defaultModel: defaultOption.model,
      models,
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
    const agent = await agentRepository.getDefaultAgent();
    const models = await getProviderModelOptions('openai');
    const defaultModel = pickDefaultModel(models, agent.defaultModel);

    return {
      provider: 'openai',
      defaultModel,
      models,
    };
  }

  async getProviderModels(provider: string): Promise<AgentProviderModelsResponseDto> {
    const normalizedProvider = provider.trim().toLowerCase();
    if (!isAgentProvider(normalizedProvider)) {
      throw new AgentBusinessError('不支持的模型提供方', HttpStatus.NOT_FOUND);
    }

    if (normalizedProvider === 'openai') {
      return this.getOpenAiModels();
    }

    const agent = await agentRepository.getDefaultAgent();
    const models = await getProviderModelOptions(normalizedProvider);
    const defaultModel = pickDefaultModel(models, agent.defaultModel);

    return {
      provider: normalizedProvider,
      defaultModel,
      models,
    };
  }
}

export const agentService = new AgentService();
