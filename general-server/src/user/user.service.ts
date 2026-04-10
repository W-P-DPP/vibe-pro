import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import type {
  CreateUserRequestDto,
  UpdateUserRequestDto,
  UserListDto,
  UserResponseDto,
  UserValidationErrorContextDto,
} from './user.dto.ts';
import { type UserEntity } from './user.entity.ts';
import {
  userRepository,
  type UserRepositoryPort,
} from './user.repository.ts';

export class UserBusinessError extends Error {
  constructor(
    message: string,
    public readonly context: UserValidationErrorContextDto,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'UserBusinessError';
  }
}

function ensurePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new UserBusinessError('用户标识不合法', {
      nodePath: 'user',
      field,
      reason: '用户标识必须为正整数',
      value,
    }, HttpStatus.BAD_REQUEST);
  }

  return value;
}

function ensureString(value: unknown, field: string, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new UserBusinessError(`${label}不能为空`, {
      nodePath: 'user',
      field,
      reason: `${label}必须是非空字符串`,
      value,
    }, HttpStatus.BAD_REQUEST);
  }

  return value.trim();
}

function normalizeOptionalString(value: unknown, field: string, label: string): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new UserBusinessError(`${label}必须是字符串`, {
      nodePath: 'user',
      field,
      reason: `${label}必须是字符串`,
      value,
    }, HttpStatus.BAD_REQUEST);
  }

  return value.trim();
}

function normalizeStatus(value: unknown): number {
  if (value === undefined) {
    return 1;
  }

  if (value !== 0 && value !== 1) {
    throw new UserBusinessError('用户状态不合法', {
      nodePath: 'user',
      field: 'status',
      reason: '用户状态只能为0或1',
      value,
    }, HttpStatus.BAD_REQUEST);
  }

  return value;
}

function normalizeOptionalStatus(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return normalizeStatus(value);
}

function normalizeDateTime(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return undefined;
}

function toResponseDto(entity: UserEntity): UserResponseDto {
  return {
    id: entity.id,
    username: entity.username,
    nickname: entity.nickname,
    email: entity.email,
    phone: entity.phone,
    status: entity.status,
    ...(entity.createBy ? { createBy: entity.createBy } : {}),
    ...(normalizeDateTime(entity.createTime) ? { createTime: normalizeDateTime(entity.createTime) } : {}),
    ...(entity.updateBy ? { updateBy: entity.updateBy } : {}),
    ...(normalizeDateTime(entity.updateTime) ? { updateTime: normalizeDateTime(entity.updateTime) } : {}),
    ...(entity.remark ? { remark: entity.remark } : {}),
  };
}

function validateCreateInput(input: Record<string, unknown>): CreateUserRequestDto {
  const payload: CreateUserRequestDto = {
    username: ensureString(input.username, 'username', '用户名'),
    nickname: ensureString(input.nickname, 'nickname', '用户昵称'),
    email: normalizeOptionalString(input.email, 'email', '用户邮箱'),
    phone: normalizeOptionalString(input.phone, 'phone', '用户手机号'),
    status: normalizeStatus(input.status),
  };

  if (typeof input.remark === 'string') {
    payload.remark = input.remark.trim();
  } else if (input.remark !== undefined && input.remark !== null) {
    throw new UserBusinessError('用户备注必须是字符串', {
      nodePath: 'user',
      field: 'remark',
      reason: '用户备注必须是字符串',
      value: input.remark,
    }, HttpStatus.BAD_REQUEST);
  }

  return payload;
}

function validateUpdateInput(input: Record<string, unknown>): UpdateUserRequestDto {
  const payload: UpdateUserRequestDto = {};

  if (Object.prototype.hasOwnProperty.call(input, 'username') && input.username !== undefined) {
    payload.username = ensureString(input.username, 'username', '用户名');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'nickname') && input.nickname !== undefined) {
    payload.nickname = ensureString(input.nickname, 'nickname', '用户昵称');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'email') && input.email !== undefined) {
    payload.email = normalizeOptionalString(input.email, 'email', '用户邮箱');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'phone') && input.phone !== undefined) {
    payload.phone = normalizeOptionalString(input.phone, 'phone', '用户手机号');
  }

  if (Object.prototype.hasOwnProperty.call(input, 'status')) {
    const status = normalizeOptionalStatus(input.status);
    if (status !== undefined) {
      payload.status = status;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'remark')) {
    if (input.remark === undefined || input.remark === null) {
      payload.remark = '';
    } else if (typeof input.remark === 'string') {
      payload.remark = input.remark.trim();
    } else {
      throw new UserBusinessError('用户备注必须是字符串', {
        nodePath: 'user',
        field: 'remark',
        reason: '用户备注必须是字符串',
        value: input.remark,
      }, HttpStatus.BAD_REQUEST);
    }
  }

  if (Object.keys(payload).length === 0) {
    throw new UserBusinessError('更新用户参数不能为空', {
      nodePath: 'user',
      field: 'payload',
      reason: '至少需要提供一个可更新字段',
    }, HttpStatus.BAD_REQUEST);
  }

  return payload;
}

export class UserService {
  constructor(private readonly repository: UserRepositoryPort = userRepository) {}

  async getUserList(): Promise<UserListDto> {
    try {
      const entities = await this.repository.getUserList();
      return entities.map(toResponseDto);
    } catch (error) {
      if (error instanceof UserBusinessError) {
        throw error;
      }

      throw new UserBusinessError('读取用户列表失败', {
        nodePath: 'user',
        field: 'source',
        reason: '用户数据源读取失败',
      }, HttpStatus.ERROR);
    }
  }

  async getUserDetail(id: number): Promise<UserResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id');
    const entity = await this.repository.getUserById(targetId);

    if (!entity) {
      throw new UserBusinessError('用户不存在', {
        nodePath: 'user',
        field: 'id',
        reason: '未找到对应用户',
        value: id,
      }, HttpStatus.NOT_FOUND);
    }

    return toResponseDto(entity);
  }

  async createUser(input: CreateUserRequestDto | Record<string, unknown>): Promise<UserResponseDto> {
    const payload = validateCreateInput(input as Record<string, unknown>);
    const existed = await this.repository.getUserByUsername(payload.username);

    if (existed) {
      throw new UserBusinessError('用户名已存在', {
        nodePath: 'user',
        field: 'username',
        reason: '用户名不能重复',
        value: payload.username,
      }, HttpStatus.CONFLICT);
    }

    const created = await this.repository.createUser({
      username: payload.username,
      nickname: payload.nickname,
      email: payload.email ?? '',
      phone: payload.phone ?? '',
      status: payload.status ?? 1,
      ...(payload.remark !== undefined ? { remark: payload.remark } : {}),
    });

    if (!created) {
      throw new UserBusinessError('新增用户失败', {
        nodePath: 'user',
        field: 'create',
        reason: '用户创建失败',
      }, HttpStatus.ERROR);
    }

    return toResponseDto(created);
  }

  async updateUser(
    id: number,
    input: UpdateUserRequestDto | Record<string, unknown>,
  ): Promise<UserResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id');
    const current = await this.repository.getUserById(targetId);

    if (!current) {
      throw new UserBusinessError('用户不存在', {
        nodePath: 'user',
        field: 'id',
        reason: '未找到对应用户',
        value: id,
      }, HttpStatus.NOT_FOUND);
    }

    const payload = validateUpdateInput(input as Record<string, unknown>);
    if (payload.username && payload.username !== current.username) {
      const existed = await this.repository.getUserByUsername(payload.username);
      if (existed && existed.id !== targetId) {
        throw new UserBusinessError('用户名已存在', {
          nodePath: 'user',
          field: 'username',
          reason: '用户名不能重复',
          value: payload.username,
        }, HttpStatus.CONFLICT);
      }
    }

    const updated = await this.repository.updateUser(targetId, payload);
    if (!updated) {
      throw new UserBusinessError('更新用户失败', {
        nodePath: 'user',
        field: 'update',
        reason: '用户更新失败',
        value: id,
      }, HttpStatus.ERROR);
    }

    return toResponseDto(updated);
  }

  async deleteUser(id: number): Promise<UserResponseDto> {
    const targetId = ensurePositiveInteger(id, 'id');
    const deleted = await this.repository.deleteUser(targetId);

    if (!deleted) {
      throw new UserBusinessError('用户不存在', {
        nodePath: 'user',
        field: 'id',
        reason: '未找到对应用户',
        value: id,
      }, HttpStatus.NOT_FOUND);
    }

    return toResponseDto(deleted);
  }
}

export const userService = new UserService();
