import type {
  CreateUserEntityInput,
  UpdateUserEntityInput,
  UserRepositoryPort,
} from '../../src/user/user.repository.ts';
import { UserEntity } from '../../src/user/user.entity.ts';
import { UserBusinessError, UserService } from '../../src/user/user.service.ts';

function cloneUser(user: UserEntity): UserEntity {
  return Object.assign(new UserEntity(), user);
}

function createRepositoryMock(records: UserEntity[]): UserRepositoryPort {
  return {
    async getUserList() {
      return records.map(cloneUser);
    },
    async getUserById(id: number) {
      const target = records.find((record) => record.id === id);
      return target ? cloneUser(target) : null;
    },
    async getUserByUsername(username: string) {
      const target = records.find((record) => record.username === username);
      return target ? cloneUser(target) : null;
    },
    async createUser(input: CreateUserEntityInput) {
      return Object.assign(new UserEntity(), {
        id: 99,
        username: input.username,
        nickname: input.nickname,
        email: input.email,
        phone: input.phone,
        status: input.status,
        ...(input.remark !== undefined ? { remark: input.remark } : {}),
      });
    },
    async updateUser(id: number, input: UpdateUserEntityInput) {
      const current = records.find((record) => record.id === id);
      if (!current) {
        return null;
      }

      return Object.assign(new UserEntity(), current, input);
    },
    async deleteUser(id: number) {
      const current = records.find((record) => record.id === id);
      return current ? cloneUser(current) : null;
    },
  };
}

describe('UserService', () => {
  const records = [
    Object.assign(new UserEntity(), {
      id: 1,
      username: 'zhangsan',
      nickname: '张三',
      email: 'zhangsan@example.com',
      phone: '13800000001',
      status: 1,
      remark: '初始用户',
    }),
    Object.assign(new UserEntity(), {
      id: 2,
      username: 'lisi',
      nickname: '李四',
      email: 'lisi@example.com',
      phone: '13800000002',
      status: 1,
    }),
  ];

  it('新增用户成功时应返回中文字段结构', async () => {
    const service = new UserService(createRepositoryMock(records));

    const result = await service.createUser({
      username: 'wangwu',
      nickname: '王五',
      email: 'wangwu@example.com',
      phone: '13800000003',
      status: 1,
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 99,
        username: 'wangwu',
        nickname: '王五',
      }),
    );
  });

  it('新增重复用户名时应返回中文业务错误', async () => {
    const service = new UserService(createRepositoryMock(records));

    await expect(
      service.createUser({
        username: 'zhangsan',
        nickname: '重复用户',
        email: 'dup@example.com',
        phone: '13800000009',
        status: 1,
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      message: '用户名已存在',
    });
  });

  it('查询不存在用户时应返回中文业务错误', async () => {
    const service = new UserService(createRepositoryMock(records));

    await expect(service.getUserDetail(99999)).rejects.toMatchObject<Partial<UserBusinessError>>({
      message: '用户不存在',
    });
  });

  it('更新不存在用户时应返回中文业务错误', async () => {
    const service = new UserService(createRepositoryMock(records));

    await expect(
      service.updateUser(99999, {
        nickname: '不存在',
      }),
    ).rejects.toMatchObject<Partial<UserBusinessError>>({
      message: '用户不存在',
    });
  });

  it('删除不存在用户时应返回中文业务错误', async () => {
    const service = new UserService(createRepositoryMock(records));

    await expect(service.deleteUser(99999)).rejects.toMatchObject<Partial<UserBusinessError>>({
      message: '用户不存在',
    });
  });
});
