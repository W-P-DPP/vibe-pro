import type { Repository } from 'typeorm';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import { TodoEntity } from './todo.entity.ts';

export interface CreateTodoEntityInput {
  title: string
  description?: string
  createBy: string
  updateBy: string
}

export interface UpdateTodoEntityInput {
  title?: string
  description?: string
  updateBy: string
}

export interface TodoRepositoryPort {
  findByCreateBy(createBy: string): Promise<TodoEntity[]>
  findById(id: number): Promise<TodoEntity | null>
  create(input: CreateTodoEntityInput): Promise<TodoEntity | null>
  update(id: number, input: UpdateTodoEntityInput): Promise<TodoEntity | null>
  toggle(id: number, updateBy: string): Promise<TodoEntity | null>
  delete(id: number): Promise<TodoEntity | null>
}

async function ensureDataSource() {
  const current = getDataSource();
  if (current?.isInitialized) {
    return current;
  }

  return initDataBase();
}

export class TodoRepository implements TodoRepositoryPort {
  private async getRepository(): Promise<Repository<TodoEntity>> {
    const dataSource = await ensureDataSource();
    return dataSource.getRepository(TodoEntity);
  }

  async findByCreateBy(createBy: string): Promise<TodoEntity[]> {
    const repository = await this.getRepository();
    return repository.find({
      where: { createBy },
      order: {
        createTime: 'DESC',
      } as never,
    });
  }

  async findById(id: number): Promise<TodoEntity | null> {
    const repository = await this.getRepository();
    return repository.findOne({
      where: { id },
    });
  }

  async create(input: CreateTodoEntityInput): Promise<TodoEntity | null> {
    const repository = await this.getRepository();
    const entity = repository.create({
      title: input.title,
      description: input.description ?? '',
      completed: false,
      createBy: input.createBy,
      updateBy: input.updateBy,
    });
    const saved = await repository.save(entity);
    return repository.findOne({ where: { id: saved.id } });
  }

  async update(id: number, input: UpdateTodoEntityInput): Promise<TodoEntity | null> {
    const repository = await this.getRepository();
    const current = await repository.findOne({ where: { id } });
    if (!current) {
      return null;
    }

    if (input.title !== undefined) {
      current.title = input.title;
    }
    if (input.description !== undefined) {
      current.description = input.description;
    }
    current.updateBy = input.updateBy;

    await repository.save(current);
    return repository.findOne({ where: { id } });
  }

  async toggle(id: number, updateBy: string): Promise<TodoEntity | null> {
    const repository = await this.getRepository();
    const current = await repository.findOne({ where: { id } });
    if (!current) {
      return null;
    }

    current.completed = !current.completed;
    current.updateBy = updateBy;
    await repository.save(current);
    return repository.findOne({ where: { id } });
  }

  async delete(id: number): Promise<TodoEntity | null> {
    const repository = await this.getRepository();
    const current = await repository.findOne({ where: { id } });
    if (!current) {
      return null;
    }

    await repository.remove(current);
    return current;
  }
}

export const todoRepository = new TodoRepository();
