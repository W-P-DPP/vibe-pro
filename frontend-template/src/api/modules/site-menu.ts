import { RequestError, request } from '../request'

export interface SiteMenuResponseDto {
  id: number
  parentId: number | null
  name: string
  path: string
  icon: string
  isTop: boolean
  sort: number
  children: SiteMenuResponseDto[]
  createBy?: string
  createTime?: string
  updateBy?: string
  updateTime?: string
  remark?: string
}

interface ApiResponse<T> {
  code: number
  msg: string
  data: T
  timestamp: number
}

let cachedSiteMenuTree: SiteMenuResponseDto[] | null = null
let siteMenuTreeRequest: Promise<SiteMenuResponseDto[]> | null = null

async function fetchSiteMenuTree() {
  const response = await request.get<ApiResponse<SiteMenuResponseDto[]>>('/site-menu/getMenu')

  if (response.code !== 200) {
    throw new RequestError(response.msg || '获取目录失败，请稍后重试。', {
      status: response.code,
      details: response,
    })
  }

  return response.data ?? []
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
