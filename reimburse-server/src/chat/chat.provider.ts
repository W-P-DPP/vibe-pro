import { createOpenAI, openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import type { ChatMessageResponseDto } from './chat.dto.ts';

interface ProviderMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function readOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function getOpenAIProvider() {
  const baseURL = readOptionalEnv('OPENAI_BASE_URL');
  const apiKey = readOptionalEnv('OPENAI_API_KEY');

  if (!baseURL && !apiKey) {
    return openai;
  }

  return createOpenAI({
    ...(baseURL ? { baseURL } : {}),
    ...(apiKey ? { apiKey } : {}),
  });
}

function hasOpenAiConfig() {
  return Boolean(readOptionalEnv('OPENAI_API_KEY'));
}

function buildRetrievedContext(retrievedItems: Array<{ documentName: string; snippet: string }>) {
  if (retrievedItems.length === 0) {
    return '';
  }

  return retrievedItems
    .map(
      (item, index) =>
        `资料 ${index + 1}\n来源文档: ${item.documentName}\n内容片段:\n${item.snippet}`,
    )
    .join('\n\n');
}

function buildMockAnswer(input: {
  question: string;
  retrievedItems: Array<{ documentName: string; snippet: string }>;
}) {
  if (input.retrievedItems.length === 0) {
    return `当前未检索到可用知识片段。你刚才的问题是：${input.question}\n\n请尝试换一种问法，或先在知识库中上传更贴近问题的内容。`;
  }

  const summary = input.retrievedItems
    .slice(0, 3)
    .map((item, index) => `${index + 1}. ${item.documentName}：${item.snippet}`)
    .join('\n');

  return `以下回答基于当前命中的知识片段整理：\n${summary}\n\n结合这些资料，你的问题“${input.question}”还需要结合原始文档进一步确认。`;
}

export async function* streamAgentReply(input: {
  model: string;
  systemPrompt: string;
  history: ChatMessageResponseDto[];
  question: string;
  retrievedItems: Array<{ documentName: string; snippet: string }>;
}): AsyncGenerator<string> {
  if (!hasOpenAiConfig()) {
    yield buildMockAnswer(input);
    return;
  }

  const messages: ProviderMessage[] = [
    {
      role: 'system',
      content:
        `${input.systemPrompt}\n\n` +
        `若提供了知识库片段，请优先依据知识库片段作答；若资料不足，请明确说明资料不足，不要编造。` +
        (input.retrievedItems.length > 0
          ? `\n\n知识库片段如下：\n${buildRetrievedContext(input.retrievedItems)}`
          : ''),
    },
    ...input.history.map((item) => ({
      role: item.role,
      content: item.content,
    })),
    {
      role: 'user',
      content: input.question,
    },
  ];

  const result = streamText({
    model: getOpenAIProvider()(input.model),
    messages,
  });

  for await (const chunk of result.textStream) {
    if (chunk) {
      yield chunk;
    }
  }
}

export const chatProvider = {
  streamAgentReply,
};
