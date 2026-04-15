import type { AgentProvider } from '../agent/agent.dto.ts';
import type { KnowledgeSearchItemDto } from '../knowledge/knowledge.dto.ts';

export type ChatRole = 'user' | 'assistant';

export interface ChatSessionResponseDto {
  id: string;
  title: string;
  lastMessageAt?: string | null;
  createTime?: string | null;
}

export interface ChatMessageResponseDto {
  id: number;
  role: ChatRole;
  content: string;
  provider: string;
  model: string;
  createTime?: string | null;
}

export interface CreateChatSessionRequestDto {
  title?: string;
}

export interface StreamChatSessionRequestDto {
  message: string;
  knowledgeBaseIds?: number[];
  provider?: AgentProvider;
  model?: string;
}

export type ChatStreamEvent =
  | {
      event: 'run-start';
      data: {
        runId: number;
        sessionId: string;
        provider: string;
        model: string;
      };
    }
  | {
      event: 'retrieval-result';
      data: {
        knowledgeBaseIds: number[];
        count: number;
        items: KnowledgeSearchItemDto[];
      };
    }
  | {
      event: 'token';
      data: {
        content: string;
      };
    }
  | {
      event: 'message-complete';
      data: {
        message: ChatMessageResponseDto;
        session: ChatSessionResponseDto;
      };
    }
  | {
      event: 'run-complete';
      data: {
        runId: number;
        status: 'success';
        durationMs: number;
      };
    }
  | {
      event: 'error';
      data: {
        runId: number;
        status: 'failed';
        message: string;
      };
    };
