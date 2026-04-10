export interface RawSiteMenuNodeDto {
  id?: unknown
  parentId?: unknown
  name?: unknown
  path?: unknown
  icon?: unknown
  isTop?: unknown
  sort?: unknown
  children?: unknown
  createBy?: unknown
  createTime?: unknown
  updateBy?: unknown
  updateTime?: unknown
  remark?: unknown
}

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

export type SiteMenuListDto = SiteMenuResponseDto[]
export type SiteMenuImportSourceDto = RawSiteMenuNodeDto[]

export interface SiteMenuValidationErrorContextDto {
  nodePath: string
  field: string
  reason: string
  value?: unknown
}

export interface SiteMenuIdParamsDto {
  id: number
}

export interface CreateSiteMenuRequestDto {
  parentId: number | null
  name: string
  path: string
  icon: string
  isTop?: boolean
  sort?: number
  remark?: string
}

export interface UpdateSiteMenuRequestDto {
  parentId?: number | null
  name?: string
  path?: string
  icon?: string
  isTop?: boolean
  sort?: number
  remark?: string
}

export interface UploadedSiteMenuFileDto {
  originalname: string
  mimetype?: string
  buffer: Buffer
  size: number
}
