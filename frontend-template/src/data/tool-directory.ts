import type { SiteMenuResponseDto } from '@/api/modules/site-menu'

export type ToolStats = {
  sectionCount: number
  itemCount: number
}

export type ToolDirectoryLoadStatus = 'loading' | 'success' | 'error'

export type ToolDirectoryContextValue = {
  status: ToolDirectoryLoadStatus
  menuTree: SiteMenuResponseDto[]
  stats: ToolStats
  errorMessage: string
  reload: () => void
}

export function toPublicIcon(icon: string | undefined, fallback = '/site-icons/tool.svg') {
  if (!icon || icon === 'icon-path') {
    return fallback
  }

  const fileName = icon.split('/').filter(Boolean).at(-1)
  return fileName ? `/site-icons/${fileName}` : fallback
}

function sortSiteMenuNodes(nodes: SiteMenuResponseDto[]) {
  return [...nodes].sort((left, right) => left.sort - right.sort || left.id - right.id)
}

export function isExternalLink(path: string) {
  return path.startsWith('http://') || path.startsWith('https://')
}

export function normalizeSiteMenuTree(nodes: SiteMenuResponseDto[]): SiteMenuResponseDto[] {
  return sortSiteMenuNodes(nodes).map((node) => ({
    ...node,
    children: normalizeSiteMenuTree(node.children),
  }))
}

export function buildToolStats(nodes: SiteMenuResponseDto[]): ToolStats {
  const normalizedNodes = normalizeSiteMenuTree(nodes)

  return {
    sectionCount: normalizedNodes.length,
    itemCount: normalizedNodes.reduce(
      (count, section) => count + (section.children.length > 0 ? section.children.length : 1),
      0,
    ),
  }
}

export const emptyToolStats: ToolStats = {
  sectionCount: 0,
  itemCount: 0,
}

export const searchEngines = [
  {
    key: 'baidu',
    label: '百度',
    buildUrl: (query: string) => `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`,
  },
  {
    key: 'google',
    label: 'Google',
    buildUrl: (query: string) =>
      `https://www.google.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    key: 'bing',
    label: 'Bing',
    buildUrl: (query: string) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
  },
  {
    key: 'so360',
    label: '360',
    buildUrl: (query: string) => `https://www.so.com/s?q=${encodeURIComponent(query)}`,
  },
  {
    key: 'sogou',
    label: '搜狗',
    buildUrl: (query: string) =>
      `https://www.sogou.com/web?query=${encodeURIComponent(query)}`,
  },
] as const
