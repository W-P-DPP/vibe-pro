import type { Request } from 'express';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';

export type CurrentUserRole = 'admin' | 'employee' | 'approver' | 'guest';

export interface CurrentUserDto {
  userId: number;
  username: string;
  role: CurrentUserRole;
}

export class AuthBusinessError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = HttpStatus.UNAUTHORIZED,
  ) {
    super(message);
    this.name = 'AuthBusinessError';
  }
}

function normalizeRole(value: unknown): CurrentUserRole {
  if (value === 'admin' || value === 'employee' || value === 'approver' || value === 'guest') {
    return value;
  }

  return 'guest';
}

export function resolveCurrentUser(req: Request): CurrentUserDto {
  const rawUserId = req.jwtPayload?.userId;
  const userId =
    typeof rawUserId === 'number'
      ? rawUserId
      : typeof rawUserId === 'string'
        ? Number(rawUserId)
        : NaN;

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new AuthBusinessError('当前登录状态无效');
  }

  const rawUsername = req.jwtPayload?.username;

  return {
    userId,
    username:
      typeof rawUsername === 'string' && rawUsername.trim()
        ? rawUsername.trim()
        : `user-${userId}`,
    role: normalizeRole(req.jwtPayload?.role),
  };
}
