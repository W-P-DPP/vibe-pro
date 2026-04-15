import { EntitySchema } from 'typeorm';
import { BaseEntity, BaseSchemaColumns } from '../../utils/entities/base.entity.ts';

export class AgentProfileEntity extends BaseEntity {
  id!: number;
  code!: string;
  name!: string;
  description!: string;
  systemPrompt!: string;
  defaultProvider!: 'openai' | 'anthropic';
  defaultModel!: string;
  status!: number;
}

export class AgentKnowledgeBindingEntity extends BaseEntity {
  id!: number;
  ownerUserId!: number;
  agentProfileId!: number;
  knowledgeBaseId!: number;
}

export const AgentProfileEntitySchema = new EntitySchema<AgentProfileEntity>({
  name: 'AgentProfile',
  target: AgentProfileEntity,
  tableName: 'agent_profile',
  columns: {
    id: {
      name: 'id',
      type: Number,
      primary: true,
      generated: 'increment',
    },
    code: {
      name: 'code',
      type: String,
      length: 64,
      nullable: false,
    },
    name: {
      name: 'name',
      type: String,
      length: 128,
      nullable: false,
    },
    description: {
      name: 'description',
      type: 'text',
      nullable: false,
    },
    systemPrompt: {
      name: 'system_prompt',
      type: 'text',
      nullable: false,
    },
    defaultProvider: {
      name: 'default_provider',
      type: String,
      length: 32,
      nullable: false,
      default: 'openai',
    },
    defaultModel: {
      name: 'default_model',
      type: String,
      length: 128,
      nullable: false,
      default: 'gpt-5',
    },
    status: {
      name: 'status',
      type: Number,
      nullable: false,
      default: 1,
    },
    ...BaseSchemaColumns,
  },
  uniques: [
    {
      name: 'uk_agent_profile_code',
      columns: ['code'],
    },
  ],
});

export const AgentKnowledgeBindingEntitySchema =
  new EntitySchema<AgentKnowledgeBindingEntity>({
    name: 'AgentKnowledgeBinding',
    target: AgentKnowledgeBindingEntity,
    tableName: 'agent_kb_binding',
    columns: {
      id: {
        name: 'id',
        type: Number,
        primary: true,
        generated: 'increment',
      },
      ownerUserId: {
        name: 'owner_user_id',
        type: Number,
        nullable: false,
      },
      agentProfileId: {
        name: 'agent_profile_id',
        type: Number,
        nullable: false,
      },
      knowledgeBaseId: {
        name: 'knowledge_base_id',
        type: Number,
        nullable: false,
      },
      ...BaseSchemaColumns,
    },
    indices: [
      {
        name: 'idx_agent_kb_binding_owner_user_id',
        columns: ['ownerUserId'],
      },
      {
        name: 'idx_agent_kb_binding_agent_profile_id',
        columns: ['agentProfileId'],
      },
      {
        name: 'idx_agent_kb_binding_knowledge_base_id',
        columns: ['knowledgeBaseId'],
      },
    ],
    uniques: [
      {
        name: 'uk_agent_kb_binding_scope',
        columns: ['ownerUserId', 'agentProfileId', 'knowledgeBaseId'],
      },
    ],
  });
