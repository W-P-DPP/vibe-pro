import type { Request, Response } from 'express';
import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import type { CreateTodoReq, UpdateTodoReq } from './todo.dto.ts';
import { TodoBusinessError, todoService } from './todo.service.ts';

const listTodos = async (req: Request, res: Response) => {
  try {
    const todos = await todoService.listTodos(req.jwtPayload);
    res.sendSuccess(todos, '获取列表成功');
  } catch (error) {
    if (error instanceof TodoBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }
    return res.status(HttpStatus.ERROR).sendFail('获取列表失败', HttpStatus.ERROR);
  }
};

const createTodo = async (req: Request, res: Response) => {
  try {
    const created = await todoService.createTodo(req.jwtPayload, req.body as CreateTodoReq);
    res.sendSuccess(created, '创建成功');
  } catch (error) {
    if (error instanceof TodoBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }
    return res.status(HttpStatus.ERROR).sendFail('创建失败', HttpStatus.ERROR);
  }
};

const updateTodo = async (req: Request, res: Response) => {
  try {
    const updated = await todoService.updateTodo(
      req.jwtPayload,
      Number(req.params.id),
      req.body as UpdateTodoReq,
    );
    res.sendSuccess(updated, '更新成功');
  } catch (error) {
    if (error instanceof TodoBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }
    return res.status(HttpStatus.ERROR).sendFail('更新失败', HttpStatus.ERROR);
  }
};

const toggleTodo = async (req: Request, res: Response) => {
  try {
    const toggled = await todoService.toggleTodo(req.jwtPayload, Number(req.params.id));
    res.sendSuccess(toggled, '切换状态成功');
  } catch (error) {
    if (error instanceof TodoBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }
    return res.status(HttpStatus.ERROR).sendFail('切换状态失败', HttpStatus.ERROR);
  }
};

const deleteTodo = async (req: Request, res: Response) => {
  try {
    const deleted = await todoService.deleteTodo(req.jwtPayload, Number(req.params.id));
    res.sendSuccess(deleted, '删除成功');
  } catch (error) {
    if (error instanceof TodoBusinessError) {
      return res.status(error.statusCode).sendFail(error.message, error.statusCode);
    }
    return res.status(HttpStatus.ERROR).sendFail('删除失败', HttpStatus.ERROR);
  }
};

export { createTodo, deleteTodo, listTodos, toggleTodo, updateTodo };
