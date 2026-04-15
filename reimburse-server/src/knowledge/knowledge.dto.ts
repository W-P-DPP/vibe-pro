export type KnowledgeBaseStatus = 'active' | 'disabled';
export type KnowledgeDocumentStatus =
  | 'pending'
  | 'processing'
  | 'success'
  | 'failed';

export interface KnowledgeBaseResponseDto {
  id: number;
  name: string;
  description: string;
  status: KnowledgeBaseStatus;
  documentCount: number;
  boundToDefaultAgent: boolean;
  updateTime?: string | null;
}

export interface KnowledgeBaseDetailResponseDto
  extends KnowledgeBaseResponseDto {}

export interface CreateKnowledgeBaseRequestDto {
  name: string;
  description?: string;
}

export interface KnowledgeDocumentResponseDto {
  id: number;
  originalFileName: string;
  fileExt: string;
  fileSize: number;
  parseStatus: KnowledgeDocumentStatus;
  parseErrorMessage: string;
  chunkCount: number;
  updateTime?: string | null;
}

export interface KnowledgeSearchItemDto {
  chunkId: number;
  knowledgeBaseId: number;
  documentId: number;
  documentName: string;
  snippet: string;
  score: number;
}

export interface SearchKnowledgeRequestDto {
  query: string;
}

export interface ParsedKnowledgeChunkDto {
  chunkIndex: number;
  titleHint: string;
  content: string;
  keywordText: string;
  charCount: number;
}
