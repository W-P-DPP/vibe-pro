export interface UserResponseDto {
  id: number
  username: string
  nickname: string
  email: string
  phone: string
  status: number
  createBy?: string
  createTime?: string
  updateBy?: string
  updateTime?: string
  remark?: string
}

export type UserListDto = UserResponseDto[]

export interface UserValidationErrorContextDto {
  nodePath: string
  field: string
  reason: string
  value?: unknown
}

export interface UserIdParamsDto {
  id: number
}

export interface CreateUserRequestDto {
  username: string
  nickname: string
  email?: string
  phone?: string
  status?: number
  remark?: string
}

export interface UpdateUserRequestDto {
  username?: string
  nickname?: string
  email?: string
  phone?: string
  status?: number
  remark?: string
}
