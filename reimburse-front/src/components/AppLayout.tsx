import { type ReactNode, startTransition, useEffect, useMemo, useState } from 'react';
import { Outlet, matchPath, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';
import {
  BookOpenTextIcon,
  BotMessageSquareIcon,
  CogIcon,
  LogOutIcon,
  MoonStarIcon,
  PlusIcon,
  Settings2Icon,
  SunMediumIcon,
  Trash2Icon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getAgentCurrentUser,
  getAgentMe,
  type AgentCurrentUserResponse,
  type AgentMeResponse,
} from '@/api/modules/agent';
import {
  createChatSession,
  deleteChatSession,
  getChatSessions,
  type ChatSessionItem,
} from '@/api/modules/chat';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Avatar,
  AvatarFallback,
  Button,
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  ScrollArea,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  Spinner,
} from '@/components/ui';
import { clearReusableAuthSession, hasReusableAuthToken } from '@/lib/auth-session';
import { upsertSessionSummary } from '@/lib/chat-session-state';
import { redirectToLoginWithCurrentPage } from '@/lib/login-redirect';
import { createOneFlightLoader } from '@/lib/one-flight';
import { getUserAvatarFallback, getUserDisplayName } from '@/lib/user-display';

export type AppLayoutOutletContext = {
  activeSessionId: string | null;
  agentInfo: AgentMeResponse | null;
  createSession: (title?: string) => Promise<string | null>;
  currentKnowledgeBaseIds: number[];
  currentUser: AgentCurrentUserResponse | null;
  refreshSessions: () => Promise<ChatSessionItem[]>;
  setPageHeaderContent: (content: ReactNode | null) => void;
  sessions: ChatSessionItem[];
  sessionsLoading: boolean;
  syncSession: (session: ChatSessionItem) => void;
  workspaceLoading: boolean;
};

const loadBootstrapSessions = createOneFlightLoader(() => getChatSessions());
const loadBootstrapWorkspace = createOneFlightLoader(async () => {
  const [agentResponse, currentUserResponse] = await Promise.all([
    getAgentMe(),
    getAgentCurrentUser(),
  ]);

  return {
    agentResponse,
    currentUserResponse,
  };
});

function formatDateTime(value?: string | null) {
  if (!value) {
    return '刚刚';
  }

  try {
    return new Date(value).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function pickNextSessionId(sessions: ChatSessionItem[], deletedSessionId: string) {
  const deletedIndex = sessions.findIndex((item) => item.id === deletedSessionId);
  if (deletedIndex < 0) {
    return null;
  }

  const remaining = sessions.filter((item) => item.id !== deletedSessionId);
  if (remaining.length === 0) {
    return null;
  }

  return remaining[deletedIndex]?.id ?? remaining[remaining.length - 1]?.id ?? null;
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [pendingDeleteSessionId, setPendingDeleteSessionId] = useState<string | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [agentInfo, setAgentInfo] = useState<AgentMeResponse | null>(null);
  const [currentUser, setCurrentUser] = useState<AgentCurrentUserResponse | null>(null);
  const [currentKnowledgeBaseIds, setCurrentKnowledgeBaseIds] = useState<number[]>([]);
  const [operationsOpen, setOperationsOpen] = useState(false);
  const [pageHeaderContent, setPageHeaderContent] = useState<ReactNode | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const activeSessionId = useMemo(() => {
    const match = matchPath('/chat/:sessionId', location.pathname);
    const sessionId = match?.params.sessionId?.trim();
    return sessionId ? sessionId : null;
  }, [location.pathname]);

  const pendingDeleteSession = useMemo(
    () => sessions.find((item) => item.id === pendingDeleteSessionId) ?? null,
    [pendingDeleteSessionId, sessions],
  );

  useEffect(() => {
    if (!hasReusableAuthToken()) {
      redirectToLoginWithCurrentPage();
    }
  }, []);

  const refreshSessions = async () => {
    const sessionList = await getChatSessions();
    setSessions(sessionList);
    return sessionList;
  };

  const syncSession = (session: ChatSessionItem) => {
    setSessions((current) => upsertSessionSummary(current, session));
  };

  useEffect(() => {
    let active = true;

    async function loadSessions() {
      try {
        setSessionsLoading(true);
        const sessionList = await loadBootstrapSessions();
        if (!active) {
          return;
        }

        setSessions(sessionList);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '加载会话列表失败');
      } finally {
        if (active) {
          setSessionsLoading(false);
        }
      }
    }

    void loadSessions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadWorkspaceData() {
      try {
        setWorkspaceLoading(true);
        const { agentResponse, currentUserResponse } = await loadBootstrapWorkspace();
        if (!active) {
          return;
        }

        setAgentInfo(agentResponse);
        setCurrentUser(currentUserResponse);
        setCurrentKnowledgeBaseIds(
          agentResponse.bindings.map((item) => item.knowledgeBaseId),
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '加载工作台数据失败');
      } finally {
        if (active) {
          setWorkspaceLoading(false);
        }
      }
    }

    void loadWorkspaceData();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (location.pathname !== '/chat' || sessionsLoading || sessions.length === 0) {
      return;
    }

    startTransition(() => {
      navigate(`/chat/${sessions[0].id}`, { replace: true });
    });
  }, [location.pathname, navigate, sessions, sessionsLoading]);

  useEffect(() => {
    if (sessionsLoading || activeSessionId === null) {
      return;
    }

    if (sessions.some((item) => item.id === activeSessionId)) {
      return;
    }

    startTransition(() => {
      navigate(sessions[0] ? `/chat/${sessions[0].id}` : '/chat', { replace: true });
    });
  }, [activeSessionId, navigate, sessions, sessionsLoading]);

  const pageTitle = useMemo(() => {
    if (location.pathname === '/knowledge') {
      return '知识库';
    }

    if (location.pathname === '/settings') {
      return '设置';
    }

    if (location.pathname.startsWith('/knowledge/')) {
      return '知识库详情';
    }

    return sessions.find((item) => item.id === activeSessionId)?.title ?? '新会话';
  }, [activeSessionId, location.pathname, sessions]);

  const currentUserDisplayName = getUserDisplayName(
    currentUser?.displayName,
    currentUser?.username,
  );
  const currentUserAvatarFallback = getUserAvatarFallback(
    currentUser?.displayName,
    currentUser?.username,
  );

  const handleLogout = () => {
    clearReusableAuthSession();
    redirectToLoginWithCurrentPage();
  };

  const createSession = async (title?: string) => {
    try {
      setCreatingSession(true);
      const created = await createChatSession(title);
      setSessions((current) => upsertSessionSummary(current, created));
      startTransition(() => {
        navigate(`/chat/${created.id}`);
      });
      return created.id;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建会话失败');
      return null;
    } finally {
      setCreatingSession(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!pendingDeleteSessionId) {
      return;
    }

    const targetSessionId = pendingDeleteSessionId;
    const nextSessionId = pickNextSessionId(sessions, targetSessionId);

    try {
      setDeletingSessionId(targetSessionId);
      await deleteChatSession(targetSessionId);
      setSessions((current) => current.filter((item) => item.id !== targetSessionId));
      setPendingDeleteSessionId(null);

      if (activeSessionId === targetSessionId) {
        startTransition(() => {
          navigate(nextSessionId ? `/chat/${nextSessionId}` : '/chat', { replace: true });
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '删除会话失败');
    } finally {
      setDeletingSessionId(null);
    }
  };

  const outletContext: AppLayoutOutletContext = {
    activeSessionId,
    agentInfo,
    createSession,
    currentKnowledgeBaseIds,
    currentUser,
    refreshSessions,
    setPageHeaderContent,
    sessions,
    sessionsLoading,
    syncSession,
    workspaceLoading,
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border/80 px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary/12 text-sidebar-primary">
              <BotMessageSquareIcon className="size-5" />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-semibold text-sidebar-foreground">
                会话工作台
              </div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="flex h-full flex-col px-2 py-3">
            <SidebarGroupLabel>会话列表</SidebarGroupLabel>
            <SidebarGroupContent className="flex min-h-0 flex-1 flex-col gap-3">
              <Button
                type="button"
                className="w-full justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                onClick={() => void createSession()}
                disabled={creatingSession}
              >
                {creatingSession ? <Spinner className="size-4" /> : <PlusIcon className="size-4" />}
                <span className="group-data-[collapsible=icon]:hidden">新建会话</span>
              </Button>

              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-2 pr-2">
                {sessionsLoading ? (
                  <div className="flex items-center gap-2 px-2 text-sm text-sidebar-foreground/70">
                    <Spinner className="size-4" />
                    <span className="group-data-[collapsible=icon]:hidden">正在加载会话</span>
                  </div>
                ) : null}

                {!sessionsLoading && sessions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-sidebar-border/80 bg-sidebar-accent/30 px-3 py-4 text-sm text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
                    还没有会话，先创建一个开始使用。
                  </div>
                ) : null}

                {sessions.map((item) => {
                  const deleting = deletingSessionId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={[
                        'group flex items-start gap-2 rounded-xl border px-3 py-3 transition group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2',
                        item.id === activeSessionId
                          ? 'border-sidebar-primary/30 bg-sidebar-primary/10'
                          : 'border-sidebar-border/70 hover:bg-sidebar-accent/40',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/chat/${item.id}`)}
                        className="flex min-w-0 flex-1 items-start gap-3 text-left group-data-[collapsible=icon]:justify-center"
                        title={item.title}
                      >
                        <div className="hidden size-8 items-center justify-center rounded-lg bg-sidebar-primary/12 text-sidebar-primary group-data-[collapsible=icon]:flex">
                          <BotMessageSquareIcon className="size-4" />
                        </div>

                        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                          <div className="truncate text-sm font-medium text-sidebar-foreground">
                            {item.title}
                          </div>
                          <div className="mt-1 text-xs text-sidebar-foreground/60">
                            {formatDateTime(item.lastMessageAt)}
                          </div>
                        </div>

                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 group-data-[collapsible=icon]:hidden"
                        aria-label={`删除会话 ${item.title}`}
                        disabled={deleting}
                        onClick={() => {
                          setPendingDeleteSessionId(item.id);
                        }}
                      >
                        {deleting ? <Spinner className="size-4" /> : <Trash2Icon className="size-4" />}
                      </Button>
                    </div>
                  );
                })}
                </div>
              </ScrollArea>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border/80 px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <Popover open={operationsOpen} onOpenChange={setOperationsOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="打开设置菜单"
                >
                  <CogIcon className="size-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="right" align="end" className="w-56 p-2">
                <PopoverHeader className="px-1 pb-1">
                  <PopoverTitle>设置</PopoverTitle>
                </PopoverHeader>
                <div className="grid gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                      setOperationsOpen(false);
                      navigate('/knowledge');
                    }}
                  >
                    <BookOpenTextIcon className="size-4" />
                    知识库
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                      setOperationsOpen(false);
                      navigate('/settings');
                    }}
                  >
                    <Settings2Icon className="size-4" />
                    设置
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="justify-start"
                    onClick={() => {
                      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
                      setOperationsOpen(false);
                    }}
                  >
                    {resolvedTheme === 'dark' ? (
                      <SunMediumIcon className="size-4" />
                    ) : (
                      <MoonStarIcon className="size-4" />
                    )}
                    切换主题
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={userMenuOpen} onOpenChange={setUserMenuOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full p-0"
                  aria-label="打开用户菜单"
                >
                  <Avatar size="sm">
                    <AvatarFallback>{currentUserAvatarFallback}</AvatarFallback>
                  </Avatar>
                </Button>
              </PopoverTrigger>
              <PopoverContent side="right" align="end" className="w-56 p-2">
                <div className="flex items-center gap-3 px-1 py-1">
                  <Avatar>
                    <AvatarFallback>{currentUserAvatarFallback}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">
                      {currentUserDisplayName}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {currentUser?.username ?? ''}
                    </div>
                  </div>
                </div>
                <div className="mt-2 grid gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="justify-start text-destructive hover:text-destructive"
                    onClick={handleLogout}
                  >
                    <LogOutIcon className="size-4" />
                    退出登录
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-svh bg-background">
        <header className="sticky top-0 z-20 flex h-15 items-center gap-3 border-b border-border/70 bg-background/92 px-4 backdrop-blur md:px-6">
          <SidebarTrigger />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold text-foreground">{pageTitle}</div>
          </div>
          {pageHeaderContent ? (
            <div className="min-w-0 flex-1 md:max-w-sm">{pageHeaderContent}</div>
          ) : null}
          <div className="hidden items-center gap-2 md:flex">
            <div className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
              资料范围 {currentKnowledgeBaseIds.length}
            </div>
            <div className="rounded-full border border-border/70 px-3 py-1 text-xs text-muted-foreground">
              {resolvedTheme === 'dark' ? '深色' : resolvedTheme === 'light' ? '浅色' : '系统'}
            </div>
          </div>
        </header>
        <Outlet context={outletContext} />
      </SidebarInset>

      <AlertDialog
        open={Boolean(pendingDeleteSessionId)}
        onOpenChange={(open) => {
          if (!open && !deletingSessionId) {
            setPendingDeleteSessionId(null);
          }
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>删除会话</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteSession
                ? `确认删除“${pendingDeleteSession.title}”吗？删除后消息和运行记录会一并清理。`
                : '确认删除当前会话吗？删除后消息和运行记录会一并清理。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingSessionId)}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={Boolean(deletingSessionId)}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteSession();
              }}
            >
              {deletingSessionId ? <Spinner className="size-4" /> : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
