import { RequestError, request } from '../request'

export interface SiteMenuResponseDto {
  id: number
  parentId: number | null
  name: string
  path: string
  icon: string
  strict: boolean
  hide: boolean
  isTop: boolean
  sort: number
  children: SiteMenuResponseDto[]
  createBy?: string
  createTime?: string
  updateBy?: string
  updateTime?: string
  remark: string
}

export interface SiteMenuConfigResponseDto {
  appIcon: string
}

interface ApiResponse<T> {
  code: number
  msg: string
  data: T
  timestamp: number
}

const DEFAULT_APP_ICON = '/public/icons/tools.png'

let cachedSiteMenuTree: SiteMenuResponseDto[] | null = null
let siteMenuTreeRequest: Promise<SiteMenuResponseDto[]> | null = null
let cachedSiteMenuConfig: SiteMenuConfigResponseDto | null = null
let siteMenuConfigRequest: Promise<SiteMenuConfigResponseDto> | null = null

async function fetchSiteMenuTree() {
  const response = await request.get<ApiResponse<SiteMenuResponseDto[]>>('/site-menu/getMenu', {
    requiresAuth: true,
  })

  if (response.code !== 200) {
    throw new RequestError(response.msg || '获取目录失败，请稍后重试。', {
      status: response.code,
      details: response,
    })
  }

  return response.data ?? []
}

async function fetchSiteMenuConfig() {
  const response = await request.get<ApiResponse<SiteMenuConfigResponseDto>>(
    '/site-menu/getMenuConfig',
    {
      requiresAuth: true,
    },
  )

  if (response.code !== 200) {
    throw new RequestError(response.msg || '获取菜单配置失败，请稍后重试。', {
      status: response.code,
      details: response,
    })
  }

  return response.data ?? { appIcon: DEFAULT_APP_ICON }
}

export async function getSiteMenuTree(options?: { forceRefresh?: boolean }) {
  const forceRefresh = options?.forceRefresh ?? false

  if (forceRefresh) {
    cachedSiteMenuTree = null
    siteMenuTreeRequest = null
  }

  if (cachedSiteMenuTree) {
    return cachedSiteMenuTree
  }

  if (!siteMenuTreeRequest) {
    siteMenuTreeRequest = fetchSiteMenuTree()
      .then((data) => {
        cachedSiteMenuTree = data
        return data
      })
      .finally(() => {
        siteMenuTreeRequest = null
      })
  }

  return siteMenuTreeRequest
}

export async function getSiteMenuConfig(options?: { forceRefresh?: boolean }) {
  const forceRefresh = options?.forceRefresh ?? false

  if (forceRefresh) {
    cachedSiteMenuConfig = null
    siteMenuConfigRequest = null
  }

  if (cachedSiteMenuConfig) {
    return cachedSiteMenuConfig
  }

  if (!siteMenuConfigRequest) {
    siteMenuConfigRequest = fetchSiteMenuConfig()
      .then((data) => {
        cachedSiteMenuConfig = data
        return data
      })
      .finally(() => {
        siteMenuConfigRequest = null
      })
  }

  return siteMenuConfigRequest
}
