import { useEffect, useMemo, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useTheme } from 'next-themes'
import {
  CircleAlertIcon,
  LoaderCircleIcon,
  MoonStarIcon,
  PanelLeftIcon,
  RefreshCwIcon,
  SearchIcon,
  SunMediumIcon,
} from 'lucide-react'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Separator,
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
} from '@/components/ui'
import { getSiteMenuTree } from '@/api/modules/site-menu'
import {
  buildToolStats,
  emptyToolStats,
  normalizeSiteMenuTree,
  toPublicIcon,
  type ToolDirectoryContextValue,
  type ToolDirectoryLoadStatus,
} from '@/data/tool-directory'

function scrollToSection(sectionId: string) {
  document.getElementById(`section-${sectionId}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

export function AppLayout() {
  const { resolvedTheme, setTheme } = useTheme()
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light')
  const [directoryStatus, setDirectoryStatus] = useState<ToolDirectoryLoadStatus>('loading')
  const [directoryErrorMessage, setDirectoryErrorMessage] = useState('')
  const [menuTree, setMenuTree] = useState<ToolDirectoryContextValue['menuTree']>([])
  const [toolStats, setToolStats] = useState(emptyToolStats)
  const [reloadSeed, setReloadSeed] = useState(0)

  useEffect(() => {
    if (resolvedTheme === 'dark' || resolvedTheme === 'light') {
      setThemeMode(resolvedTheme)
    }
  }, [resolvedTheme])

  const themeLabel = useMemo(
    () => (themeMode === 'dark' ? '切到浅色' : '切到深色'),
    [themeMode],
  )

  const toggleTheme = () => {
    const nextTheme = themeMode === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(nextTheme)
    localStorage.setItem('theme', nextTheme)
    setThemeMode(nextTheme)
    setTheme(nextTheme)
  }

  useEffect(() => {
    let active = true

    const loadDirectory = async () => {
      setDirectoryStatus('loading')
      setDirectoryErrorMessage('')

      try {
        const menuTree = await getSiteMenuTree({
          forceRefresh: reloadSeed > 0,
        })
        if (!active) {
          return
        }

        const normalizedMenuTree = normalizeSiteMenuTree(menuTree)
        setMenuTree(normalizedMenuTree)
        setToolStats(buildToolStats(normalizedMenuTree))
        setDirectoryStatus('success')
      } catch (error) {
        if (!active) {
          return
        }

        setMenuTree([])
        setToolStats(emptyToolStats)
        setDirectoryStatus('error')
        setDirectoryErrorMessage(
          error instanceof Error ? error.message : '目录加载失败，请稍后重试。',
        )
      }
    }

    void loadDirectory()

    return () => {
      active = false
    }
  }, [reloadSeed])

  const reloadDirectory = () => {
    setReloadSeed((current) => current + 1)
  }

  const outletContext: ToolDirectoryContextValue = {
    status: directoryStatus,
    menuTree,
    stats: toolStats,
    errorMessage: directoryErrorMessage,
    reload: reloadDirectory,
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border/80 px-3 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center overflow-hidden rounded-xl border border-sidebar-border/80 bg-sidebar-accent/65 shadow-sm">
              <img
                src="/site-icons/tools.png"
                alt="zwpsite"
                className="size-8 object-contain"
              />
            </div>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-semibold text-sidebar-foreground">
                zwpsite
              </div>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className="h-5 rounded-full px-2 text-[11px]">
                  {toolStats.itemCount} 个入口
                </Badge>
              </div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0">
          <SidebarGroup className="px-2 py-3">
            <SidebarGroupLabel>目录</SidebarGroupLabel>
            <SidebarGroupContent>
              {directoryStatus === 'loading' ? (
                <div className="flex items-center gap-2 px-2 py-3 text-sm text-sidebar-foreground/75">
                  <LoaderCircleIcon className="size-4 animate-spin" />
                  <span>目录加载中</span>
                </div>
              ) : null}

              {directoryStatus === 'error' ? (
                <Alert className="mx-2 mt-2 border-sidebar-border/80 bg-sidebar-accent/40">
                  <CircleAlertIcon className="size-4" />
                  <AlertTitle>目录加载失败</AlertTitle>
                  <AlertDescription>{directoryErrorMessage}</AlertDescription>
                  <AlertAction>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-full px-2"
                      onClick={reloadDirectory}
                    >
                      <RefreshCwIcon className="size-3.5" />
                      重试
                    </Button>
                  </AlertAction>
                </Alert>
              ) : null}

              {directoryStatus === 'success' ? (
                <SidebarMenu>
                  {menuTree.map((section) => (
                    <SidebarMenuItem key={section.id}>
                      <SidebarMenuButton
                        tooltip={section.name}
                        className="h-10 rounded-xl"
                        onClick={() => scrollToSection(String(section.id))}
                      >
                        <img
                          src={toPublicIcon(section.icon)}
                          alt=""
                          className="size-4 shrink-0 object-contain opacity-85"
                        />
                        <span>{section.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  {menuTree.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-sidebar-foreground/70">
                      暂无可展示目录
                    </div>
                  ) : null}
                </SidebarMenu>
              ) : null}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border/80 px-3 py-3">
          <div className="group-data-[collapsible=icon]:hidden">
            <div className="text-xs text-sidebar-foreground/70">
              共 {toolStats.sectionCount} 个分类
            </div>
          </div>
          <div className="hidden items-center justify-center group-data-[collapsible=icon]:flex">
            <PanelLeftIcon className="size-4 text-sidebar-foreground/70" />
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-transparent">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/92 backdrop-blur-md">
          <div className="flex h-[3.75rem] items-center gap-3 px-4 md:px-6">
            <SidebarTrigger />
            <Separator orientation="vertical" className="hidden h-5 md:block" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">
                搜索与工具导航
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SearchIcon className="hidden size-4 text-muted-foreground lg:block" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full px-3"
                onClick={toggleTheme}
              >
                {themeMode === 'dark' ? (
                  <SunMediumIcon data-icon="inline-start" />
                ) : (
                  <MoonStarIcon data-icon="inline-start" />
                )}
                <span className="hidden sm:inline">{themeLabel}</span>
              </Button>
            </div>
          </div>
        </header>

        <Outlet context={outletContext} />
      </SidebarInset>
    </SidebarProvider>
  )
}
