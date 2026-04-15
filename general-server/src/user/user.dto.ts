export enum UserRoleEnum {
  Admin = 'admin',
  Employee = 'employee',
  Approver = 'approver',
  Guest = 'guest',
}

export interface UserResponseDto {
  id: number
  username: string
  nickname: string
  email: string
  phone: string
  status: number
  role: UserRoleEnum
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
  role?: UserRoleEnum
  remark?: string
  password?: string
}

export interface UpdateUserRequestDto {
  username?: string
  nickname?: string
  email?: string
  phone?: string
  status?: number
  role?: UserRoleEnum
  remark?: string
}

export interface LoginUserRequestDto {
  username: string
  passwordCiphertext: string
}

export interface RegisterUserRequestDto {
  username: string
  password: string
}

export interface GetLoginPublicKeyResponseDto {
  publicKey: string
}

export interface LoginUserResponseDto {
  token: string
  tokenType: 'Bearer'
  expiresIn: number
}
