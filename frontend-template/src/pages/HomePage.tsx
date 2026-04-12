import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  ArrowUpIcon,
  ArrowUpRightIcon,
  CircleAlertIcon,
  CornerDownLeftIcon,
  ExternalLinkIcon,
  LayoutGridIcon,
  RefreshCwIcon,
  SearchIcon,
} from 'lucide-react'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Input,
  Separator,
  Spinner,
  toast,
} from '@/components/ui'
import {
  getSiteMenuDescription,
  isExternalLink,
  resolveSiteMenuIcon,
  searchEngines,
  type ToolDirectoryContextValue,
} from '@/data/tool-directory'
import { resolveStrictMenuNavigationUrl } from '@/lib/strict-menu-redirect'

const compactSectionNames = new Set(['网址大全', 'git', '工具'])

function openSearch(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function openTool(path: string, fallbackName: string, strict = false) {
  const normalizedPath = path.trim()

  if (strict) {
    const targetUrl = resolveStrictMenuNavigationUrl(normalizedPath)

    if (targetUrl) {
      openSearch(targetUrl)
      return
    }

    return
  }

  if (isExternalLink(normalizedPath)) {
    openSearch(normalizedPath)
    return
  }

  toast.info(`入口 ${normalizedPath || fallbackName} 暂未接入页面。`)
}

function formatTarget(link: string) {
  const normalizedLink = link.trim()

  if (!normalizedLink) {
    return '未配置路径'
  }

  try {
    const url = new URL(normalizedLink)
    return url.hostname
  } catch {
    return normalizedLink
  }
}

export function HomePage() {
  const directory = useOutletContext<ToolDirectoryContextValue>()
  const [engineKey, setEngineKey] = useState<string>(searchEngines[0].key)
  const [query, setQuery] = useState('')
  const [showBackToTop, setShowBackToTop] = useState(false)

  const activeEngine = useMemo(
    () => searchEngines.find((engine) => engine.key === engineKey) ?? searchEngines[0],
    [engineKey],
  )

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 320)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleSubmitSearch = () => {
    const trimmed = query.trim()

    if (!trimmed) {
      toast.error('请输入搜索关键词。')
      return
    }

    openSearch(activeEngine.buildUrl(trimmed))
  }

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-6 md:py-6">
      <Card className="overflow-visible border-border/80 bg-card/95 shadow-sm">
        <CardContent className="space-y-4 px-4 py-4 md:px-5">
          <div className="flex flex-wrap gap-2">
            {searchEngines.map((engine) => (
              <Button
                key={engine.key}
                type="button"
                variant={engine.key === engineKey ? 'default' : 'outline'}
                size="sm"
                className="rounded-full px-3"
                onClick={() => setEngineKey(engine.key)}
              >
                {engine.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSubmitSearch()
                  }
                }}
                placeholder={`使用 ${activeEngine.label} 搜索关键词`}
                className="h-12 rounded-xl border-border/80 bg-background/70 pl-9 text-sm shadow-2xs"
              />
            </div>
            <Button
              type="button"
              size="lg"
              className="h-12 rounded-xl px-5 shadow-sm"
              onClick={handleSubmitSearch}
            >
              <SearchIcon data-icon="inline-start" />
              搜索
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CornerDownLeftIcon className="size-3.5" />
            回车可直接搜索
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {directory.status === 'loading' ? (
          <Card className="border-border/80 bg-card/95 shadow-sm">
            <CardContent className="flex min-h-40 items-center justify-center gap-3 px-5 py-8 text-sm text-muted-foreground">
              <Spinner className="size-5" />
              <span>正在同步后端目录，请稍候。</span>
            </CardContent>
          </Card>
        ) : null}

        {directory.status === 'error' ? (
          <Alert className="rounded-2xl border-border/80 bg-card/95 shadow-sm">
            <CircleAlertIcon className="size-4" />
            <AlertTitle>目录加载失败</AlertTitle>
            <AlertDescription>{directory.errorMessage}</AlertDescription>
            <AlertAction>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full px-3"
                onClick={directory.reload}
              >
                <RefreshCwIcon className="size-3.5" />
                重新加载
              </Button>
            </AlertAction>
          </Alert>
        ) : null}

        {directory.status === 'success' && directory.menuTree.length === 0 ? (
          <Card className="border-border/80 bg-card/95 shadow-sm">
            <CardContent className="px-5 py-8">
              <Empty className="border border-dashed border-border/80 bg-background/40">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <LayoutGridIcon className="size-4" />
                  </EmptyMedia>
                  <EmptyTitle>暂无目录数据</EmptyTitle>
                  <EmptyDescription>当前后端菜单尚未配置可展示入口。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        ) : null}

        {directory.status === 'success'
          ? directory.menuTree.map((section) => {
              const items =
                section.children.length > 0
                  ? section.children
                  : section.path.trim()
                    ? [{ ...section, children: [] }]
                    : []

              return (
                <section
                  key={String(section.id)}
                  id={`section-${String(section.id)}`}
                  className="scroll-mt-[var(--app-shell-section-scroll-offset)] rounded-2xl border border-border/80 bg-card/95 px-4 py-4 shadow-sm md:px-5"
                >
                  <div className="flex items-center justify-between gap-4 border-b border-border/70 pb-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-muted/50 shadow-2xs">
                        <img
                          src={resolveSiteMenuIcon(section.icon)}
                          alt=""
                          className="size-5 object-contain opacity-90"
                        />
                      </div>
                      <div className="min-w-0">
                        <h3
                          className={
                            compactSectionNames.has(section.name)
                              ? 'text-[0.98rem] leading-none font-semibold text-foreground'
                              : 'text-[1.05rem] leading-none font-semibold text-foreground'
                          }
                        >
                          {section.name}
                        </h3>
                        {section.remark?.trim() ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {section.remark.trim()}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="hidden items-center gap-2 sm:flex">
                      <LayoutGridIcon className="size-3.5 text-muted-foreground" />
                      <Badge variant="outline" className="rounded-full px-2 text-[11px]">
                        {items.length} 项
                      </Badge>
                    </div>
                  </div>

                  {items.length > 0 ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {items.map((item) => {
                        const itemPath = item.path.trim()
                        const itemSummary = getSiteMenuDescription(item.remark)

                        return (
                          <button
                            key={String(item.id)}
                            type="button"
                            onClick={() => openTool(itemPath, item.name, item.strict)}
                            className="group flex min-h-[9.25rem] flex-col rounded-xl border border-border/80 bg-background/65 p-4 text-left shadow-2xs transition-[border-color,box-shadow,background-color] duration-200 hover:border-primary/35 hover:bg-card hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                          >
                            <div className="flex gap-3">
                              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-card/80">
                                <img
                                  src={resolveSiteMenuIcon(item.icon)}
                                  alt=""
                                  className="size-6 object-contain"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-base font-semibold text-foreground">
                                      {item.name}
                                    </div>
                                    <div className="mt-2">
                                      <Badge
                                        variant={isExternalLink(itemPath) ? 'secondary' : 'outline'}
                                        className="rounded-full px-2 text-[11px]"
                                      >
                                        {isExternalLink(itemPath) ? '外部链接' : '站内路径'}
                                      </Badge>
                                    </div>
                                  </div>
                                  <ArrowUpRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
                                </div>
                                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                  {itemSummary}
                                </p>
                              </div>
                            </div>

                            <div className="mt-auto pt-4">
                              <Separator className="mb-3" />
                              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                                <span className="truncate">{formatTarget(itemPath)}</span>
                                <span className="inline-flex items-center gap-1">
                                  <ExternalLinkIcon className="size-3.5" />
                                  打开
                                </span>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="mt-4">
                      <Empty className="border border-dashed border-border/70 bg-background/35">
                        <EmptyContent>
                          <EmptyHeader>
                            <EmptyMedia variant="icon">
                              <LayoutGridIcon className="size-4" />
                            </EmptyMedia>
                            <EmptyTitle>该分组暂无入口</EmptyTitle>
                            <EmptyDescription>
                              当前分组还没有可展示的菜单项，后续可在后端补充。
                            </EmptyDescription>
                          </EmptyHeader>
                        </EmptyContent>
                      </Empty>
                    </div>
                  )}
                </section>
              )
            })
          : null}
      </div>

      {showBackToTop ? (
        <Button
          type="button"
          size="icon-lg"
          className="fixed right-5 bottom-5 z-30 rounded-full shadow-md md:right-8 md:bottom-8"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <ArrowUpIcon />
          <span className="sr-only">回到顶部</span>
        </Button>
      ) : null}
    </section>
  )
}
