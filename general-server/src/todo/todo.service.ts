import { HttpStatus } from '../../utils/constant/HttpStatus.ts';
import type {
  CreateTodoReq,
  TodoListResp,
  TodoResp,
  TodoValidationErrorContextDto,
  UpdateTodoReq,
} from './todo.dto.ts';
import type { TodoEntity } from './todo.entity.ts';
import {
  todoRepository,
  type TodoRepositoryPort,
} from './todo.repository.ts';

export class TodoBusinessError extends Error {
  constructor(
    message: string,
    public readonly context: TodoValidationErrorContextDto,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'TodoBusinessError';
  }
}

function ensurePositiveInteger(value: number, field: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new TodoBusinessError(
      'Todo 标识不合法',
      { nodePath: 'todo', field, reason: '标识必须为正整数', value },
      HttpStatus.BAD_REQUEST,
    );
  }
  return value;
}

function validateTitle(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new TodoBusinessError(
      '标题不能为空',
      { nodePath: 'todo', field: 'title', reason: '标题必须是非空字符串', value },
      HttpStatus.BAD_REQUEST,
    );
  }

  const trimmed = value.trim();
  if (trimmed.length > 255) {
    throw new TodoBusinessError(
      '标题长度不能超过 255 个字符',
      { nodePath: 'todo', field: 'title', reason: '标题过长', value: trimmed.length },
      HttpStatus.BAD_REQUEST,
    );
  }

  return trimmed;
}

function normalizeDescription(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value !== 'string') {
    throw new TodoBusinessError(
      '描述必须是字符串',
      { nodePath: 'todo', field: 'description', reason: '描述必须是字符串', value },
      HttpStatus.BAD_REQUEST,
    );
  }
  return value.trim();
}

function normalizeDateTime(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return undefined;
}

function toResponseDto(entity: TodoEntity): TodoResp {
  return {
    id: entity.id,
    title: entity.title,
    description: entity.description,
    completed: entity.completed ? 1 : 0,
    createTime: normalizeDateTime(entity.createTime),
    updateTime: normalizeDateTime(entity.updateTime),
  };
}

function ensureOwnership(entity: TodoEntity | null, username: string): TodoEntity {
  if (!entity) {
    throw new TodoBusinessError(
      'Todo 不存在',
      { nodePath: 'todo', field: 'id', reason: '未找到对应 Todo' },
      HttpStatus.NOT_FOUND,
    );
  }

  if (entity.createBy !== username) {
    throw new TodoBusinessError(
      '无权操作此 Todo',
      { nodePath: 'todo', field: 'createBy', reason: '数据不属于当前用户' },
      HttpStatus.FORBIDDEN,
    );
  }

  return entity;
}

function extractUsername(reqJwtPayload: { username?: string } | undefined): string {
  const username = reqJwtPayload?.username;
  if (!username) {
    throw new TodoBusinessError(
      '用户信息缺失',
      { nodePath: 'todo', field: 'username', reason: '无法获取当前用户标识' },
      HttpStatus.UNAUTHORIZED,
    );
  }
  return username;
}

export class TodoService {
  constructor(private readonly repository: TodoRepositoryPort = todoRepository) {}

  async listTodos(jwtPayload: { username?: string }): Promise<TodoListResp> {
    const username = extractUsername(jwtPayload);
    const entities = await this.repository.findByCreateBy(username);
    return entities.map(toResponseDto);
  }

  async createTodo(
    jwtPayload: { username?: string },
    input: CreateTodoReq | Record<string, unknown>,
  ): Promise<TodoResp> {
    const username = extractUsername(jwtPayload);
    const raw = input as Record<string, unknown>;
    const title = validateTitle(raw.title);
    const description = normalizeDescription(raw.description);

    const created = await this.repository.create({
      title,
      description,
      createBy: username,
      updateBy: username,
    });

    if (!created) {
      throw new TodoBusinessError(
        '创建 Todo 失败',
        { nodePath: 'todo', field: 'create', reason: '创建失败' },
        HttpStatus.ERROR,
      );
    }

    return toResponseDto(created);
  }

  async updateTodo(
    jwtPayload: { username?: string },
    id: number,
    input: UpdateTodoReq | Record<string, unknown>,
  ): Promise<TodoResp> {
    const username = extractUsername(jwtPayload);
    const targetId = ensurePositiveInteger(id, 'id');
    const entity = await this.repository.findById(targetId);
    ensureOwnership(entity, username);

    const raw = input as Record<string, unknown>;
    const updateData: { title?: string; description?: string; updateBy: string } = {
      updateBy: username,
    };

    if (Object.prototype.hasOwnProperty.call(raw, 'title') && raw.title !== undefined) {
      updateData.title = validateTitle(raw.title);
    }
    if (Object.prototype.hasOwnProperty.call(raw, 'description') && raw.description !== undefined) {
      updateData.description = normalizeDescription(raw.description);
    }

    const updated = await this.repository.update(targetId, updateData);
    if (!updated) {
      throw new TodoBusinessError(
        '更新 Todo 失败',
        { nodePath: 'todo', field: 'update', reason: '更新失败', value: id },
        HttpStatus.ERROR,
      );
    }

    return toResponseDto(updated);
  }

  async toggleTodo(
    jwtPayload: { username?: string },
    id: number,
  ): Promise<TodoResp> {
    const username = extractUsername(jwtPayload);
    const targetId = ensurePositiveInteger(id, 'id');
    const entity = await this.repository.findById(targetId);
    ensureOwnership(entity, username);

    const toggled = await this.repository.toggle(targetId, username);
    if (!toggled) {
      throw new TodoBusinessError(
        '切换状态失败',
        { nodePath: 'todo', field: 'toggle', reason: '状态切换失败' },
        HttpStatus.ERROR,
      );
    }

    return toResponseDto(toggled);
  }

  async deleteTodo(
    jwtPayload: { username?: string },
    id: number,
  ): Promise<TodoResp> {
    const username = extractUsername(jwtPayload);
    const targetId = ensurePositiveInteger(id, 'id');
    const entity = await this.repository.findById(targetId);
    ensureOwnership(entity, username);

    const deleted = await this.repository.delete(targetId);
    if (!deleted) {
      throw new TodoBusinessError(
        '删除 Todo 失败',
        { nodePath: 'todo', field: 'delete', reason: '删除失败', value: id },
        HttpStatus.ERROR,
      );
    }

    return toResponseDto(deleted);
  }
}

export const todoService = new TodoService();
