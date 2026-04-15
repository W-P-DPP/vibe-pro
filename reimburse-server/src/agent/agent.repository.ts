import type { Repository } from 'typeorm';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import {
  AgentKnowledgeBindingEntity,
  AgentProfileEntity,
} from './agent.entity.ts';

async function ensureDataSource() {
  const current = getDataSource();
  if (current?.isInitialized) {
    return current;
  }

  return initDataBase();
}

export class AgentRepository {
  private async getAgentRepository(): Promise<Repository<AgentProfileEntity>> {
    const dataSource = await ensureDataSource();
    return dataSource.getRepository(AgentProfileEntity);
  }

  private async getBindingRepository(): Promise<Repository<AgentKnowledgeBindingEntity>> {
    const dataSource = await ensureDataSource();
    return dataSource.getRepository(AgentKnowledgeBindingEntity);
  }

  async getDefaultAgent(): Promise<AgentProfileEntity> {
    const repository = await this.getAgentRepository();
    let entity = await repository.findOne({
      where: {
        code: 'default-agent',
      },
    });

    if (entity) {
      return entity;
    }

    entity = repository.create({
      code: 'default-agent',
      name: '默认 Agent',
      description: '系统默认问答 Agent',
      systemPrompt:
        '你是一个严谨的知识库问答助手。回答时优先基于提供的知识片段，若知识不足要明确说明，不编造未确认的信息。',
      defaultProvider: 'openai',
      defaultModel: 'gpt-5',
      status: 1,
      createBy: 'system',
      updateBy: 'system',
    });

    return repository.save(entity);
  }

  async listBindings(ownerUserId: number, agentProfileId: number) {
    const repository = await this.getBindingRepository();
    return repository.find({
      where: {
        ownerUserId,
        agentProfileId,
      },
      order: {
        id: 'ASC',
      },
    });
  }

  async replaceBindings(
    ownerUserId: number,
    agentProfileId: number,
    knowledgeBaseIds: number[],
  ) {
    const repository = await this.getBindingRepository();

    await repository.delete({
      ownerUserId,
      agentProfileId,
    });

    if (knowledgeBaseIds.length === 0) {
      return [];
    }

    const entities = knowledgeBaseIds.map((knowledgeBaseId) =>
      repository.create({
        ownerUserId,
        agentProfileId,
        knowledgeBaseId,
        createBy: String(ownerUserId),
        updateBy: String(ownerUserId),
      }),
    );

    return repository.save(entities);
  }
}

export const agentRepository = new AgentRepository();
