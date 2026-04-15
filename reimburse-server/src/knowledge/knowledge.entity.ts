import { EntitySchema } from 'typeorm';
import { BaseEntity, BaseSchemaColumns } from '../../utils/entities/base.entity.ts';

export class KnowledgeBaseEntity extends BaseEntity {
  id!: number;
  ownerUserId!: number;
  name!: string;
  description!: string;
  status!: 'active' | 'disabled';
}

export class KnowledgeDocumentEntity extends BaseEntity {
  id!: number;
  knowledgeBaseId!: number;
  ownerUserId!: number;
  originalFileName!: string;
  storedFilePath!: string;
  fileExt!: string;
  fileSize!: number;
  parseStatus!: 'pending' | 'processing' | 'success' | 'failed';
  parseErrorMessage!: string;
  chunkCount!: number;
}

export class KnowledgeChunkEntity extends BaseEntity {
  id!: number;
  knowledgeBaseId!: number;
  documentId!: number;
  chunkIndex!: number;
  titleHint!: string;
  content!: string;
  keywordText!: string;
  charCount!: number;
}

export const KnowledgeBaseEntitySchema = new EntitySchema<KnowledgeBaseEntity>({
  name: 'KnowledgeBase',
  target: KnowledgeBaseEntity,
  tableName: 'agent_knowledge_base',
  columns: {
    id: { name: 'id', type: Number, primary: true, generated: 'increment' },
    ownerUserId: { name: 'owner_user_id', type: Number, nullable: false },
    name: { name: 'name', type: String, length: 128, nullable: false },
    description: { name: 'description', type: 'text', nullable: false },
    status: { name: 'status', type: String, length: 32, nullable: false, default: 'active' },
    ...BaseSchemaColumns,
  },
  indices: [{ name: 'idx_agent_knowledge_base_owner_user_id', columns: ['ownerUserId'] }],
  uniques: [{ name: 'uk_agent_knowledge_base_owner_name', columns: ['ownerUserId', 'name'] }],
});

export const KnowledgeDocumentEntitySchema = new EntitySchema<KnowledgeDocumentEntity>({
  name: 'KnowledgeDocument',
  target: KnowledgeDocumentEntity,
  tableName: 'agent_knowledge_document',
  columns: {
    id: { name: 'id', type: Number, primary: true, generated: 'increment' },
    knowledgeBaseId: { name: 'knowledge_base_id', type: Number, nullable: false },
    ownerUserId: { name: 'owner_user_id', type: Number, nullable: false },
    originalFileName: { name: 'original_file_name', type: String, length: 255, nullable: false },
    storedFilePath: { name: 'stored_file_path', type: String, length: 512, nullable: false },
    fileExt: { name: 'file_ext', type: String, length: 32, nullable: false },
    fileSize: { name: 'file_size', type: Number, nullable: false, default: 0 },
    parseStatus: { name: 'parse_status', type: String, length: 32, nullable: false, default: 'pending' },
    parseErrorMessage: { name: 'parse_error_message', type: 'text', nullable: false },
    chunkCount: { name: 'chunk_count', type: Number, nullable: false, default: 0 },
    ...BaseSchemaColumns,
  },
  indices: [
    { name: 'idx_agent_knowledge_document_base_id', columns: ['knowledgeBaseId'] },
    { name: 'idx_agent_knowledge_document_owner_user_id', columns: ['ownerUserId'] },
  ],
  uniques: [
    { name: 'uk_agent_knowledge_document_name', columns: ['knowledgeBaseId', 'originalFileName'] },
  ],
});

export const KnowledgeChunkEntitySchema = new EntitySchema<KnowledgeChunkEntity>({
  name: 'KnowledgeChunk',
  target: KnowledgeChunkEntity,
  tableName: 'agent_knowledge_chunk',
  columns: {
    id: { name: 'id', type: Number, primary: true, generated: 'increment' },
    knowledgeBaseId: { name: 'knowledge_base_id', type: Number, nullable: false },
    documentId: { name: 'document_id', type: Number, nullable: false },
    chunkIndex: { name: 'chunk_index', type: Number, nullable: false },
    titleHint: { name: 'title_hint', type: String, length: 255, nullable: false, default: '' },
    content: { name: 'content', type: 'text', nullable: false },
    keywordText: { name: 'keyword_text', type: 'text', nullable: false },
    charCount: { name: 'char_count', type: Number, nullable: false, default: 0 },
    ...BaseSchemaColumns,
  },
  indices: [
    { name: 'idx_agent_knowledge_chunk_base_id', columns: ['knowledgeBaseId'] },
    { name: 'idx_agent_knowledge_chunk_document_id', columns: ['documentId'] },
  ],
});
