import { useDeferredValue, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Outlet } from 'react-router-dom'
import { useTheme } from 'next-themes'
import {
  CircleAlertIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  MoonStarIcon,
  PanelLeftIcon,
  RefreshCwIcon,
  SearchIcon,
  SunMediumIcon,
  XIcon,
} from 'lucide-react'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
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
  toast,
} from '@/components/ui'
import { getSiteMenuConfig, getSiteMenuTree } from '@/api/modules/site-menu'
import {
  buildToolStats,
  emptyToolStats,
  filterVisibleSiteMenuTree,
  getHiddenSiteMenuEntries,
  isExternalLink,
  isHiddenMenuKeywordMatch,
  normalizeSiteMenuTree,
  resolveSiteMenuSearchResults,
  resolveSiteMenuIcon,
  type SearchableSiteMenuEntry,
  type ToolDirectoryContextValue,
  type ToolDirectoryLoadStatus,
} from '@/data/tool-directory'
import { buildStrictMenuLoginRedirectUrl } from '@/lib/strict-menu-redirect'

const APP_SHELL_HEADER_CLASS = 'h-[var(--app-shell-header-height)] shrink-0'

function scrollToSection(sectionId: string) {
  document.getElementById(`section-${sectionId}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  })
}

function openSearch(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function openMenuEntry(entry: SearchableSiteMenuEntry) {
  const normalizedPath = entry.path.trim()

  if (entry.strict) {
    openSearch(buildStrictMenuLoginRedirectUrl(normalizedPath))
    return
  }

  if (isExternalLink(normalizedPath)) {
    openSearch(normalizedPath)
    return
  }

  toast.info(`入口 ${normalizedPath || entry.name} 暂未接入页面。`)
}

export function AppLayout() {
  const { resolvedTheme, setTheme } = useTheme()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [appIcon, setAppIcon] = useState('/public/icons/tools.png')
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light')
  const [directoryStatus, setDirectoryStatus] = useState<ToolDirectoryLoadStatus>('loading')
  const [directoryErrorMessage, setDirectoryErrorMessage] = useState('')
  const [rawMenuTree, setRawMenuTree] = useState<ToolDirectoryContextValue['menuTree']>([])
  const [toolStats, setToolStats] = useState(emptyToolStats)
  const [reloadSeed, setReloadSeed] = useState(0)
  const [searchPanelOpen, setSearchPanelOpen] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [hiddenMenuRevealActive, setHiddenMenuRevealActive] = useState(false)

  const deferredSearchKeyword = useDeferredValue(searchKeyword)
  const hiddenKeywordMatched = isHiddenMenuKeywordMatch(deferredSearchKeyword)

  const visibleMenuTree = useMemo(
    () => filterVisibleSiteMenuTree(rawMenuTree),
    [rawMenuTree],
  )

  const hiddenMenuEntries = useMemo(
    () => getHiddenSiteMenuEntries(rawMenuTree),
    [rawMenuTree],
  )

  const searchResults = useMemo(
    () =>
      resolveSiteMenuSearchResults(rawMenuTree, deferredSearchKeyword, {
        revealHiddenByKeyword: hiddenMenuRevealActive,
      }),
    [deferredSearchKeyword, hiddenMenuRevealActive, rawMenuTree],
  )

  useEffect(() => {
    if (resolvedTheme === 'dark' || resolvedTheme === 'light') {
      setThemeMode(resolvedTheme)
    }
  }, [resolvedTheme])

  useEffect(() => {
    if (searchPanelOpen) {
      searchInputRef.current?.focus()
    }
  }, [searchPanelOpen])

  useEffect(() => {
    if (!searchPanelOpen) {
      setHiddenMenuRevealActive(false)
    }
  }, [searchPanelOpen])

  useEffect(() => {
    if (!isHiddenMenuKeywordMatch(searchKeyword)) {
      setHiddenMenuRevealActive(false)
    }
  }, [searchKeyword])

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
        const [menuTree, menuConfig] = await Promise.all([
          getSiteMenuTree({
            forceRefresh: reloadSeed > 0,
          }),
          getSiteMenuConfig({
            forceRefresh: reloadSeed > 0,
          }),
        ])
        if (!active) {
          return
        }

        const normalizedMenuTree = normalizeSiteMenuTree(menuTree)
        const nextVisibleMenuTree = filterVisibleSiteMenuTree(normalizedMenuTree)
        setAppIcon(menuConfig.appIcon)
        setRawMenuTree(normalizedMenuTree)
        setToolStats(buildToolStats(nextVisibleMenuTree))
        setDirectoryStatus('success')
      } catch (error) {
        if (!active) {
          return
        }

        setRawMenuTree([])
        setAppIcon('/public/icons/tools.png')
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

  const clearSearch = () => {
    setHiddenMenuRevealActive(false)
    setSearchKeyword('')
    searchInputRef.current?.focus()
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return
    }

    if (!isHiddenMenuKeywordMatch(searchKeyword)) {
      return
    }

    event.preventDefault()
    setHiddenMenuRevealActive(true)
  }

  const outletContext: ToolDirectoryContextValue = {
    status: directoryStatus,
    menuTree: visibleMenuTree,
    stats: toolStats,
    errorMessage: directoryErrorMessage,
    reload: reloadDirectory,
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarHeader
          className={`${APP_SHELL_HEADER_CLASS} justify-center border-b border-sidebar-border/80 px-3 py-0`}
        >
          <div className="flex w-full items-center gap-3">
            <div className="flex size-11 items-center justify-center overflow-hidden rounded-xl border border-sidebar-border/80 bg-sidebar-accent/65 shadow-sm">
              <img
                src={resolveSiteMenuIcon(appIcon)}
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
                  {visibleMenuTree.map((section) => (
                    <SidebarMenuItem key={section.id}>
                      <SidebarMenuButton
                        tooltip={section.name}
                        className="h-10 rounded-xl"
                        onClick={() => scrollToSection(String(section.id))}
                      >
                        <img
                          src={resolveSiteMenuIcon(section.icon)}
                          alt=""
                          className="size-4 shrink-0 object-contain opacity-85"
                        />
                        <span>{section.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  {visibleMenuTree.length === 0 ? (
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

      <SidebarInset className="min-h-svh bg-transparent">
        <header
          className={`sticky top-0 z-30 ${APP_SHELL_HEADER_CLASS} border-b border-border/70 bg-background/92 backdrop-blur-md`}
        >
          <div className="flex h-full items-center gap-3 px-4 md:px-6">
            <SidebarTrigger />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">
                搜索与工具导航
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Popover open={searchPanelOpen} onOpenChange={setSearchPanelOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant={searchPanelOpen ? 'default' : 'outline'}
                    size="sm"
                    className="rounded-full px-2.5"
                  >
                    <SearchIcon data-icon="inline-start" />
                    <span className="sr-only">打开菜单搜索</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-[min(30rem,calc(100vw-1.5rem))] rounded-lg border border-border bg-popover p-4 shadow-lg"
                >
                  <div className="relative">
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={searchInputRef}
                      value={searchKeyword}
                      onChange={(event) => setSearchKeyword(event.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="搜索菜单名称、描述或路径"
                      className="h-11 rounded-lg border-border bg-background pl-9 pr-10"
                    />
                    {searchKeyword.trim() ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-full"
                        onClick={clearSearch}
                      >
                        <XIcon />
                        <span className="sr-only">清空搜索词</span>
                      </Button>
                    ) : null}
                  </div>

                  {deferredSearchKeyword.trim() ? (
                    <div className="mt-3 max-h-[24rem] overflow-y-auto">
                    {deferredSearchKeyword.trim() && searchResults.length === 0 ? (
                      <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                        没有匹配结果
                      </div>
                    ) : null}

                    {hiddenMenuRevealActive && hiddenKeywordMatched && hiddenMenuEntries.length > 0 ? (
                      <div className="px-3 pb-2 text-xs text-muted-foreground">
                        宸叉樉绀洪殣钘忚彍鍗?
                      </div>
                    ) : null}

                    {searchResults.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => openMenuEntry(entry)}
                        className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/50">
                          <img
                            src={resolveSiteMenuIcon(entry.icon)}
                            alt=""
                            className="size-4 object-contain"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-medium text-foreground">
                              {entry.name}
                            </span>
                            {entry.hide ? (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <EyeOffIcon className="size-3" />
                                隐藏
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            {entry.sectionName}
                          </div>
                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            {entry.path.trim() || '未配置路径'}
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {entry.remark || '暂无菜单说明'}
                          </div>
                        </div>
                      </button>
                    ))}
                    </div>
                  ) : null}
                </PopoverContent>
              </Popover>

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
