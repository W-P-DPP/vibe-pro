import type { EntityManager, Repository } from 'typeorm';
import initDataBase, { getDataSource } from '../../utils/mysql.ts';
import { UserEntity } from './user.entity.ts';

export interface CreateUserEntityInput {
  username: string
  nickname: string
  email: string
  phone: string
  status: number
  remark?: string
}

export interface UpdateUserEntityInput {
  username?: string
  nickname?: string
  email?: string
  phone?: string
  status?: number
  remark?: string
}

export interface UserRepositoryPort {
  getUserList(): Promise<UserEntity[]>
  getUserById(id: number): Promise<UserEntity | null>
  getUserByUsername(username: string): Promise<UserEntity | null>
  createUser(input: CreateUserEntityInput): Promise<UserEntity | null>
  updateUser(id: number, input: UpdateUserEntityInput): Promise<UserEntity | null>
  deleteUser(id: number): Promise<UserEntity | null>
}

async function ensureDataSource() {
  const current = getDataSource();
  if (current?.isInitialized) {
    return current;
  }

  return initDataBase();
}

export class UserRepository implements UserRepositoryPort {
  private async getRepository(manager?: EntityManager): Promise<Repository<UserEntity>> {
    const dataSource = await ensureDataSource();

    if (!manager) {
      return dataSource.getRepository(UserEntity);
    }

    return manager.getRepository(UserEntity);
  }

  async getUserList(): Promise<UserEntity[]> {
    const repository = await this.getRepository();
    return repository.find({
      order: {
        id: 'ASC',
      },
    });
  }

  async getUserById(id: number): Promise<UserEntity | null> {
    const repository = await this.getRepository();
    return repository.findOne({
      where: { id },
    });
  }

  async getUserByUsername(username: string): Promise<UserEntity | null> {
    const repository = await this.getRepository();
    return repository.findOne({
      where: { username },
    });
  }

  async createUser(input: CreateUserEntityInput): Promise<UserEntity | null> {
    const repository = await this.getRepository();
    const entity = repository.create({
      username: input.username,
      nickname: input.nickname,
      email: input.email,
      phone: input.phone,
      status: input.status,
      createBy: 'system',
      updateBy: 'system',
      ...(input.remark ? { remark: input.remark } : {}),
    });

    const saved = await repository.save(entity);
    return repository.findOne({
      where: { id: saved.id },
    });
  }

  async updateUser(id: number, input: UpdateUserEntityInput): Promise<UserEntity | null> {
    const repository = await this.getRepository();
    const current = await repository.findOne({
      where: { id },
    });

    if (!current) {
      return null;
    }

    if (input.username !== undefined) {
      current.username = input.username;
    }
    if (input.nickname !== undefined) {
      current.nickname = input.nickname;
    }
    if (input.email !== undefined) {
      current.email = input.email;
    }
    if (input.phone !== undefined) {
      current.phone = input.phone;
    }
    if (input.status !== undefined) {
      current.status = input.status;
    }
    if (input.remark !== undefined) {
      current.remark = input.remark;
    }

    current.updateBy = 'system';
    await repository.save(current);

    return repository.findOne({
      where: { id },
    });
  }

  async deleteUser(id: number): Promise<UserEntity | null> {
    const repository = await this.getRepository();
    const current = await repository.findOne({
      where: { id },
    });

    if (!current) {
      return null;
    }

    await repository.remove(current);
    return current;
  }
}

export const userRepository = new UserRepository();
