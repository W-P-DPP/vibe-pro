import { request } from '@/api/request';

export type KnowledgeBaseItem = {
  id: number;
  name: string;
  description: string;
  status: 'active' | 'disabled';
  documentCount: number;
  boundToDefaultAgent: boolean;
  updateTime?: string | null;
};

export type KnowledgeDocumentItem = {
  id: number;
  originalFileName: string;
  fileExt: string;
  fileSize: number;
  parseStatus: 'pending' | 'processing' | 'success' | 'failed';
  parseErrorMessage: string;
  chunkCount: number;
  updateTime?: string | null;
};

export type KnowledgeSearchItem = {
  chunkId: number;
  knowledgeBaseId: number;
  documentId: number;
  documentName: string;
  snippet: string;
  score: number;
};

type ApiEnvelope<T> = {
  code: number;
  msg: string;
  data: T;
  timestamp: number;
};

export function getKnowledgeBases() {
  return request
    .get<ApiEnvelope<KnowledgeBaseItem[]>>('/knowledge/bases')
    .then((res) => res.data);
}

export function createKnowledgeBase(payload: { name: string; description?: string }) {
  return request
    .post<ApiEnvelope<KnowledgeBaseItem>, typeof payload>('/knowledge/bases', payload)
    .then((res) => res.data);
}

export function getKnowledgeBaseDetail(id: number) {
  return request
    .get<ApiEnvelope<KnowledgeBaseItem>>(`/knowledge/bases/${id}`)
    .then((res) => res.data);
}

export function getKnowledgeDocuments(id: number) {
  return request
    .get<ApiEnvelope<KnowledgeDocumentItem[]>>(`/knowledge/bases/${id}/documents`)
    .then((res) => res.data);
}

export async function uploadKnowledgeDocument(id: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await request.post<ApiEnvelope<KnowledgeDocumentItem>, FormData>(
    `/knowledge/bases/${id}/documents/upload`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data;
}

export function searchKnowledgeBase(id: number, query: string) {
  return request
    .post<ApiEnvelope<{ items: KnowledgeSearchItem[] }>, { query: string }>(
      `/knowledge/bases/${id}/search`,
      { query },
    )
    .then((res) => res.data.items);
}
