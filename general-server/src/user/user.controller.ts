import type { Request, Response } from 'express';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import type {
  CreateUserRequestDto,
  UpdateUserRequestDto,
} from './user.dto.ts';
import { UserBusinessError, userService } from './user.service.ts';

const getUser = async (req: Request, res: Response) => {
  try {
    const users = await userService.getUserList();
    res.sendSuccess(users, '获取用户列表成功');
  } catch (error) {
    if (error instanceof UserBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取用户列表失败', HttpStatus.ERROR);
  }
};

const getUserDetail = async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserDetail(Number(req.params.id));
    res.sendSuccess(user, '获取用户详情成功');
  } catch (error) {
    if (error instanceof UserBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('获取用户详情失败', HttpStatus.ERROR);
  }
};

const createUser = async (req: Request, res: Response) => {
  try {
    const created = await userService.createUser(req.body as CreateUserRequestDto);
    res.sendSuccess(created, '新增用户成功');
  } catch (error) {
    if (error instanceof UserBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('新增用户失败', HttpStatus.ERROR);
  }
};

const updateUser = async (req: Request, res: Response) => {
  try {
    const updated = await userService.updateUser(
      Number(req.params.id),
      req.body as UpdateUserRequestDto,
    );
    res.sendSuccess(updated, '更新用户成功');
  } catch (error) {
    if (error instanceof UserBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('更新用户失败', HttpStatus.ERROR);
  }
};

const deleteUser = async (req: Request, res: Response) => {
  try {
    const deleted = await userService.deleteUser(Number(req.params.id));
    res.sendSuccess(deleted, '删除用户成功');
  } catch (error) {
    if (error instanceof UserBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }

    return res.status(HttpStatus.ERROR).sendFail('删除用户失败', HttpStatus.ERROR);
  }
};

export { createUser, deleteUser, getUser, getUserDetail, updateUser };
