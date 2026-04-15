import { getReusableAuthToken } from '@/lib/auth-session';
import { redirectToLoginWithCurrentPage } from '@/lib/login-redirect';
import { RequestError, request } from '@/api/request';
import type { KnowledgeSearchItem } from './knowledge';

export type ChatSessionItem = {
  id: string;
  title: string;
  lastMessageAt?: string | null;
  createTime?: string | null;
};

export type ChatMessageItem = {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  provider: string;
  model: string;
  createTime?: string | null;
};

type ApiEnvelope<T> = {
  code: number;
  msg: string;
  data: T;
  timestamp: number;
};

export type ChatStreamEvent =
  | {
      event: 'run-start';
      data: { runId: number; sessionId: string; provider: string; model: string };
    }
  | {
      event: 'retrieval-result';
      data: { knowledgeBaseIds: number[]; count: number; items: KnowledgeSearchItem[] };
    }
  | { event: 'token'; data: { content: string } }
  | { event: 'message-complete'; data: { message: ChatMessageItem; session: ChatSessionItem } }
  | { event: 'run-complete'; data: { runId: number; status: 'success'; durationMs: number } }
  | { event: 'error'; data: { runId?: number; status?: 'failed'; message: string } };

export function getChatSessions() {
  return request.get<ApiEnvelope<ChatSessionItem[]>>('/chat/sessions').then((res) => res.data);
}

export function createChatSession(title?: string) {
  return request
    .post<ApiEnvelope<ChatSessionItem>, { title?: string }>('/chat/sessions', { title })
    .then((res) => res.data);
}

export function deleteChatSession(sessionId: string) {
  return request
    .delete<ApiEnvelope<{ id: string }>>(`/chat/sessions/${encodeURIComponent(sessionId)}`)
    .then((res) => res.data);
}

export function getChatMessages(sessionId: string) {
  return request
    .get<ApiEnvelope<ChatMessageItem[]>>(`/chat/sessions/${encodeURIComponent(sessionId)}/messages`)
    .then((res) => res.data);
}

function parseSseChunks(input: string) {
  return input
    .split('\n\n')
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const lines = block.split('\n');
      const eventLine = lines.find((line) => line.startsWith('event:'));
      const dataLine = lines.find((line) => line.startsWith('data:'));
      if (!eventLine || !dataLine) {
        return null;
      }

      return {
        event: eventLine.slice(6).trim(),
        data: dataLine.slice(5).trim(),
      };
    })
    .filter((item): item is { event: string; data: string } => Boolean(item));
}

export async function streamChatReply(
  sessionId: string,
  payload: {
    message: string;
    knowledgeBaseIds: number[];
    provider?: 'openai';
    model?: string;
  },
  handlers: {
    onEvent: (event: ChatStreamEvent) => void;
  },
) {
  const token = getReusableAuthToken();
  if (!token) {
    redirectToLoginWithCurrentPage();
    throw new RequestError('当前未登录');
  }

  const baseURL = import.meta.env.VITE_API_BASE_URL?.trim() || '/agent-api';
  const response = await fetch(
    `${baseURL}/chat/sessions/${encodeURIComponent(sessionId)}/stream`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
  );

  if (response.status === 401 || response.status === 403) {
    redirectToLoginWithCurrentPage();
    throw new RequestError('登录状态已失效', { status: response.status });
  }

  if (!response.ok || !response.body) {
    throw new RequestError('会话流式请求失败', { status: response.status });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';

    for (const part of parts) {
      for (const event of parseSseChunks(part)) {
        handlers.onEvent({
          event: event.event as ChatStreamEvent['event'],
          data: JSON.parse(event.data) as ChatStreamEvent['data'],
        } as ChatStreamEvent);
      }
    }
  }

  if (buffer.trim()) {
    for (const event of parseSseChunks(buffer)) {
      handlers.onEvent({
        event: event.event as ChatStreamEvent['event'],
        data: JSON.parse(event.data) as ChatStreamEvent['data'],
      } as ChatStreamEvent);
    }
  }
}
