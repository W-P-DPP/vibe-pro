import { describe, expect, it, vi } from 'vitest'
import {
  buildSearchableSiteMenuEntries,
  filterVisibleSiteMenuTree,
  getSiteMenuDescription,
  isHiddenMenuKeywordMatch,
  normalizeSiteMenuTree,
  resolveSiteMenuIcon,
  searchSiteMenuEntries,
} from './tool-directory'

const menuTreeFixture = [
  {
    id: 1,
    parentId: null,
    name: '工具',
    path: '/tool',
    icon: '/icons/tool.svg',
    strict: false,
    hide: false,
    isTop: false,
    sort: 0,
    remark: '  工具分组  ',
    children: [
      {
        id: 11,
        parentId: 1,
        name: 'JSON解析',
        path: 'https://www.json.cn/',
        icon: '/icons/json.ico',
        strict: true,
        hide: false,
        isTop: false,
        sort: 0,
        remark: '  用于在线解析 JSON 文本  ',
        children: [],
      },
      {
        id: 12,
        parentId: 1,
        name: '调试面板',
        path: '/debug-panel',
        icon: '/icons/debug.svg',
        strict: false,
        hide: true,
        isTop: false,
        sort: 1,
        remark: '  隐藏调试入口  ',
        children: [],
      },
    ],
  },
  {
    id: 2,
    parentId: null,
    name: '隐藏应用',
    path: '/secret-app',
    icon: '/icons/secret.svg',
    strict: false,
    hide: true,
    isTop: false,
    sort: 1,
    remark: '  隐藏应用入口  ',
    children: [],
  },
]

describe('tool-directory', () => {
  it('优先使用菜单备注作为描述文案', () => {
    expect(getSiteMenuDescription('  用于在线解析 JSON 文本  ')).toBe('用于在线解析 JSON 文本')
  })

  it('菜单未配置备注时返回中文占位说明', () => {
    expect(getSiteMenuDescription('')).toBe('暂无菜单说明')
    expect(getSiteMenuDescription(undefined)).toBe('暂无菜单说明')
  })

  it('标准化菜单树时保留 strict 与 hide 并裁剪 remark', () => {
    const normalizedTree = normalizeSiteMenuTree(menuTreeFixture)

    expect(normalizedTree).toEqual([
      expect.objectContaining({
        id: 1,
        strict: false,
        hide: false,
        remark: '工具分组',
        children: [
          expect.objectContaining({
            id: 11,
            strict: true,
            hide: false,
            remark: '用于在线解析 JSON 文本',
          }),
          expect.objectContaining({
            id: 12,
            strict: false,
            hide: true,
            remark: '隐藏调试入口',
          }),
        ],
      }),
      expect.objectContaining({
        id: 2,
        hide: true,
        remark: '隐藏应用入口',
      }),
    ])
  })

  it('默认只保留可见菜单树', () => {
    const visibleTree = filterVisibleSiteMenuTree(menuTreeFixture)

    expect(visibleTree).toEqual([
      expect.objectContaining({
        id: 1,
        hide: false,
        children: [
          expect.objectContaining({
            id: 11,
            hide: false,
          }),
        ],
      }),
    ])

    expect(visibleTree[0]?.children).toHaveLength(1)
  })

  it('会构建可搜索的可操作菜单项列表', () => {
    const entries = buildSearchableSiteMenuEntries(menuTreeFixture)

    expect(entries).toEqual([
      expect.objectContaining({
        id: 11,
        sectionId: 1,
        sectionName: '工具',
        name: 'JSON解析',
        strict: true,
        hide: false,
      }),
      expect.objectContaining({
        id: 12,
        sectionId: 1,
        sectionName: '工具',
        name: '调试面板',
        hide: true,
      }),
      expect.objectContaining({
        id: 2,
        sectionId: 2,
        sectionName: '隐藏应用',
        name: '隐藏应用',
        hide: true,
      }),
    ])
  })

  it('搜索默认排除 hide=true 的菜单，但允许显式包含', () => {
    expect(searchSiteMenuEntries(menuTreeFixture, 'json')).toEqual([
      expect.objectContaining({
        id: 11,
        name: 'JSON解析',
      }),
    ])

    expect(searchSiteMenuEntries(menuTreeFixture, '调试')).toEqual([])

    expect(searchSiteMenuEntries(menuTreeFixture, '调试', { includeHidden: true })).toEqual([
      expect.objectContaining({
        id: 12,
        name: '调试面板',
        hide: true,
      }),
    ])
  })

  it('支持通过分组名、备注和路径进行前端模糊查询', () => {
    expect(searchSiteMenuEntries(menuTreeFixture, '工具')).toEqual([
      expect.objectContaining({ id: 11 }),
    ])

    expect(searchSiteMenuEntries(menuTreeFixture, '在线解析')).toEqual([
      expect.objectContaining({ id: 11 }),
    ])

    expect(searchSiteMenuEntries(menuTreeFixture, 'json.cn')).toEqual([
      expect.objectContaining({ id: 11 }),
    ])
  })

  it('彩蛋口令按环境变量精确匹配，默认值为 dpp', () => {
    vi.stubEnv('VITE_SITE_MENU_HIDDEN_KEYWORD', 'dpp')
    expect(isHiddenMenuKeywordMatch('dpp')).toBe(true)
    expect(isHiddenMenuKeywordMatch(' dPp ')).toBe(true)
    expect(isHiddenMenuKeywordMatch('dpp-debug')).toBe(false)

    vi.stubEnv('VITE_SITE_MENU_HIDDEN_KEYWORD', 'secret')
    expect(isHiddenMenuKeywordMatch('secret')).toBe(true)
    expect(isHiddenMenuKeywordMatch(' SECRET ')).toBe(true)
    expect(isHiddenMenuKeywordMatch('secret-panel')).toBe(false)

    vi.unstubAllEnvs()
  })

  it('直接使用后端返回的根路径图标地址', () => {
    expect(resolveSiteMenuIcon('/icons/tool.svg')).toBe('/icons/tool.svg')
  })

  it('把相对路径图标规范化为根路径', () => {
    expect(resolveSiteMenuIcon('icons/pin.svg')).toBe('/icons/pin.svg')
  })

  it('直接使用后端或 CDN 返回的完整地址', () => {
    expect(resolveSiteMenuIcon('https://cdn.example.com/icons/json.ico')).toBe(
      'https://cdn.example.com/icons/json.ico',
    )
  })

  it('空图标或占位值使用统一兜底图标', () => {
    expect(resolveSiteMenuIcon('')).toBe('/icons/tool.svg')
    expect(resolveSiteMenuIcon('   ')).toBe('/icons/tool.svg')
    expect(resolveSiteMenuIcon('icon-path')).toBe('/icons/tool.svg')
    expect(resolveSiteMenuIcon(undefined)).toBe('/icons/tool.svg')
  })
})
