import type { SiteMenuResponseDto } from '@/api/modules/site-menu'

const DEFAULT_SITE_MENU_ICON = '/icons/tool.svg'
const DEFAULT_HIDDEN_MENU_KEYWORD = 'dpp'

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

export type SearchableSiteMenuEntry = {
  id: number
  sectionId: number
  sectionName: string
  name: string
  path: string
  icon: string
  strict: boolean
  hide: boolean
  remark: string
}

export function isExternalLink(path: string) {
  return path.startsWith('http://') || path.startsWith('https://')
}

export function resolveSiteMenuIcon(icon: string | undefined) {
  const normalizedIcon = icon?.trim() ?? ''

  if (!normalizedIcon || normalizedIcon === 'icon-path') {
    return DEFAULT_SITE_MENU_ICON
  }

  if (isExternalLink(normalizedIcon) || normalizedIcon.startsWith('/')) {
    return normalizedIcon
  }

  return `/${normalizedIcon}`
}

function sortSiteMenuNodes(nodes: SiteMenuResponseDto[]) {
  return [...nodes].sort((left, right) => left.sort - right.sort || left.id - right.id)
}

function normalizeSearchText(value: string | undefined) {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, '')
}

function shouldKeepVisibleNode(node: SiteMenuResponseDto) {
  if (node.hide) {
    return false
  }

  return node.children.length > 0 || Boolean(node.path.trim())
}

export function normalizeSiteMenuRemark(remark: string | undefined) {
  return remark?.trim() ?? ''
}

export function normalizeSiteMenuTree(nodes: SiteMenuResponseDto[]): SiteMenuResponseDto[] {
  return sortSiteMenuNodes(nodes).map((node) => ({
    ...node,
    strict: Boolean(node.strict),
    hide: Boolean(node.hide),
    remark: normalizeSiteMenuRemark(node.remark),
    children: normalizeSiteMenuTree(node.children),
  }))
}

export function filterVisibleSiteMenuTree(nodes: SiteMenuResponseDto[]): SiteMenuResponseDto[] {
  return normalizeSiteMenuTree(nodes)
    .map((node) => ({
      ...node,
      children: filterVisibleSiteMenuTree(node.children),
    }))
    .filter(shouldKeepVisibleNode)
}

export function getSiteMenuDescription(remark: string | undefined) {
  const normalizedRemark = normalizeSiteMenuRemark(remark)
  return normalizedRemark || '暂无菜单说明'
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

export function buildSearchableSiteMenuEntries(
  nodes: SiteMenuResponseDto[],
): SearchableSiteMenuEntry[] {
  return normalizeSiteMenuTree(nodes).flatMap((section) => {
    const leafEntries =
      section.children.length > 0
        ? section.children
        : section.path.trim()
          ? [{ ...section, children: [] }]
          : []

    return leafEntries.map((entry) => ({
      id: entry.id,
      sectionId: section.id,
      sectionName: section.name,
      name: entry.name,
      path: entry.path,
      icon: entry.icon,
      strict: entry.strict,
      hide: entry.hide,
      remark: normalizeSiteMenuRemark(entry.remark),
    }))
  })
}

export function getHiddenMenuKeyword() {
  const configured = import.meta.env.VITE_SITE_MENU_HIDDEN_KEYWORD?.trim()
  return configured || DEFAULT_HIDDEN_MENU_KEYWORD
}

export function isHiddenMenuKeywordMatch(keyword: string) {
  return normalizeSearchText(keyword) === normalizeSearchText(getHiddenMenuKeyword())
}

export function searchSiteMenuEntries(
  nodes: SiteMenuResponseDto[],
  keyword: string,
  options?: { includeHidden?: boolean },
) {
  const normalizedKeyword = normalizeSearchText(keyword)
  if (!normalizedKeyword) {
    return []
  }

  const includeHidden = options?.includeHidden ?? false

  return buildSearchableSiteMenuEntries(nodes).filter((entry) => {
    if (entry.hide && !includeHidden) {
      return false
    }

    const haystack = normalizeSearchText(
      [entry.sectionName, entry.name, entry.remark, entry.path].join(' '),
    )

    return haystack.includes(normalizedKeyword)
  })
}

export function getHiddenSiteMenuEntries(nodes: SiteMenuResponseDto[]) {
  return buildSearchableSiteMenuEntries(nodes).filter((entry) => entry.hide)
}

export function resolveSiteMenuSearchResults(
  nodes: SiteMenuResponseDto[],
  keyword: string,
  options?: { revealHiddenByKeyword?: boolean },
) {
  if (!keyword.trim()) {
    return []
  }

  if (options?.revealHiddenByKeyword && isHiddenMenuKeywordMatch(keyword)) {
    return getHiddenSiteMenuEntries(nodes)
  }

  return searchSiteMenuEntries(nodes, keyword)
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
