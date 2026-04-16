import { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  ClipboardCheckIcon,
  LogOutIcon,
  MoonStarIcon,
  ReceiptTextIcon,
  SunMediumIcon,
} from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Button,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui';
import { getCurrentUser, type CurrentUserResponse } from '@/api/modules/reimbursement';
import { clearReusableAuthSession, hasReusableAuthToken } from '@/lib/auth-session';
import { redirectToLoginWithCurrentPage } from '@/lib/login-redirect';

const navItems = [
  { label: '我的报销', path: '/reimbursements', icon: ReceiptTextIcon },
  { label: '审批列表', path: '/approvals', icon: ClipboardCheckIcon },
];

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<CurrentUserResponse | null>(null);

  useEffect(() => {
    if (!hasReusableAuthToken()) {
      redirectToLoginWithCurrentPage();
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCurrentUser() {
      try {
        const response = await getCurrentUser();
        if (active) {
          setCurrentUser(response);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : '加载当前用户失败');
      }
    }

    void loadCurrentUser();

    return () => {
      active = false;
    };
  }, []);

  const pageTitle = useMemo(() => {
    if (location.pathname.startsWith('/approvals')) {
      return '审批列表';
    }

    if (location.pathname.includes('/new')) {
      return '新建报销';
    }

    if (/\/reimbursements\/\d+/.test(location.pathname)) {
      return '报销详情';
    }

    return '我的报销';
  }, [location.pathname]);

  const handleLogout = () => {
    clearReusableAuthSession();
    redirectToLoginWithCurrentPage();
  };

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border/80 px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl border border-sidebar-border/80 bg-sidebar-accent/60 text-sidebar-foreground shadow-sm">
              <ReceiptTextIcon className="size-5" />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-semibold text-sidebar-foreground">报销系统</div>
              <div className="mt-1 truncate text-xs text-sidebar-foreground/70">
                {currentUser ? `${currentUser.username} · ${currentUser.role}` : '正在加载用户'}
              </div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0">
          <SidebarGroup className="px-2 py-3">
            <SidebarGroupLabel>工作台</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    location.pathname === item.path ||
                    location.pathname.startsWith(`${item.path}/`);

                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        type="button"
                        tooltip={item.label}
                        isActive={isActive}
                        className="h-10 rounded-xl"
                        onClick={() => navigate(item.path)}
                      >
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border/80 px-3 py-3">
          <Button
            type="button"
            variant="ghost"
            className="h-10 justify-start gap-2 rounded-xl px-3"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            {resolvedTheme === 'dark' ? (
              <SunMediumIcon className="size-4" />
            ) : (
              <MoonStarIcon className="size-4" />
            )}
            <span className="group-data-[collapsible=icon]:hidden">切换主题</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-10 justify-start gap-2 rounded-xl px-3"
            onClick={handleLogout}
          >
            <LogOutIcon className="size-4" />
            <span className="group-data-[collapsible=icon]:hidden">退出登录</span>
          </Button>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-svh bg-transparent">
        <header className="sticky top-0 z-20 flex h-[var(--app-shell-header-height)] items-center gap-3 border-b border-border/70 bg-background/92 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/75 md:px-6">
          <SidebarTrigger />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-foreground">{pageTitle}</div>
          </div>
        </header>

        <main className="flex-1 px-4 py-4 md:px-6 md:py-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
