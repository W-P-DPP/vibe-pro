import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { BotMessageSquareIcon, SendHorizonalIcon, SparklesIcon } from 'lucide-react';
import { toast } from 'sonner';
import { RequestError } from '@/api/request';
import {
  getChatMessages,
  streamChatReply,
  type ChatMessageItem,
  type ChatStreamEvent,
} from '@/api/modules/chat';
import type { KnowledgeSearchItem } from '@/api/modules/knowledge';
import type { AppLayoutOutletContext } from '@/components/AppLayout';
import {
  Avatar,
  AvatarFallback,
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
  ScrollArea,
  Separator,
  Spinner,
  Textarea,
} from '@/components/ui';
import {
  buildFixedAgentChatStreamPayload,
  buildPendingAssistantMessage,
  FIXED_AGENT_MODEL,
} from '@/lib/agent-models';
import { createKeyedOneFlightLoader } from '@/lib/one-flight';
import { getUserAvatarFallback } from '@/lib/user-display';

type DisplayMessage = Omit<ChatMessageItem, 'id'> & { id: number | string };

const loadSessionMessagesOnce = createKeyedOneFlightLoader((sessionId: string) =>
  getChatMessages(sessionId),
);

export function ChatPage() {
  const navigate = useNavigate();
  const {
    activeSessionId,
    createSession,
    currentKnowledgeBaseIds,
    currentUser,
    refreshSessions,
    sessions,
    sessionsLoading,
    setPageHeaderContent,
    syncSession,
    workspaceLoading,
  } = useOutletContext<AppLayoutOutletContext>();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [retrievalItems, setRetrievalItems] = useState<KnowledgeSearchItem[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const streamingSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    setPageHeaderContent(null);

    return () => {
      setPageHeaderContent(null);
    };
  }, [setPageHeaderContent]);

  useEffect(() => {
    if (activeSessionId === null) {
      setMessages([]);
      return;
    }

    if (sessionsLoading) {
      return;
    }

    if (!sessions.some((item) => item.id === activeSessionId)) {
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
        if (!active) {
          return;
        }

        if (error instanceof RequestError && error.status === 404) {
          setMessages([]);

          let latestSessions = sessions;
          try {
            latestSessions = await refreshSessions();
          } catch {}

          if (!active) {
            return;
          }

          const fallbackSessionId =
            latestSessions.find((item) => item.id !== sessionId)?.id ?? null;
          navigate(fallbackSessionId ? `/chat/${fallbackSessionId}` : '/chat', {
            replace: true,
          });
          return;
        }

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
  }, [activeSessionId, navigate, refreshSessions, sessions, sessionsLoading]);

  const currentUserAvatarFallback = useMemo(
    () => getUserAvatarFallback(currentUser?.displayName, currentUser?.username),
    [currentUser?.displayName, currentUser?.username],
  );

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) {
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
        buildPendingAssistantMessage(tempAssistantId),
      ]);

      await streamChatReply(
        targetSessionId,
        buildFixedAgentChatStreamPayload(trimmed, currentKnowledgeBaseIds),
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
          正在加载工作区
        </div>
      </section>
    );
  }

  return (
    <section className="grid min-h-[calc(100svh-3.75rem)] gap-4 p-4 md:h-[calc(100svh-3.75rem)] md:min-h-0 md:grid-cols-[minmax(0,1fr)_18rem] md:p-6">
      <Card className="border border-border/80 bg-card/92 shadow-sm md:min-h-0 md:overflow-hidden">
        <CardContent className="flex h-full min-h-[32rem] flex-col gap-4 px-4 pt-4 md:min-h-0 md:px-5">
          <div className="min-h-0 flex-1">
            <div className="flex h-full min-h-0 flex-col rounded-[calc(var(--radius)+0.5rem)] border border-border/70 bg-background/30">
              <ScrollArea className="min-h-0 flex-1">
                <div className="flex w-full flex-col gap-6 px-3 py-6 sm:px-4">
                  {loadingMessages ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner className="size-4" />
                      正在加载消息
                    </div>
                  ) : null}

                  {messages.map((item) => {
                    const isUser = item.role === 'user';

                    if (isUser) {
                      return (
                        <div key={item.id} className="flex justify-end">
                          <div className="flex max-w-[min(100%,52rem)] items-end gap-3">
                            <div className="max-w-[min(100%,38rem)] rounded-3xl rounded-br-lg bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-sm">
                              <div className="whitespace-pre-wrap break-words">{item.content}</div>
                            </div>
                            <Avatar size="sm" className="shrink-0 border border-border/60">
                              <AvatarFallback className="p-1">{currentUserAvatarFallback}</AvatarFallback>
                            </Avatar>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={item.id} className="flex justify-start">
                        <div className="flex max-w-[min(100%,52rem)] items-start gap-3">
                          <Avatar
                            size="sm"
                            className="shrink-0 border border-border/60 bg-secondary/70 text-secondary-foreground"
                          >
                            <AvatarFallback className="p-1">
                              <BotMessageSquareIcon className="size-3.5" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="max-w-[min(100%,38rem)] rounded-3xl rounded-tl-lg border border-border/70 bg-muted/70 px-4 py-3 text-sm leading-6 text-foreground shadow-xs">
                            <div className="whitespace-pre-wrap break-words">
                              {item.content || (sending ? '正在生成回复...' : '')}
                            </div>
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
                <div className="flex w-full flex-col gap-3">
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>已纳入 {currentKnowledgeBaseIds.length} 个知识库</span>
                    <span>{FIXED_AGENT_MODEL.label}</span>
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
                        disabled={sending || !input.trim()}
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
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void createSession()}
            >
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
