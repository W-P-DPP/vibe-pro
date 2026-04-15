import { EntitySchema } from 'typeorm';
import { BaseEntity, BaseSchemaColumns } from '../../utils/entities/base.entity.ts';

export class ChatSessionEntity extends BaseEntity {
  id!: number;
  sessionId!: string;
  ownerUserId!: number;
  title!: string;
  lastMessageAt?: Date | null;
}

export class ChatMessageEntity extends BaseEntity {
  id!: number;
  sessionId!: string;
  ownerUserId!: number;
  role!: 'user' | 'assistant';
  content!: string;
  provider!: string;
  model!: string;
  runId?: number | null;
}

export class ChatRunEntity extends BaseEntity {
  id!: number;
  sessionId!: string;
  ownerUserId!: number;
  agentProfileId!: number;
  provider!: string;
  model!: string;
  status!: 'running' | 'success' | 'failed';
  selectedKnowledgeBaseIds!: number[];
  retrievedChunkCount!: number;
  errorMessage!: string;
  startedAt!: Date;
  finishedAt?: Date | null;
  durationMs!: number;
}

export const ChatSessionEntitySchema = new EntitySchema<ChatSessionEntity>({
  name: 'ChatSession',
  target: ChatSessionEntity,
  tableName: 'agent_chat_session',
  columns: {
    id: { name: 'id', type: Number, primary: true, generated: 'increment' },
    sessionId: { name: 'session_id', type: String, length: 36, nullable: true, unique: true },
    ownerUserId: { name: 'owner_user_id', type: Number, nullable: false },
    title: { name: 'title', type: String, length: 255, nullable: false, default: '新会话' },
    lastMessageAt: { name: 'last_message_at', type: 'datetime', nullable: true },
    ...BaseSchemaColumns,
  },
  indices: [
    { name: 'idx_agent_chat_session_owner_user_id', columns: ['ownerUserId'] },
    { name: 'idx_agent_chat_session_session_id', columns: ['sessionId'] },
  ],
});

export const ChatMessageEntitySchema = new EntitySchema<ChatMessageEntity>({
  name: 'ChatMessage',
  target: ChatMessageEntity,
  tableName: 'agent_chat_message',
  columns: {
    id: { name: 'id', type: Number, primary: true, generated: 'increment' },
    sessionId: { name: 'session_id', type: String, length: 36, nullable: false },
    ownerUserId: { name: 'owner_user_id', type: Number, nullable: false },
    role: { name: 'role', type: String, length: 32, nullable: false },
    content: { name: 'content', type: 'longtext', nullable: false },
    provider: { name: 'provider', type: String, length: 32, nullable: false, default: '' },
    model: { name: 'model', type: String, length: 128, nullable: false, default: '' },
    runId: { name: 'run_id', type: Number, nullable: true },
    ...BaseSchemaColumns,
  },
  indices: [{ name: 'idx_agent_chat_message_session_id', columns: ['sessionId'] }],
});

export const ChatRunEntitySchema = new EntitySchema<ChatRunEntity>({
  name: 'ChatRun',
  target: ChatRunEntity,
  tableName: 'agent_chat_run',
  columns: {
    id: { name: 'id', type: Number, primary: true, generated: 'increment' },
    sessionId: { name: 'session_id', type: String, length: 36, nullable: false },
    ownerUserId: { name: 'owner_user_id', type: Number, nullable: false },
    agentProfileId: { name: 'agent_profile_id', type: Number, nullable: false },
    provider: { name: 'provider', type: String, length: 32, nullable: false },
    model: { name: 'model', type: String, length: 128, nullable: false },
    status: { name: 'status', type: String, length: 32, nullable: false, default: 'running' },
    selectedKnowledgeBaseIds: {
      name: 'selected_knowledge_base_ids',
      type: 'simple-json',
      nullable: false,
    },
    retrievedChunkCount: { name: 'retrieved_chunk_count', type: Number, nullable: false, default: 0 },
    errorMessage: { name: 'error_message', type: 'text', nullable: false },
    startedAt: { name: 'started_at', type: 'datetime', nullable: false },
    finishedAt: { name: 'finished_at', type: 'datetime', nullable: true },
    durationMs: { name: 'duration_ms', type: Number, nullable: false, default: 0 },
    ...BaseSchemaColumns,
  },
  indices: [
    { name: 'idx_agent_chat_run_session_id', columns: ['sessionId'] },
    { name: 'idx_agent_chat_run_owner_user_id', columns: ['ownerUserId'] },
  ],
});
