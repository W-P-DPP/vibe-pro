import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { SendHorizonalIcon, SparklesIcon } from 'lucide-react';
import { toast } from 'sonner';
import { getAgentModels, type AgentModelOption } from '@/api/modules/agent';
import {
  getChatMessages,
  streamChatReply,
  type ChatMessageItem,
  type ChatStreamEvent,
} from '@/api/modules/chat';
import type { KnowledgeSearchItem } from '@/api/modules/knowledge';
import type { AppLayoutOutletContext } from '@/components/AppLayout';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  ScrollArea,
  Spinner,
  Textarea,
} from '@/components/ui';
import {
  buildAgentChatStreamPayload,
  buildAgentModelSelectionKey,
  buildPendingAssistantMessage,
  findAgentModelOption,
  pickAgentModelOption,
} from '@/lib/agent-models';
import { createKeyedOneFlightLoader, createOneFlightLoader } from '@/lib/one-flight';

type DisplayMessage = Omit<ChatMessageItem, 'id'> & { id: number | string };

const loadBootstrapModelCatalog = createOneFlightLoader(() => getAgentModels());
const loadSessionMessagesOnce = createKeyedOneFlightLoader((sessionId: string) =>
  getChatMessages(sessionId),
);

export function ChatPage() {
  const navigate = useNavigate();
  const {
    activeSessionId,
    agentInfo,
    createSession,
    currentKnowledgeBaseIds,
    sessions,
    setPageHeaderContent,
    syncSession,
    workspaceLoading,
  } = useOutletContext<AppLayoutOutletContext>();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [selectedModelKey, setSelectedModelKey] = useState('');
  const [modelOptions, setModelOptions] = useState<AgentModelOption[]>([]);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [retrievalItems, setRetrievalItems] = useState<KnowledgeSearchItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [sending, setSending] = useState(false);
  const streamingSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!agentInfo) {
      return;
    }

    const defaultAgentProvider = agentInfo.agent.defaultProvider;
    const defaultAgentModel = agentInfo.agent.defaultModel ?? '';
    let active = true;

    async function loadModelCatalog() {
      try {
        setLoadingModels(true);
        setModelLoadError(null);
        const response = await loadBootstrapModelCatalog();
        if (!active) {
          return;
        }

        setModelOptions(response.models);
        setSelectedModelKey((current) => {
          const nextOption = pickAgentModelOption(
            response.models,
            current,
            response.defaultProvider ?? defaultAgentProvider,
            response.defaultModel || defaultAgentModel,
          );

          if (!nextOption) {
            return '';
          }

          const nextSelectionKey = buildAgentModelSelectionKey(
            nextOption.provider,
            nextOption.model,
          );
          if (current && current !== nextSelectionKey) {
            toast.error('当前模型已失效，已切换到可用模型');
          }

          return nextSelectionKey;
        });
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : '加载模型列表失败';
        setModelOptions([]);
        setSelectedModelKey('');
        setModelLoadError(message);
        toast.error(message);
      } finally {
        if (active) {
          setLoadingModels(false);
        }
      }
    }

    void loadModelCatalog();

    return () => {
      active = false;
    };
  }, [agentInfo?.agent.defaultModel, agentInfo?.agent.defaultProvider]);

  useEffect(() => {
    if (activeSessionId === null) {
      setMessages([]);
      return;
    }

    const sessionId = activeSessionId;
    let active = true;

    async function loadMessageList() {
      if (streamingSessionIdRef.current === sessionId) {
        return;
      }

      try {
        setLoadingMessages(true);
        const response = await loadSessionMessagesOnce(sessionId);
        if (!active) {
          return;
        }

        setMessages(response);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '加载消息失败');
      } finally {
        if (active) {
          setLoadingMessages(false);
        }
      }
    }

    void loadMessageList();

    return () => {
      active = false;
    };
  }, [activeSessionId]);

  const selectedModelOption = useMemo(
    () => findAgentModelOption(modelOptions, selectedModelKey),
    [modelOptions, selectedModelKey],
  );

  useEffect(() => {
    setPageHeaderContent(
      <Select
        value={selectedModelKey}
        onValueChange={setSelectedModelKey}
        disabled={loadingModels || sending || modelOptions.length === 0}
      >
        <SelectTrigger className="h-10 w-full rounded-xl border-border/70 bg-background/90 shadow-none">
          <SelectValue
            placeholder={
              loadingModels
                ? '正在加载模型'
                : modelLoadError
                  ? '模型目录不可用'
                  : '请选择模型'
            }
          />
        </SelectTrigger>
        <SelectContent
          position="popper"
          align="end"
          className="rounded-xl border border-border/70 bg-popover/95 shadow-sm backdrop-blur"
        >
          {modelOptions.map((item) => (
            <SelectItem
              key={buildAgentModelSelectionKey(item.provider, item.model)}
              value={buildAgentModelSelectionKey(item.provider, item.model)}
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>,
    );

    return () => {
      setPageHeaderContent(null);
    };
  }, [
    loadingModels,
    modelLoadError,
    modelOptions,
    selectedModelKey,
    sending,
    setPageHeaderContent,
  ]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || loadingModels || !selectedModelOption) {
      return;
    }

    const tempUserId = `user-${Date.now()}`;
    const tempAssistantId = `assistant-${Date.now()}`;

    try {
      setSending(true);
      setRetrievalItems([]);
      setInput('');

      let targetSessionId = activeSessionId;
      if (targetSessionId === null) {
        targetSessionId = await createSession(trimmed.slice(0, 24));
        if (targetSessionId === null) {
          setInput(trimmed);
          return;
        }
      }

      if (targetSessionId === null) {
        setInput(trimmed);
        return;
      }

      let didPersistAssistantMessage = false;
      let didStreamFail = false;
      streamingSessionIdRef.current = targetSessionId;

      setMessages((current) => [
        ...current,
        {
          id: tempUserId,
          role: 'user',
          content: trimmed,
          provider: '',
          model: '',
        },
        {
          ...buildPendingAssistantMessage(tempAssistantId, selectedModelOption),
        },
      ]);

      await streamChatReply(
        targetSessionId,
        buildAgentChatStreamPayload(selectedModelOption, trimmed, currentKnowledgeBaseIds),
        {
          onEvent: (event: ChatStreamEvent) => {
            if (event.event === 'token') {
              setMessages((current) =>
                current.map((item) =>
                  item.id === tempAssistantId
                    ? { ...item, content: item.content + event.data.content }
                    : item,
                ),
              );
            }

            if (event.event === 'retrieval-result') {
              setRetrievalItems(event.data.items);
            }

            if (event.event === 'message-complete') {
              didPersistAssistantMessage = true;
              setMessages((current) =>
                current.map((item) =>
                  item.id === tempAssistantId ? event.data.message : item,
                ),
              );
              syncSession(event.data.session);
            }

            if (event.event === 'error') {
              didStreamFail = true;
              setMessages((current) => current.filter((item) => item.id !== tempAssistantId));
              toast.error(event.data.message || '会话执行失败');
            }
          },
        },
      );

      if (!didPersistAssistantMessage && !didStreamFail) {
        setMessages((current) => current.filter((item) => item.id !== tempAssistantId));
        toast.error('本次未生成有效回复，请重试');
      }
    } catch (error) {
      setMessages((current) => current.filter((item) => item.id !== tempAssistantId));
      toast.error(error instanceof Error ? error.message : '发送消息失败');
      setInput(trimmed);
    } finally {
      streamingSessionIdRef.current = null;
      setSending(false);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void handleSend();
  };

  if (workspaceLoading) {
    return (
      <section className="flex min-h-[calc(100svh-3.75rem)] items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          正在加载工作台
        </div>
      </section>
    );
  }

  return (
    <section className="grid min-h-[calc(100svh-3.75rem)] gap-4 p-4 md:h-[calc(100svh-3.75rem)] md:min-h-0 md:grid-cols-[minmax(0,1fr)_18rem] md:p-6">
      <Card className="border border-border/80 bg-card/92 shadow-sm md:min-h-0 md:overflow-hidden">
        <CardContent className="flex h-full min-h-[32rem] flex-col gap-4 px-4 pt-4 md:min-h-0 md:px-5">
          {modelLoadError ? (
            <div className="text-xs text-destructive">{modelLoadError}</div>
          ) : null}

          <div className="min-h-0 flex-1">
            <div className="flex h-full min-h-0 flex-col rounded-[calc(var(--radius)+0.5rem)] border border-border/70 bg-background/30">
              <ScrollArea className="min-h-0 flex-1">
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
                  {loadingMessages ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner className="size-4" />
                      正在加载消息
                    </div>
                  ) : null}

                  {loadingModels ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner className="size-4" />
                      正在刷新模型列表
                    </div>
                  ) : null}

                  {messages.map((item) => {
                    const isUser = item.role === 'user';

                    if (isUser) {
                      return (
                        <div key={item.id} className="flex justify-end">
                          <div className="max-w-[min(92%,32rem)] rounded-3xl rounded-br-lg bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-sm">
                            <div className="whitespace-pre-wrap break-words">{item.content}</div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={item.id} className="flex justify-center">
                        <div className="w-full max-w-3xl text-center text-sm leading-7 text-foreground">
                          <div className="mx-auto max-w-2xl whitespace-pre-wrap break-words">
                            {item.content || (sending ? '正在生成回复...' : '')}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {messages.length === 0 && !loadingMessages ? (
                    <Empty className="min-h-[24rem] justify-center rounded-[calc(var(--radius)+0.5rem)] border border-dashed border-border/80 bg-background/40">
                      <EmptyHeader>
                        <EmptyTitle>开始一场新对话</EmptyTitle>
                        <EmptyDescription>输入问题后即可开始。</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : null}
                </div>
              </ScrollArea>

              <div className="border-t border-border/70 bg-background/82 px-4 py-3 backdrop-blur sm:px-6">
                <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>已纳入 {currentKnowledgeBaseIds.length} 个知识库</span>
                    <span>{selectedModelOption?.label ?? '模型未就绪'}</span>
                  </div>
                  <div className="rounded-[calc(var(--radius)+0.5rem)] border border-border/70 bg-background shadow-xs">
                    <Textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      onKeyDown={handleInputKeyDown}
                      placeholder="输入你的问题"
                      rows={2}
                      className="min-h-14 max-h-32 resize-none border-0 bg-transparent px-4 py-3 shadow-none focus-visible:ring-0"
                    />
                    <div className="flex items-center justify-between gap-3 border-t border-border/70 px-3 py-2">
                      <div className="text-xs text-muted-foreground">Shift + Enter 换行</div>
                      <Button
                        type="button"
                        onClick={handleSend}
                        disabled={
                          sending || loadingModels || !selectedModelOption || Boolean(modelLoadError)
                        }
                        className="rounded-xl px-4"
                      >
                        {sending ? (
                          <Spinner className="size-4" />
                        ) : (
                          <SendHorizonalIcon className="size-4" />
                        )}
                        发送
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/80 shadow-sm">
        <CardHeader className="border-b border-border/70">
          <CardTitle>检索命中</CardTitle>
          <CardDescription>
            最近一次回复引用的资料片段，当前会话共纳入 {currentKnowledgeBaseIds.length} 个来源。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {retrievalItems.map((item) => (
            <div key={item.chunkId} className="rounded-xl border border-border/70 px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="truncate text-sm font-medium">{item.documentName}</div>
                <Badge variant="secondary">{item.score.toFixed(1)}</Badge>
              </div>
              <Separator className="my-2" />
              <div className="text-sm leading-6 text-muted-foreground">{item.snippet}</div>
            </div>
          ))}
          {retrievalItems.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <SparklesIcon className="size-4" />
              暂未产生检索结果
            </div>
          ) : null}

          {sessions.length === 0 && activeSessionId === null ? (
            <Button type="button" variant="outline" className="w-full" onClick={() => void createSession()}>
              新建第一个会话
            </Button>
          ) : null}

          {activeSessionId === null && sessions.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/chat/${sessions[0].id}`)}
            >
              打开最近会话
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
